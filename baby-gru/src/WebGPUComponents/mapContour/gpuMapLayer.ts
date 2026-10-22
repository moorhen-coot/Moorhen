/**
 * The maps in the scene, contoured on the GPU for the WebGPU preview.
 *
 * Each frame it reads the same settings Moorhen contours with (visible maps, radius, level,
 * style, colours, the origin or a map's locked origin) from the store, remakes a map's contour on
 * the GPU only when its centre, radius or level has changed, and returns what to draw. Each map's
 * unit-cell grid is fetched from the Coot worker once and kept on the GPU while the preview is
 * open.
 */
import type { RootState } from "../../store/MoorhenReduxStore";
import type { MoorhenMap } from "../../utils/MoorhenMap";
import type { PreviewGpuDraw } from "../previewRenderer";
import { GpuIsosurface, GpuMapGrid, MapContourKernels } from "./gpuMapContour";
import type { MapUnitCellGrid } from "./mapContourBox";
import { gpuMapContourSetting } from "./setting";

interface MapEntry {
    grid: GpuMapGrid | null;
    loading: boolean;
    failed: string | null;
    surfaces: Map<string, GpuIsosurface>;
}

export class GpuMapLayer {
    private readonly maps = new Map<MoorhenMap, MapEntry>();
    private destroyed = false;
    /** One line for the preview's status: what is being contoured, or what went wrong. */
    status = "";

    private constructor(private readonly kernels: MapContourKernels, private readonly requestDraw: () => void) {}

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
                entry = { grid: null, loading: false, failed: null, surfaces: new Map() };
                this.maps.set(map, entry);
            }
            if (entry.failed) {
                notes.push(`map ${map.molNo}: ${entry.failed}`);
                continue;
            }
            if (!entry.grid) {
                if (!entry.loading) this.load(map, entry);
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
            const { nu, nv, nw } = entry.grid.grid;
            notes.push(`map ${map.molNo}: cell grid ${nu}×${nv}×${nw}` + (box ? `, box ${box.size.join("×")}` : "") + `, contoured ${made}×`);
        }
        this.status = notes.length > 0 ? `GPU maps: ${notes.join("; ")}` : "GPU maps: none visible";
        return draws;
    }

    destroy(): void {
        this.destroyed = true;
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

    private load(map: MoorhenMap, entry: MapEntry): void {
        entry.loading = true;
        const started = performance.now();
        map.commandCentre.cootCommand({
            returnType: "unit_cell_grid",
            command: "shim_get_map_unit_cell_grid",
            commandArgs: [map.molNo],
        }, false).then(response => {
            entry.loading = false;
            const result = response.data.result as { status: string; result?: MapUnitCellGrid };
            if (result.status !== "Completed" || !result.result) {
                entry.failed = "the Coot worker could not export its grid (is the WASM rebuilt with get_map_unit_cell_grid?)";
            } else if (!this.destroyed && this.maps.get(map) === entry) {
                const grid = result.result;
                entry.grid = new GpuMapGrid(this.kernels, grid);
                console.log(`GPU map contours: map ${map.molNo} unit cell ${grid.nu}×${grid.nv}×${grid.nw} ` +
                    `(${(grid.data.byteLength / 1e6).toFixed(0)} MB) in ${(performance.now() - started).toFixed(0)} ms`);
            }
            this.requestDraw();
        }).catch(err => {
            entry.loading = false;
            entry.failed = String(err);
            this.requestDraw();
        });
    }
}
