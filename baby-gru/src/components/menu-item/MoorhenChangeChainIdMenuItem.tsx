import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { useSelector } from 'react-redux';
import { useCallback, useEffect, useRef, useState } from "react";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { Button, Form } from "react-bootstrap";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { Slider } from "@mui/material";

export const MoorhenChangeChainIdMenuItem = (props) => {

    const chainSelectRef = useRef<null | HTMLSelectElement>(null)
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const newChainIdFormRef = useRef<null |HTMLInputElement>(null)
    const minMaxValueRef = useRef<[number, number]>([1, 100])

    const [sequenceLength, setSequenceLength] = useState<null | number>(null)
    const [minMaxValue, setMinMaxValue]  = useState<[number, number]>([1, 100])
    const [invalidNewId, setInvalidNewId] = useState<boolean>(false)
    const [selectedChain, setSelectedChain] = useState<string>(null)
    const [selectedModel, setSelectedModel] = useState<number | null>(null)

    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const handleModelChange = useCallback((evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value))
        setSelectedChain(chainSelectRef.current.value)

        const molecule = molecules.find(molecule => molecule.molNo === parseInt(evt.target.value))
        if (molecule) {
            const sequence = molecule.sequences.find(sequence => sequence.chain === chainSelectRef.current?.value)
            if (sequence) {
                setSequenceLength(sequence.sequence.length)
                setMinMaxValue([1, sequence.sequence.length])
                minMaxValueRef.current = [1, sequence.sequence.length]
            }
        }
    }, [molecules])

    const handleChainChange = useCallback((evt) => {
        setSelectedChain(evt.target.value)
        const molecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current?.value))
        if (molecule) {
            const sequence = molecule.sequences.find(sequence => sequence.chain === evt.target.value)
            if (sequence) {
                setSequenceLength(sequence.sequence.length)
                setMinMaxValue([1, sequence.sequence.length])
                minMaxValueRef.current = [1, sequence.sequence.length]
            }
        }
    }, [molecules])

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
        
        if (selectedMolecule) {
            const sequence = selectedMolecule.sequences[0]
            if (sequence) {
                setSequenceLength(sequence.sequence.length)
                setMinMaxValue([1, sequence.sequence.length])
                minMaxValueRef.current = [1, sequence.sequence.length]
            }
        }
    }, [molecules])

    const changeChainId = useCallback(async () => {
        if (!moleculeSelectRef.current.value || !chainSelectRef.current.value || !newChainIdFormRef.current.value) {
            return
        }

        const molecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (!molecule) {
            return
        }

        const sequence = molecule.sequences.find(sequence => sequence.chain === chainSelectRef.current.value)
        if (!sequence) {
            return
        }
        
        const startResNum = sequence.sequence[minMaxValueRef.current[0] - 1]?.resNum
        const endResNum = sequence.sequence[minMaxValueRef.current[1] - 1]?.resNum

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
            }
        } catch (err) {
            setInvalidNewId(true)
            console.warn(err)
        }
    }, [molecules])

    const convertValue = useCallback((value: number) => {
        if (!chainSelectRef.current?.value || selectedModel === null) {
            return ''
        }
    
        const molecule = molecules.find(molecule => molecule.molNo === selectedModel)
        if (!molecule) {
            return ''
        }
        
        const sequence = molecule.sequences.find(sequence => sequence.chain === chainSelectRef.current.value)
        if (!sequence) {
            return ''
        }
        
        const resNum = Math.floor(value)
        
        return sequence.sequence[resNum - 1]?.cid
    
    }, [molecules, selectedModel, selectedChain])

    const handleMinMaxChange = (event: Event, newValue: [number, number]) => {
        setMinMaxValue(newValue)
        minMaxValueRef.current = newValue
    }

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
        <span style={{margin: '0.5rem'}}>Residue range</span>
        <div style={{ paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem'}}>
            <Slider
                getAriaLabel={() => 'Residue range'}
                value={minMaxValue}
                onChange={handleMinMaxChange}
                getAriaValueText={convertValue}
                valueLabelFormat={convertValue}
                valueLabelDisplay="on"
                min={1}
                max={sequenceLength ? sequenceLength : 100}
                step={1}
                marks={true}
                sx={{
                    marginTop: '1.5rem',
                    '& .MuiSlider-valueLabel': {
                        fontSize: 14,
                        fontWeight: 'bold',
                        top: -1,
                        color: 'grey',
                        backgroundColor: 'unset',
                    },
                }}
            />
        </div>
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
    popoverPlacement={props.popoverPlacement}
    popoverContent={panelContent}
    menuItemText="Change chain ID"
    setPopoverIsShown={props.setPopoverIsShown}
    onCompleted={() => {}}
    showOkButton={false}
    />
}