import { useEffect, useRef, useCallback, useState } from "react"
import { useDispatch, useSelector } from "react-redux";
import { Button, Form, InputGroup, Stack } from "react-bootstrap";
import { Tooltip } from "@mui/material";
import { useSnackbar } from "notistack";
import { LastPageOutlined } from "@mui/icons-material";
import { moorhen } from "../../types/moorhen";
import { MoorhenReduxStore as store } from '../../store/MoorhenReduxStore'
import {
    setClipCap,
    setDepthBlurDepth,
    setDepthBlurRadius,
    setResetClippingFogging,
    setUseOffScreenBuffers,
} from "../../store/sceneSettingsSlice";
import { MoorhenSlider } from "../inputs";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { modalKeys } from "../../utils/enums";
import { hideModal } from "../../store/modalsSlice";
import {
    setFogStart,
    setFogEnd,
    setClipStart,
    setClipEnd,
} from "../../store/glRefSlice";
import { usePaths } from "../../InstanceManager";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";

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
                setExternalValue={(val) => dispatch(setDepthBlurDepth(val))}
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
                setExternalValue={(val) => dispatch(setDepthBlurRadius(val))}
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
                setExternalValue={(newValue) => {
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
                setExternalValue={(newValue) => {
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
                setExternalValue={(newValue) => {
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
                setExternalValue={(newValue) => {
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

enum GrabHandle
{
 NONE,
 CLIP_START,
 CLIP_END,
 FOG_START,
 FOG_END,
 BLUR_DEPTH,
}

const MoorhenSlidersSettings = (props: { stackDirection: "horizontal" | "vertical" }) => {

    const dispatch = useDispatch();

    const isWebGL2 = useSelector((state: moorhen.State) => state.glRef.isWebGL2);
    const plotWidth = 450
    const plotHeight = 200
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const fogClipOffset = useSelector((state: moorhen.State) => state.glRef.fogClipOffset);
    const gl_fog_start = useSelector((state: moorhen.State) => state.glRef.fogStart);
    const gl_fog_end = useSelector((state: moorhen.State) => state.glRef.fogEnd);
    const clipStart = useSelector((state: moorhen.State) => state.glRef.clipStart);
    const clipEnd = useSelector((state: moorhen.State) => state.glRef.clipEnd);
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth);

    const imageRef = useRef<null | HTMLImageElement>(null);

    const urlPrefix = usePaths().urlPrefix;

    const displayBuffers = store.getState().glRef.displayBuffers

    const [clickX, setClickX] = useState<number>(-1)
    const [clickY, setClickY] = useState<number>(-1)
    const [moveX, setMoveX] = useState<number>(-1)
    const [moveY, setMoveY] = useState<number>(-1)
    const [releaseX, setReleaseX] = useState<number>(-1)
    const [releaseY, setReleaseY] = useState<number>(-1)
    const [mouseHeldDown, setMouseHeldDown] = useState<boolean>(false)

    const [grabbed, setGrabbed] = useState<GrabHandle>(GrabHandle.NONE)

        let min_x =  1e5;
        let max_x = -1e5;
        let min_y =  1e5;
        let max_y = -1e5;
        let min_z =  1e5;
        let max_z = -1e5;
        let haveAtoms = false;

        displayBuffers.forEach(buffer => {
            if (buffer.visible) {
                if(buffer.atoms&&buffer.atoms.length>1)
                    haveAtoms = true
                buffer.atoms.forEach(atom => {
                    if(atom.x>max_x) max_x = atom.x;
                    if(atom.x<min_x) min_x = atom.x;
                    if(atom.y>max_y) max_y = atom.y;
                    if(atom.y<min_y) min_y = atom.y;
                    if(atom.z>max_z) max_z = atom.z;
                    if(atom.z<min_z) min_z = atom.z;
                })
            }
        })

        let atom_span = 2000.0
        if(haveAtoms)
            atom_span = Math.sqrt((max_x - min_x) * (max_x - min_x) + (max_y - min_y) * (max_y - min_y) +(max_z - min_z) * (max_z - min_z));

    const plotTheData = async () => {
        if(!canvasRef)
            return

        if(!(canvasRef.current))
            return

        if(!imageRef.current||!imageRef.current.complete) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")

        const scale = atom_span * 1.5

        const fogStart = fogClipOffset - gl_fog_start
        const fogEnd = gl_fog_end - fogClipOffset
        const clipStartPos = plotWidth * .5 - clipStart / scale * plotWidth * .5
        const clipEndPos = plotWidth * .5 + clipEnd / scale * plotWidth * .5
        const fogStartPos = plotWidth * .5 - fogStart / scale * plotWidth * .5
        const fogEndPos = plotWidth * .5 + fogEnd / scale * plotWidth * .5
        const depthBlurDepthPos = depthBlurDepth * plotWidth

        ctx.save()
        ctx.clearRect(0,0,canvas.width,canvas.height)
        ctx.fillStyle = "grey"
        ctx.fillRect(0,0,canvas.width,canvas.height)

        const imgSize = canvasRef.current.height * atom_span/scale

        if(imageRef.current&&imageRef.current.complete&&haveAtoms) {
            ctx.drawImage(imageRef.current, canvasRef.current.width/2-imgSize/2, canvasRef.current.height/2-imgSize/2, imgSize, imgSize);
        }

        let hovering = false
        let drawText = ""

        if((grabbed===GrabHandle.NONE||grabbed===GrabHandle.CLIP_START)&&Math.abs(moveX-clipStartPos)<5){
            ctx.strokeStyle = "white"
            ctx.lineWidth = 4
            hovering = true
            drawText = "Front clip"
        } else {
            ctx.strokeStyle = "red"
            ctx.lineWidth = 3
        }
        ctx.beginPath()
        ctx.moveTo(clipStartPos,0)
        ctx.lineTo(clipStartPos,canvas.height)
        ctx.stroke()

        if((grabbed===GrabHandle.NONE||grabbed===GrabHandle.CLIP_END)&&Math.abs(moveX-clipEndPos)<5&&!hovering){
            ctx.strokeStyle = "white"
            ctx.lineWidth = 4
            hovering = true
            drawText = "Back clip"
        } else {
            ctx.strokeStyle = "red"
            ctx.lineWidth = 3
        }
        ctx.beginPath()
        ctx.moveTo(clipEndPos,0)
        ctx.lineTo(clipEndPos,canvas.height)
        ctx.stroke()

        if((grabbed===GrabHandle.NONE||grabbed===GrabHandle.FOG_START)&&Math.abs(moveX-fogStartPos)<5&&!hovering){
            ctx.strokeStyle = "white"
            ctx.lineWidth = 4
            hovering = true
            drawText = "Front fog"
        } else {
            ctx.strokeStyle = "yellow"
            ctx.lineWidth = 3
        }
        ctx.beginPath()
        ctx.moveTo(fogStartPos,0)
        ctx.lineTo(fogStartPos,canvas.height)
        ctx.stroke()

        if((grabbed===GrabHandle.NONE||grabbed===GrabHandle.FOG_END)&&Math.abs(moveX-fogEndPos)<5&&!hovering){
            ctx.strokeStyle = "white"
            ctx.lineWidth = 4
            hovering = true
            drawText = "Back fog"
        } else {
            ctx.strokeStyle = "yellow"
            ctx.lineWidth = 3
        }
        ctx.beginPath()
        ctx.moveTo(fogEndPos,0)
        ctx.lineTo(fogEndPos,canvas.height)
        ctx.stroke()

        if((grabbed===GrabHandle.NONE||grabbed===GrabHandle.BLUR_DEPTH)&&Math.abs(moveX-depthBlurDepthPos)<5&&!hovering){
            ctx.strokeStyle = "white"
            ctx.lineWidth = 4
            hovering = true
            drawText = "Blur depth"
        } else {
            ctx.strokeStyle = "lightblue"
            ctx.lineWidth = 3
        }
        ctx.beginPath()
        ctx.moveTo(depthBlurDepthPos,0)
        ctx.lineTo(depthBlurDepthPos,canvas.height)
        ctx.stroke()

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
        ctx.fillStyle = "black"
            ctx.font = "11pt Arial"
            ctx.fillText(drawText,5,20)
        }

        ctx.restore()
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

    const handleMouseDown = (evt) => {

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)

        setMouseHeldDown(true)

        const scale = atom_span * 1.5

        const fogStart = fogClipOffset - gl_fog_start
        const fogEnd = gl_fog_end - fogClipOffset
        const clipStartPos = plotWidth * .5 - clipStart / scale * plotWidth * .5
        const clipEndPos = plotWidth * .5 + clipEnd / scale * plotWidth * .5
        const fogStartPos = plotWidth * .5 - fogStart / scale * plotWidth * .5
        const fogEndPos = plotWidth * .5 + fogEnd / scale * plotWidth * .5
        const depthBlurDepthPos = depthBlurDepth * plotWidth

        if(Math.abs(x-clipStartPos)<5){
            setGrabbed(GrabHandle.CLIP_START)
        } else if(Math.abs(x-clipEndPos)<5){
            setGrabbed(GrabHandle.CLIP_END)
        } else if(Math.abs(x-fogStartPos)<5){
            setGrabbed(GrabHandle.FOG_START)
        } else if(Math.abs(x-fogEndPos)<5){
            setGrabbed(GrabHandle.FOG_END)
        } else if(Math.abs(x-depthBlurDepthPos)<5){
            setGrabbed(GrabHandle.BLUR_DEPTH)
        } else {
            setGrabbed(GrabHandle.NONE)
        }

        setClickX(x)
        setClickY(y)

    }

    const handleMouseMove = useCallback((evt) => {

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)

        const scale = atom_span * 1.5

        if(grabbed===GrabHandle.CLIP_START){
            const newValue = (plotWidth * 0.5 - x) * scale / plotWidth / 0.5
            dispatch(setClipStart(newValue))
        } else if(grabbed===GrabHandle.CLIP_END){
            const newValue = (x - plotWidth * 0.5) * scale / plotWidth / 0.5
            dispatch(setClipEnd(newValue))
        } else if(grabbed===GrabHandle.FOG_START){
            const newValue = (plotWidth * 0.5 -x) * scale / plotWidth / 0.5
            dispatch(setFogStart(fogClipOffset - newValue));
        } else if(grabbed===GrabHandle.FOG_END){
            const newValue = (x - plotWidth * 0.5) * scale / plotWidth / 0.5
            dispatch(setFogEnd(newValue + fogClipOffset))
        } else if(grabbed===GrabHandle.BLUR_DEPTH){
            const newValue = x / plotWidth
            dispatch(setDepthBlurDepth(newValue))
        }

        setMoveX(x)
        setMoveY(y)

    },[mouseHeldDown,clickX,clickY,releaseX,releaseY])

    const handleMouseUp = useCallback(async(evt) => {

        setMouseHeldDown(false)

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)
        setReleaseX(x)
        setReleaseY(y)
        setGrabbed(GrabHandle.NONE)

    },[clickX,clickY,releaseX,releaseY])

    useEffect(() => {

        canvasRef.current.addEventListener("mousemove", handleMouseMove , false)
        canvasRef.current.addEventListener("mousedown", handleMouseDown , false)
        canvasRef.current.addEventListener("mouseup", handleMouseUp , false)

        return () => {
            if (canvasRef.current !== null) {
                canvasRef.current.removeEventListener("mousemove", handleMouseMove)
                canvasRef.current.removeEventListener("mousedown", handleMouseDown)
                canvasRef.current.removeEventListener("mouseup", handleMouseUp)
            }
        }

    }, [canvasRef, handleMouseMove,handleMouseUp,handleMouseDown])

    useEffect(() => {
        const img = new window.Image();
        img.src = `${urlPrefix}/pixmaps/molecule_cartoon.png`;
        img.crossOrigin = "Anonymous";
        imageRef.current = img;
        img.onload = plotTheData
    }, [])

    useEffect(() => {
        plotTheData()
    }, [fogClipOffset,gl_fog_start,gl_fog_end,clipStart,clipEnd,depthBlurDepth,canvasRef.current,moveX,moveY])


    return (
        <>
        <Stack
            gap={2}
            direction={props.stackDirection}
            style={{ display: "flex", alignItems: "start", width: "100%", height: "100%" }}
        >
            <Stack gap={2} direction="vertical">
                <ClipFogPanel />
            </Stack>
            <Stack gap={1} direction="vertical">
                {isWebGL2 && <DepthBlurPanel />}
                <div>
                <canvas height={plotHeight} width={plotWidth} ref={canvasRef}></canvas>
                </div>
            </Stack>
        </Stack>
        </>
    );
};

export const MoorhenSceneSlidersModal = () => {
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

    const dispatch = useDispatch();

    const { enqueueSnackbar } = useSnackbar();

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.SCENE_SLIDERS}
            left={width / 5}
            top={height / 6}
            headerTitle="Fog/clip/blur"
            minHeight={convertViewtoPx(40, height)}
            minWidth={convertRemToPx(40)}
            maxHeight={convertViewtoPx(75, height)}
            maxWidth={convertRemToPx(60)}
            enforceMaxBodyDimensions={true}
            body={<MoorhenSlidersSettings stackDirection="horizontal" />}
            footer={null}
            additionalHeaderButtons={[
                <Tooltip title={"Move to side panel"} key={1}>
                    <Button
                        variant="white"
                        style={{ margin: "0.1rem", padding: "0.1rem" }}
                        onClick={() => {
                            dispatch(hideModal(modalKeys.SCENE_SLIDERS));
                            enqueueSnackbar(modalKeys.SCENE_SLIDERS, {
                                variant: "sideBar",
                                persist: true,
                                anchorOrigin: { horizontal: "right", vertical: "bottom" },
                                title: "Scene settings",
                                modalId: modalKeys.SCENE_SLIDERS,
                                children: (
                                    <div style={{ overflowY: "scroll", overflowX: "hidden", maxHeight: "50vh" }}>
                                        <MoorhenSlidersSettings stackDirection="vertical" />
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
