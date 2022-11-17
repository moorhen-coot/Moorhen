import { MenuItem } from "@mui/material";
import { useEffect, useState, useMemo, Fragment } from "react";
import { Card, Form, Button, Row, Col, DropdownButton } from "react-bootstrap";
import { doDownload, sequenceIsValid } from '../utils/BabyGruUtils';
import { UndoOutlined, RedoOutlined, CenterFocusWeakOutlined, ExpandMoreOutlined, ExpandLessOutlined, VisibilityOffOutlined, VisibilityOutlined, DownloadOutlined } from '@mui/icons-material';
import { BabyGruSequenceViewer } from "./BabyGruSequenceViewer";
import { BabyGruDeleteDisplayObjectMenuItem, BabyGruRenameDisplayObjectMenuItem } from "./BabyGruMenuItem";

export const BabyGruMoleculeCard = (props) => {
    const [showState, setShowState] = useState({})
    const [selectedResidues, setSelectedResidues] = useState(null);
    const [clickedResidue, setClickedResidue] = useState(null);
    const [currentName, setCurrentName] = useState(props.molecule.name);
    const [isCollapsed, setIsCollapsed] = useState(!props.defaultExpandDisplayCards);
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const [isVisible, setIsVisible] = useState(true)

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

    const handleVisibility = () => {
        if (isVisible) {
            Object.getOwnPropertyNames(props.molecule.displayObjects).forEach(key => {
                if (showState[key]) { props.molecule.hide(key, props.glRef) }
            })
            setIsVisible(false)
        } else {
            Object.getOwnPropertyNames(props.molecule.displayObjects).forEach(key => {
                if (showState[key]) { props.molecule.show(key, props.glRef) }
            })
            setIsVisible(true)
        }
        props.setCurrentDropdownMolNo(-1)
    }

    const handleDownload = async () => {
        let response = await props.molecule.getAtoms()
        doDownload([response.data.result.pdbData], `${props.molecule.name}`)
        props.setCurrentDropdownMolNo(-1)
    }

    const handleCopyFragment = () => {
        async function createNewFragmentMolecule() {
            const newMolecule = await props.molecule.copyFragment(clickedResidue.chain, selectedResidues[0], selectedResidues[1], props.glRef)
            props.changeMolecules({action:"Add", item:newMolecule})
        }

        // TODO: Test that residue start and residue end are valid (i.e. not missing from the structure)
        if (clickedResidue && selectedResidues) {
            createNewFragmentMolecule()
        }
        props.setCurrentDropdownMolNo(-1)
    }

    const handleUndo = async () => {
        await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: "undo",
            commandArgs: [props.molecule.molNo]
        })
        props.molecule.setAtomsDirty(true)
        props.molecule.redraw(props.glRef)
        props.setCurrentDropdownMolNo(-1)
    }

    const handleRedo = async () => {
        await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: "redo",
            commandArgs: [props.molecule.molNo]
        })
        props.molecule.setAtomsDirty(true)
        props.molecule.redraw(props.glRef)
        props.setCurrentDropdownMolNo(-1)
    }

    const handleCentering = () => {
        props.molecule.centreOn(props.glRef)
        props.setCurrentDropdownMolNo(-1)
    }

    const actionButtons = {
        1: {
            label: "Undo last action",
            compressed: () => {return (<MenuItem variant="success" onClick={handleUndo}>Undo last action</MenuItem>)},
            expanded: () => {return (<Button size="sm" variant="outlined" onClick={handleUndo}>
                                        <UndoOutlined />
                                     </Button>)}
        },
        2: {
            label: "Redo previous action",
            compressed: () => {return (<MenuItem variant="success" onClick={handleRedo}>Redo previous action</MenuItem>)},
            expanded: () => {return (<Button size="sm" variant="outlined" onClick={handleRedo}>
                                        <RedoOutlined />
                                     </Button>)}
        },
        3: {
            label: "Center on molecule", 
            compressed: () => {return (<MenuItem variant="success" onClick={handleCentering}>Center on molecule</MenuItem>)},
            expanded:  () => {return (<Button size="sm" variant="outlined" onClick={handleCentering}>
                                        <CenterFocusWeakOutlined />
                                      </Button>)}
        },
        4: {
            label: isVisible ? "Hide molecule" : "Show molecule", 
            compressed: () => {return (<MenuItem variant="success" onClick={handleVisibility}>{isVisible ? "Hide molecule" : "Show molecule"}</MenuItem>)},
            expanded: () => {return (<Button size="sm" variant="outlined" onClick={handleVisibility}>
                                        {isVisible ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                                      </Button>)}
        },
        5: {
            label: "Download Molecule", 
            compressed: () => {return (<MenuItem variant="success" onClick={handleDownload}>Download molecule</MenuItem>)},
            expanded:  () => {return (<Button size="sm" variant="outlined" onClick={handleDownload}>
                                        <DownloadOutlined />
                                       </Button> )}
        },
        6: {
            label: 'Rename molecule',
            compressed: () => {return (<BabyGruRenameDisplayObjectMenuItem setPopoverIsShown={setPopoverIsShown} setCurrentName={setCurrentName} item={props.molecule} />)},
            expanded: null
        },
        7: {
            label: 'Copy selected residues into fragment',
            compressed: () => {return (<MenuItem variant="success" onClick={handleCopyFragment}>Copy selected residues into fragment</MenuItem>)},
            expanded: null
        }
    }

    const getButtonBar = (sideBarWidth) => {
        const maximumAllowedWidth = sideBarWidth * 0.35
        let currentlyUsedWidth = 0
        let expandedButtons = []
        let compressedButtons = []

        Object.keys(actionButtons).forEach(key => {
            if (actionButtons[key].expanded === null) {
                compressedButtons.push(actionButtons[key].compressed())
            } else {
                currentlyUsedWidth += 60
                if (currentlyUsedWidth < maximumAllowedWidth) {
                    expandedButtons.push(actionButtons[key].expanded())
                } else {
                    compressedButtons.push(actionButtons[key].compressed())
                }
            }
        })

        compressedButtons.push((
            <BabyGruDeleteDisplayObjectMenuItem setPopoverIsShown={setPopoverIsShown} glRef={props.glRef} changeItemList={props.changeMolecules} itemList={props.molecules} item={props.molecule}/>
        ))
        
        return  <Fragment>
                    {expandedButtons}
                    <DropdownButton 
                            size="sm" 
                            variant="outlined" 
                            autoClose={popoverIsShown ? false : 'outside'} 
                            show={props.currentDropdownMolNo === props.molecule.molNo} 
                            onToggle={() => {props.molecule.molNo !== props.currentDropdownMolNo ? props.setCurrentDropdownMolNo(props.molecule.molNo) : props.setCurrentDropdownMolNo(-1)}}>
                        {compressedButtons}
                    </DropdownButton>
                    <Button size="sm" variant="outlined"
                        onClick={() => {
                            setIsCollapsed(!isCollapsed)
                        }}>
                        {isCollapsed ? < ExpandMoreOutlined/> : <ExpandLessOutlined />}
                    </Button>
                </Fragment>

    }

    return <Card className="px-0" style={{ marginBottom: '0.5rem', padding: '0' }} key={props.molecule.molNo}>
        <Card.Header>
            <Row className='align-items-center'>
                <Col style={{ display: 'flex', justifyContent: 'left' }}>
                    {`#${props.molecule.molNo} Mol. ${props.molecule.name}`}
                </Col>
                <Col style={{ display: 'flex', justifyContent: 'right' }}>
                    {getButtonBar(props.sideBarWidth)}
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
                                disabled={!isVisible}
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
                            disabled={!isVisible}
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
                            sequence => {
                                if(!sequenceIsValid(sequence.sequence)) {
                                    return (
                                        <div>
                                            <p>{`Unable to parse sequence data for chain ${sequence?.chain}`}</p>
                                        </div>                
                                    )
                                }
                                return (<BabyGruSequenceViewer
                                            sequence={sequence}
                                            molecule={props.molecule}
                                            glRef={props.glRef}
                                            clickedResidue={clickedResidue}
                                            setClickedResidue={setClickedResidue}
                                            selectedResidues={selectedResidues}
                                            setSelectedResidues={setSelectedResidues}
                                        />)
                            }
                        )
                    }
                </Col>
            </Row>
        </Card.Body>
    </Card >
}
