import { useEffect, useState, useRef, useCallback } from "react";
import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch } from "react-redux";
import { useSnackbar } from "notistack";
import { setContourLevel, setMapRadius } from "../../moorhen";

export const MapScrollWheelHandeler = (props: { mapContourLevel: number; mapIsVisible: boolean; mapRadius: number; map: moorhen.Map }) => {
    const mapContourLevelRef = useRef<number>(1);
    mapContourLevelRef.current = props.mapContourLevel;
    const dispatch = useDispatch();

    const contourWheelSensitivityFactor = useSelector((state: moorhen.State) => state.mouseSettings.contourWheelSensitivityFactor);
    const { enqueueSnackbar } = useSnackbar();

    const handleWheelContourLevel = useCallback((evt: moorhen.WheelContourLevelEvent) => {
        let newMapContourLevel: number;
        if (!props.mapIsVisible) {
            enqueueSnackbar("Active map not displayed, cannot change contour lvl.", { variant: "warning" });
            return;
        }

        let scaling = props.map.isEM ? props.map.levelRange[0] : 0.01;
        if (evt.detail.factor > 1) {
            newMapContourLevel = mapContourLevelRef.current + contourWheelSensitivityFactor * scaling;
        } else {
            newMapContourLevel = mapContourLevelRef.current - contourWheelSensitivityFactor * scaling;
        }

        if (newMapContourLevel) {
            fastMapContourLevel(newMapContourLevel);
            enqueueSnackbar(`map-${props.map.molNo}-contour-lvl-change`, {
                variant: "mapContourLevel",
                persist: true,
                mapMolNo: props.map.molNo,
                mapPrecision: props.map.levelRange[0],
            });
        }
    }, [props.mapIsVisible]);

    useEffect(() => {
        const eventListener = (evt: Event) => {
            handleWheelContourLevel(evt as unknown as moorhen.WheelContourLevelEvent);
        };
        document.addEventListener("wheelContourLevelChanged", eventListener);
        return () => {
            document.removeEventListener("wheelContourLevelChanged", eventListener);
        };
    }, [handleWheelContourLevel]);

    // Fast contour level:
    // This work by delaying the initial contour draw if the radius is > thresolds,
    // and then start the contour drawing with the small raidus routin
    const fastContourResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fastContourInitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [lastRadius, setLastRadius] = useState<number>(25);
    const [wasOriginLocked, setWasOriginLocked] = useState<boolean>(false);

    const startFinishTimeout = () => {
        if (!props.map) return;
        fastContourResetTimeoutRef.current = setTimeout(() => {
            props.map.toggleOriginLock(wasOriginLocked);
            fastContourInitTimeoutRef.current = null;
            dispatch(setMapRadius({ molNo: props.map.molNo, radius: lastRadius }));
        }, 500);
    };

    const fastContourInitTimeout = (contourLevel: number) => {
        if (!props.map) return;
        fastContourInitTimeoutRef.current = setTimeout(() => {
            fastContourInitTimeoutRef.current = null;
            dispatch(
                setContourLevel({
                    molNo: props.map.molNo,
                    contourLevel: contourLevel,
                })
            );
        }, 200);
    };

    function fastMapContourLevel(newContourLevel: number, radiusThresold: number = 25) {
        if (!fastContourInitTimeoutRef.current) {
            if (props.mapRadius > radiusThresold) {
                fastContourInitTimeout(newContourLevel);
                return;
            }
        } else {
            clearTimeout(fastContourInitTimeoutRef.current);

            if (props.mapRadius > radiusThresold) {
                setWasOriginLocked(props.map.isOriginLocked);
                props.map.toggleOriginLock(false);
                setLastRadius(props.mapRadius);
                dispatch(
                    setMapRadius({
                        molNo: props.map.molNo,
                        radius: radiusThresold,
                    })
                );
                startFinishTimeout();
            }

            if (fastContourResetTimeoutRef.current) {
                clearTimeout(fastContourResetTimeoutRef.current);
                startFinishTimeout();
            }
        }

        dispatch(
            setContourLevel({
                molNo: props.map.molNo,
                contourLevel: newContourLevel,
            })
        );
    }
    return null;
};
