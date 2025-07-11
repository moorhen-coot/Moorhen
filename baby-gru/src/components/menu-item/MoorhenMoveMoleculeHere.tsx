import { useCallback, useRef } from "react"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from 'react-redux';
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";

export const MoorhenMoveMoleculeHere = (props: {
    popoverPlacement?: 'left' | 'right'
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const dispatch = useDispatch()

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)

    const originState = useSelector((state: moorhen.State) => state.glRef.origin)

    const panelContent = <>
        <MoorhenMoleculeSelect molecules={molecules} allowAny={false} ref={moleculeSelectRef} />
    </>

    const onCompleted = useCallback(async () => {
        if (moleculeSelectRef.current.value === null) {
            return
        }
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (selectedMolecule) {
            await selectedMolecule.moveMoleculeHere(...originState.map(coord => -coord) as [number, number, number])
            dispatch( triggerUpdate(selectedMolecule.molNo) )
        }
    }, [molecules])

    return <MoorhenBaseMenuItem
        id='merge-molecules-menu-item'
        popoverPlacement={props.popoverPlacement ?? "right"}
        popoverContent={panelContent}
        menuItemText="Move molecule here..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
