import { useDispatch, useSelector, useStore } from "react-redux";
import { memo, useEffect, useMemo, useRef } from "react";
import type { RootState } from "../../../store/MoorhenReduxStore";
import { setContourLevel, setMapFastRadius, setMapRadius, setMapStyle, showMap } from "../../../store/mapContourSettingsSlice";
import type { MapStyle } from "../../../store/mapContourSettingsSlice";
import { gpuMapContourSetting } from "../../../WebGPUComponents/mapContour/setting";
import { SelectorEffect } from "../../hookComponent/SelectorEffect";
import { MapOriginListener, MapOriginListenerMouseUp } from "./MapOriginListener";
import { MapScrollWheelListener } from "./MapScrollWheelListener";

export const MoorhenMapManager = memo((props: { mapMolNo: number }) => {
    const dispatch = useDispatch();
    const lastTime = useRef<number>(Date.now());
    const drawQueue = useRef<
        {
            x: number;
            y: number;
            z: number;
            radius: number;
            contourLevel: number;
            style: MapStyle;
        }[]
    >([]);
    const isWorkingRef = useRef<boolean>(false);
    const mapMolNo = props.mapMolNo;
    const store = useStore<RootState>();

    const map = useSelector((state: RootState) => {
        const map = state.maps.find(item => item.molNo === mapMolNo);
        if (!map) {
            return null;
        }
        return map;
    });

    if (!map) {
        return null;
    }

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
        return mapContourItem?.contourLevel || map?.suggestedContourLevel || 0.003;
    });

    const mapLineWidth = useSelector((state: RootState) => state.mapContourSettings.mapLineWidth);


    const mapStyle: MapStyle = useSelector((state: RootState) => {
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

    // What a 2D slice is drawn from besides the level and radius: where it is, the colours and
    // opacity (a 3D contour is recoloured in place; a slice is drawn again), how its contours are
    // spaced and whether it shows its nodal lines. The store keeps
    // these objects as they are until they change, so they are compared by reference.
    const mapSlice = useSelector((state: RootState) => state.mapContourSettings.mapSlices.find(item => item.molNo === mapMolNo));
    const sliceColours = useSelector((state: RootState) => {
        const settings = state.mapContourSettings;
        return mapStyle !== "slice" ? null : [
            settings.mapColours.find(item => item.molNo === mapMolNo),
            settings.positiveMapColours.find(item => item.molNo === mapMolNo),
            settings.negativeMapColours.find(item => item.molNo === mapMolNo),
            settings.mapAlpha.find(item => item.molNo === mapMolNo),
            settings.mapSliceNodalLines.includes(mapMolNo),
            settings.mapSliceContourSpacings.find(item => item.molNo === mapMolNo),
        ];
    }, (a, b) => a === b || (a !== null && b !== null && a.every((item, i) => item === b[i])));

    const appendDrawQueue = () => {
        const currentOrigin = store.getState().sceneSettings.origin;
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
        // As doCootContour decides it, on entry: on the GPU it returns at once.
        const onGpu = gpuMapContourSetting.enabled;
        await map.doCootContour(x, y, z, radius, contourLevel, style);
        _postDraw(now, onGpu);
    };

    const _postDraw = (startTime: number, onGpu: boolean) => {
        const now = Date.now();
        isWorkingRef.current = false;
        const timing = now - startTime;
        console.debug(`Map redraw took ${timing} ms`);
        console.debug(`Mesh created on ${onGpu ? "WebGPU" : "wasmWorker"}`);
    };

    function drawMap() {
        if (!map) {
            return;
        }
        if (!mapIsVisible) {
            map.hideMapContour();
            map.hideMapSlice();
            return;
        }
        if (mapStyle === "slice") {
            // Contoured here rather than queued for Coot: the map's grid, once fetched, is
            // sampled directly (MoorhenMap.drawMapSlice).
            map.hideMapContour();
            map.drawMapSlice();
            return;
        }
        map.hideMapSlice();
        appendDrawQueue();
    }

    useEffect(() => {
        drawMap();
    }, [mapLineWidth]);

    useEffect(() => {
        /* this should be moved to map initialisation in moorhen the instance*/
        const intialiseMap = async () => {
            // The 1.2 is headroom so a map does not stop just past the edge of the view. A cube's
            // suggested radius is a hard limit instead - the cell repeats beyond it - so it is
            // taken as given.
            let mapRadius = map.isCube
                ? (map.suggestedRadius || 5)
                : (map?.suggestedRadius * 1.2 || 15);

            const storeContourLevel = store.getState().mapContourSettings.contourLevels.find(item => item.molNo === mapMolNo)?.contourLevel;

            let contourLevel = 1;
            if (map.isCube) {
                // A cube says what level to contour at - Psi4 writes the range covering 85% of the
                // density into the file - and that level is in the field's own units, so a multiple
                // of the rms would ignore the one piece of advice the file gives. Signed cube
                // fields are flagged as difference maps to get two surfaces, which is why this has
                // to come before the isDifference tests below.
                contourLevel = map.suggestedContourLevel;
            } else if (map.isEM) {
                contourLevel = map?.isDifference ? 5 * map.mapRmsd : map?.suggestedContourLevel;

            } else {
                contourLevel = map?.isDifference ? 3 * map.mapRmsd : 1 * map.mapRmsd;
            }


            if (map.showOnLoad) {
                dispatch(showMap(map));
                dispatch(setMapRadius({ molNo: mapMolNo, radius: mapRadius }));
                dispatch(setMapFastRadius({ molNo: mapMolNo, radius: -1 }));
                dispatch(setContourLevel({ molNo: mapMolNo, contourLevel: storeContourLevel ?? contourLevel }));
                dispatch(setMapStyle({ molNo: mapMolNo, style: map.isEM ? "solid" : mapStyle }));
            }
        };
        intialiseMap();
    }, []);

    useEffect(() => {
        drawMap();
    }, [mapIsVisible, mapContourLevel, mapRadius, isOriginLocked, mapStyle, mapSlice, sliceColours]);

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
                <MapOriginListener drawMap={drawMap} mapUID={map.uniqueId} />}

            {isMapActive && <MapScrollWheelListener mapContourLevel={mapContourLevel} mapIsVisible={mapIsVisible} map={map} />}

            {mapIsVisible && alphaListener}
        </>
    );
});

MoorhenMapManager.displayName = "MoorhenMapManager";
