/**
 * See .roadmaps/map-display.md ("Target design").
 *
 * A map's display is a list of map representations. Each one is
 * - a plain record in the store (`MapRepresentationData`): what to show, serialisable, saved in scenes and sessions;
 * - a `MapRepresentation` instance outside the store: its GL buffers and what it last drew. It reads its record
 *   from the store and never holds a setting itself.
 *
 * The map display driver (MapDisplayDriver) creates / disposes instances as records appear / disappear,
 * and calls `update()` when a record changes and `onViewMoved()` when the view origin moves.
 *
 * With GPU contours on (WebGPU main view, `gpuMapContourSetting.enabled`) the GPU map layer contours and draws the
 * representations instead, except those coloured by another map, which it cannot do: Coot still contours those, and
 * the WebGPU view draws their buffers with the other display buffers.
 *
 * The "slice" style is not a Coot contour: the map draws it (`MoorhenMap.drawMapSlice`, from the record's `slice`),
 * with one buffer set per map, so one representation per map can show it for now.
 */
import { appendOtherData, buildBuffers } from "../../WebGLgComponents/buildBuffers";
import type { DisplayBuffer } from "../../WebGLgComponents/displayBuffer";
import { setDisplayBuffers, setRequestDrawScene } from "../../store";
import { selectMapRepresentation } from "../../store/mapRepresentationsSlice";
import type { MoorhenInstance } from "../../InstanceManager/MoorhenInstance";
import type { MapContourMesh, MapContourMeshType } from "../../InstanceManager/CommandCentre/WorkerWrapper";
import { CommandSquashedError } from "../../InstanceManager/CommandCentre/CootCommandError";
import { gpuMapContourSetting } from "../../WebGPUComponents/mapContour/setting";
import type { MoorhenMap } from "../MoorhenMap";
import { type MapColour, type MapRepresentationData, type MapStyle, type Vec3, currentAlpha, currentRadius } from "./mapRepresentationData";

/** Below this, buffers are drawn as transparent with per-vertex colours; above, opaque with a custom colour */
const OPAQUE_ALPHA = 0.99;

/** What a Coot contour depends on: if any of it changes, re-contour */
type ContourKey = {
    level: number;
    radius: number;
    style: MapStyle;
    centre: Vec3;
    colourByMap: { molNo: number; min: number; max: number; gradient: [number, [number, number, number]][] } | null;
};

const sameContour = (a: ContourKey | null, b: ContourKey): boolean =>
    a !== null &&
    a.level === b.level &&
    a.radius === b.radius &&
    a.style === b.style &&
    a.centre.every((coord, i) => coord === b.centre[i]) &&
    a.colourByMap?.molNo === b.colourByMap?.molNo &&
    a.colourByMap?.min === b.colourByMap?.min &&
    a.colourByMap?.max === b.colourByMap?.max &&
    JSON.stringify(a.colourByMap?.gradient) === JSON.stringify(b.colourByMap?.gradient);

/** What only needs repainting the existing buffers: colours, opacity, and thickening where seen edge-on (a uniform) */
type AppearanceKey = { alpha: number; colour: MapColour; positiveColour: MapColour; negativeColour: MapColour; viewDependentTransparency: boolean };

const sameAppearance = (a: AppearanceKey | null, b: AppearanceKey): boolean =>
    a !== null && JSON.stringify(a) === JSON.stringify(b);

const MESH_TYPES: Record<Exclude<MapStyle, "slice">, MapContourMeshType> = { lines: "lines_mesh", "lit-lines": "lit_lines_mesh", solid: "mesh_perm" };

/** Coot contours a representation unless the GPU does; the GPU cannot colour by another map */
export const drawnByCoot = (data: MapRepresentationData): boolean => !gpuMapContourSetting.enabled || data.colourByMap !== null;

type ContourBuffer = { buffer: DisplayBuffer; sign: "single" | "positive" | "negative" };

export class MapRepresentation {
    readonly id: string;
    readonly map: MoorhenMap;
    private readonly instance: MoorhenInstance;

