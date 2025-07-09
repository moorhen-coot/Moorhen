import { useRef, useCallback, memo } from "react";
import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";
import { MapScrollWheelHandeler } from "./MapScrollWheelHandeler";

export const MoorhenMapManager = memo((props: { mapMolNo: number }) => {
    const lastTime = useRef<number>(Date.now());
    const debounceTime = useRef<number>(150);
    const mapContourLevelRef = useRef<number>(null);
    const lastDrawTimeout = useRef<NodeJS.Timeout | null>(null);
    const isWorkingRef = useRef<boolean>(false);

    const mapMolNo = props.mapMolNo;

    const map = useSelector((state: moorhen.State) => state.maps.find((item) => item.molNo === mapMolNo));
    const activeMapMolNo = useSelector((state: moorhen.State) => state.generalStates.activeMap.molNo);
    const isMapActive = activeMapMolNo === mapMolNo ? true : false;
    const mapIsVisible = useSelector((state: moorhen.State) => state.mapContourSettings.visibleMaps.includes(mapMolNo));
    const mapRadius = useSelector((state: moorhen.State) => {
        const mapRadiusItem = state.mapContourSettings.mapRadii.find((item) => item.molNo === mapMolNo);
        return mapRadiusItem?.radius || 25;
    });

    const mapContourLevel = useSelector((state: moorhen.State) => {
        const mapContourItem = state.mapContourSettings.contourLevels.find((item) => item.molNo === mapMolNo);
        return mapContourItem?.contourLevel || 0.8;
    });
    mapContourLevelRef.current = mapContourLevel;

    useSelector((state: moorhen.State) => state.glRef.origin);
    useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapStyles.find((item) => item.molNo === mapMolNo);
    });
    useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapAlpha.find((item) => item.molNo === mapMolNo);
    });

    const _postDraw = (startTime: number) => {
        const now = Date.now();
        isWorkingRef.current = false;
        console.log("Map manager draw time:", now - startTime);
    };

    const _drawMap = (now: number) => {
        isWorkingRef.current = true;
        map.drawMapContour().then(() => {
            _postDraw(now);
        });
        lastTime.current = Date.now();
    };

    function drawMap() {
        if (!map || !mapIsVisible) {
            map?.hideMapContour();
            return;
        }

        const now = Date.now();
        if ((now - lastTime.current < debounceTime.current) || isWorkingRef.current) {
            if (lastDrawTimeout.current) {
                clearTimeout(lastDrawTimeout.current);
            }
            lastDrawTimeout.current = setTimeout(() => {
                lastDrawTimeout.current = null;
                drawMap();
                console.log("timeout")
            }, 200);
            return;
        }

        _drawMap(now)
    }

    if (!map) {
        return null;
    }

    drawMap();

    return isMapActive ? (
        <MapScrollWheelHandeler mapContourLevel={mapContourLevel} mapIsVisible={mapIsVisible} mapRadius={mapRadius} map={map}></MapScrollWheelHandeler>
    ) : (
        false
    );
});
