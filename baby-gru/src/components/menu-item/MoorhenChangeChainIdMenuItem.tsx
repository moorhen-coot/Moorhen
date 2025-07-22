import { useSelector } from 'react-redux';
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useSnackbar } from "notistack";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenSequenceRangeSlider } from "../misc/MoorhenSequenceRangeSlider"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenChangeChainIdMenuItem = (props) => {

    const chainSelectRef = useRef<null | HTMLSelectElement>(null)
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const newChainIdFormRef = useRef<null |HTMLInputElement>(null)
    const residueRangeRef = useRef<[number, number]>([1, 100])

    const [invalidNewId, setInvalidNewId] = useState<boolean>(false)
    const [selectedChain, setSelectedChain] = useState<string>(null)
    const [selectedModel, setSelectedModel] = useState<number | null>(null)

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const { enqueueSnackbar } = useSnackbar()

    const handleModelChange = useCallback((evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value))

        const molecule = molecules.find(molecule => molecule.molNo === parseInt(evt.target.value))
        if (molecule) {
            let sequence = molecule.sequences.find(sequence => sequence.chain === chainSelectRef.current?.value)
            if (!sequence) {
                sequence = molecule.sequences[0]
            }
            setSelectedChain(sequence.chain)
        }
    }, [molecules])

    const handleChainChange = useCallback((evt) => {
        setSelectedChain(evt.target.value)
    }, [ ])

    useEffect(() => {
        let selectedMolecule: moorhen.Molecule
        if (molecules.length === 0) {
            setSelectedModel(null)
            setSelectedChain(null)
        } else if (selectedModel === null) {
            setSelectedModel(molecules[0].molNo)
            setSelectedChain(molecules[0].sequences[0]?.chain)
            selectedMolecule = molecules[0]
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(molecules[0].molNo)
            setSelectedChain(molecules[0].sequences[0]?.chain)
            selectedMolecule = molecules[0]
        }        
    }, [molecules])

    const changeChainId = useCallback(async () => {
        if (!moleculeSelectRef.current.value || !chainSelectRef.current.value || !newChainIdFormRef.current.value) {
            enqueueSnackbar("Missing input", {variant: 'warning'})
            return
        }

        const molecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (!molecule) {
            enqueueSnackbar("Something went wrong", {variant: "error"})
            return
        }

        const sequence = molecule.sequences.find(sequence => sequence.chain === chainSelectRef.current.value)
        if (!sequence) {
            enqueueSnackbar("Something went wrong", {variant: "error"})
            return
        }
        
        const startResNum = sequence.sequence[residueRangeRef.current[0] - 1]?.resNum
        const endResNum = sequence.sequence[residueRangeRef.current[1] - 1]?.resNum

        try {
            setInvalidNewId(false)
            const status = await molecule.changeChainId(
                chainSelectRef.current.value,
                newChainIdFormRef.current.value,
                true, startResNum, endResNum
            )
            if (status === 1) {
                props.setPopoverIsShown(false)
                document.body.click()    
            } else {
                setInvalidNewId(true)
                enqueueSnackbar("Not a valid new chain ID", {variant: 'warning'})
            }
        } catch (err) {
            setInvalidNewId(true)
            enqueueSnackbar("Something went wrong", {variant: "error"})
            console.warn(err)
        }
    }, [molecules])

    const panelContent = <>
        <MoorhenMoleculeSelect
            onChange={handleModelChange}
            molecules={molecules}
            allowAny={false}
            ref={moleculeSelectRef} />
        <MoorhenChainSelect
            molecules={molecules}
            selectedCoordMolNo={selectedModel} 
            onChange={handleChainChange}
            ref={chainSelectRef}/>
        <MoorhenSequenceRangeSlider ref={residueRangeRef} selectedChainId={selectedChain} selectedMolNo={selectedModel} />
        <Form.Group style={{ width: "95%", margin: "0.5rem", height: "4rem" }}>
            <Form.Label>New chain ID</Form.Label>
            <Form.Control
                size="sm"
                type='text'
                style={{width: "100%", color: invalidNewId ? 'red' : '', borderColor: invalidNewId ? 'red' : ''}}
                ref={newChainIdFormRef}/>
        </Form.Group>
        <Button variant="primary" onClick={changeChainId}>
            OK
        </Button>
    </>

    return <MoorhenBaseMenuItem
    id='change-chain-id-menu-item'
    popoverContent={panelContent}
    menuItemText="Change chain ID..."
    setPopoverIsShown={props.setPopoverIsShown}
    onCompleted={() => {}}
    showOkButton={false}
    />
}
