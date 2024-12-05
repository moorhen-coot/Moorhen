import { useEffect, useState, useRef, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import { Card, Row, Col, Stack, Button, Spinner } from "react-bootstrap";
import { Accordion, AccordionDetails, AccordionSummary, Box, CircularProgress, LinearProgress } from '@mui/material';
import { convertRemToPx, convertViewtoPx, getCentreAtom } from '../../utils/utils';
import { representationLabelMapping } from '../../utils/enums';
import { isDarkBackground } from '../../WebGLgComponents/mgWebGL';
import { MoorhenSequenceList } from "../list/MoorhenSequenceList";
import { MoorhenMoleculeCardButtonBar } from "../button-bar/MoorhenMoleculeCardButtonBar";
import { MoorhenLigandList } from "../list/MoorhenLigandList";
import { Chip, FormGroup } from "@mui/material";
import { getNameLabel } from "./cardUtils"
import { AddOutlined, DeleteOutlined, FormatColorFillOutlined, EditOutlined, ExpandMoreOutlined, TuneOutlined } from '@mui/icons-material';
import { MoorhenAddCustomRepresentationCard } from "./MoorhenAddCustomRepresentationCard"
import { MoorhenMoleculeRepresentationSettingsCard } from "./MoorhenMoleculeRepresentationSettingsCard"
import { MoorhenModifyColourRulesCard } from './MoorhenModifyColourRulesCard';
import { useSelector, useDispatch } from 'react-redux';
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { addGeneralRepresentation, addMolecule, removeCustomRepresentation, removeGeneralRepresentation, showMolecule } from '../../store/moleculesSlice';
import { triggerUpdate } from '../../store/moleculeMapUpdateSlice';
import { MoorhenHeaderInfoCard } from './MoorhenHeaderInfoCard';
import { MoorhenCarbohydrateList } from "../list/MoorhenCarbohydrateList";
import { MoorhenColourRule } from '../../utils/MoorhenColourRule';

const allRepresentations: moorhen.RepresentationStyles[] = ['CBs', 'adaptativeBonds', 'CAs', 'CRs', 'ligands', 'gaussian', 'MolecularSurface', 'VdwSpheres', 'rama', 'rotamer', 'CDs', 'allHBonds','glycoBlocks', 'restraints',  'environment' ]

interface MoorhenMoleculeCardPropsInterface extends moorhen.CollectedProps {
    dropdownId: number;
    accordionDropdownId: number;
    setAccordionDropdownId: React.Dispatch<React.SetStateAction<number>>;
    sideBarWidth: number;
    showSideBar: boolean;
    busy: boolean;
    key: number;
    index: number;
    molecule: moorhen.Molecule;
    currentDropdownMolNo: number;
    setCurrentDropdownMolNo: React.Dispatch<React.SetStateAction<number>>;
}

export type clickedResidueType = {
    modelIndex: number;
    molName: string;
    chain: string;
    seqNum: number;
}

export const MoorhenMoleculeCard = forwardRef<any, MoorhenMoleculeCardPropsInterface>((props, cardRef) => {
    
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const defaultExpandDisplayCards = useSelector((state: moorhen.State) => state.generalStates.defaultExpandDisplayCards)
    const drawMissingLoops = useSelector((state: moorhen.State) => state.sceneSettings.drawMissingLoops)
    const userPreferencesMounted = useSelector((state: moorhen.State) => state.generalStates.userPreferencesMounted)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const isVisible = useSelector((state: moorhen.State) => state.molecules.visibleMolecules.includes(props.molecule.molNo))
    const drawInteractions = useSelector((state: moorhen.State) => state.molecules.generalRepresentations.some(item => item.parentMolecule?.molNo === props.molecule.molNo && item.style === "environment" && !item.isCustom))
    const GLLabelsFontFamily = useSelector((state: moorhen.State) => state.labelSettings.GLLabelsFontFamily)
    const GLLabelsFontSize = useSelector((state: moorhen.State) => state.labelSettings.GLLabelsFontSize)
    const customRepresentationsString = useSelector((state: moorhen.State) => {
        return JSON.stringify(
            state.molecules.customRepresentations.filter(item => item.parentMolecule?.molNo === props.molecule.molNo).map(item => item.uniqueId)
        )
    })
    const generalRepresentationString = useSelector((state: moorhen.State) => {
        return JSON.stringify(
            state.molecules.generalRepresentations.filter(item => item.parentMolecule?.molNo === props.molecule.molNo).map(item => item.style)
        )
    })

    const dispatch = useDispatch()

    const cardHeaderDivRef = useRef<HTMLDivElement | null>(null)
    const addColourRulesAnchorDivRef = useRef<HTMLDivElement | null>(null)
    const busyRedrawing = useRef<boolean>(false)
    const isDirty = useRef<boolean>(false)
    const innerDrawMissingLoopsRef = useRef<boolean>(null)
    
    const [busyDrawingCustomRepresentation, setBusyDrawingCustomRepresentation] = useState<boolean>(false)
    const [busyLoadingSequences, setBusyLoadingSequences] = useState<boolean>(false)
    const [busyLoadingLigands, setBusyLoadingLigands] = useState<boolean>(false)
    const [busyLoadingCarbohydrates, setBusyLoadingCarbohydrates] = useState<boolean>(false)
    
    const [showHeaderInfo, setShowHeaderInfo] = useState<boolean>(false)
    const [showColourRulesModal, setShowColourRulesModal] = useState<boolean>(false)
    const [showCreateCustomRepresentation, setShowCreateCustomRepresentation] = useState<boolean>(false)
    const [showCreateRepresentationSettingsModal, setShowCreateRepresentationSettingsModal] = useState<boolean>(false)
    
    const [selectedResidues, setSelectedResidues] = useState<[number, number] | null>(null)
    const [clickedResidue, setClickedResidue] = useState<clickedResidueType | null>(null)
    const [isCollapsed, setIsCollapsed] = useState<boolean>(!defaultExpandDisplayCards)
    
    const [cylindersStyleAngularSampling, setCylindersStyleAngularSampling] = useState<number>(props.molecule.defaultM2tParams.cylindersStyleAngularSampling)
    const [cylindersStyleCylinderRadius, setCylindersStyleCylinderRadius] = useState<number>(props.molecule.defaultM2tParams.cylindersStyleCylinderRadius)
    const [cylindersStyleBallRadius, setCylindersStyleBallRadius] = useState<number>(props.molecule.defaultM2tParams.cylindersStyleBallRadius)
    
    const [surfaceStyleProbeRadius, setSurfaceStyleProbeRadius] = useState<number>(props.molecule.defaultM2tParams.surfaceStyleProbeRadius)
    const [ballsStyleRadiusMultiplier, setBallsStyleRadiusMultiplier] = useState<number>(props.molecule.defaultM2tParams.ballsStyleRadiusMultiplier)
    
    const [ribbonCoilThickness, setRibbonCoilThickness] = useState<number>(props.molecule.defaultM2tParams.ribbonStyleCoilThickness)
    const [ribbonHelixWidth, setRibbonHelixWidth] = useState<number>(props.molecule.defaultM2tParams.ribbonStyleHelixWidth)
    const [ribbonStrandWidth, setRibbonStrandWidth] = useState<number>(props.molecule.defaultM2tParams.ribbonStyleStrandWidth)
    const [ribbonArrowWidth, setRibbonArrowWidth] = useState<number>(props.molecule.defaultM2tParams.ribbonStyleArrowWidth)
    const [ribbonDNARNAWidth, setRibbonDNARNAWidth] = useState<number>(props.molecule.defaultM2tParams.ribbonStyleDNARNAWidth)
    const [ribbonAxialSampling, setRibbonAxialSampling] = useState<number>(props.molecule.defaultM2tParams.ribbonStyleAxialSampling)
    const [nucleotideRibbonStyle, setNucleotideRibbonStyle] = useState<"DishyBases" | "StickBases">(props.molecule.defaultM2tParams.nucleotideRibbonStyle)
    const [dishStyleAngularSampling, setDishStyleAngularSampling] = useState<number>(props.molecule.defaultM2tParams.dishStyleAngularSampling)
    
    const [bondWidth, setBondWidth] = useState<number>(props.molecule.defaultBondOptions.width)
    const [atomRadiusBondRatio, setAtomRadiusBondRatio] = useState<number>(props.molecule.defaultBondOptions.atomRadiusBondRatio)
    const [showAniso, setShowAniso] = useState<boolean>(props.molecule.defaultBondOptions.showAniso)
    const [showOrtep, setShowOrtep] = useState<boolean>(props.molecule.defaultBondOptions.showOrtep)
    const [showHs, setShowHs] = useState<boolean>(props.molecule.defaultBondOptions.showHs)
    const [bondSmoothness, setBondSmoothness] = useState<number>(props.molecule.defaultBondOptions.smoothness === 1 ? 1 : props.molecule.defaultBondOptions.smoothness === 2 ? 50 : 100)
    
    const [surfaceSigma, setSurfaceSigma] = useState<number>(4.4)
    const [surfaceLevel, setSurfaceLevel] = useState<number>(4.0)
    const [surfaceRadius, setSurfaceRadius] = useState<number>(5.0)
    const [surfaceGridScale, setSurfaceGridScale] = useState<number>(0.7)
    const [surfaceBFactor, setSurfaceBFactor] = useState<number>(100)
    
    const [maxEnvDist, setMaxEnvDist] = useState<number>(props.molecule.defaultResidueEnvironmentOptions.maxDist)
    const [labelledEnv, setLabelledEnv] = useState<boolean>(props.molecule.defaultResidueEnvironmentOptions.labelled)
    const [showEnvHBonds, setShowEnvHBonds] = useState<boolean>(props.molecule.defaultResidueEnvironmentOptions.showHBonds)
    const [showEnvContacts, setShowEnvContacts] = useState<boolean>(props.molecule.defaultResidueEnvironmentOptions.showContacts)

    const [symmetryRadius, setSymmetryRadius] = useState<number>(props.molecule.symmetryRadius)

    const customRepresentationList: moorhen.MoleculeRepresentation[] = useMemo(() => {
        return JSON.parse(customRepresentationsString).map(representationId => {
            return props.molecule.representations.find(item => item.uniqueId === representationId)
        })
    }, [customRepresentationsString])

    const generalRepresentationsList: moorhen.RepresentationStyles[] = useMemo(() => {
        return JSON.parse(generalRepresentationString)
    }, [generalRepresentationString])

    useImperativeHandle(cardRef, () => ({
        forceIsCollapsed: (value: boolean) => { 
            setIsCollapsed(value)
         }
    }), 
    [setIsCollapsed])

    const bondSettingsProps = {
        bondWidth, setBondWidth, atomRadiusBondRatio,
        setAtomRadiusBondRatio, bondSmoothness, setBondSmoothness,
        showAniso, setShowAniso, showOrtep, setShowOrtep, showHs, setShowHs
    }

    const ribbonSettingsProps = {
        ribbonCoilThickness, setRibbonCoilThickness, ribbonHelixWidth, 
        setRibbonHelixWidth, ribbonStrandWidth, setRibbonStrandWidth, 
        ribbonArrowWidth, setRibbonArrowWidth, ribbonDNARNAWidth, 
        setRibbonDNARNAWidth, ribbonAxialSampling, setRibbonAxialSampling,
        nucleotideRibbonStyle, setNucleotideRibbonStyle, dishStyleAngularSampling, 
        setDishStyleAngularSampling
    }

    const molSurfSettingsProps = {
        surfaceStyleProbeRadius, setSurfaceStyleProbeRadius, 
        ballsStyleRadiusMultiplier, setBallsStyleRadiusMultiplier
    }

    const cylinderSettingsProps = {
        cylindersStyleAngularSampling, setCylindersStyleAngularSampling, cylindersStyleBallRadius,
        setCylindersStyleBallRadius, cylindersStyleCylinderRadius, setCylindersStyleCylinderRadius
    }

    const symmetrySettingsProps = {
        symmetryRadius, setSymmetryRadius
    }

    const gaussianSettingsProps = {
        surfaceSigma, setSurfaceSigma, surfaceLevel, setSurfaceLevel, surfaceBFactor,
        setSurfaceBFactor, surfaceRadius, setSurfaceRadius, surfaceGridScale, setSurfaceGridScale
    }

    const residueEnvironmentSettingsProps = {
        maxDist: maxEnvDist, setMaxDist: setMaxEnvDist, labelled: labelledEnv, setLabelled: setLabelledEnv,
        showHBonds: showEnvHBonds, setShowHBonds: setShowEnvHBonds, showContacts: showEnvContacts,
        setShowContacts: setShowEnvContacts,
    }

    const redrawMolIfDirty = async (representationIds: string[]) => {
        if (isDirty.current) {
            busyRedrawing.current = true
            isDirty.current = false
            for (let id of representationIds) {
                await props.molecule.redrawRepresentation(id)
            }
            busyRedrawing.current = false
            redrawMolIfDirty(representationIds)
        }
    }

    const redrawEnvironment = useCallback(async () => {
        if (drawInteractions) {
            const [molecule, cid] = await getCentreAtom(molecules, props.commandCentre, props.glRef)
            if (molecule?.molNo === props.molecule.molNo) {
                props.molecule.clearBuffersOfStyle('environment')
                await props.molecule.drawEnvironment(cid)
            } else {
                props.molecule.clearBuffersOfStyle('environment')
            }
        } else {
            props.molecule.clearBuffersOfStyle('environment')
        }
    }, [drawInteractions, molecules, props.commandCentre, props.glRef, props.molecule])
    
    const redrawOriginRepresentations = useCallback(async () => {
        if (isDirty.current) {
            busyRedrawing.current = true
            isDirty.current = false
            if (props.molecule.adaptativeBondsEnabled || drawInteractions) {
                const [molecule, cid] = await getCentreAtom(molecules, props.commandCentre, props.glRef)
                if (molecule.molNo === props.molecule.molNo) {
                    if (props.molecule.adaptativeBondsEnabled) {
                        await props.molecule.redrawAdaptativeBonds(cid)
                    }
                    props.molecule.clearBuffersOfStyle('environment')
                    if (drawInteractions) {
                        await props.molecule.drawEnvironment(cid)
                    }
                } else {
                    props.molecule.clearBuffersOfStyle('environment')
                }
            } else {
                props.molecule.clearBuffersOfStyle('environment')
            }
            await props.molecule.drawSymmetry()
            busyRedrawing.current = false
            await redrawOriginRepresentations()
        }
    }, [molecules, props.molecule, drawInteractions, props.commandCentre, props.glRef])

    const handleOriginUpdate = useCallback(() => {
        isDirty.current = true
        if (!busyRedrawing.current && isVisible) {
            redrawOriginRepresentations()
        }

    }, [redrawOriginRepresentations, isVisible])

    useEffect(() => {
        if (!userPreferencesMounted || drawMissingLoops === null) {
            return
        } else if (innerDrawMissingLoopsRef.current === null) {
            innerDrawMissingLoopsRef.current = drawMissingLoops
            return
        } else if (innerDrawMissingLoopsRef.current !== drawMissingLoops) {
            innerDrawMissingLoopsRef.current = drawMissingLoops
            const representations = props.molecule.representations.filter(representation => representation.visible && ['CBs', 'CAs', 'ligands'].includes(representation.style))
            if (isVisible && representations.length > 0) {
                isDirty.current = true
                if (!busyRedrawing.current) {
                    redrawMolIfDirty(representations.map(representation => representation.uniqueId))
                }
            }
        }
    }, [drawMissingLoops])

    useEffect(() => {
        if (backgroundColor === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.visible && ['CBs', 'ligands'].includes(representation.style))

        if (isVisible && representations.length > 0) {
            const newBackgroundIsDark = isDarkBackground(...backgroundColor)
            if (props.molecule.isDarkBackground !== newBackgroundIsDark) {
                props.molecule.isDarkBackground = newBackgroundIsDark
                isDirty.current = true
                if (!busyRedrawing.current) {
                    redrawMolIfDirty(representations.map(representation => representation.uniqueId))
                }
            }
        }

    }, [backgroundColor, generalRepresentationString]);

    useEffect(() => {
        props.glRef.current.setTextFont(GLLabelsFontFamily, GLLabelsFontSize)
    }, [GLLabelsFontSize, GLLabelsFontFamily])

    useEffect(() => {
        const handleEnvSettingsChange = async () => {
            if ([labelledEnv, showEnvHBonds, showEnvContacts].some(item => item === null)) {
                return
            }
    
            const representations = props.molecule.representations.filter(representation => representation.useDefaultResidueEnvironmentOptions && representation.visible && representation.style === 'residue_environment')
    
            const needsRedraw = (
                props.molecule.defaultResidueEnvironmentOptions.showHBonds !== showEnvHBonds
                || props.molecule.defaultResidueEnvironmentOptions.showContacts !== showEnvContacts
                || props.molecule.defaultResidueEnvironmentOptions.labelled !== labelledEnv
            )
    
            if (needsRedraw) {
                props.molecule.defaultResidueEnvironmentOptions = {
                    ...props.molecule.defaultResidueEnvironmentOptions,
                    showHBonds: showEnvHBonds,
                    showContacts: showEnvContacts,
                    labelled: labelledEnv
                }
            }
    
            if (isVisible && needsRedraw) {
                await redrawEnvironment()
                if (representations.length > 0) {
                    isDirty.current = true
                    if (!busyRedrawing.current) {
                        await redrawMolIfDirty(representations.map(representation => representation.uniqueId))
                    }
                }
            }    
        }
        handleEnvSettingsChange()
    }, [labelledEnv, showEnvHBonds, showEnvContacts]);

    useEffect(() => {
        const handleMaxEnvDistChange = async () => {

            if (maxEnvDist === null) {
                return
            }
    
            const representations = props.molecule.representations.filter(representation => representation.useDefaultResidueEnvironmentOptions && representation.visible && representation.style === 'residue_environment')
    
            const needsRedraw = props.molecule.defaultResidueEnvironmentOptions.maxDist !== maxEnvDist 
    
            if (needsRedraw) {
                props.molecule.defaultResidueEnvironmentOptions = {
                    ...props.molecule.defaultResidueEnvironmentOptions,
                    maxDist: maxEnvDist
                }
            }
    
            if (isVisible && needsRedraw) {
                if (props.molecule.adaptativeBondsEnabled) {
                    isDirty.current = true
                    if (!busyRedrawing.current) {
                        await redrawOriginRepresentations()
                    }
                }
                if (representations.length > 0) {
                    isDirty.current = true
                    if (!busyRedrawing.current) {
                        await redrawMolIfDirty(representations.map(representation => representation.uniqueId))
                    }
                }
            }
        }
        handleMaxEnvDistChange()
    }, [maxEnvDist]);

    useEffect(() => {
        if ([cylindersStyleAngularSampling, cylindersStyleBallRadius, cylindersStyleCylinderRadius].some(item => item === null)) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.useDefaultM2tParams && representation.visible && representation.style === 'CRs')

        const needsRedraw = (
            props.molecule.defaultM2tParams.cylindersStyleAngularSampling !== cylindersStyleAngularSampling
            || props.molecule.defaultM2tParams.cylindersStyleBallRadius !== cylindersStyleBallRadius
            || props.molecule.defaultM2tParams.cylindersStyleCylinderRadius !== cylindersStyleCylinderRadius
        )

        if (needsRedraw) {
            props.molecule.defaultM2tParams = {
                ...props.molecule.defaultM2tParams,
                cylindersStyleAngularSampling: cylindersStyleAngularSampling,
                cylindersStyleBallRadius: cylindersStyleBallRadius,
                cylindersStyleCylinderRadius: cylindersStyleCylinderRadius
            }
        }

        if (isVisible && representations.length > 0 && needsRedraw) {
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        }
    }, [cylindersStyleAngularSampling, cylindersStyleBallRadius, cylindersStyleCylinderRadius]);

    useEffect(() => {
        if ([ballsStyleRadiusMultiplier, surfaceStyleProbeRadius].some(item => item === null)) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.useDefaultM2tParams && representation.visible && representation.style === 'MolecularSurface')

        const needsRedraw = (
            props.molecule.defaultM2tParams.ballsStyleRadiusMultiplier !== ballsStyleRadiusMultiplier
            || props.molecule.defaultM2tParams.surfaceStyleProbeRadius !== surfaceStyleProbeRadius
        )

        if (needsRedraw) {
            props.molecule.defaultM2tParams = {
                ...props.molecule.defaultM2tParams,
                ballsStyleRadiusMultiplier: ballsStyleRadiusMultiplier,
                surfaceStyleProbeRadius: surfaceStyleProbeRadius
            }
        }

        if (isVisible && representations.length > 0 && needsRedraw) {
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        }
    }, [ballsStyleRadiusMultiplier, surfaceStyleProbeRadius]);

    useEffect(() => {
        if ([nucleotideRibbonStyle, ribbonArrowWidth, ribbonAxialSampling, ribbonCoilThickness, ribbonDNARNAWidth, ribbonHelixWidth, ribbonStrandWidth, dishStyleAngularSampling].some(item => item === null)) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.useDefaultM2tParams && representation.visible && representation.style === 'CRs')

        const needsRedraw = (
            props.molecule.defaultM2tParams.ribbonStyleArrowWidth !== ribbonArrowWidth
            || props.molecule.defaultM2tParams.ribbonStyleAxialSampling !== ribbonAxialSampling
            || props.molecule.defaultM2tParams.ribbonStyleCoilThickness !== ribbonCoilThickness
            || props.molecule.defaultM2tParams.ribbonStyleDNARNAWidth !== ribbonDNARNAWidth
            || props.molecule.defaultM2tParams.ribbonStyleHelixWidth !== ribbonHelixWidth
            || props.molecule.defaultM2tParams.ribbonStyleStrandWidth !== ribbonStrandWidth
            || props.molecule.defaultM2tParams.nucleotideRibbonStyle !== nucleotideRibbonStyle
            || props.molecule.defaultM2tParams.dishStyleAngularSampling !== dishStyleAngularSampling
        )

        if (needsRedraw) {
            props.molecule.defaultM2tParams = {
                ...props.molecule.defaultM2tParams,
                ribbonStyleArrowWidth: ribbonArrowWidth,
                ribbonStyleAxialSampling: ribbonAxialSampling,
                ribbonStyleCoilThickness: ribbonCoilThickness,
                ribbonStyleDNARNAWidth: ribbonDNARNAWidth,
                ribbonStyleHelixWidth: ribbonHelixWidth,
                ribbonStyleStrandWidth: ribbonStrandWidth,
                nucleotideRibbonStyle: nucleotideRibbonStyle,
                dishStyleAngularSampling: dishStyleAngularSampling
            }
        }

        if (isVisible && representations.length > 0 && needsRedraw) {
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        }
    }, [ribbonArrowWidth, ribbonAxialSampling, ribbonCoilThickness, ribbonDNARNAWidth, ribbonHelixWidth, ribbonStrandWidth, nucleotideRibbonStyle, dishStyleAngularSampling]);

    useEffect(() => {
        if ([bondSmoothness, bondWidth, atomRadiusBondRatio, showAniso, showOrtep, showHs].some(item => item === null)) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.useDefaultBondOptions && representation.visible && ['CBs', 'CAs', 'ligands'].includes(representation.style))

        const needsRedraw = (
            props.molecule.defaultBondOptions.width !== bondWidth
            || props.molecule.defaultBondOptions.atomRadiusBondRatio !== atomRadiusBondRatio
            || props.molecule.defaultBondOptions.smoothness !== bondSmoothness
            || props.molecule.defaultBondOptions.showAniso !== showAniso
            || props.molecule.defaultBondOptions.showOrtep !== showOrtep
            || props.molecule.defaultBondOptions.showHs !== showHs
        )

        if (needsRedraw) {
            props.molecule.defaultBondOptions = {
                width: bondWidth,
                atomRadiusBondRatio: atomRadiusBondRatio,
                showAniso: showAniso,
                showOrtep: showOrtep,
                showHs: showHs,
                smoothness: bondSmoothness === 1 ? 1 : bondSmoothness === 50 ? 2 : 3
            }
        }

        if (isVisible && representations.length > 0 && needsRedraw) {
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } 

    }, [bondSmoothness, bondWidth, atomRadiusBondRatio,showAniso,showOrtep,showHs]);

    useEffect(() => {
        if (symmetryRadius === null) {
            return
        }
        props.molecule.setSymmetryRadius(symmetryRadius)
    }, [symmetryRadius]);

    useEffect(() => {
        if ([surfaceSigma, surfaceLevel, surfaceRadius, surfaceGridScale, surfaceBFactor].some(item => item === null)) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.visible && representation.style === 'gaussian')

        const needsRedraw = (
            props.molecule.gaussianSurfaceSettings.sigma !== surfaceSigma
            || props.molecule.gaussianSurfaceSettings.countourLevel !== surfaceLevel
            || props.molecule.gaussianSurfaceSettings.boxRadius !== surfaceRadius
            || props.molecule.gaussianSurfaceSettings.gridScale !== surfaceGridScale
            || props.molecule.gaussianSurfaceSettings.bFactor !== surfaceBFactor
        )

        if (needsRedraw) {
            props.molecule.gaussianSurfaceSettings = {
                sigma: surfaceSigma,
                countourLevel: surfaceLevel,
                boxRadius: surfaceRadius,
                gridScale: surfaceGridScale,
                bFactor: surfaceBFactor,
            }
        }

        if (isVisible && representations.length > 0 && needsRedraw) {
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } 

    }, [surfaceSigma, surfaceLevel, surfaceRadius, surfaceGridScale, surfaceBFactor]);

    useEffect(() => {
        dispatch( showMolecule(props.molecule) )
        props.molecule.representations
            .filter(item => { return !item.isCustom && item.style !== 'hover' })
            .forEach(item => {
                if (item.buffers.length > 0 && item.buffers[0].visible) {
                    dispatch( addGeneralRepresentation(item) )
                }
            })
    }, []);
    
    useEffect(() => {
        if (isVisible) {
            props.molecule.representations.forEach(item => generalRepresentationsList.includes(item.style) ? item.show() : null)
        } else {
            props.molecule.representations.forEach(item => generalRepresentationsList.includes(item.style) ? item.hide() : null)
        }
    }, [isVisible])

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
 
    const handleDownload = async () => {
        await props.molecule.downloadAtoms()
        props.setCurrentDropdownMolNo(-1)
    }

    const handleCopyFragment = () => {
        async function createNewFragmentMolecule() {
            const cid =  `//${clickedResidue.chain}/${selectedResidues[0]}-${selectedResidues[1]}/*`
            const newMolecule = await props.molecule.copyFragmentUsingCid(cid, true)
            dispatch( addMolecule(newMolecule) )
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
        dispatch( triggerUpdate(props.molecule.molNo) )
    }

    const handleRedo = async () => {
        await props.molecule.redo()
        props.setCurrentDropdownMolNo(-1)
        dispatch( triggerUpdate(props.molecule.molNo) )
    }

    const handleCentering = () => {
        props.molecule.centreOn()
        props.setCurrentDropdownMolNo(-1)
    }

    const handleShowInfo = () => {
        setShowHeaderInfo(true)
    }

    const handleProps = { handleCentering, handleCopyFragment, handleDownload, handleRedo, handleUndo, handleShowInfo }

    return <><Card ref={cardRef} className="px-0" style={{ marginBottom: '0.5rem', padding: '0' }} key={props.molecule.molNo}>
        <Card.Header ref={cardHeaderDivRef} style={{ padding: '0.1rem' }}>
            <Stack gap={2} direction='horizontal'>
                <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left', color: isDark ? 'white' : 'black'}}>
                    {getNameLabel(props.molecule)}
                </Col>
                <Col style={{ display: 'flex', justifyContent: 'right' }}>
                    <MoorhenMoleculeCardButtonBar
                        molecule={props.molecule}
                        glRef={props.glRef}
                        sideBarWidth={props.sideBarWidth}
                        isCollapsed={isCollapsed}
                        setIsCollapsed={setIsCollapsed}
                        clickedResidue={clickedResidue}
                        selectedResidues={selectedResidues}
                        currentDropdownMolNo={props.currentDropdownMolNo}
                        setCurrentDropdownMolNo={props.setCurrentDropdownMolNo}
                        {...handleProps}
                    />
                </Col>
            </Stack>
        </Card.Header>
        <Card.Body style={{ display: isCollapsed ? 'none' : '', padding: '0.25rem', justifyContent:'center' }}>
            <Stack gap={2} direction='vertical'>
                <Row style={{display: 'flex'}}>
                    <Col style={{ display: 'flex' }}>
                        <div ref={addColourRulesAnchorDivRef} style={{ margin: '1px', paddingTop: '0.25rem', paddingBottom: '0.25rem',  border: '1px solid', borderRadius:'0.33rem', borderColor: "#CCC" }}>
                            <FormGroup style={{ margin: "0px", padding: "0px", display: 'flex', justifyContent: 'center'}} row>
                                {allRepresentations.map(key => 
                                    <RepresentationCheckbox
                                        key={key}
                                        style={key}
                                        glRef={props.glRef}
                                        molecule={props.molecule}
                                        isVisible={isVisible}
                                />)}
                            </FormGroup>
                            <hr style={{ margin: '0.5rem' }}></hr>
                            {props.molecule.representations.some(representation => representation.isCustom) ?
                                <FormGroup style={{ margin: "0px", padding: "0px" }} row>
                                    {customRepresentationList.filter(representation => representation !== undefined).map(representation => {
                                        return <CustomRepresentationChip
                                                    key={representation.uniqueId}
                                                    urlPrefix={props.urlPrefix}
                                                    glRef={props.glRef}
                                                    addColourRulesAnchorDivRef={addColourRulesAnchorDivRef}
                                                    molecule={props.molecule}
                                                    representation={representation}/>
                                    })}
                                </FormGroup>
                            :
                                <span>No custom representations</span>
                            }
                            { busyDrawingCustomRepresentation && <LinearProgress style={{ margin: '0.5rem' }}/> }
                        </div>
                    </Col>
                    <Col md='auto' style={{paddingLeft: 0, justifyContent: 'center', display: 'flex'}} >
                        <Stack gap={1} direction='vertical'>
                        <Button style={{height: '100%'}} variant='light' onClick={() => setShowColourRulesModal((prev) => { return !prev })}>
                            <FormatColorFillOutlined/>
                        </Button>
                        <Button style={{height: '100%'}} variant='light' onClick={() => setShowCreateRepresentationSettingsModal((prev) => { return !prev })}>
                            <TuneOutlined/>
                        </Button>
                        <Button style={{ height: '100%' }} variant='light' onClick={() => setShowCreateCustomRepresentation((prev) => {return !prev})}>
                            <AddOutlined/>
                        </Button>
                        </Stack>
                    </Col>
                    <MoorhenHeaderInfoCard anchorEl={cardHeaderDivRef} molecule={props.molecule} show={showHeaderInfo} setShow={setShowHeaderInfo}/>
                    <MoorhenMoleculeRepresentationSettingsCard residueEnvironmentSettingsProps={residueEnvironmentSettingsProps} cylinderSettingsProps={cylinderSettingsProps} molSurfSettingsProps={molSurfSettingsProps} ribbonSettingsProps={ribbonSettingsProps} symmetrySettingsProps={symmetrySettingsProps} gaussianSettingsProps={gaussianSettingsProps} bondSettingsProps={bondSettingsProps} glRef={props.glRef} urlPrefix={props.urlPrefix} molecule={props.molecule} anchorEl={addColourRulesAnchorDivRef} show={showCreateRepresentationSettingsModal} setShow={setShowCreateRepresentationSettingsModal}/>
                    <MoorhenModifyColourRulesCard anchorEl={addColourRulesAnchorDivRef} urlPrefix={props.urlPrefix} glRef={props.glRef} commandCentre={props.commandCentre} molecule={props.molecule} showColourRulesToast={showColourRulesModal} setShowColourRulesToast={setShowColourRulesModal}/>
                    <MoorhenAddCustomRepresentationCard setBusy={setBusyDrawingCustomRepresentation} glRef={props.glRef} urlPrefix={props.urlPrefix} molecule={props.molecule} anchorEl={addColourRulesAnchorDivRef} show={showCreateCustomRepresentation} setShow={setShowCreateCustomRepresentation}/>
                </Row>
            <div>
                <Accordion className="moorhen-accordion"  disableGutters={true} elevation={0} TransitionProps={{ unmountOnExit: true }}>
                        <AccordionSummary style={{backgroundColor: isDark ? '#adb5bd' : '#ecf0f1'}} expandIcon={busyLoadingSequences ? <Spinner animation='border'/> : <ExpandMoreOutlined />} >
                            Sequences
                        </AccordionSummary>
                        <AccordionDetails style={{padding: '0.2rem', backgroundColor: isDark ? '#ced5d6' : 'white'}}>
                            <MoorhenSequenceList
                                setBusy={setBusyLoadingSequences}
                                molecule={props.molecule}
                                glRef={props.glRef}
                                clickedResidue={clickedResidue}
                                setClickedResidue={setClickedResidue}
                                selectedResidues={selectedResidues}
                                setSelectedResidues={setSelectedResidues}
                            />
                        </AccordionDetails>
                </Accordion>
                <Accordion className="moorhen-accordion" disableGutters={true} elevation={0} TransitionProps={{ unmountOnExit: true }}>
                    <AccordionSummary style={{backgroundColor: isDark ? '#adb5bd' : '#ecf0f1'}} expandIcon={busyLoadingLigands ? <Spinner animation='border'/> : <ExpandMoreOutlined />} >
                        Ligands
                    </AccordionSummary>
                    <AccordionDetails style={{padding: '0.2rem', backgroundColor: isDark ? '#ced5d6' : 'white'}}>
                        <MoorhenLigandList setBusy={setBusyLoadingLigands} commandCentre={props.commandCentre} molecule={props.molecule} height={convertViewtoPx(40, height)}/>
                    </AccordionDetails>
                </Accordion>
                {props.molecule.hasGlycans && 
                <Accordion className="moorhen-accordion" disableGutters={true} elevation={0} TransitionProps={{ unmountOnExit: true }}>
                    <AccordionSummary style={{backgroundColor: isDark ? '#adb5bd' : '#ecf0f1'}} expandIcon={busyLoadingCarbohydrates ? <Spinner animation='border'/> : <ExpandMoreOutlined />} >
                        Carbohydrates
                    </AccordionSummary>
                    <AccordionDetails style={{padding: '0.2rem', backgroundColor: isDark ? '#ced5d6' : 'white'}}>
                        <MoorhenCarbohydrateList setBusy={setBusyLoadingCarbohydrates} molecule={props.molecule} height={convertViewtoPx(40, height)}/>
                    </AccordionDetails>
                </Accordion>            
                }
            </div>
            </Stack>
        </Card.Body>
    </Card >
    </>
})

