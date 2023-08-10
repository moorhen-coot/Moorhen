import React, { useState, useEffect, useReducer, useCallback } from "react";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { Button, Stack, Form, InputGroup, Card } from 'react-bootstrap';

const itemReducer = (oldList: number[], change: {action: 'Add' | 'Remove' | 'Empty' | 'AddList', item?: number, items?: number[]}) => {
    switch(change.action) {
        case "Add":
            oldList = [...oldList, change.item as number]
            break
        case "Remove":
            oldList = oldList.filter(item => item !== change.item)
            break
        case "Empty":
            oldList = []
            break
        case "AddList":
            oldList = change.items as number[]
            break
        default:
            console.log('Unrecognised action in item reducer...')
            break
    }
    return oldList
}

const initialSaveModelState = []

export const MoorhenExitMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [saveAllModels, setSaveAllModels] = useState<boolean>(true)
    const [saveModels, setSaveModels] = useReducer(itemReducer, initialSaveModelState)

    const handleExit = () => {

    }

    const handleExitAndSave = () => {

    }

    useEffect(() => {
        if (saveModels.length !== props.molecules.length) {
            setSaveAllModels(false)
        } else {
            setSaveAllModels(true)
        }
    }, [saveModels])

    useEffect(() => {
        if (saveAllModels && saveModels.length !== props.molecules.length) {
            setSaveModels({action: 'AddList', items: props.molecules.map(molecule => molecule.molNo)})
        } 
    }, [saveAllModels])

    return <>
        <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
            <Form.Check 
                type="switch"
                checked={saveAllModels}
                onChange={(evt) => { setSaveAllModels(evt.target.checked)}}
                onClick={() => {if (saveAllModels) setSaveModels({action: 'Empty'}) }}
                label="Save all models"/>
        </InputGroup>
        <Card style={{marginBottom: '0.5rem', maxHeight: '5rem', overflowY: 'auto'}}>
            <Card.Body>
                {props.molecules.length > 0 ? 
                props.molecules.map(molecule => {
                    return <Form.Check 
                    key={molecule.molNo}
                    type="checkbox"
                    checked={saveModels.includes(molecule.molNo)}
                    onChange={(evt) => { setSaveModels({action: evt.target.checked ? 'Add' : 'Remove', item: molecule.molNo}) }}
                    label={molecule.name}/>
                })
                :
                <>
                <span>No models loaded...</span>
                </>
                }
            </Card.Body>
        </Card>
        <Stack direction='horizontal' gap={2}>
        
            <Button onClick={handleExitAndSave}>
                Save & Exit
            </Button>
            <Button variant="danger" onClick={handleExit}>
                Exit
            </Button>
        </Stack>
    </>
}