/**
 * The maps in the scene, contoured on the GPU for the WebGPU main view.
 *
 * Each frame it reads the same settings Moorhen contours with (visible maps, radius, level,
 * style, colours, the origin or a map's locked origin) from the store, remakes a map's contour on
 * the GPU only when its centre, radius or level has changed, and returns what to draw. Each map's
 * unit-cell grid is fetched from the Coot worker and kept on the GPU while the layer lasts, and
 * fetched again when the map's dataRevision goes up (MoorhenMap.markDataChanged); the old
 * grid is drawn until the new one is in.
 *
 * A map too big to contour here at its radius (a large radius, a large EM map: see GpuIsosurface)
 * is contoured at the largest radius that fits, and the console says so once. Coot is no help
 * there: at the same radius it is slower still, by minutes for a large EM map.
 */
import type { RootState } from "../../store/MoorhenReduxStore";
import type { MoorhenMap } from "../../utils/MoorhenMap";
import type { PreviewGpuDraw } from "../previewRenderer";
import { formatCount } from "../rendererReport";
import { GpuIsosurface, GpuMapGrid, MapContourKernels } from "./gpuMapContour";
import type { MapUnitCellGrid } from "./mapContourBox";
import { gpuMapContourSetting, mapStyleOf, onMapDataChanged } from "./setting";