const getChipStyle = (colourRules: moorhen.ColourRule[], repIsVisible: boolean, isDark: boolean, width?: string) => {
    const chipStyle = { }

    if (width) { 
        chipStyle['width'] = width 
    }

    if (isDark) {
        chipStyle['color'] = 'white'
    }

    let [r, g, b, _a]: number[] = [214, 214, 214, 1]
    if (colourRules?.length > 0) {
        if (colourRules[0].isMultiColourRule) {
            const alphaHex = repIsVisible ? '99' : '33'
            chipStyle['background'] = `linear-gradient( to right, #264CFF${alphaHex}, #3FA0FF${alphaHex}, #72D8FF${alphaHex}, #AAF7FF${alphaHex}, #E0FFFF${alphaHex}, #FFFFBF${alphaHex}, #FFE099${alphaHex}, #FFAD72${alphaHex}, #F76D5E${alphaHex}, #D82632${alphaHex}, #A50021${alphaHex} )`
        } else {
            [r, g, b, _a] = MoorhenColourRule.parseHexToRgba(colourRules[0].color)
            chipStyle['backgroundColor'] = `rgba(${r}, ${g}, ${b}, ${repIsVisible ? 0.5 : 0.1})`
        }        
    } else {
        chipStyle['backgroundColor'] = `rgba(${r}, ${g}, ${b}, ${repIsVisible ? 0.5 : 0.1})`
    }

    chipStyle['borderColor'] = `rgb(${r}, ${g}, ${b})`
    
    return chipStyle
}

