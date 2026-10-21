import { addMapRepresentation, removeMapRepresentationsOfMap, setMapRepresentation } from "../store/mapRepresentationsSlice";
import type { RootState } from "../store/MoorhenReduxStore";
import type { MoorhenMap } from "../utils/MoorhenMap";
import { MapRepresentation } from "../utils/Representation/MapRepresentation";
import type { MapRepresentationData } from "../utils/Representation/mapRepresentationData";
import { guid } from "../utils/utils";
import {
    ensureLockedDrawOrigin,
    followViewWithLockedCell,
    initialiseLegacyMapSettings,
    legacyFastRadius,
    legacyRepresentationData,
} from "./legacyMapDisplay";
import type { MoorhenInstance } from "./MoorhenInstance";

/**
 * Draws the maps of an instance from their representation records (`mapRepresentations` slice), outside React
 * (replaces MoorhenMapManager). One per instance, started by `startInstance`, stopped by `cleanup`.
 *
 * On every store change it:
 * - gives each new map its records, and removes the records of closed maps;
 * - (transition) updates each map's first record from the old `mapContourSettings` lists (legacyMapDisplay.ts);
 * - creates / disposes a `MapRepresentation` per record, and tells it when its record changed;
 * - re-contours representations that follow the view when the view moves (or on mouse up, with
 *   `reContourMapOnlyOnMouseUp`), and all of them when the line width changes.
 *
 * See .roadmaps/map-display.md.
 */
export class MapDisplayDriver {
    private readonly instance: MoorhenInstance;
    private readonly representations = new Map<string, MapRepresentation>();
    /** Transition: the representation the old lists write to, per map uid */
    private readonly legacyRepresentationIds = new Map<string, string>();
    private knownMapUids = new Set<string>();

    private lastMaps: RootState["maps"] | null = null;
    private lastContourSettings: RootState["mapContourSettings"] | null = null;
    private lastRecords: Record<string, MapRepresentationData> = {};
    private lastOrigin: number[] | null = null;
    private lastLineWidth: number | null = null;
    private lastFastRadii = new Map<string, number | null>();

    private unsubscribe: (() => void) | null = null;
    private processing = false;
    private changedWhileProcessing = false;
    private legacyFieldsChanged = false;

    constructor(instance: MoorhenInstance) {
        this.instance = instance;
    }

    start(): void {
        this.stop();
        const state = this.instance.store.getState();
        this.lastOrigin = state.sceneSettings.origin;
        this.lastLineWidth = state.mapContourSettings.mapLineWidth;
        this.unsubscribe = this.instance.store.subscribe(() => this.onStoreChange());
        // No document in Node (API tests)
        if (typeof document !== "undefined") {
            document.addEventListener("mouseup", this.onMouseUp, { capture: true });
        }
        this.onStoreChange();
    }

    stop(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;
        if (typeof document !== "undefined") {
            document.removeEventListener("mouseup", this.onMouseUp, { capture: true });
        }
        this.representations.forEach(representation => representation.dispose());
        this.representations.clear();
        this.legacyRepresentationIds.clear();
        this.knownMapUids = new Set();
        this.lastMaps = null;
        this.lastContourSettings = null;
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
        this.legacyFieldsChanged = true;
        this.onStoreChange();
        return Promise.all(this.getRepresentations(mapUid).map(representation => representation.redraw())).then(() => undefined);
    }

    /**
     * Transition: a field of a map changed outside the store (`isOriginLocked`, `drawOrigin`, `otherMapForColouring`),
     * update its record.
     */
    syncMapFields(): void {
        this.legacyFieldsChanged = true;
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

        let legacyChanged = this.legacyFieldsChanged || state.mapContourSettings !== this.lastContourSettings;
        if (viewMoved) {
            state.maps.forEach(map => {
                legacyChanged = followViewWithLockedCell(map, origin) || legacyChanged;
            });
        }
        if (legacyChanged) {
            this.legacyFieldsChanged = false;
            this.lastContourSettings = state.mapContourSettings;
            this.syncLegacyRecords(store.getState());
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

    /** New maps get their default display and a record; closed maps lose their records */
    private syncMaps(maps: RootState["maps"]): void {
        const dispatch = this.instance.dispatch;
        const uids = new Set(maps.map(map => map.uniqueId));
        maps.filter(map => !this.knownMapUids.has(map.uniqueId)).forEach(map => {
            initialiseLegacyMapSettings(map, this.instance.store.getState().mapContourSettings, dispatch);
            const id = guid();
            this.legacyRepresentationIds.set(map.uniqueId, id);
            ensureLockedDrawOrigin(map, this.instance.store.getState().sceneSettings.origin);
            dispatch(addMapRepresentation(legacyRepresentationData(map, this.instance.store.getState(), id, undefined)));
        });
        [...this.knownMapUids]
            .filter(uid => !uids.has(uid))
            .forEach(uid => {
                this.legacyRepresentationIds.delete(uid);
                this.lastFastRadii.delete(uid);
                dispatch(removeMapRepresentationsOfMap(uid));
            });
        this.knownMapUids = uids;
    }

    /** Transition: each map's first record follows the old lists and map fields */
    private syncLegacyRecords(state: RootState): void {
        state.maps.forEach(map => {
            const id = this.legacyRepresentationIds.get(map.uniqueId);
            const current = id ? state.mapRepresentations.representations[id] : undefined;
            if (!current) {
                return;
            }
            ensureLockedDrawOrigin(map, state.sceneSettings.origin);
            const { id: _id, mapUid: _mapUid, ...changes } = legacyRepresentationData(map, state, id, current);
            const { id: _currentId, mapUid: _currentMapUid, ...currentFields } = current;
            if (JSON.stringify(changes) !== JSON.stringify(currentFields)) {
                this.instance.dispatch(setMapRepresentation({ id, changes }));
            }
        });
    }

    /** One `MapRepresentation` per record: create, update or dispose */
    private syncRepresentations(records: Record<string, MapRepresentationData>): void {
        if (records === this.lastRecords) {
            return;
        }
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
        this.representations.forEach((representation, id) => {
            if (!records[id]) {
                representation.dispose();
                this.representations.delete(id);
            }
        });
        this.lastRecords = records;
    }

    /** Transition: the fast-contour radius during interaction is in the old lists (`mapFastRadii`) */
    private syncFastRadii(state: RootState): void {
        state.maps.forEach(map => {
            const radius = legacyFastRadius(map, state.mapContourSettings);
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
