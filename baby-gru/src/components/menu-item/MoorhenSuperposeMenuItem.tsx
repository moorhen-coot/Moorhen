import React, { useCallback, useEffect, useRef, useState } from "react";
import { Form } from "react-bootstrap";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { MoorhenMoleculeInterface } from "../../utils/MoorhenMolecule";
import { MoorhenCommandCentreInterface } from "../../utils/MoorhenCommandCentre";

export const MoorhenSuperposeMenuItem = (props: {
    molecules: MoorhenMoleculeInterface[];
    commandCentre: React.RefObject<MoorhenCommandCentreInterface>;
    glRef: React.RefObject<mgWebGLType>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>; 
}) => {
    
    const refChainSelectRef = useRef<null | HTMLSelectElement>(null);
    const refMoleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const movChainSelectRef = useRef<null | HTMLSelectElement>(null);
    const movMoleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const [selectedRefModel, setSelectedRefModel] = useState<null | number>(null)
    const [selectedRefChain, setSelectedRefChain] = useState<null | string>(null)
    const [selectedMovModel, setSelectedMovModel] = useState<null | number>(null)
    const [selectedMovChain, setSelectedMovChain] = useState<null | string>(null)

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>, isReferenceModel: boolean) => {
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(evt.target.value))
        if (isReferenceModel) {
            setSelectedRefModel(parseInt(evt.target.value))
            setSelectedRefChain(selectedMolecule.sequences[0].chain)
        } else {
            setSelectedMovModel(parseInt(evt.target.value))
            setSelectedMovChain(selectedMolecule.sequences[0].chain)
        }
    }

    const handleChainChange = (evt: React.ChangeEvent<HTMLSelectElement>, isReferenceModel: boolean) => {
        if (isReferenceModel) {
            setSelectedRefChain(evt.target.value)
        } else {
            setSelectedMovChain(evt.target.value)
        }
    }

    useEffect(() => {
        if (props.molecules.length === 0) {
            setSelectedRefModel(null)
            setSelectedMovModel(null)
            return
        }

        if (selectedRefModel === null || !props.molecules.map(molecule => molecule.molNo).includes(selectedRefModel)) {
            setSelectedRefModel(props.molecules[0].molNo)
        }

        if (selectedMovModel === null || !props.molecules.map(molecule => molecule.molNo).includes(selectedMovModel)) {
            setSelectedMovModel(props.molecules[0].molNo)
        }

    }, [props.molecules.length])

    const panelContent = <>
        <Form.Group key="reference-model-select" style={{ width: '20rem', margin: '0.5rem' }} controlId="refModelSelect" className="mb-3">
            <Form.Label>
                Reference structure
            </Form.Label>
            <MoorhenMoleculeSelect width="" molecules={props.molecules} ref={refMoleculeSelectRef} onChange={(evt) => handleModelChange(evt, true)} />
            <MoorhenChainSelect width="" molecules={props.molecules} onChange={(evt) => handleChainChange(evt, true)} selectedCoordMolNo={selectedRefModel} allowedTypes={[1, 2]} ref={refChainSelectRef} />
        </Form.Group>
        <Form.Group key="moving-model-select" style={{ width: '20rem', margin: '0.5rem' }} controlId="movModelSelect" className="mb-3">
            <Form.Label>
                Moving structure
            </Form.Label>
            <MoorhenMoleculeSelect width="" molecules={props.molecules} ref={movMoleculeSelectRef} onChange={(evt) => handleModelChange(evt, false)} />
            <MoorhenChainSelect width="" molecules={props.molecules} onChange={(evt) => handleChainChange(evt, false)} selectedCoordMolNo={selectedMovModel} allowedTypes={[1, 2]} ref={movChainSelectRef} />
        </Form.Group>
    </>

    const onCompleted = useCallback(async () => {
        if (!refMoleculeSelectRef || !movMoleculeSelectRef) {
            return
        }

        const refMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(refMoleculeSelectRef.current.value))
        const movMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(movMoleculeSelectRef.current.value))

        if (!refMolecule || !movMolecule) {
            return
        } else if (refMolecule.molNo === movMolecule.molNo && refChainSelectRef.current.value === movChainSelectRef.current.value) {
            return
        }

        await props.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: 'SSM_superpose',
            returnType: 'superpose_results',
            commandArgs: [
                refMolecule.molNo,
                refChainSelectRef.current.value,
                movMolecule.molNo,
                movChainSelectRef.current.value
            ],
        })

        refMolecule.setAtomsDirty(true)
        movMolecule.setAtomsDirty(true)
        await Promise.all([
            refMolecule.redraw(props.glRef),
            movMolecule.redraw(props.glRef)
        ])

    }, [props.molecules, props.glRef, props.commandCentre])

    return <MoorhenBaseMenuItem
        id='superpose-models-menu-item'
        popoverContent={panelContent}
        menuItemText="Superpose structures..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
