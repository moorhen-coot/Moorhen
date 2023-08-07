import { useEffect, useState, useRef, useReducer, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Card, Row, Col, Accordion, Stack, Button, FormSelect, Form } from "react-bootstrap";
import { doDownload, rgbToHex, sequenceIsValid } from '../../utils/MoorhenUtils';
import { isDarkBackground } from '../../WebGLgComponents/mgWebGL'
import { MoorhenSequenceViewer } from "../sequence-viewer/MoorhenSequenceViewer";
import { MoorhenMoleculeCardButtonBar } from "../button-bar/MoorhenMoleculeCardButtonBar"
import { MoorhenLigandList } from "../list/MoorhenLigandList"
import { Chip, FormGroup, Popover, hexToRgb } from "@mui/material";
import { getNameLabel } from "./cardUtils"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { AddOutlined, DeleteOutlined, FormatColorFillOutlined } from '@mui/icons-material';
import { SliderPicker } from "react-color";
import { MoorhenColourRules } from '../modal/MoorhenColourRules';

const labelMapping = {
    rama: "Rama.",
    rotamer: "Rota.",
    CBs: "Bonds",
    CAs: "C-As",
    CRs: "Ribbons",
    CDs: "Cont. dots",
    MolecularSurface: "Surf.",
    gaussian: "Gauss.",
    ligands: "Ligands",
    DishyBases: "Bases",
    VdwSpheres: "Spheres",
    allHBonds: "H-Bonds"
}

const allRepresentations = [ 'CBs', 'CAs', 'CRs', 'ligands', 'gaussian', 'MolecularSurface', 'DishyBases', 'VdwSpheres', 'rama', 'rotamer', 'CDs', 'allHBonds' ]
const customRepresentations = [ 'CBs', 'CAs', 'CRs', 'ligands', 'gaussian', 'MolecularSurface', 'DishyBases', 'VdwSpheres' ]

interface MoorhenMoleculeCardPropsInterface extends moorhen.Controls {
    dropdownId: number;
    accordionDropdownId: number;
    setAccordionDropdownId: React.Dispatch<React.SetStateAction<number>>;
    sideBarWidth: number;
    showSideBar: boolean;
    busy: boolean;
    consoleMessage: string;
    key: number;
    index: number;
    molecule: moorhen.Molecule;
    currentDropdownMolNo: number;
    setCurrentDropdownMolNo: React.Dispatch<React.SetStateAction<number>>;
}

const initialShowState: {[key: string]: boolean} = {}
const showStateReducer = (oldMap: {[key: string]: boolean}, change: { key: string; state: boolean; }) => {
    const newMap = { ...oldMap }
    newMap[change.key] = change.state
    return newMap
}

export type clickedResidueType = {
    modelIndex: number;
    molName: string;
    chain: string;
    seqNum: number;
}

