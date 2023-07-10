import { useRef, useState } from "react"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { Form } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

export const MoorhenCopyFragmentUsingCidMenuItem = (props: {
    molecules: moorhen.Molecule[];
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    monomerLibraryPath: string;
    defaultBondSmoothness: number;
    backgroundColor: [number, number, number, number];
    changeMolecules: (arg0: moorhen.MolChange<moorhen.Molecule>) => void;
}) => {

    const fromRef = useRef<null | HTMLSelectElement>(null)
    const cidRef = useRef<null |HTMLInputElement>(null)
    const [cid, setCid] = useState<string>("")

    const panelContent = <>
        <MoorhenMoleculeSelect {...props} label="From molecule" allowAny={false} ref={fromRef} />
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="cid" className="mb-3">
            <Form.Label>Selection to copy</Form.Label>
            <Form.Control ref={cidRef} type="text" value={cid} onChange={(e) => {
                setCid(e.target.value)
            }} />
        </Form.Group>

    </>

    const onCompleted = async () => {
        const fromMolecules = props.molecules.filter(molecule => molecule.molNo === parseInt(fromRef.current.value))
        const cidToCopy = cidRef.current.value

        const commandArgs = [
            parseInt(fromRef.current.value),
            `${cidToCopy}`,
        ]

        const response = await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: "copy_fragment_using_cid",
            commandArgs: commandArgs,
            changesMolecules: [parseInt(fromRef.current.value)]
        }, true) as moorhen.WorkerResponse<number> 
        
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.monomerLibraryPath)
        newMolecule.name = `${fromMolecules[0].name} fragment`
        newMolecule.molNo = response.data.result.result
        newMolecule.setBackgroundColour(props.backgroundColor)
        newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
        await newMolecule.fetchIfDirtyAndDraw('CBs')
        props.changeMolecules({ action: "Add", item: newMolecule })
        
        props.setPopoverIsShown(false)
    }

    return <MoorhenBaseMenuItem
        id='copy-fragment-menu-item'
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText="Copy fragment..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