const RepresentationCheckbox = (props: {
    style: moorhen.RepresentationStyles;
    isVisible: boolean;
    molecule: moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>; 
}) => {

    const [busyDrawingRepresentation, setBusyDrawingRepresentation] = useState<boolean>(false)
    const [isDisabled, setIsDisabled] = useState<boolean>(true)
    const [chipStyle, setChipStyle] = useState<any>({})
    
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const showState = useSelector((state: moorhen.State) => state.molecules.generalRepresentations.some(item => item.parentMolecule?.molNo === props.molecule.molNo && item.style === props.style && !item.isCustom))
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch)

    const dispatch = useDispatch()

    useEffect(() => {

        setIsDisabled(!props.isVisible 
            || (props.style === 'ligands' && props.molecule.ligands.length === 0) 
            || (props.style === 'glycoBlocks' && !props.molecule.hasGlycans)
            || (props.style === 'restraints' && props.molecule.restraints.length === 0)
            || (['rama', 'rotamer'].includes(props.style) && props.molecule.sequences.every(sequence => [3, 4, 5].includes(sequence.type))))

    }, [props.style, props.isVisible, props.molecule, updateSwitch])

    useEffect(() => {
        setChipStyle({
            ...getChipStyle(props.molecule.defaultColourRules, showState, isDark, `${convertRemToPx(9.5)}px`),
            opacity: isDisabled ? 0.3 : 1.0
        })
    }, [showState, isDark, isDisabled, props.molecule.defaultColourRules])

    const handleClick = useCallback(() => {
        if (!isDisabled) {
            setBusyDrawingRepresentation(true)
            if (props.style === 'adaptativeBonds') {
                props.molecule.setDrawAdaptativeBonds(!showState).then(_ => {
                    dispatch( showState ? removeGeneralRepresentation(props.molecule.adaptativeBondsRepresentation) : addGeneralRepresentation(props.molecule.adaptativeBondsRepresentation) )
                    setBusyDrawingRepresentation(false)    
                })
            } else if (props.style === 'environment') {
                if (showState) {
                    props.molecule.environmentRepresentation?.hide()
                    dispatch(removeGeneralRepresentation(props.molecule.environmentRepresentation))
                    setBusyDrawingRepresentation(false)
                } else {
                    props.molecule.drawEnvironment().then(_ => {
                        dispatch(addGeneralRepresentation(props.molecule.environmentRepresentation))
                        setBusyDrawingRepresentation(false)
                    })    
                }
            } else if (showState) {
                const representation = props.molecule.hide(props.style)
                dispatch(removeGeneralRepresentation(representation))
                setBusyDrawingRepresentation(false)
            } else {
                props.molecule.show(props.style).then(representation => {
                    dispatch(addGeneralRepresentation(representation))
                    setBusyDrawingRepresentation(false)
                })
            }
        }
    }, [showState, isDisabled, props, busyDrawingRepresentation])

    return <Box sx={{ marginLeft: '0.2rem', marginBottom: '0.2rem', position: 'relative' }}>
            <Chip
                disabled={busyDrawingRepresentation}
                style={chipStyle}
                variant={"outlined"}
                label={`${representationLabelMapping[props.style]}`}
                onClick={handleClick}/>
            {busyDrawingRepresentation &&
            <CircularProgress
                size={'1.5rem'}
                disableShrink={true}
                sx={{
                    color: chipStyle['borderColor'],
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    margin: '-0.74rem',
                }}
            />}
        </Box>
}

