import { HexColorInput, RgbColorPicker } from "react-colorful";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { RootState } from "@/store";
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
import { hexToRGB, rgbToHex } from "../../utils/utils";
import { MoorhenSlider, MoorhenToggle } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { MoorhenColorSwatch } from "../misc/MoorhenColorSwatch";
import { MoorhenLightPosition } from "../webMG/MoorhenLightPosition";
import { MoorhenSlidersSettings } from "./MoorhenSceneSlidersModal";

const EdgeDetectPanel = () => {
    const dispatch = useDispatch();

    const doEdgeDetect = useSelector((state: moorhen.State) => state.sceneSettings.doEdgeDetect);
    const edgeDetectDepthThreshold = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectDepthThreshold);
    const edgeDetectNormalThreshold = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectNormalThreshold);
    const edgeDetectDepthScale = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectDepthScale);
    const edgeDetectNormalScale = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectNormalScale);

    return (
        <MoorhenStack direction="vertical" card={true}>
            <MoorhenToggle
                type="switch"
                checked={doEdgeDetect}
                onChange={() => {
                    dispatch(setDoEdgeDetect(!doEdgeDetect));
                }}
                label="Edge detection"
            />

            <MoorhenSlider
                isDisabled={!doEdgeDetect}
                minVal={0}
                maxVal={4}
                scale="linear"
                sliderTitle="Depth scale"
                value={edgeDetectDepthScale}
                setValue={val => dispatch(setEdgeDetectDepthScale(val))}
                stepButtons={1}
                decimalPlaces={0}
            />
            <MoorhenSlider
                isDisabled={!doEdgeDetect}
                minVal={0}
                maxVal={4}
                scale="linear"
                sliderTitle="Normal scale"
                value={edgeDetectNormalScale}
                setValue={val => dispatch(setEdgeDetectNormalScale(val))}
                stepButtons={1}
                decimalPlaces={0}
            />
            <MoorhenSlider
                isDisabled={!doEdgeDetect}
                minVal={0.1}
                maxVal={10.0}
                scale="linear"
                sliderTitle="Depth threshold"
                value={edgeDetectDepthThreshold}
                setValue={val => dispatch(setEdgeDetectDepthThreshold(val))}
                stepButtons={0.1}
                decimalPlaces={1}
            />
            <MoorhenSlider
                isDisabled={!doEdgeDetect}
                minVal={0.1}
                maxVal={1.0}
                scale="linear"
                sliderTitle="Normal threshold"
                value={edgeDetectNormalThreshold}
                setValue={val => dispatch(setEdgeDetectNormalThreshold(val))}
                stepButtons={0.1}
                decimalPlaces={1}
            />
        </MoorhenStack>
    );
};

const OcclusionPanel = () => {
    const dispatch = useDispatch();
    const doSSAO = useSelector((state: moorhen.State) => state.sceneSettings.doSSAO);
    const ssaoRadius = useSelector((state: moorhen.State) => state.sceneSettings.ssaoRadius);
    const ssaoBias = useSelector((state: moorhen.State) => state.sceneSettings.ssaoBias);

    return (
        <MoorhenStack direction="vertical" card={true}>
            <MoorhenToggle
                type="switch"
                checked={doSSAO}
                onChange={() => {
                    dispatch(setDoSSAO(!doSSAO));
                }}
                label="Ambient occlusion"
            />

            <MoorhenSlider
                minVal={0.0}
                maxVal={2.0}
                scale="linear"
                isDisabled={!doSSAO}
                sliderTitle="Occlusion radius"
                value={ssaoRadius}
                setValue={val => dispatch(setSsaoRadius(val))}
                stepButtons={0.1}
                decimalPlaces={1}
            />
            <MoorhenSlider
                minVal={0.0}
                maxVal={1.0}
                scale="linear"
                isDisabled={!doSSAO}
                sliderTitle="Occlusion effect"
                value={ssaoBias}
                setValue={val => dispatch(setSsaoBias(val))}
                stepButtons={0.1}
                decimalPlaces={1}
            />
        </MoorhenStack>
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
        <MoorhenStack direction="vertical" card={true}>
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
                        const [r, g, b, _a] = ColourRule.parseHexToRgba(hex);
                        handleColorChange({ r, g, b });
                    }}
                />
            </div>
        </MoorhenStack>
    );
};

