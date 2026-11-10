import * as mat4 from 'gl-matrix/mat4';
import { useEffect, useRef, useCallback, useState, useMemo } from "react"
import { useDispatch, useSelector, useStore } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { useMoorhenInstance } from "../../InstanceManager";
import { SideOnWebGLView } from '../../WebGLgComponents/sideOnView'
import type { ExternalRenderer } from '../../WebGLgComponents/externalRenderer'
import { sideOnCamera } from '../../WebGPUComponents/sideOnCamera'
import type { PreviewCameraSource } from '../../WebGPUComponents/previewScene'
import { quatToMat4 } from '../../WebGLgComponents/quatToMat4.js';
import {RootState } from '../../store/MoorhenReduxStore';
import { MoorhenStack } from "../interface-base";
import { MoorhenToggle, MoorhenSlider } from "../inputs";
import { Bounds, boundsAround, mapSpan, sceneSpan } from "../../utils/sceneExtent";
import {
    Handle,
    HandleId,
    constrainOffset,
    handleAtPixel,
    offsetOfPixel,
    partnerOf,
    pixelOfHandle,
    plotHalfRange,
} from "../../utils/sceneSliderGeometry";
import { centreOfObject, extentOfObject } from "../../store/threeDObjectsSlice";
import {
    setDepthBlurDepth,
    setDepthBlurRadius,
    setDepthPeelLayers,
    setAutoFog,
    setAutoClip,
    setDoFog,
    setDoClip,
    setUseOffScreenBuffers,
} from "../../store/sceneSettingsSlice";
import {
    setFogStart,
    setFogEnd,
    setClipStart,
    setClipEnd,
} from "../../store";

const getOffsetRect = (elem: HTMLCanvasElement) => {
    const box = elem.getBoundingClientRect()
    const body = document.body
    const docElem = document.documentElement

    const scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop
    const scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft
    const clientTop = docElem.clientTop || body.clientTop || 0
    const clientLeft = docElem.clientLeft || body.clientLeft || 0
    const top  = box.top +  scrollTop - clientTop
    const left = box.left + scrollLeft - clientLeft

    return { top: Math.round(top), left: Math.round(left) }
}

