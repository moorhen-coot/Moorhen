import { LastPageOutlined } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { useSnackbar } from "notistack";
import { Button, Form, InputGroup, Stack } from "react-bootstrap";
import { HexColorInput, RgbColorPicker } from "react-colorful";
import { useDispatch, useSelector } from "react-redux";
import React, { useEffect, useRef, useState } from "react";
import {
    setAmbient,
    setClipEnd,
    setClipStart,
    setDiffuse,
    setFogEnd,
    setFogStart,
    setLightPosition,
    setSpecular,
    setSpecularPower,
} from "../../store/glRefSlice";
import { hideModal } from "../../store/modalsSlice";
import {
    setBackgroundColor,
    setClipCap,
    setDepthBlurDepth,
    setDepthBlurRadius,
    setDoEdgeDetect,
    setDoSSAO,
    setDoShadow,
    setEdgeDetectDepthScale,
    setEdgeDetectDepthThreshold,
    setEdgeDetectNormalScale,
    setEdgeDetectNormalThreshold,
    setResetClippingFogging,
    setSsaoBias,
    setSsaoRadius,
    setUseOffScreenBuffers,
} from "../../store/sceneSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { ColourRule } from "../../utils/MoorhenColourRule";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx, hexToRGB, rgbToHex } from "../../utils/utils";
import { MoorhenSlider } from "../inputs";
import { MoorhenDraggableModalBase } from "../interface-base/DraggableModalBase";
import { MoorhenColorSwatch } from "../misc/MoorhenColorSwatch";
import { MoorhenLightPosition } from "../webMG/MoorhenLightPosition";

const EdgeDetectPanel = () => {
    const dispatch = useDispatch();

    const doEdgeDetect = useSelector((state: moorhen.State) => state.sceneSettings.doEdgeDetect);
    const edgeDetectDepthThreshold = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectDepthThreshold);
    const edgeDetectNormalThreshold = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectNormalThreshold);
    const edgeDetectDepthScale = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectDepthScale);
    const edgeDetectNormalScale = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectNormalScale);

    return (
        <div className="scene-settings-panel-flex-between">
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="switch"
                    checked={doEdgeDetect}
                    onChange={() => {
                        dispatch(setDoEdgeDetect(!doEdgeDetect));
                    }}
                    label="Edge detection"
                />
            </InputGroup>
            <MoorhenSlider
                isDisabled={!doEdgeDetect}
                minVal={0}
                maxVal={4}
                logScale={false}
                sliderTitle="Depth scale"
                externalValue={edgeDetectDepthScale}
                setExternalValue={val => dispatch(setEdgeDetectDepthScale(val))}
                stepButtons={1}
                decimalPlaces={0}
            />
            <MoorhenSlider
                isDisabled={!doEdgeDetect}
                minVal={0}
                maxVal={4}
                logScale={false}
                sliderTitle="Normal scale"
                externalValue={edgeDetectNormalScale}
                setExternalValue={val => dispatch(setEdgeDetectNormalScale(val))}
                stepButtons={1}
                decimalPlaces={0}
            />
            <MoorhenSlider
                isDisabled={!doEdgeDetect}
                minVal={0.1}
                maxVal={4.0}
                logScale={false}
                sliderTitle="Depth threshold"
                externalValue={edgeDetectDepthThreshold}
                setExternalValue={val => dispatch(setEdgeDetectDepthThreshold(val))}
                stepButtons={0.1}
                decimalPlaces={1}
            />
            <MoorhenSlider
                isDisabled={!doEdgeDetect}
                minVal={0.1}
                maxVal={1.0}
                logScale={false}
                sliderTitle="Normal threshold"
                externalValue={edgeDetectNormalThreshold}
                setExternalValue={val => dispatch(setEdgeDetectNormalThreshold(val))}
                stepButtons={0.1}
                decimalPlaces={1}
            />
        </div>
    );
};

