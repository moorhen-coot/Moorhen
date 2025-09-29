import { useSnackbar } from 'notistack';
import { useSelector, useStore } from 'react-redux';
import { useRef } from 'react';
import { useDocumentEventListener } from '../../../hooks/useDocumentEventListener';
import { useFastContourMode } from '../../../hooks/useFastContourMode';
import { RootState } from '../../../store/MoorhenReduxStore';
import { moorhen } from '../../../types/moorhen';

export const MapScrollWheelListener = (props: { mapContourLevel: number; mapIsVisible: boolean; map: moorhen.Map }) => {
    const mapContourLevelRef = useRef<number>(1);
    mapContourLevelRef.current = props.mapContourLevel;
    const store = useStore<RootState>().getState();

    const mapRadius = useSelector((state: RootState) => {
        const mapRadiusItem = state.mapContourSettings.mapRadii.find(item => item.molNo === props.map.molNo);
        return mapRadiusItem?.radius || props.map.suggestedRadius || 25;
    });

    const contourWheelSensitivityFactor = useSelector((state: RootState) => state.mouseSettings.contourWheelSensitivityFactor);
    const { enqueueSnackbar } = useSnackbar();
    const zoomLevel = useSelector((state: RootState) => state.glRef.zoom);
    const aspectRatio = store.sceneSettings.width / store.sceneSettings.height;
    const seamlessRadius = 22 * zoomLevel * aspectRatio;
    //const outOfMap: boolean = (store.glRef.origin)

    // Use the fast contour mode hook
    const { fastMapContourLevel } = useFastContourMode({
        map: props.map,
        mapRadius,
        radiusThreshold: 25,
        fastRadius: seamlessRadius,
        timeoutDelay: 1000,
    });

    // Debouncing refs for performance
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastWheelTimeRef = useRef<number>(0);
    const debounceDelayMs = 25; // Adjust this value as needed
    const debounceRepeatTime = 50;

    const handleWheelContourLevel = (evt: moorhen.WheelContourLevelEvent) => {
        evt.preventDefault();

        if (!props.mapIsVisible) {
            enqueueSnackbar('Active map not displayed, cannot change contour lvl.', { variant: 'warning' });
            return;
        }

        // Prevent rapid-fire wheel events from causing performance issues
        const now = Date.now();
        if (now - lastWheelTimeRef.current < debounceRepeatTime) {
            // Minimum 50ms between wheel events
            console.log('Skipping wheel event to avoid flooding');
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
    };

    useDocumentEventListener<moorhen.WheelContourLevelEvent>('wheelContourLevelChanged', handleWheelContourLevel);

    return null;
};