export const MoorhenMoleculeCard = forwardRef<any, MoorhenMoleculeCardPropsInterface>((props, cardRef) => {
    const addCustomRepresentationAnchorDivRef = useRef<HTMLDivElement | null>(null)
    const addColourRulesAnchorDivRef = useRef<HTMLDivElement | null>(null)
    const busyRedrawing = useRef<boolean>(false)
    const isDirty = useRef<boolean>(false)
    const [showColourRulesModal, setShowColourRulesModal] = useState<boolean>(false)
    const [showCreateCustomRepresentation, setShowCreateCustomRepresentation] = useState<boolean>(false)
    const [showState, changeShowState] = useReducer(showStateReducer, initialShowState)
    const [selectedResidues, setSelectedResidues] = useState<[number, number] | null>(null);
    const [clickedResidue, setClickedResidue] = useState<clickedResidueType | null>(null);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(!props.defaultExpandDisplayCards);
    const [isVisible, setIsVisible] = useState<boolean>(true)
    const [bondWidth, setBondWidth] = useState<number>(props.molecule.cootBondsOptions.width)
    const [atomRadiusBondRatio, setAtomRadiusBondRatio] = useState<number>(props.molecule.cootBondsOptions.atomRadiusBondRatio)
    const [bondSmoothness, setBondSmoothness] = useState<number>(props.molecule.cootBondsOptions.smoothness)
    const [surfaceSigma, setSurfaceSigma] = useState<number>(4.4)
    const [surfaceLevel, setSurfaceLevel] = useState<number>(4.0)
    const [surfaceRadius, setSurfaceRadius] = useState<number>(5.0)
    const [surfaceGridScale, setSurfaceGridScale] = useState<number>(0.7)
    const [symmetryRadius, setSymmetryRadius] = useState<number>(25.0)

    useImperativeHandle(cardRef, () => ({
        forceIsCollapsed: (value: boolean) => { 
            setIsCollapsed(value)
         }
    }), 
    [setIsCollapsed])

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
            await props.molecule.redraw()
            busyRedrawing.current = false
            redrawMolIfDirty()
        }
    }
    
    const redrawSymmetryIfDirty = () => {
        if (isDirty.current) {
            busyRedrawing.current = true
            isDirty.current = false
            props.molecule.drawSymmetry()
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
            props.molecule.redraw()
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
                props.molecule.redraw()
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
        props.molecule.setSymmetryRadius(symmetryRadius)
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
        props.molecule.representations
        .filter(item => { return !item.isCustom && item.style !== 'hover' })
        .forEach(item => {
            const displayObjects = item.buffers
            changeShowState({
                key: item.style, state: displayObjects.length > 0 && displayObjects[0].visible
            })
        })
    }, [props.molecule.representations])

    useEffect(() => {
        if (!clickedResidue) {
            return
        }

        props.molecule.centreOn(`/*/${clickedResidue.chain}/${clickedResidue.seqNum}-${clickedResidue.seqNum}/*`)

    }, [clickedResidue])

    useEffect(() => {
        document.addEventListener("originUpdate", handleOriginUpdate);
        return () => {
            document.removeEventListener("originUpdate", handleOriginUpdate);
        };

    }, [handleOriginUpdate])

    const handleVisibility = () => {
        if (isVisible) {
            props.molecule.representations.forEach(item => showState[item.style] ? item.hide() : null)
            setIsVisible(false)
        } else {
            props.molecule.representations.forEach(item => showState[item.style] ? item.show() : null)
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
            const cid =  `//${clickedResidue.chain}/${selectedResidues[0]}-${selectedResidues[1]}/*`
            const newMolecule = await props.molecule.copyFragmentUsingCid(cid, props.backgroundColor, props.defaultBondSmoothness, true)
            props.changeMolecules({ action: "Add", item: newMolecule })
        }

        // TODO: Test that residue start and residue end are valid (i.e. not missing from the structure)
        if (clickedResidue && selectedResidues) {
            createNewFragmentMolecule()
        }
        props.setCurrentDropdownMolNo(-1)
    }

    const handleUndo = async () => {
        await props.molecule.undo()
        props.setCurrentDropdownMolNo(-1)
        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", {
            detail: { origin: props.glRef.current.origin, modifiedMolecule: props.molecule.molNo } 
        })
        document.dispatchEvent(scoresUpdateEvent)
    }

    const handleRedo = async () => {
        await props.molecule.redo()
        props.setCurrentDropdownMolNo(-1)
        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", {
            detail: { origin: props.glRef.current.origin, modifiedMolecule: props.molecule.molNo } 
        })
        document.dispatchEvent(scoresUpdateEvent)
    }

    const handleCentering = () => {
        props.molecule.centreOn()
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
            props.molecule.redraw()
        }

        if (clickedResidue && selectedResidues) {
            refineResidueRange()
        }

        props.setCurrentDropdownMolNo(-1)
    }

    const handleProps = { handleCentering, handleCopyFragment, handleDownload, handleRedo, handleUndo, handleResidueRangeRefinement, handleVisibility }

    return <><Card ref={cardRef} className="px-0" style={{ marginBottom: '0.5rem', padding: '0' }} key={props.molecule.molNo}>
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
                <Row style={{display: 'flex'}}>
                    <Col  style={{ width:'100%', height: '100%' }}>
                        <div ref={addColourRulesAnchorDivRef} style={{ margin: '1px', paddingTop: '0.25rem', paddingBottom: '0.25rem',  border: '1px solid', borderRadius:'0.33rem', borderColor: "#CCC" }}>
                            <FormGroup style={{ margin: "0px", padding: "0px"}} row>
                                {allRepresentations.map(key => 
                                    <RepresentationCheckbox
                                    key={key}
                                    repKey={key}
                                    glRef={props.glRef}
                                    changeShowState={changeShowState}
                                    molecule={props.molecule}
                                    isVisible={isVisible}
                                    showState={showState}
                            />)}
                            </FormGroup>
                        </div>
                    </Col>
                    <Col md='auto' style={{paddingLeft: 0}}>
                        <Button style={{height: '100%'}} variant='light' onClick={() => setShowColourRulesModal((prev) => { return !prev })}>
                            <FormatColorFillOutlined/>
                        </Button>
                    </Col>
                    <MoorhenColourRules molecules={props.molecules} anchorEl={addColourRulesAnchorDivRef} isDark={props.isDark} urlPrefix={props.urlPrefix} glRef={props.glRef} commandCentre={props.commandCentre} molecule={props.molecule} showColourRulesToast={showColourRulesModal} setShowColourRulesToast={setShowColourRulesModal} windowHeight={props.windowHeight} windowWidth={props.sideBarWidth}/>
                </Row>
                <Row style={{display: 'flex'}}>
                    <Col  style={{ width:'100%', height: '100%' }}>
                    <div ref={addCustomRepresentationAnchorDivRef} style={{ margin: '1px', paddingTop: '0.25rem', paddingBottom: '0.25rem',  border: '1px solid', borderRadius:'0.33rem', borderColor: "#CCC" }}>
                    {props.molecule.representations.some(representation => representation.isCustom) ?
                        <FormGroup style={{ margin: "0px", padding: "0px" }} row>
                            {props.molecule.representations.filter(representation => representation.isCustom).map(representation => {
                                return <CustomRepresentationChip key={representation.uniqueId} molecule={props.molecule} representation={representation} isVisible={isVisible}/>
                            })}
                        </FormGroup>
                    :
                        <span>No custom representations</span>
                    }
                    </div>
                    </Col>
                    <Col md='auto' style={{paddingLeft: 0}}>
                        <Button variant='light' onClick={() => setShowCreateCustomRepresentation((prev) => {return !prev})}>
                            <AddOutlined/>
                        </Button>
                        <CreateCustomRepresentationMenu molecule={props.molecule} anchorEl={addCustomRepresentationAnchorDivRef} show={showCreateCustomRepresentation} setShow={setShowCreateCustomRepresentation}/>
                    </Col>
                </Row>                
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
    </>
})

