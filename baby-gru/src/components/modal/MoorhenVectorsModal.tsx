import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen"
import { useRef, useCallback, useState } from "react"
import { Form, Row, Col, Card, Button,  FormSelect, InputGroup } from "react-bootstrap"
import { convertRemToPx, convertViewtoPx} from '../../utils/utils'
import { useSelector, useDispatch } from "react-redux"
import { modalKeys } from "../../utils/enums"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import {v4 as uuidv4} from 'uuid';
import { addVector, removeVector } from "../../store/vectorsSlice"
import { MoorhenBaseMenuItem } from "../menu-item/MoorhenBaseMenuItem";
import { MoorhenColourPicker } from "../inputs";
import type { MoorhenVector, VectorsCoordMode, VectorsDrawMode, VectorsArrowMode, VectorsLabelMode } from "../../store/vectorsSlice";

const MoorhenDeleteVectorMenuItem = (props: {
    item: moorhen.Map | moorhen.Molecule;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const vectorsList = useSelector((state: moorhen.State) => state.vectors.vectorsList)

    const dispatch = useDispatch()

    const panelContent = <>
        <Form.Group style={{ width: '10rem', margin: '0.5rem' }} controlId="MoorhenGetDeleteMenuItem" className="mb-3">
            <span style={{ fontWeight: 'bold' }}>Are you sure?</span>
        </Form.Group>
    </>

    const onCompleted = useCallback(() => {
    }, [vectorsList])

    return <MoorhenBaseMenuItem
        textClassName="text-danger"
        buttonVariant="danger"
        buttonText="Delete"
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={"Delete vector"}
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenVectorsModal = () => {

    const resizeNodeRef = useRef<HTMLDivElement>(null)

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const vectorsList = useSelector((state: moorhen.State) => state.vectors.vectorsList)

    const dispatch = useDispatch()

    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const vectorSelectRef = useRef<null | HTMLSelectElement>(null)
    const drawModeRef = useRef<null | HTMLSelectElement>(null)
    const arrowModeRef = useRef<null | HTMLSelectElement>(null)
    const labelModeRef = useRef<null | HTMLSelectElement>(null)
    const labelTextRef = useRef<null | HTMLInputElement>(null)
    const cidFromRef = useRef<null | HTMLInputElement>(null)
    const cidToRef = useRef<null | HTMLInputElement>(null)

    const newVector = () => {
        const aVector: MoorhenVector = {
            coordsMode: "atoms",
            labelMode: "none",
            labelText: "vector label",
            drawMode: "cylinder",
            arrowMode: "none",
            xFrom: 0.0,
            yFrom: 0.0,
            zFrom: 0.0,
            xTo: 0.0,
            yTo: 0.0,
            zTo: 0.0,
            cidFrom: "",
            cidTo: "",
            molNoFrom: 0,
            molNoTo: 0,
            uniqueId: uuidv4(),
            vectorColour: {r:0,g:0,b:0},
            textColour: {r:0,g:0,b:0},
        }
        return aVector
    }

    interface RGBColour  {
        r: number;
        g: number;
        b: number;
    }

    const [theVector, setVector] = useState<MoorhenVector>(newVector())
    const [selectedOption, setSelectedOption] = useState<string>("new")
    const [coordsModeButtonState, setCoordsModeButtonState] = useState<string>("atoms")
    const [vectorColour, setVectorColour] = useState({r:0,g:0,b:0})

    const handleDelete = (evt: React.MouseEvent<HTMLElement> ) => {
        dispatch(removeVector(theVector))
        setSelectedOption("new")
    }

    const handleApply = (evt: React.MouseEvent<HTMLElement> ) => {
        if(vectorSelectRef.current.value!=="new"){
            dispatch(removeVector(theVector))
        }
        dispatch(addVector(theVector))
        setSelectedOption(theVector.uniqueId)
    }

    const handleVectorChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if(vectorSelectRef !== null && typeof vectorSelectRef !== 'function') {
            vectorSelectRef.current.value = evt.target.value
            if(vectorSelectRef.current.value==="new"){
                setSelectedOption("new")
                updateVector(newVector())
                if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = "cylinder"
                if(arrowModeRef !== null && typeof arrowModeRef !== 'function') arrowModeRef.current.value = "none"
                if(labelModeRef !== null && typeof labelModeRef !== 'function') labelModeRef.current.value = "none"
                setCoordsModeButtonState("atoms")
            } else {
                try {
                    const existingVector = vectorsList.find((element) => element.uniqueId===evt.target.value)
                    updateVector(existingVector)
                    setSelectedOption(existingVector.uniqueId)
                    if(drawModeRef !== null && typeof drawModeRef !== 'function') drawModeRef.current.value = existingVector.drawMode
                    if(arrowModeRef !== null && typeof arrowModeRef !== 'function') arrowModeRef.current.value =  existingVector.arrowMode
                    if(labelModeRef !== null && typeof labelModeRef !== 'function') labelModeRef.current.value =  existingVector.labelMode
                    setCoordsModeButtonState(existingVector.coordsMode)
                } catch(e) {
                }
            }
        }
    }

    const handleColorChange = (color: { r: number; g: number; b: number }) => {
        setVectorColour(color)
        updateVector({vectorColour:color})
    }

    const headerContent =  <Row style={{textAlign:'left'}}>
                            <Col sm={3}>
                            Choose vector
                            </Col>
                            <Form.Group  as={Col} className='mb-3'>
                                <FormSelect ref={vectorSelectRef} size="sm" onChange={handleVectorChange}>
                                <option selected={selectedOption==="new"} value="new">New vector</option>
                                {vectorsList.length>0 && vectorsList.map((vec,i) => {
                                    if(vec.coordsMode==="points") {
                                        return <option selected={selectedOption===vec.uniqueId} key={i} value={vec.uniqueId}>{vec.xFrom.toFixed(2)+" "+vec.yFrom.toFixed(2)+" "+vec.zFrom.toFixed(2)+" <--> "+vec.xTo.toFixed(2)+" "+vec.yTo.toFixed(2)+" "+vec.zTo.toFixed(2)}</option>
                                    } else if(vec.coordsMode==="atoms") {
                                        return <option selected={selectedOption===vec.uniqueId} key={i} value={vec.uniqueId}>{vec.cidFrom+" <--> "+vec.cidTo}</option>
                                    } else  {
                                        return <option selected={selectedOption===vec.uniqueId} key={i} value={vec.uniqueId}>{vec.cidFrom+" <--> "+vec.xTo.toFixed(2)+" "+vec.yTo.toFixed(2)+" "+vec.zTo.toFixed(2)}</option>
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

    const updateVector = ({
        coordsMode=undefined,
        labelMode=undefined,
        labelText=undefined,
        drawMode=undefined,
        arrowMode=undefined,
        xFrom=undefined,
        yFrom=undefined,
        zFrom=undefined,
        xTo=undefined,
        yTo=undefined,
        zTo=undefined,
        cidFrom=undefined,
        cidTo=undefined,
        molNoFrom=undefined,
        molNoTo=undefined,
        uniqueId=undefined,
        vectorColour=undefined,
        textColour=undefined,
    }) => {
        const newVector: MoorhenVector = {
            coordsMode: (coordsMode !== undefined) ? coordsMode : theVector.coordsMode,
            labelMode: (labelMode !== undefined) ? labelMode : theVector.labelMode,
            labelText: (labelText !== undefined) ? labelText : theVector.labelText,
            drawMode: (drawMode !== undefined) ? drawMode : theVector.drawMode,
            arrowMode: (arrowMode !== undefined) ? arrowMode : theVector.arrowMode,
            xFrom: (xFrom !== undefined) ? xFrom : theVector.xFrom,
            yFrom: (yFrom !== undefined) ? yFrom : theVector.yFrom,
            zFrom: (zFrom !== undefined) ? zFrom : theVector.zFrom,
            xTo: (xTo !== undefined) ? xTo : theVector.xTo,
            yTo: (yTo !== undefined) ? yTo : theVector.yTo,
            zTo: (zTo !== undefined) ? zTo : theVector.zTo,
            cidFrom: (cidFrom !== undefined) ? cidFrom : theVector.cidFrom,
            cidTo: (cidTo !== undefined) ? cidTo : theVector.cidTo,
            molNoFrom: (molNoFrom !== undefined) ? molNoFrom : theVector.molNoFrom,
            molNoTo: (molNoTo !== undefined) ? molNoTo : theVector.molNoTo,
            uniqueId: (uniqueId !== undefined) ? uniqueId : theVector.uniqueId,
            vectorColour: (vectorColour !== undefined) ? vectorColour : theVector.vectorColour,
            textColour: (textColour !== undefined) ? textColour : theVector.textColour,
        }
        setVector(newVector)
    }

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>, isModelTo: boolean) => {
        if(isModelTo)
            updateVector({molNoTo:parseInt(evt.target.value)})
        else
            updateVector({molNoFrom:parseInt(evt.target.value)})
    }

    const handleModeChange = ((event,type) => {
        setCoordsModeButtonState(type)
        updateVector({coordsMode:type as VectorsCoordMode})
    })

    const bodyContent = <>
                            <Card style={{marginBottom:'0.5rem'}}>
                            <Card.Body>
                            {headerContent}
                            <Row style={{textAlign:'left'}}>
                            <Col sm={3}>
                            Between
                            </Col>
                            <InputGroup as={Col} className='mb-3'>
                            <Form.Check
                              inline
                              label="Atoms"
                              name="vectortypegroup"
                              type="radio"
                              checked={coordsModeButtonState==="atoms"}
                              onChange={(e) => {handleModeChange(e,"atoms")}}
                            />
                            <Form.Check
                              inline
                              label="Points"
                              name="vectortypegroup"
                              type="radio"
                              checked={coordsModeButtonState==="points"}
                              onChange={(e) => {handleModeChange(e,"points")}}
                            />
                            <Form.Check
                              inline
                              label="An atom and a point"
                              name="vectortypegroup"
                              type="radio"
                              checked={coordsModeButtonState==="atompoint"}
                              onChange={(e) => {handleModeChange(e,"atompoint")}}
                            />
                            </InputGroup>
                            </Row>
                            </Card.Body>
                            </Card>
                            { (theVector.coordsMode === "atoms" || theVector.coordsMode === "atompoint") &&
                            <Card style={{marginBottom:'0.5rem'}}>
                            <Card.Body>
                            <Row style={{textAlign:'left', marginBottom:"0.5rem" }}>
                            <Col sm={3}>
                            From atom
                            </Col>
                            </Row>
                            <Row style={{textAlign:'left'}}>
                            <Col sm={3}>
                            Molecule
                            </Col>
                            <Col>
                            <MoorhenMoleculeSelect label={null} molecules={molecules} height="3rem" margin="0rem" onChange={(evt) => handleModelChange(evt, false)} />
                            </Col>
                            </Row>
                            <Row style={{textAlign:'left'}}>
                            <Col sm={3}>
                            selection
                            </Col>
                            <Form.Group as={Col} className='mb-3' controlId="cidFrom">
                                <Form.Control style={{height:"2rem"}} ref={cidFromRef} type="text" value={theVector.cidFrom} onChange={(evt) => {
                                    updateVector({cidFrom:evt.target.value})
                            }} />
                            </Form.Group>
                            </Row>
                            </Card.Body>
                            </Card>
                            }
                            { theVector.coordsMode === "atoms" &&
                            <Card style={{marginBottom:'0.5rem'}}>
                            <Card.Body>
                            <Row style={{textAlign:'left', marginBottom:"0.5rem" }}>
                            <Col sm={3}>
                            To atom
                            </Col>
                            </Row>
                            <Row style={{textAlign:'left'}}>
                            <Col sm={3}>
                            Molecule
                            </Col>
                            <Col style={{verticalAlign:"top"}}>
                            <MoorhenMoleculeSelect label={null} molecules={molecules} height="3rem" margin="0rem" onChange={(evt) => handleModelChange(evt, true)} />
                            </Col>
                            </Row>
                            <Row style={{textAlign:'left'}}>
                            <Col sm={3}>
                            selection
                            </Col>
                            <Form.Group as={Col} className='mb-3' controlId="cidTo">
                                <Form.Control style={{height:"2rem"}} ref={cidToRef} type="text" value={theVector.cidTo} onChange={(evt) => {
                                    updateVector({cidTo:evt.target.value})
                                }} />
                            </Form.Group>
                            </Row>
                            </Card.Body>
                            </Card>
                            }
                            { theVector.coordsMode === "points" &&
                            <Card style={{marginBottom:'0.5rem'}}>
                            <Card.Body>
                            <Row style={{textAlign:'left', marginBottom:"0.5rem" }}>
                            <Col sm={3}>
                            From point
                            </Col>
                            </Row>
                            <Row>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>x:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={theVector.xFrom} type="number" onChange={(evt) => {
                                    try {
                                        const dum = Number(evt.target.value)
                                        updateVector({xFrom:Number(evt.target.value)})
                                    } catch(e) {
                                    }
                                }} /></Col>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>y:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={theVector.yFrom} type="number" onChange={(evt) => {
                                    try {
                                        const dum = Number(evt.target.value)
                                        updateVector({yFrom:Number(evt.target.value)})
                                    } catch(e) {
                                    }
                                }} /></Col>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>z:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={theVector.zFrom} type="number" onChange={(evt) => {
                                    try {
                                        const dum = Number(evt.target.value)
                                        updateVector({zFrom:Number(evt.target.value)})
                                    } catch(e) {
                                    }
                                }} /></Col>
                            </Row>
                            </Card.Body>
                            </Card>
                            }
                            { (theVector.coordsMode === "points" || theVector.coordsMode === "atompoint") &&
                            <Card style={{marginBottom:'0.5rem'}}>
                            <Card.Body>
                            <Row style={{textAlign:'left', marginBottom:"0.5rem" }}>
                            <Col sm={3}>
                            To point
                            </Col>
                            </Row>
                            <Row>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>x:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={theVector.xTo} type="number" onChange={(evt) => {
                                    try {
                                        const dum = Number(evt.target.value)
                                        updateVector({xTo:Number(evt.target.value)})
                                    } catch(e) {
                                    }
                                }} /></Col>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>y:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={theVector.yTo} type="number" onChange={(evt) => {
                                    try {
                                        const dum = Number(evt.target.value)
                                        updateVector({yTo:Number(evt.target.value)})
                                    } catch(e) {
                                    }
                                }} /></Col>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>z:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={theVector.zTo} type="number" onChange={(evt) => {
                                    try {
                                        const dum = Number(evt.target.value)
                                        updateVector({zTo:Number(evt.target.value)})
                                    } catch(e) {
                                    }
                                }} /></Col>
                            </Row>
                            </Card.Body>
                            </Card>
                            }
                            <Card style={{marginBottom:'0.5rem'}}>
                            <Card.Body>
                            <Row style={{textAlign:'left'}}>
                            <Col sm={3}>
                            Draw mode
                            </Col>
                            <Form.Group as={Col} className='mb-3'>
                                <FormSelect size="sm" ref={drawModeRef} defaultValue="cylinder" onChange={(evt) => {
                                    if (drawModeRef !== null && typeof drawModeRef !== 'function') {
                                        drawModeRef.current.value = evt.target.value
                                        updateVector({drawMode:evt.target.value as VectorsDrawMode})
                                    }
                                }}>
                                <option value="cylinder">Cylinder</option>
                                <option value="dashedcylinder">Dashed cylinder</option>
                                </FormSelect>
                            </Form.Group>
                            </Row>
                            <Row style={{textAlign:'left'}}>
                            <Col sm={3}>
                            Arrow mode
                            </Col>
                            <Form.Group as={Col} className='mb-3'>
                                <FormSelect size="sm" ref={arrowModeRef} defaultValue="none" onChange={(evt) => {
                                    if (arrowModeRef !== null && typeof arrowModeRef !== 'function') {
                                        arrowModeRef.current.value = evt.target.value
                                        updateVector({arrowMode:evt.target.value as VectorsArrowMode})
                                    }
                                }}>
                                <option value="none">None</option>
                                <option value="end">End</option>
                                <option value="start">Start</option>
                                <option value="both">Both</option>
                                </FormSelect>
                            </Form.Group>
                            </Row>
                            <Row style={{textAlign:'left'}}>
                            <Col sm={3}>
                            Vector colour
                            </Col>
                            <Col className="mb-3">
                            <MoorhenColourPicker
                                colour={[theVector.vectorColour.r, theVector.vectorColour.g, theVector.vectorColour.b]}
                                setColour={(color => {
                                   handleColorChange({ r: color[0], g: color[1], b: color[2] });
                                })}
                                position="bottom"
                                tooltip="Change vector colour"
                            />
                            </Col>
                            </Row>
                            <Row style={{textAlign:'left'}}>
                            <Col sm={3}>
                            Label mode
                            </Col>
                            <Form.Group  as={Col} className='mb-3'>
                                <FormSelect size="sm" ref={labelModeRef} defaultValue="none" onChange={(evt) => {
                                    if (labelModeRef !== null && typeof labelModeRef !== 'function') {
                                        labelModeRef.current.value = evt.target.value
                                        updateVector({labelMode:evt.target.value as VectorsLabelMode})
                                    }
                                }}>
                                <option value="none">None</option>
                                <option value="end">End</option>
                                <option value="start">Start</option>
                                <option value="middle">Middle</option>
                                </FormSelect>
                            </Form.Group>
                            </Row>
                            {theVector.labelMode !== "none" &&
                            <Row style={{textAlign:'left'}}>
                            <Col sm={3}>
                            Label text
                            </Col>
                            <Form.Group  as={Col} className='mb-3' controlId="cidTo">
                                <Form.Control ref={labelTextRef} type="text" value={theVector.labelText} onChange={(evt) => {
                                    updateVector({labelText:evt.target.value})
                                }} />
                            </Form.Group>
                            </Row>
                            }
                            </Card.Body>
                            </Card>
                        </>

    return <MoorhenDraggableModalBase
                modalId={modalKeys.VECTORS}
                left={width / 6}
                top={height / 3}
                minHeight={50}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(70, height)}
                maxWidth={convertViewtoPx(90, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='Vectors'
                resizeNodeRef={resizeNodeRef}
                body={bodyContent}
                footer={footer}
            />
}
