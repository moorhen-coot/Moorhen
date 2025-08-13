import { useRef, memo, useEffect, useMemo } from "react";
import { useSelector, useDispatch, useStore } from "react-redux";
import { moorhen } from "../../../types/moorhen";
import { showMap } from "../../../moorhen";
import { SelectorEffect } from "../../hookComponent/SelectorEffect";
import { MapScrollWheelListener } from "./MapScrollWheelListener";
import { MapOriginListener, MapOriginListenerMouseUp } from "./MapOriginListener";


/**
 * `MoorhenMapManager` is a React memoized component responsible for managing the rendering and state synchronization
 * of a specific map object within the Moorhen application. It listens to various Redux state slices to determine
 * map visibility, contour settings, style, and other properties, and triggers map drawing or hiding accordingly.
 * 
 * The component debounces map drawing operations to optimize performance and avoid redundant renders. It also
 * attaches listeners for map origin changes and scroll wheel events when appropriate, and manages map alpha
 * updates via a selector effect.
 * 
 * @param props - The component props.
 * @param props.mapMolNo - The unique molecule number identifying the map to manage.
 * 
 * @returns A React fragment containing listeners and effects for the managed map, or null if the map is not found.
 */

export const MoorhenMapManager = memo((props: { mapMolNo: number }) => {
    const dispatch = useDispatch();
    const lastTime = useRef<number>(Date.now());
    const debounceTime = useRef<number>(150);
    const lastDrawTimeout = useRef<NodeJS.Timeout | null>(null);
    const isWorkingRef = useRef<boolean>(false);
    const mapMolNo = props.mapMolNo;
    const store = useStore<moorhen.State>();

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
            return null;
        }
        return activeMap.molNo;
    });

    const isMapActive = activeMapMolNo === mapMolNo ? true : false;

    const mapIsVisible = useSelector((state: moorhen.State) => {
        const visibleMaps = state.mapContourSettings.visibleMaps;
        if (!visibleMaps) {
            return false;
        }
        const isVisible = visibleMaps.includes(mapMolNo);
        return isVisible;
    });

    const reContourMapOnlyOnMouseUp = useSelector((state: moorhen.State) => {
        const reContourOnMouseUp = state.mapContourSettings.reContourMapOnlyOnMouseUp;
        return reContourOnMouseUp || false;
    });
    const isOriginLocked = useSelector((state: moorhen.State) => {
        const mapItem = state.maps.find((item) => item.molNo === mapMolNo);
        return mapItem?.isOriginLocked || false;
    });

    const mapRadius = useSelector((state: moorhen.State) => {
        const mapRadiusItem = state.mapContourSettings.mapRadii.find((item) => item.molNo === mapMolNo);
        return mapRadiusItem?.radius || map?.suggestedRadius || 15;
    });

    const mapContourLevel = useSelector((state: moorhen.State) => {
        const mapContourItem = state.mapContourSettings.contourLevels.find((item) => item.molNo === mapMolNo);
        return mapContourItem?.contourLevel || map?.suggestedContourLevel || 0.8;
    });

    const mapStyle = useSelector((state: moorhen.State) => {
        const style = state.mapContourSettings.mapStyles.find((item) => item.molNo === mapMolNo);
        if (!style) {
            const defaultStyle =
                store.getState().mapContourSettings.defaultMapLitLines ||
                store.getState().mapContourSettings.defaultMapSurface ||
                "lines";
            return defaultStyle;
        }
        return style;
    });

    const _postDraw = (startTime: number) => {
        const now = Date.now();
        isWorkingRef.current = false;
        const timing = now - startTime;
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
        if (map?.showOnLoad) {
            dispatch(showMap(map));
        }
    }, []);

    useEffect(() => {
        drawMap();
    }, [mapIsVisible, mapContourLevel, mapRadius, isOriginLocked, mapStyle]);



    const alphaListener = useMemo(() => {
        return <SelectorEffect
            selector={(state: moorhen.State) => state.mapContourSettings.mapAlpha.find((item) => item.molNo === map.molNo)}
            effect={() => {map.fetchMapAlphaAndRedraw()}} />;
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
