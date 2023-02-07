import React, { useCallback, useEffect, useRef, useState, useReducer } from "react";
import { Row, Button, Stack, Form, FormSelect, Card, Col, Toast, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Autocomplete, TextField } from "@mui/material";
import { MoorhenMoleculeSelect } from "./MoorhenMoleculeSelect";
import { MoorhenChainSelect } from "./MoorhenChainSelect";
import { SketchPicker } from "react-color";
import { convertViewtoPx } from "../utils/MoorhenUtils";
import { ArrowUpwardOutlined, ArrowDownwardOutlined, AddOutlined, DeleteOutlined, DoneOutlined, DeleteForeverOutlined } from '@mui/icons-material';

const itemReducer = (oldList, change) => {
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

const initialRuleState = []

const MoorhenColourRules = (props) => {
    const moleculeSelectRef = useRef()
    const chainSelectRef = useRef()
    const ruleSelectRef = useRef()
    const cidFormRef = useRef()
    const [ruleType, setRuleType] = useState('molecule')
    const [selectedColour, setSelectedColour] = useState({r: 128, g: 128, b: 128, a: 0.5})
    const [selectedModel, setSelectedModel] = useState(null)
    const [selectedChain, setSelectedChain] = useState(null)
    const [cid, setCid] = useState(null)
    const [ruleList, setRuleList] = useReducer(itemReducer, initialRuleState)

    const getRules = async (imol, commandCentre) => {
        let rules = []
        const response = await commandCentre.current.cootCommand({
            message:'coot_command',
            command: "get_colour_rules", 
            returnType:'colour_rules',
            commandArgs:[imol], 
        })
        const currentMoleculeRules = response.data.result.result
        currentMoleculeRules.forEach(rule => {
            rules.push({
                commandArgs: [
                    imol,
                    rule.first,
                    rule.second
                ],
                color: rule.second,
                label: rule.first,
            })
        })
        
        return rules
    }

    const handleModelChange = (evt) => {
        console.log(`Selected model ${evt.target.value}`)
        setSelectedModel(parseInt(evt.target.value))
    }

    const handleChainChange = (evt) => {
        console.log(`Selected chain ${evt.target.value}`)
        setSelectedChain(evt.target.value)
    }

    const handleResidueCidChange = (evt) => {
        console.log(`Selected residue CID ${evt.target.value}`)
        setCid(evt.target.value)
    }

    const handleColorChange = (color) => {
        try {
            setSelectedColour(color.hex)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const createRule = () => {
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === selectedModel)
        if (selectedMolecule) {
            const cidLabel = ruleType === 'molecule' ? "//*" : ruleType === 'chain' ? `//${chainSelectRef.current.value}` : cid
            const newRule = {
                commandArgs: [
                    selectedModel,
                    cidLabel, 
                    selectedColour
                ],
                color: selectedColour,
                label: cidLabel,
            }
            setRuleList({action: 'Add', item: newRule})
        }
    }

    const commitChanges = useCallback(async () => {
        if (ruleList.length === 0) {
            return
        }
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === selectedModel);
        
        await props.commandCentre.current.cootCommand({
            message:'coot_command',
            command: "delete_colour_rules", 
            returnType:'status',
            commandArgs:[selectedModel], 
        })

        const promises = ruleList.map(rule => props.commandCentre.current.cootCommand({
                message:'coot_command',
                command: "add_colour_rule", 
                returnType:'status',
                commandArgs: rule.commandArgs, 
            })
        )
        await Promise.all(promises)
        
        selectedMolecule.setAtomsDirty(true)
        selectedMolecule.redraw(props.glRef)

    }, [selectedColour, selectedModel, ruleList, props.molecules])

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

    const getRuleCard = (rule, index) => {
        return <Card key={index} style={{margin: '0.5rem', maxWidth: '100%', overflowX:'scroll'}}>
                <Card.Body>
                    <Row className='align-items-center'>
                        <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left' }}>
                            {rule.label}
                        </Col>
                        <Col style={{ display: 'flex', justifyContent: 'right', alignItems:'center' }}>
                            <div style={{borderColor: 'black', borderWidth:'5px', backgroundColor: rule.color, height:'20px', width:'20px', margin: '0.5rem'}}/>
                            <OverlayTrigger
                                placement="top"
                                delay={{ show: 400, hide: 400 }}
                                overlay={
                                    <Tooltip id="button-tooltip" {...props}>
                                        Move up
                                    </Tooltip>
                                }>
                                <Button size='sm' style={{margin: '0.5rem'}} variant={props.darkMode ? "dark" : "light"} onClick={() => {setRuleList({action:'MoveUp', item:rule})}}>
                                    <ArrowUpwardOutlined/>
                                </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                                placement="top"
                                delay={{ show: 400, hide: 400 }}
                                overlay={
                                    <Tooltip id="button-tooltip" {...props}>
                                        Move down
                                    </Tooltip>
                                }>
                                <Button size='sm' style={{margin: '0.5rem'}} variant={props.darkMode ? "dark" : "light"} onClick={() => {setRuleList({action:'MoveDown', item:rule})}}>
                                    <ArrowDownwardOutlined/>
                                </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                                placement="top"
                                delay={{ show: 400, hide: 400 }}
                                overlay={
                                    <Tooltip id="button-tooltip" {...props}>
                                        Delete
                                    </Tooltip>
                                }>
                                <Button size='sm' style={{margin: '0.5rem'}} variant={props.darkMode ? "dark" : "light"} onClick={() => {setRuleList({action:'Remove', item:rule})}}>
                                    <DeleteOutlined/>
                                </Button>
                            </OverlayTrigger>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
    }

    return <>
                <Stack gap={2} style={{alignItems: 'center'}}>
                    <Form.Group style={{ margin: '0.5rem', width: '100%' }}>
                        <Form.Label>Rule type</Form.Label>
                        <FormSelect size="sm" ref={ruleSelectRef} defaultValue={'molecule'} onChange={(val) => setRuleType(val.target.value)}>
                            <option value={'molecule'} key={'molecule'}>By molecule</option>
                            <option value={'chain'} key={'chain'}>By chain</option>
                            <option value={'cid'} key={'cid'}>By CID</option>
                        </FormSelect>
                    </Form.Group>
                        <Stack gap={2} style={{alignItems: 'center'}}>
                            <MoorhenMoleculeSelect width="100%" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                            {ruleType==='chain'  && <MoorhenChainSelect width="100%" molecules={props.molecules} onChange={handleChainChange} selectedCoordMolNo={selectedModel} ref={chainSelectRef} allowedTypes={[1, 2]}/>}
                            {ruleType==='cid' && 
                                <Form.Group style={{ width: "100%", margin: '0.5rem', height:props.height }}>
                                    <Form.Label>Selection CID</Form.Label>
                                    <Form.Control size="sm" type='text' defaultValue={''} style={{width: "100%"}} onChange={handleResidueCidChange} ref={cidFormRef}/>
                                </Form.Group>
                            }
                            <Stack direction="horizontal" gap={2} style={{alignItems: 'center'}}>
                                <SketchPicker color={selectedColour} onChange={handleColorChange} />
                                <Card style={{width:'100%'}}>
                                    <Card.Body style={{maxHeight: convertViewtoPx(25, props.windowHeight), overflowY: 'auto', textAlign:'center'}}>
                                        {ruleList.length === 0 ? 
                                            "No rules created yet"
                                        :
                                        ruleList.map((rule, index) => getRuleCard(rule, index))}
                                    </Card.Body>
                                </Card>
                            <Stack gap={2} style={{alignItems: 'center', justifyContent: 'center'}}>
                                <OverlayTrigger
                                    placement="right"
                                    delay={{ show: 400, hide: 400 }}
                                    overlay={
                                        <Tooltip id="button-tooltip" {...props}>
                                            Add a rule
                                        </Tooltip>
                                    }>
                                    <Button variant={props.darkMode ? "dark" : "light"} size='sm' onClick={createRule} style={{margin: '0.5rem'}}>
                                        <AddOutlined/>
                                    </Button>
                                </OverlayTrigger>
                                <OverlayTrigger
                                    placement="right"
                                    delay={{ show: 400, hide: 400 }}
                                    overlay={
                                        <Tooltip id="button-tooltip" {...props}>
                                            Delete all rules
                                        </Tooltip>
                                    }>
                                    <Button variant={props.darkMode ? "dark" : "light"} size='sm' onClick={() => {setRuleList({action:'Empty'})}} style={{margin: '0.5rem'}}>
                                        <DeleteForeverOutlined/>
                                    </Button>
                                </OverlayTrigger>
                                <OverlayTrigger
                                    placement="right"
                                    delay={{ show: 400, hide: 400 }}
                                    overlay={
                                        <Tooltip id="button-tooltip" {...props}>
                                            Apply rules
                                        </Tooltip>
                                    }>
                                    <Button variant={props.darkMode ? "dark" : "light"} size='sm' onClick={commitChanges} style={{margin: '0.5rem'}}>
                                        <DoneOutlined/>
                                    </Button>
                                </OverlayTrigger>
                            </Stack>
                        </Stack>
                        </Stack>
                </Stack>
            </>
}

export const MoorhenAdvancedDisplayOptions = (props) => {
    const optionSelectRef = useRef()
    const [selectedOption, setSelectedOption] = useState(null)
    const [opacity, setOpacity] = useState(0.5)
    const [toastBodyWidth, setToastBodyWidth] = useState(convertViewtoPx(40, props.windowWidth))

    const options = [
            {label: "Create colour rules", widget: <MoorhenColourRules {...props}/>},
    ]

    const handleChange = (evt, newSelection) => {
        if (newSelection) {
            const newOptionIndex = options.findIndex(tool => tool.label === newSelection)
            setSelectedOption(newOptionIndex)
        } else {
            setSelectedOption(null)
        }
    }

    useEffect(() => {
        optionSelectRef.current = selectedOption
    }, [selectedOption])

    useEffect(() => {
        if (props.windowWidth > 1800) {
            setToastBodyWidth(convertViewtoPx(30, props.windowWidth))
        } else {
            setToastBodyWidth(convertViewtoPx(40, props.windowWidth))
        }
    }, [props.windowWidth])

    return  <Toast 
                bg='light'
                show={props.showAdvancedDisplayOptions}
                onClose={() => props.setShowAdvancedDisplayOptions(false)}
                autohide={false}
                style={{opacity: opacity, width: toastBodyWidth}}
                onMouseOver={() => setOpacity(1)}
                onMouseOut={() => setOpacity(0.5)}
                >
            <Toast.Header style={{ justifyContent: 'space-between' }} closeButton>
                Advanced Display Options
            </Toast.Header>
            <Toast.Body style={{maxHeight: convertViewtoPx(65, props.windowHeight), overflowY: 'scroll'}}>
                <Row style={{padding: '0.5rem'}}>
                    <Autocomplete 
                        disablePortal
                        sx={{
                            '& .MuiInputBase-root': {
                                backgroundColor:  props.darkMode ? '#222' : 'white',
                                color: props.darkMode ? 'white' : '#222',
                            },
                                '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: props.darkMode ? 'white' : 'grey',
                            },
                                '& .MuiButtonBase-root': {
                                color: props.darkMode ? 'white' : 'grey',
                            },
                                '& .MuiFormLabel-root': {
                                color: props.darkMode ? 'white' : '#222',
                            },
                            }}                        
                            ref={optionSelectRef}
                            onChange={handleChange}
                            size='small'
                            options={options.map(option => option.label)}
                            renderInput={(params) => <TextField {...params} label="Tools" />}
                    />
                </Row>
                <Row>
                    {selectedOption !== null ? options[selectedOption].widget : null}
                </Row>
                </Toast.Body>
            </Toast>
                    
}
