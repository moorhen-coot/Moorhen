import { useEffect, useCallback, forwardRef, useState, useReducer, useRef, createRef } from 'react';
import { MGWebGL } from '../../WebGLgComponents/mgWebGL';
import { MoorhenContextMenu } from "../context-menu/MoorhenContextMenu"
import { cidToSpec } from '../../utils/utils';
import { MoorhenScreenRecorder } from "../../utils/MoorhenScreenRecorder"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from 'react-redux';
import { moorhenKeyPress } from '../../utils/MoorhenKeyboardPress';
import { useSnackbar } from 'notistack';
import { addImageOverlay, addTextOverlay, addSvgPathOverlay, addFracPathOverlay, emptyOverlays } from "../../store/overlaysSlice";

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

    const imageOverlays = useSelector((state: moorhen.State) => state.overlays.imageOverlayList)
    const textOverlays = useSelector((state: moorhen.State) => state.overlays.textOverlayList)
    const svgPathOverlays = useSelector((state: moorhen.State) => state.overlays.svgPathOverlayList)
    const fracPathOverlays = useSelector((state: moorhen.State) => state.overlays.fracPathOverlayList)

    const canvas2DRef = useRef<HTMLCanvasElement>(null);
    let canvas2D_ctx = null

    const [images, setImages] = useState<ImageFrac2D[]>([]);

    interface ImageFrac2D {
        x: number
        y: number
        width: number
        height: number
        img: HTMLImageElement
    }

    useEffect(() => {
        const new_images = []
        imageOverlays.forEach(imgSrc => {
            const img = new window.Image()
            img.src = imgSrc.src
            img.crossOrigin = "Anonymous";
            const img_frac:ImageFrac2D = {x:imgSrc.x,y:imgSrc.y,img,width:imgSrc.width,height:imgSrc.height}
            new_images.push(img_frac)
        })
        setImages(new_images)
        
    }, [imageOverlays])

    // This is a bunch of examples of adding images (bitmap or svg), legends, paths in fractional coords on
    // a canvas layed over the top of the GL widget. SVG Paths are also supported, these are in absolute rather
    // fractional coords.
    const drawExampleOverlays = () => {
        dispatch(emptyOverlays())
        canvas2D_ctx = canvas2DRef.current.getContext("2d", { alpha: true });
        dispatch(addImageOverlay({src:`${props.urlPrefix}/pixmaps/axes_xyz.svg`,x:0.25,y:0.75,width:100,height:100}))
        dispatch(addImageOverlay({src:`${props.urlPrefix}/pixmaps/axes_xyz.svg`,x:0.25,y:0.25,width:100,height:100}))
        dispatch(addTextOverlay({text:"Red text",x:0.15,y:0.5,font:"108px serif",fillStyle:"red"}))
        dispatch(addTextOverlay({text:"Text",x:0.15,y:0.75,font:"48px serif"}))
        dispatch(addTextOverlay({text:"Stroke text",x:0.65,y:0.75,font:"48px serif",drawStyle:"stroke",strokeStyle:"blue"}))
        dispatch(addSvgPathOverlay({path:"M10 10 h 80 v 80 h -80 Z",drawStyle:"stroke",strokeStyle:"magenta"}))
        dispatch(addSvgPathOverlay({path:"M100 10 h 80 v 80 h -80 Z",drawStyle:"fill",fillStyle:"orange"}))
        dispatch(addFracPathOverlay({path:[[0.7,0.5],[0.8,0.9],[0.6,0.7],[0.7,0.5]],drawStyle:"fill",fillStyle:"#00ffff77"}))
        const gradientStops = []
        gradientStops.push([0, "red"]);
        gradientStops.push([0.35, "yellow"]);
        gradientStops.push([0.5, "green"]);
        gradientStops.push([0.65, "cyan"]);
        gradientStops.push([0.8, "blue"]);
        gradientStops.push([1.0, "purple"]);
        dispatch(addSvgPathOverlay({path:"M190 10 h 480 v 80 h -480 Z",gradientStops,gradientBoundary:[190,0,670,0],drawStyle:"gradient"}))
        dispatch(addSvgPathOverlay({path:"M10 100 v 480 h 80 v -480 Z",gradientStops,gradientBoundary:[0,100,0,580],drawStyle:"gradient"}))
        dispatch(addFracPathOverlay({path:[[0.0,0.0],[1.0,1.0]],drawStyle:"stroke"}))
        dispatch(addFracPathOverlay({path:[[0.2,0.5],[0.3,0.9],[0.1,0.7],[0.2,0.5]],gradientStops,gradientBoundary:[0.1,0,0.3,0],drawStyle:"gradient"}))
    }

   /*
    useEffect(() => {
        drawExampleOverlays()
    }, [])
    */

    const setClipFogByZoom = (): void => {
        const fieldDepthFront: number = 8;
        const fieldDepthBack: number = 21;
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.set_fog_range(glRef.current.fogClipOffset - (glRef.current.zoom * fieldDepthFront), glRef.current.fogClipOffset + (glRef.current.zoom * fieldDepthBack))
            glRef.current.set_clip_range(0 - (glRef.current.zoom * fieldDepthFront), 0 + (glRef.current.zoom * fieldDepthBack))
            glRef.current.doDrawClickedAtomLines = false
        }
    }

    const draw2D = () => {
        let canvas2D_ctx = canvas2DRef.current.getContext("2d", { alpha: true });
        if(!canvas2DRef.current) return
        canvas2DRef.current.width = width
        canvas2DRef.current.height = height

        canvas2D_ctx.clearRect(0,0,canvas2DRef.current.width,canvas2DRef.current.height)

        const bright_y = backgroundColor[0] * 0.299 + backgroundColor[1] * 0.587 + backgroundColor[2] * 0.114;
        textOverlays.forEach(t => {
            canvas2D_ctx.font = t.font;
            if(t.drawStyle==="stroke"){
                if(t.strokeStyle){
                    canvas2D_ctx.strokeStyle = t.strokeStyle
                } else {
                    if(bright_y<0.5)
                        canvas2D_ctx.strokeStyle = "white"
                    else
                        canvas2D_ctx.strokeStyle = "black"
                }
                canvas2D_ctx.strokeText(t.text,t.x*canvas2DRef.current.width,t.y*canvas2DRef.current.height)
            } else {
                if(t.fillStyle){
                    canvas2D_ctx.fillStyle = t.fillStyle
                } else {
                    if(bright_y<0.5)
                        canvas2D_ctx.fillStyle = "white"
                    else
                        canvas2D_ctx.fillStyle = "black"
                }
                canvas2D_ctx.fillText(t.text,t.x*canvas2DRef.current.width,t.y*canvas2DRef.current.height)
            }
        })

        svgPathOverlays.forEach(t => {
            let p = new Path2D(t.path);
            if(t.drawStyle==="stroke"){
                if(t.strokeStyle){
                    canvas2D_ctx.strokeStyle = t.strokeStyle
                } else {
                    if(bright_y<0.5)
                        canvas2D_ctx.strokeStyle = "white"
                    else
                        canvas2D_ctx.strokeStyle = "black"
                }
                canvas2D_ctx.stroke(p)
            } else {
                if(t.fillStyle&&t.drawStyle!=="gradient"){
                    canvas2D_ctx.fillStyle = t.fillStyle
                } else if(t.drawStyle==="gradient"){
                    const grad_x0 = t.gradientBoundary[0]
                    const grad_y0 = t.gradientBoundary[1]
                    const grad_x1 = t.gradientBoundary[2]
                    const grad_y1 = t.gradientBoundary[3]
                    const grad=canvas2D_ctx.createLinearGradient(grad_x0,grad_y0,grad_x1,grad_y1);
                    t.gradientStops.forEach(stop => {
                        grad.addColorStop(stop[0], stop[1]);
                    })
                    canvas2D_ctx.fillStyle = grad
                } else {
                    if(bright_y<0.5)
                        canvas2D_ctx.fillStyle = "white"
                    else
                        canvas2D_ctx.fillStyle = "black"
                }
                canvas2D_ctx.fill(p)
            }
        })
        images.forEach(img => {
            if(img.img){
               canvas2D_ctx.drawImage(img.img,canvas2DRef.current.width*img.x,canvas2DRef.current.height*img.y,img.width,img.height)
            }
        })

        fracPathOverlays.forEach(t => {
            canvas2D_ctx.beginPath()
            if(t.drawStyle==="stroke"){
                if(t.strokeStyle){
                    canvas2D_ctx.strokeStyle = t.strokeStyle
                } else {
                    if(bright_y<0.5)
                        canvas2D_ctx.strokeStyle = "white"
                    else
                        canvas2D_ctx.strokeStyle = "black"
                }
            } else {
                if(t.fillStyle&&t.drawStyle!=="gradient"){
                    canvas2D_ctx.fillStyle = t.fillStyle
                } else if(t.drawStyle==="gradient"){
                    const grad_x0 = canvas2DRef.current.width*t.gradientBoundary[0]
                    const grad_y0 = canvas2DRef.current.height*t.gradientBoundary[1]
                    const grad_x1 = canvas2DRef.current.width*t.gradientBoundary[2]
                    const grad_y1 = canvas2DRef.current.height*t.gradientBoundary[3]
                    const grad=canvas2D_ctx.createLinearGradient(grad_x0,grad_y0,grad_x1,grad_y1);
                    t.gradientStops.forEach(stop => {
                        grad.addColorStop(stop[0], stop[1]);
                    })
                    canvas2D_ctx.fillStyle = grad
                } else {
                    if(bright_y<0.5)
                        canvas2D_ctx.fillStyle = "white"
                    else
                        canvas2D_ctx.fillStyle = "black"
                }
            }
            canvas2D_ctx.moveTo(canvas2DRef.current.width*t.path[0][0],canvas2DRef.current.height*t.path[0][1])
            for(let i=0;i<t.path.length;i++){
                canvas2D_ctx.lineTo(canvas2DRef.current.width*t.path[i][0],canvas2DRef.current.height*t.path[i][1])
            }
            if(t.drawStyle==="stroke"){
                canvas2D_ctx.stroke()
            } else {
                canvas2D_ctx.fill()
            }
        })
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
        draw2D()
    }, [glRef,draw2D,textOverlays,imageOverlays])

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
                <figure style={{position: "relative"}}>
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
                    reContourMapOnlyOnMouseUp={reContourMapOnlyOnMouseUp}/>
                    <canvas style={{pointerEvents: "none", position: "absolute", top: 0, left:0}} ref={canvas2DRef} height={width} width={height} />;
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

