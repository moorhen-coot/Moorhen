import { useState, useRef, useCallback, useEffect } from 'react';
import { Stack, Button, FormSelect, Form, InputGroup, Row } from "react-bootstrap";
import { getMultiColourRuleArgs, representationLabelMapping } from '../../utils/MoorhenUtils';
import { moorhen } from "../../types/moorhen";
import { IconButton, Popover, Slider } from '@mui/material';
import { MoorhenChainSelect } from '../select/MoorhenChainSelect';
import { HexColorPicker } from "react-colorful";
import { MoorhenSequenceRangeSelect } from '../sequence-viewer/MoorhenSequenceRangeSelect';
import { webGL } from '../../types/mgWebGL';
import MoorhenSlider from '../misc/MoorhenSlider';
import { AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material';

const customRepresentations = [ 'CBs', 'CAs', 'CRs', 'ligands', 'gaussian', 'MolecularSurface', 'DishyBases', 'VdwSpheres' ]

export const MoorhenAddCustomRepresentationCard = (props: {
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    show: boolean; anchorEl: React.RefObject<HTMLDivElement>;
    molecule: moorhen.Molecule;
    isDark: boolean;
    molecules: moorhen.Molecule[];
    urlPrefix: string;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const useDefaultColoursSwitchRef = useRef<HTMLInputElement | null>(null)
    const useDefaultBondSettingsSwitchRef = useRef<HTMLInputElement | null>(null)
    const ruleSelectRef = useRef<HTMLSelectElement | null>(null)
    const cidFormRef = useRef<HTMLInputElement | null>(null)
    const styleSelectRef = useRef<HTMLSelectElement | null>(null)
    const chainSelectRef = useRef<HTMLSelectElement | null>(null)
    const colourModeSelectRef = useRef<HTMLSelectElement | null>(null)
    const colourSwatchRef = useRef<HTMLDivElement | null>(null)
    const residueRangeSelectRef = useRef<any>()
    const [representationStyle, setRepresentationStyle] = useState<string>('CBs')
    const [colourMode, setColourMode] = useState<string>('custom')
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false)
    const [ruleType, setRuleType] = useState<string>('molecule')
    const [colour, setColour] = useState<string>('#47d65f')
    const [useDefaultColours, setUseDefaultColours] = useState<boolean>(true)
    const [useDefaultBondSettings, setUseDefaultBondSettings] = useState<boolean>(true)
    const [sequenceRangeSelect, setSequenceRangeSelect] = useState(null)
    const [selectedChain, setSelectedChain] = useState<string>(null)
    const [atomRadiusBondRatio, setAtomRadiusBondRatio] = useState<number>(props.molecule.defaultBondOptions.atomRadiusBondRatio)
    const [bondWidth, setBondWidth] = useState<number>(props.molecule.defaultBondOptions.width)
    const [bondSmoothness, setBondSmoothness] = useState<number>(props.molecule.defaultBondOptions.smoothness === 1 ? 1 : props.molecule.defaultBondOptions.smoothness === 2 ? 50 : 100)

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

    const handleCreateRepresentation = useCallback(() => {
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
                console.log('Unrecgnised residue selection for the custom representation')    
                break
        }

        let colourRules: moorhen.ColourRule[] = []
        if (!useDefaultColoursSwitchRef.current.checked) {
            switch(colourModeSelectRef.current.value) {
                case "custom":
                    colourRules = [{
                        commandInput: {
                            message: 'coot_command',
                            command: 'add_colour_rule',
                            returnType: 'status',
                            commandArgs: [props.molecule.molNo, cidSelection, colour]
                        },
                        isMultiColourRule: false,
                        ruleType: 'chain',
                        color: colour,
                        label: cidSelection
                    }]
                    break
                case "b-factor":
                case "af2-plddt":
                    colourRules = [{
                        commandInput: {
                            message:'coot_command',
                            command: 'add_colour_rules_multi', 
                            returnType:'status',
                            commandArgs: getMultiColourRuleArgs(props.molecule, colourModeSelectRef.current.value)
                        },
                        isMultiColourRule: true,
                        color: colour,
                        ruleType: `${colourModeSelectRef.current.value}`,
                        label: `${colourModeSelectRef.current.value}`,
                    }]
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

        props.molecule.addRepresentation(styleSelectRef.current.value, cidSelection, true, colourRules, bondOptions)
        props.setShow(false)
    }, [colour, props.molecule, bondWidth, atomRadiusBondRatio, bondSmoothness])

    const increaseWidthButton = <IconButton onClick={() => setBondWidth(bondWidth + 0.1)} style={{padding: 0, color: props.isDark ? 'white' : 'grey'}}>
                                    <AddCircleOutline/>
                                </IconButton>
    const decreaseWidthButton = <IconButton onClick={() => setBondWidth(bondWidth - 0.1)} style={{padding: 0, color: props.isDark ? 'white' : 'grey'}}>
                                    <RemoveCircleOutline/>
                                </IconButton>
    const increaseRatioButton = <IconButton onClick={() => setAtomRadiusBondRatio(atomRadiusBondRatio + 0.1)} style={{padding: 0, color: props.isDark ? 'white' : 'grey'}}>
                                    <AddCircleOutline/>
                                </IconButton>
    const decreaseRatioButton = <IconButton onClick={() => setAtomRadiusBondRatio(atomRadiusBondRatio - 0.1)} style={{padding: 0, color: props.isDark ? 'white' : 'grey'}}>
                                    <RemoveCircleOutline/>
                                </IconButton>

    return <Popover
                onClose={() => props.setShow(false)}
                open={props.show}
                anchorEl={props.anchorEl.current}
                anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
                transformOrigin={{ vertical: 'center', horizontal: 'center', }}
                sx={{'& .MuiPaper-root': {backgroundColor: props.isDark ? 'grey' : 'white', marginTop: '0.1rem', borderRadius: '1rem', borderStyle: 'solid', borderColor: 'grey', borderWidth: '1px'}}}
                
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
                <div style={{justifyContent: 'center', display: 'flex'}}>
                    {(ruleType === 'chain' || ruleType === 'residue-range')  && <MoorhenChainSelect molecules={props.molecules} onChange={handleChainChange} selectedCoordMolNo={props.molecule.molNo} ref={chainSelectRef} allowedTypes={[1, 2]}/>}
                    {ruleType === 'cid' && <Form.Control ref={cidFormRef} size="sm" type='text' placeholder={'Atom selection'} style={{margin: '0.5rem'}}/> }
                </div>
                {ruleType === 'residue-range' && 
                    <div style={{width: '100%'}}>
                        {sequenceRangeSelect}
                    </div>
                }
                {['CBs', 'CAs', 'ligands'].includes(representationStyle) && 
                <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
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
                <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
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
                {!useDefaultColours &&
                <>
                <Row style={{paddingLeft: '1rem'}}>
                    <FormSelect style={{ width: '50%', marginRight: '0.5rem' }} size="sm" ref={colourModeSelectRef} defaultValue={colourMode} onChange={(val) => { setColourMode(val.target.value) }}>
                            <option value={'custom'} key={'custom'}>User defined colour</option>
                            <option value={'b-factor'} key={'b-factor'}>B-Factor</option>
                            <option value={'af2-plddt'} key={'af2-plddt'}>AF2 PLDDT</option>
                    </FormSelect>
                    {colourMode === 'b-factor' ?
                    <img className="colour-rule-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/temperature.svg`} alt='b-factor' style={{ width: '36px', height: '30px', borderRadius: '3px', border: '1px solid #c9c9c9', padding: 0}}/>
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
                    <HexColorPicker color={colour} onChange={(color) => setColour(color)} />

                </Popover>
                </>
                
                }
                <Button onClick={handleCreateRepresentation}>
                    Create
                </Button>
            </Stack>
        </Popover>
 
}
