import { useEffect, useState, useRef, useReducer, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Card, Row, Col, Accordion, Stack, Button } from "react-bootstrap";
import { doDownload, sequenceIsValid, representationLabelMapping } from '../../utils/MoorhenUtils';
import { isDarkBackground } from '../../WebGLgComponents/mgWebGL'
import { MoorhenSequenceViewer } from "../sequence-viewer/MoorhenSequenceViewer";
import { MoorhenMoleculeCardButtonBar } from "../button-bar/MoorhenMoleculeCardButtonBar"
import { MoorhenLigandList } from "../list/MoorhenLigandList"
import { Chip, FormGroup, hexToRgb } from "@mui/material";
import { getNameLabel } from "./cardUtils"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { AddOutlined, DeleteOutlined, FormatColorFillOutlined, SettingsOutlined } from '@mui/icons-material';
import { MoorhenAddCustomRepresentationCard } from "./MoorhenAddCustomRepresentationCard"
import { MoorhenMoleculeRepresentationSettingsCard } from "./MoorhenMoleculeRepresentationSettingsCard"
import { MoorhenModifyColourRulesCard } from './MoorhenModifyColourRulesCard';

const allRepresentations = [ 'CBs', 'CAs', 'CRs', 'ligands', 'gaussian', 'MolecularSurface', 'DishyBases', 'VdwSpheres', 'rama', 'rotamer', 'CDs', 'allHBonds','glycoBlocks' ]

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

const initialCustomRep = []
const customRepReducer = (oldList: moorhen.MoleculeRepresentation[], change: {action: "Add" | "Remove"; item: moorhen.MoleculeRepresentation}) => {
    switch (change.action) {
        case "Add": 
            oldList.push(change.item)
            break
        case "Remove":
            oldList = oldList.filter(representation => representation.uniqueId !== change.item.uniqueId)
            break
        default:
            console.log('Unrecognised action')
            break
    }
    return oldList
}

export type clickedResidueType = {
    modelIndex: number;
    molName: string;
    chain: string;
    seqNum: number;
}

