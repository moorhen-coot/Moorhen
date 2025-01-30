import { useCallback, useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { moorhen } from "../../types/moorhen"
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm"
import { Button, Form, FormSelect } from "react-bootstrap"
import { MoorhenChainSelect } from "../select/MoorhenChainSelect"
import { MoorhenLigandSelect } from "../select/MoorhenLigandSelect"
import { Slider } from "@mui/material"

export const MoorhenMultiplyBfactorMenuItem = (props) => {
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const chainSelectRef = useRef<null | HTMLSelectElement>(null)
    const cidFormRef = useRef<null | HTMLInputElement>(null)
    const ruleSelectRef = useRef<null | HTMLSelectElement>(null)
    const ligandSelectRef = useRef<null | HTMLSelectElement>(null)
    const bfactorValueRef = useRef<null | number>(0)

    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const [cid, setCid] = useState<string>("")
    const [invalidCid, setInvalidCid] = useState<boolean>(false)
    const [selectionType, setSelectionType] = useState<string>("molecule")
    const [selectedChain, setSelectedChain] = useState<string | number>(null)
    const [selectedModel, setSelectedModel] = useState<number | number>(null)
    const [bfactor, setBfactor] = useState<number | number>(0)
    
    const handleModelChange = useCallback((evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value))
        setSelectedChain(chainSelectRef.current?.value)
    }, [molecules])

    const handleChainChange = useCallback((evt) => {
        setSelectedChain(evt.target.value)
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
    }, [molecules])

    const convertValue = (value: number) => {
        if (value >= 0) {
            return `+${value + 1}0%`
        }
        return `${value}0%`
    }

    const handleBFactorChange = (evt: any, newValue: number) => {
        setBfactor(newValue)
        if (newValue >= 0) {
            bfactorValueRef.current = 1 + ( (newValue + 1) / 10 )
        } else {
            bfactorValueRef.current = 1 - (-newValue / 10)
        }
    }

    const multiplyBfactor = async () => {
        if (!moleculeSelectRef.current.value || !ruleSelectRef.current?.value || bfactorValueRef.current === null) {
            console.warn('Missing data, doing nothing...')
            return
        }

        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (!selectedMolecule) {
            console.warn(`Cannot find molecule with molNo ${moleculeSelectRef.current.value}`)
            return
        }

        let cid: string
        switch (ruleSelectRef.current.value) {
            case 'molecule':
                cid = '/*/*/*/*'
                break
            case 'chain':
                cid = chainSelectRef.current?.value ? `//${chainSelectRef.current.value}` : undefined
                break
            case 'ligand':
                cid = ligandSelectRef.current?.value ? ligandSelectRef.current.value : undefined
                break
            case 'cid':
                cid = cidFormRef.current?.value ? cidFormRef.current.value : undefined
                break
            default:
                console.warn(`Unrecognised selection type ${ruleSelectRef.current.value}`)
                break
        }

        const isValid = cid && await selectedMolecule.isValidSelection(cid)
        if (isValid) {
            await props.commandCentre.current.cootCommand({
                command: 'multiply_residue_temperature_factors',
                commandArgs: [selectedMolecule.molNo, cid, bfactorValueRef.current],
                returnType: 'status'
            }, false)
            dispatch( triggerUpdate(selectedMolecule.molNo) )
            props.setPopoverIsShown(false)
            selectedMolecule.setAtomsDirty(true)
            await selectedMolecule.redraw()
            selectedMolecule.glRef.current.handleOriginUpdated(false)
            document.body.click()    
        } else {
            if (ruleSelectRef.current.value === 'cid') setInvalidCid(true)
            console.warn(`Invalid selection of type ${ruleSelectRef.current.value}`)
        }
    }

    const panelContent = <>
        <Form.Group style={{ width: '100%', margin: 0 }}>
            <Form.Label>Selection type</Form.Label>
            <FormSelect size="sm" ref={ruleSelectRef} defaultValue={'molecule'} onChange={(val) => setSelectionType(val.target.value)}>
                <option value={'molecule'} key={'molecule'}>By molecule</option>
                <option value={'chain'} key={'chain'}>By chain</option>
                <option value={'ligand'} key={'ligand'}>By ligand</option>
                <option value={'cid'} key={'cid'}>By atom selection</option>
            </FormSelect>
        </Form.Group>
        <MoorhenMoleculeSelect
            molecules={molecules}
            onChange={handleModelChange}
            allowAny={false}
            ref={moleculeSelectRef} />
        {selectionType === 'chain' && 
        <MoorhenChainSelect
            molecules={molecules}
            onChange={handleChainChange}
            selectedCoordMolNo={selectedModel}
            ref={chainSelectRef}/>
        }
        {selectionType === 'ligand' && 
          <MoorhenLigandSelect
            molecules={molecules}
            selectedCoordMolNo={selectedModel}
            ref={ligandSelectRef} />
        }
        {selectionType === 'cid' &&
        <MoorhenCidInputForm
            ref={cidFormRef}
            label='Atom selection'
            margin='0.5rem'
            defaultValue={props.initialCid}
            onChange={(evt) => setCid(evt.target.value)}
            invalidCid={invalidCid}
            allowUseCurrentSelection={true}/>
        }
        <div style={{ paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.1rem', paddingBottom: '0.1rem' }}>
        <Slider
            aria-label="Factor"
            getAriaValueText={convertValue}
            valueLabelFormat={convertValue}
            valueLabelDisplay="on"
            value={bfactor}
            onChange={handleBFactorChange}
            marks={true}
            defaultValue={0}
            step={1}
            min={-9}
            max={9}
            sx={{
                marginTop: '1.7rem',
                marginBottom: '0.8rem',
                    '& .MuiSlider-valueLabel': {
                        top: -1,
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: 'grey',
                        backgroundColor: 'unset',
                    },
            }}
        />
        </div>
        <Button variant="primary" onClick={multiplyBfactor}>
            OK
        </Button>
    </>

    return <MoorhenBaseMenuItem
        id='multiply-bfactor-menu-item'
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText="Multiply molecule B-factors..."
        onCompleted={() => {}}
        showOkButton={false}
        setPopoverIsShown={props.setPopoverIsShown}
    />

}
