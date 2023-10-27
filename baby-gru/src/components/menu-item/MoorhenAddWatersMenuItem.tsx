import { useCallback, useEffect, useRef, useState } from "react"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from 'react-redux';

export const MoorhenAddWatersMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const moleculeRef = useRef<null | HTMLSelectElement>(null)
    const [disabled, setDisabled] = useState<boolean>(true)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    useEffect(() => {
        if (!activeMap) {
            setDisabled(true)
        } else {
            setDisabled(false)
        }
    }, [activeMap])

    const panelContent = <>
        <MoorhenMoleculeSelect molecules={molecules} ref={moleculeRef} allowAny={false} />
    </>

    const onCompleted = useCallback(async () => {
        if (!activeMap || moleculeRef.current.value === null) {
            return
        }
        const molNo = parseInt(moleculeRef.current.value)
        await props.commandCentre.current.cootCommand({
            command: 'add_waters',
            commandArgs: [molNo, activeMap.molNo],
            returnType: "status",
            changesMolecules: [molNo]
        }, true)
        const selectedMolecule = molecules.find(molecule => molecule.molNo === molNo)
        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molNo } })
        document.dispatchEvent(scoresUpdateEvent)

    }, [molecules, activeMap, props.glRef, props.commandCentre])

    return <MoorhenBaseMenuItem
        id='add-waters-menu-item'
        disabled={disabled}
        popoverContent={panelContent}
        menuItemText="Add waters..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
