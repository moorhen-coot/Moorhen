import { useDispatch, useSelector } from "react-redux"
import { moorhen } from "../../types/moorhen"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { useRef } from "react"
import { MoorhenMapSelect } from "../select/MoorhenMapSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice"

export const MoorhenShiftFieldBFactorRefinement = (props) => {
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const mapSelectRef = useRef<null | HTMLSelectElement>(null)
    
    const dispatch = useDispatch()
    const maps = useSelector((state: moorhen.State) => state.maps)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const doRefinement = async () => {
        if (!moleculeSelectRef.current.value || !mapSelectRef.current.value) {
            return
        }

        const selectedMoleculeMolNo = parseInt(moleculeSelectRef.current.value)
        const selectedMapMolNo = parseInt(mapSelectRef.current.value)

        await props.commandCentre.current.cootCommand({
            command: 'shift_field_b_factor_refinement',
            commandArgs: [selectedMoleculeMolNo, selectedMapMolNo],
            returnType: 'status'
        }, false)

        dispatch( triggerUpdate(selectedMoleculeMolNo) )
    }

    const panelContent = <>
        <MoorhenMoleculeSelect molecules={molecules} allowAny={false} ref={moleculeSelectRef} />
        <MoorhenMapSelect maps={maps} ref={mapSelectRef} filterFunction={(map) => map.hasReflectionData} width='100%' label='Map with reflection data' />
    </>

    return <MoorhenBaseMenuItem
        id='shift-field-bfactor-refinement-menu-item'
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText="Shift field B-factor refinement..."
        onCompleted={doRefinement}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}