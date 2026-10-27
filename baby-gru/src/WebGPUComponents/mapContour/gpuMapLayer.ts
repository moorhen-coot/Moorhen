/**
 * The maps in the scene, contoured on the GPU for the WebGPU main view (and the preview).
 *
 * Each frame it reads the same settings Moorhen contours with (visible maps, radius, level,
 * style, colours, the origin or a map's locked origin) from the store, remakes a map's contour on
 * the GPU only when its centre, radius or level has changed, and returns what to draw. Each map's
 * unit-cell grid is fetched from the Coot worker and kept on the GPU while the preview is open,
 * and fetched again when the map's dataRevision goes up (MoorhenMap.markDataChanged); the old
 * grid is drawn until the new one is in.
 */
import type { RootState } from "../../store/MoorhenReduxStore";
import type { MoorhenMap } from "../../utils/MoorhenMap";
import type { PreviewGpuDraw } from "../previewRenderer";
import { CONTOUR_STEPS, GpuIsosurface, GpuMapGrid, MapContourKernels } from "./gpuMapContour";
import type { MapUnitCellGrid } from "./mapContourBox";
import { gpuMapContourSetting, onMapDataChanged } from "./setting";

interface MapEntry {
    grid: GpuMapGrid | null;
    /** The map's dataRevision when `grid` was asked for. */
    revision: number;
    loading: boolean;
    /** Grids fetched, for the status line. */
    fetches: number;
    failed: string | null;
    surfaces: Map<string, GpuIsosurface>;
}

export class GpuMapLayer {
    private readonly maps = new Map<MoorhenMap, MapEntry>();
    private destroyed = false;
    private readonly stopListening: () => void;
    /** One line for the preview's status: what is being contoured, or what went wrong. */
    status = "";

    private constructor(private readonly kernels: MapContourKernels, private readonly requestDraw: () => void) {
        // A map can change with nothing else in the scene changing (updating maps after a
        // refinement): the next frame is when its grid is fetched again.
        this.stopListening = onMapDataChanged(requestDraw);
    }

    static async create(device: GPUDevice, requestDraw: () => void): Promise<GpuMapLayer> {
        return new GpuMapLayer(await MapContourKernels.create(device), requestDraw);
    }

    /** Bring the contours up to date with the store, and return what to draw. */
    frame(state: RootState): PreviewGpuDraw[] {
        if (!gpuMapContourSetting.enabled) {
            this.clear();
            this.status = "";
            return [];
        }
        const maps = state.maps as unknown as MoorhenMap[];
        for (const [map, entry] of this.maps) {
            if (!maps.includes(map)) {
                this.release(entry);
                this.maps.delete(map);
            }
        }
        const settings = state.mapContourSettings;
        const origin = state.sceneSettings.origin;
        const draws: PreviewGpuDraw[] = [];
        const notes: string[] = [];
        for (const map of maps) {
            if (!settings.visibleMaps.includes(map.molNo)) continue;
            let entry = this.maps.get(map);
            if (!entry) {
                entry = { grid: null, revision: -1, loading: false, fetches: 0, failed: null, surfaces: new Map() };
                this.maps.set(map, entry);
            }
            if (entry.failed) {
                notes.push(`map ${map.molNo}: ${entry.failed}`);
                continue;
            }
            if (!entry.loading && entry.revision !== map.dataRevision) this.load(map, entry);
            if (!entry.grid) {
                notes.push(`map ${map.molNo}: fetching its unit cell…`);
                continue;
            }

            // As MoorhenMapManager decides them.
            const radius = settings.mapRadii.find(item => item.molNo === map.molNo)?.radius || map.suggestedRadius || 15;
            const level = settings.contourLevels.find(item => item.molNo === map.molNo)?.contourLevel || map.suggestedContourLevel || 0.003;
            const style = settings.mapStyles.find(item => item.molNo === map.molNo)?.style
                ?? (settings.defaultMapLitLines ? "lit-lines" : settings.defaultMapSurface ? "solid" : "lines");
            const { mapAlpha, mapColour, positiveMapColour, negativeMapColour } = map.getMapContourParams();
            const centreFrom = map.isOriginLocked && map.drawOrigin ? map.drawOrigin : origin;
            const centre = [-centreFrom[0], -centreFrom[1], -centreFrom[2]] as [number, number, number];

            const levels = map.isDifference
                ? [{ sign: 1, colour: positiveMapColour }, { sign: -1, colour: negativeMapColour }]
                : [{ sign: 1, colour: mapColour }];
            for (const { sign, colour } of levels) {
                const key = `${map.molNo}:${sign}`;
                let surface = entry.surfaces.get(key);
                if (!surface) {
                    surface = new GpuIsosurface(this.kernels, entry.grid, this.requestDraw);
                    entry.surfaces.set(key, surface);
                }
                surface.update({ centre, radius, level: sign * level });
                const buffers = surface.buffers;
                if (!buffers) continue;
                const solid = style === "solid";
                draws.push({
                    key,
                    position: buffers.position,
                    normal: buffers.normal,
                    index: buffers.triangles,
                    drawArgs: buffers.drawArgs,
                    drawArgsOffset: solid ? 0 : 32,
                    style: solid ? "triangles" : style === "lit-lines" ? "lit-lines" : "lines",
                    // Null until the preferences are read; MGWebGL takes 1 then too.
                    lineWidth: settings.mapLineWidth ?? 1,
                    colour: [colour.r, colour.g, colour.b, mapAlpha],
                    transparent: mapAlpha < 0.99,
                });
            }
            const box = entry.surfaces.get(`${map.molNo}:1`)?.lastBox;
            const made = [...entry.surfaces.values()].reduce((sum, s) => sum + s.made, 0);
            const triangles = [...entry.surfaces.values()].reduce((sum, s) => sum + s.lastTriangles, 0);
            const { nu, nv, nw } = entry.grid.grid;
            notes.push(`map ${map.molNo}: r ${radius} Å, cell grid ${nu}×${nv}×${nw}` + (box ? `, box ${box.size.join("×")}` : "")
                + `, ${formatCount(triangles)} triangles, contoured ${made}×`
                + (entry.fetches > 1 ? `, fetched ${entry.fetches}×` : "") + (entry.loading ? ", fetching again…" : ""));
        }
        this.status = notes.length > 0 ? `GPU maps: ${notes.join("; ")}` : "GPU maps: none visible";
        return draws;
    }

