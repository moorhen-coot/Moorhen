import { useRef } from "react";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { useSelector } from 'react-redux';

export const MoorhenClearSelfRestraintsMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    popoverPlacement?: 'left' | 'right';
}) => {

    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null)
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const panelContent = <>
        <MoorhenMoleculeSelect
            ref={moleculeSelectRef}
            molecules={molecules}
            filterFunction={(mol) => mol.restraints.length > 0}/>
    </>

    const onCompleted = async () => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (selectedMolecule) {
            await selectedMolecule.clearExtraRestraints()
        }
        const restraintsRepresenation = selectedMolecule.representations.find(item => item.style === 'restraints')
        if (restraintsRepresenation) {
            selectedMolecule.removeRepresentation(restraintsRepresenation.uniqueId)
        }
    }

    return <MoorhenBaseMenuItem
        id='clear-restraints-menu-item'
        popoverContent={panelContent}
        menuItemText="Clear self-restraints..."
        onCompleted={onCompleted}
        popoverPlacement={props.popoverPlacement}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

MoorhenClearSelfRestraintsMenuItem.defaultProps = { popoverPlacement: "right" }

