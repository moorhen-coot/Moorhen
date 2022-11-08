import { useEffect, useState, useRef } from "react";
import { Card, Form, Button, Row, Col, Dropdown, DropdownButton, Modal } from "react-bootstrap";
import { doDownload } from '../BabyGruUtils';
import { DownloadOutlined, UndoOutlined, RedoOutlined, CenterFocusWeakOutlined } from '@mui/icons-material';
import { BabyGruSequenceViewer } from "./BabyGruSequenceViewer";

export const BabyGruMoleculeCard = (props) => {
    const [showState, setShowState] = useState({})
    const [selectedResidues, setSelectedResidues] = useState(null);
    const [clickedResidue, setClickedResidue] = useState(null);
    const [moleculeName, setMoleculeName] = useState(props.molecule.name);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const newNameInputRef = useRef();

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

    const handleCopyFragment = () => {
        async function createNewFragmentMolecule() {
            const newMolecule = await props.molecule.copyFragment(clickedResidue.chain, selectedResidues[0], selectedResidues[1], props.glRef)
            props.setMolecules([...props.molecules, newMolecule])         
        }
        
        // TODO: Test that residue start and residue end are valid (i.e. not missing from the structure)
        if(clickedResidue && selectedResidues){
            createNewFragmentMolecule()
        }
    }

    const handleDeleteMolecule = () => {
        let newMoleculesList = props.molecules.filter(molecule => molecule.coordMolNo !== props.molecule.coordMolNo)
        props.setMolecules(newMoleculesList)
        props.molecule.delete(props.glRef);
    }

    const handleMoleculeRename = () => {
        let newName = newNameInputRef.current.value
        setShowRenameModal(false)
        if (newName=="") {
            return
        }
        props.molecule.name = newName
        setShowRenameModal(false)
        setMoleculeName(newName)
    }

    return <Card className="px-0"  style={{marginBottom:'0.5rem', padding:'0'}} key={props.molecule.coordMolNo}>
            <Modal show={showRenameModal} onHide={handleMoleculeRename}>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3" controlId="renameMoleculeNewNameInput">
                            <Form.Label>Rename Molecule</Form.Label>
                            <Form.Control 
                                ref={newNameInputRef}
                                name="newMoleculeName"
                                placeholder="New name"
                                autoFocus
                            />
                        </Form.Group>
                    </Form>
                <div>
                    <Button variant="secondary" onClick={() => {setShowRenameModal(false)}}>
                        Close
                    </Button>
                    <Button style={{marginLeft:'0.2rem'}} variant="primary" onClick={handleMoleculeRename}>
                        Rename
                    </Button>
                </div>
            </Modal.Body>
        </Modal>
        <Card.Header>
            <Row className='align-items-center'>
                <Col style={{display:'flex', justifyContent:'left'}}>
                    {`#${props.molecule.coordMolNo} Mol. ${moleculeName}`}
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
                                    doDownload([reply.data.result.pdbData], `${moleculeName}`)
                                })
                        }}>
                        <DownloadOutlined />
                    </Button>
                    <DropdownButton size="sm" variant="outlined">
                        <Dropdown.Item as="button" onClick={handleCopyFragment}>Copy selected residues into fragment</Dropdown.Item>
                        <Dropdown.Item as="button" onClick={handleDeleteMolecule}>Delete molecule</Dropdown.Item>
                        <Dropdown.Item as="button" onClick={() => {setShowRenameModal(true)}}>Rename molecule</Dropdown.Item>
                    </DropdownButton>
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