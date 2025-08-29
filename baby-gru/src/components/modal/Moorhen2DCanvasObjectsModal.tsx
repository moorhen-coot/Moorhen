import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen"
import { useEffect, useRef, createRef, useCallback, useMemo, useState } from "react"
import { Form, Row, Col, Stack, Card, Container, ListGroup, Button, Table, FormSelect } from "react-bootstrap"
import { convertRemToPx, convertViewtoPx} from '../../utils/utils'
import { useSelector, useDispatch } from "react-redux"
import { modalKeys } from "../../utils/enums"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { FormControlLabel, FormControl, RadioGroup, Radio, Slider, TextField, Menu, MenuItem, Accordion, AccordionSummary, AccordionDetails, Popover, StyledEngineProvider, IconButton, Tabs, Tab, Tooltip } from '@mui/material';
import {v4 as uuidv4} from 'uuid';
import { addImageOverlay, addLatexOverlay, addTextOverlay, addSvgPathOverlay, addFracPathOverlay,
         removeImageOverlay, removeLatexOverlay, removeTextOverlay, removeSvgPathOverlay, removeFracPathOverlay
       } from "../../store/overlaysSlice"
import { MoorhenBaseMenuItem } from "../menu-item/MoorhenBaseMenuItem";
import MoorhenColourPicker from "../inputs/MoorhenColourPicker";

export const Moorhen2DCanvasObjectsModal = (props: moorhen.CollectedProps) => {

    const resizeNodeRef = useRef<HTMLDivElement>(null)

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const imageOverlays = useSelector((state: moorhen.State) => state.overlays.imageOverlayList)
    const latexOverlays = useSelector((state: moorhen.State) => state.overlays.latexOverlayList)
    const textOverlays = useSelector((state: moorhen.State) => state.overlays.textOverlayList)
    const svgPathOverlays = useSelector((state: moorhen.State) => state.overlays.svgPathOverlayList)
    const fracPathOverlays = useSelector((state: moorhen.State) => state.overlays.fracPathOverlayList)

    const dispatch = useDispatch()

    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)

    const vectorSelectRef = useRef<null | HTMLSelectElement>(null)
    const drawModeRef = useRef<null | HTMLSelectElement>(null)
    const pathRef = useRef<null | HTMLInputElement>(null)

    const newOverlayObject = () => {
        const anOverlayObject = {
            drawMode: "text",
            path: "",
            drawStyle: "stroke",
            strokeStyle: "black",
            fillStyle: "black",
            gradientStops: [],
            gradientBoundary: [],
            width: 0.0,
            height: 0.0,
            x: 0.0,
            y: 0.0,
            uniqueId: uuidv4(),
        }
        return anOverlayObject
    }

    interface RGBColour  {
        r: number;
        g: number;
        b: number;
    }

    const [theOverlayObject, setOverlayObject] = useState<any>(newOverlayObject())
    const [selectedOption, setSelectedOption] = useState<string>("new")
    const [objectColour, setObjectColour] = useState({r:0,g:0,b:0})

//TODO 2D overlays, not vectors!
    const handleDelete = (evt: React.MouseEvent<HTMLElement> ) => {
        console.log(theOverlayObject.uniqueId)
        let existingObject = latexOverlays.find((element) => element.uniqueId===theOverlayObject.uniqueId)
        if(existingObject){
            dispatch(removeLatexOverlay(existingObject))
            setSelectedOption("new")
            return
        }
        existingObject = imageOverlays.find((element) => element.uniqueId===theOverlayObject.uniqueId)
        if(existingObject){
            dispatch(removeImageOverlay(existingObject))
            setSelectedOption("new")
            return
        }
        existingObject = textOverlays.find((element) => element.uniqueId===theOverlayObject.uniqueId)
        if(existingObject){
            dispatch(removeTextOverlay(existingObject))
            setSelectedOption("new")
            return
        }
        existingObject = svgPathOverlays.find((element) => element.uniqueId===theOverlayObject.uniqueId)
        if(existingObject){
            dispatch(removeSvgPathOverlay(existingObject))
            setSelectedOption("new")
            return
        }
        existingObject = fracPathOverlays.find((element) => element.uniqueId===theOverlayObject.uniqueId)
        if(existingObject){
            dispatch(removeFracPathOverlay(existingObject))
            setSelectedOption("new")
            return
        }
    }

