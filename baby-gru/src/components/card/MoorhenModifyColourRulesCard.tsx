import { useCallback, useEffect, useRef, useState, useReducer } from "react";
import { Button, Stack, Form, FormSelect } from "react-bootstrap";
import { HexColorInput, HexAlphaColorPicker } from "react-colorful";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { MoorhenColourRuleCard } from "./MoorhenColourRuleCard"
import { convertRemToPx, convertViewtoPx, getMultiColourRuleArgs } from "../../utils/utils";
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm";
import { MoorhenSequenceRangeSelect } from "../sequence-viewer/MoorhenSequenceRangeSelect";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { Popover } from "@mui/material";
import { useSelector } from "react-redux";
import { MoorhenColourRule } from "../../utils/MoorhenColourRule";
import { MoorhenColorSwatch } from "../misc/MoorhenColorSwatch";

type colourRuleChange = {
    action: "Add" | "Remove" | "Overwrite" | "MoveUp" | "MoveDown" | "Empty";
    item?: moorhen.ColourRule;
    items?: moorhen.ColourRule[];
    color?: string;
}

const itemReducer = (oldList: moorhen.ColourRule[], change: colourRuleChange) => {
    if (change.action === 'Add') {
        return [...oldList, change.item]
    }
    else if (change.action === 'Remove') {
        return oldList.filter(item => item.uniqueId !== change.item.uniqueId)
    }
    else if (change.action === 'Empty') {
        return []
    }
    else if (change.action === 'Overwrite') {
        return [...change.items]
    }
    else if (change.action === 'MoveUp') {
        const itemIndex = oldList.findIndex(item => item.uniqueId === change.item.uniqueId)
        if (itemIndex === 0) {
            return oldList
        }
        let newList = oldList.slice()
        newList[itemIndex] = oldList[itemIndex - 1]
        newList[itemIndex - 1] = change.item
        return newList
    }
    else if (change.action === 'MoveDown') {
        const itemIndex = oldList.findIndex(item => item.uniqueId === change.item.uniqueId)
        if (itemIndex === oldList.length - 1) {
            return oldList
        }
        let newList = oldList.slice()
        newList[itemIndex] = oldList[itemIndex + 1]
        newList[itemIndex + 1] = change.item
        return newList
    }
    else if (change.action === 'UpdateColor') {
        const itemIndex = oldList.findIndex(item => item.uniqueId === change.item.uniqueId)
        const newItem = {...oldList[itemIndex]}
        newItem.color = change.color
        if (!newItem.isMultiColourRule) newItem.args[1] = change.color
        let newList = [...oldList]
        newList[itemIndex] = newItem
        return newList
    }
}

const initialRuleState: moorhen.ColourRule[] = []

