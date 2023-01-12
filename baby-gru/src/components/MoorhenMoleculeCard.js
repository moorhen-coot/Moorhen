import React, { useEffect, useState } from "react";
import { Card, Form, Row, Col, Accordion } from "react-bootstrap";
import { doDownload, sequenceIsValid } from '../utils/MoorhenUtils';
import { isDarkBackground } from '../WebGL/mgWebGL'
import { MoorhenSequenceViewer } from "./MoorhenSequenceViewer";
import { MoorhenMoleculeCardButtonBar } from "./MoorhenMoleculeCardButtonBar"
import { MoorhenLigandList } from "./MoorhenLigandList"

export const MoorhenMoleculeCard = (props) => {
    const [showState, setShowState] = useState({})
    const [selectedResidues, setSelectedResidues] = useState(null);
    const [clickedResidue, setClickedResidue] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(!props.defaultExpandDisplayCards);
    const [isVisible, setIsVisible] = useState(true)
    const [bondWidth, setBondWidth] = useState(0.1)
    const [atomRadiusBondRatio, setAtomRadiusBondRatio] = useState(1.5)
    const [bondSmoothness, setBondSmoothness] = useState(1)

    const bondSettingsProps = {
        bondWidth, setBondWidth, atomRadiusBondRatio,
        setAtomRadiusBondRatio, bondSmoothness, setBondSmoothness
    }

    useEffect(() => {
        if (props.drawMissingLoops === null) {
            return
        }

        if (isVisible && showState['CBs']) {
            props.molecule.setAtomsDirty(true)
            props.molecule.redraw(props.glRef)
        }

    }, [props.drawMissingLoops])

    useEffect(() => {
        if (props.backgroundColor === null) {
            return
        }

        if (isVisible && showState['CBs']) {
            const newBackgroundIsDark = isDarkBackground(...props.backgroundColor)
            if (props.molecule.cootBondsOptions.isDarkBackground !== newBackgroundIsDark) {
                props.molecule.cootBondsOptions.isDarkBackground = newBackgroundIsDark
                props.molecule.setAtomsDirty(true)
                props.molecule.redraw(props.glRef)
            }
        }

    }, [props.backgroundColor, showState]);

    useEffect(() => {
        if (bondSmoothness === null) {
            return
        }

        props.molecule.cootBondsOptions.smoothness = bondSmoothness
        if (isVisible && showState['CBs']) {
            props.molecule.setAtomsDirty(true)
            props.molecule.redraw(props.glRef)
        }

    }, [bondSmoothness]);

    useEffect(() => {
        if (bondWidth === null) {
            return
        }

        props.molecule.cootBondsOptions.width = bondWidth
        if (isVisible && showState['CBs']) {
            props.molecule.setAtomsDirty(true)
            props.molecule.redraw(props.glRef)
        }

    }, [bondWidth]);

    useEffect(() => {
        if (atomRadiusBondRatio === null) {
            return
        }

        props.molecule.cootBondsOptions.atomRadiusBondRatio = atomRadiusBondRatio
        if (isVisible && showState['CBs']) {
            props.molecule.setAtomsDirty(true)
            props.molecule.redraw(props.glRef)
        }

    }, [atomRadiusBondRatio]);

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

    useEffect(() => {
        if (!clickedResidue) {
            return
        }

        props.molecule.centreOn(props.glRef, `/*/${clickedResidue.chain}/${clickedResidue.seqNum}-${clickedResidue.seqNum}/*`)

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
            props.changeMolecules({ action: "Add", item: newMolecule })
        }

        // TODO: Test that residue start and residue end are valid (i.e. not missing from the structure)
        if (clickedResidue && selectedResidues) {
            createNewFragmentMolecule()
        }
        props.setCurrentDropdownMolNo(-1)
    }

    const handleUndo = async () => {
        await props.molecule.undo(props.glRef)
        props.setCurrentDropdownMolNo(-1)
    }

    const handleRedo = async () => {
        await props.molecule.redo(props.glRef)
        props.setCurrentDropdownMolNo(-1)
    }

    const handleCentering = () => {
        props.molecule.centreOn(props.glRef)
        props.setCurrentDropdownMolNo(-1)
    }

    const handleResidueRangeRefinement = () => {
        async function refineResidueRange() {
            await props.commandCentre.current.cootCommand({
                returnType: "status",
                command: 'refine_residue_range',
                commandArgs: [props.molecule.molNo, clickedResidue.chain, ...selectedResidues],
                changesMolecules: [props.molecule.molNo]
            }, true)

            props.molecule.setAtomsDirty(true)
            props.molecule.redraw(props.glRef)
        }

        if (clickedResidue && selectedResidues) {
            refineResidueRange()
        }

        props.setCurrentDropdownMolNo(-1)
    }

    const handleProps = { handleCentering, handleCopyFragment, handleDownload, handleRedo, handleUndo, handleResidueRangeRefinement, handleVisibility }

    return <Card className="px-0" style={{ marginBottom: '0.5rem', padding: '0' }} key={props.molecule.molNo}>
        <Card.Header>
            <Row className='align-items-center'>
                <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left' }}>
                    {`#${props.molecule.molNo} Mol. ${props.molecule.name}`}
                </Col>
                <Col style={{ display: 'flex', justifyContent: 'right' }}>
                    <MoorhenMoleculeCardButtonBar
                        molecule={props.molecule}
                        molecules={props.molecules}
                        changeMolecules={props.changeMolecules}
                        glRef={props.glRef}
                        sideBarWidth={props.sideBarWidth}
                        windowHeight={props.windowHeight}
                        isVisible={isVisible}
                        isCollapsed={isCollapsed}
                        setIsCollapsed={setIsCollapsed}
                        clickedResidue={clickedResidue}
                        selectedResidues={selectedResidues}
                        currentDropdownMolNo={props.currentDropdownMolNo}
                        setCurrentDropdownMolNo={props.setCurrentDropdownMolNo}
                        bondSettingsProps={bondSettingsProps}
                        {...handleProps}
                    />
                </Col>
            </Row>
        </Card.Header>
        <Card.Body style={{ display: isCollapsed ? 'none' : '' }}>
            <Accordion alwaysOpen={true} defaultActiveKey={['displayOpytions', 'sequences']}>

                <Accordion.Item eventKey="displayOpytions" style={{ padding: '0', margin: '0' }} >
                    <Accordion.Header style={{ padding: '0', margin: '0' }}>Display Options</Accordion.Header>
                    <Accordion.Body>
                        <Row style={{ height: '100%' }}>
                            <Col>
                                <div>
                                    {Object.keys(props.molecule.displayObjects)
                                        .filter(key => !['bonds', 'ribbons', 'sticks', 'hover', 'transformation'].includes(key))
                                        .map(key => {
                                            return <Form.Check
                                                key={key}
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
                    </Accordion.Body>
                </Accordion.Item>


                <Accordion.Item eventKey="sequences" style={{ padding: '0', margin: '0' }} >
                    <Accordion.Header style={{ padding: '0', margin: '0' }}>Sequences</Accordion.Header>
                    <Accordion.Body>
                        {props.molecule.sequences && props.molecule.sequences.length > 0 ?
                            <>
                                <Row style={{ height: '100%' }}>
                                    <Col>
                                        {props.molecule.sequences.map(
                                            sequence => {
                                                if (!sequenceIsValid(sequence.sequence)) {
                                                    return (
                                                        <div>
                                                            <p>{`Unable to parse sequence data for chain ${sequence?.chain}`}</p>
                                                        </div>
                                                    )
                                                }
                                                return (<MoorhenSequenceViewer
                                                    sequence={sequence}
                                                    molecule={props.molecule}
                                                    glRef={props.glRef}
                                                    clickedResidue={clickedResidue}
                                                    setClickedResidue={setClickedResidue}
                                                    selectedResidues={selectedResidues}
                                                    setSelectedResidues={setSelectedResidues}
                                                    hoveredAtom={props.hoveredAtom}
                                                    setHoveredAtom={props.setHoveredAtom}
                                                />)
                                            }
                                        )}
                                    </Col>
                                </Row>
                            </>
                            :
                            <div>
                                <b>No sequence data</b>
                            </div>
                        }

                    </Accordion.Body>
                </Accordion.Item>


                <Accordion.Item eventKey="ligands" style={{ padding: '0', margin: '0' }} >
                    <Accordion.Header style={{ padding: '0', margin: '0' }}>Ligands</Accordion.Header>
                    <Accordion.Body>
                        <MoorhenLigandList molecule={props.molecule} glRef={props.glRef} />
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </Card.Body>
    </Card >
}
