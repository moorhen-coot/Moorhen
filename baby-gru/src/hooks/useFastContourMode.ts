import { useDispatch, useSelector, useStore } from 'react-redux';
import { useEffect, useRef } from 'react';
import { RootState } from '../store/MoorhenReduxStore';
import { selectMapRepresentation, selectPrimaryMapRepresentation, selectShownLevelsBase, setMapRepresentation, shiftMapRepresentationLevels } from '../store/mapRepresentationsSlice';
import { useMoorhenInstance } from '../InstanceManager/useMoorhenInstance';
import { moorhen } from '../types/moorhen';
import { gpuMapContourSetting } from '../WebGPUComponents/mapContour/setting';
import { useStateWithRef } from './useStateWithRef';

interface UseFastContourModeProps {
    map: moorhen.Map;
    mapRadius: number;
    radiusThreshold?: number;
    fastRadius?: number | 'auto';
    timeoutDelay?: number;
    /**
     * Move every shown representation of the map together (multi-representation mode): the level given is then the new
     * lowest one (selectShownLevelsBase), and all shown ones move by the same amount
     */
    allShown?: boolean;
    /** The representation whose level is set (a chip's), else the map's first */
    recordId?: string;
}

interface FastContourModeReturn {
    isInFastMode: boolean;
    fastMapContourLevel: (newContourLevel: number) => void;
}

/**
 * Custom React hook to enable a "fast contour mode" for map visualization.
 *
 * While the user changes the contour level quickly, the map is drawn with a smaller radius around the view (even
 * if its origin is locked), then as its display record says again after a timeout. The smaller radius is a
 * transient override on the map display driver (`mapDisplay.setFastRadius`): nothing is written to the store but
 * the level. GPU contours are fast at any radius, so they never use it.
 *
 * @param map - The map to change the level of.
 * @param mapRadius - The current radius of the map.
 * @param radiusThreshold - The radius above which fast mode is used (default: 25).
 * @param fastRadius - The radius to draw at in fast mode, or "auto": what the view shows (default).
 * @param timeoutDelay - How long after the last change fast mode ends, in ms (default: 1000).
 *
 * @returns An object containing:
 *   - `isInFastMode`: whether fast mode is on.
 *   - `fastMapContourLevel`: sets the contour level, in fast mode if needed.
 */
export const useFastContourMode = ({
    map,
    mapRadius,
    radiusThreshold = 25,
    fastRadius = 'auto',
    timeoutDelay = 1000,
    allShown = false,
    recordId,
}: UseFastContourModeProps): FastContourModeReturn => {
    const store = useStore<RootState>();
    const dispatch = useDispatch();
    const moorhenInstance = useMoorhenInstance();
    const zoomLevel = useSelector((state: RootState) => state.sceneSettings.zoom);

    let radius: number;
    if (fastRadius === 'auto') {
        const { width, height } = store.getState().sceneSettings;
        radius = Math.min(22 * zoomLevel * (width / height), mapRadius);
    } else {
        radius = fastRadius;
    }

    const [isInFastMode, setIsInFastMode, isInFastModeRef] = useStateWithRef<boolean>(false);
    const fastModeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const endFastMode = () => {
        if (fastModeTimeoutRef.current) {
            clearTimeout(fastModeTimeoutRef.current);
            fastModeTimeoutRef.current = null;
        }
        if (!isInFastModeRef.current) return;
        moorhenInstance?.mapDisplay?.setFastRadius(map.uniqueId, null);
        setIsInFastMode(false);
    };

    /**
     * The level of `recordId`'s representation (a chip's), else the map's first, or with `allShown` the lowest of the
     * shown ones, the others moving by as much
     */
    const setLevel = (contourLevel: number) => {
        if (allShown) {
            if (!Number.isFinite(contourLevel) || contourLevel <= 0) return;
            const base = selectShownLevelsBase(store.getState(), map.uniqueId);
            if (base !== undefined && contourLevel !== base) {
                dispatch(shiftMapRepresentationLevels({ mapUid: map.uniqueId, by: contourLevel - base }));
            }
            return;
        }
        const state = store.getState();
        const record = (recordId ? selectMapRepresentation(state, recordId) : undefined) ?? selectPrimaryMapRepresentation(state, map.uniqueId);
        if (record) dispatch(setMapRepresentation({ id: record.id, changes: { contourLevel } }));
    };

    const fastMapContourLevel = (newContourLevel: number) => {
        if (!map) return;

        // GPU contours are drawn at the full radius anyway
        if ((mapRadius <= radiusThreshold || gpuMapContourSetting.enabled) && !isInFastModeRef.current) {
            setLevel(newContourLevel);
            return;
        }

        if (!isInFastModeRef.current) {
            // Before the level, so that the new level is drawn small at once
            moorhenInstance?.mapDisplay?.setFastRadius(map.uniqueId, radius);
            setIsInFastMode(true);
        }
        setLevel(newContourLevel);

        if (fastModeTimeoutRef.current) {
            clearTimeout(fastModeTimeoutRef.current);
        }
        fastModeTimeoutRef.current = setTimeout(endFastMode, timeoutDelay);
    };

    // Leave fast mode if the component unmounts during it
    useEffect(() => endFastMode, []);

    return {
        isInFastMode,
        fastMapContourLevel,
    };
};