export const MoorhenSlidersSettings = (props: { stackDirection: "horizontal" | "vertical", width?: number }) => {

    const store = useStore<RootState>()
    const dispatch = useDispatch();
    const moorhenInstance = useMoorhenInstance();
    const autoFog = useSelector((state: RootState) => state.sceneSettings.autoFog);
    const autoClip = useSelector((state: RootState) => state.sceneSettings.autoClip);
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers);

    const gl_fog_start = useSelector((state: moorhen.State) => state.sceneSettings.fogStart);
    const gl_fog_end = useSelector((state: moorhen.State) => state.sceneSettings.fogEnd);
    const clipStart = useSelector((state: moorhen.State) => state.sceneSettings.clipStart);
    const clipEnd = useSelector((state: moorhen.State) => state.sceneSettings.clipEnd);
    const blurSize = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurRadius);
    const depthPeelLayers = useSelector((state: moorhen.State) => state.sceneSettings.depthPeelLayers);

    // Scene settings, saved with the scene: turning them off keeps the planes, the renderer just ignores them
    const useFog = useSelector((state: moorhen.State) => state.sceneSettings.doFog);
    const useClip = useSelector((state: moorhen.State) => state.sceneSettings.doClip);

    const blurLabel = <>
             <span style={{display: "inline-block", width:"100px"}}>Depth blur</span>
             <span style={{color: "lightblue", backgroundColor:"#aaaaaa"}}><b>&#x2E3B;</b></span>
         </>

    const clipLabel = <>
             <span style={{display: "inline-block", width:"100px"}}>Clip</span>
             <span style={{color: "red", backgroundColor:"#aaaaaa"}}><b>&#x2E3B;</b></span>
         </>

    const fogLabel = <>
             <span style={{display: "inline-block", width:"100px"}}>Fog</span>
             <span style={{color: "yellow", backgroundColor:"#aaaaaa"}}><b>&#x2E3B;</b></span>
         </>

    /**
     * The width the figure has to fill, measured: the canvases are drawn at a pixel size, so they
     * cannot simply stretch to their container, and no width worked out from the panel's could
     * account for every padding, border and scrollbar between the two. props.width only stands in
     * until the first measurement.
     */
    const [measuredWidth, setMeasuredWidth] = useState<number | null>(null)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)
    const attachFigureContainer = useCallback((element: HTMLDivElement | null) => {
        resizeObserverRef.current?.disconnect()
        resizeObserverRef.current = null
        if (!element) return
        // Whole pixels, rounded down: a canvas a fraction wider than its container overflows it
        const measure = (width: number) => { if (width > 0) setMeasuredWidth(Math.floor(width)) }
        measure(element.clientWidth)
        resizeObserverRef.current = new ResizeObserver(entries => measure(entries[0].contentRect.width))
        resizeObserverRef.current.observe(element)
    }, [])

    const plotWidth = measuredWidth ?? props.width ?? 500
    const plotHeight = Math.round(plotWidth * 0.6)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasRefWebGL = useRef<HTMLCanvasElement>(null)
    /**
     * The scene is drawn on one of two canvases under the handles: this one while WebGPU draws the
     * main view - by the main view's renderer, from what it already holds on the GPU, its maps
     * contoured on the GPU included (ExternalRenderer.drawSecondView) - and canvasRefWebGL, with
     * this widget's own WebGL context and copies of the buffers (SideOnWebGLView), otherwise. A
     * canvas takes one kind of context for good, hence two.
     */
    const canvasRefWebGPU = useRef<HTMLCanvasElement>(null)
    /**
     * The same canvas, held in state so that its arrival triggers a render.
     *
     * The ref is kept because the drawing code reaches for it from callbacks, where a ref is the
     * right tool. What a ref cannot do is tell anything that it has been filled in: the first
     * draw waits for this.
     */
    const [glCanvas, setGlCanvas] = useState<HTMLCanvasElement | null>(null)
    const attachGlCanvas = useCallback((element: HTMLCanvasElement | null) => {
        canvasRefWebGL.current = element
        setGlCanvas(element)
    }, [])

    const spanScaling = 0.75

    // For the scene span below: everything drawn counts towards it, not only the molecules.
    const maps = useSelector((state: moorhen.State) => state.maps);
    const threeDObjects = useSelector((state: moorhen.State) => state.threeDObjects.objects);
    const fogClipOffset = useSelector((state: moorhen.State) => state.sceneSettings.fogClipOffset);
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth);
    const quat = useSelector((state: moorhen.State) => state.glRef.quat)
    const doPerspectiveProjection = useSelector((state: moorhen.State) => state.sceneSettings.doPerspectiveProjection)

    /** The WebGL side-on view, made when WebGL first draws it and let go when the widget is hidden. */
    const sideOnViewRef = useRef<SideOnWebGLView | null>(null);

    const displayBuffers = useSelector((state: moorhen.State) => state.glRef.displayBuffers)
    const storeMolecules = store.getState().molecules.moleculeList
    // Selected, so that moving the origin, or a map's contour settings, draws the view again.
    const originState = useSelector((state: moorhen.State) => state.sceneSettings.origin)
    const mapContourSettings = useSelector((state: moorhen.State) => state.mapContourSettings)

    const [clickX, setClickX] = useState<number>(-1)
    const [clickY, setClickY] = useState<number>(-1)
    const [moveX, setMoveX] = useState<number>(-1)
    const [moveY, setMoveY] = useState<number>(-1)
    const [releaseX, setReleaseX] = useState<number>(-1)
    const [releaseY, setReleaseY] = useState<number>(-1)
    const [mouseHeldDown, setMouseHeldDown] = useState<boolean>(false)

    const [grabbed, setGrabbed] = useState<HandleId | null>(null)

    /**
     * How far this widget's scale has to reach.
     *
     * Everything on screen counts, not only atoms. This used to measure the molecules alone and
     * fall back to 9999 when there were none, so a scene holding a mesh, a primitive or a map
     * got a widget spanning ten thousand angstroms and initial clip distances to match.
     *
     * Maps contribute their unit cell rather than their contour radius - see sceneExtent - so
     * that changing how much of a map is drawn does not move the scale underfoot.
     */
    const atomSpan = useMemo(() => {
        // Accumulated in place rather than collected into an array: a large structure has
        // hundreds of thousands of atoms and this runs whenever the buffers change.
        let haveAtoms = false;
        const min: [number, number, number] = [Infinity, Infinity, Infinity];
        const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

        displayBuffers.forEach(buffer => {
            if (buffer.visible && buffer.atoms) {
                buffer.atoms.forEach(atom => {
                    const p = [atom.x, atom.y, atom.z];
                    if (!p.every(Number.isFinite)) return;
                    haveAtoms = true;
                    for (let i = 0; i < 3; i++) {
                        if (p[i] < min[i]) min[i] = p[i];
                        if (p[i] > max[i]) max[i] = p[i];
                    }
                })
            }
        })

        // Atom coordinates and 3D object centres share a coordinate space, so they go in together
        // and a scene with two things far apart gets a span covering both.
        const positioned: (Bounds | null)[] = [haveAtoms ? { min, max } : null];
        threeDObjects.forEach(obj => {
            positioned.push(boundsAround(centreOfObject(obj), extentOfObject(obj)));
        })

        return sceneSpan({ positioned, sizes: maps.map(mapSpan) })
    }, [displayBuffers, threeDObjects, maps])

    /**
     * Each handle as a signed distance from the view centre, which is the one convention the
     * geometry helpers work in. Clip and fog store their near edge as a positive distance towards
     * the viewer, so those are negated.
     */
    const handles: Handle[] = useMemo(() => [
        { id: "clipStart", offset: -clipStart, visible: useClip },
        { id: "clipEnd", offset: clipEnd, visible: useClip },
        { id: "fogStart", offset: -(fogClipOffset - gl_fog_start), visible: useFog },
        { id: "fogEnd", offset: gl_fog_end - fogClipOffset, visible: useFog },
        { id: "blurDepth", offset: depthBlurDepth, visible: useOffScreenBuffers },
    ], [clipStart, clipEnd, gl_fog_start, gl_fog_end, fogClipOffset, depthBlurDepth, useClip, useFog, useOffScreenBuffers])

    /**
     * Half the plot's extent, in angstroms.
     *
     * The scene span is the floor, not the answer: the range also stretches to contain every
     * visible handle. Handles used to be clamped to the edge when their value fell outside the
     * scene, and because the clamped pixel was then used to hit-test and to guard the drag, two
     * handles off the same end became one unreachable pixel. Fitting the range instead means
     * nothing is ever off the plot, so neither failure has anywhere to happen.
     */
    const plotRange = useMemo(
        () => plotHalfRange(atomSpan * spanScaling, handles),
        [atomSpan, handles])

    /** Where each handle is drawn, by id. */
    const handlePixels = useMemo(() => {
        const pixels = {} as Record<HandleId, number>
        handles.forEach(h => { pixels[h.id] = pixelOfHandle(h, plotRange, plotWidth) })
        return pixels
    }, [handles, plotRange, plotWidth])

    /** The offset a handle must not cross, or null when it has no partner. */
    const partnerOffset = (id: HandleId): number | null => {
        const partner = partnerOf(id)
        if (!partner) return null
        return handles.find(h => h.id === partner)?.offset ?? null
    }

    /** The main view's renderer, if another than WebGL draws it (the WebGPU main view). */
    const externalRenderer = (): { view: PreviewCameraSource; external: ExternalRenderer } | null => {
        const view = moorhenInstance.getVideoRecorderRef()?.current?.glRef?.current as unknown as
            (PreviewCameraSource & { externalRenderer?: ExternalRenderer | null }) | null
        return view?.externalRenderer ? { view, external: view.externalRenderer } : null
    }

    /** The scene from the side, under the handles: by WebGPU when it draws the main view, else by WebGL. */
    const draw3D = (width: number, height: number) => {
        const glCanvasNow = canvasRefWebGL.current
        const gpuCanvas = canvasRefWebGPU.current
        if (!glCanvasNow || !gpuCanvas) return

        const main = externalRenderer()
        const byWebGPU = !!main?.external.drawSecondView?.(gpuCanvas, sideOnCamera(main.view, plotRange, width, height))
        gpuCanvas.style.visibility = byWebGPU ? "visible" : "hidden"
        glCanvasNow.style.visibility = byWebGPU ? "hidden" : "visible"
        if (byWebGPU) return
        main?.external.releaseSecondView?.(gpuCanvas)

        if (!sideOnViewRef.current) {
            const gl = glCanvasNow.getContext("webgl2")
            if (!gl) return
            sideOnViewRef.current = new SideOnWebGLView(gl)
        }

        const pMatrix = mat4.create();
        // plotRange, not the scene span: the 2D overlay is drawn to the same range, and the handles
        // would no longer line up with the molecule behind them if these two disagreed.
        mat4.ortho(pMatrix, -plotRange, plotRange, -plotRange * height/width, plotRange * height/width, 0.1, 1000.0);

        // The main view's turn, then a quarter turn about the vertical: its line of sight runs
        // across this view, the eye on the left (sideOnCamera's SIDE_ON_TURN, for WebGPU).
        const mvMatrix = mat4.create();
        mat4.set(mvMatrix,
            0.0, 0.0, 1.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
           -1.0, 0.0, 0.0, 0.0,
            0.0, 0.0, -100.0, 1.0,
        )
        mat4.multiply(mvMatrix, mvMatrix, quatToMat4(quat));
        mat4.translate(mvMatrix, mvMatrix, originState)

        sideOnViewRef.current.draw(displayBuffers ?? [], pMatrix, mvMatrix, width, height, [0.5, 0.5, 0.5, 1.0])
    }

    const plotTheData = async () => {

        if(!canvasRef)
            return

        if(!canvasRef.current)
            return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")

        const fogStart = fogClipOffset - gl_fog_start
        const fogEnd = gl_fog_end - fogClipOffset

        // No clamping here any more. The range was fitted to these, so they are already on the plot.
        const clipStartPos = handlePixels.clipStart
        const clipEndPos = handlePixels.clipEnd
        const fogStartPos = handlePixels.fogStart
        const fogEndPos = handlePixels.fogEnd
        const depthBlurDepthPos = handlePixels.blurDepth

        ctx.save()

        ctx.clearRect(0,0,canvas.width,canvas.height)
        ctx.fillStyle = "#77777700"
        ctx.fillRect(0,0,canvas.width,canvas.height)
        // Only when clipping is actually on. These two fills sat outside the useFog/useClip tests
        // that gate the handle lines, so switching Clip off left the clipped-out region still
        // shaded - the plot went on showing a slab that was no longer being applied.
        if(useClip){
            ctx.fillStyle = "#00222244"
            ctx.fillRect(0,0,clipStartPos,canvas.height)
            // canvas.width - clipEndPos. It read canvas.width - clipStartPos, so the shaded band
            // started in the right place but ran on past the edge by the width of the near side.
            ctx.fillRect(clipEndPos,0,canvas.width-clipEndPos,canvas.height)
        }

        if(useFog){
            const fogGradient = ctx.createLinearGradient(fogStartPos, 0, fogEndPos, 0)
            fogGradient.addColorStop(0, "#ffffff00");
            fogGradient.addColorStop(1, "#ffffffff");

            ctx.fillStyle = fogGradient
            // Fog is only visible where the slab is, so the band stops at the clip planes - but
            // only when those planes are in force.
            const fogDrawStart = useClip ? Math.max(fogStartPos,clipStartPos) : fogStartPos
            const fogDrawEnd = useClip ? Math.min(fogEndPos,clipEndPos) : fogEndPos
            ctx.fillRect(fogDrawStart,0,fogDrawEnd-fogDrawStart,canvas.height)
        }

        let hovering = false
        let drawText = ""

        canvas.style.cursor = "auto"

        if(useFog){
            if((grabbed===null||grabbed==="fogStart")&&Math.abs(moveX-fogStartPos)<5&&!hovering){
                ctx.strokeStyle = "white"
                ctx.lineWidth = 4
                hovering = true
                drawText = "Front fog " + fogStart.toFixed(2)
            } else {
                ctx.strokeStyle = "yellow"
                ctx.lineWidth = 3
            }
            ctx.beginPath()
            ctx.moveTo(fogStartPos,0)
            ctx.lineTo(fogStartPos,canvas.height)
            ctx.stroke()

            if((grabbed===null||grabbed==="fogEnd")&&Math.abs(moveX-fogEndPos)<5&&!hovering){
                ctx.strokeStyle = "white"
                ctx.lineWidth = 4
                hovering = true
                drawText = "Back fog " + fogEnd.toFixed(2)
            } else {
                ctx.strokeStyle = "yellow"
                ctx.lineWidth = 3
            }
            ctx.beginPath()
            ctx.moveTo(fogEndPos,0)
            ctx.lineTo(fogEndPos,canvas.height)
            ctx.stroke()
        }

        if(useOffScreenBuffers){
            if((grabbed===null||grabbed==="blurDepth")&&Math.abs(moveX-depthBlurDepthPos)<5&&!hovering){
                ctx.strokeStyle = "white"
                ctx.lineWidth = 4
                hovering = true
                drawText = "Blur from " + depthBlurDepth.toFixed(1)
            } else {
                ctx.strokeStyle = "lightblue"
                ctx.lineWidth = 3
            }

            ctx.beginPath()
            ctx.moveTo(depthBlurDepthPos,0)
            ctx.lineTo(depthBlurDepthPos,canvas.height)
            ctx.stroke()
        }

        if(useClip){
            if((grabbed===null||grabbed==="clipStart")&&Math.abs(moveX-clipStartPos)<5&&!hovering){
                ctx.strokeStyle = "white"
                    ctx.lineWidth = 4
                    hovering = true
                    drawText = "Front clip " + clipStart.toFixed(2)
            } else {
                ctx.strokeStyle = "red"
                    ctx.lineWidth = 3
            }
            ctx.beginPath()
                ctx.moveTo(clipStartPos,0)
                ctx.lineTo(clipStartPos,canvas.height)
                ctx.stroke()

                if((grabbed===null||grabbed==="clipEnd")&&Math.abs(moveX-clipEndPos)<5&&!hovering){
                    ctx.strokeStyle = "white"
                        ctx.lineWidth = 4
                        hovering = true
                        drawText = "Back clip " + clipEnd.toFixed(2)
                } else {
                    ctx.strokeStyle = "red"
                        ctx.lineWidth = 3
                }
            ctx.beginPath()
                ctx.moveTo(clipEndPos,0)
                ctx.lineTo(clipEndPos,canvas.height)
                ctx.stroke()
        }

        ctx.fillStyle = "white"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(5, canvas.height/2, 30, -0.7, 0.7)
        ctx.fill()

        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(29,canvas.height/2-20)
        ctx.lineTo(5,canvas.height/2)
        ctx.lineTo(29,canvas.height/2+20)
        ctx.fill()

        ctx.fillStyle = "lightblue"
        ctx.beginPath()
        ctx.arc(5, canvas.height/2, 30, -0.6, 0.6)
        ctx.fill()

        ctx.fillStyle = "black"
        ctx.beginPath()
        ctx.arc(5, canvas.height/2, 30, -0.3, 0.3)
        ctx.fill()

        ctx.strokeStyle = "black"
        ctx.beginPath()
        ctx.moveTo(35,canvas.height/2-25)
        ctx.lineTo(5,canvas.height/2)
        ctx.lineTo(35,canvas.height/2+25)
        ctx.stroke()

        if(drawText.length>0){
            ctx.font = "11pt Arial"
            ctx.fillStyle = "white"
            const tm = ctx.measureText(drawText)
            ctx.fillRect(3,20-tm.actualBoundingBoxDescent-tm.actualBoundingBoxAscent-2,tm.width+4,tm.fontBoundingBoxAscent + tm.fontBoundingBoxDescent+4)
            ctx.fillStyle = "black"
            ctx.fillText(drawText,5,20)
        }

        if(hovering) canvas.style.cursor = "ew-resize"
        ctx.restore()
        draw3D(canvas.width,canvas.height)

    }

    const getXY = (evt) => {
        if(!canvasRef||!canvasRef.current) return

        const canvas = canvasRef.current
        const offset = getOffsetRect(canvas)
        let x: number
        let y: number

        if (evt.pageX || evt.pageY) {
            x = evt.pageX
            y = evt.pageY
        } else {
            x = evt.clientX
            y = evt.clientY
        }
        x -= offset.left
        y -= offset.top

        return [x,y]
    }

    const handleMouseDown = useCallback((evt) => {

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)

        setMouseHeldDown(true)
        // Nearest visible handle, rather than the first one in a fixed order that happened to be
        // within five pixels. Hidden handles are skipped too: fog that has been switched off used
        // to sit at whatever edge its 998/999 clamped to and swallow clicks meant for clip.
        setGrabbed(handleAtPixel(x, handles, plotRange, plotWidth))

        setClickX(x)
        setClickY(y)

    },[handles, plotRange, plotWidth])

    const handleMouseMove = useCallback((evt) => {

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)

        // Without this a release outside the canvas never reaches handleMouseUp, and the handle
        // then follows the pointer around with no button held down.
        if(grabbed && mouseHeldDown){

            if(grabbed === "blurDepth"){
                // A distance, like every other handle. No partner to stay clear of: the focal
                // plane may sit anywhere, including outside the slab, where it simply means
                // everything visible is on one side of it.
                dispatch(setDepthBlurDepth(offsetOfPixel(x, plotRange, plotWidth)))
            } else {
                // Clamp the value, do not gate the dispatch. The old code only dispatched when the
                // pointer was past the partner's drawn pixel, so a partner pinned at the edge of
                // the plot made that test impossible to satisfy and the handle silently froze.
                const partner = partnerOffset(grabbed)
                const wanted = offsetOfPixel(x, plotRange, plotWidth)
                const offset = partner === null
                    ? wanted
                    : constrainOffset(grabbed, wanted, partner, plotRange, plotWidth)

                switch(grabbed){
                    case "clipStart": dispatch(setClipStart(-offset)); break
                    case "clipEnd":   dispatch(setClipEnd(offset)); break
                    case "fogStart":  dispatch(setFogStart(fogClipOffset + offset)); break
                    case "fogEnd":    dispatch(setFogEnd(fogClipOffset + offset)); break
                }
            }
        }

        setMoveX(x)
        setMoveY(y)

    },[grabbed, mouseHeldDown, handles, plotRange, plotWidth, fogClipOffset, dispatch])

    const releaseGrab = useCallback((evt) => {

        setMouseHeldDown(false)
        setGrabbed(null)

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)
        setReleaseX(x)
        setReleaseY(y)

    },[])

    useEffect(() => {

        const canvas = canvasRef.current
        if(!canvas) return

        canvas.addEventListener("mousemove", handleMouseMove , false)
        canvas.addEventListener("mousedown", handleMouseDown , false)
        canvas.addEventListener("mouseup", releaseGrab , false)
        canvas.addEventListener("mouseleave", releaseGrab , false)

        return () => {
            canvas.removeEventListener("mousemove", handleMouseMove)
            canvas.removeEventListener("mousedown", handleMouseDown)
            canvas.removeEventListener("mouseup", releaseGrab)
            canvas.removeEventListener("mouseleave", releaseGrab)
        }

    }, [handleMouseMove, releaseGrab, handleMouseDown])

    // Hidden (the side panel closed or another tab shown) or gone: the copies of the buffers and
    // the second view go too, and are made again when the widget next draws.
    useEffect(() => () => {
        sideOnViewRef.current?.destroy()
        sideOnViewRef.current = null
        if (canvasRefWebGPU.current) externalRenderer()?.external.releaseSecondView?.(canvasRefWebGPU.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // glCanvas is in here so that the first draw happens once the canvas exists and the shader
    // programs have been created: without it this ran only before there was anything to draw
    // into, and the next draw waited on an unrelated change.
    useEffect(() => {
        plotTheData()
    // plotWidth too: resizing a canvas clears it
    }, [glCanvas,plotWidth,atomSpan,plotRange,handles,grabbed,fogClipOffset,gl_fog_start,gl_fog_end,clipStart,clipEnd,depthBlurDepth,canvasRef.current,moveX,moveY,quat,storeMolecules,displayBuffers,originState,mapContourSettings])


    return (
        <>
        <MoorhenStack direction={props.stackDirection} card={true} title="Clip, fog and depth blur">
            <MoorhenStack gap={1} direction="vertical">
                {/* Measured for the figure's width: minWidth 0 so that the figure, before the
                    first measurement, cannot widen what it is measured against */}
                <div ref={attachFigureContainer} style={{ width: "100%", minWidth: 0 }}>
                <figure style={{position: "relative", top: 0, left: 0, width: `${plotWidth}px`, height: `${plotHeight}px`, margin: "0px"}}>
                <canvas style={{position: "absolute", top: 0, left: 0}} height={plotHeight} width={plotWidth} ref={attachGlCanvas}></canvas>
                <canvas style={{position: "absolute", top: 0, left: 0, visibility: "hidden"}} height={plotHeight} width={plotWidth} ref={canvasRefWebGPU}></canvas>
                <canvas style={{position: "absolute", top: 0, left: 0}} height={plotHeight} width={plotWidth} ref={canvasRef}></canvas>
                </figure>
                </div>
            </MoorhenStack>
            <MoorhenStack gap={2} direction="vertical">
                {/* Each on / off, and whether it follows the zoom (only meaningful when on) */}
                <MoorhenToggle
                    type="switch"
                    checked={useFog}
                    onChange={() => dispatch(setDoFog(!useFog))}
                    label={fogLabel}
                />
                <MoorhenToggle
                    type="switch"
                    checked={autoFog}
                    disabled={!useFog}
                    onChange={() => dispatch(setAutoFog(!autoFog))}
                    label="Auto fog (follows the zoom)"
                />
                <MoorhenToggle
                    type="switch"
                    checked={useClip}
                    onChange={() => dispatch(setDoClip(!useClip))}
                    label={clipLabel}
                />
                <MoorhenToggle
                    type="switch"
                    checked={autoClip}
                    disabled={!useClip}
                    onChange={() => dispatch(setAutoClip(!autoClip))}
                    label="Auto clip (follows the zoom)"
                />
                <MoorhenToggle
                    type="switch"
                    checked={useOffScreenBuffers}
                    onChange={() => {
                        dispatch(setUseOffScreenBuffers(!useOffScreenBuffers));
                    }}
                    label={blurLabel}
                />
                <MoorhenSlider
                    isDisabled={!useOffScreenBuffers}
                    minVal={1.0}
                    maxVal={12.0}
                    sliderTitle="Blur size"
                    value={blurSize}
                    setValue={newValue => {
                        dispatch(setDepthBlurRadius(newValue))
                    }}
                    stepButtons={1}
                    decimalPlaces={0}
                />
                <MoorhenSlider
                    minVal={1.0}
                    maxVal={8.0}
                    sliderTitle="Transparency layers"
                    value={depthPeelLayers}
                    setValue={newValue => {
                        dispatch(setDepthPeelLayers(newValue))
                    }}
                    stepButtons={1}
                    decimalPlaces={0}
                />
            </MoorhenStack>
            </MoorhenStack>
        </>
    );
};

// export const MoorhenSceneSlidersModal = () => {
//     const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
//     const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

//     const dispatch = useDispatch();

//     return (
//         <MoorhenDraggableModalBase
//             modalId={modalKeys.SCENE_SLIDERS}
//             left={width / 5}
//             top={height / 6}
//             headerTitle="Fog/clip/blur"
//             minHeight={convertViewtoPx(40, height)}
//             minWidth={convertRemToPx(30)}
//             maxHeight={convertViewtoPx(75, height)}
//             maxWidth={convertRemToPx(60)}
//             enforceMaxBodyDimensions={true}
//             body={<MoorhenSlidersSettings stackDirection="vertical" />}
//             footer={null}
//             additionalHeaderButtons={[
//                 <Tooltip title={"Move to side panel"} key={1}>
//                     <Button
//                         variant="white"
//                         style={{ margin: "0.1rem", padding: "0.1rem" }}
//                         onClick={() => {
//                             dispatch(hideModal(modalKeys.SCENE_SLIDERS));
//                             enqueueSnackbar(modalKeys.SCENE_SLIDERS, {
//                                 variant: "sideBar",
//                                 persist: true,
//                                 anchorOrigin: { horizontal: "right", vertical: "bottom" },
//                                 title: "Scene settings",
//                                 modalId: modalKeys.SCENE_SLIDERS,
//                                 children: (
//                                     <div style={{ overflowY: "scroll", overflowX: "hidden", maxHeight: "50vh" }}>
//                                         <MoorhenSlidersSettings stackDirection="vertical" />
//                                     </div>
//                                 ),
//                             });
//                         }}
//                     >
//                         <LastPageOutlined />
//                     </Button>
//                 </Tooltip>,
//             ]}
//         />
//     );
// };
