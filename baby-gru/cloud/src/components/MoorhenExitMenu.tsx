import { useState, useEffect, useReducer, useCallback } from "react";
import { Button, Stack, Form, InputGroup, Card } from 'react-bootstrap';
import { moorhen } from "../../../src/types/moorhen";
import { webGL } from "../../../src/types/mgWebGL";

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

export const MoorhenExitMenu = (props: {
    molecules: moorhen.Molecule[];
    glRef: React.RefObject<webGL.MGWebGL>;
    exitCallback: (viewSettings: moorhen.viewDataSession, molData?: { molName: string; pdbData: string; }[]) => Promise<void>;
}) => {

    const [saveAllModels, setSaveAllModels] = useState<boolean>(true)
    const [saveModels, setSaveModels] = useReducer(itemReducer, initialSaveModelState)

    const handleExit = useCallback(async (doSave: boolean = false) => {
        let selectedMolecules: moorhen.Molecule[] = []
        
        if (doSave && saveAllModels) {
            selectedMolecules = props.molecules
        } else if (doSave && saveModels.length > 0) {
            selectedMolecules = props.molecules.filter(molecule => saveModels.includes(molecule.molNo))
        }
        
        const moleculeAtoms = await Promise.all(selectedMolecules.map(molecule => molecule.getAtoms()))

        const molData = selectedMolecules.map((molecule, index) => {
            return {molName: molecule.name, pdbData: moleculeAtoms[index].data.result.pdbData}
        })
        const viewData: moorhen.viewDataSession = {
            origin: props.glRef.current.origin,
            backgroundColor: props.glRef.current.background_colour,
            ambientLight: props.glRef.current.light_colours_ambient,
            diffuseLight: props.glRef.current.light_colours_diffuse,
            lightPosition: props.glRef.current.light_positions,
            specularLight: props.glRef.current.light_colours_specular,
            fogStart: props.glRef.current.gl_fog_start,
            fogEnd: props.glRef.current.gl_fog_end,
            zoom: props.glRef.current.zoom,
            doDrawClickedAtomLines: props.glRef.current.doDrawClickedAtomLines,
            clipStart: (props.glRef.current.gl_clipPlane0[3] + props.glRef.current.fogClipOffset) * -1,
            clipEnd: props.glRef.current.gl_clipPlane1[3] - props.glRef.current.fogClipOffset,
            quat4: props.glRef.current.myQuat
        }
      
        props.exitCallback(viewData, molData)

    }, [saveAllModels, saveModels, props.exitCallback, props.molecules])

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
        
            <Button onClick={() => { handleExit(true) }}>
                Save & Exit
            </Button>
            <Button variant="danger" onClick={() => { handleExit(false) }}>
                Exit
            </Button>
        </Stack>
    </>
}