    private buffers: ContourBuffer[] = [];
    private lastContour: ContourKey | null = null;
    /**
     * The contour last asked for, until it lands (or fails): what update() compares the record with while a contour
     * runs. Against `lastContour` alone, a change undone while its contour ran was not asked for again, and the late
     * contour of the undone change was then drawn (a level scrolled up and back down drawn at the upper one).
     */
    private pendingContour: ContourKey | null = null;
    private lastAppearance: AppearanceKey | null = null;
    /** Smaller radius while the user drags a control (MapDisplayDriver.setFastRadius), not a setting */
    private fastRadius: number | null = null;
    /** Whether the map's 2D slice was drawn for this representation ("slice" style) */
    private showingSlice = false;
    private disposed = false;

    constructor(id: string, map: MoorhenMap, instance: MoorhenInstance) {
        this.id = id;
        this.map = map;
        this.instance = instance;
    }

    /** The GL buffers this representation drew (Coot contours; a slice's are the map's) */
    get displayBuffers(): DisplayBuffer[] {
        return this.buffers.map(({ buffer }) => buffer);
    }

    /** The record, read from the store each time: the class never keeps a copy of settings */
    get data(): MapRepresentationData | undefined {
        return selectMapRepresentation(this.instance.store.getState(), this.id);
    }

    /** Called by the driver when the record changed: does the minimum (hide, re-contour or recolour) */
    update(): void {
        const data = this.data;
        if (!data || !data.visible) {
            this.hide();
            return;
        }
        if (data.style === "slice") {
            // Drawn by the map, on WebGL or WebGPU alike; drawMapSlice does nothing if the slice is unchanged
            this.hideContour();
            this.showingSlice = true;
            void this.map.drawMapSlice();
            return;
        }
        this.hideSlice();
        if (!drawnByCoot(data)) {
            this.hideContour();
            return;
        }
        const contour = this.contourKey(data);
        if (!sameContour(this.pendingContour ?? this.lastContour, contour)) {
            // A new contour builds its buffers with the current appearance
            void this.requestContour();
        } else if (!sameAppearance(this.lastAppearance, this.appearanceKey(data))) {
            this.applyAppearance(data);
        }
    }

    /** Called by the driver when the view origin moves */
    onViewMoved(): void {
        const data = this.data;
        // A locked map stays where it is, unless drawn small around the view for a quick level change
        if (data?.visible && (!data.originLock || this.fastRadius !== null) && data.style !== "slice") {
            void this.requestContour();
        }
    }

    /**
     * Contour again even if nothing in the record changed: the map's data changed (e.g. maps updated after a
     * refinement, reflections replaced), or the line width. Resolves once drawn (or replaced by a newer contour).
     */
    redraw(): Promise<void> {
        if (this.data?.style === "slice") {
            this.update();
            return Promise.resolve();
        }
        this.lastContour = null;
        this.pendingContour = null;
        return this.requestContour();
    }

    /**
     * Contour around `centre` (world coordinates) rather than the view in the store, and resolve once drawn: for a
     * movie export, where the store's view is deliberately behind the camera. Does nothing for what does not follow
     * the view (hidden, locked, a slice) or is not Coot's to draw (GPU contours).
     */
    contourAround(centre: Vec3): Promise<void> {
        const data = this.data;
        if (!data?.visible || data.style === "slice" || !drawnByCoot(data) || (data.originLock && this.fastRadius === null)) {
            return Promise.resolve();
        }
        return this.contour({ ...this.contourKey(data), centre: [...centre] as Vec3 }).catch(err => {
            if (!(err instanceof CommandSquashedError)) {
                console.error(`Map representation ${this.id}: contour failed`, err);
            }
        });
    }

    /** Draw with a smaller radius during interaction, null to go back to the record's radius */
    setFastRadius(radius: number | null): void {
        this.fastRadius = radius;
        this.update();
    }

    hide(): void {
        this.hideSlice();
        this.hideContour();
    }

    private hideSlice(): void {
        if (this.showingSlice) {
            this.showingSlice = false;
            this.map.hideMapSlice();
        }
    }

    private hideContour(): void {
        if (this.buffers.length === 0) {
            return;
        }
        this.replaceBuffers([]);
        this.lastContour = null;
        this.pendingContour = null;
        this.lastAppearance = null;
    }

    dispose(): void {
        this.disposed = true;
        this.hide();
    }

    /** Contours of this representation squash each other in the worker queue: only the latest one waiting is sent */
    private get squashKey(): string {
        return `map-contour:${this.id}`;
    }

