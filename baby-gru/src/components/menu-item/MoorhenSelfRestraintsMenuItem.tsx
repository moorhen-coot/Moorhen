import { useRef, useCallback, useState, useEffect } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm";
import { MoorhenSlider } from "../misc/MoorhenSlider";
import { IconButton } from "@mui/material";
import { AddCircleOutline, RemoveCircleOutline } from "@mui/icons-material";

export const MoorhenSelfRestraintsMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    molecules: moorhen.Molecule[];
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    popoverPlacement?: 'left' | 'right';
    isDark: boolean;
}) => {

    const modeTypeSelectRef = useRef<HTMLSelectElement | null>(null)
    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null)
    const chainSelectRef = useRef<HTMLSelectElement | null>(null)
    const cidSelectRef = useRef<HTMLInputElement | null>(null)
    const maxDistSliderRef = useRef<number>(4.5)
    const [selectedMode, setSelectedMode] = useState<string>("Molecule")
    const [selectedMolNo, setSelectedMolNo] = useState<null | number>(null)
    const [selectedChain, setSelectedChain] = useState<string>('')
    const [maxDist, setMaxDist] = useState<number>(4.5)
    const [cid, setCid] = useState<string>('')
    const modes = ["Molecule", "Chain", "Atom Selection"]

    useEffect(() => {
        if (props.molecules.length === 0) {
            setSelectedMolNo(null)
        } else if (selectedMolNo === null || !props.molecules.map(molecule => molecule.molNo).includes(selectedMolNo)) {
            setSelectedMolNo(props.molecules[0].molNo)
        }
    }, [props.molecules.length])

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(evt.target.value))
        if (selectedMolecule) {
            setSelectedMolNo(parseInt(evt.target.value))
            setSelectedChain(selectedMolecule.sequences.length > 0 ? selectedMolecule.sequences[0].chain : '')
        } 
    }
    
    const increaseDistButton =  <IconButton style={{padding: 0, color: props.isDark ? 'white' : 'grey'}} onClick={() => {
                                    const newVal = maxDist + 0.25
                                    setMaxDist(newVal)
                                    maxDistSliderRef.current = newVal
                                }}>
                                    <AddCircleOutline/>
                                </IconButton>
    const decreaseDistButton =  <IconButton style={{padding: 0, color: props.isDark ? 'white' : 'grey'}} onClick={() => {
                                    const newVal = maxDist - 0.25
                                    setMaxDist(newVal)
                                    maxDistSliderRef.current = newVal
                                }}>
                                    <RemoveCircleOutline/>
                                </IconButton>

    const panelContent = <>
        <Form.Group className='moorhen-form-group' controlId="MoorhenSelfRestraintsMenuItem">
            <Form.Label>Selection</Form.Label>
            <FormSelect size="sm" ref={modeTypeSelectRef} defaultValue={'Molecule'} onChange={(evt) => setSelectedMode(evt.target.value)}>
                {modes.map(type => {return <option value={type} key={type}>{type}</option>})}
            </FormSelect>
        </Form.Group>
        <MoorhenMoleculeSelect
            ref={moleculeSelectRef}
            molecules={props.molecules}
            onChange={handleModelChange}/>
        {selectedMode === 'Chain' && 
        <MoorhenChainSelect
            ref={chainSelectRef}
            molecules={props.molecules}
            selectedCoordMolNo={selectedMolNo}
            onChange={(evt) => setSelectedChain(evt.target.value)}/>}
        {selectedMode === 'Atom Selection' &&
        <MoorhenCidInputForm
            ref={cidSelectRef}
            margin="0.5rem"
            onChange={(evt) => setCid(evt.target.value)}
            placeholder={cidSelectRef.current ? "" : "Input custom selection e.g. //A,B"}/>}
        <MoorhenSlider
            ref={maxDistSliderRef}
            sliderTitle="Max. dist."
            decrementButton={decreaseDistButton}
            incrementButton={increaseDistButton}
            minVal={4}
            maxVal={6}
            showMinMaxVal={false}
            logScale={false}
            initialValue={maxDist}
            externalValue={maxDist}
            setExternalValue={setMaxDist}/>
    </>

    const onCompleted = useCallback(async () => {
        if (!moleculeSelectRef.current.value || maxDistSliderRef.current === null) {
            return
        }
        switch(modeTypeSelectRef.current.value) {
            case "Molecule":
                await props.commandCentre.current.cootCommand({
                    command: "generate_self_restraints",
                    returnType: 'status',
                    commandArgs: [parseInt(moleculeSelectRef.current.value), maxDistSliderRef.current],
                }, false)
                break

            case "Chain":
                await props.commandCentre.current.cootCommand({
                    command: "generate_chain_self_restraints",
                    returnType: 'status',
                    commandArgs: [parseInt(moleculeSelectRef.current.value), maxDistSliderRef.current, chainSelectRef.current.value],
                }, false)
                break
            case "Atom Selection":
                if (!cidSelectRef.current.value) {
                    break
                }
                await props.commandCentre.current.cootCommand({
                    command: "generate_local_self_restraints",
                    returnType: 'status',
                    commandArgs: [parseInt(moleculeSelectRef.current.value), maxDistSliderRef.current, cidSelectRef.current.value],
                }, false)
                break
            default:
                console.warn('Unrecognised self restraints mode...', modeTypeSelectRef.current.value)
        }
    }, [props.commandCentre])

    return <MoorhenBaseMenuItem
        id='create-restraints-menu-item'
        popoverContent={panelContent}
        menuItemText="Generate self-restraints..."
        onCompleted={onCompleted}
        popoverPlacement={props.popoverPlacement}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

MoorhenSelfRestraintsMenuItem.defaultProps = { popoverPlacement: "right" }

