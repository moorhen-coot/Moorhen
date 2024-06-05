import { useState, useRef, useCallback, useEffect } from 'react';
import { Stack, Button, FormSelect, Form, InputGroup, Row } from "react-bootstrap";
import { getMultiColourRuleArgs, representationLabelMapping } from '../../utils/MoorhenUtils';
import { moorhen } from "../../types/moorhen";
import { Popover } from '@mui/material';
import { MoorhenChainSelect } from '../select/MoorhenChainSelect';
import { HexAlphaColorPicker, HexColorInput } from "react-colorful";
import { MoorhenSequenceRangeSelect } from '../sequence-viewer/MoorhenSequenceRangeSelect';
import { webGL } from '../../types/mgWebGL';
import { GrainOutlined } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { MoorhenCidInputForm } from '../form/MoorhenCidInputForm';
import { addCustomRepresentation } from '../../store/moleculesSlice';
import { MoorhenColourRule } from '../../utils/MoorhenColourRule';
import { NcsColourSwatch } from './MoorhenColourRuleCard';
import { BondSettingsPanel, RibbonSettingsPanel } from './MoorhenMoleculeRepresentationSettingsCard';

const customRepresentations = [ 'CBs', 'CAs', 'CRs', 'gaussian', 'MolecularSurface', 'VdwSpheres', 'MetaBalls' ]

