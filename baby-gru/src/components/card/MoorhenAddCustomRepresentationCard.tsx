import { useState, useRef, useEffect, memo } from 'react';
import { Stack, Button, FormSelect, Form, InputGroup, Row } from "react-bootstrap";
import { getMultiColourRuleArgs } from '../../utils/utils';
import { representationLabelMapping } from '../../utils/enums';
import { MoorhenSequenceViewer, moorhenSequenceToSeqViewer } from '../sequence-viewer/MoorhenSequenceViewer';
import { moorhen } from "../../types/moorhen";
import { Popover } from '@mui/material';
import { MoorhenChainSelect } from '../select/MoorhenChainSelect';
import { HexAlphaColorPicker, HexColorInput } from "react-colorful";
import { webGL } from '../../types/mgWebGL';
import { GrainOutlined } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { MoorhenCidInputForm } from '../form/MoorhenCidInputForm';
import { addCustomRepresentation } from '../../store/moleculesSlice';
import { MoorhenColourRule } from '../../utils/MoorhenColourRule';
import { NcsColourSwatch } from './MoorhenColourRuleCard';
import { MoorhenSlider } from "../inputs/MoorhenSlider";
import { BondSettingsPanel, MolSurfSettingsPanel, ResidueEnvironmentSettingsPanel, RibbonSettingsPanel } from './MoorhenMoleculeRepresentationSettingsCard';
import { useSnackbar } from 'notistack';
import { COOT_BOND_REPRESENTATIONS, M2T_REPRESENTATIONS } from "../../utils/enums"

const customRepresentations = [ 'CBs', 'CAs', 'CRs', 'gaussian', 'MolecularSurface', 'VdwSpheres', 'MetaBalls', 'residue_environment' ]

