import { useEffect, useCallback, forwardRef, useState, useRef, useReducer } from 'react';
import { MGWebGL } from '../../WebGLgComponents/mgWebGL';
import { MoorhenContextMenu } from "../context-menu/MoorhenContextMenu"
import { cidToSpec } from '../../utils/utils';
import { MoorhenScreenRecorder } from "../../utils/MoorhenScreenRecorder"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { libcootApi } from '../../types/libcoot';
import { useDispatch, useSelector } from 'react-redux';
import { moorhenKeyPress } from '../../utils/MoorhenKeyboardPress';
import { useSnackbar } from 'notistack';

interface MoorhenWebMGPropsInterface {
    monomerLibraryPath: string;
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    viewOnly: boolean;
    urlPrefix: string;
    onAtomHovered: (identifier: { buffer: { id: string; }; atom: moorhen.AtomInfo; }) => void;
    videoRecorderRef: React.MutableRefObject<null | moorhen.ScreenRecorder>;
}

const intialDefaultActionButtonSettings: moorhen.actionButtonSettings = {
    mutate: 'ALA',
    refine: 'TRIPLE',
    delete: 'RESIDUE',
    rotateTranslate: 'RESIDUE',
    drag: 'TRIPLE',
    rigidBodyFit: 'CHAIN',
}

const actionButtonSettingsReducer = (defaultSettings: moorhen.actionButtonSettings, change: {key: string; value: string}) => {
    defaultSettings[change.key] = change.value
    return defaultSettings
}

