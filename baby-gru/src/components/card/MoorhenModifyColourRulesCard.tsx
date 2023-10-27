import { useCallback, useEffect, useRef, useState, useReducer } from "react";
import { Row, Button, Stack, Form, FormSelect, Card, Col, OverlayTrigger, Tooltip } from "react-bootstrap";
import { ArrowUpwardOutlined, ArrowDownwardOutlined, DeleteOutlined } from '@mui/icons-material';
import { CirclePicker } from "react-color";
import { HexColorPicker } from "react-colorful";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { convertRemToPx, convertViewtoPx, getMultiColourRuleArgs } from "../../utils/MoorhenUtils";
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm";
import { MoorhenSequenceRangeSelect } from "../sequence-viewer/MoorhenSequenceRangeSelect";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { Popover } from "@mui/material";
import { useSelector } from "react-redux";

type colourRuleChange = {
    action: "Add" | "Remove" | "Overwrite" | "MoveUp" | "MoveDown" | "Empty";
    item?: moorhen.ColourRule;
    items?: moorhen.ColourRule[];
}

const itemReducer = (oldList: moorhen.ColourRule[], change: colourRuleChange) => {
    if (change.action === 'Add') {
        return [...oldList, change.item]
    }
    else if (change.action === 'Remove') {
        return oldList.filter(item => item !== change.item)
    }
    else if (change.action === 'Empty') {
        return []
    }
    else if (change.action === 'Overwrite') {
        return [...change.items]
    }
    else if (change.action === 'MoveUp') {
        const itemIndex = oldList.findIndex(item => item === change.item)
        if (itemIndex === 0) {
            return oldList
        }
        let newList = oldList.slice()
        newList[itemIndex] = oldList[itemIndex - 1]
        newList[itemIndex - 1] = change.item
        return newList
    }
    else if (change.action === 'MoveDown') {
        const itemIndex = oldList.findIndex(item => item === change.item)
        if (itemIndex === oldList.length - 1) {
            return oldList
        }
        let newList = oldList.slice()
        newList[itemIndex] = oldList[itemIndex + 1]
        newList[itemIndex + 1] = change.item
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
    
    const isDark = useSelector((state: moorhen.State) => state.canvasStates.isDark)
    const height = useSelector((state: moorhen.State) => state.canvasStates.height)
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const handleChainChange = (evt) => {
        setSelectedChain(evt.target.value)
    }

    const handleResidueCidChange = (evt) => {
        setCid(evt.target.value)
    }
    
    const handleColourCircleClick = (color: { hex: string; }) => {
        try {
            setSelectedColour(color.hex)
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
            } else if (props.molecule.defaultColourRules?.length === 0) {
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
            if (JSON.stringify(props.molecule.defaultColourRules) === JSON.stringify(ruleList)) {
                return
            }
            props.molecule.defaultColourRules = ruleList
            await Promise.all(
                props.molecule.representations.filter(representation => representation.useDefaultColourRules).map(representation => {
                    if (representation.visible) {
                        return representation.redraw()
                    } else {
                        representation.deleteBuffers()
                        return Promise.resolve()
                    }
                })
            )
        }
    }, [ruleList, props.molecule])

    useEffect(() => {
        applyRules()
    }, [applyRules])

    const createRule = () => {
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
                newRule = {
                    args: [cidLabel, selectedColour],
                    isMultiColourRule: false,
                    ruleType: `${ruleType}`,
                    color: selectedColour,
                    label: cidLabel,
                }
            }
        } else {
            newRule = {
                args: [getMultiColourRuleArgs(props.molecule, ruleSelectRef.current.value)],
                isMultiColourRule: true,
                ruleType: `${ruleSelectRef.current.value}`,
                label: `${ruleSelectRef.current.value}`,
            }
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

    const getRuleCard = (rule, index) => {
        return <Card key={index} className='hide-scrolling' style={{margin: '0.1rem', maxWidth: '100%', overflowX:'scroll'}}>
                <Card.Body>
                    <Row className='align-items-center'>
                        <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left', color: isDark ? 'white' : 'black' }}>
                            <b>
                            {`#${index+1}. `}
                            </b>
                            <span>
                                {`. ${rule.label}`}
                            </span>
                        </Col>
                        <Col style={{ display: 'flex', justifyContent: 'right', alignItems:'center' }}>
                            {!rule.isMultiColourRule ?
                                <div style={{borderColor: 'black', borderWidth:'5px', backgroundColor: rule.color, height:'20px', width:'20px', margin: '0.1rem'}}/>
                            : rule.ruleType === "b-factor" ?
                                <img className="colour-rule-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/temperature.svg`} alt='b-factor' style={{height:'28px', width:'`12px', margin: '0.1rem'}}/>
                            :
                            <>
                                <div style={{borderColor: 'rgb(255, 125, 69)', borderWidth:'5px', backgroundColor:  'rgb(255, 125, 69)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                                <div style={{borderColor: 'rgb(255, 219, 19)', borderWidth:'5px', backgroundColor: 'rgb(255, 219, 19)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                                <div style={{borderColor: 'rgb(101, 203, 243)', borderWidth:'5px', backgroundColor: 'rgb(101, 203, 243)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                                <div style={{borderColor: 'rgb(0, 83, 214)', borderWidth:'5px', backgroundColor: 'rgb(0, 83, 214)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                            </>
                            }
                            <OverlayTrigger
                                placement="top"
                                delay={{ show: 400, hide: 400 }}
                                overlay={
                                    <Tooltip id="button-tooltip">
                                        Move up
                                    </Tooltip>
                                }>
                                <Button size='sm' style={{margin: '0.1rem'}} variant={isDark ? "dark" : "light"} onClick={() => {setRuleList({action:'MoveUp', item:rule})}}>
                                    <ArrowUpwardOutlined/>
                                </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                                placement="top"
                                delay={{ show: 400, hide: 400 }}
                                overlay={
                                    <Tooltip id="button-tooltip">
                                        Move down
                                    </Tooltip>
                                }>
                                <Button size='sm' style={{margin: '0.1rem'}} variant={isDark ? "dark" : "light"} onClick={() => {setRuleList({action:'MoveDown', item:rule})}}>
                                    <ArrowDownwardOutlined/>
                                </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                                placement="top"
                                delay={{ show: 400, hide: 400 }}
                                overlay={
                                    <Tooltip id="button-tooltip">
                                        Delete
                                    </Tooltip>
                                }>
                                <Button size='sm' style={{margin: '0.1rem'}} variant={isDark ? "dark" : "light"} onClick={() => {setRuleList({action:'Remove', item:rule})}}>
                                    <DeleteOutlined/>
                                </Button>
                            </OverlayTrigger>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
    }

    if (!props.anchorEl) {
        return null
    }

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
                    {ruleType === 'cid' && <MoorhenCidInputForm margin={'0px'} width="100%" onChange={handleResidueCidChange} ref={cidFormRef}/> }
                    {ruleType === 'property' && 
                    <Form.Group style={{ margin: '0px', width: '100%' }}>
                        <Form.Label>Property</Form.Label>
                            <FormSelect size="sm" ref={ruleSelectRef} defaultValue={'b-factor'} onChange={(val) => setColourProperty(val.target.value)}>
                                <option value={'b-factor'} key={'b-factor'}>B-Factor</option>
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
                        <HexColorPicker color={selectedColour} onChange={handleColorChange}/>
                    </div>
                    <div style={{padding: '0.5rem', margin: 0, justifyContent: 'center', display: 'flex', backgroundColor: '#e3e1e1', borderRadius: '8px'}}>
                        <CirclePicker width={convertRemToPx(15)} circleSize={convertRemToPx(15)/20} color={selectedColour} onChange={handleColourCircleClick}/>
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
                    ruleList.map((rule, index) => getRuleCard(rule, index))}
            </div>
        </Stack>
    </Popover>
}
