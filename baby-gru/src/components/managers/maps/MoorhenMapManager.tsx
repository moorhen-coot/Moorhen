import { useDispatch, useSelector, useStore } from "react-redux";
import { memo, useEffect, useMemo, useRef } from "react";
import { MoorhenInstance, useMoorhenInstance } from "@/InstanceManager";
import type { RootState } from "../../../store/MoorhenReduxStore";
import { setContourLevel, setMapFastRadius, setMapRadius, setMapStyle, showMap } from "../../../store/mapContourSettingsSlice";
import { SelectorEffect } from "../../hookComponent/SelectorEffect";
import { MapOriginListener, MapOriginListenerMouseUp } from "./MapOriginListener";
import { MapScrollWheelListener } from "./MapScrollWheelListener";

export const MoorhenMapManager = memo((props: { mapMolNo: number }) => {
    const dispatch = useDispatch();
    const moorhenInstance = useMoorhenInstance();
    const lastTime = useRef<number>(Date.now());
    const drawQueue = useRef<
        {
            x: number;
            y: number;
            z: number;
            radius: number;
            contourLevel: number;
            style: "solid" | "lit-lines" | "lines";
        }[]
    >([]);
    const isWorkingRef = useRef<boolean>(false);
    const mapMolNo = props.mapMolNo;
    const store = useStore<RootState>();

    const map = useSelector((state: RootState) => {
        const map = state.maps.find(item => item.molNo === mapMolNo);
        if (!map) {
            console.warn(`No map found with molNo: ${mapMolNo}`);
            return null;
        }
        return map;
    });

    const activeMapMolNo = useSelector((state: RootState) => {
        const activeMap = state.generalStates.activeMap;
        if (!activeMap) {
            return null;
        }
        return activeMap.molNo;
    });

    const isMapActive = activeMapMolNo === mapMolNo ? true : false;

    const mapIsVisible = useSelector((state: RootState) => {
        const visibleMaps = state.mapContourSettings.visibleMaps;
        if (!visibleMaps) {
            return false;
        }
        const isVisible = visibleMaps.includes(mapMolNo);
        return isVisible;
    });

    const reContourMapOnlyOnMouseUp = useSelector((state: RootState) => {
        const reContourOnMouseUp = state.mapContourSettings.reContourMapOnlyOnMouseUp;
        return reContourOnMouseUp || false;
    });
    const isOriginLocked = useSelector((state: RootState) => {
        const mapItem = state.maps.find(item => item.molNo === mapMolNo);
        return mapItem?.isOriginLocked || false;
    });

    const mapRadius = useSelector((state: RootState) => {
        const mapRadiusItem = state.mapContourSettings.mapRadii.find(item => item.molNo === mapMolNo);
        return mapRadiusItem?.radius || map?.suggestedRadius || 15;
    });

    const mapFastRadius = useSelector((state: RootState) => {
        const mapRadiusFastItem = state.mapContourSettings.mapFastRadii.find(item => item.molNo === mapMolNo);
        return mapRadiusFastItem?.radius || -1;
    });

    const mapContourLevel = useSelector((state: RootState) => {
        const mapContourItem = state.mapContourSettings.contourLevels.find(item => item.molNo === mapMolNo);
        return mapContourItem?.contourLevel || map?.suggestedContourLevel || 0.8;
    });

    const mapStyle: "solid" | "lit-lines" | "lines" = useSelector((state: RootState) => {
        const style = state.mapContourSettings.mapStyles.find(item => item.molNo === mapMolNo);
        if (!style) {
            const defaultStyle = store.getState().mapContourSettings.defaultMapLitLines
                ? "lit-lines"
                : store.getState().mapContourSettings.defaultMapSurface
                  ? "solid"
                  : "lines";
            return defaultStyle;
        }
        return style.style;
    });

    const appendDrawQueue = () => {
        const currentOrigin = store.getState().glRef.origin;
        const drawRadius = mapFastRadius === -1 ? mapRadius : mapFastRadius;
        const [x, y, z] = currentOrigin.map(coord => -coord) as [number, number, number];
        drawQueue.current.push({
            x,
            y,
            z,
            radius: drawRadius,
            contourLevel: mapContourLevel,
            style: mapStyle,
        });
        lastTime.current = Date.now();
    };

    const processDrawQueue = async () => {
        if (drawQueue.current.length === 0) {
            return;
        }
        if (isWorkingRef.current) {
            return;
        }
        const now = Date.now();
        isWorkingRef.current = true;
        const { x, y, z, radius, contourLevel, style } = drawQueue.current[drawQueue.current.length - 1];
        drawQueue.current = [];
        await map.doCootContour(x, y, z, radius, contourLevel, style);
        _postDraw(now);
    };

    const _postDraw = (startTime: number) => {
        const now = Date.now();
        isWorkingRef.current = false;
        const timing = now - startTime;
        console.debug(`Map redraw took ${timing} ms`);
    };

    function drawMap() {
        if (!map) {
            return;
        }
        if (!mapIsVisible) {
            map.hideMapContour();
            return;
        }
        appendDrawQueue();
    }

    useEffect(() => {
        /* this should be moved to map initialisation in moorhen the instance*/
        const intiliaseMap = async () => {
            let mapRadius = map?.suggestedRadius * 1.2 || 15;
            if (map?.isEM) {
                const boundingSphere = await moorhenInstance.cootCommand.get_map_bounding_sphere(mapMolNo, map?.suggestedContourLevel);
                const maxRadius = Math.max(map?.headerInfo.cell.a, map?.headerInfo.cell.b, map?.headerInfo.cell.c) / 2;
                mapRadius = Math.min(boundingSphere.radius, maxRadius);
                map.drawOrigin = boundingSphere.center;
                console.log(`Map bounding sphere center: ${boundingSphere.center}, radius: ${boundingSphere.radius}`);
            }

            let contourLevel = 1;
            if (map?.isEM) {
                contourLevel = map?.isDifference ? 5 * map.mapRmsd : map?.suggestedContourLevel;
            } else {
                contourLevel = map?.isDifference ? 3 * map.mapRmsd : 1 * map.mapRmsd;
            }

            if (map?.showOnLoad) {
                dispatch(showMap(map));
                dispatch(setMapRadius({ molNo: mapMolNo, radius: mapRadius }));
                dispatch(setMapFastRadius({ molNo: mapMolNo, radius: -1 }));
                dispatch(setContourLevel({ molNo: mapMolNo, contourLevel: contourLevel }));
                dispatch(setMapStyle({ molNo: mapMolNo, style: mapStyle }));
            }
        };
        intiliaseMap();
    }, []);

    useEffect(() => {
        drawMap();
    }, [mapIsVisible, mapContourLevel, mapRadius, isOriginLocked, mapStyle]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            processDrawQueue();
        }, 30);

        return () => clearInterval(intervalId);
    }, []);

    const alphaListener = useMemo(() => {
        return (
            <SelectorEffect
                selector={(state: RootState) => state.mapContourSettings.mapAlpha.find(item => item.molNo === map.molNo)}
                effect={() => {
                    map.fetchMapAlphaAndRedraw();
                }}
            />
        );
    }, [map]);

    if (!map) {
        return null;
    }

    return (
        <>
            {mapIsVisible &&
                !isOriginLocked &&
                (!reContourMapOnlyOnMouseUp ? <MapOriginListener drawMap={drawMap} /> : <MapOriginListenerMouseUp drawMap={drawMap} />)}

            {isMapActive && <MapScrollWheelListener mapContourLevel={mapContourLevel} mapIsVisible={mapIsVisible} map={map} />}

            {mapIsVisible && alphaListener}
        </>
    );
});

MoorhenMapManager.displayName = "MoorhenMapManager";
