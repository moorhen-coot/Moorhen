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
    console.log(`MoorhenMapManager for mapMolNo: ${mapMolNo}`);

    const map = useSelector((state: moorhen.State) => {
        const map = state.maps.find((item) => item.molNo === mapMolNo);
        if (!map) {
            console.warn(`No map found with molNo: ${mapMolNo}`);
            return null;
        }
        return map;
    });

    const activeMapMolNo = useSelector((state: moorhen.State) => {
        const activeMap = state.generalStates.activeMap;
        if (!activeMap) {
            console.warn(`No active map found in generalStates`);
            return null;
        }
        console.log(`Active map molNo: ${activeMap.molNo}`);
        return activeMap.molNo;
    });

    const isMapActive = activeMapMolNo === mapMolNo ? true : false;
    console.log(`Is map ${mapMolNo} active: ${isMapActive}`);

    const mapIsVisible = useSelector((state: moorhen.State) => {
        const visibleMaps = state.mapContourSettings.visibleMaps;
        if (!visibleMaps) {
            console.warn(`No visibleMaps found in mapContourSettings`);
            return false;
        }
        const isVisible = visibleMaps.includes(mapMolNo);
        console.log(`Map ${mapMolNo} visibility: ${isVisible}, visible maps: [${visibleMaps.join(", ")}]`);
        return isVisible;
    });

    const reContourMapOnlyOnMouseUp = useSelector((state: moorhen.State) => {
        const reContourOnMouseUp = state.mapContourSettings.reContourMapOnlyOnMouseUp;
        console.log(`reContourMapOnlyOnMouseUp: ${reContourOnMouseUp}`);
        return reContourOnMouseUp;
    });

    const isOriginLocked = useSelector((state: moorhen.State) => {
        const mapItem = state.maps.find((item) => item.molNo === mapMolNo);
        if (!mapItem) {
            console.warn(`No map item found for molNo ${mapMolNo} when checking origin lock`);
            return false;
        }
        const isLocked = mapItem?.isOriginLocked || false;
        console.log(`Map ${mapMolNo} origin locked: ${isLocked}`);
        return isLocked;
    });

    const mapRadius = useSelector((state: moorhen.State) => {
        const mapRadiusItem = state.mapContourSettings.mapRadii.find((item) => item.molNo === mapMolNo);
        if (!mapRadiusItem) {
            console.warn(`No radius setting found for molNo ${mapMolNo}, using default 25`);
            return 25;
        }
        const radius = mapRadiusItem?.radius || 25;
        console.log(`Map ${mapMolNo} radius: ${radius}`);
        return radius;
    });

    const mapContourLevel = useSelector((state: moorhen.State) => {
        const mapContourItem = state.mapContourSettings.contourLevels.find((item) => item.molNo === mapMolNo);
        if (!mapContourItem) {
            console.warn(`No contour level setting found for molNo ${mapMolNo}, using default 0.8`);
            return 0.8;
        }
        const contourLevel = mapContourItem?.contourLevel || 0.8;
        console.log(`Map ${mapMolNo} contour level: ${contourLevel}`);
        return contourLevel;
    });

    const mapStyle = useSelector((state: moorhen.State) => {
        const style = state.mapContourSettings.mapStyles.find((item) => item.molNo === mapMolNo);
        if (!style) {
            console.warn(`No style setting found for molNo ${mapMolNo}`);
        } else {
            console.log(`Map ${mapMolNo} style:`, style);
        }
        return style;
    });

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
