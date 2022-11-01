import { useEffect, Fragment, useState, createRef, useCallback, useRef } from "react";
import { Card, Form, Button, Row, Col, FormCheck } from "react-bootstrap";
import { cootCommand, doDownload } from '../BabyGruUtils';
import { DownloadOutlined, UndoOutlined, RedoOutlined, CenterFocusWeakOutlined, MoreVertOutlined } from '@mui/icons-material';
import { BabyGruSequenceViewer } from "./BabyGruSequenceViewer";
import BabyGruSlider from "./BabyGruSlider";

export const BabyGruMoleculeCard = (props) => {
    const [showState, setShowState] = useState({})
    const [selectedResidues, setSelectedResidues] = useState(null);
    const [clickedResidue, setClickedResidue] = useState(null);

    useEffect(() => {
        const initialState = {}
        Object.keys(props.molecule.displayObjects).forEach(key => {
            initialState[key] = props.molecule.displayObjects[key].length > 0
                && props.molecule.displayObjects[key][0].visible
        })
        setShowState(initialState)
    }, [
        props.molecule.displayObjects.bonds.length,
        props.molecule.displayObjects.sticks.length,
        props.molecule.displayObjects.ribbons.length,
        props.molecule.displayObjects.rama.length,
        props.molecule.displayObjects.rotamer.length,
    ])

    useEffect(() => {
        if (!clickedResidue) {
            return
        }

        props.molecule.centreOn(props.glRef, clickedResidue)

    }, [clickedResidue]);

    return <Card className="px-0"  style={{marginBottom:'0.5rem', padding:'0'}} key={props.molecule.coordMolNo}>
        <Card.Header>
            <Row className='align-items-center'>
                <Col style={{display:'flex', justifyContent:'left'}}>
                    {`#${props.molecule.coordMolNo} Mol. ${props.molecule.name}`}
                </Col>
                <Col style={{display:'flex', justifyContent:'right'}}>
                    <Button size="sm" variant="outlined"
                        onClick={() => {
                            props.commandCentre.current.cootCommand( {
                                returnType: "status",
                                command: "undo",
                                commandArgs: [props.molecule.coordMolNo]
                            }).then(_ => {
                                props.molecule.setAtomsDirty(true)
                                props.molecule.redraw(props.glRef)
                            })
                        }}><UndoOutlined /></Button>
                    <Button size="sm" variant="outlined"
                        onClick={() => {
                            props.commandCentre.current.cootCommand({
                                returnType: "status",
                                command: "redo",
                                commandArgs: [props.molecule.coordMolNo]
                            }).then(_ => {
                                props.molecule.setAtomsDirty(true)
                                props.molecule.redraw(props.glRef)
                            })
                        }}><RedoOutlined /></Button>
                    <Button size="sm" variant="outlined"
                        onClick={() => {props.molecule.centreOn(props.glRef)}}>
                        <CenterFocusWeakOutlined />
                    </Button>
                    <Button size="sm" variant="outlined"
                        onClick={() => {
                            props.molecule.getAtoms()
                                .then(reply => {
                                    doDownload([reply.data.result.pdbData], `${props.molecule.name}`)
                                })
                        }}>
                        <DownloadOutlined />
                    </Button>
                    <Button size="sm" variant="outlined"
                        onClick={() => {console.log('More quick actions button not implemented yet')}}>
                        <MoreVertOutlined />
                    </Button>
                </Col>
            </Row>
        </Card.Header>
        <Card.Body>
                <Row style={{ height: '100%' }}>
                    <Col> 
                    <div>
                        <b>Display Options</b>
                    </div>
                    <div>
                        {Object.keys(props.molecule.displayObjects).map(key => {
                                return <Form.Check
                                    inline
                                    label={`${key.substring(0, 3)}.`}
                                    feedbackTooltip={"Toggle on"}
                                    name={key}
                                    type="checkbox"
                                    variant="outline"
                                    checked={showState[key]}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            props.molecule.show(key, props.glRef)
                                            const changedState = { ...showState }
                                            changedState[key] = true
                                            setShowState(changedState)
                                        }
                                        else {
                                            props.molecule.hide(key, props.glRef)
                                            const changedState = { ...showState }
                                            changedState[key] = false
                                            setShowState(changedState)
                                        }
                                    }}/>
                                })
                            }
                    </div>
                    </Col>
                </Row>
                <hr></hr>
                <Row style={{ height: '100%' }}>
                    <Col>
                        <div>
                            <b>Sequences</b>
                        </div>
                        {
                            props.molecule.cachedAtoms.sequences.map(
                                sequence => (
                                    <BabyGruSequenceViewer 
                                        sequence={sequence}
                                        molecule={props.molecule}
                                        glRef={props.glRef}
                                        clickedResidue={clickedResidue}
                                        setClickedResidue={setClickedResidue}
                                        selectedResidues={selectedResidues}
                                        setSelectedResidues={setSelectedResidues}
                                    />
                                )
                            )
                        }
                    </Col>
                </Row>
        </Card.Body>
    </Card >
}

