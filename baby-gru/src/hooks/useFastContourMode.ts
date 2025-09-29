import { useDispatch, useSelector, useStore } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import { RootState } from '../store/MoorhenReduxStore';
import { setContourLevel, setMapFastRadius } from '../store/mapContourSettingsSlice';
import { moorhen } from '../types/moorhen';
import { useStateWithRef } from './useStateWithRef';

interface UseFastContourModeProps {
    map: moorhen.Map;
    mapRadius: number;
    radiusThreshold?: number;
    fastRadius?: number | 'auto';
    timeoutDelay?: number;
}

interface FastContourModeReturn {
    isInFastMode: boolean;
    fastMapContourLevel: (newContourLevel: number) => void;
}

/**
 * Custom React hook to enable a "fast contour mode" for map visualization.
 *
 * This hook temporarily reduces the map radius and unlocks the map origin to speed up contour level updates,
 * then restores the original parameters after a specified timeout. It is useful for improving UI responsiveness
 * when users rapidly adjust contour levels.
 *
 * @param map - The map object to operate on, expected to have `molNo`, `isOriginLocked`, and `toggleOriginLock` properties.
 * @param mapRadius - The current radius of the map.
 * @param radiusThreshold - The radius threshold above which fast mode is triggered (default: 25).
 * @param fastRadius - The reduced radius to use during fast mode (default: 20).
 * @param timeoutDelay - The delay in milliseconds after which fast mode ends (default: 1000).
 *
 * @returns An object containing:
 *   - `isInFastMode`: A boolean indicating if fast mode is currently active.
 *   - `fastMapContourLevel`: A function to set the contour level, automatically managing fast mode as needed.
 *
 * @remarks
 * - Automatically cleans up and restores original map parameters if the component unmounts during fast mode.
 * - Designed for use with Redux dispatch and map state management.
 */
export const useFastContourMode = ({
    map,
    mapRadius,
    radiusThreshold = 25,
    fastRadius = 'auto',
    timeoutDelay = 1000,
}: UseFastContourModeProps): FastContourModeReturn => {
    const store = useStore<RootState>().getState();
    const dispatch = useDispatch();

    if (fastRadius === 'auto') {
        const zoomLevel = useSelector((state: RootState) => state.glRef.zoom);
        const aspectRatio = store.sceneSettings.width / store.sceneSettings.height;
        const seamlessRadius = Math.min(22 * zoomLevel * aspectRatio, mapRadius);
        fastRadius = seamlessRadius;
    }

    const [originalParameters, setOriginalParameters, originalParametersRef] = useStateWithRef<{
        radius: number;
        originLocked: boolean;
    } | null>(null);
    const [isInFastMode, setIsInFastMode] = useState<boolean>(false);
    const fastModeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const startFastMode = () => {
        console.log('Starting fast mode for map', map.molNo);
        setOriginalParameters({ radius: mapRadius, originLocked: map.isOriginLocked });
        if (map.isOriginLocked) {
            map.toggleOriginLock(false);
        }
        dispatch(setMapFastRadius({ molNo: map.molNo, radius: fastRadius }));
        setIsInFastMode(true);
    };

    const endFastMode = () => {
        if (!originalParametersRef.current) return;

        // Clear the timeout first to prevent race conditions
        if (fastModeTimeoutRef.current) {
            clearTimeout(fastModeTimeoutRef.current);
            fastModeTimeoutRef.current = null;
        }

        map.toggleOriginLock(originalParametersRef.current.originLocked);
        dispatch(setMapFastRadius({ molNo: map.molNo, radius: -1 }));
        setIsInFastMode(false);
        setOriginalParameters(null);
    };

    const fastMapContourLevel = (newContourLevel: number) => {
        if (!map) return;

        if (mapRadius <= radiusThreshold && !isInFastMode) {
            dispatch(setContourLevel({ molNo: map.molNo, contourLevel: newContourLevel }));
            return;
        }

        if (!isInFastMode) {
            startFastMode();
        }
        dispatch(setContourLevel({ molNo: map.molNo, contourLevel: newContourLevel }));

        if (fastModeTimeoutRef.current) {
            clearTimeout(fastModeTimeoutRef.current);
        }

        fastModeTimeoutRef.current = setTimeout(() => {
            endFastMode();
        }, timeoutDelay);
    };

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (fastModeTimeoutRef.current) {
                clearTimeout(fastModeTimeoutRef.current);
                fastModeTimeoutRef.current = null;
            }
            // Force exit fast mode if component unmounts during fast mode
            if (isInFastMode && originalParameters) {
                map.toggleOriginLock(originalParameters.originLocked);
                dispatch(setMapFastRadius({ molNo: map.molNo, radius: -1 }));
            }
        };
    }, []);

    return {
        isInFastMode,
        fastMapContourLevel,
    };
};
