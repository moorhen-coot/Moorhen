import { useCallback, useRef } from "react"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from 'react-redux';
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";

export const MoorhenAddWatersMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const mapSelectRef = useRef<null | HTMLSelectElement>(null)
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const maps = useSelector((state: moorhen.State) => state.maps)

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
        
        await props.commandCentre.current.cootCommand({
            command: 'add_waters',
            commandArgs: [moleculeMolNo, mapMolNo],
            returnType: "status",
            changesMolecules: [moleculeMolNo]
        }, true)
        
        const selectedMolecule = molecules.find(molecule => molecule.molNo === moleculeMolNo)
        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        
        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { modifiedMolecule: moleculeMolNo } })
        document.dispatchEvent(scoresUpdateEvent)

    }, [molecules, maps, props.glRef, props.commandCentre])

    return <MoorhenBaseMenuItem
        id='add-waters-menu-item'
        popoverContent={panelContent}
        menuItemText="Add waters..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
