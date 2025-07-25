import { useCallback, useRef } from "react"
import { useDispatch, useSelector } from 'react-redux';
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { moorhen } from "../../types/moorhen";
import { addMoleculeList } from "../../store/moleculesSlice";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"

export const MoorhenSplitModelsMenuItem = (props: {
    popoverPlacement?: 'left' | 'right'
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const dispatch = useDispatch()

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)

    const panelContent = <>
        <MoorhenMoleculeSelect molecules={molecules} allowAny={false} ref={moleculeSelectRef} />
    </>

    const onCompleted = useCallback(async () => {
        if (moleculeSelectRef.current.value === null) {
            return
        }
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (selectedMolecule) {
            const newMolecules = await selectedMolecule.splitMultiModels(true)
            dispatch( addMoleculeList(newMolecules) )
        }
    }, [molecules])

    return <MoorhenBaseMenuItem
        id='split-models-menu-item'
        popoverPlacement={props.popoverPlacement ?? 'right'}
        popoverContent={panelContent}
        menuItemText="Split multi-model molecule..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