const CustomRepresentationChip = (props: {
    urlPrefix: string;
    addColourRulesAnchorDivRef: React.RefObject<HTMLDivElement>;
    glRef: React.RefObject<webGL.MGWebGL>;
    molecule: moorhen.Molecule;
    representation: moorhen.MoleculeRepresentation; 
}) => {
    
    const { representation, molecule } = props

    const [representationIsVisible, setRepresentationIsVisible] = useState<boolean>(true)
    const [showEditRepresentation, setShowEditRepresentation] = useState<boolean>(false)
    
    const dispatch = useDispatch()
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const isVisible = useSelector((state: moorhen.State) => state.molecules.visibleMolecules.some(molNo => molNo === molecule.molNo))

    const chipStyle = getChipStyle(representation.colourRules, representationIsVisible && isVisible, isDark)
    if (!isVisible) chipStyle['opacity'] = '0.3'

    useEffect(() => {
        if (!isVisible) {
            representation.hide()
        } else if (representationIsVisible) {
            representation.show()
        }
    }, [isVisible])
    
    useEffect(() => {
        representationIsVisible ? representation.show() : representation.hide()
    }, [representationIsVisible])

    const handleVisibility = useCallback(() => {
        if (isVisible) {
            setRepresentationIsVisible(!representationIsVisible)
        }
    }, [isVisible, representationIsVisible])

    const handleDelete = useCallback(() => {
        molecule.removeRepresentation(representation.uniqueId)
        dispatch( removeCustomRepresentation(representation) )
    }, [molecule, representation])

    return <Box sx={{ marginLeft: '0.2rem', marginBottom: '0.2rem', position: 'relative' }}>
        <Chip
            style={chipStyle}
            variant={"outlined"}
            label={`${representationLabelMapping[representation.style]} ${representation.cid.length > 21 ? `${representation.cid.slice(0,20)} ...` : representation.cid}`}
            deleteIcon={
                <div>
                    <EditOutlined style={{color: isDark ? 'white' : '#696969'}} onClick={() => setShowEditRepresentation(true)}/>
                    <DeleteOutlined style={{color: isDark ? 'white' : '#696969'}} onClick={handleDelete}/>
                    <MoorhenAddCustomRepresentationCard
                        mode='edit'
                        glRef={props.glRef}
                        urlPrefix={props.urlPrefix}
                        molecule={props.molecule}
                        anchorEl={props.addColourRulesAnchorDivRef}
                        representation={props.representation}
                        show={showEditRepresentation}
                        setShow={setShowEditRepresentation}/>
                </div>
            }
            onClick={handleVisibility}
            onDelete={() => {}}
        />
        </Box>
}
