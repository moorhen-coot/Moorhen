import { useState, useRef, useCallback, useEffect } from 'react';
import { Stack, Button, FormSelect, Form, InputGroup, Row } from "react-bootstrap";
import { getMultiColourRuleArgs, representationLabelMapping } from '../../utils/MoorhenUtils';
import { moorhen } from "../../types/moorhen";
import { IconButton, Popover, Slider } from '@mui/material';
import { MoorhenChainSelect } from '../select/MoorhenChainSelect';
import { HexAlphaColorPicker, HexColorInput } from "react-colorful";
import { MoorhenSequenceRangeSelect } from '../sequence-viewer/MoorhenSequenceRangeSelect';
import { webGL } from '../../types/mgWebGL';
import { MoorhenSlider } from '../misc/MoorhenSlider';
import { AddCircleOutline, GrainOutlined, RemoveCircleOutline } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { MoorhenCidInputForm } from '../form/MoorhenCidInputForm';
import { addCustomRepresentation } from '../../store/moleculesSlice';
import { MoorhenColourRule } from '../../utils/MoorhenColourRule';
import { NcsColourSwatch } from './MoorhenColourRuleCard';

const customRepresentations = [ 'CBs', 'CAs', 'CRs', 'gaussian', 'MolecularSurface', 'DishyBases', 'VdwSpheres', 'MetaBalls' ]

