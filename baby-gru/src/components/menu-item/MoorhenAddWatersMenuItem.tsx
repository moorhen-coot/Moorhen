import { useCallback, useEffect, useRef, useState } from "react"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

export const MoorhenAddWatersMenuItem = (props: {
    molecules: moorhen.Molecule[];
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    activeMap: moorhen.Map;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const moleculeRef = useRef<null | HTMLSelectElement>(null)
    const [disabled, setDisabled] = useState<boolean>(true)

    useEffect(() => {
        if (!props.activeMap) {
            setDisabled(true)
        } else {
            setDisabled(false)
        }
    }, [props.activeMap])

    const panelContent = <>
        <MoorhenMoleculeSelect {...props} ref={moleculeRef} allowAny={false} />
    </>

    const onCompleted = useCallback(async () => {
        if (!props.activeMap || moleculeRef.current.value === null) {
            return
        }
        const molNo = parseInt(moleculeRef.current.value)
        await props.commandCentre.current.cootCommand({
            command: 'add_waters',
            commandArgs: [molNo, props.activeMap.molNo],
            returnType: "status",
            changesMolecules: [molNo]
        }, true)
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === molNo)
        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molNo } })
        document.dispatchEvent(scoresUpdateEvent)

    }, [props.molecules, props.activeMap, props.glRef, props.commandCentre])

    return <MoorhenBaseMenuItem
        id='add-waters-menu-item'
        disabled={disabled}
        popoverContent={panelContent}
        menuItemText="Add waters..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
