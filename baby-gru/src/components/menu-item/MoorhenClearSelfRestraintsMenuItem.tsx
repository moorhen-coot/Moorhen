import { useRef } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { moorhen } from "../../types/moorhen";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { removeGeneralRepresentation } from "../../moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"

export const MoorhenClearSelfRestraintsMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null)

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const dispatch = useDispatch()

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
            const restraintsRepresenation = selectedMolecule.representations.find(representation => representation.style === 'restraints')
            if (restraintsRepresenation) {
                dispatch( removeGeneralRepresentation(restraintsRepresenation) )
            }
            dispatch( triggerUpdate(selectedMolecule.molNo) )
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
        setPopoverIsShown={props.setPopoverIsShown}
    />
}