    private contourKey(data: MapRepresentationData): ContourKey {
        // The scene origin is the negated view centre. A fast radius is drawn around the view, even when locked
        const lockedCentre = this.fastRadius === null ? data.originLock?.centre : undefined;
        const centre = lockedCentre ?? (this.instance.store.getState().sceneSettings.origin.map(coord => -coord) as Vec3);
        let colourByMap: ContourKey["colourByMap"] = null;
        if (data.colourByMap) {
            const otherMap = this.instance.getMapList().find(map => map.uniqueId === data.colourByMap.mapUid);
            if (otherMap) {
                const { min, max, gradient } = data.colourByMap;
                colourByMap = { molNo: otherMap.molNo, min, max, gradient };
            }
        }
        return {
            level: data.contourLevel,
            radius: this.fastRadius ?? currentRadius(data),
            style: data.style,
            centre,
            colourByMap,
        };
    }

    private appearanceKey(data: MapRepresentationData): AppearanceKey {
        return {
            alpha: currentAlpha(data),
            colour: data.colour ?? this.map.defaultMapColour,
            positiveColour: data.positiveColour ?? this.map.defaultPositiveMapColour,
            negativeColour: data.negativeColour ?? this.map.defaultNegativeMapColour,
            viewDependentTransparency: data.viewDependentTransparency ?? false,
        };
    }

    /**
     * Queue a contour with the current record and view. Requests are not coalesced here: the worker queue squashes
     * the older ones still waiting (same squash key), so only the latest is contoured.
     */
    private requestContour(): Promise<void> {
        const data = this.data;
        // On the GPU, the WebGPU main view contours and draws the map itself (mapContour/setting.ts)
        if (!data?.visible || data.style === "slice" || !drawnByCoot(data)) {
            this.update();
            return Promise.resolve();
        }
        return this.contour(this.contourKey(data)).catch(err => {
            if (!(err instanceof CommandSquashedError)) {
                console.error(`Map representation ${this.id}: contour failed`, err);
            }
        });
    }

    private async contour(key: ContourKey): Promise<void> {
        this.pendingContour = key;
        try {
            await this.contourNow(key);
        } finally {
            // Landed, failed or squashed by a newer one (which is pending now)
            if (this.pendingContour === key) this.pendingContour = null;
        }
    }

    private async contourNow(key: ContourKey): Promise<void> {
        const worker = this.instance.workerCommand;
        const meshType = MESH_TYPES[key.style as Exclude<MapStyle, "slice">];
        const options = { squashKey: this.squashKey };
        const mesh = key.colourByMap
            ? await worker.get_map_contours_mesh_coloured_by_other_map(
                  key.colourByMap.gradient,
                  this.map.molNo,
                  key.colourByMap.molNo,
                  key.centre,
                  key.radius,
                  key.level,
                  key.colourByMap.min,
                  key.colourByMap.max,
                  meshType,
                  false,
                  options
              )
            : await worker.get_map_contours_mesh(this.map.molNo, key.centre, key.radius, key.level, meshType, options);
        // Hidden, removed or moved to the GPU while the contour was running
        const now = this.data;
        if (this.disposed || !now?.visible || now.style === "slice" || !drawnByCoot(now)) {
            return;
        }
        // Painted as the record is now: a colour or opacity change made while it ran was applied to the old buffers
        const current = this.appearanceKey(now);
        this.buildContourBuffers(mesh, current, key.colourByMap !== null);
        this.lastContour = key;
        this.lastAppearance = current;
    }

