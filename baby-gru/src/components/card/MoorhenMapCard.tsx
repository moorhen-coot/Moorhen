import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Card, Col, Stack, ToggleButton } from "react-bootstrap";
import { convertRemToPx } from "../../utils/utils";
import { getNameLabel } from "./cardUtils";
import { RadioButtonCheckedOutlined, RadioButtonUncheckedOutlined } from "@mui/icons-material";
import { MapHistogramAccordion } from "./MapCardResources/MapHistogramAccordion";
import { MoorhenSlider } from "../inputs/MoorhenSlider-new";

import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch, batch } from "react-redux";
import { setActiveMap } from "../../store/generalStatesSlice";
import { setContourLevel, setMapAlpha, setMapRadius, setMapStyle, showMap } from "../../store/mapContourSettingsSlice";
import { useSnackbar } from "notistack";
import { MoorhenPreciseInput } from "../inputs/MoorhenPreciseInput";
import { MapSettingsAccordion } from "./MapCardResources/MapSettingsAccordion";
import { MapColourSelector } from "./MapCardResources/MapColourSelector";
import { MapCardActionButtons } from "./MapCardResources/MapCardActionButtons";

interface MoorhenMapCardPropsInterface extends moorhen.CollectedProps {
    map: moorhen.Map;
    initialContour?: number;
    initialRadius?: number;
    collapseAllRequest?: boolean;
}

