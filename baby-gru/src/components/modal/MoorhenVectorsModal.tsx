import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen"
import { useEffect, useRef, createRef, useCallback, useMemo, useState } from "react"
import { Form, Row, Col, Stack, Card, Container, ListGroup, Button, Table, FormSelect } from "react-bootstrap"
import { convertRemToPx, convertViewtoPx} from '../../utils/utils'
import { useSelector, useDispatch } from "react-redux"
import { modalKeys } from "../../utils/enums"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { FormControlLabel, FormControl, RadioGroup, Radio, Slider, TextField, Menu, MenuItem, Accordion, AccordionSummary, AccordionDetails, Popover, StyledEngineProvider, IconButton, Tabs, Tab, Tooltip } from '@mui/material';

type VectorsCoordMode = 'atoms'|'points'|'atompoint';
type VectorsLabelMode = 'none'|'start'|'end'|'middle';
type VectorsDrawMode = 'cylinder'|'dashedcylinder';
type VectorsArrowMode = 'none'|'start'|'end'|'both';
interface MoorhenVector  {
    coordsMode: VectorsCoordMode;
    labelMode: VectorsLabelMode;
    drawMode: VectorsDrawMode;
    arrowMode: VectorsArrowMode;
    xFrom: number;
    yFrom: number;
    zFrom: number;
    xTo: number;
    yTo: number;
    zTo: number;
    cidFrom: string;
    cidTo: string;
}

export const MoorhenVectorsModal = (props: moorhen.CollectedProps) => {

    const resizeNodeRef = useRef<HTMLDivElement>(null)

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const dispatch = useDispatch()

    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const moleculeFromSelectRef = useRef<null | HTMLSelectElement>(null)
    const moleculeToSelectRef = useRef<null | HTMLSelectElement>(null)
    const coordsModeRef = useRef<null | HTMLSelectElement>(null)
    const drawModeRef = useRef<null | HTMLSelectElement>(null)
    const lablesModeRef = useRef<null | HTMLSelectElement>(null)
    const cidFromRef = useRef<null | HTMLInputElement>(null)
    const cidToRef = useRef<null | HTMLInputElement>(null)
    const [cidFrom, setCidFrom] = useState<string>("")
    const [cidTo, setCidTo] = useState<string>("")
    const [coordsMode, setCoordsMode] = useState<VectorsCoordMode>("atoms")
    const [labelMode, setLabelMode] = useState<VectorsLabelMode>("none")
    const [drawMode, setDrawMode] = useState<VectorsDrawMode>("cylinder")
    const [arrowMode, setArrowMode] = useState<VectorsArrowMode>("none")
    const xFromRef = useRef<null | HTMLInputElement>(null)
    const yFromRef = useRef<null | HTMLInputElement>(null)
    const zFromRef = useRef<null | HTMLInputElement>(null)
    const xToRef = useRef<null | HTMLInputElement>(null)
    const yToRef = useRef<null | HTMLInputElement>(null)
    const zToRef = useRef<null | HTMLInputElement>(null)
    const [xFrom, setXFrom] = useState<string>(null)
    const [yFrom, setYFrom] = useState<string>(null)
    const [zFrom, setZFrom] = useState<string>(null)
    const [xTo, setXTo] = useState<string>(null)
    const [yTo, setYTo] = useState<string>(null)
    const [zTo, setZTo] = useState<string>(null)

    const defaultValue = "atoms"

    const bodyContent = <>

                            <Form.Group style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>
                            <Form.Label style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>Between</Form.Label>
                                <FormSelect size="sm" ref={coordsModeRef} defaultValue={defaultValue} onChange={(evt) => {
                                    if (coordsModeRef !== null && typeof coordsModeRef !== 'function') {
                                        coordsModeRef.current.value = evt.target.value
                                        setCoordsMode(evt.target.value as VectorsCoordMode)
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
                            <MoorhenMoleculeSelect ref={moleculeFromSelectRef} molecules={molecules} width='20rem'/>
                            <Form.Group className='moorhen-form-group' controlId="cidFrom">
                                <Form.Label>selection</Form.Label>
                                <Form.Control ref={cidFromRef} type="text" value={cidFrom} onChange={(e) => { setCidFrom(e.target.value) }} />
                            </Form.Group>
                            </>
                            }
                            { coordsMode === "atoms" &&
                            <>
                            <div style={{display:'flex', alignItems:'start', textAlign:'left'}}>To atom</div>
                            <MoorhenMoleculeSelect ref={moleculeToSelectRef} molecules={molecules} width='20rem'/>
                            <Form.Group className='moorhen-form-group' controlId="cidTo">
                                <Form.Label>selection</Form.Label>
                                <Form.Control ref={cidToRef} type="text" value={cidTo} onChange={(e) => { setCidTo(e.target.value) }} />
                            </Form.Group>
                            </>
                            }
                            { coordsMode === "points" &&
                            <>
                            <div style={{display:'flex', alignItems:'start', textAlign:'left'}}>From point</div>
                            <Row>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>x:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={xFrom} ref={xFromRef} type="number" onChange={(e) => { setXFrom(e.target.value) }} /></Col>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>y:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={yFrom} ref={yFromRef} type="number" onChange={(e) => { setYFrom(e.target.value) }} /></Col>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>z:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={zFrom} ref={zFromRef} type="number" onChange={(e) => { setZFrom(e.target.value) }} /></Col>
                            </Row>
                            </>
                            }
                            { (coordsMode === "points" || coordsMode === "atompoint") &&
                            <>
                            <div style={{display:'flex', alignItems:'start', textAlign:'left'}}>To point</div>
                            <Row>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>x:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={xTo} ref={xToRef} type="number" onChange={(e) => { setXTo(e.target.value) }} /></Col>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>y:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={yTo} ref={yToRef} type="number" onChange={(e) => { setYTo(e.target.value) }} /></Col>
                                <Col xs={1} sm md lg={1}><div style={{display:'flex', alignItems:'start', textAlign:'left'}}>z:</div></Col>
                                <Col xs={2} sm md lg={3}><Form.Control value={zTo} ref={zToRef} type="number" onChange={(e) => { setZTo(e.target.value) }} /></Col>
                            </Row>
                            </>
                            }
                            <Form.Group style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>
                            <Form.Label style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>Draw mode</Form.Label>
                                <FormSelect size="sm" ref={drawModeRef} defaultValue={defaultValue} onChange={(evt) => {
                                    if (drawModeRef !== null && typeof drawModeRef !== 'function') {
                                        drawModeRef.current.value = evt.target.value
                                        setDrawMode(evt.target.value as VectorsDrawMode)
                                    }
                                }}>
                                <option value="cylinder">Cylinder</option>
                                <option value="dashedcylinder">Dashed cylinder</option>
                                </FormSelect>
                            </Form.Group>
                            <Form.Group style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>
                            <Form.Label style={{ display:'flex', alignItems:'start', textAlign:'left', padding: '0.5rem' }}>Arrow mode</Form.Label>
                                <FormSelect size="sm" ref={drawModeRef} defaultValue={defaultValue} onChange={(evt) => {
                                    if (drawModeRef !== null && typeof drawModeRef !== 'function') {
                                        drawModeRef.current.value = evt.target.value
                                        setArrowMode(evt.target.value as VectorsArrowMode)
                                    }
                                }}>
                                <option value="none">None</option>
                                <option value="end">End</option>
                                <option value="start">Start</option>
                                <option value="both">Both</option>
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