    /**
     * Turn a Coot mesh into GL buffers. Difference maps are split into a positive and a negative buffer, using the
     * colours Coot gives each vertex. With `keepCootColours` (colour by map) only the alpha is applied.
     *
     * New buffers each time. The old MoorhenMap code (removed 2026-11-26) reused the GL buffer of a non-difference map
     * when the primitive type was unchanged; measure re-contour cost on view moves before bringing that back.
     */
    private buildContourBuffers(mesh: MapContourMesh | null, appearance: AppearanceKey, keepCootColours: boolean): void {
        if (!mesh) {
            this.replaceBuffers([]);
            return;
        }
        const parts: { object: MapContourMesh; sign: ContourBuffer["sign"] }[] = [];
        if (this.map.isDifference && !keepCootColours) {
            const positive = structuredClone(mesh);
            const negative = structuredClone(mesh);
            positive.idx_tri = [];
            negative.idx_tri = [];
            mesh.idx_tri.forEach((idxss: number[][], i: number) => {
                const positiveIdx: number[][] = [];
                const negativeIdx: number[][] = [];
                idxss.forEach((idxs: number[], j: number) => {
                    // Coot colours positive density with a red component below 0.5
                    positiveIdx.push(idxs.filter(idx => mesh.col_tri[i][j][idx * 4] < 0.5));
                    negativeIdx.push(idxs.filter(idx => mesh.col_tri[i][j][idx * 4] >= 0.5));
                });
                positive.idx_tri.push(positiveIdx);
                negative.idx_tri.push(negativeIdx);
            });
            parts.push({ object: positive, sign: "positive" }, { object: negative, sign: "negative" });
        } else {
            parts.push({ object: mesh, sign: "single" });
        }

        const newBuffers: ContourBuffer[] = parts.flatMap(({ object, sign }) =>
            (appendOtherData(object, this.instance.store, true) as DisplayBuffer[]).map(buffer => ({ buffer, sign }))
        );
        newBuffers.forEach(({ buffer }) => {
            buffer.statsLabel = this.map.isDifference ? "map (difference)" : "map";
        });
        this.paint(newBuffers, appearance, keepCootColours);
        buildBuffers(
            newBuffers.map(({ buffer }) => buffer),
            this.instance.store
        );
        this.replaceBuffers(newBuffers);
    }

    /** Colour and alpha changes: recolour the existing buffers, no Coot call */
    private applyAppearance(data: MapRepresentationData): void {
        const appearance = this.appearanceKey(data);
        // Coot's colours were kept only if the buffers were contoured coloured by a map: not if the record names a
        // map that is not there (closed, or not loaded), which is contoured plainly
        this.paint(this.buffers, appearance, this.lastContour?.colourByMap != null);
        buildBuffers(
            this.buffers.map(({ buffer }) => buffer),
            this.instance.store
        );
        this.lastAppearance = appearance;
        this.instance.dispatch(setRequestDrawScene(true));
    }

    private paint(buffers: ContourBuffer[], appearance: AppearanceKey, keepCootColours: boolean): void {
        const { alpha } = appearance;
        buffers.forEach(({ buffer, sign }) => {
            const colour = sign === "positive" ? appearance.positiveColour : sign === "negative" ? appearance.negativeColour : appearance.colour;
            const transparent = alpha < OPAQUE_ALPHA;
            buffer.transparent = transparent;
            buffer.alphaChanged = true;
            // A uniform: the shader ignores it unless the surface is transparent
            buffer.viewDependentTransparency = appearance.viewDependentTransparency;
            if (!transparent && !keepCootColours) {
                // Opaque single colour: no need to touch vertex colours
                buffer.setCustomColour([colour.r, colour.g, colour.b, 1.0]);
                return;
            }
            buffer.customColour = null;
            // Each buffer only indexes its own vertices, so the whole colour array can take one colour
            buffer.triangleColours.forEach(colours => {
                for (let idx = 0; idx < colours.length; idx += 4) {
                    if (!keepCootColours) {
                        colours[idx] = colour.r;
                        colours[idx + 1] = colour.g;
                        colours[idx + 2] = colour.b;
                    }
                    colours[idx + 3] = alpha;
                }
            });
            buffer.isDirty = true;
        });
    }

    /** Swap this representation's buffers in the renderer's list (still in the store: serialisable-store.md Phase 2) */
    private replaceBuffers(newBuffers: ContourBuffer[]): void {
        const oldIds = new Set(this.buffers.map(({ buffer }) => buffer.id));
        this.buffers.forEach(({ buffer }) => buffer.clearBuffers(this.instance.store.getState().glRef.glCtx));
        const others = (this.instance.store.getState().glRef.displayBuffers ?? []).filter(buffer => !oldIds.has(buffer.id));
        this.buffers = newBuffers;
        this.instance.dispatch(setDisplayBuffers([...others, ...newBuffers.map(({ buffer }) => buffer)]));
    }
}