const OcclusionPanel = () => {
    const dispatch = useDispatch();
    const doSSAO = useSelector((state: moorhen.State) => state.sceneSettings.doSSAO);
    const ssaoRadius = useSelector((state: moorhen.State) => state.sceneSettings.ssaoRadius);
    const ssaoBias = useSelector((state: moorhen.State) => state.sceneSettings.ssaoBias);

    return (
        <div className="scene-settings-panel-flex-between">
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="switch"
                    checked={doSSAO}
                    onChange={() => {
                        dispatch(setDoSSAO(!doSSAO));
                    }}
                    label="Ambient occlusion"
                />
            </InputGroup>
            <MoorhenSlider
                minVal={0.0}
                maxVal={2.0}
                logScale={false}
                isDisabled={!doSSAO}
                sliderTitle="Occlusion radius"
                externalValue={ssaoRadius}
                setExternalValue={val => dispatch(setSsaoRadius(val))}
                stepButtons={0.1}
                decimalPlaces={1}
            />
            <MoorhenSlider
                minVal={0.0}
                maxVal={1.0}
                logScale={false}
                isDisabled={!doSSAO}
                sliderTitle="Occlusion effect"
                externalValue={ssaoBias}
                setExternalValue={val => dispatch(setSsaoBias(val))}
                stepButtons={0.1}
                decimalPlaces={1}
            />
        </div>
    );
};

const BackgroundColorPanel = () => {
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const dispatch = useDispatch();

    const [innerBackgroundColor, setInnerBackgroundColor] = useState<{ r: number; g: number; b: number }>({
        r: 255 * backgroundColor[0],
        g: 255 * backgroundColor[1],
        b: 255 * backgroundColor[2],
    });

    useEffect(() => {
        try {
            if (
                JSON.stringify(backgroundColor) !==
                JSON.stringify([
                    innerBackgroundColor.r / 255,
                    innerBackgroundColor.g / 255,
                    innerBackgroundColor.b / 255,
                    backgroundColor[3],
                ])
            ) {
                dispatch(
                    setBackgroundColor([
                        innerBackgroundColor.r / 255,
                        innerBackgroundColor.g / 255,
                        innerBackgroundColor.b / 255,
                        backgroundColor[3],
                    ])
                );
            }
        } catch (err) {
            console.log(err);
        }
    }, [innerBackgroundColor]);

    const handleCircleClick = (col: string) => {
        try {
            const color = hexToRGB(col);
            setInnerBackgroundColor({ r: color[0], g: color[1], b: color[2] });
        } catch (err) {
            console.log("err", err);
        }
    };

    const handleColorChange = (color: { r: number; g: number; b: number }) => {
        try {
            setInnerBackgroundColor(color);
        } catch (err) {
            console.log("err", err);
        }
    };

    const swatchCols = ["#000000", "#5c5c5c", "#8a8a8a", "#cccccc", "#ffffff"];
    return (
        <Stack gap={1} direction="vertical" className="scene-settings-panel-flex-center">
            <span>Background Colour</span>
            <div style={{ padding: 0, margin: 0, justifyContent: "center", display: "flex" }}>
                <RgbColorPicker color={innerBackgroundColor} onChange={handleColorChange} />
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                    style={{
                        width: "11rem",
                        padding: "0.5rem",
                        margin: "0.15rem",
                        justifyContent: "center",
                        display: "flex",
                        backgroundColor: "#e3e1e1",
                        borderRadius: "8px",
                    }}
                >
                    <MoorhenColorSwatch cols={swatchCols} size={20} columns={5} onClick={handleCircleClick} />
                </div>
            </div>
            <div style={{ padding: 0, margin: 0, justifyContent: "center", display: "flex" }}>
                <div className="moorhen-hex-input-decorator">#</div>
                <HexColorInput
                    className="moorhen-hex-input"
                    color={rgbToHex(innerBackgroundColor.r, innerBackgroundColor.g, innerBackgroundColor.b)}
                    onChange={hex => {
                        const [r, g, b, a] = ColourRule.parseHexToRgba(hex);
                        handleColorChange({ r, g, b });
                    }}
                />
            </div>
        </Stack>
    );
};