    /** Triangles in the maps' contours as last made, all maps together. */
    get triangles(): number {
        let triangles = 0;
        for (const entry of this.maps.values()) entry.surfaces.forEach(surface => { triangles += surface.lastTriangles; });
        return triangles;
    }

    /**
     * Whether some map could not be contoured here at all (its unit cell could not be fetched):
     * then Coot contours the maps instead (MoorhenWebGPUMainView).
     */
    get failed(): boolean {
        for (const entry of this.maps.values()) if (entry.failed) return true;
        return false;
    }

    /**
     * The GPU time of contouring since the last call: for each surface, the mean of its timed
     * contours, added up over the surfaces (what one move of the origin costs, all maps
     * together), with the largest single contour, and the same sum step by step. Empty if
     * nothing was timed (or cannot be).
     */
    takeTiming(): string {
        let perMove = 0, max = 0, timed = 0, surfaces = 0;
        const steps = CONTOUR_STEPS.map(() => 0);
        for (const entry of this.maps.values()) {
            for (const surface of entry.surfaces.values()) {
                const t = surface.takeTiming();
                if (!t || t.count === 0) continue;
                perMove += t.meanMs;
                max = Math.max(max, t.maxMs);
                timed += t.count;
                surfaces++;
                t.segmentsMs.forEach((ms, i) => { steps[i] += ms; });
            }
        }
        if (timed === 0) return "";
        return `contouring ${perMove.toFixed(1)} ms GPU per change (${surfaces} surface${surfaces > 1 ? "s" : ""}; ` +
            `slowest ${max.toFixed(1)} ms; ${timed} timed): ` +
            CONTOUR_STEPS.map((name, i) => `${name} ${steps[i].toFixed(1)}`).join(", ");
    }

    destroy(): void {
        this.destroyed = true;
        this.stopListening();
        this.clear();
        this.kernels.destroy();
    }

    private clear(): void {
        this.maps.forEach(entry => this.release(entry));
        this.maps.clear();
    }

    private release(entry: MapEntry): void {
        entry.surfaces.forEach(surface => surface.destroy());
        entry.surfaces.clear();
        entry.grid?.destroy();
        entry.grid = null;
    }

    /**
     * Fetch the map's unit cell, and swap it in when it arrives. Until then the current grid, if
     * there is one, is still drawn. The revision asked for is recorded first, so that a change
     * while this is in flight is fetched again afterwards.
     */
    private load(map: MoorhenMap, entry: MapEntry): void {
        entry.loading = true;
        entry.revision = map.dataRevision;
        const started = performance.now();
        map.commandCentre.cootCommand({
            returnType: "unit_cell_grid",
            command: "shim_get_map_unit_cell_grid",
            commandArgs: [map.molNo],
        }, false).then(response => {
            entry.loading = false;
            if (this.destroyed || this.maps.get(map) !== entry) return;
            const result = response.data.result as { status: string; result?: MapUnitCellGrid };
            if (result.status !== "Completed" || !result.result) {
                this.fetchFailed(map, entry, "the Coot worker could not export its grid (is the WASM rebuilt with get_map_unit_cell_grid?)");
            } else {
                const grid = result.result;
                // The surfaces were made from the old grid (whose size may differ): start again.
                entry.surfaces.forEach(surface => surface.destroy());
                entry.surfaces.clear();
                entry.grid?.destroy();
                entry.grid = new GpuMapGrid(this.kernels, grid);
                entry.fetches++;
                console.log(`GPU map contours: map ${map.molNo} unit cell ${grid.nu}×${grid.nv}×${grid.nw} ` +
                    `(${(grid.data.byteLength / 1e6).toFixed(0)} MB) in ${(performance.now() - started).toFixed(0)} ms` +
                    (entry.fetches > 1 ? ` (fetch ${entry.fetches}: the map changed)` : ""));
            }
            this.requestDraw();
        }).catch(err => {
            entry.loading = false;
            if (this.destroyed || this.maps.get(map) !== entry) return;
            this.fetchFailed(map, entry, String(err));
            this.requestDraw();
        });
    }

    /** A first fetch failing stops the map being drawn; a later one leaves the old grid drawn. */
    private fetchFailed(map: MoorhenMap, entry: MapEntry, why: string): void {
        if (entry.grid) console.warn(`GPU map contours: map ${map.molNo} changed but could not be fetched again: ${why}`);
        else entry.failed = why;
    }
}

/** 1234567 → "1.23M", 12345 → "12.3k". */
const formatCount = (n: number): string =>
    n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n}`;
