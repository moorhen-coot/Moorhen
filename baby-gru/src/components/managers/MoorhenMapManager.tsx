import { useEffect, useState, useRef, useCallback } from "react";
import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch} from "react-redux";
import { useSnackbar } from "notistack";

export const MoorhenMapManager = (props:{mapMolNo:number}) => {
    const lastTime = useRef<number>(Date.now())
    const drawTiming = useRef<[number, number]>([0, 50])
    const mapMolNo = props.mapMolNo
    const dispatch = useDispatch()
    
    const contourWheelSensitivityFactor = useSelector((state: moorhen.State) => state.mouseSettings.contourWheelSensitivityFactor);
    const { enqueueSnackbar } = useSnackbar();

    const map = useSelector((state: moorhen.State) => state.maps.find((item) =>item.molNo === mapMolNo));
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);
    const mapIsVisible = useSelector((state: moorhen.State) => state.mapContourSettings.visibleMaps.includes(mapMolNo));
    useSelector((state: moorhen.State) => {const _map = state.mapContourSettings.mapRadii.find((item) => item.molNo === mapMolNo);});
    useSelector((state: moorhen.State) => {const map = state.mapContourSettings.contourLevels.find((item) => item.molNo === mapMolNo);});
    useSelector((state: moorhen.State) => {const map = state.mapContourSettings.mapStyles.find((item) => item.molNo === mapMolNo);});
    useSelector((state: moorhen.State) => {const map = state.mapContourSettings.mapAlpha.find((item) => item.molNo === mapMolNo);});
    
    const postDraw = useCallback(() => {
        const now = Date.now()
        drawTiming.current = [drawTiming.current[0], now]
        console.log("Map manager draw time:", drawTiming.current[1] - drawTiming.current[0])
        
    },[])

    function drawMap() {
        if (!mapIsVisible) {
            map.hideMapContour();
            return;
        }
        const now = Date.now()
        if (now - lastTime.current < 200) {
            return}
        drawTiming.current = [now, null]
        map?.drawMapContour().then(postDraw)
        lastTime.current = Date.now() }
    
    drawMap()
    

    /*const handleWheelContourLevelCallback =
        (evt: moorhen.WheelContourLevelEvent) => {
            let newMapContourLevel: number;
            if (map.molNo === activeMap.molNo) {
                if (!mapIsVisible) {
                    enqueueSnackbar("Active map not displayed, cannot change contour lvl.", { variant: "warning" });
                    return;
                }

                let scaling = map.isEM ? map.levelRange[0] : 0.01;
                if (evt.detail.factor > 1) {
                    newMapContourLevel = mapContourLevel + contourWheelSensitivityFactor * scaling;
                } else {
                    newMapContourLevel = mapContourLevel - contourWheelSensitivityFactor * scaling;
                }
            }
            if (newMapContourLevel) {
                batch(() => {
                    //dispatch( setContourLevel({ molNo: map.molNo, contourLevel: newMapContourLevel }) )
                    fastMapContourLevel(newMapContourLevel);
                    enqueueSnackbar(`map-${map.molNo}-contour-lvl-change`, {
                        variant: "mapContourLevel",
                        persist: true,
                        mapMolNo: map.molNo,
                        mapPrecision: map.levelRange[0],
                    });
                });
            }
        }

    // Fast contour level:
    // This work by delaying the initial contour draw if the radius is > thresolds,
    // and then start the contour drawing with the small raidus routin
    const fastContourResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fastContourInitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [lastRadius, setLastRadius] = useState<number>(25);
    const [wasOriginLocked, setWasOriginLocked] = useState<boolean>(null);

    const startFinishTimeout = () => {
        fastContourResetTimeoutRef.current = setTimeout(() => {
            map.toggleOriginLock(wasOriginLocked);
            fastContourInitTimeoutRef.current = null;
            dispatch(setMapRadius({ molNo: map.molNo, radius: lastRadius }));
        }, 500);
    };

    const fastContourInitTimeout = (contourLevel: number) => {
        fastContourInitTimeoutRef.current = setTimeout(() => {
            fastContourInitTimeoutRef.current = null;
            dispatch(
                setContourLevel({
                    molNo: map.molNo,
                    contourLevel: contourLevel,
                })
            );
        }, 200);
    };

    function fastMapContourLevel(newContourLevel: number, radiusThresold: number = 25) {
        if (!fastContourInitTimeoutRef.current) {
            if (mapRadius > radiusThresold) {
                fastContourInitTimeout(newContourLevel);
                return;
            }
        } else {
            clearTimeout(fastContourInitTimeoutRef.current);

            if (mapRadius > radiusThresold) {
                setWasOriginLocked(map.isOriginLocked);
                map.toggleOriginLock(false);
                setLastRadius(mapRadius);
                dispatch(
                    setMapRadius({
                        molNo: map.molNo,
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
                molNo: map.molNo,
                contourLevel: newContourLevel,
            })
        );
    } */

    return null
}


    /*useEffect(() => {
        document.addEventListener("originUpdate", handleOriginUpdate);
        return () => {
            document.removeEventListener("originUpdate", handleOriginUpdate);
        };
    }, [handleOriginUpdate]);

    useEffect(() => {
        document.addEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback);
        return () => {
            document.removeEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback);
        };
    }, [handleWheelContourLevelCallback]);

    useEffect(() => {
        props.map.fetchMapAlphaAndRedraw();
    }, [mapOpacity]);

    useEffect(() => {
        // This looks stupid but it is important otherwise the map is first drawn with the default contour and radius. Probably there's a problem somewhere...
        batch(() => {
            dispatch(setMapAlpha({ molNo: props.map.molNo, alpha: mapOpacity }));
            dispatch(setMapStyle({ molNo: props.map.molNo, style: mapStyle }));
            dispatch(setMapRadius({ molNo: props.map.molNo, radius: mapRadius }));
            dispatch(
                setContourLevel({
                    molNo: props.map.molNo,
                    contourLevel: mapContourLevel,
                })
            );
        });
        // Show map only if specified
        if (props.map.showOnLoad) {
            dispatch(showMap(props.map));
        }
    }, []); */

    // Fast contour level:
    // This work by delaying the initial contour draw if the radius is > thresolds,
    // and then start the contour drawing with the small raidus routin

       /*
    const doContourIfDirty = useCallback(() => {
        if (isDirty.current) {
            busyContouring.current = true;
            isDirty.current = false;
            //props.map.drawMapContour().then(() => {
            //    busyContouring.current = false;
            //    doContourIfDirty();
            //});
        }
    }, [mapRadius, mapContourLevel, mapIsVisible, mapStyle]);

    const handleOriginUpdate = useCallback(
        (evt: moorhen.OriginUpdateEvent) => {
            nextOrigin.current = [...evt.detail.origin.map((coord: number) => -coord)];
            if (!props.map.isOriginLocked) {
                isDirty.current = true;
                if (mapIsVisible && !busyContouring.current) {
                    doContourIfDirty();
                }
            }
        },
        [doContourIfDirty]
    );

    useEffect(() => {
        if (mapIsVisible) {
            nextOrigin.current = originState.map((coord) => -coord);
            isDirty.current = true;
            if (!busyContouring.current) {
                doContourIfDirty();
            }
        } else {
            props.map.hideMapContour();
        }
    }, [doContourIfDirty]); */