const DepthBlurPanel = () => {
    const dispatch = useDispatch();
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers);
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth);
    const depthBlurRadius = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurRadius);

    return (
        <div className="scene-settings-panel-flex-between">
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="switch"
                    checked={useOffScreenBuffers}
                    onChange={() => {
                        dispatch(setUseOffScreenBuffers(!useOffScreenBuffers));
                    }}
                    label="Depth Blur"
                />
            </InputGroup>
            <MoorhenSlider
                isDisabled={!useOffScreenBuffers}
                minVal={0.4}
                maxVal={0.6}
                logScale={false}
                sliderTitle="Blur depth"
                externalValue={depthBlurDepth}
                setExternalValue={val => dispatch(setDepthBlurDepth(val))}
                stepButtons={0.0001}
                decimalPlaces={4}
            />
            <MoorhenSlider
                isDisabled={!useOffScreenBuffers}
                minVal={2}
                maxVal={16}
                logScale={false}
                sliderTitle="Blur radius"
                externalValue={depthBlurRadius}
                setExternalValue={val => dispatch(setDepthBlurRadius(val))}
                stepButtons={1}
                decimalPlaces={0}
            />
        </div>
    );
};

const ClipFogPanel = () => {
    const dispatch = useDispatch();
    const fogClipOffset = useSelector((state: moorhen.State) => state.glRef.fogClipOffset);
    const gl_fog_start = useSelector((state: moorhen.State) => state.glRef.fogStart);
    const gl_fog_end = useSelector((state: moorhen.State) => state.glRef.fogEnd);
    const clipStart = useSelector((state: moorhen.State) => state.glRef.clipStart);
    const clipEnd = useSelector((state: moorhen.State) => state.glRef.clipEnd);

    const clipCap = useSelector((state: moorhen.State) => state.sceneSettings.clipCap);
    const resetClippingFogging = useSelector((state: moorhen.State) => state.sceneSettings.resetClippingFogging);

    return (
        <div className="scene-settings-panel-flex-between">
            <MoorhenSlider
                minVal={0.1}
                maxVal={1000}
                logScale={true}
                sliderTitle="Front clip"
                externalValue={clipStart}
                setExternalValue={newValue => {
                    dispatch(setClipStart(newValue));
                }}
                decimalPlaces={1}
            />
            <MoorhenSlider
                minVal={0.1}
                maxVal={1000}
                logScale={true}
                sliderTitle="Back clip"
                externalValue={clipEnd}
                setExternalValue={newValue => {
                    dispatch(setClipEnd(newValue));
                }}
                decimalPlaces={1}
            />
            <MoorhenSlider
                minVal={0.1}
                maxVal={1000}
                logScale={true}
                sliderTitle="Front zFog"
                externalValue={fogClipOffset - gl_fog_start}
                setExternalValue={newValue => {
                    dispatch(setFogStart(fogClipOffset - newValue));
                }}
                decimalPlaces={1}
            />
            <MoorhenSlider
                minVal={0.1}
                maxVal={1000}
                logScale={true}
                sliderTitle="Back zFog"
                externalValue={gl_fog_end - fogClipOffset}
                setExternalValue={newValue => {
                    dispatch(setFogEnd(newValue + fogClipOffset));
                }}
                decimalPlaces={1}
            />
            <InputGroup style={{ paddingLeft: "0.1rem", paddingBottom: "0.5rem" }}>
                <Form.Check
                    type="switch"
                    checked={resetClippingFogging}
                    onChange={() => {
                        dispatch(setResetClippingFogging(!resetClippingFogging));
                    }}
                    label="Reset clipping and fogging on zoom"
                />
            </InputGroup>
            <InputGroup style={{ paddingLeft: "0.1rem", paddingBottom: "0.5rem" }}>
                <Form.Check
                    type="switch"
                    checked={clipCap}
                    onChange={() => {
                        dispatch(setClipCap(!clipCap));
                    }}
                    label="'Clip-cap' perfect spheres"
                />
            </InputGroup>
        </div>
    );
};