export const MoorhenWebMG = forwardRef<webGL.MGWebGL, MoorhenWebMGPropsInterface>((props, glRef) => {
    const dispatch = useDispatch()

    const { enqueueSnackbar } = useSnackbar()

    const [innerMapLineWidth, setInnerMapLineWidth] = useState<number>(0.75)
    const [showContextMenu, setShowContextMenu] = useState<false | moorhen.AtomRightClickEventInfo>(false)
    const [defaultActionButtonSettings, setDefaultActionButtonSettings] = useReducer(actionButtonSettingsReducer, intialDefaultActionButtonSettings)

    const reContourMapOnlyOnMouseUp = useSelector((state: moorhen.State) => state.mapContourSettings.reContourMapOnlyOnMouseUp)
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection)
    const isChangingRotamers = useSelector((state: moorhen.State) => state.generalStates.isChangingRotamers)
    const isDraggingAtoms = useSelector((state: moorhen.State) => state.generalStates.isDraggingAtoms)
    const isRotatingAtoms = useSelector((state: moorhen.State) => state.generalStates.isRotatingAtoms)
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)
    const enableAtomHovering = useSelector((state: moorhen.State) => state.hoveringStates.enableAtomHovering)
    const drawScaleBar = useSelector((state: moorhen.State) => state.sceneSettings.drawScaleBar)
    const drawCrosshairs = useSelector((state: moorhen.State) => state.sceneSettings.drawCrosshairs)
    const drawFPS = useSelector((state: moorhen.State) => state.sceneSettings.drawFPS)
    const drawMissingLoops = useSelector((state: moorhen.State) => state.sceneSettings.drawMissingLoops)
    const drawAxes = useSelector((state: moorhen.State) => state.sceneSettings.drawAxes)
    const drawInteractions = useSelector((state: moorhen.State) => state.sceneSettings.drawInteractions)
    const doSSAO = useSelector((state: moorhen.State) => state.sceneSettings.doSSAO)
    const doEdgeDetect = useSelector((state: moorhen.State) => state.sceneSettings.doEdgeDetect)
    const edgeDetectDepthThreshold = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectDepthThreshold)
    const edgeDetectNormalThreshold = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectNormalThreshold)
    const edgeDetectDepthScale = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectDepthScale)
    const edgeDetectNormalScale = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectNormalScale)
    const ssaoRadius = useSelector((state: moorhen.State) => state.sceneSettings.ssaoRadius)
    const ssaoBias = useSelector((state: moorhen.State) => state.sceneSettings.ssaoBias)
    const resetClippingFogging = useSelector((state: moorhen.State) => state.sceneSettings.resetClippingFogging)
    const clipCap = useSelector((state: moorhen.State) => state.sceneSettings.clipCap)
    const doPerspectiveProjection = useSelector((state: moorhen.State) => state.sceneSettings.doPerspectiveProjection)
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers)
    const doShadowDepthDebug = useSelector((state: moorhen.State) => state.sceneSettings.doShadowDepthDebug)
    const doShadow = useSelector((state: moorhen.State) => state.sceneSettings.doShadow)
    const doSpin = useSelector((state: moorhen.State) => state.sceneSettings.doSpin)
    const doOutline = useSelector((state: moorhen.State) => state.sceneSettings.doOutline)
    const depthBlurRadius = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurRadius)
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth)
    const atomLabelDepthMode = useSelector((state: moorhen.State) => state.labelSettings.atomLabelDepthMode)
    const mouseSensitivity = useSelector((state: moorhen.State) => state.mouseSettings.mouseSensitivity)
    const zoomWheelSensitivityFactor = useSelector((state: moorhen.State) => state.mouseSettings.zoomWheelSensitivityFactor)
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const shortcutOnHoveredAtom = useSelector((state: moorhen.State) => state.shortcutSettings.shortcutOnHoveredAtom)
    const showShortcutToast = useSelector((state: moorhen.State) => state.shortcutSettings.showShortcutToast)
    const mapLineWidth = useSelector((state: moorhen.State) => state.mapContourSettings.mapLineWidth)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)

    const setClipFogByZoom = (): void => {
        const fieldDepthFront: number = 8;
        const fieldDepthBack: number = 21;
        if (glRef !== null && typeof glRef !== 'function') { 
            glRef.current.set_fog_range(glRef.current.fogClipOffset - (glRef.current.zoom * fieldDepthFront), glRef.current.fogClipOffset + (glRef.current.zoom * fieldDepthBack))
            glRef.current.set_clip_range(0 - (glRef.current.zoom * fieldDepthFront), 0 + (glRef.current.zoom * fieldDepthBack))
            glRef.current.doDrawClickedAtomLines = false    
        }
    }

    const handleZoomChanged = useCallback(evt => {
        if (resetClippingFogging) {
            setClipFogByZoom()
        }
    }, [glRef, resetClippingFogging])

    const handleGoToBlobDoubleClick = useCallback(async (evt) => {
        const response = await props.commandCentre.current.cootCommand({
            returnType: "float_array",
            command: "go_to_blob_array",
            commandArgs: [evt.detail.front[0], evt.detail.front[1], evt.detail.front[2], evt.detail.back[0], evt.detail.back[1], evt.detail.back[2], 0.5]
        }, false) as moorhen.WorkerResponse<[number, number, number]>;

        let newOrigin = response.data.result.result;
        if (newOrigin.length === 3 && glRef !== null && typeof glRef !== 'function') {
            glRef.current.setOriginAnimated([-newOrigin[0], -newOrigin[1], -newOrigin[2]])
        }

    }, [props.commandCentre, glRef])

    const handleMiddleClickGoToAtom = useCallback(evt => {
        if (hoveredAtom?.molecule && hoveredAtom?.cid){

            const residueSpec: moorhen.ResidueSpec = cidToSpec(hoveredAtom.cid)

            if (!residueSpec.chain_id || !residueSpec.res_no) {
                return
            }

            hoveredAtom.molecule.centreOn(`/*/${residueSpec.chain_id}/${residueSpec.res_no}-${residueSpec.res_no}/*`, true, false)
        }
    }, [hoveredAtom])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            props.videoRecorderRef.current = new MoorhenScreenRecorder(glRef)
        }
    }, [])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.doPerspectiveProjection = doPerspectiveProjection
            glRef.current.clearTextPositionBuffers()
            glRef.current.drawScene()    
        }
    }, [doPerspectiveProjection])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setShadowDepthDebug(doShadowDepthDebug)
            glRef.current.drawScene()
        }
    }, [doShadowDepthDebug])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setOutlinesOn(doOutline)
            glRef.current.drawScene()
        }
    }, [doOutline])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSSAOOn(doSSAO)
            glRef.current.drawScene()
        }
    }, [doSSAO])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setEdgeDetectOn(doEdgeDetect)
            glRef.current.drawScene()
        }
    }, [doEdgeDetect])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setEdgeDetectDepthThreshold(edgeDetectDepthThreshold)
            glRef.current.drawScene()
        }
    }, [edgeDetectDepthThreshold])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setEdgeDetectNormalThreshold(edgeDetectNormalThreshold)
            glRef.current.drawScene()
        }
    }, [edgeDetectNormalThreshold])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setEdgeDetectDepthScale(edgeDetectDepthScale)
            glRef.current.drawScene()
        }
    }, [edgeDetectDepthScale])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setEdgeDetectNormalScale(edgeDetectNormalScale)
            glRef.current.drawScene()
        }
    }, [edgeDetectNormalScale])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setShadowsOn(doShadow)
            glRef.current.drawScene()
        }
    }, [doShadow])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSpinTestState(doSpin)
            glRef.current.drawScene()
        }
    }, [doSpin])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSSAOBias(ssaoBias)
            glRef.current.drawScene()
        }
    }, [ssaoBias])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSSAORadius(ssaoRadius)
            glRef.current.drawScene()
        }
    }, [ssaoRadius])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setBlurSize(depthBlurRadius)
            glRef.current.drawScene()
        }
    }, [depthBlurRadius])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.blurDepth = depthBlurDepth
            glRef.current.drawScene()
        }
    }, [depthBlurDepth])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.useOffScreenBuffers = useOffScreenBuffers
            glRef.current.drawScene()
        }
    }, [useOffScreenBuffers])

    const handleWindowResized = useCallback(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.setAmbientLightNoUpdate(0.2, 0.2, 0.2)
            glRef.current.setSpecularLightNoUpdate(0.6, 0.6, 0.6)
            glRef.current.setDiffuseLight(1., 1., 1.)
            glRef.current.setLightPositionNoUpdate(10., 10., 60.)
            if (resetClippingFogging) {
                setClipFogByZoom()
            }
            glRef.current.resize(width, height)
            glRef.current.drawScene()    
        }
    }, [glRef, width, height])

    const handleRightClick = useCallback((e: moorhen.AtomRightClickEvent) => {
        if (!isRotatingAtoms && !isChangingRotamers && !isDraggingAtoms && !residueSelection.molecule) {
            setShowContextMenu({ ...e.detail })            
        }
    }, [isRotatingAtoms, isChangingRotamers, isDraggingAtoms, residueSelection])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.setAmbientLightNoUpdate(0.2, 0.2, 0.2)
            glRef.current.setSpecularLightNoUpdate(0.6, 0.6, 0.6)
            glRef.current.setDiffuseLight(1., 1., 1.)
            glRef.current.setLightPositionNoUpdate(10., 10., 60.)
            setClipFogByZoom()
            glRef.current.resize(width, height)
            glRef.current.drawScene()
        }
    }, [])

    useEffect(() => {
        document.addEventListener("goToBlobDoubleClick", handleGoToBlobDoubleClick);
        return () => {
            document.removeEventListener("goToBlobDoubleClick", handleGoToBlobDoubleClick);
        };

    }, [handleGoToBlobDoubleClick]);

    useEffect(() => {
        document.addEventListener("zoomChanged", handleZoomChanged);
        return () => {
            document.removeEventListener("zoomChanged", handleZoomChanged);
        };
    }, [handleZoomChanged]);

    useEffect(() => {
        document.addEventListener("goToAtomMiddleClick", handleMiddleClickGoToAtom);
        return () => {
            document.removeEventListener("goToAtomMiddleClick", handleMiddleClickGoToAtom);
        };

    }, [handleMiddleClickGoToAtom]);

    useEffect(() => {
        window.addEventListener('resize', handleWindowResized)
        return () => {
            window.removeEventListener('resize', handleWindowResized)
        }
    }, [handleWindowResized])

    useEffect(() => {
        document.addEventListener("rightClick", handleRightClick);
        return () => {
            document.removeEventListener("rightClick", handleRightClick);
        };

    }, [handleRightClick]);

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.clipCapPerfectSpheres = clipCap
            glRef.current.drawScene()
        }
    }, [clipCap, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.setBackground(backgroundColor)
        }
    }, [backgroundColor, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.atomLabelDepthMode = atomLabelDepthMode
            glRef.current.drawScene()
        }
    }, [atomLabelDepthMode, glRef])

    useEffect(() => {
        if (innerMapLineWidth !== mapLineWidth){
            setInnerMapLineWidth(mapLineWidth)
        }
    }, [mapLineWidth])


    //Make this so that the keyPress returns true or false, depending on whether mgWebGL is to continue processing event
    const onKeyPress = useCallback((event: KeyboardEvent) => {
        if (isChangingRotamers || isRotatingAtoms || isDraggingAtoms) {
            return false
        }
        return moorhenKeyPress(
            event,
            {
                molecules,
                activeMap,
                hoveredAtom,
                dispatch,
                enqueueSnackbar,
                glRef: glRef as React.RefObject<webGL.MGWebGL>,
                ...props
            },
            JSON.parse(shortCuts as string),
            showShortcutToast,
            shortcutOnHoveredAtom
        )
    }, [molecules, activeMap, hoveredAtom, props.viewOnly, shortCuts, showShortcutToast, shortcutOnHoveredAtom, isChangingRotamers, isRotatingAtoms, isDraggingAtoms])


    return  <>
                <MGWebGL
                    ref={glRef}
                    onAtomHovered={(enableAtomHovering && !isRotatingAtoms && !isDraggingAtoms && !isChangingRotamers) ? props.onAtomHovered : null}
                    onKeyPress={onKeyPress}
                    messageChanged={(d) => { }}
                    mouseSensitivityFactor={mouseSensitivity}
                    zoomWheelSensitivityFactor={zoomWheelSensitivityFactor}
                    keyboardAccelerators={JSON.parse(shortCuts as string)}
                    showCrosshairs={drawCrosshairs}
                    showScaleBar={drawScaleBar}
                    showAxes={drawAxes}
                    showFPS={drawFPS}
                    mapLineWidth={innerMapLineWidth}
                    drawMissingLoops={drawMissingLoops}
                    reContourMapOnlyOnMouseUp={reContourMapOnlyOnMouseUp}
                    drawInteractions={drawInteractions} />

                {showContextMenu &&
                <MoorhenContextMenu 
                    glRef={glRef as React.RefObject<webGL.MGWebGL>}
                    monomerLibraryPath={props.monomerLibraryPath}
                    viewOnly={props.viewOnly}
                    urlPrefix={props.urlPrefix}
                    commandCentre={props.commandCentre}
                    timeCapsuleRef={props.timeCapsuleRef}
                    showContextMenu={showContextMenu}
                    setShowContextMenu={setShowContextMenu}
                    defaultActionButtonSettings={defaultActionButtonSettings}
                    setDefaultActionButtonSettings={setDefaultActionButtonSettings}
                />}
            </>
});