export const MoorhenModifyColourRulesCard = (props: {
    urlPrefix: string;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    molecule: moorhen.Molecule;
    showColourRulesToast: boolean;
    setShowColourRulesToast: React.Dispatch<React.SetStateAction<boolean>>;
    anchorEl: React.RefObject<HTMLDivElement>;
}) => {
    
    const chainSelectRef = useRef<HTMLSelectElement>()
    const ruleSelectRef = useRef<HTMLSelectElement>()
    const residueRangeSelectRef = useRef<any>()
    const cidFormRef = useRef<HTMLInputElement>()
    
    const [ruleType, setRuleType] = useState<string>('molecule')
    const [colourProperty, setColourProperty] = useState<string>('b-factor')
    const [selectedColour, setSelectedColour] = useState<string>('#808080')
    const [selectedChain, setSelectedChain] = useState<string>(null)
    const [cid, setCid] = useState<string>(null)
    const [sequenceRangeSelect, setSequenceRangeSelect] = useState(null)
    const [ruleList, setRuleList] = useReducer(itemReducer, initialRuleState, () => { return props.molecule.defaultColourRules })
    
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const handleChainChange = (evt) => {
        setSelectedChain(evt.target.value)
    }

    const handleResidueCidChange = (evt) => {
        setCid(evt.target.value)
    }
    
    const handleColourCircleClick = (color:  string ) => {
        try {
            setSelectedColour(color)
        }
        catch (err) {
            console.log('err', err)
        }
    }
    
    const handleColorChange = (color: string) => {
        try {
            setSelectedColour(color)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    useEffect(() => {
        const setIntialRules = async () => {
            if (!props.molecule) {
                return 
            } else if (!props.molecule.defaultColourRules || props.molecule.defaultColourRules.length === 0) {
                await props.molecule.fetchDefaultColourRules()
            }
            if (props.molecule.defaultColourRules.length > 0) {
                setRuleList({action: "Overwrite", items: props.molecule.defaultColourRules})
            }
        }
        
        setIntialRules()

    }, [props.showColourRulesToast])

    const applyRules = useCallback(async () => {
        if (props.molecule?.defaultColourRules) {
            if (JSON.stringify(props.molecule.defaultColourRules.map(rule => rule.objectify())) === JSON.stringify(ruleList.map(rule => rule.objectify()))) {
                return
            }
            props.molecule.defaultColourRules = ruleList
            const representations = props.molecule.representations.filter(representation => representation.useDefaultColourRules)
            for (let representation of representations) {
                if (representation.visible) {
                    await representation.redraw()
                } else {
                    representation.deleteBuffers()
                }
            }
        }
    }, [ruleList, props.molecule])

    useEffect(() => {
        applyRules()
    }, [applyRules])

    const createRule = async () => {
        if(!props.molecule) {
            return
        }

        let newRule: moorhen.ColourRule
        if (ruleType !== 'property') {
            let cidLabel: string
            switch (ruleType) {
                case 'molecule':
                    cidLabel = "//*"
                    break
                case 'chain':
                    cidLabel = `//${chainSelectRef.current.value}`
                    break
                case 'cid':
                    cidLabel = cid
                    break
                case 'residue-range':
                    const selectedResidues = residueRangeSelectRef.current.getSelectedResidues()
                    cidLabel = (selectedResidues && selectedResidues.length === 2) ? `//${chainSelectRef.current.value}/${selectedResidues[0]}-${selectedResidues[1]}` : null
                    break
                default:
                    console.log('Unrecognised colour rule type...')
                    break
            }
            if (cidLabel) {
                newRule = new MoorhenColourRule(
                    ruleType, cidLabel, selectedColour, props.commandCentre, false
                )
                newRule.setParentMolecule(props.molecule)
                newRule.setArgs([ cidLabel, selectedColour ])
            } else {
                console.warn('Invalid CID selection used to create a colour rule')
            }
        } else {
            const ruleArgs = await getMultiColourRuleArgs(props.molecule, ruleSelectRef.current.value)
            newRule = new MoorhenColourRule(
                ruleSelectRef.current.value, "/*/*/*/*", "#ffffff", props.commandCentre, true
            )
            newRule.setParentMolecule(props.molecule)
            newRule.setArgs([ ruleArgs ])
            newRule.setLabel(`${
                ruleSelectRef.current.value === 'secondary-structure' ? 'Secondary struct.'
                : ruleSelectRef.current.value === 'jones-rainbow' ? 'Jones-Rainbow'
                : ruleSelectRef.current.value === 'mol-symm' ? 'Mol. Symm.'
                : ruleSelectRef.current.value === "b-factor" ? 'B-factor'
                : ruleSelectRef.current.value === "b-factor-norm" ? 'B-factor norm.'
                : ruleSelectRef.current.value === "af2-plddt" ? 'PLDDT'
                : ''
            }`)
        }

        if (newRule) {
            setRuleList({action: 'Add', item: newRule})    
        }
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

    if (!props.anchorEl) {
        return null
    }

    const swatchCols = [
    "#f44336","#e91e63","#9c27b0","#673ab7","#3f51b5","#2196f3","#03a9f4","#00bcd4","#009688",
    "#4caf50","#8bc34a","#cddc39","#ffeb3b","#ffc107","#ff9800","#ff5722","#795548","#607d8b",
    ]
    return <Popover
                onClose={() => props.setShowColourRulesToast(false)}
                open={props.showColourRulesToast}
                anchorEl={props.anchorEl.current}
                anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
                transformOrigin={{ vertical: 'center', horizontal: 'center', }}
                sx={{'& .MuiPaper-root': {backgroundColor: isDark ? 'grey' : 'white', borderRadius: '1rem', marginTop: '0.1rem', borderStyle: 'solid', borderColor: 'grey', borderWidth: '1px'}}}
            >
            <Stack direction="vertical" gap={2} style={{alignItems: 'center', padding: '0.5rem'}}>
                <Stack gap={2} direction='horizontal' style={{margin: 0, padding: 0}}>
                <Stack gap={2} direction='vertical' style={{margin: 0, padding: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                    <Form.Group style={{ width: '100%', margin: 0 }}>
                        <Form.Label>Rule type</Form.Label>
                        <FormSelect size="sm" ref={ruleSelectRef} defaultValue={ruleType} onChange={(val) => setRuleType(val.target.value)}>
                            <option value={'molecule'} key={'molecule'}>By molecule</option>
                            <option value={'chain'} key={'chain'}>By chain</option>
                            <option value={'residue-range'} key={'residue-range'}>By residue range</option>
                            <option value={'cid'} key={'cid'}>By atom selection</option>
                            <option value={'property'} key={'property'}>By property</option>
                        </FormSelect>
                    </Form.Group>
                    {(ruleType === 'chain' || ruleType === 'residue-range')  && <MoorhenChainSelect width="100%" margin={'0px'} molecules={molecules} onChange={handleChainChange} selectedCoordMolNo={props.molecule.molNo} ref={chainSelectRef}/>}
                    {ruleType === 'cid' && <MoorhenCidInputForm allowUseCurrentSelection={true} margin={'0px'} width="100%" onChange={handleResidueCidChange} ref={cidFormRef}/> }
                    {ruleType === 'property' && 
                    <Form.Group style={{ margin: '0px', width: '100%' }}>
                        <Form.Label>Property</Form.Label>
                            <FormSelect size="sm" ref={ruleSelectRef} defaultValue={'b-factor'} onChange={(val) => setColourProperty(val.target.value)}>
                                <option value={'mol-symm'} key={'mol-symm'}>Mol. Symmetry</option>
                                <option value={'secondary-structure'} key={'secondary-structure'}>Secondary structure</option>
                                <option value={'jones-rainbow'} key={'jones-rainbow'}>Jones' rainbow</option>
                                <option value={'b-factor'} key={'b-factor'}>B-Factor</option>
                                <option value={'b-factor-norm'} key={'b-factor-norm'}>B-Factor (normalised)</option>
                                <option value={'af2-plddt'} key={'af2-plddt'}>AF2 PLDDT</option>
                        </FormSelect>
                    </Form.Group>
                    }
                    <Button onClick={createRule} style={{margin: '0px', width: '100%'}}>
                        Add rule
                    </Button>
                </Stack>
                {ruleType !== 'property' &&
                <Stack direction='vertical' style={{display: 'flex', justifyContent: 'center'}} gap={2}>
                    <div style={{padding: 0, margin: 0, justifyContent: 'center', display: 'flex'}}>
                        <HexAlphaColorPicker color={selectedColour} onChange={handleColorChange}/>
                    </div>
                    <div style={{padding: '0.5rem', margin: 0, justifyContent: 'center', display: 'flex', backgroundColor: '#e3e1e1', borderRadius: '8px'}}>
                        <MoorhenColorSwatch cols={swatchCols}  size={13} columns={9} onClick={handleColourCircleClick}/>
                    </div>
                    <div style={{padding: 0, margin: 0, justifyContent: 'center', display: 'flex', }}>
                        <div className="moorhen-hex-input-decorator">#</div>
                        <HexColorInput className="moorhen-hex-input" color={selectedColour} onChange={handleColorChange}/>
                    </div>
                </Stack>
                }
            </Stack>
            {ruleType === 'residue-range' && 
                    <div style={{width: '100%'}}>
                        {sequenceRangeSelect}
                    </div>
            }
            <hr style={{width: '100%'}}></hr>
            <div className="hide-scrolling" style={{width: '100%', padding:'0.2rem', maxHeight: convertViewtoPx(20, height), overflowY: 'auto', textAlign:'center'}}>
                {ruleList.length === 0 ? 
                    "No rules created yet"
                :
                    ruleList.map((rule, index) => <MoorhenColourRuleCard key={index} molecule={props.molecule} urlPrefix={props.urlPrefix} rule={rule} index={index} setRuleList={setRuleList} />)}
            </div>
        </Stack>
    </Popover>
}