const LightingPanel = () => {
    const busyLighting = useRef<boolean>(false);
    const newLightPosition = useRef<[number, number, number]>(null);
    const isSetLightPosIsDirty = useRef<boolean>(false);

    const lightPosition = useSelector((state: moorhen.State) => state.glRef.lightPosition);
    const ambient = useSelector((state: moorhen.State) => state.glRef.ambient);
    const specular = useSelector((state: moorhen.State) => state.glRef.specular);
    const diffuse = useSelector((state: moorhen.State) => state.glRef.diffuse);
    const specularPower = useSelector((state: moorhen.State) => state.glRef.specularPower);

    const doShadow = useSelector((state: moorhen.State) => state.sceneSettings.doShadow);

    const dispatch = useDispatch();

    return (
        <div className="scene-settings-panel">
            <MoorhenSlider
                minVal={0.0}
                maxVal={1.0}
                logScale={false}
                sliderTitle="Diffuse"
                externalValue={diffuse[0]}
                setExternalValue={newValue => {
                    dispatch(setDiffuse([newValue, newValue, newValue, 1.0]));
                }}
                stepButtons={0.01}
                decimalPlaces={2}
            />
            <MoorhenSlider
                minVal={0.0}
                maxVal={1.0}
                logScale={false}
                sliderTitle="Specular"
                externalValue={specular[0]}
                setExternalValue={newValue => {
                    dispatch(setSpecular([newValue, newValue, newValue, 1.0]));
                }}
                stepButtons={0.01}
                decimalPlaces={2}
            />
            <MoorhenSlider
                minVal={0.0}
                maxVal={1.0}
                logScale={false}
                sliderTitle="Ambient"
                externalValue={ambient[0]}
                setExternalValue={newValue => {
                    dispatch(setAmbient([newValue, newValue, newValue, 1.0]));
                }}
                stepButtons={0.01}
                decimalPlaces={2}
            />
            <MoorhenSlider
                minVal={1.0}
                maxVal={600.0}
                logScale={false}
                sliderTitle="Specular power"
                externalValue={specularPower}
                setExternalValue={newValue => {
                    dispatch(setSpecularPower(newValue));
                }}
                stepButtons={1}
                decimalPlaces={0}
            />
            <MoorhenLightPosition
                initialValue={lightPosition}
                setExternalValue={(newValues: [number, number, number]) => {
                    dispatch(setLightPosition([newValues[0], -newValues[1], newValues[2], 1.0]));
                }}
            />
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="switch"
                    checked={doShadow}
                    onChange={() => {
                        dispatch(setDoShadow(!doShadow));
                    }}
                    label="Shadows"
                />
            </InputGroup>
        </div>
    );
};

const MoorhenSceneSettings = (props: { stackDirection: "horizontal" | "vertical" }) => {
    const isWebGL2 = useSelector((state: moorhen.State) => state.glRef.isWebGL2);
    return (
        <Stack gap={2} direction={props.stackDirection} style={{ display: "flex", alignItems: "start", width: "100%", height: "100%" }}>
            <Stack gap={2} direction="vertical">
                <ClipFogPanel />
                <BackgroundColorPanel />
                <EdgeDetectPanel />
            </Stack>
            <Stack gap={1} direction="vertical">
                <LightingPanel />
                {isWebGL2 && <DepthBlurPanel />}
                <OcclusionPanel />
            </Stack>
        </Stack>
    );
};

export const MoorhenSceneSettingsModal = () => {
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

    const dispatch = useDispatch();

    const { enqueueSnackbar } = useSnackbar();

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.SCENE_SETTINGS}
            left={width / 5}
            top={height / 6}
            headerTitle="Scene settings"
            minHeight={convertViewtoPx(60, height)}
            minWidth={convertRemToPx(40)}
            maxHeight={convertViewtoPx(75, height)}
            maxWidth={convertRemToPx(60)}
            enforceMaxBodyDimensions={true}
            body={<MoorhenSceneSettings stackDirection="horizontal" />}
            footer={null}
            additionalHeaderButtons={[
                <Tooltip title={"Move to side panel"} key={1}>
                    <Button
                        variant="white"
                        style={{ margin: "0.1rem", padding: "0.1rem" }}
                        onClick={() => {
                            dispatch(hideModal(modalKeys.SCENE_SETTINGS));
                            enqueueSnackbar(modalKeys.SCENE_SETTINGS, {
                                variant: "sideBar",
                                persist: true,
                                anchorOrigin: { horizontal: "right", vertical: "bottom" },
                                title: "Scene settings",
                                modalId: modalKeys.SCENE_SETTINGS,
                                children: (
                                    <div style={{ overflowY: "scroll", overflowX: "hidden", maxHeight: "50vh" }}>
                                        <MoorhenSceneSettings stackDirection="vertical" />
                                    </div>
                                ),
                            });
                        }}
                    >
                        <LastPageOutlined />
                    </Button>
                </Tooltip>,
            ]}
        />
    );
};
