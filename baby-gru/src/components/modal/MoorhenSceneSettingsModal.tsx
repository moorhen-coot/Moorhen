import React, { useState, useEffect, useRef } from "react";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";
import { useDispatch, useSelector } from "react-redux";
import { convertRemToPx, convertViewtoPx, rgbToHex } from "../../utils/utils";
import { MoorhenSlider } from "../misc/MoorhenSlider";
import { MoorhenLightPosition } from "../webMG/MoorhenLightPosition";
import { Button, Form, InputGroup, Stack } from "react-bootstrap";
import { 
    setBackgroundColor, setClipCap, setDepthBlurDepth, setDepthBlurRadius, setDoSSAO, setResetClippingFogging,
    setSsaoRadius, setSsaoBias,setUseOffScreenBuffers, setDoEdgeDetect, setEdgeDetectDepthThreshold, setEdgeDetectNormalThreshold,
    setEdgeDetectDepthScale, setEdgeDetectNormalScale, setDoShadow
} from "../../store/sceneSettingsSlice";
import { HexColorInput, RgbColorPicker } from "react-colorful";
import { CirclePicker } from "react-color"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { Tooltip } from "@mui/material";
import { useSnackbar } from "notistack";
import { LastPageOutlined } from "@mui/icons-material";
import { MoorhenColourRule } from "../../utils/MoorhenColourRule";
import { modalKeys } from "../../utils/enums";
import { hideModal } from "../../store/modalsSlice";
import { setLightPosition, setAmbient, setSpecular, setDiffuse, setSpecularPower,
         setFogStart, setFogEnd, setClipStart, setClipEnd } from "../../store/glRefSlice"

const EdgeDetectPanel = (props: {}) => {

    const dispatch = useDispatch()

    const doEdgeDetect = useSelector((state: moorhen.State) => state.sceneSettings.doEdgeDetect)
    const edgeDetectDepthThreshold = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectDepthThreshold)
    const edgeDetectNormalThreshold = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectNormalThreshold)
    const edgeDetectDepthScale = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectDepthScale)
    const edgeDetectNormalScale = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectNormalScale)

    return <div className="scene-settings-panel-flex-between">
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check 
                type="switch"
                checked={doEdgeDetect}
                onChange={() => { dispatch(
                    setDoEdgeDetect(!doEdgeDetect)
                )}}
                label="Edge detection"/>
        </InputGroup>
        <MoorhenSlider
                isDisabled={!doEdgeDetect}
                minVal={0}
                maxVal={4}
                allowFloats={false}
                logScale={false}
                sliderTitle="Depth scale"
                initialValue={edgeDetectDepthScale==null ? 2.0 : edgeDetectDepthScale}
                externalValue={edgeDetectDepthScale==null ? 2.0 : edgeDetectDepthScale}
                setExternalValue={(val: number) => dispatch(setEdgeDetectDepthScale(val))}/>
        <MoorhenSlider
                isDisabled={!doEdgeDetect}
                minVal={0}
                maxVal={4}
                allowFloats={false}
                logScale={false}
                sliderTitle="Normal scale"
                initialValue={edgeDetectNormalScale==null ? 1.0 : edgeDetectNormalScale}
                externalValue={edgeDetectNormalScale==null ? 1.0 : edgeDetectNormalScale}
                setExternalValue={(val: number) => dispatch(setEdgeDetectNormalScale(val))}/>
        <MoorhenSlider
                isDisabled={!doEdgeDetect}
                minVal={0.1}
                maxVal={4.0}
                logScale={false}
                sliderTitle="Depth threshold"
                initialValue={edgeDetectDepthThreshold==null ? 1.4 : edgeDetectDepthThreshold}
                externalValue={edgeDetectDepthThreshold==null ? 1.4 : edgeDetectDepthThreshold}
                setExternalValue={(val: number) => dispatch(setEdgeDetectDepthThreshold(val))}/>
        <MoorhenSlider
                isDisabled={!doEdgeDetect}
                minVal={0.1}
                maxVal={1.0}
                logScale={false}
                sliderTitle="Normal threshold"
                initialValue={edgeDetectNormalThreshold==null ? 0.5 : edgeDetectNormalThreshold}
                externalValue={edgeDetectNormalThreshold==null ? 0.5 : edgeDetectNormalThreshold}
                setExternalValue={(val: number) => dispatch(setEdgeDetectNormalThreshold(val))}/>
    </div>
}

