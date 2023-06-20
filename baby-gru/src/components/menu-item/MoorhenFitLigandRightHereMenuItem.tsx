import { TextField } from "@mui/material";
import { useRef, useState } from "react";
import { Form } from "react-bootstrap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { MoorhenMapInterface } from "../../utils/MoorhenMap";
import { MolChange } from "../MoorhenApp";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

export const MoorhenFitLigandRightHereMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    popoverPlacement?: 'left' | 'right';
    defaultBondSmoothness: number;
    glRef: React.RefObject<webGL.MGWebGL>;  
    maps: MoorhenMapInterface[];
    molecules: moorhen.Molecule[];
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    changeMolecules: (arg0: MolChange<moorhen.Molecule>) => void;
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
        
        const result = await props.commandCentre.current.cootCommand({
            returnType: 'int_array',
            command: 'fit_ligand_right_here',
            commandArgs: [
                parseInt(intoMoleculeRef.current.value),
                parseInt(mapSelectRef.current.value),
                parseInt(ligandMoleculeRef.current.value),
                ...props.glRef.current.origin.map(coord => -coord),
                1., useConformersRef.current, parseInt(conformerCountRef.current)
            ]

        }, true)
        
        if (result.data.result.status === "Completed") {
            await Promise.all(
                result.data.result.result.map(async (iMol: number) => {
                    const newMolecule = new MoorhenMolecule(props.commandCentre, props.monomerLibraryPath)
                    newMolecule.molNo = iMol
                    newMolecule.name = `lig_${iMol}`
                    newMolecule.setBackgroundColour(props.backgroundColor)
                    newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
                    await newMolecule.fetchIfDirtyAndDraw('CBs', props.glRef)
                    props.changeMolecules({ action: "Add", item: newMolecule })
                })
            )
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
