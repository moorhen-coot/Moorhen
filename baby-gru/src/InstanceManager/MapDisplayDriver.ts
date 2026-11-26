import { addMapRepresentation, removeMapRepresentationsOfMap, selectPrimaryMapRepresentation } from "../store/mapRepresentationsSlice";
import type { RootState } from "../store/MoorhenReduxStore";
import type { MoorhenMap } from "../utils/MoorhenMap";
import { MapRepresentation } from "../utils/Representation/MapRepresentation";
import type { MapRepresentationData } from "../utils/Representation/mapRepresentationData";
import { guid } from "../utils/utils";
import { onGpuMapContoursChanged } from "../WebGPUComponents/mapContour/setting";
import { ensureLockedDrawOrigin, followViewWithLockedCell, initialMapRepresentationData } from "./mapDisplayRecords";
import type { MoorhenInstance } from "./MoorhenInstance";

/**
 * Draws the maps of an instance from their representation records (`mapRepresentations` slice), outside React
 * (replaces MoorhenMapManager). One per instance, started by `startInstance`, stopped by `cleanup`.
 *
 * On every store change it:
 * - gives each new map its first record (defaults and the map's `initialDisplay`), and removes the records of closed
 *   maps;
 * - creates / disposes a `MapRepresentation` per record, and tells it when its record changed;
 * - re-contours representations that follow the view when the view moves (or on mouse up, with
 *   `reContourMapOnlyOnMouseUp`), and all of them when the line width changes.
 *
 * See .roadmaps/map-display.md.
 */
export class MapDisplayDriver {
    private readonly instance: MoorhenInstance;
    private readonly representations = new Map<string, MapRepresentation>();
    /** Smaller radius while the user drags the contour level (useFastContourMode), per map uid: transient, not in the store */
    private readonly fastRadii = new Map<string, number>();
    private knownMapUids = new Set<string>();

    private lastMaps: RootState["maps"] | null = null;
    private lastRecords: Record<string, MapRepresentationData> = {};
    private lastOrigin: number[] | null = null;
    private lastLineWidth: number | null = null;
    private lastFastRadii = new Map<string, number | null>();

    private unsubscribe: (() => void) | null = null;
    private unsubscribeGpuMode: (() => void) | null = null;
    private processing = false;
    private changedWhileProcessing = false;

    constructor(instance: MoorhenInstance) {
        this.instance = instance;
    }

    start(): void {
        this.stop();
        const state = this.instance.store.getState();
        this.lastOrigin = state.sceneSettings.origin;
        this.lastLineWidth = state.mapContourSettings.mapLineWidth;
        this.unsubscribe = this.instance.store.subscribe(() => this.onStoreChange());
        // Maps moved to the GPU contours (Coot's buffers come off) or back to Coot (contour them again)
        this.unsubscribeGpuMode = onGpuMapContoursChanged(() => {
            this.representations.forEach(representation => void representation.redraw());
        });
        // No document in Node (API tests)
        if (typeof document !== "undefined") {
            document.addEventListener("mouseup", this.onMouseUp, { capture: true });
        }
        this.onStoreChange();
    }

    stop(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.unsubscribeGpuMode?.();
        this.unsubscribeGpuMode = null;
        if (typeof document !== "undefined") {
            document.removeEventListener("mouseup", this.onMouseUp, { capture: true });
        }
        this.representations.forEach(representation => representation.dispose());
        this.representations.clear();
        this.fastRadii.clear();
        this.knownMapUids = new Set();
        this.lastMaps = null;
        this.lastRecords = {};
        this.lastFastRadii.clear();
    }

    /** The representations drawing a map */
    getRepresentations(mapUid: string): MapRepresentation[] {
        return [...this.representations.values()].filter(representation => representation.map.uniqueId === mapUid);
    }

    /**
     * Contour a map's representations again (its data changed: map updated after a refinement, reflections
     * replaced...). Resolves once drawn.
     */
    redrawMap(mapUid: string): Promise<void> {
        this.onStoreChange();
        return Promise.all(this.getRepresentations(mapUid).map(representation => representation.redraw())).then(() => undefined);
    }

    /**
     * Contour every map representation that follows the view around `origin` (a scene origin: the negated view
     * centre) instead of the store's, and resolve once all are drawn. For a movie export, which drives the camera
     * itself and captures each frame only once the scene has caught up (originFollowing.ts).
     */
    contourMapsAt(origin: readonly number[]): Promise<void> {
        const centre = [-origin[0], -origin[1], -origin[2]] as [number, number, number];
        return Promise.all([...this.representations.values()].map(representation => representation.contourAround(centre))).then(() => undefined);
    }