export const MoorhenAddCustomRepresentationCard = (props: {
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    show: boolean; anchorEl: React.RefObject<HTMLDivElement>;
    molecule: moorhen.Molecule;
    urlPrefix: string;
    glRef: React.RefObject<webGL.MGWebGL>;
    mode?: "add" | "edit";
    representationId?: string;
    initialUseDefaultBondSettings?: boolean;
    initialAtomRadiusBondRatio?: number;
    initialBondWidth?: number;
    initialUseDefaultColoursValue?: boolean;
    initialRepresentationStyleValue?: string;
    initialRuleType?: string;
    initialColour?: string;
    initialColourMode?: string;
    initialCid?: string;
    initialApplyColourToNonCarbonAtoms?: boolean;
}) => {

    const applyColourToNonCarbonAtomsSwitchRef = useRef<HTMLInputElement | null>(null)
    const useDefaultColoursSwitchRef = useRef<HTMLInputElement | null>(null)
    const useDefaultBondSettingsSwitchRef = useRef<HTMLInputElement | null>(null)
    const ruleSelectRef = useRef<HTMLSelectElement | null>(null)
    const cidFormRef = useRef<HTMLInputElement | null>(null)
    const styleSelectRef = useRef<HTMLSelectElement | null>(null)
    const chainSelectRef = useRef<HTMLSelectElement | null>(null)
    const colourModeSelectRef = useRef<HTMLSelectElement | null>(null)
    const colourSwatchRef = useRef<HTMLDivElement | null>(null)
    const residueRangeSelectRef = useRef<any>()
    const ncsColourRuleRef = useRef<null | moorhen.ColourRule>(null)
    
    const [representationStyle, setRepresentationStyle] = useState<string>(props.initialRepresentationStyleValue)
    const [colourMode, setColourMode] = useState<string>(props.initialColourMode)
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false)
    const [ruleType, setRuleType] = useState<string>(props.initialRuleType)
    const [colour, setColour] = useState<string>(props.initialColour)
    const [useDefaultColours, setUseDefaultColours] = useState<boolean>(props.initialUseDefaultColoursValue)
    const [useDefaultBondSettings, setUseDefaultBondSettings] = useState<boolean>(props.initialUseDefaultBondSettings)
    const [applyColourToNonCarbonAtoms, setApplyColourToNonCarbonAtoms] = useState<boolean>(props.initialApplyColourToNonCarbonAtoms)
    const [sequenceRangeSelect, setSequenceRangeSelect] = useState(null)
    const [selectedChain, setSelectedChain] = useState<string>(null)
    const [atomRadiusBondRatio, setAtomRadiusBondRatio] = useState<number>( props.initialAtomRadiusBondRatio ? props.initialAtomRadiusBondRatio : props.molecule.defaultBondOptions.atomRadiusBondRatio)
    const [bondWidth, setBondWidth] = useState<number>(props.initialBondWidth ? props.initialBondWidth : props.molecule.defaultBondOptions.width)
    const [bondSmoothness, setBondSmoothness] = useState<number>(props.molecule.defaultBondOptions.smoothness === 1 ? 1 : props.molecule.defaultBondOptions.smoothness === 2 ? 50 : 100)
    
    const dispatch = useDispatch()
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const handleChainChange = (evt) => {
        setSelectedChain(evt.target.value)
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

        if (props.mode === 'add') {
            const representation = await props.molecule.addRepresentation(
                styleSelectRef.current.value,
                cidSelection, 
                true,
                colourRule ? [ colourRule ] : null,
                bondOptions
            )
            dispatch( addCustomRepresentation(representation) )
        } else if (props.mode === 'edit' && props.representationId) {
            const representation = props.molecule.representations.find(item => item.uniqueId === props.representationId)
            if (representation) {
                representation.cid = cidSelection
                representation.setStyle(styleSelectRef.current.value)
                representation.setUseDefaultColourRules(!colourRule)
                representation.setColourRules(colourRule ? [ colourRule ] : null)
                representation.setBondOptions(bondOptions)
                representation.redraw()
            }
        }

        props.setShow(false)
    }, [colour, props.molecule, props.representationId, props.mode, bondWidth, atomRadiusBondRatio, bondSmoothness])

    const increaseWidthButton = <IconButton onClick={() => setBondWidth(bondWidth + 0.1)} style={{padding: 0, color: isDark ? 'white' : 'grey'}}>
                                    <AddCircleOutline/>
                                </IconButton>
    const decreaseWidthButton = <IconButton onClick={() => setBondWidth(bondWidth - 0.1)} style={{padding: 0, color: isDark ? 'white' : 'grey'}}>
                                    <RemoveCircleOutline/>
                                </IconButton>
    const increaseRatioButton = <IconButton onClick={() => setAtomRadiusBondRatio(atomRadiusBondRatio + 0.1)} style={{padding: 0, color: isDark ? 'white' : 'grey'}}>
                                    <AddCircleOutline/>
                                </IconButton>
    const decreaseRatioButton = <IconButton onClick={() => setAtomRadiusBondRatio(atomRadiusBondRatio - 0.1)} style={{padding: 0, color: isDark ? 'white' : 'grey'}}>
                                    <RemoveCircleOutline/>
                                </IconButton>

    const handleColourModeChange = useCallback((evt) => {
        if (evt.target.value === "mol-symm" && !ncsColourRuleRef.current && props.mode === "edit") {
            const representation = props.molecule.representations.find(item => item.uniqueId === props.representationId)
            if (representation?.colourRules?.length > 0) ncsColourRuleRef.current = representation.colourRules[0]
        }
        setColourMode(evt.target.value)
    }, [props.molecule, props.mode, props.representationId])

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
                    <MoorhenCidInputForm ref={cidFormRef} label='Atom selection' margin='0.5rem' width='97%' defaultValue={props.initialCid} allowUseCurrentSelection={true}/>
                }
                {(ruleType === 'chain' || ruleType === 'residue-range')  &&
                <div style={{justifyContent: 'center', display: 'flex'}}>
                    <MoorhenChainSelect molecules={molecules} onChange={handleChainChange} selectedCoordMolNo={props.molecule.molNo} ref={chainSelectRef} allowedTypes={[1, 2]}/>
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
                {!useDefaultBondSettings && ['CBs', 'CAs', 'ligands'].includes(representationStyle) && 
                <>
                <Stack gap={1} direction='vertical' style={{display: 'flex'}}>
                    <div style={{marginLeft: '2rem', marginRight: '2rem'}}>
                    <MoorhenSlider showMinMaxVal={false} decrementButton={decreaseWidthButton} incrementButton={increaseWidthButton} minVal={0.05} maxVal={0.5} logScale={false} sliderTitle="Bond width" initialValue={bondWidth} externalValue={bondWidth} setExternalValue={setBondWidth}/>
                    <MoorhenSlider showMinMaxVal={false} decrementButton={decreaseRatioButton} incrementButton={increaseRatioButton} minVal={1.0} maxVal={3.5} logScale={false} sliderTitle="Radius-Bond ratio" initialValue={atomRadiusBondRatio} externalValue={atomRadiusBondRatio} setExternalValue={setAtomRadiusBondRatio} />
                    <span>Bond Smoothness</span>        
                    <Slider
                        aria-label="Smoothness"
                        value={bondSmoothness}
                        onChange={(evt, value: number) => { setBondSmoothness(value) }}
                        valueLabelFormat={(value) => {
                            switch(value) {
                                case 1:
                                    return "Coarse"
                                case 50:
                                    return "Nice"
                                default: 
                                    return "Smooth"
                            }
                        }}
                        getAriaValueText={(value) => {
                            switch(value) {
                                case 1:
                                    return "Coarse"
                                case 50:
                                    return "Nice"
                                default: 
                                    return "Smooth"
                            }
                        }}
                        step={null}
                        valueLabelDisplay="auto"
                        marks={[
                            {value: 1, label: 'Coarse'},
                            {value: 50, label: 'Nice'},
                            {value: 100, label: 'Smooth'}
                        ]}
                    />
                    </div>
                </Stack>
                </>
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
    mode: 'add', initialColourMode: 'custom', initialRepresentationStyleValue: 'CBs', 
    initialUseDefaultColoursValue: true, initialRuleType: 'molecule', initialColour: '#47d65f',
    initialCid: '', initialUseDefaultBondSettings: true, initialApplyColourToNonCarbonAtoms: false,
}