/** The radius MoorhenMapManager contours a map at. */
function radiusOf(map: MoorhenMap, settings: RootState["mapContourSettings"]): number {
    return settings.mapRadii.find(item => item.molNo === map.molNo)?.radius || map.suggestedRadius || 15;
}

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
    /** What was last said about a map contoured at less than its radius, so it is said once. */
    private readonly limitsSaid = new Map<MoorhenMap, string>();
    private destroyed = false;
    private readonly stopListening: () => void;
    /** What is being contoured, or what went wrong, on one line (for the GPU tests and debugging). */
    status = "";

    private constructor(private readonly kernels: MapContourKernels, private readonly requestDraw: () => void) {
        // A map can change with nothing else in the scene changing (updating maps after a
        // refinement): the next frame is when its grid is fetched again.
        this.stopListening = onMapDataChanged(requestDraw);
    }

    static async create(device: GPUDevice, requestDraw: () => void): Promise<GpuMapLayer> {
        return new GpuMapLayer(await MapContourKernels.create(device), requestDraw);
    }

    /**
     * Bring the contours up to date and return what to draw.
     *
     * @param liveOrigin where the camera is *now*, overriding the store's copy of it. The store is
     *     told where the camera ended up rather than where it is passing through, so during a
     *     movie its copy is stale and contouring to it leaves the map behind. This layer runs once
     *     per frame with the camera already to hand, so it can simply be told.
     */
    frame(state: RootState, liveOrigin?: readonly [number, number, number]): PreviewGpuDraw[] {
        const maps = state.maps as unknown as MoorhenMap[];
        const settings = state.mapContourSettings;
        if (!gpuMapContourSetting.enabled) {
            this.clear();
            this.status = "";
            return [];
        }
        for (const [map, entry] of this.maps) {
            if (!maps.includes(map)) {
                this.release(entry);
                this.maps.delete(map);
                this.limitsSaid.delete(map);
            }
        }
        const origin = liveOrigin ?? state.sceneSettings.origin;
        const draws: PreviewGpuDraw[] = [];
        const notes: string[] = [];
        for (const map of maps) {
            if (!settings.visibleMaps.includes(map.molNo)) continue;
            // Drawn as a 2D slice (MoorhenMap.drawMapSlice), among the ordinary display buffers.
            if (mapStyleOf(settings, map.molNo) === "slice") continue;
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
            const radius = radiusOf(map, settings);
            const level = settings.contourLevels.find(item => item.molNo === map.molNo)?.contourLevel || map.suggestedContourLevel || 0.003;
            const style = mapStyleOf(settings, map.molNo);
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
                if (surface.tooBig) {
                    // Not even a small contour fits: Coot contours the maps (MoorhenWebGPUMainView).
                    entry.failed = `too big for this GPU: ${surface.tooBig}`;
                    console.warn(`GPU map contours: map ${map.molNo} is too big for this GPU: ${surface.tooBig}. Coot contours the maps from now on.`);
                    continue;
                }
                this.sayLimit(map, radius, surface);
                const buffers = surface.buffers;
                if (!buffers) continue;
                const solid = style === "solid";
                draws.push({
                    key,
                    position: buffers.position,
                    normal: buffers.normal,
                    index: buffers.triangles,
                    lines: buffers.lines,
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
            const lines = [...entry.surfaces.values()].reduce((sum, s) => sum + s.lastLines, 0);
            const { nu, nv, nw } = entry.grid.grid;
            const limited = entry.surfaces.get(`${map.molNo}:1`)?.limitedRadius;
            notes.push(`map ${map.molNo}: r ${limited != null ? `${+limited.toFixed(1)} Å (of ${radius} Å: too big for the GPU)` : `${radius} Å`}, cell grid ${nu}×${nv}×${nw}` + (box ? `, box ${box.size.join("×")}` : "")
                + `, ${formatCount(triangles)} triangles, ${formatCount(lines)} lines, contoured ${made}×`
                + (entry.fetches > 1 ? `, fetched ${entry.fetches}×` : "") + (entry.loading ? ", fetching again…" : ""));
        }
        this.status = notes.length > 0 ? `GPU maps: ${notes.join("; ")}` : "GPU maps: none visible";
        return draws;
    }

    /** Say once, in the console, that `map` is contoured at less than its radius, and why. */
    private sayLimit(map: MoorhenMap, radius: number, surface: GpuIsosurface): void {
        if (surface.limitedRadius == null) {
            this.limitsSaid.delete(map);
            return;
        }
        const said = `${radius}|${surface.limitedRadius.toFixed(1)}`;
        if (this.limitsSaid.get(map) === said) return;
        this.limitsSaid.set(map, said);
        console.warn(`GPU map contours: map ${map.molNo} is contoured to a radius of ${+surface.limitedRadius.toFixed(1)} Å, ` +
            `not ${radius} Å: ${surface.limitReason ?? "too big for this GPU"}.`);
    }

    /** Contours made so far, all maps together: for timing how soon a move is contoured (report). */
    get contoursMade(): number {
        let made = 0;
        for (const entry of this.maps.values()) entry.surfaces.forEach(surface => { made += surface.made; });
        return made;
    }

    /** Triangles in the maps' contours as last made, all maps together. */
    get triangles(): number {
        let triangles = 0;
        for (const entry of this.maps.values()) entry.surfaces.forEach(surface => { triangles += surface.lastTriangles; });
        return triangles;
    }

    /** Lines of those contours' edges (each edge once), all maps together, drawn in the line styles. */
    get lines(): number {
        let lines = 0;
        for (const entry of this.maps.values()) entry.surfaces.forEach(surface => { lines += surface.lastLines; });
        return lines;
    }

    /**
     * Whether some map could not be contoured here at all (its unit cell could not be fetched or
     * put on the GPU, or not even a small contour fits): then Coot contours the maps instead
     * (MoorhenWebGPUMainView).
     */
    get failed(): boolean {
        for (const entry of this.maps.values()) if (entry.failed) return true;
        return false;
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
                // Too big for the GPU, or out of its memory: rejects, and Coot contours the maps.
                return GpuMapGrid.create(this.kernels, grid).then(made => {
                    if (this.destroyed || this.maps.get(map) !== entry) {
                        made.destroy();
                        return;
                    }
                    // The surfaces were made from the old grid (whose size may differ): start again.
                    entry.surfaces.forEach(surface => surface.destroy());
                    entry.surfaces.clear();
                    entry.grid?.destroy();
                    entry.grid = made;
                    entry.fetches++;
                    console.debug(`GPU map contours: map ${map.molNo} unit cell ${grid.nu}×${grid.nv}×${grid.nw} ` +
                        `(${(grid.data.byteLength / 1e6).toFixed(0)} MB) in ${(performance.now() - started).toFixed(0)} ms` +
                        (entry.fetches > 1 ? ` (fetch ${entry.fetches}: the map changed)` : ""));
                    this.requestDraw();
                });
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
        if (entry.grid) {
            console.warn(`GPU map contours: map ${map.molNo} changed but could not be fetched again: ${why}`);
        } else {
            entry.failed = why;
            // MoorhenWebGPUMainView gives every map back to Coot for good (`failed`).
            console.warn(`GPU map contours: map ${map.molNo} could not be fetched: ${why}. Coot contours the maps from now on.`);
        }
    }
}