export const MoorhenMapCard = (props: MoorhenMapCardPropsInterface) => {
    const { initialContour = 0.8, initialRadius = 13 } = props;

    const mapRadius = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapRadii.find((item) => item.molNo === props.map.molNo);
        if (map) {
            return map.radius;
        } else {
            return initialRadius;
        }
    });

    const mapContourLevel = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.contourLevels.find((item) => item.molNo === props.map.molNo);
        if (map) {
            return map.contourLevel;
        } else {
            return initialContour;
        }
    });
    const mapStyle = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapStyles.find((item) => item.molNo === props.map.molNo);
        if (map) {
            return map.style;
        } else {
            return state.mapContourSettings.defaultMapSurface ? "solid" : state.mapContourSettings.defaultMapLitLines ? "lit-lines" : "lines";
        }
    });

    const mapOpacity = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapAlpha.find((item) => item.molNo === props.map.molNo);
        if (map) {
            return map.alpha;
        } else {
            return 1.0;
        }
    });

    const defaultExpandDisplayCards = useSelector((state: moorhen.State) => state.generalStates.defaultExpandDisplayCards);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(!defaultExpandDisplayCards);
    useEffect(() => {
        if (props.collapseAllRequest !== null) {
            setIsCollapsed(props.collapseAllRequest);
        }
    }, [props.collapseAllRequest]);

    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const contourWheelSensitivityFactor = useSelector((state: moorhen.State) => state.mouseSettings.contourWheelSensitivityFactor);
    const mapIsVisible = useSelector((state: moorhen.State) => state.mapContourSettings.visibleMaps.includes(props.map.molNo));
    const nextOrigin = useRef<number[]>([]);
    const busyContouring = useRef<boolean>(false);
    const isDirty = useRef<boolean>(false);
    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();

    const doContourIfDirty = useCallback(() => {
        if (isDirty.current) {
            busyContouring.current = true;
            isDirty.current = false;
            props.map.drawMapContour().then(() => {
                busyContouring.current = false;
                doContourIfDirty();
            });
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
            nextOrigin.current = props.glRef.current.origin.map((coord) => -coord);
            isDirty.current = true;
            if (!busyContouring.current) {
                doContourIfDirty();
            }
        } else {
            props.map.hideMapContour();
        }
    }, [doContourIfDirty]);

    const handleWheelContourLevelCallback = useCallback(
        (evt: moorhen.WheelContourLevelEvent) => {
            let newMapContourLevel: number;
            if (props.map.molNo === activeMap.molNo) {
                if (!mapIsVisible) {
                    enqueueSnackbar("Active map not displayed, cannot change contour lvl.", { variant: "warning" });
                    return;
                }

                let scaling = props.map.isEM ? props.map.levelRange[0] : 0.01;
                if (evt.detail.factor > 1) {
                    newMapContourLevel = mapContourLevel + contourWheelSensitivityFactor * scaling;
                } else {
                    newMapContourLevel = mapContourLevel - contourWheelSensitivityFactor * scaling;
                }
            }
            if (newMapContourLevel) {
                batch(() => {
                    //dispatch( setContourLevel({ molNo: props.map.molNo, contourLevel: newMapContourLevel }) )
                    fastMapContourLevel(newMapContourLevel);
                    enqueueSnackbar(`map-${props.map.molNo}-contour-lvl-change`, {
                        variant: "mapContourLevel",
                        persist: true,
                        mapMolNo: props.map.molNo,
                        mapPrecision: props.map.levelRange[0],
                    });
                });
            }
        },
        [mapContourLevel, mapRadius, activeMap?.molNo, props.map.molNo, mapIsVisible]
    );

    useEffect(() => {
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
    }, []);

    // Fast contour level:
    // This work by delaying the initial contour draw if the radius is > thresolds,
    // and then start the contour drawing with the small raidus routin
    const fastContourResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fastContourInitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [lastRadius, setLastRadius] = useState<number>(25);
    const [wasOriginLocked, setWasOriginLocked] = useState<boolean>(null);

    const startFinishTimeout = () => {
        fastContourResetTimeoutRef.current = setTimeout(() => {
            props.map.toggleOriginLock(wasOriginLocked);
            fastContourInitTimeoutRef.current = null;
            dispatch(setMapRadius({ molNo: props.map.molNo, radius: lastRadius }));
        }, 500);
    };

    const fastContourInitTimeout = (contourLevel: number) => {
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
            if (mapRadius > radiusThresold) {
                fastContourInitTimeout(newContourLevel);
                return;
            }
        } else {
            clearTimeout(fastContourInitTimeoutRef.current);

            if (mapRadius > radiusThresold) {
                setWasOriginLocked(props.map.isOriginLocked);
                props.map.toggleOriginLock(false);
                setLastRadius(mapRadius);
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

    const [currentName, setCurrentName] = useState<string>(props.map.name);

    useEffect(() => {
        if (currentName !== "") {
            props.map.name = currentName;
        }
    }, [currentName]);

    return (
        <Card
            className="px-0"
            style={{
                display: "flex",
                minWidth: convertRemToPx(28),
                marginBottom: "0.5rem",
                padding: "0",
            }}
            key={props.map.molNo}
        >
            <Card.Header style={{ padding: "0.1rem" }}>
                <Stack gap={2} direction="horizontal">
                    <Col
                        className="align-items-center"
                        style={{
                            display: "flex",
                            justifyContent: "left",
                            color: isDark ? "white" : "black",
                        }}
                    >
                        {getNameLabel(props.map)}
                        <MapColourSelector map={props.map} mapIsVisible={mapIsVisible} />
                    </Col>
                    <Col style={{ display: "flex", justifyContent: "right" }}>
                        <MapCardActionButtons
                            map={props.map}
                            mapIsVisible={mapIsVisible}
                            isCollapsed={isCollapsed}
                            setIsCollapsed={setIsCollapsed}
                            setCurrentName={setCurrentName}
                            glRef={props.glRef}
                        />
                    </Col>
                </Stack>
            </Card.Header>
            <Card.Body
                style={{
                    display: isCollapsed ? "none" : "",
                    padding: "0.5rem",
                }}
            >
                <Stack direction="vertical" gap={1}>
                    <Stack direction="horizontal" gap={4}>
                        <ToggleButton
                            id={`active-map-toggle-${props.map.molNo}`}
                            type="checkbox"
                            variant={isDark ? "outline-light" : "outline-primary"}
                            checked={props.map === activeMap}
                            style={{
                                marginLeft: "0.1rem",
                                marginRight: "0.5rem",
                                justifyContent: "space-betweeen",
                                display: "flex",
                            }}
                            onClick={() => dispatch(setActiveMap(props.map))}
                            value={""}
                        >
                            {props.map === activeMap ? <RadioButtonCheckedOutlined /> : <RadioButtonUncheckedOutlined />}
                            <span style={{ marginLeft: "0.5rem" }}>Active</span>
                        </ToggleButton>
                        <Stack direction="vertical" style={{ justifyContent: "center" }}>
                            <Stack
                                direction="horizontal"
                                gap={4}
                                style={{
                                    justifyContent: "center",
                                    alignItems: "center",
                                    width: "100%",
                                }}
                            >
                                <MoorhenPreciseInput
                                    value={mapContourLevel}
                                    setValue={(newVal) => {
                                        fastMapContourLevel(+newVal);
                                    }}
                                    label={"Level:"}
                                    decimalDigits={props.map.isEM ? Math.abs(Math.floor(Math.log10(props.map.levelRange[0]))) : 2}
                                    allowNegativeValues={true}
                                    disabled={!mapIsVisible}
                                    waitReturn={true}
                                />

                                {props.map.mapRmsd && (
                                    <MoorhenPreciseInput
                                        allowNegativeValues={true}
                                        value={mapContourLevel / props.map.mapRmsd}
                                        setValue={(newVal) => {
                                            fastMapContourLevel(+newVal * props.map.mapRmsd);
                                        }}
                                        label={"RMSD:"}
                                        decimalDigits={2}
                                        disabled={!mapIsVisible}
                                        waitReturn={true}
                                    />
                                )}
                            </Stack>
                            <MoorhenSlider
                                minVal={props.map.isEM ? props.map.levelRange[0] * 10 : 0.01}
                                maxVal={props.map.levelRange[1]}
                                showMinMaxVal={false}
                                decimalPlaces={props.map.isEM ? Math.abs(Math.floor(Math.log10(props.map.levelRange[0]))) : 2}
                                showButtons={true}
                                logScale={true}
                                isDisabled={!mapIsVisible}
                                externalValue={mapContourLevel}
                                setExternalValue={(newVal) => {
                                    fastMapContourLevel(newVal);
                                }}
                                piWaitReturn={true}
                            />
                        </Stack>
                    </Stack>
                    <MapHistogramAccordion map={props.map} currentContourLevel={mapContourLevel} />
                    <MapSettingsAccordion map={props.map} mapIsVisible={mapIsVisible} mapStyle={mapStyle} mapRadius={mapRadius} mapOpacity={mapOpacity} />
                </Stack>
            </Card.Body>
        </Card>
    );
};
