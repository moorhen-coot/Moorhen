import { useSnackbar } from 'notistack';
import { useSelector } from 'react-redux';
import { useCallback, useRef } from 'react';
import { useDocumentEventListener } from '../../../hooks/useDocumentEventListener';
import { useFastContourMode } from '../../../hooks/useFastContourMode';
import { RootState } from '../../../store/MoorhenReduxStore';
import { moorhen } from '../../../types/moorhen';

export const MapScrollWheelListener = (props: { mapContourLevel: number; mapIsVisible: boolean; map: moorhen.Map }) => {
    const mapContourLevelRef = useRef<number>(1);
    mapContourLevelRef.current = props.mapContourLevel;

    const mapRadius = useSelector((state: RootState) => {
        const mapRadiusItem = state.mapContourSettings.mapRadii.find(item => item.molNo === props.map.molNo);
        return mapRadiusItem?.radius || props.map.suggestedRadius || 25;
    });

    const zoomLevel = useSelector((state: RootState) => state.glRef.zoom);
    const contourWheelSensitivityFactor = useSelector((state: RootState) => state.mouseSettings.contourWheelSensitivityFactor);
    const origin = useSelector((state: RootState) => state.glRef.origin);
    const { enqueueSnackbar } = useSnackbar();

    // Use the fast contour mode hook
    const { fastMapContourLevel } = useFastContourMode({
        map: props.map,
        mapRadius,
        radiusThreshold: 25,
        fastRadius: 'auto',
        timeoutDelay: 500,
    });

    // Debouncing refs for performance
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastWheelTimeRef = useRef<number>(0);
    const debounceDelayMs = 25; // Adjust this value as needed
    const debounceRepeatTime = 50;

    const distanceFromOrigin = Math.sqrt(
        Math.pow(props.map.mapCentre[0] - origin[0], 2) +
            Math.pow(props.map.mapCentre[1] - origin[1], 2) +
            Math.pow(props.map.mapCentre[2] - origin[2], 2)
    );
    const outOfMap = distanceFromOrigin > mapRadius - 8 * zoomLevel && props.map.isOriginLocked;

    const handleWheelContourLevel = useCallback(
        (evt: moorhen.WheelContourLevelEvent) => {
            evt.preventDefault();
            if (outOfMap) {
                enqueueSnackbar(`Out of map bounds! \nIncrease map radius or unlock origin`, {
                    variant: 'warning',
                    persist: false,
                });
                return;
            }

            if (!props.mapIsVisible) {
                enqueueSnackbar('Active map not displayed, cannot change contour lvl.', { variant: 'warning' });
                return;
            }

            // Prevent rapid-fire wheel events from causing performance issues
            const now = Date.now();
            if (now - lastWheelTimeRef.current < debounceRepeatTime) {
                return;
            }
            lastWheelTimeRef.current = now;

            let scaling = props.map.isEM ? props.map.levelRange[0] : 0.01;
            let newMapContourLevel: number;

            if (evt.detail.factor > 1) {
                newMapContourLevel = mapContourLevelRef.current + contourWheelSensitivityFactor * scaling;
            } else {
                newMapContourLevel = mapContourLevelRef.current - contourWheelSensitivityFactor * scaling;
            }

            // Clear existing timeout and set a new one for debounced update
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }

            debounceTimeoutRef.current = setTimeout(() => {
                if (newMapContourLevel) {
                    fastMapContourLevel(newMapContourLevel);
                    enqueueSnackbar(`map-${props.map.molNo}-contour-lvl-change`, {
                        variant: 'mapContourLevel',
                        persist: true,
                        mapMolNo: props.map.molNo,
                        mapPrecision: props.map.levelRange[0],
                    });
                }
                debounceTimeoutRef.current = null;
            }, debounceDelayMs);
        },
        [props.map, mapContourLevelRef, fastMapContourLevel, enqueueSnackbar, outOfMap]
    );

    useDocumentEventListener<moorhen.WheelContourLevelEvent>('wheelContourLevelChanged', handleWheelContourLevel);

    return null;
};