    /**
     * Draw a map's representations with a smaller radius around the view, even when its origin is locked, while the
     * user changes its contour level quickly (useFastContourMode); null to go back to the records. Not a setting:
     * nothing is written to the store. Ignored by GPU contours, which are fast enough at any radius.
     */
    setFastRadius(mapUid: string, radius: number | null): void {
        if (radius && radius > 0) {
            this.fastRadii.set(mapUid, radius);
        } else {
            this.fastRadii.delete(mapUid);
        }
        this.onStoreChange();
    }

    private onStoreChange(): void {
        // Dispatches made while processing (records written below) are handled in the next loop, not re-entrantly
        if (this.processing) {
            this.changedWhileProcessing = true;
            return;
        }
        this.processing = true;
        try {
            do {
                this.changedWhileProcessing = false;
                this.process();
            } while (this.changedWhileProcessing);
        } catch (err) {
            console.error("Map display driver failed:", err);
        } finally {
            this.processing = false;
        }
    }

    private process(): void {
        const store = this.instance.store;
        let state = store.getState();
        const origin = state.sceneSettings.origin;
        const viewMoved = origin !== this.lastOrigin;

        if (state.maps !== this.lastMaps) {
            this.syncMaps(state.maps);
            this.lastMaps = state.maps;
            state = store.getState();
        }

        if (viewMoved) {
            // Moves `drawOrigin`, which writes the record (re-entrant dispatch: handled in the next loop)
            state.maps.forEach(map => followViewWithLockedCell(map, origin));
            state = store.getState();
        }

        this.syncRepresentations(state.mapRepresentations.representations);
        this.syncFastRadii(state);

        if (state.mapContourSettings.mapLineWidth !== this.lastLineWidth) {
            this.lastLineWidth = state.mapContourSettings.mapLineWidth;
            this.representations.forEach(representation => void representation.redraw());
        }
        if (viewMoved) {
            this.lastOrigin = origin;
            if (!state.mapContourSettings.reContourMapOnlyOnMouseUp) {
                this.representations.forEach(representation => representation.onViewMoved());
            }
        }
    }

    /** New maps get their first record; closed maps lose their records */
    private syncMaps(maps: RootState["maps"]): void {
        const dispatch = this.instance.dispatch;
        const uids = new Set(maps.map(map => map.uniqueId));
        maps.filter(map => !this.knownMapUids.has(map.uniqueId)).forEach(map => {
            // Before the record exists the map fields are the map's own; the record takes them from here on
            ensureLockedDrawOrigin(map, this.instance.store.getState().sceneSettings.origin);
            if (!selectPrimaryMapRepresentation(this.instance.store.getState(), map.uniqueId)) {
                dispatch(addMapRepresentation(initialMapRepresentationData(map, this.instance.store.getState(), guid())));
            }
        });
        [...this.knownMapUids]
            .filter(uid => !uids.has(uid))
            .forEach(uid => {
                this.fastRadii.delete(uid);
                this.lastFastRadii.delete(uid);
                dispatch(removeMapRepresentationsOfMap(uid));
            });
        this.knownMapUids = uids;
    }

    /** One `MapRepresentation` per record: create, update or dispose */
    private syncRepresentations(records: Record<string, MapRepresentationData>): void {
        if (records === this.lastRecords) {
            return;
        }
        // Removed ones first: a record replaced by another for the same map (a scene shown) must not take down what
        // the new one draws (a map's 2D slice buffers are the map's: hiding the old one would cancel the new one's)
        this.representations.forEach((representation, id) => {
            if (!records[id]) {
                representation.dispose();
                this.representations.delete(id);
            }
        });
        Object.values(records).forEach(record => {
            const existing = this.representations.get(record.id);
            if (existing) {
                if (record !== this.lastRecords[record.id]) {
                    existing.update();
                }
                return;
            }
            const map: MoorhenMap | undefined = this.instance.getMapList().find(item => item.uniqueId === record.mapUid);
            if (map) {
                const representation = new MapRepresentation(record.id, map, this.instance);
                this.representations.set(record.id, representation);
                representation.update();
            }
        });
        this.lastRecords = records;
    }

    /** The fast-contour radius during interaction (`setFastRadius`) */
    private syncFastRadii(state: RootState): void {
        state.maps.forEach(map => {
            const radius = this.fastRadii.get(map.uniqueId) ?? null;
            if (radius !== (this.lastFastRadii.get(map.uniqueId) ?? null)) {
                this.lastFastRadii.set(map.uniqueId, radius);
                this.getRepresentations(map.uniqueId).forEach(representation => representation.setFastRadius(radius));
            }
        });
    }

    /** With `reContourMapOnlyOnMouseUp`, maps follow the view when the mouse is released */
    private readonly onMouseUp = (): void => {
        if (this.instance.store.getState().mapContourSettings.reContourMapOnlyOnMouseUp) {
            this.representations.forEach(representation => representation.onViewMoved());
        }
    };
}
