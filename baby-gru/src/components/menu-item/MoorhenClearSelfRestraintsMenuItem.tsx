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
            molecules={props.molecules}/>
    </>

    const onCompleted = async () => {
        await props.commandCentre.current.cootCommand({
            command: "clear_extra_restraints",
            returnType: 'status',
            commandArgs: [parseInt(moleculeSelectRef.current.value)],
        }, false)
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

