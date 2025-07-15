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

export const MoorhenVectorsModal = (props: moorhen.CollectedProps) => {

    const resizeNodeRef = useRef<HTMLDivElement>(null)

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const vectorsList = useSelector((state: moorhen.State) => state.vectors.vectorsList)

    const dispatch = useDispatch()

    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const moleculeFromSelectRef = useRef<null | HTMLSelectElement>(null)
    const moleculeToSelectRef = useRef<null | HTMLSelectElement>(null)
    const coordsModeRef = useRef<null | HTMLSelectElement>(null)
    const drawModeRef = useRef<null | HTMLSelectElement>(null)
    const arrowModeRef = useRef<null | HTMLSelectElement>(null)
    const labelModeRef = useRef<null | HTMLSelectElement>(null)
    const cidFromRef = useRef<null | HTMLInputElement>(null)
    const cidToRef = useRef<null | HTMLInputElement>(null)
    const xFromRef = useRef<null | HTMLInputElement>(null)
    const yFromRef = useRef<null | HTMLInputElement>(null)
    const zFromRef = useRef<null | HTMLInputElement>(null)
    const xToRef = useRef<null | HTMLInputElement>(null)
    const yToRef = useRef<null | HTMLInputElement>(null)
    const zToRef = useRef<null | HTMLInputElement>(null)

    const [cidFrom, setCidFrom] = useState<string>("")
    const [cidTo, setCidTo] = useState<string>("")
    const [coordsMode, setCoordsMode] = useState<moorhen.VectorsCoordMode>("atoms")
    const [labelMode, setLabelMode] = useState<moorhen.VectorsLabelMode>("none")
    const [drawMode, setDrawMode] = useState<moorhen.VectorsDrawMode>("cylinder")
    const [arrowMode, setArrowMode] = useState<moorhen.VectorsArrowMode>("none")
    const [xFrom, setXFrom] = useState<string>("0.0")
    const [yFrom, setYFrom] = useState<string>("0.0")
    const [zFrom, setZFrom] = useState<string>("0.0")
    const [xTo, setXTo] = useState<string>("0.0")
    const [yTo, setYTo] = useState<string>("0.0")
    const [zTo, setZTo] = useState<string>("0.0")

    const [theVector, setVector] = useState<moorhen.MoorhenVector>({
        coordsMode: "atoms",
        labelMode: "none",
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
        uniqueId: uuidv4()
    })

    const defaultValue = "atoms"

    console.log(vectorsList)
    console.log(theVector)

    let headerContent = <></>

    if(vectorsList.length>0){
    } else {
    }

    const updateVector = ({
        coordsMode=undefined,
        labelMode=undefined,
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
    }) => {
        const newVector: moorhen.MoorhenVector = {
            coordsMode: (coordsMode !== undefined) ? coordsMode : theVector.coordsMode,
            labelMode: (labelMode !== undefined) ? labelMode : theVector.labelMode,
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
            uniqueId: theVector.uniqueId
        }
        setVector(newVector)
    }

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>, isModelTo: boolean) => {
        if(isModelTo)
            updateVector({molNoTo:parseInt(evt.target.value)})
        else
            updateVector({molNoFrom:parseInt(evt.target.value)})
    }

    const bodyContent = <>
                            {headerContent}

                            <Form.Group style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>
                            <Form.Label style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>Between</Form.Label>
                                <FormSelect size="sm" ref={coordsModeRef} defaultValue={defaultValue} onChange={(evt) => {
                                    if (coordsModeRef !== null && typeof coordsModeRef !== 'function') {
                                        coordsModeRef.current.value = evt.target.value
                                        setCoordsMode(evt.target.value as moorhen.VectorsCoordMode)
                                        updateVector({coordsMode:evt.target.value as moorhen.VectorsCoordMode})
                                    }
                                }}>
                                <option value="atoms">atoms</option>
                                <option value="points">points</option>
                                <option value="atompoint">an atom and a point</option>
                                </FormSelect>
                            </Form.Group>
                            { (coordsMode === "atoms" || coordsMode === "atompoint") &&
                            <>
                            <div style={{display:'flex', alignItems:'start', textAlign:'left'}}>From atom</div>
                            <MoorhenMoleculeSelect ref={moleculeFromSelectRef} molecules={molecules} width='20rem' onChange={(evt) => handleModelChange(evt, false)} />
                            <Form.Group className='moorhen-form-group' controlId="cidFrom">
                                <Form.Label>selection</Form.Label>
                                <Form.Control ref={cidFromRef} type="text" value={cidFrom} onChange={(evt) => { 
                                    setCidFrom(evt.target.value)
                                    updateVector({cidFrom:evt.target.value})
                            }} />
                            </Form.Group>
                            </>
                            }
                            { coordsMode === "atoms" &&
                            <>
                            <div style={{display:'flex', alignItems:'start', textAlign:'left'}}>To atom</div>
                            <MoorhenMoleculeSelect ref={moleculeToSelectRef} molecules={molecules} width='20rem' onChange={(evt) => handleModelChange(evt, true)} />
                            <Form.Group className='moorhen-form-group' controlId="cidTo">
                                <Form.Label>selection</Form.Label>
                                <Form.Control ref={cidToRef} type="text" value={cidTo} onChange={(evt) => {
                                    setCidTo(evt.target.value)
                                    updateVector({cidTo:evt.target.value})
                                }} />
                            </Form.Group>
                            </>
                            }
                            { coordsMode === "points" &&
                            <>
                            <div style={{display:'flex', alignItems:'start', textAlign:'left'}}>From point</div>
                            <Row>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>x:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={xFrom} ref={xFromRef} type="number" onChange={(evt) => {
                                    setXFrom(evt.target.value)
                                    try {
                                        const dum = Number(evt.target.value)
                                        updateVector({xFrom:Number(evt.target.value)})
                                    } catch(e) {
                                    }
                                }} /></Col>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>y:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={yFrom} ref={yFromRef} type="number" onChange={(evt) => {
                                    setYFrom(evt.target.value)
                                    try {
                                        const dum = Number(evt.target.value)
                                        updateVector({yFrom:Number(evt.target.value)})
                                    } catch(e) {
                                    }
                                }} /></Col>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>z:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={zFrom} ref={zFromRef} type="number" onChange={(evt) => {
                                    setZFrom(evt.target.value)
                                    try {
                                        const dum = Number(evt.target.value)
                                        updateVector({zFrom:Number(evt.target.value)})
                                    } catch(e) {
                                    }
                                }} /></Col>
                            </Row>
                            </>
                            }
                            { (coordsMode === "points" || coordsMode === "atompoint") &&
                            <>
                            <div style={{display:'flex', alignItems:'start', textAlign:'left'}}>To point</div>
                            <Row>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>x:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={xTo} ref={xToRef} type="number" onChange={(evt) => {
                                    setXTo(evt.target.value)
                                    try {
                                        const dum = Number(evt.target.value)
                                        updateVector({xTo:Number(evt.target.value)})
                                    } catch(e) {
                                    }
                                }} /></Col>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>y:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={yTo} ref={yToRef} type="number" onChange={(evt) => {
                                    setYTo(evt.target.value)
                                    try {
                                        const dum = Number(evt.target.value)
                                        updateVector({yTo:Number(evt.target.value)})
                                    } catch(e) {
                                    }
                                }} /></Col>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>z:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={zTo} ref={zToRef} type="number" onChange={(evt) => {
                                    setZTo(evt.target.value)
                                    try {
                                        const dum = Number(evt.target.value)
                                        updateVector({zTo:Number(evt.target.value)})
                                    } catch(e) {
                                    }
                                }} /></Col>
                            </Row>
                            </>
                            }
                            <Form.Group style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>
                            <Form.Label style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>Draw mode</Form.Label>
                                <FormSelect size="sm" ref={drawModeRef} defaultValue={defaultValue} onChange={(evt) => {
                                    if (drawModeRef !== null && typeof drawModeRef !== 'function') {
                                        drawModeRef.current.value = evt.target.value
                                        setDrawMode(evt.target.value as moorhen.VectorsDrawMode)
                                        updateVector({drawMode:evt.target.value as moorhen.VectorsDrawMode})
                                    }
                                }}>
                                <option value="cylinder">Cylinder</option>
                                <option value="dashedcylinder">Dashed cylinder</option>
                                </FormSelect>
                            </Form.Group>
                            <Form.Group style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>
                            <Form.Label style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>Arrow mode</Form.Label>
                                <FormSelect size="sm" ref={arrowModeRef} defaultValue={defaultValue} onChange={(evt) => {
                                    if (arrowModeRef !== null && typeof arrowModeRef !== 'function') {
                                        arrowModeRef.current.value = evt.target.value
                                        setArrowMode(evt.target.value as moorhen.VectorsArrowMode)
                                        updateVector({arrowMode:evt.target.value as moorhen.VectorsArrowMode})
                                    }
                                }}>
                                <option value="none">None</option>
                                <option value="end">End</option>
                                <option value="start">Start</option>
                                <option value="both">Both</option>
                                </FormSelect>
                            </Form.Group>
                            <Form.Group style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>
                            <Form.Label style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>Label mode</Form.Label>
                                <FormSelect size="sm" ref={labelModeRef} defaultValue={defaultValue} onChange={(evt) => {
                                    if (labelModeRef !== null && typeof labelModeRef !== 'function') {
                                        labelModeRef.current.value = evt.target.value
                                        setLabelMode(evt.target.value as moorhen.VectorsLabelMode)
                                        updateVector({labelMode:evt.target.value as moorhen.VectorsLabelMode})
                                    }
                                }}>
                                <option value="none">None</option>
                                <option value="end">End</option>
                                <option value="start">Start</option>
                                <option value="middle">Middle</option>
                                </FormSelect>
                            </Form.Group>
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
            />
}
