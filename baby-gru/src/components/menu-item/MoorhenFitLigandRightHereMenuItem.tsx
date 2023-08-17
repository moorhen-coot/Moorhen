import { TextField } from "@mui/material";
import { useRef, useState } from "react";
import { Form } from "react-bootstrap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

export const MoorhenFitLigandRightHereMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    popoverPlacement?: 'left' | 'right';
    defaultBondSmoothness: number;
    glRef: React.RefObject<webGL.MGWebGL>;  
    maps: moorhen.Map[];
    molecules: moorhen.Molecule[];
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    changeMolecules: (arg0: moorhen.MolChange<moorhen.Molecule>) => void;
    backgroundColor: [number, number, number, number];
    monomerLibraryPath: string;
    devMode?: boolean;
}) => {

    const intoMoleculeRef = useRef<HTMLSelectElement | null>(null)
    const ligandMoleculeRef = useRef<HTMLSelectElement | null>(null)
    const mapSelectRef = useRef<HTMLSelectElement | null>(null)
    const useConformersRef = useRef<boolean>(false)
    const conformerCountRef = useRef<string>('0')
    const [useConformers, setUseConformers] = useState<boolean>(false)
    const [conformerCount, setConformerCount] = useState<string>('10')

    const panelContent = <>
        <MoorhenMapSelect {...props} label="Map" ref={mapSelectRef} />
        <MoorhenMoleculeSelect {...props} label="Protein molecule" allowAny={false} ref={intoMoleculeRef} />
        <MoorhenMoleculeSelect {...props} label="Ligand molecule" allowAny={false} ref={ligandMoleculeRef} />
        {props.devMode && 
         <Form.Check
            style={{margin: '0.5rem'}} 
            type="switch"
            checked={useConformers}
            onChange={() => { 
                useConformersRef.current = !useConformers
                setUseConformers(!useConformers)
            }}
            label="Use conformers"/>}
        {useConformers &&
        <Form.Group>
            <TextField
                style={{margin: '0.5rem'}} 
                id='conformer-count'
                label='No. of conformers'
                type='number'
                variant="standard"
                error={isNaN(parseInt(conformerCount)) || parseInt(conformerCount) < 0 || parseInt(conformerCount) === Infinity}
                value={conformerCount}
                onChange={(evt) => {
                    conformerCountRef.current = evt.target.value
                    setConformerCount(evt.target.value)
                }}
            />
        </Form.Group>}
    </>


    const onCompleted = async () => {
        if (useConformersRef.current && (isNaN(parseInt(conformerCountRef.current)) || parseInt(conformerCountRef.current) < 0 || parseInt(conformerCountRef.current) === Infinity)) {
            console.log('Unable to parse conformer count into a valid int...')
            return
        }

        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(intoMoleculeRef.current.value))
        if(selectedMolecule) {
            const newMolecules = await selectedMolecule.fitLigandHere(
                parseInt(mapSelectRef.current.value),
                parseInt(ligandMoleculeRef.current.value),
                true,
                useConformersRef.current,
                parseInt(conformerCountRef.current)
            )
            newMolecules.forEach(molecule => props.changeMolecules({ action: "Add", item: molecule }))
        }
    }

    return <MoorhenBaseMenuItem
        id='fit-ligand-right-here-menu-item'
        popoverContent={panelContent}
        menuItemText="Fit ligand here..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
        popoverPlacement={props.popoverPlacement}
    />
}

MoorhenFitLigandRightHereMenuItem.defaultProps = { popoverPlacement: "right" }