const OcclusionPanel = (props: {}) => {
    const dispatch = useDispatch()
    const doSSAO = useSelector((state: moorhen.State) => state.sceneSettings.doSSAO)
    const ssaoRadius = useSelector((state: moorhen.State) => state.sceneSettings.ssaoRadius)
    const ssaoBias = useSelector((state: moorhen.State) => state.sceneSettings.ssaoBias)
    
    return <div className="scene-settings-panel-flex-between">
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check 
                type="switch"
                checked={doSSAO}
                onChange={() => { dispatch(
                    setDoSSAO(!doSSAO)
                )}}
                label="Ambient occlusion"/>
        </InputGroup>
        <MoorhenSlider minVal={0.0} maxVal={2.0} logScale={false}
            isDisabled={!doSSAO}
            sliderTitle="Occlusion radius"
            initialValue={ssaoRadius==null ? 0.4 : ssaoRadius}
            externalValue={ssaoRadius==null ? 0.4 : ssaoRadius}
            setExternalValue={(val: number) => dispatch(setSsaoRadius(val))} />
        <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false}
            isDisabled={!doSSAO}
            sliderTitle="Occlusion effect"
            initialValue={ssaoBias==null ? 1.0 : ssaoRadius}
            externalValue={ssaoBias==null ? 1.0 : ssaoRadius}
            setExternalValue={(val: number) => dispatch(setSsaoBias(val))} />
    </div>
}