type RepresetationCheckboxPropsType = {
    showState: { [key: string]: boolean };
    repKey: string;
    isVisible: boolean;
    changeShowState: (arg0: { key: string; state: boolean; }) => void;
    molecule: moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>; 
}

const RepresentationCheckbox = (props: RepresetationCheckboxPropsType) => {
    const [repState, setRepState] = useState<boolean>(false)

    let [r, g, b]: number[] = [214, 214, 214]
    if (props.molecule.defaultColourRules?.length > 0) {
        [r, g, b] = hexToRgb(props.molecule.defaultColourRules[0].color).replace('rgb(', '').replace(')', '').split(', ').map(item => parseFloat(item))
    }
    
    useEffect(() => {
        setRepState(props.showState[props.repKey] || false)
    }, [props.showState])

    const handleClick = useCallback(() => {
        console.log('HI')
        console.log(props.isVisible)
        if (props.isVisible) {
            console.log(repState, props.repKey)
            if (repState) {
                props.molecule.hide(props.repKey)
            }
            else {
                props.molecule.show(props.repKey)
            }
            props.changeShowState({ key: props.repKey, state: !repState })
        }
    }, [repState, props.isVisible])

    return <Chip
                style={{marginLeft: '0.1rem', marginBottom: '0.1rem', borderColor: `rgb(${r}, ${g}, ${b})`, backgroundColor: `rgba(${r}, ${g}, ${b}, ${repState ? 0.5 : 0.1})`, width: 'calc(100% /6.15)'}}
                variant={"outlined"}
                label={`${labelMapping[props.repKey]}`}
                onClick={handleClick}
            />
}

