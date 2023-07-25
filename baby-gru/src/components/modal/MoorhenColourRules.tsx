import { useCallback, useEffect, useRef, useState, useReducer } from "react";
import { Row, Button, Stack, Form, FormSelect, Card, Col, OverlayTrigger, Tooltip } from "react-bootstrap";
import { ArrowUpwardOutlined, ArrowDownwardOutlined, DeleteOutlined } from '@mui/icons-material';
import { SketchPicker } from "react-color";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { convertViewtoPx, getMultiColourRuleArgs } from "../../utils/MoorhenUtils";
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm";
import { MoorhenSequenceRangeSelect } from "../sequence-viewer/MoorhenSequenceRangeSelect";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

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

export const MoorhenColourRules = (props: {
    urlPrefix: string;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    molecules: moorhen.Molecule[];
    windowWidth: number;
    isDark: boolean;
    showColourRulesToast: boolean;
    setShowColourRulesToast: React.Dispatch<React.SetStateAction<boolean>>;
    windowHeight: number;
}) => {
    
    const moleculeSelectRef = useRef<HTMLSelectElement>()
    const chainSelectRef = useRef<HTMLSelectElement>()
    const ruleSelectRef = useRef<HTMLSelectElement>()
    const residueRangeSelectRef = useRef<any>()
    const cidFormRef = useRef<HTMLInputElement>()
    const [ruleType, setRuleType] = useState<string>('molecule')
    const [colourProperty, setColourProperty] = useState<string>('b-factor')
    const [selectedColour, setSelectedColour] = useState<string>('#808080')
    const [selectedModel, setSelectedModel] = useState<number>(null)
    const [selectedChain, setSelectedChain] = useState<string>(null)
    const [cid, setCid] = useState<string>(null)
    const [sequenceRangeSelect, setSequenceRangeSelect] = useState(null)
    const [ruleList, setRuleList] = useReducer(itemReducer, initialRuleState)
    const [toastBodyWidth, setToastBodyWidth] = useState<number>(40)

    const handleModelChange = (evt) => {
        setSelectedModel(parseInt(evt.target.value))
    }

    const handleChainChange = (evt) => {
        setSelectedChain(evt.target.value)
    }

    const handleResidueCidChange = (evt) => {
        setCid(evt.target.value)
    }

    const handleColorChange = (color: { hex: string; }) => {
        try {
            setSelectedColour(color.hex)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const getRules = async (imol: number, commandCentre: React.RefObject<moorhen.CommandCentre>) => {
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === imol)
        if (!selectedMolecule) {
            return 
        } else if (!selectedMolecule.colourRules) {
            await selectedMolecule.fetchCurrentColourRules()
        }
        return selectedMolecule.colourRules
    }

    const applyRules = useCallback(async () => {
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === selectedModel)
        if (selectedMolecule) {
            await selectedMolecule.setColourRules(ruleList, true)
        }
    }, [selectedModel, ruleList, props.molecules])

    const createRule = () => {
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === selectedModel)
        if(!selectedMolecule) {
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
                    commandInput: {
                        message:'coot_command',
                        command: 'add_colour_rule', 
                        returnType:'status',
                        commandArgs: [selectedModel, cidLabel, selectedColour]
                    },
                    isMultiColourRule: false,
                    ruleType: `${ruleType}`,
                    color: selectedColour,
                    label: cidLabel,
                }
            }
        } else {
            newRule = {
                commandInput: {
                    message:'coot_command',
                    command: 'add_colour_rules_multi', 
                    returnType:'status',
                    commandArgs: getMultiColourRuleArgs(selectedMolecule, ruleSelectRef.current.value)
                },
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
        applyRules()
    }, [ruleList])

    useEffect(() => {
        if (props.windowWidth > 1800) {
            setToastBodyWidth(30)
        } else {
            setToastBodyWidth(40)
        }
    }, [props.windowWidth])

    useEffect(() => {
        if (selectedModel !== null) {
            getRules(selectedModel, props.commandCentre).then(currentRules => {
                setRuleList({action: 'Overwrite', items: currentRules})
            })            
        } else {
            setRuleList({action: 'Empty'})
        }
    }, [selectedModel])

    useEffect(() => {
        if (props.molecules.length === 0) {
            setSelectedModel(null)
        } else if (selectedModel === null) {
            setSelectedModel(props.molecules[0].molNo)
        } else if (!props.molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(props.molecules[0].molNo)
        }
        
    }, [props.molecules.length])

    useEffect(() => {
        if (selectedModel === null || !ruleSelectRef.current || !chainSelectRef.current || ruleSelectRef.current?.value !== 'residue-range') {
            return
        }
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === selectedModel)
        const selectedSequence = selectedMolecule.sequences.find(sequence => sequence.chain === chainSelectRef.current.value)
        setSequenceRangeSelect(
            <MoorhenSequenceRangeSelect
                ref={residueRangeSelectRef}
                molecule={selectedMolecule}
                sequence={selectedSequence}
                glRef={props.glRef}
            />
        )        
    }, [selectedModel, selectedChain, ruleType])

    const getRuleCard = (rule, index) => {
        return <Card key={index} className='hide-scrolling' style={{margin: '0.1rem', maxWidth: '100%', overflowX:'scroll'}}>
                <Card.Body>
                    <Row className='align-items-center'>
                        <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left' }}>
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
                                <Button size='sm' style={{margin: '0.1rem'}} variant={props.isDark ? "dark" : "light"} onClick={() => {setRuleList({action:'MoveUp', item:rule})}}>
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
                                <Button size='sm' style={{margin: '0.1rem'}} variant={props.isDark ? "dark" : "light"} onClick={() => {setRuleList({action:'MoveDown', item:rule})}}>
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
                                <Button size='sm' style={{margin: '0.1rem'}} variant={props.isDark ? "dark" : "light"} onClick={() => {setRuleList({action:'Remove', item:rule})}}>
                                    <DeleteOutlined/>
                                </Button>
                            </OverlayTrigger>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
    }

    return <MoorhenDraggableModalBase 
        left={`${props.windowWidth / 2}px`}
        show={props.showColourRulesToast}
        setShow={props.setShowColourRulesToast}
        windowHeight={props.windowHeight}
        windowWidth={props.windowWidth}
        width={toastBodyWidth}
        headerTitle='Set molecule colour rules'
        body={
            <Row>
                <Stack direction="vertical" gap={2} style={{alignItems: 'center', border:'solid', borderColor: 'grey', borderWidth: '1px', borderRadius: '1rem', padding: '0.5rem'}}>
                <Stack gap={2} direction='horizontal' style={{margin: 0, padding: 0}}>
                <Stack gap={2} direction='vertical' style={{margin: 0, padding: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                    <Form.Group style={{ width: '100%', margin: 0 }}>
                        <Form.Label>Rule type</Form.Label>
                        <FormSelect size="sm" ref={ruleSelectRef} defaultValue={'molecule'} onChange={(val) => setRuleType(val.target.value)}>
                            <option value={'molecule'} key={'molecule'}>By molecule</option>
                            <option value={'chain'} key={'chain'}>By chain</option>
                            <option value={'residue-range'} key={'residue-range'}>By residue range</option>
                            <option value={'cid'} key={'cid'}>By CID</option>
                            <option value={'property'} key={'property'}>By property</option>
                        </FormSelect>
                    </Form.Group>
                    <MoorhenMoleculeSelect width="100%" margin={'0px'} onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                    {(ruleType === 'chain' || ruleType === 'residue-range')  && <MoorhenChainSelect width="100%" margin={'0px'} molecules={props.molecules} onChange={handleChainChange} selectedCoordMolNo={selectedModel} ref={chainSelectRef} allowedTypes={[1, 2]}/>}
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
                {ruleType !== 'property' && <SketchPicker color={selectedColour} onChange={handleColorChange} disableAlpha={true} presetColors={["#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800", "#ff5722"]}/>}
            </Stack>
            {ruleType === 'residue-range' && 
                    <div style={{width: '100%'}}>
                        {sequenceRangeSelect}
                    </div>
            }
            </Stack>
            <Card style={{width:'100%', border:'solid', borderColor: 'grey', borderWidth: '1px', borderRadius: '1rem', padding: '0.5rem', marginTop: '0.5rem'}}>
                <span>
                    Rule list
                </span>
                <hr style={{margin: '0.5rem'}}></hr>
                <Card.Body className="hide-scrolling" style={{padding:'0.2rem', maxHeight: convertViewtoPx(25, props.windowHeight), overflowY: 'auto', textAlign:'center'}}>
                    {ruleList.length === 0 ? 
                        "No rules created yet"
                        :
                        ruleList.map((rule, index) => getRuleCard(rule, index))}
                </Card.Body>
            </Card>
        </Row>
        }
        footer={null}
    />
}
