import { useState, useMemo, useEffect } from "react";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import { Stack , ToggleButton, Form } from "react-bootstrap";
import { ExpandMoreOutlined, LockOutline, LockOpen } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { MoorhenSlider } from "../../inputs";
import { moorhen } from "../../../types/moorhen";
import { setMapAlpha, setMapRadius, setMapStyle } from "../../../store/mapContourSettingsSlice";

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
        const mapItem = state.maps.find((item) => item.molNo === props.map.molNo);
        return mapItem?.isOriginLocked || false;
    });

    const handleOriginLockClick = () => {
        const currentStatus = props.map.isOriginLocked;
        props.map.toggleOriginLock(!currentStatus);
        //setIsOriginLocked(!currentStatus);
        props.map.drawMapContour();
    };

    const maxRadius = useMemo(() => {
        if (props.map.isEM) {
            if (props.map.headerInfo === null) {
                return 100;
            }
            const side = props.map.headerInfo.cell.a ? props.map.headerInfo.cell.a : 120;
            //    return Math.ceil((side  * 1.732) /2)
            return Math.ceil(side / 2);
        } else {
            return 100;
        }
    }, [props.map.headerInfo, props.map.isEM]);

    const [meshAlpha, setMeshAlpha] = useState<number>(props.mapOpacity);
    const [surfaceAlpha, setSurfaceAlpha] = useState<number>(props.mapOpacity);
    const [litAlpha, setLitAlpha] = useState<number>(props.mapOpacity);

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
                    ? (value) => setSurfaceAlpha(value)
                    : props.mapStyle === "lines"
                    ? (value) => setMeshAlpha(value)
                    : (value) => setLitAlpha(value)
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

    return (
        <Accordion className="moorhen-accordion" disableGutters={true} elevation={0} TransitionProps={{ unmountOnExit: true }}>
            <AccordionSummary
                sx={{
                    backgroundColor: isDark ? "#adb5bd" : "#ecf0f1",
                    minHeight: "30px", // Set the minimum height
                    "&.Mui-expanded": {
                        minHeight: "30px", // Ensure height remains consistent when expanded
                    },
                    ".MuiAccordionSummary-content": {
                        margin: 0, // Adjust content margin
                    },
                }}
                expandIcon={<ExpandMoreOutlined />}
            >
                Draw Settings
            </AccordionSummary>
            <AccordionDetails
                style={{
                    paddingTop: "0.4rem",
                    padding: "0.2rem",
                    backgroundColor: isDark ? "#696969ff" : "white",
                }}
            >
                <Stack direction="vertical" gap={1}>
                    <Stack direction="horizontal" gap={4}>
                        <Stack direction="vertical" gap={2} style={{ paddingTop: "0.6rem" }}>
                            <ToggleButton
                                id={`lock-origin-toggle-${props.map.molNo}`}
                                type="checkbox"
                                variant={isDark ? "outline-light" : "outline-primary"}
                                checked={isOriginLocked}
                                style={{
                                    marginLeft: "0.1rem",
                                    marginRight: "0.5rem",
                                    justifyContent: "space-betweeen",
                                    display: "flex",
                                    width: "10rem",
                                }}
                                onClick={() => {
                                    handleOriginLockClick();
                                }}
                                value={""}
                                disabled={!props.mapIsVisible}
                            >
                                {props.map.isOriginLocked ? <LockOutline /> : <LockOpen />}
                                <span
                                    style={{
                                        marginLeft: "0.5rem",
                                    }}
                                >
                                    {props.map.isOriginLocked ? "Unlock" : "Lock"} Origin
                                </span>
                            </ToggleButton>

                            <Stack
                                direction="vertical"
                                gap={1}
                                style={{
                                    justifyContent: "flex-start",
                                    alignItems: "flex-start",
                                }}
                            >
                                <Form.Check
                                    type="switch"
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
                                <Form.Check
                                    type="switch"
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
                                <Form.Check
                                    type="switch"
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
                            </Stack>
                            <Stack
                                direction="vertical"
                                gap={1}
                                style={{
                                    justifyContent: "center",
                                }}
                            ></Stack>
                        </Stack>
                        <Stack direction="vertical" style={{ width: "100%" }}>
                            <MoorhenSlider
                                minVal={2}
                                maxVal={maxRadius}
                                showMinMaxVal={false}
                                showButtons={true}
                                logScale={false}
                                sliderTitle="Radius:"
                                isDisabled={!props.mapIsVisible}
                                externalValue={props.mapRadius}
                                setExternalValue={(newVal) => {
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
                        </Stack>
                    </Stack>
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
};