const BabyGruMapCard = (props) => {
    const [webMGContour, setWebMGContour] = useState(false)
    const [cootContour, setCootContour] = useState(true)
    const nextOrigin = createRef([])
    const busyContouring = createRef(false)

    const handleOriginCallback = useCallback(e => {
        nextOrigin.current = [...e.detail.map(coord => -coord)]
        if (props.map.cootContour) {
            if (busyContouring.current) {
                console.log('Skipping originChanged ', nextOrigin.current)
            }
            else {
                busyContouring.current = true
                props.map.doCootContour(props.glRef.current,
                    ...nextOrigin.current,
                    props.mapRadius,
                    props.map.contourLevel)
                    .then(result => {
                        busyContouring.current = false
                    })
            }
        }
    }, [props.map.contourLevel, props.mapRadius])

    const handleContourLevelCallback = useCallback(e => {
        nextOrigin.current = [...e.detail.map(coord => -coord)]
        if (props.map.cootContour) {
            if (busyContouring.current) {
                console.log('Skipping originChanged ', nextOrigin.current)
            }
            else {
                busyContouring.current = true
                props.map.doCootContour(props.glRef.current,
                    ...nextOrigin.current,
                    props.mapRadius,
                    props.map.contourLevel)
                    .then(result => {
                        busyContouring.current = false
                    })
            }
        }
    }, [props.map.contourLevel, props.mapRadius])


    useEffect(() => {
        document.addEventListener("originChanged", handleOriginCallback);
        document.addEventListener("contourLevelChanged", handleContourLevelCallback);
        return () => {
            document.removeEventListener("originChanged", handleOriginCallback);
            document.removeEventListener("contourLevelChanged", handleContourLevelCallback);
        };
    }, [handleOriginCallback]);

    useEffect(() => {
        setWebMGContour(props.map.webMGContour)
        setCootContour(props.map.cootContour)
    }, [])

    useEffect(() => {
        setWebMGContour(props.map.webMGContour)
        setCootContour(props.map.cootContour)
        if (props.map.cootContour) {
            busyContouring.current = true
            props.map.doCootContour(props.glRef.current,
                ...props.glRef.current.origin.map(coord => -coord),
                props.mapRadius,
                props.map.contourLevel)
                .then(result => {
                    busyContouring.current = false
                })
        }
    }, [props.mapRadius, props.map.contourLevel])

    return <Card className="px-0"  style={{marginBottom:'0.5rem', padding:'0'}} key={props.map.mapMolNo}>
        <Card.Header>
            <Row className='align-items-center'>
            <Col style={{display:'flex', justifyContent:'left'}}>
                    {`#${props.map.mapMolNo} Map ${props.map.name}`}
                </Col>
                <Col style={{display:'flex', justifyContent:'right'}}>
                    <Button size="sm" variant="outlined"
                        onClick={() => {
                            props.map.getMap()
                                .then(reply => {
                                    doDownload([reply.data.result.mapData],
                                        `${props.map.name.replace('.mtz', '.map')}`
                                    )
                                })
                        }}>
                        <DownloadOutlined />
                    </Button>
                    <Button size="sm" variant="outlined"
                        onClick={() => {console.log('More quick actions button not implemented yet')}}>
                        <MoreVertOutlined />
                    </Button>
                </Col>
            </Row>
        </Card.Header>
        <Card.Body>
            <Form.Check checked={props.map === props.activeMap}
                        inline
                        label={'Active'}
                        name={`setActiveMap ${props.map.mapMolNo}`}
                        type="checkbox"
                        variant="outline"
                        onChange={(e) => {
                            if (e.target.checked) {
                                props.setActiveMap(props.map)
                            }
                        }}
            />
            <FormCheck  checked={webMGContour}
                        inline
                        label={'WC'}
                        name={`setWC ${props.map.mapMolNo}`}
                        type="checkbox"
                        variant="outline"
                        onChange={(newState) => {
                            if (newState.target.checked && !webMGContour) {
                                props.map.makeWebMGLive(props.glRef.current)
                                setWebMGContour(true)
                            }
                            else if (!newState.target.checked && webMGContour) {
                                props.map.makeWebMGUnlive(props.glRef.current)
                                setWebMGContour(false)
                            }
                }}
            />
            <FormCheck  checked={cootContour}
                        inline
                        label={'CC'}
                        name={`setCC ${props.map.mapMolNo}`}
                        type="checkbox"
                        variant="outline"
                        onChange={(newState) => {
                            if (newState.target.checked && !cootContour) {
                                props.map.makeCootLive(props.glRef.current, props.mapRadius)
                                setCootContour(true)
                            } 
                            else if (!newState.target.checked && cootContour) {
                                props.map.makeCootUnlive(props.glRef.current)
                                setCootContour(false)
                            }
                }} 
            />
        </Card.Body>
    </Card >
    }


export const BabyGruDisplayObjects = (props) => {

    let displayData = [];
    // TODO: Concatenate molecules and maps, sort them by coordMolNo and then push them in that order...
    if (props.molecules.length!=0) {
        props.molecules.forEach(molecule => displayData.push(
            <BabyGruMoleculeCard 
                index={molecule.coordMolNo}
                molecule={molecule}
                glRef={props.glRef}
                commandCentre={props.commandCentre}>
            </BabyGruMoleculeCard>
            )
        )
    } 
    
    if (props.maps.length!=0) {
        props.maps.forEach(map => displayData.push(
            <BabyGruMapCard {...props} index={map.mapMolNo} mapRadius={props.mapRadius} map={map}/>
        ))
    }   

    displayData.sort((a,b) => (a.props.index > b.props.index) ? 1 : ((b.props.index > a.props.index) ? -1 : 0))

    return <Fragment>
                {displayData}
            </Fragment>
}

