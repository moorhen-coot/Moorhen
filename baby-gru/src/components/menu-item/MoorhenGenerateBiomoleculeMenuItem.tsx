import { useCallback,useRef, useState } from "react"
import { useDispatch } from "react-redux"
import { Button, Form, FormSelect } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { addMolecule, hideMolecule, showMolecule } from "../../store/moleculesSlice"

export const MoorhenGenerateBiomoleculeMenuItem = (props: {
    item: moorhen.Molecule;
    setCurrentName: React.Dispatch<React.SetStateAction<string>>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const ruleSelectRef = useRef<null | HTMLSelectElement>(null)
    const [selectionType, setSelectionType] = useState<string>("1")
    const dispatch = useDispatch()

    const rows = []
    const assemblies = props.item.gemmiStructure.assemblies
    for(let i=0; i<assemblies.size(); i++){
        const assembly = assemblies.get(i)
        const assembly_name = assembly.name
        const oligomeric_details = assembly.oligomeric_details
        const is_icoso_kind = assembly.is_complete_icosohedral_special_kind()
        if(!is_icoso_kind) rows.push(<option value={assembly_name} key={assembly_name}>({assembly_name}) {oligomeric_details}</option>)
        assembly.delete()
    }
    assemblies.delete()
    const panelContent = <>
        <Form.Group style={{ width: '10rem', margin: '0' }} controlId="MoorhenGenerateBiomoleculeMenuItem" className="mb-3">
            <Form.Label>Assembly</Form.Label>
            <FormSelect size="sm" ref={ruleSelectRef} onChange={(val) => setSelectionType(val.target.value)}>
            {rows}
            </FormSelect>
        </Form.Group>
    </>

    const onCompleted = useCallback(async() => {
        props.setPopoverIsShown(false)
        const newMolecule = await props.item.generateAssembly(ruleSelectRef.current.value)
        dispatch(addMolecule(newMolecule))
    },[])

    return <MoorhenBaseMenuItem
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={"Generate assembly"}
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