export const MoorhenAddCustomRepresentationCard = memo((props: {
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    show: boolean;
    anchorEl: React.RefObject<HTMLDivElement>;
    molecule: moorhen.Molecule;
    urlPrefix: string;
    glRef: React.RefObject<webGL.MGWebGL>;
    mode?: "add" | "edit";
    representation?: moorhen.MoleculeRepresentation;
    setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    console.log('MoorhenAddCustomRepresentationCard', props.mode, props.representation?.style)

    const applyColourToNonCarbonAtomsSwitchRef = useRef<HTMLInputElement | null>(null)
    const useDefaultColoursSwitchRef = useRef<HTMLInputElement | null>(null)
    const useDefaultRepresentationSettingsSwitchRef = useRef<HTMLInputElement | null>(null)
    const ruleSelectRef = useRef<HTMLSelectElement | null>(null)
    const cidFormRef = useRef<HTMLInputElement | null>(null)
    const styleSelectRef = useRef<HTMLSelectElement | null>(null)
    const focusStyleSelectRef = useRef<HTMLSelectElement | null>(null)
    const backgroundStyleSelectRef = useRef<HTMLSelectElement | null>(null)
    const chainSelectRef = useRef<HTMLSelectElement | null>(null)
    const colourModeSelectRef = useRef<HTMLSelectElement | null>(null)
    const colourSwatchRef = useRef<HTMLDivElement | null>(null)
    const alphaSwatchRef = useRef<HTMLImageElement | null>(null)
    const nonCustomOpacitySliderRef = useRef<any>(null)
    const ncsColourRuleRef = useRef<null | moorhen.ColourRule>(null)

    const [ruleType, setRuleType] = useState<string>(props.representation ? "cid" : "molecule")
    const [representationStyle, setRepresentationStyle] = useState<string>(props.representation?.style ?? 'CBs')
    const [useDefaultRepresentationSettings, setUseDefaultRepresentationSettings] = useState<boolean>(
        () => {
            if (props.representation) {
                if (M2T_REPRESENTATIONS.includes(props.representation.style)) {
                    return props.representation.useDefaultM2tParams
                } else if (COOT_BOND_REPRESENTATIONS.includes(props.representation.style)) {
                    return props.representation.useDefaultBondOptions
                } else if (props.representation.style === "residue_environment") {
                    return props.representation.useDefaultResidueEnvironmentOptions
                }
            } else {
                return true
            }
        }
    )

    const [colourMode, setColourMode] = useState<string>("custom")
    const [nonCustomOpacity, setNonCustomOpacity] = useState<number>(props.representation?.nonCustomOpacity ? props.representation.nonCustomOpacity : 1.0)
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false)
    const [showAlphaSlider, setShowAlphaSlider] = useState<boolean>(false)
    const [colour, setColour] = useState<string>((props.representation && !props.representation?.useDefaultColourRules && !props.representation?.colourRules[0]?.isMultiColourRule) ? props.representation?.colourRules[0].color : '#47d65f')
    const [applyColourToNonCarbonAtoms, setApplyColourToNonCarbonAtoms] = useState<boolean>((props.representation && !props.representation?.useDefaultColourRules && props.representation?.colourRules?.length !== 0) ? props.representation?.colourRules[0].applyColourToNonCarbonAtoms : false)
    const [useDefaultColours, setUseDefaultColours] = useState<boolean>(props.representation?.useDefaultColourRules ?? true)

    const [sequenceRangeSelect, setSequenceRangeSelect] = useState(null)
    const [selectedChain, setSelectedChain] = useState<string>(props.molecule.sequences[0].chain)
    const [sequenceResidueRange, setSequenceResidueRange] = useState<[number, number] | null>(null)

    const [atomRadiusBondRatio, setAtomRadiusBondRatio] = useState<number>(props.representation?.bondOptions?.atomRadiusBondRatio ?? props.molecule.defaultBondOptions.atomRadiusBondRatio)
    const [showAniso, setShowAniso] = useState<boolean>(props.representation?.bondOptions?.showAniso ?? props.molecule.defaultBondOptions.showAniso)
    const [showOrtep, setShowOrtep] = useState<boolean>(props.representation?.bondOptions?.showOrtep ?? props.molecule.defaultBondOptions.showOrtep)
    const [showHs, setShowHs] = useState<boolean>(props.representation?.bondOptions?.showHs ?? props.molecule.defaultBondOptions.showHs)
    const [bondWidth, setBondWidth] = useState<number>(props.representation?.bondOptions?.width ?? props.molecule.defaultBondOptions.width)
    const [bondSmoothness, setBondSmoothness] = useState<number>(props.molecule.defaultBondOptions.smoothness === 1 ? 1 : props.molecule.defaultBondOptions.smoothness === 2 ? 50 : 100)

    const [ribbonCoilThickness, setRibbonCoilThickness] = useState<number>(props.representation?.m2tParams.ribbonStyleCoilThickness ?? props.molecule.defaultM2tParams.ribbonStyleCoilThickness)
    const [ribbonHelixWidth, setRibbonHelixWidth] = useState<number>(props.representation?.m2tParams.ribbonStyleHelixWidth ??  props.molecule.defaultM2tParams.ribbonStyleHelixWidth)
    const [ribbonStrandWidth, setRibbonStrandWidth] = useState<number>(props.representation?.m2tParams?.ribbonStyleStrandWidth ??  props.molecule.defaultM2tParams.ribbonStyleStrandWidth)
    const [ribbonArrowWidth, setRibbonArrowWidth] = useState<number>(props.representation?.m2tParams?.ribbonStyleArrowWidth ?? props.molecule.defaultM2tParams.ribbonStyleArrowWidth)
    const [ribbonDNARNAWidth, setRibbonDNARNAWidth] = useState<number>(props.representation?.m2tParams?.ribbonStyleDNARNAWidth ?? props.molecule.defaultM2tParams.ribbonStyleDNARNAWidth)
    const [nucleotideRibbonStyle, setNucleotideRibbonStyle] = useState<"DishyBases" | "StickBases">(props.representation?.m2tParams?.nucleotideRibbonStyle ??  props.molecule.defaultM2tParams.nucleotideRibbonStyle)
    const [ribbonAxialSampling, setRibbonAxialSampling] = useState<number>(props.representation?.m2tParams?.ribbonStyleAxialSampling ??  props.molecule.defaultM2tParams.ribbonStyleAxialSampling)
    const [dishStyleAngularSampling, setDishStyleAngularSampling] = useState<number>(props.representation?.m2tParams?.dishStyleAngularSampling ?? props.molecule.defaultM2tParams.dishStyleAngularSampling)
    const [ssUsageScheme, setSsUsageScheme] = useState<number>(props.representation?.m2tParams?.ssUsageScheme ?? props.molecule.defaultM2tParams.ssUsageScheme)

    const [surfaceStyleProbeRadius, setSurfaceStyleProbeRadius] = useState<number>(props.representation?.m2tParams.surfaceStyleProbeRadius ?? props.molecule.defaultM2tParams.surfaceStyleProbeRadius)
    const [ballsStyleRadiusMultiplier, setBallsStyleRadiusMultiplier] = useState<number>(props.representation?.m2tParams.ballsStyleRadiusMultiplier ?? props.molecule.defaultM2tParams.ballsStyleRadiusMultiplier)

    const [maxEnvDist, setMaxEnvDist] = useState<number>(props.representation?.residueEnvironmentOptions?.maxDist ?? props.molecule.defaultResidueEnvironmentOptions.maxDist)
    const [labelledEnv, setLabelledEnv] = useState<boolean>(props.representation?.residueEnvironmentOptions?.labelled ?? props.molecule.defaultResidueEnvironmentOptions.labelled)
    const [showEnvHBonds, setShowEnvHBonds] = useState<boolean>(props.representation?.residueEnvironmentOptions?.showHBonds ?? props.molecule.defaultResidueEnvironmentOptions.showHBonds)
    const [showEnvContacts, setShowEnvContacts] = useState<boolean>(props.representation?.residueEnvironmentOptions?.showContacts ?? props.molecule.defaultResidueEnvironmentOptions.showContacts)

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const dispatch = useDispatch()

    const { enqueueSnackbar } = useSnackbar()

    const mode = props.mode ?? "add"

    const ribbonSettingsProps = {
        ribbonCoilThickness, setRibbonCoilThickness, ribbonHelixWidth, setRibbonHelixWidth,
        ribbonStrandWidth, setRibbonStrandWidth, ribbonArrowWidth, setRibbonArrowWidth, ribbonDNARNAWidth,
        setRibbonDNARNAWidth, ribbonAxialSampling, setRibbonAxialSampling, nucleotideRibbonStyle,
        setNucleotideRibbonStyle, dishStyleAngularSampling, setDishStyleAngularSampling,
        ssUsageScheme, setSsUsageScheme
    }

    const bondSettingsProps = {
        bondWidth, setBondWidth, atomRadiusBondRatio,
        setAtomRadiusBondRatio, bondSmoothness, setBondSmoothness,
        showAniso, setShowAniso, showOrtep, setShowOrtep, showHs, setShowHs
    }

    const molSurfSettingsProps = {
        surfaceStyleProbeRadius, setSurfaceStyleProbeRadius,
        ballsStyleRadiusMultiplier, setBallsStyleRadiusMultiplier
    }

    const residueEnvironmentSettingsProps = {
        maxDist: maxEnvDist, setMaxDist: setMaxEnvDist, labelled: labelledEnv, setLabelled: setLabelledEnv,
        showHBonds: showEnvHBonds, setShowHBonds: setShowEnvHBonds, showContacts: showEnvContacts,
        setShowContacts: setShowEnvContacts
    }

    const selectedSequence =  props.molecule.sequences.find(sequence => sequence.chain === selectedChain)
 

    useEffect(() => {
        console.log('selectedResidues', sequenceResidueRange)
    }, [sequenceResidueRange])

    const createRepresentation = async () => {
        props.setBusy?.(true)

        let cidSelection: string
        switch(ruleSelectRef.current.value) {
            case "molecule":
                cidSelection = "//*"
                break
            case "chain":
                cidSelection = `//${chainSelectRef.current.value}`
                break
            case "residue-range":
                const selectedResidues = sequenceResidueRange
                console.log('selectedResidues', selectedResidues)
                cidSelection = (selectedResidues && selectedResidues.length === 2) ? `//${chainSelectRef.current.value}/${selectedResidues[0]}-${selectedResidues[1]}` : null
                break
            case "cid":
                cidSelection = cidFormRef.current.value
                break
            default:
                console.warn('Unrecognised residue selection for the custom representation')
                break
        }

        if (!cidSelection) {
            console.warn('Invalid CID selection to create a custom representation')
            return
        }

        let colourRule: moorhen.ColourRule
        if (!useDefaultColoursSwitchRef.current.checked) {
            const colourRuleCid = styleSelectRef.current.value === "residue_environment" ? "//*" : cidSelection
            switch(colourModeSelectRef.current.value) {
                case "custom":
                    colourRule = new MoorhenColourRule(
                        ruleSelectRef.current.value, colourRuleCid, colour, props.molecule.commandCentre, false, applyColourToNonCarbonAtomsSwitchRef.current?.checked
                    )
                    colourRule.setArgs([ colourRuleCid, colour ])
                    colourRule.setParentMolecule(props.molecule)
                    break
                case 'mol-symm':
                    if (ncsColourRuleRef.current) {
                        colourRule =  ncsColourRuleRef.current
                        colourRule.setApplyColourToNonCarbonAtoms(applyColourToNonCarbonAtomsSwitchRef.current?.checked)
                        break
                    }
                case 'secondary-structure':
                case 'jones-rainbow':
                case 'mol-symm':
                case "b-factor":
                case "b-factor-norm":
                case 'electrostatics':
                case "af2-plddt":
                    colourRule = new MoorhenColourRule(
                        colourModeSelectRef.current.value, "/*/*/*/*", "#ffffff", props.molecule.commandCentre, true, applyColourToNonCarbonAtomsSwitchRef.current?.checked
                    )
                    colourRule.setLabel(`${
                        colourModeSelectRef.current.value === 'secondary-structure' ? 'Secondary struct.'
                        : colourModeSelectRef.current.value === 'jones-rainbow' ? 'Jones-Rainbow'
                        : colourModeSelectRef.current.value === 'mol-symm' ? 'Mol. Symm.'
                        : colourModeSelectRef.current.value === "b-factor" ? 'B-factor'
                        : colourModeSelectRef.current.value === "b-factor-norm" ? 'B-factor norm.'
                        : colourModeSelectRef.current.value === "af2-plddt" ? 'PLDDT'
                        : colourModeSelectRef.current.value === "electrostatics" ? 'Electrostatics'
                        : ''
                    }`)
                    const ruleArgs = await getMultiColourRuleArgs(props.molecule, colourModeSelectRef.current.value)
                    colourRule.setArgs([ ruleArgs ])
                    colourRule.setParentMolecule(props.molecule)
                    break
                case "metaballs":
                    //I do not think we have to do anything as there is no way to change colours for metaballs at present.
                    break
                default:
                    console.log('Unrecognised colour mode')
                    break
            }
        }

        let bondOptions: moorhen.cootBondOptions
        if (!useDefaultRepresentationSettingsSwitchRef.current?.checked && COOT_BOND_REPRESENTATIONS.includes(styleSelectRef.current.value)) {
            bondOptions = {
                width: bondWidth,
                smoothness: bondSmoothness === 1 ? 1 : bondSmoothness === 50 ? 2 : 3,
                atomRadiusBondRatio: atomRadiusBondRatio,
                showAniso: showAniso,
                showOrtep: showOrtep,
                showHs: showHs
            }
        }

        let m2tParams: moorhen.m2tParameters
        if (!useDefaultRepresentationSettingsSwitchRef.current?.checked && M2T_REPRESENTATIONS.includes(styleSelectRef.current.value)) {
            m2tParams = {
                ...props.molecule.defaultM2tParams,
                ribbonStyleArrowWidth: ribbonArrowWidth,
                ribbonStyleAxialSampling: ribbonAxialSampling,
                ribbonStyleCoilThickness: ribbonCoilThickness,
                ribbonStyleDNARNAWidth: ribbonDNARNAWidth,
                ribbonStyleHelixWidth: ribbonHelixWidth,
                ribbonStyleStrandWidth: ribbonStrandWidth,
                nucleotideRibbonStyle: nucleotideRibbonStyle as ("DishyBases" | "StickBases"),
                surfaceStyleProbeRadius: surfaceStyleProbeRadius,
                ballsStyleRadiusMultiplier: ballsStyleRadiusMultiplier
            }
        }

        let residueEnvSettings: moorhen.residueEnvironmentOptions
        if (!useDefaultRepresentationSettingsSwitchRef.current?.checked && styleSelectRef.current.value === "residue_environment") {
            residueEnvSettings = {
                ...props.molecule.defaultResidueEnvironmentOptions,
                maxDist: maxEnvDist,
                labelled: labelledEnv,
                showContacts: showEnvContacts,
                showHBonds: showEnvHBonds,
                focusRepresentation: focusStyleSelectRef.current.value as moorhen.RepresentationStyles,
                backgroundRepresentation: backgroundStyleSelectRef.current.value as moorhen.RepresentationStyles
            }
        }

        const nonCustomAlpha = (
            colourMode === 'b-factor' || colourMode === 'b-factor-norm' || colourMode === "secondary-structure" ||
            colourMode ==="af2-plddt" ||  colourMode === 'electrostatics' || colourMode === 'jones-rainbow' ||
            representationStyle === "MetaBalls"
        ) ? nonCustomOpacity : null
        if (mode === 'add') {
            const representation = await props.molecule.addRepresentation(
                styleSelectRef.current.value,
                cidSelection,
                true,
                colourRule ? [ colourRule ] : null,
                bondOptions,
                m2tParams,
                residueEnvSettings,
                nonCustomAlpha
            )
            dispatch( addCustomRepresentation(representation) )
        } else if (mode === 'edit' && props.representation.uniqueId) {
            const representation = props.molecule.representations.find(item => item.uniqueId === props.representation.uniqueId)
            if (representation) {
                representation.cid = cidSelection
                representation.setStyle(styleSelectRef.current.value)
                representation.setUseDefaultColourRules(!colourRule)
                representation.setColourRules(colourRule ? [ colourRule ] : null)
                representation.setBondOptions(bondOptions)
                representation.setM2tParams(m2tParams)
                representation.setResidueEnvOptions(residueEnvSettings)
                await representation.redraw()
                representation.setNonCustomOpacity(nonCustomAlpha)
            }
        }

        props.setShow(false)
        props.setBusy?.(false)
    }

    const handleCreateRepresentation = async () => {
        try {
            await createRepresentation()
        } catch (err) {
            console.warn(err)
            enqueueSnackbar(`Something went wrong while ${mode === "edit" ? "editing" : "creating a new"} custom representation`, { variant: "error" })
        }
    }

    const handleColourModeChange = (evt) => {
        if (evt.target.value === "mol-symm" && !ncsColourRuleRef.current && mode === "edit") {
            const representation = props.molecule.representations.find(item => item.uniqueId === props.representation.uniqueId)
            if (representation?.colourRules?.length > 0) ncsColourRuleRef.current = representation.colourRules[0]
        }
        setColourMode(evt.target.value)
    }

    const applyNcsColourChange = async () => {
        await props.molecule.redraw()
    }

    const handleOpacityChange = (newVal) => {
        setNonCustomOpacity(newVal)
        if(props.representation){
            props.representation.setNonCustomOpacity(newVal)
        }
    }

    const handleResiduesRangeSelection = (selection) => {
        setSequenceResidueRange(selection.range)
        console.log('handleResiduesRangeSelection', selection.range)
    }

    return <Popover
                onClose={() => props.setShow(false)}
                open={props.show}
                anchorEl={props.anchorEl.current}
                anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
                transformOrigin={{ vertical: 'center', horizontal: 'center' }}
                sx={{'& .MuiPaper-root': {backgroundColor: isDark ? 'grey' : 'white', marginTop: '0.1rem', borderRadius: '1rem', borderStyle: 'solid', borderColor: 'grey', borderWidth: '1px'}}}
            >
            <Stack gap={2} direction='vertical' style={{width: '25rem', margin: '0.5rem'}}>
                <Form.Group style={{ margin: '0px', width: '100%' }}>
                    <Form.Label>Style</Form.Label>
                    <FormSelect ref={styleSelectRef} size="sm" value={representationStyle} onChange={(evt) => {
                        setRepresentationStyle(evt.target.value)
                        if (evt.target.value === "residue_environment") setRuleType("cid")
                    }}>
                        {customRepresentations.map(key => {
                            return <option value={key} key={key}>{representationLabelMapping[key]}</option>
                        })}
                    </FormSelect>
                </Form.Group>
                <Form.Group style={{ width: '100%', margin: 0 }}>
                    <Form.Label>Residue selection</Form.Label>
                    <FormSelect size="sm" ref={ruleSelectRef} defaultValue={ruleType} onChange={(val) => setRuleType(val.target.value)}>
                        {representationStyle === "residue_environment" ?
                        <>
                        <option value={'cid'} key={'cid'}>Atom selection</option>
                        </>
                        :
                        <>
                        <option value={'molecule'} key={'molecule'}>All molecule</option>
                        <option value={'chain'} key={'chain'}>Chain</option>
                        <option value={'residue-range'} key={'residue-range'}>Residue range</option>
                        <option value={'cid'} key={'cid'}>Atom selection</option>
                        </>
                        }
                    </FormSelect>
                </Form.Group>
                {ruleType === 'cid' &&
                    <MoorhenCidInputForm ref={cidFormRef} label='Atom selection' margin='0.5rem' width='97%' defaultValue={props.representation?.cid ?? ""} allowUseCurrentSelection={true}/>
                }
                {(ruleType === 'chain' || ruleType === 'residue-range')  &&
                <div style={{justifyContent: 'center', display: 'flex'}}>
                    <MoorhenChainSelect molecules={molecules} onChange={(evt) => setSelectedChain(evt.target.value)} selectedCoordMolNo={props.molecule.molNo} ref={chainSelectRef} allowedTypes={[1, 2, 3, 4, 5]}/>
                </div>
                }
                {ruleType === 'residue-range' ? (
                    <div style={{width: '100%'}}>
                        <MoorhenSequenceViewer
                            sequences={moorhenSequenceToSeqViewer(selectedSequence, props.molecule.name, props.molecule.molNo)}
                            onResiduesSelect={(selection) => {handleResiduesRangeSelection(selection)}}
                        />
                    </div>
                ): null}
                {['CBs', 'CAs', 'ligands', 'CRs', 'MolecularSurface', 'residue_environment'].includes(representationStyle) &&
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check
                        ref={useDefaultRepresentationSettingsSwitchRef}
                        type="switch"
                        label={`Apply general representation settings`}
                        checked={useDefaultRepresentationSettings}
                        onChange={ () => setUseDefaultRepresentationSettings( (prev) => !prev ) }
                    />
                </InputGroup>
                }
                {!useDefaultRepresentationSettings && representationStyle === "MolecularSurface" &&
                <MolSurfSettingsPanel {...molSurfSettingsProps}/>
                }
                {!useDefaultRepresentationSettings && representationStyle === "CRs" &&
                <RibbonSettingsPanel {...ribbonSettingsProps}/>
                }
                {!useDefaultRepresentationSettings && COOT_BOND_REPRESENTATIONS.includes(representationStyle) &&
                <BondSettingsPanel {...bondSettingsProps}/>
                }
                {!useDefaultRepresentationSettings && representationStyle === "residue_environment" &&
                <ResidueEnvironmentSettingsPanel {...residueEnvironmentSettingsProps}/>
                }
                {representationStyle === "residue_environment" && !useDefaultRepresentationSettings &&
                <Stack gap={1} direction='horizontal' style={{ marginLeft: '0.1rem', marginRight: '0.1rem', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: 'grey', borderRadius: '1.5rem' }}>
                    <Form.Group style={{ margin: '0px', width: '100%' }}>
                        <Form.Label>Focus Style</Form.Label>
                        <FormSelect ref={focusStyleSelectRef} defaultValue={props.representation?.residueEnvironmentOptions.focusRepresentation ?? 'CBs'} size="sm">
                            {[ 'CBs', 'CAs', 'CRs', 'MolecularSurface', 'VdwSpheres' ].map(key => {
                                return <option value={key} key={key}>{representationLabelMapping[key]}</option>
                            })}
                        </FormSelect>
                    </Form.Group>
                    <Form.Group style={{ margin: '0px', width: '100%' }}>
                        <Form.Label>Background Style</Form.Label>
                        <FormSelect ref={backgroundStyleSelectRef} defaultValue={props.representation?.residueEnvironmentOptions.backgroundRepresentation ?? 'CRs'} size="sm">
                            {[ 'CBs', 'CAs', 'CRs', 'MolecularSurface', 'VdwSpheres' ].map(key => {
                                return <option value={key} key={key}>{representationLabelMapping[key]}</option>
                            })}
                        </FormSelect>
                    </Form.Group>
                </Stack>
                }
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check
                        ref={useDefaultColoursSwitchRef}
                        type="switch"
                        label="Apply general colour settings"
                        checked={useDefaultColours}
                        onChange={() => {
                            setUseDefaultColours((prev) => {return !prev})
                         }}
                    />
                </InputGroup>
                {['CBs', 'VdwSpheres', 'ligands'].includes(representationStyle) && !useDefaultColours &&
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check
                        ref={applyColourToNonCarbonAtomsSwitchRef}
                        type="switch"
                        label="Apply colour to non-carbon atoms also"
                        checked={applyColourToNonCarbonAtoms}
                        onChange={() => {
                            setApplyColourToNonCarbonAtoms((prev) => {return !prev})
                        }}
                    />
                </InputGroup>
                }
                {!useDefaultColours &&
                <>
                <Row style={{paddingLeft: '1rem'}}>
                        <FormSelect style={{ width: '50%', marginRight: '0.5rem' }} size="sm" ref={colourModeSelectRef} defaultValue={colourMode} onChange={handleColourModeChange}>
                        {representationStyle !== "MetaBalls" &&
                        <>
                        <option value={'custom'} key={'custom'}>User defined colour</option>
                        <option value={'secondary-structure'} key={'secondary-structure'}>Secondary structure</option>
                        <option value={'jones-rainbow'} key={'jones-rainbow'}>Jones' rainbow</option>
                        <option value={'b-factor'} key={'b-factor'}>B-Factor</option>
                        <option value={'b-factor-norm'} key={'b-factor-norm'}>B-Factor (normalised)</option>
                        <option value={'af2-plddt'} key={'af2-plddt'}>AF2 PLDDT</option>
                        <option value={'mol-symm'} key={'mol-symm'}>Mol. Symmetry</option>
                        </>
                        }
                        {representationStyle === "MolecularSurface" &&
                        <option value={'electrostatics'} key={'electrostatics'}>Electrostatics</option>
                        }
                        {representationStyle === "MetaBalls" &&
                        <option value={'metaballs'} key={'metaballs'}>Metaballs colours</option>
                        }
                    </FormSelect>
                    {representationStyle !== "MetaBalls" &&
                    <>
                    {(colourMode === 'b-factor' || colourMode === 'b-factor-norm') ?
                        <img className="colour-rule-icon" src={`${props.urlPrefix}/pixmaps/temperature.svg`} alt='b-factor' style={{ width: '30px', height: '30px', borderRadius: '3px', border: '1px solid #c9c9c9', padding: 0}} ref={alphaSwatchRef} onClick={() => setShowAlphaSlider(true)}/>
                    : colourMode === "secondary-structure" ?
                        <img className='colour-rule-icon' src={`${props.urlPrefix}/pixmaps/secondary-structure-grey.svg`} alt='ss2' style={{ width: '30px', height: '30px', borderRadius: '3px', border: '1px solid #c9c9c9', padding: 0}} ref={alphaSwatchRef} onClick={() => setShowAlphaSlider(true)}/>
                    : colourMode === "electrostatics" ?
                        <img className='colour-rule-icon' src={`${props.urlPrefix}/pixmaps/esurf.svg`} alt='Electrostatic surface' style={{ width: '30px', height: '30px', borderRadius: '3px', border: '1px solid #c9c9c9', padding: 0}} ref={alphaSwatchRef} onClick={() => setShowAlphaSlider(true)}/>
                    : colourMode === "jones-rainbow" ?
                        <img className='colour-rule-icon' src={`${props.urlPrefix}/pixmaps/jones_rainbow.svg`} alt='ss2' style={{ width: '30px', height: '30px', borderRadius: '3px', border: '1px solid #c9c9c9', padding: 0}} ref={alphaSwatchRef} onClick={() => setShowAlphaSlider(true)}/>
                    : colourMode === "mol-symm" ?
                    mode === "edit" ?
                    <NcsColourSwatch style={{cursor: "pointer", height:'30px', width:'30px', padding: "0px", borderStyle: 'solid', borderColor: '#ced4da', borderWidth: '3px', borderRadius: '8px'}} rule={ncsColourRuleRef?.current} applyColourChange={applyNcsColourChange} />
                    :
                    <GrainOutlined style={{height:'30px', width:'30px', padding:0, borderStyle: 'solid', borderColor: '#ced4da', borderWidth: '3px', borderRadius: '8px'}}/>
                    :
                    colourMode === 'custom' ?
                    <div
                        style={{ display: colourMode === 'custom' ? 'flex' : 'none', width: '28px', height: '28px', borderRadius: '8px', border: '3px solid #fff', boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(0, 0, 0, 0.1)', cursor: 'pointer', backgroundColor: colour }}
                        onClick={() => setShowColourPicker(true)}
                        ref={colourSwatchRef}
                    />
                    :
                        <img className='colour-rule-icon' src={`${props.urlPrefix}/pixmaps/alphafold_rainbow.svg`} alt='ss2' style={{ width: '30px', height: '30px', borderRadius: '3px', border: '1px solid #c9c9c9', padding: 0}} ref={alphaSwatchRef} onClick={() => setShowAlphaSlider(true)}/>
                    }
                    </>
                    }
                    {representationStyle === "MetaBalls" &&
                        <img className='colour-rule-icon' src={`${props.urlPrefix}/pixmaps/metaballscolour.svg`} alt='ss2' style={{ width: '30px', height: '30px', borderRadius: '3px', border: '1px solid #c9c9c9', padding: 0}} ref={alphaSwatchRef} onClick={() => setShowAlphaSlider(true)}/>
                    }
                </Row>
                <Popover
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    open={!useDefaultColours && showAlphaSlider}
                    onClose={() => setShowAlphaSlider(false)}
                    anchorEl={alphaSwatchRef.current}
                    sx={{
                        '& .MuiPaper-root': {
                            overflowY: 'hidden', borderRadius: '8px'
                        }
                    }}
                >
                             <Form.Group style={{paddingLeft: '0.5rem', paddingRight: '0.5rem', width:'100px'}} controlId="MoorhenMoleculeNonCustomAlphaSlider">
                               <MoorhenSlider
                                   minVal={0.0}
                                   maxVal={1.0}
                                   showButtons={false}
                                   decimalPlaces={2}
                                   logScale={false}
                                   sliderTitle="Opacity"
                                   externalValue={nonCustomOpacity}
                                   setExternalValue={(newVal: number) => handleOpacityChange(newVal) } />
                             </Form.Group>
                </Popover>
                <Popover
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    open={!useDefaultColours && showColourPicker}
                    onClose={() => setShowColourPicker(false)}
                    anchorEl={colourSwatchRef.current}
                    sx={{
                        '& .MuiPaper-root': {
                            overflowY: 'hidden', borderRadius: '8px'
                        }
                    }}
                >
                    <Stack direction='vertical' style={{display: 'flex', justifyContent: 'center'}} gap={2}>
                        <div style={{padding: 0, margin: 0, justifyContent: 'center', display: 'flex'}}>
                            <HexAlphaColorPicker color={colour} onChange={(color) => setColour(color)} />
                        </div>
                        <div style={{padding: 0, margin: 0, justifyContent: 'center', display: 'flex', marginBottom: '2px' }}>
                            <div className="moorhen-hex-input-decorator">#</div>
                            <HexColorInput className="moorhen-hex-input" color={colour} onChange={(color) => setColour(color)} />
                        </div>
                    </Stack>
                </Popover>
                </>
                }
                <Button onClick={handleCreateRepresentation}>
                    {mode === 'add' ? 'Create' : 'Apply'}
                </Button>
            </Stack>
        </Popover>
})

MoorhenAddCustomRepresentationCard.displayName = "MoorhenAddCustomRepresentationCard"