//TODO 2D overlays, not vectors!
    const handleApply = (evt: React.MouseEvent<HTMLElement> ) => {
        if(vectorSelectRef.current.value!=="new"){
            //dispatch(removeVector(theVector))
        }
        //dispatch(addVector(theVector))
        setSelectedOption(theOverlayObject.uniqueId)
    }

    const handleObjectChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        console.log(vectorSelectRef.current.value)
        if(vectorSelectRef !== null && typeof vectorSelectRef !== 'function') {
            vectorSelectRef.current.value = evt.target.value
            if(vectorSelectRef.current.value==="new"){
                setSelectedOption("new")
                updateObject(newOverlayObject())
                if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = "text"
            } else {
                try {
                    let existingObject = latexOverlays.find((element) => element.uniqueId===evt.target.value)
                    if(existingObject){
                        console.log("existingObject is a latex type")
                        if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = "text"
                    }
                    if(!existingObject){
                        existingObject = imageOverlays.find((element) => element.uniqueId===evt.target.value)
                        if(existingObject){
                            console.log("existingObject is am image type")
                            if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = "image"
                        }
                    }
                    if(!existingObject){
                        existingObject = textOverlays.find((element) => element.uniqueId===evt.target.value)
                        if(existingObject){
                            console.log("existingObject is a plain text type")
                            if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = "text"
                        }
                    }
                    if(!existingObject){
                        existingObject = svgPathOverlays.find((element) => element.uniqueId===evt.target.value)
                        if(existingObject){
                            console.log("existingObject is an SVG path type")
                            if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = "svgpath"
                        }
                    }
                    if(!existingObject){
                        existingObject = fracPathOverlays.find((element) => element.uniqueId===evt.target.value)
                        if(existingObject){
                            console.log("existingObject is a path type")
                            if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = "fracpath"
                            console.log("Set type to",drawModeRef.current.value)
                        }
                    }
                    updateObject(existingObject)
                    setSelectedOption(existingObject.uniqueId)
                    console.log("#####################")
                    console.log(existingObject)
                    console.log(drawModeRef)
                    console.log(drawModeRef.current.value)
                    console.log("#####################")
                } catch(e) {
                }
            }
        }
    }

    const handleColorChange = (color: { r: number; g: number; b: number }) => {
        setObjectColour(color)
        updateObject({strokeStyle:color,fillStyle:color})
    }

    const combinedArrays = latexOverlays.concat(imageOverlays,textOverlays,svgPathOverlays,fracPathOverlays)
    const headerContent =  <>
                            <div style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>Select object:</div>
                            <Form.Group style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>
                                <FormSelect ref={vectorSelectRef} size="sm" onChange={handleObjectChange}>
                                <option selected={selectedOption==="new"} value="new">New</option>
                                {combinedArrays.length>0 && combinedArrays.map((vec,i) => {
                                    return <option selected={selectedOption===vec.uniqueId} key={i} value={vec.uniqueId}>{vec.uniqueId}</option>
                                })
                                }
                                </FormSelect>
                            </Form.Group>
                        </>

    const footer = <>{vectorSelectRef.current && selectedOption!=="new" &&
                    <Button className='m-2' variant="danger" onClick={handleDelete}>Delete</Button>
                    }
                    <Button className='m-2' onClick={handleApply}>Apply</Button></>

    const updateObject = ({
        drawMode=undefined,
        path=undefined,
        drawStyle=undefined,
        strokeStyle=undefined,
        fillStyle=undefined,
        gradientStops=undefined,
        gradientBoundary=undefined,
        width=undefined,
        height=undefined,
        x=undefined,
        y=undefined,
        uniqueId=undefined,
    }) => {
        const newObject = {
            drawMode: (drawMode !== undefined) ? drawMode : theOverlayObject.drawMode,
            path: (path !== undefined) ? path : theOverlayObject.path,
            drawStyle: (drawStyle !== undefined) ? drawStyle : theOverlayObject.drawStyle,
            strokeStyle: (strokeStyle !== undefined) ? strokeStyle : theOverlayObject.strokeStyle,
            fillStyle: (fillStyle !== undefined) ? fillStyle : theOverlayObject.fillStyle,
            gradientStops: (gradientStops !== undefined) ? gradientStops : theOverlayObject.gradientStops,
            gradientBoundary: (gradientBoundary !== undefined) ? gradientBoundary : theOverlayObject.gradientBoundary,
            width: (width !== undefined) ? width : theOverlayObject.width,
            height: (height !== undefined) ? height : theOverlayObject.height,
            x: (x !== undefined) ? x : theOverlayObject.x,
            y: (y !== undefined) ? y : theOverlayObject.y,
            uniqueId: (uniqueId !== undefined) ? uniqueId : theOverlayObject.uniqueId,
        }
        setOverlayObject(newObject)
    }

    const bodyContent = <>
                            {headerContent}
                            <Form.Group style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>
                            <Form.Label style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>Draw mode</Form.Label>
                                <FormSelect size="sm" ref={drawModeRef} defaultValue="text" onChange={(evt) => {
                                    if (drawModeRef !== null && typeof drawModeRef !== 'function') {
                                        drawModeRef.current.value = evt.target.value
                                        updateObject({drawMode:evt.target.value})
                                    }
                                }}>
                                <option value="text">Text</option>
                                <option value="svgpath">SVG path</option>
                                <option value="fracpath">Fractional points path</option>
                                <option value="image">Image</option>
                                </FormSelect>
                            </Form.Group>
                            <Row>
                            <Col className="align-items-start"
                            style={{
                                display: "flex",
                                justifyContent: "left",
                            }}
                            >
                            <div>Colour</div>
                            </Col>
                            <Col xs={10} className="align-items-start"
                            style={{
                                display: "flex",
                                justifyContent: "left",
                            }}
                            >
                            <MoorhenColourPicker
                                //colour={[theVector.objectColour.r, theVector.objectColour.g, theVector.objectColour.b]}
                                colour={[1, 0, 0]}
                                setColour={(color => {
                                   handleColorChange({ r: color[0], g: color[1], b: color[2] });
                                })}
                                position="bottom"
                                tooltip="Change vector colour"
                            />
                            </Col>
                            </Row>
                        </>

    return <MoorhenDraggableModalBase
                modalId={modalKeys.OVERLAYS2D}
                left={width / 6}
                top={height / 3}
                minHeight={50}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(70, height)}
                maxWidth={convertViewtoPx(90, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='2D Overlay objects'
                resizeNodeRef={resizeNodeRef}
                body={bodyContent}
                footer={footer}
            />
}
