import { MenuItem } from "@mui/material";
import { useEffect, useState, useMemo } from "react";
import { Card, Form, Button, Row, Col, DropdownButton } from "react-bootstrap";
import { doDownload } from '../utils/BabyGruUtils';
import { DownloadOutlined, UndoOutlined, RedoOutlined, CenterFocusWeakOutlined, ExpandMoreOutlined, ExpandLessOutlined } from '@mui/icons-material';
import { BabyGruSequenceViewer } from "./BabyGruSequenceViewer";
import { BabyGruDeleteDisplayObjectMenuItem, BabyGruRenameDisplayObjectMenuItem } from "./BabyGruMenuItem";

export const BabyGruMoleculeCard = (props) => {
    const [showState, setShowState] = useState({})
    const [selectedResidues, setSelectedResidues] = useState(null);
    const [clickedResidue, setClickedResidue] = useState(null);
    const [currentName, setCurrentName] = useState(props.molecule.name);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [dropdownIsShown, setDropdownIsShown] = useState(false)
    const [popoverIsShown, setPopoverIsShown] = useState(false)

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
        props.molecule.displayObjects.CBs.length,
    ])

    useMemo(() => {
        if (currentName == "") {
            return
        }
        props.molecule.name = currentName

    }, [currentName]);

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
        if (clickedResidue && selectedResidues) {
            createNewFragmentMolecule()
        }
    }

    return <Card className="px-0" style={{ marginBottom: '0.5rem', padding: '0' }} key={props.molecule.coordMolNo}>
        <Card.Header>
            <Row className='align-items-center'>
                <Col style={{ display: 'flex', justifyContent: 'left' }}>
                    {`#${props.molecule.coordMolNo} Mol. ${props.molecule.name}`}
                </Col>
                <Col style={{ display: 'flex', justifyContent: 'right' }}>
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
                        onClick={() => {
                            setIsCollapsed(!isCollapsed)
                        }}>
                        {isCollapsed ? < ExpandMoreOutlined/> : <ExpandLessOutlined />}
                    </Button>
                    <DropdownButton 
                            size="sm" 
                            variant="outlined" 
                            autoClose={popoverIsShown ? false : 'outside'} 
                            show={props.currentDropdownMolNo === props.molecule.coordMolNo} 
                            onToggle={() => {props.molecule.coordMolNo !== props.currentDropdownMolNo ? props.setCurrentDropdownMolNo(props.molecule.coordMolNo) : props.setCurrentDropdownMolNo(-1)}}>
                        <MenuItem variant="success" onClick={handleCopyFragment}>Copy selected residues into fragment</MenuItem>
                        <BabyGruRenameDisplayObjectMenuItem setPopoverIsShown={setPopoverIsShown} setCurrentName={setCurrentName} item={props.molecule} />
                        <BabyGruDeleteDisplayObjectMenuItem setPopoverIsShown={setPopoverIsShown} glRef={props.glRef} setItemList={props.setMolecules} itemList={props.molecules} item={props.molecule}/>
                    </DropdownButton>
                </Col>
            </Row>
        </Card.Header>
        <Card.Body style={{display: isCollapsed ? 'none' : ''}}>
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
                                }} />
                        })
                        }
                    </div>
                </Col>
            </Row>
                <hr></hr>
                <Row style={{ height: '100%' }}>
                    <Col>
                        <Form.Check checked={props.molecule === props.activeMolecule}
                            style={{margin:'0'}}
                            inline
                            label={`Rotate/Translate`}
                            type="checkbox"
                            variant="outline"
                            onChange={(e) => {
                                if (e.target.checked) {
                                    props.setActiveMolecule(props.molecule)
                                } else {
                                    props.setActiveMolecule(null)
                                }
                            }}
                        />
                    </Col>
                </Row>
            <hr></hr>
            <Row style={{ height: '100%' }}>
                <Col>
                    <div>
                        <b>Sequences</b>
                    </div>
                    {props.molecule.cachedAtoms.sequences &&
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
