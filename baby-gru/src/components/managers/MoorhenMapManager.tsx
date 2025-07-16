import { useRef, memo, useEffect } from "react";
import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";
import { MapScrollWheelListener } from "./MapScrollWheelListener";
import { MapOriginListener, MapOriginListenerMouseUp } from "./MapOriginListener";
import { MapAlphaListener } from "./MapAlphaListener";
import { useDispatch } from "react-redux";
import { setMapRadius, setContourLevel } from "../../moorhen";
import { showMap } from "../../moorhen";

export const MoorhenMapManager = memo((props: { mapMolNo: number }) => {
    const dispatch = useDispatch();
    const lastTime = useRef<number>(Date.now());
    const debounceTime = useRef<number>(150);
    const lastDrawTimeout = useRef<NodeJS.Timeout | null>(null);
    const isWorkingRef = useRef<boolean>(false);
    const mapMolNo = props.mapMolNo;

    const map = useSelector((state: moorhen.State) => state.maps.find((item) => item.molNo === mapMolNo));
    const activeMapMolNo = useSelector((state: moorhen.State) => state.generalStates.activeMap.molNo);
    const isMapActive = activeMapMolNo === mapMolNo ? true : false;
    const mapIsVisible = useSelector((state: moorhen.State) => state.mapContourSettings.visibleMaps.includes(mapMolNo));
    const reContourMapOnlyOnMouseUp = useSelector((state: moorhen.State) => state.mapContourSettings.reContourMapOnlyOnMouseUp);

    const isOriginLocked = useSelector((state: moorhen.State) => {
        const mapItem = state.maps.find((item) => item.molNo === mapMolNo);
        return mapItem?.isOriginLocked || false;
    });

    const mapRadius = useSelector((state: moorhen.State) => {
        const mapRadiusItem = state.mapContourSettings.mapRadii.find((item) => item.molNo === mapMolNo);
        return mapRadiusItem?.radius || 25;
    });

    const mapContourLevel = useSelector((state: moorhen.State) => {
        const mapContourItem = state.mapContourSettings.contourLevels.find((item) => item.molNo === mapMolNo);
        return mapContourItem?.contourLevel || 0.8;
    });

    const mapStyle = useSelector((state: moorhen.State) => state.mapContourSettings.mapStyles.find((item) => item.molNo === mapMolNo));

    const _postDraw = (startTime: number) => {
        const now = Date.now();
        isWorkingRef.current = false;
        const timing = now - startTime;
        //console.debug(`Map manager draw time for map ${map.molNo}:`, timing);
        debounceTime.current = timing;
    };

    const _drawMap = async (now: number) => {
        isWorkingRef.current = true;
        await map.drawMapContour();
        _postDraw(now);
        lastTime.current = Date.now();
    };

    function drawMap() {
        if (!map) {
            return;
        }
        if (!mapIsVisible) {
            map.hideMapContour();
            return;
        }

        const now = Date.now();
        if (now - lastTime.current < debounceTime.current * 0.9) {
            if (lastDrawTimeout.current) {
                clearTimeout(lastDrawTimeout.current);
            }
            lastDrawTimeout.current = setTimeout(() => {
                lastDrawTimeout.current = null;
                drawMap();
            }, debounceTime.current * 1.2);
            return;
        }

        _drawMap(now);
    }

    useEffect(() => {
        if (map.showOnLoad) {
            dispatch(showMap(map));
            dispatch(setMapRadius({ molNo: map.molNo, radius: map.suggestedRadius || 15 }));
            dispatch(setContourLevel({ molNo: map.molNo, contourLevel: map.suggestedContourLevel || 0.8 }));
        }
    }, []);

    if (!map) {
        return null;
    }

    useEffect(() => {
        drawMap();
    }, [mapIsVisible, mapContourLevel, mapRadius, isOriginLocked, mapStyle]);

    return (
        <>
            {mapIsVisible &&
                !isOriginLocked &&
                (!reContourMapOnlyOnMouseUp ? <MapOriginListener drawMap={drawMap} /> : <MapOriginListenerMouseUp drawMap={drawMap} />)}

            {isMapActive && <MapScrollWheelListener mapContourLevel={mapContourLevel} mapIsVisible={mapIsVisible} map={map} />}

            {mapIsVisible && <MapAlphaListener map={map} />}
        </>
    );
});
