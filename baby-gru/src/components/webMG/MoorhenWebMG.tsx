import { useEffect, useCallback, forwardRef, useState, useReducer } from 'react';
import { MGWebGL } from '../../WebGLgComponents/mgWebGL';
import { Moorhen2DOverlay } from './Moorhen2DOverlay';
import { MoorhenContextMenu } from "../context-menu/MoorhenContextMenu"
import { cidToSpec } from '../../utils/utils';
import { MoorhenScreenRecorder } from "../../utils/MoorhenScreenRecorder"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from 'react-redux';
import { moorhenKeyPress } from '../../utils/MoorhenKeyboardPress';
import { useSnackbar } from 'notistack';
import { setQuat, setOrigin, setRequestDrawScene, setRequestBuildBuffers, setZoom,
         setClipStart, setClipEnd, setFogStart, setFogEnd, setCursorPosition } from "../../store/glRefSlice"

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
    const drawAxes = useSelector((state: moorhen.State) => state.sceneSettings.drawAxes)
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
    const doAnaglyphStereo = useSelector((state: moorhen.State) => state.sceneSettings.doAnaglyphStereo)
    const doCrossEyedStereo = useSelector((state: moorhen.State) => state.sceneSettings.doCrossEyedStereo)
    const doSideBySideStereo = useSelector((state: moorhen.State) => state.sceneSettings.doSideBySideStereo)
    const doThreeWayView = useSelector((state: moorhen.State) => state.sceneSettings.doThreeWayView)
    const multiViewRows = useSelector((state: moorhen.State) => state.sceneSettings.multiViewRows)
    const multiViewColumns = useSelector((state: moorhen.State) => state.sceneSettings.multiViewColumns)
    const threeWayViewOrder = useSelector((state: moorhen.State) => state.sceneSettings.threeWayViewOrder)
    const specifyMultiViewRowsColumns = useSelector((state: moorhen.State) => state.sceneSettings.specifyMultiViewRowsColumns)
    const doMultiView = useSelector((state: moorhen.State) => state.sceneSettings.doMultiView)
    const drawEnvBOcc = useSelector((state: moorhen.State) => state.sceneSettings.drawEnvBOcc)
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
    const requestDrawScene = useSelector((state: moorhen.State) => state.glRef.requestDrawScene)
    const requestBuildBuffers = useSelector((state: moorhen.State) => state.glRef.requestBuildBuffers)
    const originState = useSelector((state: moorhen.State) => state.glRef.origin)
    const activeMolecule = useSelector((state: moorhen.State) => state.glRef.activeMolecule)
    const draggableMolecule = useSelector((state: moorhen.State) => state.glRef.draggableMolecule)

    const lightPosition = useSelector((state: moorhen.State) => state.glRef.lightPosition)
    const ambient = useSelector((state: moorhen.State) => state.glRef.ambient)
    const specular = useSelector((state: moorhen.State) => state.glRef.specular)
    const diffuse = useSelector((state: moorhen.State) => state.glRef.diffuse)
    const specularPower = useSelector((state: moorhen.State) => state.glRef.specularPower)
    const zoom = useSelector((state: moorhen.State) => state.glRef.zoom)
    const quat = useSelector((state: moorhen.State) => state.glRef.quat)
    const fogClipOffset = useSelector((state: moorhen.State) => state.glRef.fogClipOffset)
    const fogStart = useSelector((state: moorhen.State) => state.glRef.fogStart)
    const fogEnd = useSelector((state: moorhen.State) => state.glRef.fogEnd)
    const clipStart = useSelector((state: moorhen.State) => state.glRef.clipStart)
    const clipEnd = useSelector((state: moorhen.State) => state.glRef.clipEnd)
    const updateSwitch = useSelector((state: moorhen.State) => state.glRef.envUpdate.switch)
    const clearLabelsSwitch = useSelector((state: moorhen.State) => state.glRef.clearLabels.switch)
    const labelBuffers = useSelector((state: moorhen.State) => state.glRef.labelBuffers)

    const GLLabelsFontFamily = useSelector((state: moorhen.State) => state.labelSettings.GLLabelsFontFamily)
    const GLLabelsFontSize = useSelector((state: moorhen.State) => state.labelSettings.GLLabelsFontSize)

    const setClipFogByZoom = (): void => {
        const fieldDepthFront: number = 8;
        const fieldDepthBack: number = 21;
        if (glRef !== null && typeof glRef !== 'function') { 
            dispatch(setFogStart(glRef.current.fogClipOffset - (glRef.current.zoom * fieldDepthFront)))
            dispatch(setFogEnd(glRef.current.fogClipOffset + (glRef.current.zoom * fieldDepthBack)))
            dispatch(setClipStart(glRef.current.zoom * fieldDepthFront))
            dispatch(setClipEnd(glRef.current.zoom * fieldDepthBack))
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
            if(Math.abs(quat[0]-glRef.current.myQuat[0])>1e-5||Math.abs(quat[1]-glRef.current.myQuat[1])>1e-5||Math.abs(quat[2]-glRef.current.myQuat[2])>1e-5||Math.abs(quat[3]-glRef.current.myQuat[3])>1e-5){
                glRef.current.setQuat(quat)
                glRef.current.drawScene()
            }
        }
    }, [quat])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            if(Math.abs(zoom-glRef.current.zoom)>1e-5){
                glRef.current.setZoom(zoom)
                glRef.current.drawScene()
            }
        }
    }, [zoom])

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
            if(Math.abs(originState[0]-glRef.current.origin[0])>1e-5||Math.abs(originState[1]-glRef.current.origin[1])>1e-5||Math.abs(originState[2]-glRef.current.origin[2])>1e-5){
                glRef.current.setOrigin(originState,false,true)
            }
        }
    }, [originState])

    /*
    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.drawScene()
        }
        dispatch(setRequestDrawScene(false))
    }, [requestDrawScene])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.buildBuffers()
            glRef.current.drawScene()
        }
        dispatch(setRequestBuildBuffers(false))
    }, [requestBuildBuffers])
    */

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
            glRef.current.setDrawEnvBOcc(drawEnvBOcc)
            glRef.current.handleOriginUpdated(false)
            glRef.current.drawScene()
        }
    }, [drawEnvBOcc])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setThreeWayViewOrder(threeWayViewOrder)
            glRef.current.setupThreeWayTransformations()
            glRef.current.drawScene()
        }
    }, [threeWayViewOrder])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setMultiViewRowsColumns([multiViewRows,multiViewColumns])
            glRef.current.setSpecifyMultiViewRowsColumns(specifyMultiViewRowsColumns)
            glRef.current.drawScene()
        }
    }, [multiViewRows,multiViewColumns,specifyMultiViewRowsColumns])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setDoThreeWayView(doThreeWayView)
            glRef.current.drawScene()
        }
    }, [doThreeWayView])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setDoSideBySideStereo(doSideBySideStereo)
            glRef.current.drawScene()
        }
    }, [doSideBySideStereo])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setDoMultiView(doMultiView)
            glRef.current.drawScene()
        }
    }, [doMultiView])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setDoCrossEyedStereo(doCrossEyedStereo)
            glRef.current.drawScene()
        }
    }, [doCrossEyedStereo])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setDoAnaglyphStereo(doAnaglyphStereo)
            glRef.current.drawScene()
        }
    }, [doAnaglyphStereo])

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
            glRef.current.setAmbientLightNoUpdate(ambient[0],ambient[1],ambient[2])
            glRef.current.setSpecularLightNoUpdate(specular[0],specular[1],specular[2])
            glRef.current.setDiffuseLightNoUpdate(diffuse[0],diffuse[1],diffuse[2])
            glRef.current.setLightPositionNoUpdate(lightPosition[0],lightPosition[1],lightPosition[2])
            glRef.current.setSpecularPowerNoUpdate(specularPower)
            setClipFogByZoom()
            glRef.current.resize(width, height)
            glRef.current.drawScene()
        }
    }, [])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.setLightPositionNoUpdate(lightPosition[0],lightPosition[1],lightPosition[2])
            glRef.current.drawScene()
        }
    }, [lightPosition])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.setAmbientLightNoUpdate(ambient[0],ambient[1],ambient[2])
            glRef.current.drawScene()
        }
    }, [ambient])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSpecularLightNoUpdate(specular[0],specular[1],specular[2])
            glRef.current.drawScene()
        }
    }, [specular])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.setDiffuseLightNoUpdate(diffuse[0],diffuse[1],diffuse[2])
            glRef.current.drawScene()
        }
    }, [diffuse])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSpecularPowerNoUpdate(specularPower)
            glRef.current.drawScene()
        }
    }, [specularPower])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.setDraggableMolecule(draggableMolecule)
            glRef.current.drawScene()
        }
    }, [draggableMolecule])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.setActiveMolecule(activeMolecule)
            glRef.current.drawScene()
        }
    }, [activeMolecule])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.resize(width, height)
            glRef.current.drawScene()
        }
    }, [width,height])

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
             glRef.current.labelsTextCanvasTexture.clearBigTexture()
            labelBuffers.forEach(lab => {
                glRef.current.labelsTextCanvasTexture.addBigTextureTextImage(lab.label,lab.uuid)
            })
            glRef.current.labelsTextCanvasTexture.recreateBigTextureBuffers()
            glRef.current.drawScene()
        }
    }, [labelBuffers, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.set_clip_range(-clipStart, clipEnd)
            glRef.current.drawScene()
        }
    }, [clipStart, clipEnd, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.set_fog_range(fogStart, fogEnd)
            glRef.current.drawScene()
        }
    }, [fogStart, fogEnd, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.setFogClipOffset(fogClipOffset)
            glRef.current.drawScene()
        }
    }, [fogClipOffset, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.setBackground(backgroundColor)
        }
    }, [backgroundColor, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.labelledAtoms = []
            glRef.current.measuredAtoms = []
            glRef.current.measurePointsArray = []
            glRef.current.clearMeasureCylinderBuffers()
            glRef.current.drawScene()
        }
    }, [clearLabelsSwitch])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.setTextFont(GLLabelsFontFamily, GLLabelsFontSize)
            glRef.current.drawScene()
        }
    }, [GLLabelsFontSize, GLLabelsFontFamily])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.handleOriginUpdated(false)
            glRef.current.drawScene()
        }
    }, [updateSwitch])

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


    const onZoomChanged = (newZoom => {
        dispatch(setZoom(newZoom))
    })

    const onOriginChanged = (newOrigin => {
        dispatch(setOrigin(newOrigin))
    })

    const onQuatChanged = (newQuat => {
        dispatch(setQuat(newQuat))
    })

    const cursorPositionChanged = ((x,y) => {
        dispatch(setCursorPosition([x,y]))
    })

    return  <>
                <figure style={{position: "relative"}}>
                <MGWebGL
                    ref={glRef}
                    onAtomHovered={(enableAtomHovering && !isRotatingAtoms && !isDraggingAtoms && !isChangingRotamers) ? props.onAtomHovered : null}
                    onKeyPress={onKeyPress}
                    onZoomChanged={onZoomChanged}
                    onOriginChanged={onOriginChanged}
                    onQuatChanged={onQuatChanged}
                    cursorPositionChanged={cursorPositionChanged}
                    messageChanged={(d) => { }}
                    mouseSensitivityFactor={mouseSensitivity}
                    zoomWheelSensitivityFactor={zoomWheelSensitivityFactor}
                    keyboardAccelerators={JSON.parse(shortCuts as string)}
                    showCrosshairs={drawCrosshairs}
                    showScaleBar={drawScaleBar}
                    showAxes={drawAxes}
                    showFPS={drawFPS}
                    mapLineWidth={innerMapLineWidth}
                    reContourMapOnlyOnMouseUp={reContourMapOnlyOnMouseUp}/>
                    <Moorhen2DOverlay/>;
                </figure>

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

