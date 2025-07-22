import { Form, InputGroup } from "react-bootstrap";
import { useRef, useState } from "react";
import { MenuItem } from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import { useSnackbar } from "notistack";
import { moorhen } from "../../types/moorhen";
import { setDoOutline } from "../../store/sceneSettingsSlice";
import { setUseGemmi } from "../../store/generalStatesSlice";
import { addImageOverlay, addTextOverlay, addSvgPathOverlay, addFracPathOverlay, emptyOverlays, addCallback } from "../../store/overlaysSlice";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";

export const MoorhenDevMenu = (props: MoorhenNavBarExtendedControlsInterface) => {

    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    const [overlaysOn, setOverlaysOn] = useState<boolean>(false)

    const customCid = useRef<string>('')

    const dispatch = useDispatch()

    const doOutline = useSelector((state: moorhen.State) => state.sceneSettings.doOutline)

    const menuItemProps = {setPopoverIsShown, customCid, ...props}

    const { enqueueSnackbar } = useSnackbar()

    const useGemmi = useSelector((state: moorhen.State) => state.generalStates.useGemmi)

    // This is a bunch of examples of adding images (bitmap or svg), legends, paths in fractional coords on
    // a canvas layed over the top of the GL widget. SVG Paths are also supported, these are in absolute rather
    // fractional coords.

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const exampleCallBack = (ctx,backgroundColor,cbWidth,cbHeight,scale) => {
        const bright_y = backgroundColor[0] * 0.299 + backgroundColor[1] * 0.587 + backgroundColor[2] * 0.114
        if(bright_y<0.5){
            ctx.fillStyle = "white"
        } else {
            ctx.fillStyle = "black"
        }
        ctx.font = 20*scale+"px Arial"
        ctx.fillText("I am written by a callback",0.5*cbWidth,0.5*cbHeight)
    }

    const loadExampleOverlays = (evt) => {
        dispatch(emptyOverlays())
        setOverlaysOn(evt.target.checked)
        if(evt.target.checked){
            dispatch(addImageOverlay({src:`${props.urlPrefix}/pixmaps/axes_xyz.svg`,x:0.25,y:0.75,width:100,height:100}))
            dispatch(addImageOverlay({src:`${props.urlPrefix}/pixmaps/axes_xyz.svg`,x:0.25,y:0.25,width:100,height:100}))
            dispatch(addTextOverlay({text:"Red text",x:0.15,y:0.5,fontFamily:"serif",fontPixelSize:108,fillStyle:"red"}))
            dispatch(addTextOverlay({text:"Text",x:0.15,y:0.75,fontFamily:"serif",fontPixelSize:48}))
            dispatch(addTextOverlay({text:"Stroke text",x:0.65,y:0.75,fontFamily:"serif",fontPixelSize:48,drawStyle:"stroke",strokeStyle:"blue"}))
            dispatch(addSvgPathOverlay({path:"M10 10 h 80 v 80 h -80 Z",drawStyle:"stroke",strokeStyle:"magenta"}))
            dispatch(addSvgPathOverlay({path:"M100 10 h 80 v 80 h -80 Z",drawStyle:"fill",fillStyle:"orange"}))
            dispatch(addSvgPathOverlay({path:"M610 300 h 80 v 80 h -80 Z",drawStyle:"stroke",strokeStyle:"green",lineWidth:6}))
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
            dispatch(addFracPathOverlay({path:[[0.4,0.2],[0.8,0.6]],drawStyle:"stroke",strokeStyle:"red",lineWidth:8}))
            dispatch(addFracPathOverlay({path:[[0.2,0.5],[0.3,0.9],[0.1,0.7],[0.2,0.5]],gradientStops,gradientBoundary:[0.1,0,0.3,0],drawStyle:"gradient"}))
            dispatch(addCallback(exampleCallBack))
        }
    }

    const tomogramTest = () => {
        enqueueSnackbar("tomogram", {
            variant: "tomogram",
            persist: true,
            commandCentre: props.commandCentre,
            glRef: props.glRef,
            mapMolNo: 0,
            anchorOrigin: { vertical: "bottom", horizontal: "center" }
        })
    }

    return <>
                    <MenuItem onClick={tomogramTest}>
                        Tomogram...
                    </MenuItem>
                    <hr></hr>
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check
                            type="switch"
                            checked={useGemmi}
                            onChange={() => {dispatch( setUseGemmi(!useGemmi) )}}
                            label="Use gemmi for reading/writing coord files"/>
                    </InputGroup>

                    <hr></hr>
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check
                            type="switch"
                            checked={doOutline}
                            onChange={() => {dispatch( setDoOutline(!doOutline) )}}
                            label="Outlines"/>
                    </InputGroup>
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check
                            type="switch"
                            checked={overlaysOn}
                            onChange={(evt) => { loadExampleOverlays(evt) }}
                            label="Load example 2D overlays"/>
                    </InputGroup>

        </>
    }
