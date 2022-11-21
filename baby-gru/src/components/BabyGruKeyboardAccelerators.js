import { List, ListItem } from "@mui/material"
import { cidToSpec } from "../utils/BabyGruUtils"

export const babyGruKeyPress = (event, collectedProps) => {
    console.log(event)
    let modifiers = []
    if (event.shiftKey) modifiers.push("<Shift>")
    if (event.ctrlKey) modifiers.push("<Ctrl>")
    if (event.metaKey) modifiers.push("<Meta>")
    if (event.altKey) modifiers.push("<Alt>")

    const { setShowToast, setToastContent, hoveredAtom, setHoveredAtom, commandCentre, activeMap, glRef } = collectedProps;

    setToastContent(<h3>{`${modifiers.join("-")} ${event.key} pushed`}</h3>)
    setShowToast(true)

    if (event.key.toLowerCase() === "r" && event.shiftKey && activeMap && hoveredAtom.molecule) {
        const [molecule, cid] = [hoveredAtom.molecule, hoveredAtom.cid]
        const chosenAtom = cidToSpec(cid)
        const commandArgs = [
            `${molecule.molNo}`,
            `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
            "SPHERE"]
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "refine_residues_using_atom_cid",
            commandArgs: commandArgs
        }, true).then(_ => {
            molecule.setAtomsDirty(true)
            molecule.redraw(glRef)
            setHoveredAtom({ molecule: null, cid: null })
        })
        return false
    }
    else if (event.key == "Meta" && event.metaKey) {
        setToastContent(<h4><List>
            <ListItem>Shift-R: Refine sphere</ListItem>
        </List></h4>)
        setShowToast(true)
        return false
    }
    return true
}