export const MoorhenMoleculeCard = forwardRef<any, MoorhenMoleculeCardPropsInterface>((props, cardRef) => {
    const addColourRulesAnchorDivRef = useRef<HTMLDivElement | null>(null)
    const busyRedrawing = useRef<boolean>(false)
    const isDirty = useRef<boolean>(false)
    const [showColourRulesModal, setShowColourRulesModal] = useState<boolean>(false)
    const [showCreateCustomRepresentation, setShowCreateCustomRepresentation] = useState<boolean>(false)
    const [showCreateRepresentationSettingsModal, setShowCreateRepresentationSettingsModal] = useState<boolean>(false)
    const [showState, changeShowState] = useReducer(showStateReducer, initialShowState)
    const [customRepresentationList, changeCustomRepresentationList] = useReducer(customRepReducer, initialCustomRep)
    const [selectedResidues, setSelectedResidues] = useState<[number, number] | null>(null);
    const [clickedResidue, setClickedResidue] = useState<clickedResidueType | null>(null);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(!props.defaultExpandDisplayCards);
    const [isVisible, setIsVisible] = useState<boolean>(true)
    const [bondWidth, setBondWidth] = useState<number>(props.molecule.defaultBondOptions.width)
    const [atomRadiusBondRatio, setAtomRadiusBondRatio] = useState<number>(props.molecule.defaultBondOptions.atomRadiusBondRatio)
    const [bondSmoothness, setBondSmoothness] = useState<number>(props.molecule.defaultBondOptions.smoothness === 1 ? 1 : props.molecule.defaultBondOptions.smoothness === 2 ? 50 : 100)
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

    const redrawMolIfDirty = async (representationIds: string[]) => {
        if (isDirty.current) {
            busyRedrawing.current = true
            isDirty.current = false
            await Promise.all(
                representationIds.map(id => props.molecule.redrawRepresentation(id))
            )
            busyRedrawing.current = false
            redrawMolIfDirty(representationIds)
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

        const representations = props.molecule.representations.filter(representation => representation.visible && ['CBs', 'ligands'].includes(representation.style))

        if (isVisible && representations.length > 0) {
            props.molecule.setAtomsDirty(true)
            props.molecule.redraw()
        }

    }, [props.drawMissingLoops])

    useEffect(() => {
        if (props.backgroundColor === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.visible && ['CBs', 'ligands'].includes(representation.style))

        if (isVisible && representations.length > 0) {
            const newBackgroundIsDark = isDarkBackground(...props.backgroundColor)
            if (props.molecule.isDarkBackground !== newBackgroundIsDark) {
                props.molecule.isDarkBackground = newBackgroundIsDark
                props.molecule.setAtomsDirty(true)
                props.molecule.redraw()
            }
        }

    }, [props.backgroundColor, showState]);

    useEffect(() => {
        if (bondSmoothness === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.useDefaultBondOptions && representation.visible && ['CBs', 'CAs', 'ligands'].includes(representation.style))

        if (isVisible && representations.length > 0 && props.molecule.defaultBondOptions.smoothness !== bondSmoothness) {
            props.molecule.defaultBondOptions.smoothness = bondSmoothness === 1 ? 1 : bondSmoothness === 50 ? 2 : 3
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.defaultBondOptions.smoothness = bondSmoothness === 1 ? 1 : bondSmoothness === 50 ? 2 : 3
        }

    }, [bondSmoothness]);

    useEffect(() => {
        if (bondWidth === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.useDefaultBondOptions && representation.visible && ['CBs', 'CAs', 'ligands'].includes(representation.style))

        if (isVisible && representations.length > 0 && props.molecule.defaultBondOptions.width !== bondWidth) {
            props.molecule.defaultBondOptions.width = bondWidth
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.defaultBondOptions.width = bondWidth
        }

    }, [bondWidth]);

    useEffect(() => {
        if (atomRadiusBondRatio === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.useDefaultBondOptions && representation.visible && ['CBs', 'CAs', 'ligands'].includes(representation.style))

        if (isVisible && representations.length > 0 && props.molecule.defaultBondOptions.atomRadiusBondRatio !== atomRadiusBondRatio) {
            props.molecule.defaultBondOptions.atomRadiusBondRatio = atomRadiusBondRatio
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.defaultBondOptions.atomRadiusBondRatio = atomRadiusBondRatio
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

        const representations = props.molecule.representations.filter(representation => representation.visible && representation.style === 'gaussian')

        if (isVisible && representations.length > 0 && props.molecule.gaussianSurfaceSettings.sigma !== surfaceSigma) {
            props.molecule.gaussianSurfaceSettings.sigma = surfaceSigma
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.gaussianSurfaceSettings.sigma = surfaceSigma
        }

    }, [surfaceSigma]);

    useEffect(() => {
        if (surfaceLevel === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.visible && representation.style === 'gaussian')

        if (isVisible && representations.length > 0 && props.molecule.gaussianSurfaceSettings.countourLevel !== surfaceLevel) {
            props.molecule.gaussianSurfaceSettings.countourLevel = surfaceLevel
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.gaussianSurfaceSettings.countourLevel = surfaceLevel
        }

    }, [surfaceLevel]);

    useEffect(() => {
        if (surfaceRadius === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.visible && representation.style === 'gaussian')

        if (isVisible && representations.length > 0 && props.molecule.gaussianSurfaceSettings.boxRadius !== surfaceRadius) {
            props.molecule.gaussianSurfaceSettings.boxRadius = surfaceRadius
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.gaussianSurfaceSettings.boxRadius = surfaceRadius
        }

    }, [surfaceRadius]);

    useEffect(() => {
        if (surfaceGridScale === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.visible && representation.style === 'gaussian')

        if (isVisible && representations.length > 0 && props.molecule.gaussianSurfaceSettings.gridScale !== surfaceGridScale) {
            props.molecule.gaussianSurfaceSettings.gridScale = surfaceGridScale
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
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
            const newMolecule = await props.molecule.copyFragmentUsingCid(cid, true)
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
                        backupsEnabled={props.makeBackups}
                        {...handleProps}
                    />
                </Col>
            </Stack>
        </Card.Header>
        <Card.Body style={{ display: isCollapsed ? 'none' : '', padding: '0.25rem', justifyContent:'center' }}>
            <Stack gap={2} direction='vertical'>
                <Row style={{display: 'flex'}}>
                    <Col style={{ width:'100%', height: '100%' }}>
                        <div ref={addColourRulesAnchorDivRef} style={{ margin: '1px', paddingTop: '0.25rem', paddingBottom: '0.25rem',  border: '1px solid', borderRadius:'0.33rem', borderColor: "#CCC" }}>
                            <FormGroup style={{ margin: "0px", padding: "0px", display: 'flex', justifyContent: 'center'}} row>
                                {allRepresentations.map(key => 
                                    <RepresentationCheckbox
                                        key={key}
                                        repKey={key}
                                        glRef={props.glRef}
                                        changeShowState={changeShowState}
                                        molecule={props.molecule}
                                        isVisible={isVisible}
                                        showState={showState}
                                        isDark={props.isDark}
                                />)}
                            </FormGroup>
                            <hr style={{ marginTop: '0.5rem', marginBottom: "0.5rem", marginLeft: '0.5rem', marginRight: '0.5rem' }}></hr>
                            {props.molecule.representations.some(representation => representation.isCustom) ?
                                <FormGroup style={{ margin: "0px", padding: "0px" }} row>
                                    {props.molecule.representations.filter(representation => representation.isCustom).map(representation => {
                                        return <CustomRepresentationChip isDark={props.isDark} key={representation.uniqueId} molecule={props.molecule} representation={representation} isVisible={isVisible} changeCustomRepresentationList={changeCustomRepresentationList}/>
                                    })}
                                </FormGroup>
                            :
                                <span>No custom representations</span>
                            }
                        </div>
                    </Col>
                    <Col md='auto' style={{paddingLeft: 0, justifyContent: 'center', display: 'flex'}} >
                        <Stack gap={1} direction='vertical'>
                        <Button style={{height: '100%'}} variant='light' onClick={() => setShowColourRulesModal((prev) => { return !prev })}>
                            <FormatColorFillOutlined/>
                        </Button>
                        <Button style={{height: '100%'}} variant='light' onClick={() => setShowCreateRepresentationSettingsModal((prev) => { return !prev })}>
                            <SettingsOutlined/>
                        </Button>
                        <Button style={{ height: '100%' }} variant='light' onClick={() => setShowCreateCustomRepresentation((prev) => {return !prev})}>
                            <AddOutlined/>
                        </Button>
                        </Stack>
                    </Col>
                    <MoorhenMoleculeRepresentationSettingsCard symmetrySettingsProps={symmetrySettingsProps} gaussianSettingsProps={gaussianSettingsProps} bondSettingsProps={bondSettingsProps} glRef={props.glRef} urlPrefix={props.urlPrefix} molecules={props.molecules} isDark={props.isDark} molecule={props.molecule} anchorEl={addColourRulesAnchorDivRef} show={showCreateRepresentationSettingsModal} setShow={setShowCreateRepresentationSettingsModal}/>
                    <MoorhenModifyColourRulesCard molecules={props.molecules} anchorEl={addColourRulesAnchorDivRef} isDark={props.isDark} urlPrefix={props.urlPrefix} glRef={props.glRef} commandCentre={props.commandCentre} molecule={props.molecule} showColourRulesToast={showColourRulesModal} setShowColourRulesToast={setShowColourRulesModal} windowHeight={props.windowHeight} windowWidth={props.sideBarWidth}/>
                    <MoorhenAddCustomRepresentationCard glRef={props.glRef} urlPrefix={props.urlPrefix} molecules={props.molecules} isDark={props.isDark} molecule={props.molecule} anchorEl={addColourRulesAnchorDivRef} show={showCreateCustomRepresentation} setShow={setShowCreateCustomRepresentation}/>
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

const getChipStyle = (colourRules: moorhen.ColourRule[], repIsVisible: boolean, isDark: boolean, width?: string) => {
    const chipStyle = {
        marginLeft: '0.2rem',
        marginBottom: '0.2rem',
    }

    if (width) { 
        chipStyle['width'] = width 
    }

    if (isDark) {
        chipStyle['color'] = 'white'
    }

    let [r, g, b]: number[] = [214, 214, 214]
    if (colourRules?.length > 0) {
        if (colourRules[0].isMultiColourRule) {
            const alphaHex = repIsVisible ? '99' : '33'
            chipStyle['background'] = `linear-gradient( to right, #264CFF${alphaHex}, #3FA0FF${alphaHex}, #72D8FF${alphaHex}, #AAF7FF${alphaHex}, #E0FFFF${alphaHex}, #FFFFBF${alphaHex}, #FFE099${alphaHex}, #FFAD72${alphaHex}, #F76D5E${alphaHex}, #D82632${alphaHex}, #A50021${alphaHex} )`
        } else {
            [r, g, b] = hexToRgb(colourRules[0].color).replace('rgb(', '').replace(')', '').split(', ').map(item => parseFloat(item))
            chipStyle['backgroundColor'] = `rgba(${r}, ${g}, ${b}, ${repIsVisible ? 0.5 : 0.1})`
        }        
    } else {
        chipStyle['backgroundColor'] = `rgba(${r}, ${g}, ${b}, ${repIsVisible ? 0.5 : 0.1})`
    }

    chipStyle['borderColor'] = `rgb(${r}, ${g}, ${b})`
    
    return chipStyle
}

const RepresentationCheckbox = (props: {
    isDark: boolean;
    showState: { [key: string]: boolean };
    repKey: string;
    isVisible: boolean;
    changeShowState: (arg0: { key: string; state: boolean; }) => void;
    molecule: moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>; 
}) => {

    const [repState, setRepState] = useState<boolean>(false)

    const chipStyle = getChipStyle(props.molecule.defaultColourRules, repState, props.isDark)

    useEffect(() => {
        setRepState(props.showState[props.repKey] || false)
    }, [props.showState])

    const handleClick = useCallback(() => {
        if (props.isVisible) {
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
                style={chipStyle}
                variant={"outlined"}
                label={`${representationLabelMapping[props.repKey]}`}
                onClick={handleClick}
            />
}

const CustomRepresentationChip = (props: {
    isDark: boolean;
    isVisible: boolean;
    molecule: moorhen.Molecule;
    representation: moorhen.MoleculeRepresentation; 
    changeCustomRepresentationList: (arg0: {action: "Add" | "Remove"; item: moorhen.MoleculeRepresentation}) => void;
}) => {
    
    const { representation, molecule, isVisible } = props

    const [representationIsVisible, setRepresentationIsVisible] = useState<boolean>(true)
    
    const chipStyle = getChipStyle(representation.colourRules, representationIsVisible, props.isDark)
    
    useEffect(() => {
        representationIsVisible ? representation.show() : representation.hide()
    }, [representationIsVisible])

    const handleClick = useCallback(() => {
        if (isVisible) {
            setRepresentationIsVisible(!representationIsVisible)
        }
    }, [isVisible, representationIsVisible])

    return <Chip
        style={chipStyle}
        variant={"outlined"}
        label={`${representationLabelMapping[representation.style]} ${representation.cid}`}
        deleteIcon={<DeleteOutlined style={{color: props.isDark ? 'white' : 'black'}}/>}
        onDelete={() => {
            molecule.removeRepresentation(representation.uniqueId)
            props.changeCustomRepresentationList({action: "Remove", item: props.representation})
        }}
        onClick={handleClick}
    />
}
