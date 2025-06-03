import { useSelector } from "react-redux";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Form, FormSelect, InputGroup } from "react-bootstrap";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { MoorhenLigandSelect } from "../select/MoorhenLigandSelect";
import { MoorhenSlider } from "../inputs/MoorhenSlider";

export const MoorhenMinimizeEnergyMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {
 
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const useRamaRestraintsCheckRef = useRef<null | HTMLInputElement>(null)
    const useTorsionRestraintsCheckRef = useRef<null | HTMLInputElement>(null)
    const ramaWeightSliderRef = useRef<number>(1)
    const torsionWeightSliderRef = useRef<number>(1)
    const nIterationsSliderRef = useRef<number>(50)
    const ncycSliderRef = useRef<number>(50)
    const chainSelectRef = useRef<null | HTMLSelectElement>(null)
    const selectionTypeSelectRef = useRef<null | HTMLSelectElement>(null)
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const ligandSelectRef = useRef<null | HTMLSelectElement>(null)
    const cidInputRef = useRef<null | HTMLInputElement>(null)

    const [selectionType, setSelectionType] = useState<string>("ligand")
    const [selectedMolNo, setSelectedMolNo] = useState<number>(1)
    const [ramaWeight, setRamaWeight] = useState<number>(1)
    const [torsionWeight, setTorsionWeight] = useState<number>(1)
    const [ncyc, setNcyc] = useState<number>(50)
    const [nIterations, setNIterations] = useState<number>(50)
    const [useRamaRestraints, setUseRamaRestraints] = useState<boolean>(false)
    const [useTorsionRestraints, setUseTorsionRestraints] = useState<boolean>(false)

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedMolNo(null)
        } else if (selectedMolNo === null) {
            setSelectedMolNo(molecules[0].molNo)
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedMolNo)) {
            setSelectedMolNo(molecules[0].molNo)
        }

    }, [molecules])

    const minimizeEnergy = useCallback(async () => {
        if (!moleculeSelectRef.current.value) {
            return
        }

        const quiet = true
        const molNo = parseInt(moleculeSelectRef.current.value)
        const selectedMolecule = molecules.find(molecule => molecule.molNo === molNo)

        if (!selectedMolecule) {
            return
        }

        let cid: string
        switch (selectionTypeSelectRef.current?.value) {
            case 'molecule':
                cid = '//'
                break
            case 'chain':
                cid = `//${chainSelectRef.current.value}`
                break
            case 'cid':
                cid = cidInputRef.current.value
                break
            case 'ligand':
                cid = ligandSelectRef.current.value
                break
            default:
                console.log('Unrecognised mask type...')
                break
        }

        if (!cid) {
            return
        }

        document.body.click()

        await selectedMolecule.minimizeEnergyUsingCidAnimated(
            cid,
            ncycSliderRef.current,
            nIterationsSliderRef.current,
            useRamaRestraintsCheckRef.current.checked,
            ramaWeightSliderRef.current,
            useTorsionRestraintsCheckRef.current.checked,
            torsionWeightSliderRef.current,
        )

    }, [molecules])

    const panelContent = <>
            <Form.Group style={{ margin: '0.5rem', width: '20rem' }}>
            <Form.Label>Selection type...</Form.Label>
            <FormSelect size="sm" ref={selectionTypeSelectRef} defaultValue={'ligand'} onChange={(evt) => {
                setSelectionType(evt.target.value)
                selectionTypeSelectRef.current.value = evt.target.value
            }}>
                <option value={'ligand'} key={'ligand'}>By ligand</option>
                <option value={'chain'} key={'chain'}>By chain</option>
                <option value={'cid'} key={'cid'}>By atom selection</option>
            </FormSelect>
        </Form.Group>
        <MoorhenMoleculeSelect {...props} molecules={molecules} allowAny={false} ref={moleculeSelectRef} onChange={(evt) => setSelectedMolNo(parseInt(evt.target.value))}/>
        {selectionType === 'cid' && <MoorhenCidInputForm {...props} width='20rem' margin='0.5rem' ref={cidInputRef} allowUseCurrentSelection={true}/>}
        {selectionType === 'chain' && <MoorhenChainSelect {...props} molecules={molecules} selectedCoordMolNo={selectedMolNo} ref={chainSelectRef} />}
        {selectionType === 'ligand' && <MoorhenLigandSelect {...props} molecules={molecules} selectedCoordMolNo={parseInt(moleculeSelectRef.current?.value)} ref={ligandSelectRef} />}
        <InputGroup className='moorhen-input-group-check' style={{ width: '20rem' }}>
            <Form.Check 
                ref={useRamaRestraintsCheckRef}
                type="switch"
                checked={useRamaRestraints}
                onChange={() => {setUseRamaRestraints((prev) => !prev)}}
                label="Use ramachandran restraints"/>
        </InputGroup>
        <InputGroup className='moorhen-input-group-check' style={{ width: '20rem' }}>
            <Form.Check 
                ref={useTorsionRestraintsCheckRef}
                type="switch"
                checked={useTorsionRestraints}
                onChange={() => {setUseTorsionRestraints((prev) => !prev)}}
                label="Use torsion restraints"/>
        </InputGroup>
        <div style={{display: useRamaRestraints ? "" : "none"}}>
        <MoorhenSlider
            isDisabled={!useRamaRestraints}
            sliderTitle="Ramachandran restraints weight"
            minVal={0.1}
            maxVal={100}
            decimalPlaces={2}
            logScale={true}
            externalValue={ramaWeight}
            setExternalValue={(value) => setRamaWeight(value)}/>
        </div>
        <div style={{display: useTorsionRestraints ? "" : "none"}}>
        <MoorhenSlider
            isDisabled={!useTorsionRestraints}
            sliderTitle="Torsion restraints weight"
            minVal={0.1}
            maxVal={10}
            decimalPlaces={2}
            logScale={true}
            externalValue={torsionWeight}
            setExternalValue={(value) => setTorsionWeight(value)}/>            
        </div>
        <MoorhenSlider
            sliderTitle="Number of iterations"
            minVal={1}
            maxVal={100}
            logScale={false}
            decimalPlaces={0}
            externalValue={nIterations}
            setExternalValue={(value) => setNIterations(value)}/>
        <MoorhenSlider
            sliderTitle="Number of cycles"
            minVal={1}
            maxVal={100}
            logScale={false}
            decimalPlaces={0}
            externalValue={ncyc}
            setExternalValue={(value) => setNcyc(value)}/>
        <Button variant="primary" onClick={minimizeEnergy}>
            OK
        </Button>
    </>

 
return <MoorhenBaseMenuItem
            popoverContent={panelContent}
            menuItemText={"Minimize energy..."}
            setPopoverIsShown={props.setPopoverIsShown}
            onCompleted={() => {}}
            showOkButton={false}
        />
}