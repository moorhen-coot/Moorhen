import React, { useCallback, useEffect, useRef, useState, useReducer } from "react";
import { Row, Offcanvas, Button, Stack, Form, FormSelect, Card, Col } from "react-bootstrap";
import { Autocomplete, TextField } from "@mui/material";
import { MoorhenMoleculeSelect } from "./MoorhenMoleculeSelect";
import { MoorhenChainSelect } from "./MoorhenChainSelect";
import { SketchPicker } from "react-color";
import { convertViewtoPx } from "../utils/MoorhenUtils";
import { ArrowUpwardOutlined, ArrowDownwardOutlined } from '@mui/icons-material';

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
    const moleculeSelectRef = useRef();
    const chainSelectRef = useRef();
    const ruleSelectRef = useRef();
    const [ruleType, setRuleType] = useState('molecule')
    const [selectedColour, setSelectedColour] = useState({r: 128, g: 128, b: 128, a: 0.5})
    const [selectedModel, setSelectedModel] = useState(null)
    const [selectedChain, setSelectedChain] = useState(null)
    const [ruleList, setRuleList] = useReducer(itemReducer, initialRuleState)

    useEffect(() => {
        if (props.molecules.length === 0) {
            setSelectedModel(null)
        } else if (selectedModel === null) {
            setSelectedModel(props.molecules[0].molNo)
        } else if (!props.molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(props.molecules[0].molNo)
        }

    }, [props.molecules.length])

    const handleModelChange = (evt) => {
        console.log(`Selected model ${evt.target.value}`)
        setSelectedModel(parseInt(evt.target.value))
    }

    const handleChainChange = (evt) => {
        console.log(`Ramachandran selected chain ${evt.target.value}`)
        setSelectedChain(evt.target.value)
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
            const newRule = {
                commandArgs: [
                    selectedModel,
                    ruleType === 'molecule' ? "//*" : `//${chainSelectRef.current.value}`, 
                    selectedColour
                ],
                color: selectedColour,
                label: `/${selectedMolecule.name}/${ruleType=== 'molecule' ? '*' : chainSelectRef.current.value}/`,
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
        }))
        await Promise.all(promises)
        
        setRuleList({action: 'Empty' })
        selectedMolecule.setAtomsDirty(true)
        selectedMolecule.redraw(props.glRef)

    }, [selectedColour, selectedModel, ruleList, props.molecules])

    const getRuleCard = (rule, index) => {
        return <Card key={index} style={{margin: '0.5rem', maxWidth: '100%', overflowX:'scroll'}}>
                <Card.Body>
                    <Row className='align-items-center'>
                        <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left' }}>
                            {rule.label}
                        </Col>
                        <Col style={{ display: 'flex', justifyContent: 'right', alignItems:'center' }}>
                            <div style={{borderColor: 'black', borderWidth:'5px', backgroundColor: rule.color, height:'20px', width:'20px', margin: '0.5rem'}}/>
                            <Button size='sm' style={{margin: '0.5rem'}} variant={props.darkMode ? "dark" : "light"} onClick={() => {setRuleList({action:'MoveUp', item:rule})}}>
                                <ArrowUpwardOutlined/>
                            </Button>
                            <Button size='sm' style={{margin: '0.5rem'}} variant={props.darkMode ? "dark" : "light"} onClick={() => {setRuleList({action:'MoveDown', item:rule})}}>
                                <ArrowDownwardOutlined/>
                            </Button>
                            <Button variant='danger' style={{margin: '0.5rem'}} size='sm' onClick={() => {setRuleList({action:'Remove', item:rule})}}>
                                Remove
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
    }

    return <>
                <Stack gap={2} style={{alignItems: 'center'}}>
                    <Form.Group style={{ margin: '0.5rem', width: '90%' }}>
                        <Form.Label>Rule type</Form.Label>
                        <FormSelect size="sm" ref={ruleSelectRef} defaultValue={'molecule'} onChange={(val) => setRuleType(val.target.value)}>
                            <option value={'molecule'} key={'molecule'}>By molecule</option>
                            <option value={'chain'} key={'chain'}>By chain</option>
                        </FormSelect>
                    </Form.Group>
                        <Stack gap={2} style={{alignItems: 'center'}}>
                            <MoorhenMoleculeSelect width="90%" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                            {ruleType==='chain' && <MoorhenChainSelect width="90%" molecules={props.molecules} onChange={handleChainChange} selectedCoordMolNo={selectedModel} ref={chainSelectRef} allowedTypes={[1, 2]}/>}
                            <SketchPicker color={selectedColour} onChange={handleColorChange} />
                            <Button variant='secondary' onClick={createRule} style={{margin: '0.5rem'}}>
                                Create rule
                            </Button>
                            <Card style={{width:'90%'}}>
                                <Card.Body style={{maxHeight: convertViewtoPx(25, props.windowHeight), overflowY: 'auto', textAlign:'center'}}>
                                    {ruleList.length === 0 ? 
                                        "No rules created yet"
                                    :
                                    ruleList.map((rule, index) => getRuleCard(rule, index))}
                                </Card.Body>
                            </Card>
                            <Button variant='primary' onClick={commitChanges} style={{margin: '0.5rem'}}>
                                Apply rules
                            </Button>
                        </Stack>
                </Stack>
            </>
}

export const MoorhenAdvancedDisplayOptions = (props) => {
    const optionSelectRef = useRef()
    const [selectedOption, setSelectedOption] = useState(null)

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

    return <Offcanvas 
                show={props.showAdvancedDisplayOptions}
                onHide={() => props.setShowAdvancedDisplayOptions(false)}
                backdrop={false} 
                placement="end" 
                style={{width: props.sideBarWidth, overflowY: 'scroll'}}>
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>Advanced Display Options</Offcanvas.Title>
                </Offcanvas.Header>
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
            </Offcanvas>

}
