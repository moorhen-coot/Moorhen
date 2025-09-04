import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen"
import { useEffect, useRef, createRef, useCallback, useMemo, useState } from "react"
import { Form, Row, Col, Stack, Card, Container, ListGroup, Button, Table, FormSelect } from "react-bootstrap"
import { convertRemToPx, convertViewtoPx, getHexForCanvasColourName, hexToRGB, rgbToHex } from '../../utils/utils'
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
import { allFontsSet } from '../../utils/enums';

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
    const availableFonts = useSelector((state: moorhen.State) => state.labelSettings.availableFonts)

    const dispatch = useDispatch()

    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)

    const vectorSelectRef = useRef<null | HTMLSelectElement>(null)
    const drawModeRef = useRef<null | HTMLSelectElement>(null)
    const pathRef = useRef<null | HTMLInputElement>(null)

//FIXME - The image edit path thing is probably not very useful.
//TODO UI for gradientStops, gradientBoundary, alpha

    const newOverlayObject = () => {
        const anOverlayObject = {
            drawMode: "text",
            path: "",
            src: "",
            text: "",
            drawStyle: undefined,
            strokeStyle: "black",
            fillStyle: "black",
            gradientStops: [],
            gradientBoundary: [],
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            fontPixelSize: 0,
            fontFamily: "serif",
            lineWidth: 0,
            uniqueId: uuidv4(),
        }
        return anOverlayObject
    }

    interface RGBColour {
        r: number;
        g: number;
        b: number;
    }

    const [theOverlayObject, setOverlayObject] = useState<any>(newOverlayObject())
    const [selectedOption, setSelectedOption] = useState<string>("new")
    const [selectedFont, setSelectedFont] = useState<string>("serif")
    const [selectedDrawStyle, setSelectedDrawStyle] = useState<string>("fill")
    const [pathText, setPathText] = useState<string>("")
    const [gradientBoundaryText, setGradientBoundaryText] = useState<string>("0,0,1,1")
    const [positionText, setPositionText] = useState<string>("")

    const deleteCurrentObject = () => {
        let existingObject = latexOverlays.find((element) => element.uniqueId===theOverlayObject.uniqueId)
        if(existingObject){
            dispatch(removeLatexOverlay(existingObject))
            setSelectedOption("new")
        }
        existingObject = imageOverlays.find((element) => element.uniqueId===theOverlayObject.uniqueId)
        if(existingObject){
            dispatch(removeImageOverlay(existingObject))
            setSelectedOption("new")
        }
        existingObject = textOverlays.find((element) => element.uniqueId===theOverlayObject.uniqueId)
        if(existingObject){
            dispatch(removeTextOverlay(existingObject))
            setSelectedOption("new")
        }
        existingObject = svgPathOverlays.find((element) => element.uniqueId===theOverlayObject.uniqueId)
        if(existingObject){
            dispatch(removeSvgPathOverlay(existingObject))
            setSelectedOption("new")
        }
        existingObject = fracPathOverlays.find((element) => element.uniqueId===theOverlayObject.uniqueId)
        if(existingObject){
            dispatch(removeFracPathOverlay(existingObject))
            setSelectedOption("new")
        }
    }

    const handleDelete = (evt: React.MouseEvent<HTMLElement> ) => {
        deleteCurrentObject()
    }

    const handleApply = (evt: React.MouseEvent<HTMLElement> ) => {
        const objectType = drawModeRef.current.value
        if(vectorSelectRef.current.value!=="new"){
            deleteCurrentObject()
        }
//TODO image
        console.log(theOverlayObject,objectType)
        if(objectType==="text"){
            let [new_x,new_y] = [0, 1]
            try {
                const [_new_x,_new_y] = positionText.split(",").map(a=>parseFloat(a))
                if(!Number.isNaN(_new_x)&&!Number.isNaN(_new_y)){
                    new_x = _new_x
                    new_y = _new_y
                } else {
                    console.log("Not a valid number pair in text position.",positionText.split(","))
                }
            } catch(e) {
                console.log("Not a valid number pair in text position.")
            }
            dispatch(addTextOverlay({strokeStyle:theOverlayObject.strokeStyle,fillStyle:theOverlayObject.fillStyle,text:theOverlayObject.text,x:new_x,y:new_y,fontFamily:theOverlayObject.fontFamily,fontPixelSize:theOverlayObject.fontPixelSize,drawStyle:theOverlayObject.drawStyle,lineWidth:theOverlayObject.lineWidth,uniqueId:theOverlayObject.uniqueId}))
        } else if(objectType==="latex"){
            dispatch(addLatexOverlay({text:theOverlayObject.text,x:theOverlayObject.x,y:theOverlayObject.y,height:theOverlayObject.height,uniqueId:theOverlayObject.uniqueId}))
        } else if(objectType==="svgpath"){
            dispatch(addSvgPathOverlay({path:theOverlayObject.path,drawStyle:theOverlayObject.drawStyle,strokeStyle:theOverlayObject.strokeStyle,fillStyle:theOverlayObject.fillStyle,lineWidth:theOverlayObject.lineWidth,uniqueId:theOverlayObject.uniqueId}))
        } else if(objectType==="fracpath"){
            let arr: [number,number][] = [[0,0],[1,1]]
            try {
                arr = pathText.split(",").reduce((rows, key, index) => (index % 2 == 0 ? rows.push([parseFloat(key)]) : rows[rows.length-1].push(parseFloat(key))) && rows, [])
            } catch(e) {
                console.log("Not a valid array of number pairs for fractional path points.")
            }
            if(theOverlayObject.drawStyle==="gradient")
                dispatch(addFracPathOverlay({path:arr,drawStyle:theOverlayObject.drawStyle,strokeStyle:theOverlayObject.strokeStyle,lineWidth:theOverlayObject.lineWidth,gradientStops:theOverlayObject.gradientStops,gradientBoundary:theOverlayObject.gradientBoundary,uniqueId:theOverlayObject.uniqueId}))
            else
                dispatch(addFracPathOverlay({path:arr,drawStyle:theOverlayObject.drawStyle,strokeStyle:theOverlayObject.strokeStyle,fillStyle:theOverlayObject.fillStyle,lineWidth:theOverlayObject.lineWidth,uniqueId:theOverlayObject.uniqueId}))
        }
        setSelectedOption(theOverlayObject.uniqueId)
    }

    const handleObjectChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if(vectorSelectRef !== null && typeof vectorSelectRef !== 'function') {
            vectorSelectRef.current.value = evt.target.value
            if(vectorSelectRef.current.value==="new"){
                setSelectedOption("new")
                updateObject(newOverlayObject(),"text")
                if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = "text"
            } else {
                try {
                    let existingObject = latexOverlays.find((element) => element.uniqueId===evt.target.value)
                    if(existingObject){
                        if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = "latex"
                    }
                    if(!existingObject){
                        existingObject = imageOverlays.find((element) => element.uniqueId===evt.target.value)
                        if(existingObject){
                            if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = "image"
                        }
                    }
                    if(!existingObject){
                        existingObject = textOverlays.find((element) => element.uniqueId===evt.target.value)
                        if(existingObject){
                            if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = "text"
                        }
                    }
                    if(!existingObject){
                        existingObject = svgPathOverlays.find((element) => element.uniqueId===evt.target.value)
                        if(existingObject){
                            if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = "svgpath"
                        }
                    }
                    if(!existingObject){
                        existingObject = fracPathOverlays.find((element) => element.uniqueId===evt.target.value)
                        if(existingObject){
                            if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = "fracpath"
                        }
                    }
                    setSelectedOption(existingObject.uniqueId)
                    setPathText("")
                    setPositionText("")
                    if(drawModeRef.current.value === "fracpath"){
                        if(existingObject.path){
                            setPathText(existingObject.path.flat().map(number=>number.toFixed(3)).toString())
                        }
                        if(existingObject.lineWidth===undefined){
                            setOverlayObject(Object.assign({},existingObject,{lineWidth:1}))
                        } else {
                            setOverlayObject(existingObject)
                        }
                    } else if(drawModeRef.current.value === "svgpath"){
                        if(existingObject.path){
                            setPathText(existingObject.path)
                        }
                        if(existingObject.lineWidth===undefined){
                            setOverlayObject(Object.assign({},existingObject,{lineWidth:1}))
                        } else {
                            setOverlayObject(existingObject)
                        }
                    } else if(drawModeRef.current.value === "text"||drawModeRef.current.value === "latex"){
                        setPositionText(existingObject.x.toFixed(3)+", "+existingObject.y.toFixed(3))
                        if(existingObject.lineWidth===undefined){
                            setOverlayObject(Object.assign({},existingObject,{lineWidth:1}))
                        } else {
                            setOverlayObject(existingObject)
                        }
                    } else {
                        setOverlayObject(existingObject)
                    }
                    if(existingObject.fontFamily&&existingObject.text&&(drawModeRef.current.value === "text")){
                        if(availableFonts.includes(existingObject.fontFamily)){
                            setSelectedFont(existingObject.fontFamily)
                        } else if(["serif","sans-serif","monospace","cursive","fantasy"].includes(existingObject.fontFamily)){
                            setSelectedFont(existingObject.fontFamily)
                        } else {
                            setSelectedFont("serif")
                        }
                    }
                    if(drawModeRef.current.value === "text"||drawModeRef.current.value === "svgpath"||drawModeRef.current.value === "fracpath"){
                        if(existingObject.drawStyle) {
                            setSelectedDrawStyle(existingObject.drawStyle)
                        } else {
                            setSelectedDrawStyle("fill")
                        }
                        if(existingObject.gradientBoundary) {
                            if(drawModeRef.current.value === "svgpath")
                                setGradientBoundaryText(existingObject.gradientBoundary.flat().toString())
                            else
                                setGradientBoundaryText(existingObject.gradientBoundary.flat().map(number=>number.toFixed(3)).toString())
                        }
                    }
                } catch(e) {
                }
            }
        }
    }

    const handleColorChange = (color: string) => {
        updateObject({strokeStyle:color,fillStyle:color},drawModeRef.current.value)
    }

    const combinedArrays = latexOverlays.concat(imageOverlays,textOverlays,svgPathOverlays,fracPathOverlays)

    const headerContent =  <Row>
                                <Col sm={2}>
                                Object
                                </Col>
                                <Form.Group as={Col} className='mb-3'>
                                <FormSelect ref={vectorSelectRef} size="sm" onChange={handleObjectChange} value={selectedOption}>
                                <option value="new">New</option>
                                {combinedArrays.length>0 && combinedArrays.map((vec,i) => {
                                    if(vec.path && (typeof vec.path)==="string"){
                                        return <option key={i} value={vec.uniqueId}>{"SVG path: "+vec.path.substring(0,50)}</option>
                                    } else if(vec.path && (typeof vec.path)!=="string"){
                                        return <option key={i} value={vec.uniqueId}>{"Fractional points path: "+vec.path.flat().map(number=>number.toFixed(3)).toString().substring(0,50)}</option>
                                    } else if(vec.src){
                                        return <option key={i} value={vec.uniqueId}>{"Image: "+vec.src.substring(0,50)}</option>
                                    } else if(vec.text){
                                        return <option key={i} value={vec.uniqueId}>{"Text: "+vec.text.substring(0,50)}</option>
                                    } else {
                                        return <option key={i} value={vec.uniqueId}>{vec.uniqueId}</option>
                                    }
                                })
                                }
                                </FormSelect>
                            </Form.Group>
                        </Row>

    const footer = <>{vectorSelectRef.current && selectedOption!=="new" &&
                    <Button className='m-2' variant="danger" onClick={handleDelete}>Delete</Button>
                    }
                    <Button className='m-2' onClick={handleApply}>Apply</Button></>

    const updateObject = ({
        drawMode=undefined,
        path=undefined,
        src=undefined,
        text=undefined,
        drawStyle=undefined,
        strokeStyle=undefined,
        fillStyle=undefined,
        gradientStops=undefined,
        gradientBoundary=undefined,
        width=undefined,
        height=undefined,
        x=undefined,
        y=undefined,
        fontPixelSize=undefined,
        fontFamily=undefined,
        lineWidth=undefined,
        uniqueId=undefined,
    },objectType) => {
        const newObject = {
            drawMode: (objectType !== undefined) ? objectType : theOverlayObject.drawMode,
            path: (path !== undefined) ? path : theOverlayObject.path,
            src: (src !== undefined) ? src : theOverlayObject.src,
            text: (text !== undefined) ? text : theOverlayObject.text,
            drawStyle: (drawStyle !== undefined) ? drawStyle : theOverlayObject.drawStyle,
            strokeStyle: (strokeStyle !== undefined) ? strokeStyle : theOverlayObject.strokeStyle,
            fillStyle: (fillStyle !== undefined) ? fillStyle : theOverlayObject.fillStyle,
            gradientStops: (gradientStops !== undefined) ? gradientStops : theOverlayObject.gradientStops,
            gradientBoundary: (gradientBoundary !== undefined) ? gradientBoundary : theOverlayObject.gradientBoundary,
            width: (width !== undefined) ? width : theOverlayObject.width,
            height: (height !== undefined) ? height : theOverlayObject.height,
            x: (x !== undefined) ? x : theOverlayObject.x,
            y: (y !== undefined) ? y : theOverlayObject.y,
            fontPixelSize: (fontPixelSize !== undefined) ? fontPixelSize : theOverlayObject.fontPixelSize,
            fontFamily: (fontFamily !== undefined) ? fontFamily : theOverlayObject.fontFamily,
            lineWidth: (lineWidth !== undefined) ? lineWidth : theOverlayObject.lineWidth,
            uniqueId: (uniqueId !== undefined) ? uniqueId : theOverlayObject.uniqueId,
        }
        setOverlayObject(newObject)
    }

    const isDefaultNew = (!drawModeRef)||(drawModeRef !== null&&typeof drawModeRef !== 'function'&&drawModeRef.current===null)

    let existingColour = null
    if(theOverlayObject.fillStyle&&theOverlayObject.fillStyle!=="gradient"){
        existingColour = hexToRGB(getHexForCanvasColourName(theOverlayObject.fillStyle))
    }
    if(theOverlayObject.strokeStyle&&theOverlayObject.strokeStyle!=="gradient"){
        existingColour = hexToRGB(getHexForCanvasColourName(theOverlayObject.strokeStyle))
    }

    const checkGradientBoundaryText = () => {
        let isOk: boolean = false
        try {
            const arr = gradientBoundaryText.split(",").reduce((rows, key, index) => (index % 2 == 0 ? rows.push([parseFloat(key)]) : rows[rows.length-1].push(parseFloat(key))) && rows, [])
            if(arr.length>1&&(arr.flat().length%2)===0){
                if(!arr.flat().includes(Number.NaN))
                    isOk = true
            }
        } catch(e) {
            console.log("Not a valid array of number pairs for fractional path points.")
        }
        return isOk
    }

    const checkFracPathText = () => {
        let isOk: boolean = false
        try {
            const arr = pathText.split(",").reduce((rows, key, index) => (index % 2 == 0 ? rows.push([parseFloat(key)]) : rows[rows.length-1].push(parseFloat(key))) && rows, [])
            if(arr.length>1&&(arr.flat().length%2)===0){
                if(!arr.flat().includes(Number.NaN))
                    isOk = true
            }
        } catch(e) {
            console.log("Not a valid array of number pairs for fractional path points.")
        }
        return isOk
    }

    const checkPositionText = () => {
        let isOk: boolean = false
        try {
                const [_new_x,_new_y] = positionText.split(",").map(a=>parseFloat(a))
                if(!Number.isNaN(_new_x)&&!Number.isNaN(_new_y)&&!(_new_x===undefined)&&!(_new_y===undefined)){
                    isOk = true
                } else {
                    console.log("Not a valid number pair in text position.",positionText)
                }
        } catch(e) {
                console.log("Not a valid number pair in text position.")
        }
        return isOk
    }

    console.log(theOverlayObject)

    const bodyContent = <>
                            {headerContent}
                             <Row>
                                <Col sm={2}>
                                Type
                                </Col>
                                <Form.Group as={Col} className='mb-3'>
                                <FormSelect size="sm" ref={drawModeRef} defaultValue="text" onChange={(evt) => {
                                    if (drawModeRef !== null && typeof drawModeRef !== 'function') {
                                        drawModeRef.current.value = evt.target.value
                                        updateObject({drawMode:evt.target.value},evt.target.value)
                                    }
                                }}>
                                <option value="text">Text</option>
                                <option value="svgpath">SVG path</option>
                                <option value="fracpath">Fractional points path</option>
                                <option value="image">Image</option>
                                <option value="latex">Latex</option>
                                </FormSelect>
                                </Form.Group>
                            </Row>
                            { (isDefaultNew||(drawModeRef.current && (drawModeRef.current.value === "text"||drawModeRef.current.value === "latex"))) &&
                            <>
                             <Row>
                                <Col sm={2}>
                                Text
                                </Col>
                                <Form.Group as={Col} className='mb-3' controlId="textInput">
                                <Col sm={10}>
                                <Form.Control type="text" value={theOverlayObject.text} onChange={(evt) => {
                                   updateObject({text:evt.target.value},drawModeRef.current.value)
                                }} />
                                </Col>
                                </Form.Group>
                             </Row>
                             <Row>
                                <Col sm={2}>
                                Position
                                </Col>
                                <Form.Group as={Col} className='mb-3' controlId="textInput">
                                <Col sm={10}>
                                <Form.Control type="text" value={positionText} onChange={(evt) => {
                                    setPositionText(evt.target.value)
                                }}
                                isInvalid={!checkPositionText()}
                                />
                                </Col>
                                </Form.Group>
                             </Row>
                             <Row>
                                <Col sm={2}>
                                Size
                                </Col>
                                <Form.Group as={Col} className='mb-3' controlId="textInput">
                                <Col sm={10}>
                                <Form.Control type="number" value={(drawModeRef!==null && drawModeRef.current!==null && drawModeRef.current.value === "latex") ? theOverlayObject.height : theOverlayObject.fontPixelSize} onChange={(evt) => {
                                try {
                                    const h = parseFloat(evt.target.value)
                                    if(drawModeRef.current.value === "latex")
                                        updateObject({height:h},drawModeRef.current.value)
                                    else
                                        updateObject({fontPixelSize:h},drawModeRef.current.value)
                                } catch(e) {
                                }
                                }}/>
                                </Col>
                                </Form.Group>
                             </Row>
                            </>
                            }
                            { drawModeRef.current && drawModeRef.current.value === "svgpath" &&
                            <Row>
                                <Col sm={2}>
                                Path
                                </Col>
                                <Form.Group as={Col} className='mb-3' controlId="svgPathInput">
                                <Form.Control type="text" value={theOverlayObject.path} onChange={(evt) => {
                                   updateObject({path:evt.target.value},drawModeRef.current.value)
                                }} />
                                </Form.Group>
                            </Row>
                            }
                            { drawModeRef.current && drawModeRef.current.value === "fracpath" &&
                            <Row>
                                <Col sm={2}>
                                Path
                                </Col>
                                <Form.Group as={Col} className='mb-3' controlId="fracPathInput">
                                <Form.Control type="text" value={pathText} onChange={(evt) => {
                                    setPathText(evt.target.value)
                                }}
                                isInvalid={!checkFracPathText()}
                                />
                                </Form.Group>
                            </Row>
                            }
                            { drawModeRef.current && drawModeRef.current.value === "image" &&
                            <Row>
                                <Col sm={2}>
                                Path
                                </Col>
                                <Form.Group as={Col} className='mb-3' controlId="imagePathInput">
                                <Form.Control type="text" value={theOverlayObject.src} onChange={(evt) => {
                                   updateObject({src:evt.target.value},drawModeRef.current.value)
                                }} />
                                </Form.Group>
                            </Row>
                            }
                            { (drawModeRef.current && (drawModeRef.current.value === "text")) &&
                            <Row>
                                <Col sm={2}>
                                    Font
                                </Col>
                                <Form.Group as={Col} className='mb-3' controlId="textFontSelect">
                                <FormSelect value={selectedFont} onChange={(evt: React.ChangeEvent<HTMLSelectElement>) => {
                                    setSelectedFont(evt.target.value)
                                    updateObject({fontFamily:evt.target.value},drawModeRef.current.value)
                                    console.log(evt.target.value)
                                }}>
                                { availableFonts.map((item) => {
                                    return <option key={item} value={item}>{item}</option>
                                })}
                                <option key="serif" value="serif">Serif</option>
                                <option key="sans-serif" value="sans-serif">Sans serif</option>
                                <option key="monospace" value="monospace">Monospace</option>
                                <option key="cursive" value="cursive">Cursive</option>
                                <option key="fantasy" value="fantasy">Fantasy</option>
                                </FormSelect>
                                </Form.Group>
                            </Row>
                            }
                            { (drawModeRef.current && (drawModeRef.current.value === "text" ||drawModeRef.current.value === "svgpath" || drawModeRef.current.value === "fracpath")) &&
                            <Row>
                                <Col sm={2}>
                                    Draw style
                                </Col>
                                <Form.Group as={Col} className='mb-3' controlId="drawStyleSelect">
                                <FormSelect value={selectedDrawStyle} onChange={(evt: React.ChangeEvent<HTMLSelectElement>) => {
                                    setSelectedDrawStyle(evt.target.value)
                                    if(!theOverlayObject.fillStyle&&theOverlayObject.strokeStyle&&evt.target.value==="fill"){
                                        updateObject({drawStyle:evt.target.value,fillStyle:theOverlayObject.strokeStyle},drawModeRef.current.value)
                                    } else if(!theOverlayObject.strokeStyle&&theOverlayObject.fillStyle&&evt.target.value==="stroke"){
                                        updateObject({drawStyle:evt.target.value,strokeStyle:theOverlayObject.fillStyle},drawModeRef.current.value)
                                    } else {
                                        updateObject({drawStyle:evt.target.value},drawModeRef.current.value)
                                    }
                                }}>
                                <option key="stroke" value="stroke">Outline</option>
                                <option key="fill" value="fill">Filled</option>
                                <option key="gradient" value="gradient">Gradient</option>
                                </FormSelect>
                                </Form.Group>
                            </Row>
                            }
                            { (drawModeRef.current && selectedDrawStyle==="stroke" && (drawModeRef.current.value === "text" ||drawModeRef.current.value === "svgpath" || drawModeRef.current.value === "fracpath" )) &&
                            <Row>
                                <Col sm={2}>
                                    Line width
                                </Col>
                                <Col sm={10} className="mb-3">
                                <Form.Control type="number" value={theOverlayObject.lineWidth} onChange={(evt) => {
                                   updateObject({lineWidth:evt.target.value},drawModeRef.current.value)
                                }} />
                                </Col>
                            </Row>
                            }
                            { selectedDrawStyle!=="gradient" && (drawModeRef.current && (drawModeRef.current.value === "svgpath" || drawModeRef.current.value === "fracpath" || drawModeRef.current.value === "text")) &&
                            <Row>
                                <Col sm={2}>
                                    Colour
                                </Col>
                            <Col sm={10} className="mb-3">
                            <MoorhenColourPicker
                                colour={existingColour!==null ? existingColour : [1, 0, 0]}
                                setColour={(color => {
                                   handleColorChange(rgbToHex(color[0], color[1], color[2]));
                                })}
                                position="bottom"
                                tooltip="Change vector colour"
                            />
                            </Col>
                            </Row>
                            }
                            { selectedDrawStyle==="gradient" &&
                            <>
                            <Row>
                                <Col sm={2}>
                                    Gradient boundaries
                                </Col>
                                <Form.Group as={Col} className='mb-3' controlId="gradBoundaryInput">
                                <Form.Control type="text" value={gradientBoundaryText} onChange={(evt) => {
                                    setGradientBoundaryText(evt.target.value)
                                }}
                                isInvalid={!checkGradientBoundaryText()}
                                />
                                </Form.Group>
                            </Row>
                            <Row>
                                <Col sm={2}>
                                    Gradient stops
                                </Col>
                            </Row>
                            {theOverlayObject.gradientStops &&
                            theOverlayObject.gradientStops.map((s,istop) => {
                                return <Row key={istop}>
                                <Col sm={2}></Col>
                                <Col sm={2}>
                                <MoorhenColourPicker
                                colour={hexToRGB(getHexForCanvasColourName(s.colour))}
                                setColour={(color => {
                                   //handleColorChange(rgbToHex(color[0], color[1], color[2]));
                                })}
                                position="bottom"
                                tooltip="Change vector colour"
                                />
                                </Col>
                                <Form.Group as={Col} className='mb-3' controlId="textInput">
                                <Form.Control type="number" value={s.stop} onChange={(evt) => {
                                }} />
                                </Form.Group>
                                </Row>
                            })}
                            </>
                            }
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