const CreateCustomRepresentationMenu = (props: {setShow: React.Dispatch<React.SetStateAction<boolean>>; show: boolean; anchorEl: React.RefObject<HTMLDivElement>; molecule: moorhen.Molecule}) => {
    const cidFormRef = useRef<HTMLInputElement | null>(null)
    const styleSelectRef = useRef<HTMLSelectElement | null>(null)
    const [colour, setColour] = useState<{ r: string; g: string; b: string; }>({r: '150', g:'100', b:'50'})

    const handleCreateRepresentation = useCallback(() => {
        props.molecule.addRepresentation(styleSelectRef.current.value, cidFormRef.current.value, true, rgbToHex(parseInt(colour.r), parseInt(colour.g), parseInt(colour.b)))
        props.setShow(false)
    }, [colour])

    return <Popover
                onClose={() => props.setShow(false)}
                open={props.show}
                anchorEl={props.anchorEl.current}
                anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
                transformOrigin={{ vertical: 'center', horizontal: 'center', }}
                sx={{'& .MuiPaper-root': {backgroundColor: '#e8e8e8', marginTop: '0.1rem'}}}
            >
            <Stack gap={2} direction='horizontal' style={{width: '25rem', margin: '0.5rem'}}>
                <FormSelect ref={styleSelectRef} size="sm" defaultValue={'Bonds'}>
                    {customRepresentations.map(key => {
                        return <option value={key} key={key}>{labelMapping[key]}</option>
                    })}
                </FormSelect>
                <Form.Control ref={cidFormRef} size="sm" type='text' placeholder={'CID selection'} style={{width: "100%"}}/>
                <div style={{width: '100%', textAlign: 'center'}}>
                <SliderPicker color={colour} onChange={(color) => {setColour({r: color.rgb.r, g: color.rgb.g, b: color.rgb.b})}}/>
                </div>
                <Button onClick={handleCreateRepresentation}>
                    Create
                </Button>
            </Stack>
        </Popover>
}

const CustomRepresentationChip = (props: { isVisible: boolean; molecule: moorhen.Molecule; representation: moorhen.MoleculeRepresentation; }) => {
    
    const { representation, molecule, isVisible } = props

    const [representationIsVisible, setRepresentationIsVisible] = useState<boolean>(true)
    
    let [r, g, b]: number[] = hexToRgb(representation.colourRules[0].color).replace('rgb(', '').replace(')', '').split(', ').map(item => parseFloat(item))
    
    useEffect(() => {
        representationIsVisible ? representation.show() : representation.hide()
    }, [representationIsVisible])

    const handleClick = useCallback(() => {
        if (isVisible) {
            setRepresentationIsVisible(!representationIsVisible)
        }
    }, [isVisible, representationIsVisible])

    return <Chip
        style={{marginLeft: '0.1rem', marginBottom: '0.1rem', borderColor: `rgb(${r}, ${g}, ${b})`, backgroundColor: `rgba(${r}, ${g}, ${b}, ${representationIsVisible ? 0.5 : 0.1})`}}
        variant={"outlined"}
        label={`${labelMapping[representation.style]} ${representation.cid}`}
        deleteIcon={<DeleteOutlined/>}
        onDelete={() => {
            molecule.removeRepresentation(representation.uniqueId)
        }}
        onClick={handleClick}
    />
}