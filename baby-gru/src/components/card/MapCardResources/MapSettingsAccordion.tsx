import { ExpandMoreOutlined, LockOpen, LockOutline } from "@mui/icons-material";
import { Form, Stack, ToggleButton } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useRef, useState } from "react";
import { setMapAlpha, setMapRadius, setMapStyle } from "../../../store/mapContourSettingsSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenSlider, MoorhenToggle } from "../../inputs";
import { MoorhenButton } from "../../inputs";
import { MoorhenStack } from "../../interface-base";
import { MoorhenAccordion } from "../../interface-base/Accordion";

interface MoorhenMapCardSettings {
    map: moorhen.Map;
    mapIsVisible: boolean;
    mapStyle: string;
    mapRadius: number;
    mapOpacity: number;
}

export const MapSettingsAccordion = (props: MoorhenMapCardSettings) => {
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const dispatch = useDispatch();
    const isOriginLocked = useSelector((state: moorhen.State) => {
        const mapItem = state.maps.find(item => item.molNo === props.map.molNo);
        return mapItem?.isOriginLocked || false;
    });

    const handleOriginLockClick = () => {
        const isOriginLocked = props.map.isOriginLocked;
        if (isOriginLocked) {
            lockedRadius.current = props.mapRadius;
        } else {
            unLockedRadius.current = props.mapRadius;
        }
        dispatch(
            setMapRadius({
                molNo: props.map.molNo,
                radius: isOriginLocked ? unLockedRadius.current : lockedRadius.current,
            })
        );
        props.map.toggleOriginLock(!isOriginLocked);
        props.map.drawMapContour();
    };

    const maxRadius = useMemo(() => {
        if (props.map.isEM) {
            if (props.map.headerInfo === null) {
                return 100;
            }
            const side = props.map.headerInfo.cell.a ? props.map.headerInfo.cell.a : 500;
            return Math.ceil((side * 1.732) / 2);
            //return Math.ceil(side / 2);
        } else {
            return 100;
        }
    }, [props.map.headerInfo, props.map.isEM]);

    const [meshAlpha, setMeshAlpha] = useState<number>(props.mapOpacity);
    const [surfaceAlpha, setSurfaceAlpha] = useState<number>(props.mapOpacity);
    const [litAlpha, setLitAlpha] = useState<number>(props.mapOpacity);
    const unLockedRadius = useRef<number>(20);
    const lockedRadius = useRef<number>(20);

    const opacitySlider = (
        <MoorhenSlider
            minVal={0.01}
            maxVal={1.0}
            logScale={false}
            sliderTitle="Opacity"
            isDisabled={!props.mapIsVisible}
            usePreciseInput={true}
            showMinMaxVal={false}
            externalValue={props.mapStyle === "solid" ? surfaceAlpha : props.mapStyle === "lines" ? meshAlpha : litAlpha}
            setExternalValue={
                props.mapStyle === "solid"
                    ? value => setSurfaceAlpha(value)
                    : props.mapStyle === "lines"
                      ? value => setMeshAlpha(value)
                      : value => setLitAlpha(value)
            }
            decimalPlaces={2}
        />
    );
    useEffect(() => {
        let newValue: number;
        if (props.mapStyle === "lines") {
            newValue = meshAlpha;
        } else if (props.mapStyle === "solid") {
            newValue = surfaceAlpha;
        } else if (props.mapStyle === "lit-lines") {
            newValue = litAlpha;
        }
        dispatch(setMapAlpha({ molNo: props.map.molNo, alpha: newValue }));
    }, [meshAlpha, surfaceAlpha, litAlpha, props.mapStyle]);

    const testExtra = [
        <MoorhenButton
            type="icon-only"
            icon="MUISymbolEdit"
            size="small"
            onClick={() => {
                setSurfaceAlpha(0.5);
            }}
        />,
        <MoorhenButton
            type="icon-only"
            icon="MUISymbolEdit"
            size="small"
            onClick={() => {
                setSurfaceAlpha(1);
            }}
        />,
    ];

    return (
        <MoorhenAccordion title="Draw Settings">
            <MoorhenStack direction="vertical" gap={1}>
                <MoorhenStack direction="horizontal" gap={4}>
                    <MoorhenStack direction="vertical" gap={2} style={{ paddingTop: "0.6rem" }}>
                        <MoorhenButton
                            id={`lock-origin-toggle-${props.map.molNo}`}
                            type="toggle"
                            checked={isOriginLocked}
                            onClick={() => {
                                handleOriginLockClick();
                            }}
                            disabled={!props.mapIsVisible}
                            icon={isOriginLocked ? "MUISymbolLockClose" : "MUISymbolLockOpen"}
                        >
                            <span
                                style={{
                                    marginLeft: "0.5rem",
                                }}
                            >
                                {props.map.isOriginLocked ? "Locked Origin" : "Moving Origin"}
                            </span>
                        </MoorhenButton>

                        <MoorhenStack
                            direction="vertical"
                            gap={"0.5rem"}
                            style={{
                                justifyContent: "flex-start",
                                alignItems: "flex-start",
                            }}
                        >
                            <MoorhenToggle
                                checked={props.mapStyle === "lines"}
                                onChange={() => {
                                    dispatch(
                                        setMapStyle({
                                            molNo: props.map.molNo,
                                            style: "lines",
                                        })
                                    );
                                }}
                                label="Draw as mesh"
                            />
                            <MoorhenToggle
                                checked={props.mapStyle === "solid"}
                                onChange={() => {
                                    dispatch(
                                        setMapStyle({
                                            molNo: props.map.molNo,
                                            style: "solid",
                                        })
                                    );
                                }}
                                label="Draw as a surface"
                            />
                            <MoorhenToggle
                                checked={props.mapStyle === "lit-lines"}
                                onChange={() => {
                                    dispatch(
                                        setMapStyle({
                                            molNo: props.map.molNo,
                                            style: "lit-lines",
                                        })
                                    );
                                }}
                                label="Draw as lit lines"
                            />
                        </MoorhenStack>
                    </MoorhenStack>
                    <MoorhenStack direction="vertical" style={{ width: "100%" }}>
                        <MoorhenSlider
                            minVal={2}
                            maxVal={maxRadius}
                            showMinMaxVal={false}
                            showButtons={true}
                            logScale={false}
                            stepButtons={1}
                            sliderTitle="Radius:"
                            isDisabled={!props.mapIsVisible}
                            externalValue={props.mapRadius}
                            setExternalValue={newVal => {
                                dispatch(
                                    setMapRadius({
                                        molNo: props.map.molNo,
                                        radius: newVal,
                                    })
                                );
                            }}
                            usePreciseInput={true}
                            piWidth={"3rem"}
                        />
                        {opacitySlider}
                    </MoorhenStack>
                </MoorhenStack>
            </MoorhenStack>
        </MoorhenAccordion>
    );
};
