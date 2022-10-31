import { useEffect, Fragment, useState } from "react";
import { Card, Form, Button, Row, Col } from "react-bootstrap";
import { cootCommand, doDownload } from '../BabyGruUtils';
import { DownloadOutlined, UndoOutlined, RedoOutlined, DeleteOutlined, FitScreenOutlined } from '@mui/icons-material';

export const BabyGruMoleculeUI = (props) => {
    const [showState, setShowState] = useState({})

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

    return <Card className="px-0" style={{ marginTop: '0.5rem', padding: '0' }} key={props.molecule.coordMolNo}>
        <Card.Header>
            <Row className='align-items-center'>
                <Col>
                    {`#${props.molecule.coordMolNo} Mol. ${props.molecule.name}`}
                </Col>
                <Col>
                    <Button size="sm" variant="outlined"
                        onClick={() => {
                            props.commandCentre.current.cootCommand({
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
                        onClick={() => { props.molecule.centreOn(props.glRef) }}>
                        <FitScreenOutlined />
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
                        onClick={() => { console.log('Molecule deletion not implemented yet') }}>
                        <DeleteOutlined />
                    </Button>
                </Col>
            </Row>
        </Card.Header>
        <Card.Body>
            {
                Object.keys(props.molecule.displayObjects).map(key => {
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
                        }}
                    />
                })
            }
        </Card.Body>
    </Card >
}

export const BabyGruMolecules = (props) => {
    useEffect(() => {
    }, [])

    let placeHolder = <Card className="px-0" style={{ marginTop: '0.5rem', padding: '0' }} >
        <Card.Body>
            No models loaded
        </Card.Body>
    </Card>

    let moleculesTableUI = placeHolder

    if (props.molecules.length != 0) {
        moleculesTableUI = props.molecules.map(molecule =>
            <BabyGruMoleculeUI key={molecule.coordMolNo}
                molecule={molecule}
                glRef={props.glRef}
                commandCentre={props.commandCentre}>
            </BabyGruMoleculeUI>
        )
    }

    return <Fragment>
        <Row><Col><div style={{ height: "1rem" }} /></Col></Row>
        {moleculesTableUI}
    </Fragment>
}