const DepthBlurPanel = () => {
    const dispatch = useDispatch();
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers);
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth);
    const depthBlurRadius = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurRadius);

    return (
        <MoorhenStack direction="vertical" card={true}>
            <MoorhenToggle
                type="switch"
                checked={useOffScreenBuffers}
                onChange={() => {
                    dispatch(setUseOffScreenBuffers(!useOffScreenBuffers));
                }}
                label="Depth Blur"
            />

            <MoorhenSlider
                isDisabled={!useOffScreenBuffers}
                minVal={0.4}
                maxVal={0.6}
                scale="linear"
                sliderTitle="Blur depth"
                value={depthBlurDepth}
                setValue={val => dispatch(setDepthBlurDepth(val))}
                stepButtons={0.0001}
                decimalPlaces={4}
            />
            <MoorhenSlider
                isDisabled={!useOffScreenBuffers}
                minVal={2}
                maxVal={16}
                scale="linear"
                sliderTitle="Blur radius"
                value={depthBlurRadius}
                setValue={val => dispatch(setDepthBlurRadius(val))}
                stepButtons={1}
                decimalPlaces={0}
            />
        </MoorhenStack>
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
        <MoorhenStack direction="vertical" card={true}>
            <MoorhenSlider
                minVal={0.1}
                maxVal={1000}
                scale="log"
                sliderTitle="Front clip"
                value={clipStart}
                setValue={newValue => {
                    dispatch(setClipStart(newValue));
                }}
                decimalPlaces={2}
            />
            <MoorhenSlider
                minVal={0.1}
                maxVal={1000}
                scale="log"
                sliderTitle="Back clip"
                value={clipEnd}
                setValue={newValue => {
                    dispatch(setClipEnd(newValue));
                }}
                decimalPlaces={2}
            />
            <MoorhenSlider
                minVal={0.1}
                maxVal={1000}
                scale="log"
                sliderTitle="Front zFog"
                value={fogClipOffset - gl_fog_start}
                setValue={newValue => {
                    dispatch(setFogStart(fogClipOffset - newValue));
                }}
                decimalPlaces={2}
            />
            <MoorhenSlider
                minVal={0.1}
                maxVal={1000}
                scale="log"
                sliderTitle="Back zFog"
                value={gl_fog_end - fogClipOffset}
                setValue={newValue => {
                    dispatch(setFogEnd(newValue + fogClipOffset));
                }}
                decimalPlaces={2}
            />

            <MoorhenToggle
                type="switch"
                checked={resetClippingFogging}
                onChange={() => {
                    dispatch(setResetClippingFogging(!resetClippingFogging));
                }}
                label="Reset clipping and fogging on zoom"
            />

            <MoorhenToggle
                type="switch"
                checked={clipCap}
                onChange={() => {
                    dispatch(setClipCap(!clipCap));
                }}
                label="'Clip-cap' perfect spheres"
            />
        </MoorhenStack>
    );
};

const LightingPanel = () => {
    const lightPosition = useSelector((state: moorhen.State) => state.glRef.lightPosition);
    const ambient = useSelector((state: moorhen.State) => state.glRef.ambient);
    const specular = useSelector((state: moorhen.State) => state.glRef.specular);
    const diffuse = useSelector((state: moorhen.State) => state.glRef.diffuse);
    const specularPower = useSelector((state: moorhen.State) => state.glRef.specularPower);

    const doShadow = useSelector((state: moorhen.State) => state.sceneSettings.doShadow);

    const dispatch = useDispatch();

    return (
        <MoorhenStack direction="vertical" card={true}>
            <MoorhenSlider
                minVal={0.0}
                maxVal={1.0}
                scale="linear"
                sliderTitle="Diffuse"
                value={diffuse[0]}
                setValue={newValue => {
                    dispatch(setDiffuse([newValue, newValue, newValue, 1.0]));
                }}
                stepButtons={0.01}
                decimalPlaces={2}
            />
            <MoorhenSlider
                minVal={0.0}
                maxVal={1.0}
                scale="linear"
                sliderTitle="Specular"
                value={specular[0]}
                setValue={newValue => {
                    dispatch(setSpecular([newValue, newValue, newValue, 1.0]));
                }}
                stepButtons={0.01}
                decimalPlaces={2}
            />
            <MoorhenSlider
                minVal={0.0}
                maxVal={1.0}
                scale="linear"
                sliderTitle="Ambient"
                value={ambient[0]}
                setValue={newValue => {
                    dispatch(setAmbient([newValue, newValue, newValue, 1.0]));
                }}
                stepButtons={0.01}
                decimalPlaces={2}
            />
            <MoorhenSlider
                minVal={1.0}
                maxVal={600.0}
                scale="linear"
                sliderTitle="Specular power"
                value={specularPower}
                setValue={newValue => {
                    dispatch(setSpecularPower(newValue));
                }}
                stepButtons={1}
                decimalPlaces={0}
            />
            <MoorhenStack align="center">
                <MoorhenLightPosition
                    initialValue={lightPosition}
                    setExternalValue={(newValues: [number, number, number]) => {
                        dispatch(setLightPosition([newValues[0], -newValues[1], newValues[2], 1.0]));
                    }}
                />
            </MoorhenStack>
            <MoorhenToggle
                type="switch"
                checked={doShadow}
                onChange={() => {
                    dispatch(setDoShadow(!doShadow));
                }}
                label="Shadows"
            />
        </MoorhenStack>
    );
};

export const MoorhenSceneSettings = (props: { stackDirection: "horizontal" | "vertical" }) => {
    const isWebGL2 = useSelector((state: moorhen.State) => state.glRef.isWebGL2);
    const panelWidth = useSelector((state: RootState) => state.globalUI.sidePanelWidth);
    const [newSlidersMode, setNewSlidersMode] = useState<boolean>(true);
    return (
        <MoorhenStack direction={props.stackDirection}>
            <MoorhenToggle
                label="Use new fog/clip/blur sliders"
                checked={newSlidersMode}
                onChange={() => setNewSlidersMode(!newSlidersMode)}
            />
            <MoorhenStack direction="vertical">
                {newSlidersMode && <MoorhenSlidersSettings stackDirection="vertical" width={panelWidth - 50} />}
                {!newSlidersMode && <ClipFogPanel />}
                <BackgroundColorPanel />
                <EdgeDetectPanel />
            </MoorhenStack>
            <MoorhenStack direction="vertical">
                <LightingPanel />
                {isWebGL2 && !newSlidersMode && <DepthBlurPanel />}
                <OcclusionPanel />
            </MoorhenStack>
        </MoorhenStack>
    );
};

export const MoorhenSceneSettingsModal = () => {
    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.SCENE_SETTINGS}
            headerTitle="Scene settings"
            enforceMaxBodyDimensions={true}
            body={<MoorhenSceneSettings stackDirection="horizontal" />}
            footer={null}
        />
    );
};
