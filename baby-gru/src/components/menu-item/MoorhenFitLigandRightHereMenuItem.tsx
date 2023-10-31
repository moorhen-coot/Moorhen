import { TextField } from "@mui/material";
import { useRef, useState } from "react";
import { Form } from "react-bootstrap";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector, useDispatch } from 'react-redux';
import { addMolecule } from "../../store/moleculesSlice";
import { MoorhenNumberForm } from "../select/MoorhenNumberForm";

export const MoorhenFitLigandRightHereMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    popoverPlacement?: 'left' | 'right';
    glRef: React.RefObject<webGL.MGWebGL>;  
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    monomerLibraryPath: string;
}) => {

    const dispatch = useDispatch()
    const devMode = useSelector((state: moorhen.State) => state.generalStates.devMode)
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const intoMoleculeRef = useRef<HTMLSelectElement | null>(null)
    const ligandMoleculeRef = useRef<HTMLSelectElement | null>(null)
    const mapSelectRef = useRef<HTMLSelectElement | null>(null)
    const useConformersRef = useRef<boolean>(false)
    const conformerCountRef = useRef<string>(null)

    const [useConformers, setUseConformers] = useState<boolean>(false)

    const panelContent = <>
        <MoorhenMapSelect maps={maps} label="Map" ref={mapSelectRef} />
        <MoorhenMoleculeSelect molecules={molecules} label="Protein molecule" allowAny={false} ref={intoMoleculeRef} />
        <MoorhenMoleculeSelect molecules={molecules} label="Ligand molecule" allowAny={false} ref={ligandMoleculeRef} />
        {devMode && 
         <Form.Check
            style={{margin: '0.5rem'}} 
            type="switch"
            checked={useConformers}
            onChange={() => { 
                useConformersRef.current = !useConformers
                setUseConformers(!useConformers)
            }}
            label="Use conformers"/>}
        {useConformers && <MoorhenNumberForm ref={conformerCountRef} label="No. of conformers" defaultValue={10}/> }
    </>


    const onCompleted = async () => {
        if (useConformersRef.current && !conformerCountRef.current) {
            console.warn('Unable to parse conformer count into a valid int...')
            return
        }

        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(intoMoleculeRef.current.value))
        if(selectedMolecule) {
            const newMolecules = await selectedMolecule.fitLigandHere(
                parseInt(mapSelectRef.current.value),
                parseInt(ligandMoleculeRef.current.value),
                true,
                useConformersRef.current,
                parseInt(conformerCountRef.current)
            )
            newMolecules.forEach(molecule => dispatch( addMolecule(molecule) ))
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
