import { useCallback, useRef } from "react"
import { useDispatch, useSelector } from 'react-redux';
import { moorhen } from "../../types/moorhen";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { useCommandCentre } from "../../InstanceManager";

export const MoorhenAddWatersMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const mapSelectRef = useRef<null | HTMLSelectElement>(null)
    
    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const maps = useSelector((state: moorhen.State) => state.maps)
    const commandCentre = useCommandCentre()

    const panelContent = <>
        <MoorhenMoleculeSelect molecules={molecules} ref={moleculeSelectRef} allowAny={false} />
        <MoorhenMapSelect maps={maps} ref={mapSelectRef}/>
    </>

    const onCompleted = useCallback(async () => {

        if (mapSelectRef.current.value === null || moleculeSelectRef.current.value === null) {
            return
        }

        const moleculeMolNo = parseInt(moleculeSelectRef.current.value)
        const mapMolNo = parseInt(mapSelectRef.current.value)
        
        await commandCentre.current.cootCommand({
            command: 'add_waters',
            commandArgs: [moleculeMolNo, mapMolNo],
            returnType: "status",
            changesMolecules: [moleculeMolNo]
        }, true)
        
        const selectedMolecule = molecules.find(molecule => molecule.molNo === moleculeMolNo)
        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        
        dispatch( triggerUpdate(moleculeMolNo) )

    }, [molecules, maps, commandCentre])

    return <MoorhenBaseMenuItem
        id='add-waters-menu-item'
        popoverContent={panelContent}
        menuItemText="Add waters..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
