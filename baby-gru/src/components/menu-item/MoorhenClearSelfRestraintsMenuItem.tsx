import { useRef } from "react";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";

export const MoorhenClearSelfRestraintsMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    molecules: moorhen.Molecule[];
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    popoverPlacement?: 'left' | 'right';
}) => {

    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null)

const panelContent = <>
        <MoorhenMoleculeSelect
            ref={moleculeSelectRef}
            molecules={props.molecules}
            filterFunction={(mol) => mol.restraints.length > 0}/>
    </>

    const onCompleted = async () => {
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
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

