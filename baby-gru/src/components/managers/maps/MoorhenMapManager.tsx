import { useRef, memo, useEffect, useMemo } from "react";
import { useSelector, useDispatch, useStore } from "react-redux";
import { moorhen } from "../../../types/moorhen";
import { setMapRadius, showMap, setContourLevel } from "../../../moorhen";
import { SelectorEffect } from "../../hookComponent/SelectorEffect";
import type { RootState } from "../../../store/MoorhenReduxStore";
import { MapScrollWheelListener } from "./MapScrollWheelListener";
import { MapOriginListener, MapOriginListenerMouseUp } from "./MapOriginListener";
import { MapAlphaListener } from "./MapAlphaListener";
import { useDispatch } from "react-redux";
import { setContourLevel, setMapRadius, setMapStyle, showMap } from "../../moorhen";
import { MoorhenReduxStore } from "../../moorhen";

export const MoorhenMapManager = memo((props: { mapMolNo: number }) => {
    const dispatch = useDispatch();
    const lastTime = useRef<number>(Date.now());
    const debounceTime = useRef<number>(150);
    const lastDrawTimeout = useRef<NodeJS.Timeout | null>(null);
    const isWorkingRef = useRef<boolean>(false);
    const mapMolNo = props.mapMolNo;
    const store = useStore<RootState>();

    const map = useSelector((state: RootState) => {
        const map = state.maps.find((item) => item.molNo === mapMolNo);
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
        const mapItem = state.maps.find((item) => item.molNo === mapMolNo);
        return mapItem?.isOriginLocked || false;
    });

    const mapRadius = useSelector((state: RootState) => {
        const mapRadiusItem = state.mapContourSettings.mapRadii.find((item) => item.molNo === mapMolNo);
        return mapRadiusItem?.radius || map?.suggestedRadius || 15;
    });

    const mapContourLevel = useSelector((state: RootState) => {
        const mapContourItem = state.mapContourSettings.contourLevels.find((item) => item.molNo === mapMolNo);
        return mapContourItem?.contourLevel || map?.suggestedContourLevel || 0.8;
    });

    const mapStyle: "solid" | "lit-lines" | "lines" = useSelector((state: moorhen.State) => {
        const style = state.mapContourSettings.mapStyles.find((item) => item.molNo === mapMolNo);
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

    const _postDraw = (startTime: number) => {
        const now = Date.now();
        isWorkingRef.current = false;
        const timing = now - startTime;
        debounceTime.current = timing;
    };

    const _drawMap = async (now: number) => {
        const currentOrigin = store.getState().glRef.origin;
        isWorkingRef.current = true;
        await map.doCootContour(
            ...(currentOrigin.map((coord) => -coord) as [number, number, number]),
            mapRadius,
            mapContourLevel,
            mapStyle
        );
        //await map.drawMapContour();
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
        /* this should be moved to map initialisation in moorhen the instance*/
        if (map?.showOnLoad) {
            dispatch(showMap(map));
            dispatch(setMapRadius({ molNo: mapMolNo, radius: map?.suggestedRadius || 15 }));
            dispatch(setContourLevel({ molNo: mapMolNo, contourLevel: map?.suggestedContourLevel || 0.8 }));
            dispatch(setMapStyle({ molNo: mapMolNo, style: mapStyle }));
        }
    }, []);

    useEffect(() => {
        drawMap();
    }, [mapIsVisible, mapContourLevel, mapRadius, isOriginLocked, mapStyle]);

    const alphaListener = useMemo(() => {
        return (
            <SelectorEffect
                selector={(state: moorhen.State) =>
                    state.mapContourSettings.mapAlpha.find((item) => item.molNo === map.molNo)
                }
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
                (!reContourMapOnlyOnMouseUp ? (
                    <MapOriginListener drawMap={drawMap} />
                ) : (
                    <MapOriginListenerMouseUp drawMap={drawMap} />
                ))}

            {isMapActive && (
                <MapScrollWheelListener mapContourLevel={mapContourLevel} mapIsVisible={mapIsVisible} map={map} />
            )}

            {mapIsVisible && alphaListener}
        </>
    );
});

MoorhenMapManager.displayName = "MoorhenMapManager";
