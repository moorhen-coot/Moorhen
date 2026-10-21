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
 */
import { appendOtherData, buildBuffers } from "../../WebGLgComponents/buildBuffers";
import type { DisplayBuffer } from "../../WebGLgComponents/displayBuffer";
import { setDisplayBuffers, setRequestDrawScene } from "../../store";
import { selectMapRepresentation } from "../../store/mapRepresentationsSlice";
import type { MoorhenInstance } from "../../InstanceManager/MoorhenInstance";
import type { MapContourMesh, MapContourMeshType } from "../../InstanceManager/CommandCentre/WorkerWrapper";
import { CommandSquashedError } from "../../InstanceManager/CommandCentre/CootCommandError";
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
    colourByMap: { molNo: number; min: number; max: number } | null;
};

const sameContour = (a: ContourKey | null, b: ContourKey): boolean =>
    a !== null &&
    a.level === b.level &&
    a.radius === b.radius &&
    a.style === b.style &&
    a.centre.every((coord, i) => coord === b.centre[i]) &&
    a.colourByMap?.molNo === b.colourByMap?.molNo &&
    a.colourByMap?.min === b.colourByMap?.min &&
    a.colourByMap?.max === b.colourByMap?.max;

/** What only needs recolouring existing buffers */
type AppearanceKey = { alpha: number; colour: MapColour; positiveColour: MapColour; negativeColour: MapColour };

const sameAppearance = (a: AppearanceKey | null, b: AppearanceKey): boolean =>
    a !== null && JSON.stringify(a) === JSON.stringify(b);

const MESH_TYPES: Record<MapStyle, MapContourMeshType> = { lines: "lines_mesh", "lit-lines": "lit_lines_mesh", solid: "mesh_perm" };

type ContourBuffer = { buffer: DisplayBuffer; sign: "single" | "positive" | "negative" };

export class MapRepresentation {
    readonly id: string;
    readonly map: MoorhenMap;
    private readonly instance: MoorhenInstance;

    private buffers: ContourBuffer[] = [];
    private lastContour: ContourKey | null = null;
    private lastAppearance: AppearanceKey | null = null;
    /** Smaller radius while the user drags a control (today `mapFastRadii`), not a setting */
    private fastRadius: number | null = null;
    private disposed = false;

    constructor(id: string, map: MoorhenMap, instance: MoorhenInstance) {
        this.id = id;
        this.map = map;
        this.instance = instance;
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
        const contour = this.contourKey(data);
        if (!sameContour(this.lastContour, contour)) {
            // A new contour builds its buffers with the current appearance
            void this.requestContour();
        } else if (!sameAppearance(this.lastAppearance, this.appearanceKey(data))) {
            this.applyAppearance(data);
        }
    }

    /** Called by the driver when the view origin moves */
    onViewMoved(): void {
        const data = this.data;
        if (data?.visible && !data.originLock) {
            void this.requestContour();
        }
    }

    /**
     * Contour again even if nothing in the record changed: the map's data changed (e.g. maps updated after a
     * refinement, reflections replaced), or the line width. Resolves once drawn (or replaced by a newer contour).
     */
    redraw(): Promise<void> {
        this.lastContour = null;
        return this.requestContour();
    }

    /** Draw with a smaller radius during interaction, null to go back to the record's radius */
    setFastRadius(radius: number | null): void {
        this.fastRadius = radius;
        this.update();
    }

    hide(): void {
        if (this.buffers.length === 0) {
            return;
        }
        this.replaceBuffers([]);
        this.lastContour = null;
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
        // The scene origin is the negated view centre
        const centre = data.originLock?.centre ?? (this.instance.store.getState().sceneSettings.origin.map(coord => -coord) as Vec3);
        let colourByMap: ContourKey["colourByMap"] = null;
        if (data.colourByMap) {
            const otherMap = this.instance.getMapList().find(map => map.uniqueId === data.colourByMap.mapUid);
            if (otherMap) {
                colourByMap = { molNo: otherMap.molNo, min: data.colourByMap.min, max: data.colourByMap.max };
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
        };
    }

    /**
     * Queue a contour with the current record and view. Requests are not coalesced here: the worker queue squashes
     * the older ones still waiting (same squash key), so only the latest is contoured.
     */
    private requestContour(): Promise<void> {
        const data = this.data;
        if (!data?.visible) {
            this.hide();
            return Promise.resolve();
        }
        return this.contour(this.contourKey(data), this.appearanceKey(data)).catch(err => {
            if (!(err instanceof CommandSquashedError)) {
                console.error(`Map representation ${this.id}: contour failed`, err);
            }
        });
    }

    private async contour(key: ContourKey, appearance: AppearanceKey): Promise<void> {
        const worker = this.instance.workerCommand;
        const meshType = MESH_TYPES[key.style];
        const options = { squashKey: this.squashKey };
        const mesh = key.colourByMap
            ? await worker.get_map_contours_mesh_using_other_map_for_colours(
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
        // Hidden or removed while the contour was running
        if (this.disposed || !this.data?.visible) {
            return;
        }
        this.buildContourBuffers(mesh, appearance, key.colourByMap !== null);
        this.lastContour = key;
        this.lastAppearance = appearance;
    }

    /**
     * Turn a Coot mesh into GL buffers. Difference maps are split into a positive and a negative buffer, using the
     * colours Coot gives each vertex. With `keepCootColours` (colour by map) only the alpha is applied.
     *
     * TODO: MoorhenMap.setupContourBuffers reuses the existing GL buffer for non-difference maps when the
     * primitive type is unchanged (marked "may be broken"); measure re-contour cost on view moves before adding it.
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
        this.paint(this.buffers, appearance, data.colourByMap !== null);
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
        this.buffers.forEach(({ buffer }) => buffer.clearBuffers());
        const others = (this.instance.store.getState().glRef.displayBuffers ?? []).filter(buffer => !oldIds.has(buffer.id));
        this.buffers = newBuffers;
        this.instance.dispatch(setDisplayBuffers([...others, ...newBuffers.map(({ buffer }) => buffer)]));
    }
}
