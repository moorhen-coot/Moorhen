import React, { useEffect, useState, useRef, useReducer, useCallback } from "react";
import { Card, Row, Col, Accordion, Stack } from "react-bootstrap";
import { doDownload, sequenceIsValid, getNameLabel} from '../utils/MoorhenUtils';
import { isDarkBackground } from '../WebGLgComponents/mgWebGL'
import { MoorhenSequenceViewer } from "./MoorhenSequenceViewer";
import { MoorhenMoleculeCardButtonBar } from "./MoorhenMoleculeCardButtonBar"
import { MoorhenLigandList } from "./MoorhenLigandList"
import { Checkbox, FormControlLabel, FormGroup, Typography } from "@mui/material";

const initialShowState = {}
const showStateReducer = (oldMap, change) => {
    const newMap = { ...oldMap }
    newMap[change.key] = change.state
    return newMap
}

export const MoorhenMoleculeCard = (props) => {
    const busyRedrawing = useRef(false)
    const isDirty = useRef(false)
    const [showState, changeShowState] = useReducer(showStateReducer, initialShowState)
    const [selectedResidues, setSelectedResidues] = useState(null);
    const [clickedResidue, setClickedResidue] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(!props.defaultExpandDisplayCards);
    const [isVisible, setIsVisible] = useState(true)
    const [bondWidth, setBondWidth] = useState(0.1)
    const [atomRadiusBondRatio, setAtomRadiusBondRatio] = useState(1)
    const [bondSmoothness, setBondSmoothness] = useState(props.defaultBondSmoothness)
    const [surfaceSigma, setSurfaceSigma] = useState(4.4)
    const [surfaceLevel, setSurfaceLevel] = useState(4.0)
    const [surfaceRadius, setSurfaceRadius] = useState(5.0)
    const [surfaceGridScale, setSurfaceGridScale] = useState(0.7)
    const [symmetryRadius, setSymmetryRadius] = useState(25.0)

    const bondSettingsProps = {
        bondWidth, setBondWidth, atomRadiusBondRatio,
        setAtomRadiusBondRatio, bondSmoothness, setBondSmoothness
    }

    const symmetrySettingsProps = {
        symmetryRadius, setSymmetryRadius
    }

    const gaussianSettingsProps = {
        surfaceSigma, setSurfaceSigma, surfaceLevel, setSurfaceLevel,
        surfaceRadius, setSurfaceRadius, surfaceGridScale, setSurfaceGridScale
    }

    const redrawMolIfDirty = async () => {
        if (isDirty.current) {
            busyRedrawing.current = true
            isDirty.current = false
            props.molecule.setAtomsDirty(true)
            await props.molecule.redraw(props.glRef)
            busyRedrawing.current = false
            redrawMolIfDirty()
        }
    }
    
    const redrawSymmetryIfDirty = () => {
        if (isDirty.current) {
            busyRedrawing.current = true
            isDirty.current = false
            props.molecule.drawSymmetry(props.glRef)
            .then(_ => {
                busyRedrawing.current = false
                redrawSymmetryIfDirty()
            })
        }
    }

    const handleOriginUpdate = useCallback(() => {
        isDirty.current = true
        if (!busyRedrawing.current) {
            redrawSymmetryIfDirty()
        }

    }, [props.molecule, props.glRef])

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

        if (isVisible && showState['CBs'] && props.molecule.cootBondsOptions.smoothness !== bondSmoothness) {
            props.molecule.cootBondsOptions.smoothness = bondSmoothness
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty()
            }
        } else {
            props.molecule.cootBondsOptions.smoothness = bondSmoothness
        }

    }, [bondSmoothness]);

    useEffect(() => {
        if (bondWidth === null) {
            return
        }

        if (isVisible && showState['CBs'] && props.molecule.cootBondsOptions.width !== bondWidth) {
            props.molecule.cootBondsOptions.width = bondWidth
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty()
            }
        } else {
            props.molecule.cootBondsOptions.width = bondWidth
        }

    }, [bondWidth]);

    useEffect(() => {
        if (atomRadiusBondRatio === null) {
            return
        }

        if (isVisible && showState['CBs'] && props.molecule.cootBondsOptions.atomRadiusBondRatio !== atomRadiusBondRatio) {
            props.molecule.cootBondsOptions.atomRadiusBondRatio = atomRadiusBondRatio
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty()
            }
        } else {
            props.molecule.cootBondsOptions.atomRadiusBondRatio = atomRadiusBondRatio
        }

    }, [atomRadiusBondRatio]);


    useEffect(() => {
        if (symmetryRadius === null) {
            return
        }
        props.molecule.setSymmetryRadius(symmetryRadius,props.glRef)
    }, [symmetryRadius]);

    useEffect(() => {
        if (surfaceSigma === null) {
            return
        }

        if (isVisible && showState['gaussian'] && props.molecule.gaussianSurfaceSettings.sigma !== surfaceSigma) {
            props.molecule.gaussianSurfaceSettings.sigma = surfaceSigma
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty()
            }
        } else {
            props.molecule.gaussianSurfaceSettings.sigma = surfaceSigma
        }

    }, [surfaceSigma]);

    useEffect(() => {
        if (surfaceLevel === null) {
            return
        }

        if (isVisible && showState['gaussian'] && props.molecule.gaussianSurfaceSettings.countourLevel !== surfaceLevel) {
            props.molecule.gaussianSurfaceSettings.countourLevel = surfaceLevel
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty()
            }
        } else {
            props.molecule.gaussianSurfaceSettings.countourLevel = surfaceLevel
        }

    }, [surfaceLevel]);

    useEffect(() => {
        if (surfaceRadius === null) {
            return
        }

        if (isVisible && showState['gaussian'] && props.molecule.gaussianSurfaceSettings.boxRadius !== surfaceRadius) {
            props.molecule.gaussianSurfaceSettings.boxRadius = surfaceRadius
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty()
            }
        } else {
            props.molecule.gaussianSurfaceSettings.boxRadius = surfaceRadius
        }

    }, [surfaceRadius]);

    useEffect(() => {
        if (surfaceGridScale === null) {
            return
        }

        if (isVisible && showState['gaussian'] && props.molecule.gaussianSurfaceSettings.gridScale !== surfaceGridScale) {
            props.molecule.gaussianSurfaceSettings.gridScale = surfaceGridScale
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty()
            }
        } else {
            props.molecule.gaussianSurfaceSettings.gridScale = surfaceGridScale
        }

    }, [surfaceGridScale]);

    useEffect(() => {
        if (isVisible !== props.molecule.isVisible) {
            props.molecule.isVisible = isVisible
        }
    }, [isVisible]);

    useEffect(() => {
        Object.keys(props.molecule.displayObjects).forEach(key => {
            const displayObjects = props.molecule.displayObjects[key]
            changeShowState({
                key: key, state: displayObjects.length > 0 && displayObjects[0].visible
            })
        })
    }, [
        props.molecule.displayObjects.rama.length,
        props.molecule.displayObjects.rotamer.length,
        props.molecule.displayObjects.CBs.length,
    ])

    useEffect(() => {
        if (!clickedResidue) {
            return
        }

        props.molecule.centreOn(props.glRef, `/*/${clickedResidue.chain}/${clickedResidue.seqNum}-${clickedResidue.seqNum}/*`)

    }, [clickedResidue])

    useEffect(() => {
        document.addEventListener("originUpdate", handleOriginUpdate);
        return () => {
            document.removeEventListener("originUpdate", handleOriginUpdate);
        };

    }, [handleOriginUpdate])

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
        const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: props.molecule.molNo } })
        document.dispatchEvent(scoresUpdateEvent)
    }

    const handleRedo = async () => {
        await props.molecule.redo(props.glRef)
        props.setCurrentDropdownMolNo(-1)
        const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: props.molecule.molNo } })
        document.dispatchEvent(scoresUpdateEvent)
    }

    const handleCentering = () => {
        props.molecule.centreOn(props.glRef)
        props.setCurrentDropdownMolNo(-1)
    }

    const labelMapping = {
        rama: "Rama",
        rotamer: "Rota",
        CBs: "Bonds",
        CRs: "Ribb.",
        CDs: "Cont.",
        MolecularSurface: "Surf.",
        gaussian: "Gauss.",
        ligands: "Lig.",
        DishyBases: "Bases"
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

    const getCheckBox = (key) => {
        return <FormControlLabel
            key={key}
            style={{ marginLeft: "0px", marginRight: "0px" }}
            labelPlacement="top"
            sx={{
                '& .MuiCheckbox-root': {
                    color: props.isDark ? 'white' : '',
                  },
            }}
            control={<RepresentationCheckbox
                key={key}
                repKey={key}
                glRef={props.glRef}
                changeShowState={changeShowState}
                molecule={props.molecule}
                isVisible={isVisible}
                showState={showState}
            />}
            label={<Typography style={{ color: props.isDark ? 'white' : 'black', transform: 'rotate(-45deg)' }}>
                {Object.keys(labelMapping).includes(key) ? labelMapping[key] : key}
            </Typography>
            } />
    }

    const handleProps = { handleCentering, handleCopyFragment, handleDownload, handleRedo, handleUndo, handleResidueRangeRefinement, handleVisibility }

    return <Card className="px-0" style={{ marginBottom: '0.5rem', padding: '0' }} key={props.molecule.molNo}>
        <Card.Header style={{ padding: '0.1rem' }}>
            <Stack gap={2} direction='horizontal'>
                <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left', color: props.isDark ? 'white' : 'black'}}>
                    {getNameLabel(props.molecule)}
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
                        gaussianSettingsProps={gaussianSettingsProps}
                        symmetrySettingsProps={symmetrySettingsProps}
                        backupsEnabled={props.makeBackups}
                        {...handleProps}
                    />
                </Col>
            </Stack>
        </Card.Header>
        <Card.Body style={{ display: isCollapsed ? 'none' : '', padding: '0.25rem', justifyContent:'center' }}>
            <Stack gap={2} direction='vertical'>
                <Col  style={{ width:'100%', height: '100%' }}>
                    <div style={{margin: '1px', paddingTop: '0.5rem', paddingBottom: '0.25rem',  border: '1px solid', borderRadius:'0.33rem', borderColor:
                "#CCC"}}>
                        <FormGroup style={{ margin: "0px", padding: "0px" }} row>
                            {Object.keys(props.molecule.displayObjects)
                                .filter(key => !['hover', 'originNeighbours', 'selection', 'transformation', 'contact_dots', 'chemical_features', 'VdWSurface'].some(style => key.includes(style)))
                                .map(key => getCheckBox(key))}
                        </FormGroup>
                    </div>
                </Col>
            <Accordion alwaysOpen={true} defaultActiveKey={['sequences']}>
                <Accordion.Item eventKey="sequences" style={{ padding: '0', margin: '0' }} >
                    <Accordion.Header style={{ padding: '0', margin: '0' }}>Sequences</Accordion.Header>
                    <Accordion.Body style={{ padding: '0.5rem' }}>
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
                                                    key={`${props.molecule.molNo}-${sequence.chain}`}
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
                    <Accordion.Body style={{ padding: '0.5rem' }}>
                        <MoorhenLigandList commandCentre={props.commandCentre} molecule={props.molecule} glRef={props.glRef} isDark={props.isDark}/>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
            </Stack>
        </Card.Body>
    </Card >
}

const RepresentationCheckbox = (props) => {
    const [repState, setRepState] = useState(false)
    useEffect(() => {
        setRepState(props.showState[props.repKey] || false)
    }, [props.showState])

    return <Checkbox
        disabled={!props.isVisible}
        checked={repState}
        size="small"
        onChange={(e) => {
            props.changeShowState({ key: props.repKey, state: e.target.checked })
            if (e.target.checked) {
                props.molecule.show(props.repKey, props.glRef)
            }
            else {
                props.molecule.hide(props.repKey, props.glRef)
            }
        }}                                                 >
    </Checkbox>
}