export const MoorhenAddCustomRepresentationCard = (props: {
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    show: boolean; anchorEl: React.RefObject<HTMLDivElement>;
    molecule: moorhen.Molecule;
    urlPrefix: string;
    glRef: React.RefObject<webGL.MGWebGL>;
    mode?: "add" | "edit";
    representation?: moorhen.MoleculeRepresentation;
}) => {

    const applyColourToNonCarbonAtomsSwitchRef = useRef<HTMLInputElement | null>(null)
    const useDefaultColoursSwitchRef = useRef<HTMLInputElement | null>(null)
    const useDefaultBondSettingsSwitchRef = useRef<HTMLInputElement | null>(null)
    const useDefaultRibbonSettingsSwitchRef = useRef<HTMLInputElement | null>(null)
    const ruleSelectRef = useRef<HTMLSelectElement | null>(null)
    const cidFormRef = useRef<HTMLInputElement | null>(null)
    const styleSelectRef = useRef<HTMLSelectElement | null>(null)
    const chainSelectRef = useRef<HTMLSelectElement | null>(null)
    const colourModeSelectRef = useRef<HTMLSelectElement | null>(null)
    const colourSwatchRef = useRef<HTMLDivElement | null>(null)
    const residueRangeSelectRef = useRef<any>()
    const ncsColourRuleRef = useRef<null | moorhen.ColourRule>(null)
    
    const [ruleType, setRuleType] = useState<string>(props.representation ? "cid" : "molecule")
    const [representationStyle, setRepresentationStyle] = useState<string>(props.representation?.style ?? 'CBs')

    const [colourMode, setColourMode] = useState<string>("custom")
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false)
    const [colour, setColour] = useState<string>((props.representation && !props.representation?.useDefaultColourRules && !props.representation?.colourRules[0]?.isMultiColourRule) ? props.representation?.colourRules[0].color : '#47d65f')
    const [applyColourToNonCarbonAtoms, setApplyColourToNonCarbonAtoms] = useState<boolean>((props.representation && !props.representation?.useDefaultColourRules && props.representation?.colourRules?.length !== 0) ? props.representation?.colourRules[0].applyColourToNonCarbonAtoms : false)
    const [useDefaultColours, setUseDefaultColours] = useState<boolean>(props.representation?.useDefaultColourRules ?? true)

    const [sequenceRangeSelect, setSequenceRangeSelect] = useState(null)
    const [selectedChain, setSelectedChain] = useState<string>(null)
    
    const [useDefaultBondSettings, setUseDefaultBondSettings] = useState<boolean>(props.representation?.useDefaultBondOptions ?? true)
    const [atomRadiusBondRatio, setAtomRadiusBondRatio] = useState<number>(props.representation?.bondOptions?.atomRadiusBondRatio ?? props.molecule.defaultBondOptions.atomRadiusBondRatio)
    const [bondWidth, setBondWidth] = useState<number>(props.representation?.bondOptions?.width ?? props.molecule.defaultBondOptions.width)
    const [bondSmoothness, setBondSmoothness] = useState<number>(props.molecule.defaultBondOptions.smoothness === 1 ? 1 : props.molecule.defaultBondOptions.smoothness === 2 ? 50 : 100)
    
    const [useDefaultRibbonSettings, setUseDefaultRibbonSettings] = useState<boolean>(props.representation?.useDefaultM2tParams ?? true)
    const [ribbonCoilThickness, setRibbonCoilThickness] = useState<number>(props.representation?.m2tParams.ribbonStyleCoilThickness ?? props.molecule.defaultM2tParams.ribbonStyleCoilThickness)
    const [ribbonHelixWidth, setRibbonHelixWidth] = useState<number>(props.representation?.m2tParams.ribbonStyleHelixWidth ??  props.molecule.defaultM2tParams.ribbonStyleHelixWidth)
    const [ribbonStrandWidth, setRibbonStrandWidth] = useState<number>(props.representation?.m2tParams?.ribbonStyleStrandWidth ??  props.molecule.defaultM2tParams.ribbonStyleStrandWidth)
    const [ribbonArrowWidth, setRibbonArrowWidth] = useState<number>(props.representation?.m2tParams?.ribbonStyleArrowWidth ?? props.molecule.defaultM2tParams.ribbonStyleArrowWidth)
    const [ribbonDNARNAWidth, setRibbonDNARNAWidth] = useState<number>(props.representation?.m2tParams?.ribbonStyleDNARNAWidth ?? props.molecule.defaultM2tParams.ribbonStyleDNARNAWidth)
    const [nucleotideRibbonStyle, setNucleotideRibbonStyle] = useState<"DishyBases" | "StickBases">(props.representation?.m2tParams?.nucleotideRibbonStyle ??  props.molecule.defaultM2tParams.nucleotideRibbonStyle)
    const [ribbonAxialSampling, setRibbonAxialSampling] = useState<number>(props.representation?.m2tParams?.ribbonStyleAxialSampling ??  props.molecule.defaultM2tParams.ribbonStyleAxialSampling)

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const dispatch = useDispatch()

    const ribbonSettingsProps = {
        ribbonCoilThickness, setRibbonCoilThickness, ribbonHelixWidth, 
        setRibbonHelixWidth, ribbonStrandWidth, setRibbonStrandWidth, 
        ribbonArrowWidth, setRibbonArrowWidth, ribbonDNARNAWidth, 
        setRibbonDNARNAWidth, ribbonAxialSampling, setRibbonAxialSampling,
        nucleotideRibbonStyle, setNucleotideRibbonStyle
    }
   
    const bondSettingsProps = {
        bondWidth, setBondWidth, atomRadiusBondRatio,
        setAtomRadiusBondRatio, bondSmoothness, setBondSmoothness
    }

    useEffect(() => {
        if (!ruleSelectRef.current || !chainSelectRef.current || ruleSelectRef.current?.value !== 'residue-range') {
            return
        }
        const selectedSequence = props.molecule.sequences.find(sequence => sequence.chain === chainSelectRef.current.value)
        setSequenceRangeSelect(
            <MoorhenSequenceRangeSelect
                ref={residueRangeSelectRef}
                molecule={props.molecule}
                sequence={selectedSequence}
                glRef={props.glRef}
            />
        )
    }, [selectedChain, ruleType])

    const handleCreateRepresentation = useCallback(async () => {
        let cidSelection: string
        switch(ruleSelectRef.current.value) {
            case "molecule":
                cidSelection = "//*"
                break
            case "chain":
                cidSelection = `//${chainSelectRef.current.value}`
                break
            case "residue-range":
                const selectedResidues = residueRangeSelectRef.current.getSelectedResidues()
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
            switch(colourModeSelectRef.current.value) {
                case "custom":
                    colourRule = new MoorhenColourRule(
                        ruleSelectRef.current.value, cidSelection, colour, props.molecule.commandCentre, false, applyColourToNonCarbonAtomsSwitchRef.current?.checked
                    )
                    colourRule.setArgs([ cidSelection, colour ])
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
                        : ''
                    }`)
                    const ruleArgs = await getMultiColourRuleArgs(props.molecule, colourModeSelectRef.current.value)
                    colourRule.setArgs([ ruleArgs ])
                    colourRule.setParentMolecule(props.molecule)
                    break
                default:
                    console.log('Unrecognised colour mode')
                    break
            }
        }

        let bondOptions: moorhen.cootBondOptions
        if (!useDefaultBondSettingsSwitchRef.current?.checked) {
            bondOptions = {
                width: bondWidth,
                smoothness: bondSmoothness === 1 ? 1 : bondSmoothness === 50 ? 2 : 3,
                atomRadiusBondRatio: atomRadiusBondRatio
            }
        }

        let m2tParams: moorhen.m2tParameters
        if (!useDefaultRibbonSettingsSwitchRef.current?.checked) {
            m2tParams = {
                ...props.molecule.defaultM2tParams,
                ribbonStyleArrowWidth: ribbonArrowWidth,
                ribbonStyleAxialSampling: ribbonAxialSampling,
                ribbonStyleCoilThickness: ribbonCoilThickness,
                ribbonStyleDNARNAWidth: ribbonDNARNAWidth,
                ribbonStyleHelixWidth: ribbonHelixWidth,
                ribbonStyleStrandWidth: ribbonStrandWidth,
                nucleotideRibbonStyle: nucleotideRibbonStyle as ("DishyBases" | "StickBases")
            }
        }

        if (props.mode === 'add') {
            const representation = await props.molecule.addRepresentation(
                styleSelectRef.current.value,
                cidSelection, 
                true,
                colourRule ? [ colourRule ] : null,
                bondOptions,
                m2tParams
            )
            dispatch( addCustomRepresentation(representation) )
        } else if (props.mode === 'edit' && props.representation.uniqueId) {
            const representation = props.molecule.representations.find(item => item.uniqueId === props.representation.uniqueId)
            if (representation) {
                representation.cid = cidSelection
                representation.setStyle(styleSelectRef.current.value)
                representation.setUseDefaultColourRules(!colourRule)
                representation.setColourRules(colourRule ? [ colourRule ] : null)
                representation.setBondOptions(bondOptions)
                representation.setM2tParams(m2tParams)
                representation.redraw()
            }
        }

        props.setShow(false)
    }, [
        colour, props.molecule, props.representation, props.mode, bondWidth, atomRadiusBondRatio, bondSmoothness,
        nucleotideRibbonStyle, ribbonArrowWidth, ribbonAxialSampling, ribbonCoilThickness, ribbonDNARNAWidth,
        ribbonHelixWidth, ribbonStrandWidth
    ])

    const handleColourModeChange = useCallback((evt) => {
        if (evt.target.value === "mol-symm" && !ncsColourRuleRef.current && props.mode === "edit") {
            const representation = props.molecule.representations.find(item => item.uniqueId === props.representation.uniqueId)
            if (representation?.colourRules?.length > 0) ncsColourRuleRef.current = representation.colourRules[0]
        }
        setColourMode(evt.target.value)
    }, [props.molecule, props.mode, props.representation])

    const applyNcsColourChange = useCallback(async () => {
        await props.molecule.redraw()
    }, [props.molecule])

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
                    <FormSelect ref={styleSelectRef} size="sm" value={representationStyle} onChange={(evt) => setRepresentationStyle(evt.target.value)}>
                        {customRepresentations.map(key => {
                            return <option value={key} key={key}>{representationLabelMapping[key]}</option>
                        })}
                    </FormSelect>
                </Form.Group>
                <Form.Group style={{ width: '100%', margin: 0 }}>
                    <Form.Label>Residue selection</Form.Label>
                    <FormSelect size="sm" ref={ruleSelectRef} defaultValue={ruleType} onChange={(val) => setRuleType(val.target.value)}>
                        <option value={'molecule'} key={'molecule'}>All molecule</option>
                        <option value={'chain'} key={'chain'}>Chain</option>
                        <option value={'residue-range'} key={'residue-range'}>Residue range</option>
                        <option value={'cid'} key={'cid'}>Atom selection</option>
                    </FormSelect>
                </Form.Group>
                {ruleType === 'cid' && 
                    <MoorhenCidInputForm ref={cidFormRef} label='Atom selection' margin='0.5rem' width='97%' defaultValue={props.representation?.cid ?? ""} allowUseCurrentSelection={true}/>
                }
                {(ruleType === 'chain' || ruleType === 'residue-range')  &&
                <div style={{justifyContent: 'center', display: 'flex'}}>
                    <MoorhenChainSelect molecules={molecules} onChange={(evt) => setSelectedChain(evt.target.value)} selectedCoordMolNo={props.molecule.molNo} ref={chainSelectRef} allowedTypes={[1, 2]}/>
                </div>
                }
                {ruleType === 'residue-range' && 
                    <div style={{width: '100%'}}>
                        {sequenceRangeSelect}
                    </div>
                }
                {['CBs', 'CAs', 'ligands'].includes(representationStyle) && 
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        ref={useDefaultBondSettingsSwitchRef}
                        type="switch"
                        label="Apply general bond settings"
                        checked={useDefaultBondSettings}
                        onChange={() => { 
                            setUseDefaultBondSettings((prev) => {return !prev})
                        }}
                    />
                </InputGroup>
                }
                {representationStyle === "CRs" &&
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        ref={useDefaultRibbonSettingsSwitchRef}
                        type="switch"
                        label="Apply general ribbon settings"
                        checked={useDefaultRibbonSettings}
                        onChange={() => { 
                            setUseDefaultRibbonSettings((prev) => {return !prev})
                        }}
                    />
                </InputGroup>
                }
                {!useDefaultRibbonSettings && representationStyle === "CRs" &&
                <RibbonSettingsPanel {...ribbonSettingsProps}/>
                }
                {!useDefaultBondSettings && ['CBs', 'CAs', 'ligands'].includes(representationStyle) && 
                <BondSettingsPanel {...bondSettingsProps}/>
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
                        <option value={'custom'} key={'custom'}>User defined colour</option>
                        <option value={'secondary-structure'} key={'secondary-structure'}>Secondary structure</option>
                        <option value={'jones-rainbow'} key={'jones-rainbow'}>Jones' rainbow</option>
                        <option value={'b-factor'} key={'b-factor'}>B-Factor</option>
                        <option value={'b-factor-norm'} key={'b-factor-norm'}>B-Factor (normalised)</option>
                        <option value={'af2-plddt'} key={'af2-plddt'}>AF2 PLDDT</option>
                        <option value={'mol-symm'} key={'mol-symm'}>Mol. Symmetry</option>
                    </FormSelect>
                    {(colourMode === 'b-factor' || colourMode === 'b-factor-norm') ?
                        <img className="colour-rule-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/temperature.svg`} alt='b-factor' style={{ width: '36px', height: '30px', borderRadius: '3px', border: '1px solid #c9c9c9', padding: 0}}/>
                    : colourMode === "secondary-structure" ?
                        <img className='colour-rule-icon' src={`${props.urlPrefix}/baby-gru/pixmaps/secondary-structure-grey.svg`} alt='ss2' style={{ width: '36px', height: '30px', borderRadius: '3px', border: '1px solid #c9c9c9', padding: 0}}/>
                    : colourMode === "jones-rainbow" ?
                    <>
                        <div style={{borderColor: 'rgb(255, 0, 0)', borderWidth:'5px', backgroundColor:  'rgb(255, 0, 0)', height:'20px', width:'5px', marginTop: '0.2rem', padding: '0rem'}}/>
                        <div style={{borderColor: 'rgb(255, 255, 0)', borderWidth:'5px', backgroundColor: 'rgb(255, 255, 0)', height:'20px', width:'5px', marginTop: '0.2rem', padding: '0rem'}}/>
                        <div style={{borderColor: 'rgb(0, 255, 0)', borderWidth:'5px', backgroundColor: 'rgb(0, 255, 0)', height:'20px', width:'5px', marginTop: '0.2rem', padding: '0rem'}}/>
                        <div style={{borderColor: 'rgb(0, 0, 255)', borderWidth:'5px', backgroundColor: 'rgb(0, 0, 255)', height:'20px', width:'5px', marginTop: '0.2rem', padding: '0rem'}}/>
                    </>
                    : colourMode === "mol-symm" ?
                    props.mode === "edit" ?
                    <NcsColourSwatch style={{cursor: "pointer", height:'30px', width:'36px', padding: "0px", borderStyle: 'solid', borderColor: '#ced4da', borderWidth: '3px', borderRadius: '8px'}} rule={ncsColourRuleRef?.current} applyColourChange={applyNcsColourChange} />
                    :
                    <GrainOutlined style={{height:'30px', width:'36px', padding:0, borderStyle: 'solid', borderColor: '#ced4da', borderWidth: '3px', borderRadius: '8px'}}/>
                    :
                    colourMode === 'custom' ?
                    <div 
                        style={{ display: colourMode === 'custom' ? 'flex' : 'none', width: '28px', height: '28px', borderRadius: '8px', border: '3px solid #fff', boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(0, 0, 0, 0.1)', cursor: 'pointer', backgroundColor: colour }}
                        onClick={() => setShowColourPicker(true)}
                        ref={colourSwatchRef}
                    />
                    : 
                    <>
                        <div style={{borderColor: 'rgb(255, 125, 69)', borderWidth:'5px', backgroundColor:  'rgb(255, 125, 69)', height:'20px', width:'5px', marginTop: '0.2rem', padding: '0rem'}}/>
                        <div style={{borderColor: 'rgb(255, 219, 19)', borderWidth:'5px', backgroundColor: 'rgb(255, 219, 19)', height:'20px', width:'5px', marginTop: '0.2rem', padding: '0rem'}}/>
                        <div style={{borderColor: 'rgb(101, 203, 243)', borderWidth:'5px', backgroundColor: 'rgb(101, 203, 243)', height:'20px', width:'5px', marginTop: '0.2rem', padding: '0rem'}}/>
                        <div style={{borderColor: 'rgb(0, 83, 214)', borderWidth:'5px', backgroundColor: 'rgb(0, 83, 214)', height:'20px', width:'5px', marginTop: '0.2rem', padding: '0rem'}}/>
                    </>
                    }
                </Row>
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
                    {props.mode === 'add' ? 'Create' : 'Apply'}
                </Button>
            </Stack>
        </Popover>
}

MoorhenAddCustomRepresentationCard.defaultProps = { 
    mode: 'add'
}
