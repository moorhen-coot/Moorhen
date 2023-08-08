import { useState, useRef, useCallback } from 'react';
import { Stack, Button, FormSelect, Form, InputGroup, Row } from "react-bootstrap";
import { getMultiColourRuleArgs, representationLabelMapping } from '../../utils/MoorhenUtils';
import { moorhen } from "../../types/moorhen";
import { Popover } from '@mui/material';
import { MoorhenChainSelect } from '../select/MoorhenChainSelect';
import { HexColorPicker } from "react-colorful";

const customRepresentations = [ 'CBs', 'CAs', 'CRs', 'ligands', 'gaussian', 'MolecularSurface', 'DishyBases', 'VdwSpheres' ]

export const MoorhenAddCustomRepresentationCard = (props: {
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    show: boolean; anchorEl: React.RefObject<HTMLDivElement>;
    molecule: moorhen.Molecule;
    isDark: boolean;
    molecules: moorhen.Molecule[];
    urlPrefix: string;
}) => {

    const useDefaultColoursSwitchRef = useRef<HTMLInputElement | null>(null)
    const ruleSelectRef = useRef<HTMLSelectElement | null>(null)
    const cidFormRef = useRef<HTMLInputElement | null>(null)
    const styleSelectRef = useRef<HTMLSelectElement | null>(null)
    const chainSelectRef = useRef<HTMLSelectElement | null>(null)
    const colourModeSelectRef = useRef<HTMLSelectElement | null>(null)
    const colourSwatchRef = useRef<HTMLDivElement | null>(null)
    const residueRangeSelectRef = useRef<any>()
    const [colourMode, setColourMode] = useState<string>('custom')
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false)
    const [ruleType, setRuleType] = useState<string>('molecule')
    const [colour, setColour] = useState<string>('#47d65f')
    const [useDefaultColours, setUseDefaultColours] = useState<boolean>(true)

    const handleChainChange =() => {

    }

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

        props.molecule.addRepresentation(styleSelectRef.current.value, cidSelection, true, colourRules)
        props.setShow(false)
    }, [colour, props.molecule])

    return <Popover
                onClose={() => props.setShow(false)}
                open={props.show}
                anchorEl={props.anchorEl.current}
                anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
                transformOrigin={{ vertical: 'center', horizontal: 'center', }}
                sx={{'& .MuiPaper-root': {backgroundColor: props.isDark ? 'grey' : 'white', marginTop: '0.1rem'}}}
                
            >
            <Stack gap={2} direction='vertical' style={{width: '25rem', margin: '0.5rem'}}>
                <Form.Group style={{ margin: '0px', width: '100%' }}>
                    <Form.Label>Style</Form.Label>
                    <FormSelect ref={styleSelectRef} size="sm" defaultValue={'Bonds'}>
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
                            <option value={'cid'} key={'cid'}>CID</option>
                        </FormSelect>
                </Form.Group>
                <div style={{justifyContent: 'center', display: 'flex'}}>
                    {(ruleType === 'chain' || ruleType === 'residue-range')  && <MoorhenChainSelect molecules={props.molecules} onChange={handleChainChange} selectedCoordMolNo={props.molecule.molNo} ref={chainSelectRef} allowedTypes={[1, 2]}/>}
                    {ruleType === 'cid' && <Form.Control ref={cidFormRef} size="sm" type='text' placeholder={'CID selection'} style={{margin: '0.5rem'}}/> }
                </div>
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
