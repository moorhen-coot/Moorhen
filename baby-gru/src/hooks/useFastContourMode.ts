import { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { moorhen } from "../types/moorhen";
import { setContourLevel, setMapRadius } from "../moorhen";
import { useStateWithRef } from "./useStateWithRef";

interface UseFastContourModeProps {
    map: moorhen.Map;
    mapRadius: number;
    radiusThreshold?: number;
    fastRadius?: number;
    timeoutDelay?: number;
}

interface FastContourModeReturn {
    isInFastMode: boolean;
    fastMapContourLevel: (newContourLevel: number) => void;
}

export const useFastContourMode = ({
    map,
    mapRadius,
    radiusThreshold = 25,
    fastRadius = 20,
    timeoutDelay = 1000
}: UseFastContourModeProps): FastContourModeReturn => {
    const dispatch = useDispatch();

    const [originalParameters, setOriginalParameters, originalParametersRef] = useStateWithRef<{ radius: number; originLocked: boolean } | null>(null);
    const [isInFastMode, setIsInFastMode] = useState<boolean>(false);
    const fastModeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const startFastMode = (newContourLevel: number) => {
        console.log("Starting fast mode for map", map.molNo);
        setOriginalParameters({ radius: mapRadius, originLocked: map.isOriginLocked });
        if (map.isOriginLocked) {
            map.toggleOriginLock(false);
        }
        dispatch(setMapRadius({ molNo: map.molNo, radius: fastRadius }));
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
        dispatch(setMapRadius({ molNo: map.molNo, radius: originalParametersRef.current.radius }));
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
            startFastMode(newContourLevel);
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
                dispatch(setMapRadius({ molNo: map.molNo, radius: originalParameters.radius }));
            }
        };
    }, []);

    return {
        isInFastMode,
        fastMapContourLevel
    };
};