const BackgroundColorPanel = (props: {}) => {
    
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const dispatch = useDispatch()

    const [innerBackgroundColor, setInnerBackgroundColor] = useState<{ r: number; g: number; b: number; }>({
        r: 255 * backgroundColor[0],
        g: 255 * backgroundColor[1],
        b: 255 * backgroundColor[2],
    })

    useEffect(() => {
        try {
            if (JSON.stringify(backgroundColor) !== JSON.stringify([innerBackgroundColor.r / 255., innerBackgroundColor.g / 255., innerBackgroundColor.b / 255., backgroundColor[3]])) {
                dispatch(
                    setBackgroundColor([ innerBackgroundColor.r / 255., innerBackgroundColor.g / 255., innerBackgroundColor.b / 255., backgroundColor[3] ])
                )
            }
        } catch (err) {
            console.log(err)
        }    
    }, [innerBackgroundColor])

    const handleCircleClick = (color: { rgb: { r: number; g: number; b: number; a: number; } }) => {
        try {
            setInnerBackgroundColor(color.rgb)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const handleColorChange = (color: { r: number; g: number; b: number; }) => {
        try {
            setInnerBackgroundColor(color)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    return <Stack gap={1} direction="vertical" className="scene-settings-panel-flex-center">
        <span>Background Colour</span>
        <div style={{padding: 0, margin: 0, justifyContent: 'center', display: 'flex'}}>
            <RgbColorPicker color={innerBackgroundColor} onChange={handleColorChange} />
        </div>
        <div style={{display: 'flex', justifyContent: 'center'}}>
            <div style={{width: '11rem', padding: '0.5rem', margin: '0.15rem', justifyContent: 'center', display: 'flex', backgroundColor: '#e3e1e1', borderRadius: '8px'}}>
                <CirclePicker onChange={handleCircleClick} width='10rem' circleSize={convertRemToPx(10)/9} color={innerBackgroundColor} colors={['#000000', '#5c5c5c', '#8a8a8a', '#cccccc', '#ffffff']}/>
            </div>
        </div>
        <div style={{padding: 0, margin: 0, justifyContent: 'center', display: 'flex' }}>
            <div className="moorhen-hex-input-decorator">#</div>
            <HexColorInput className='moorhen-hex-input'
                color={rgbToHex(innerBackgroundColor.r, innerBackgroundColor.g, innerBackgroundColor.b)}
                onChange={(hex) => {
                    const [r, g, b, a] = MoorhenColourRule.parseHexToRgba(hex)
                    handleColorChange({r, g, b})
            }}/>
        </div>
    </Stack>
}

const DepthBlurPanel = (props: {

}) => {

    const dispatch = useDispatch()
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers)
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth)
    const depthBlurRadius = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurRadius)
    
    return <div className="scene-settings-panel-flex-between">
            <InputGroup className='moorhen-input-group-check'>
                <Form.Check 
                    type="switch"
                    checked={useOffScreenBuffers}
                    onChange={() => { dispatch(
                        setUseOffScreenBuffers(!useOffScreenBuffers)
                    )}}
                    label="Depth Blur"/>
            </InputGroup>
            <MoorhenSlider
                isDisabled={!useOffScreenBuffers}
                minVal={0.4}
                maxVal={0.6}
                logScale={false}
                sliderTitle="Blur depth"
                initialValue={depthBlurDepth==null ? 0.2 : depthBlurDepth}
                externalValue={depthBlurDepth==null ? 0.2 : depthBlurDepth}
                setExternalValue={(val: number) => dispatch(setDepthBlurDepth(val))}/>
            <MoorhenSlider
                isDisabled={!useOffScreenBuffers}
                minVal={2}
                maxVal={16}
                logScale={false}
                sliderTitle="Blur radius"
                initialValue={depthBlurRadius==null ? 3 : depthBlurRadius}
                externalValue={depthBlurRadius==null ? 3 : depthBlurRadius}
                allowFloats={false}
                setExternalValue={(val: number) => dispatch(setDepthBlurRadius(val))}/>
    </div>
}

const ClipFogPanel = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const dispatch = useDispatch()
    const fogClipOffset = useSelector((state: moorhen.State) => state.glRef.fogClipOffset)
    const gl_fog_start = useSelector((state: moorhen.State) => state.glRef.fogStart)
    const gl_fog_end = useSelector((state: moorhen.State) => state.glRef.fogEnd)
    const clipStart = useSelector((state: moorhen.State) => state.glRef.clipStart)
    const clipEnd = useSelector((state: moorhen.State) => state.glRef.clipEnd)

    const clipCap = useSelector((state: moorhen.State) => state.sceneSettings.clipCap)
    const resetClippingFogging = useSelector((state: moorhen.State) => state.sceneSettings.resetClippingFogging)

    return <div className="scene-settings-panel-flex-between">
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Front clip"
            initialValue={clipStart}
            externalValue={clipStart}
            setExternalValue={(newValue: number) => {
                dispatch(setClipStart(newValue))
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Back clip"
            initialValue={clipEnd}
            externalValue={clipEnd}
            setExternalValue={(newValue: number) => {
                dispatch(setClipEnd(newValue))
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Front zFog"
            initialValue={fogClipOffset - gl_fog_start}
            externalValue={fogClipOffset - gl_fog_start}
            setExternalValue={(newValue: number) => {
                dispatch(setFogStart(fogClipOffset - newValue))
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Back zFog"
            externalValue={gl_fog_end - fogClipOffset}
            initialValue={gl_fog_end - fogClipOffset}
            setExternalValue={(newValue: number) => {
                dispatch(setFogEnd(newValue + fogClipOffset))
            }} />
        <InputGroup style={{ paddingLeft: '0.1rem', paddingBottom: '0.5rem' }}>
            <Form.Check
                type="switch"
                checked={resetClippingFogging}
                onChange={() => { dispatch(
                    setResetClippingFogging(!resetClippingFogging) 
                )}}
                label="Reset clipping and fogging on zoom" />
        </InputGroup>
        <InputGroup style={{ paddingLeft: '0.1rem', paddingBottom: '0.5rem' }}>
            <Form.Check
                type="switch"
                checked={clipCap}
                onChange={() => { dispatch(
                    setClipCap(!clipCap)
                )}}
                label="'Clip-cap' perfect spheres" />
        </InputGroup>
    </div>
}

const LightingPanel = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const busyLighting = useRef<boolean>(false)
    const newLightPosition = useRef<[number, number, number]>()
    const isSetLightPosIsDirty = useRef<boolean>(false)

    const lightPosition = useSelector((state: moorhen.State) => state.glRef.lightPosition)
    const ambient = useSelector((state: moorhen.State) => state.glRef.ambient)
    const specular = useSelector((state: moorhen.State) => state.glRef.specular)
    const diffuse = useSelector((state: moorhen.State) => state.glRef.diffuse)
    const specularPower = useSelector((state: moorhen.State) => state.glRef.specularPower)

    const doShadow = useSelector((state: moorhen.State) => state.sceneSettings.doShadow)

    const dispatch = useDispatch()

    return <div className="scene-settings-panel">
        <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false}
            sliderTitle="Diffuse"
            initialValue={diffuse[0]}
            externalValue={diffuse[0]}
            setExternalValue={(newValue: number) => {
                dispatch(setDiffuse([newValue, newValue, newValue, 1.0]))
            }} />
        <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false}
            sliderTitle="Specular"
            initialValue={specular[0]}
            externalValue={specular[0]}
            setExternalValue={(newValue: number) => {
                dispatch(setSpecular([newValue, newValue, newValue, 1.0]))
            }} />
        <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false}
            sliderTitle="Ambient"
            initialValue={ambient[0]}
            externalValue={ambient[0]}
            setExternalValue={(newValue: number) => {
                dispatch(setAmbient([newValue, newValue, newValue, 1.0]))
            }} />
        <MoorhenSlider minVal={1.0} maxVal={600.0} logScale={false}
            sliderTitle="Specular power"
            initialValue={specularPower}
            externalValue={specularPower}
            setExternalValue={(newValue: number) => {
                dispatch(setSpecularPower(newValue))
            }} />
        <MoorhenLightPosition
            initialValue={lightPosition}
            setExternalValue={(newValues: [number, number, number]) => {
                dispatch(setLightPosition([newValues[0], -newValues[1], newValues[2],1.0]))
            }}
        />
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check 
                type="switch"
                checked={doShadow}
                onChange={() => {dispatch( setDoShadow(!doShadow) )}}
                label="Shadows"/>
        </InputGroup>
    </div>
}

const MoorhenSceneSettings = (props: { glRef: React.RefObject<webGL.MGWebGL>; stackDirection: "horizontal" | "vertical";}) => {

    const isWebGL2 = useSelector((state: moorhen.State) => state.glRef.isWebGL2)
    return <Stack gap={2} direction={props.stackDirection} style={{display: 'flex', alignItems: 'start', width: '100%', height: "100%"}}>
        <Stack gap={2} direction="vertical">
            <ClipFogPanel glRef={props.glRef}/>
            <BackgroundColorPanel/>
            <EdgeDetectPanel/>
        </Stack>
        <Stack gap={1} direction="vertical">
            <LightingPanel glRef={props.glRef}/>
            {isWebGL2 && <DepthBlurPanel/>}
            <OcclusionPanel/>
        </Stack>
    </Stack>
}

export const MoorhenSceneSettingsModal = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const dispatch = useDispatch()

    const { enqueueSnackbar } = useSnackbar()

    return <MoorhenDraggableModalBase
                modalId={modalKeys.SCENE_SETTINGS}
                left={width / 5}
                top={height / 6}
                headerTitle="Scene settings"
                minHeight={convertViewtoPx(60, height)}
                minWidth={convertRemToPx(40)}
                maxHeight={convertViewtoPx(75, height)}
                maxWidth={convertRemToPx(60)}
                enforceMaxBodyDimensions={true}
                body={
                    <MoorhenSceneSettings glRef={props.glRef} stackDirection="horizontal" />
                }
                footer={null}
                additionalHeaderButtons={[
                    <Tooltip title={"Move to side panel"}  key={1}>
                        <Button variant='white' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => {
                            dispatch( hideModal(modalKeys.SCENE_SETTINGS) )
                            enqueueSnackbar(modalKeys.SCENE_SETTINGS, {
                                variant: "sideBar",
                                persist: true,
                                anchorOrigin: {horizontal: "right", vertical: "bottom"},
                                title: "Scene settings",
                                modalId: modalKeys.SCENE_SETTINGS,
                                children: <div style={{ overflowY: 'scroll', overflowX: "hidden", maxHeight: '50vh' }}>
                                    <MoorhenSceneSettings glRef={props.glRef} stackDirection="vertical" />
                                </div>
                            })                
                        }}>
                            <LastPageOutlined/>
                        </Button>
                    </Tooltip>
                ]}
                {...props}
                />
}
