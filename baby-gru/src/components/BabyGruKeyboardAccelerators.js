import { List, ListItem } from "@mui/material"
import { cidToSpec } from "../utils/BabyGruUtils"

const apresEdit = (molecule, glRef, setHoveredAtom) => {
    molecule.setAtomsDirty(true)
    molecule.redraw(glRef)
    setHoveredAtom({ molecule: null, cid: null })
}

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
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [
            `${hoveredAtom.molecule.molNo}`,
            `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
            "SPHERE"]
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "refine_residues_using_atom_cid",
            commandArgs: commandArgs
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    else if (event.key.toLowerCase() === "q" && event.shiftKey && activeMap && hoveredAtom.molecule) {
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [
            `${hoveredAtom.molecule.molNo}`,
            `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`,
            '']
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "flipPeptide_cid",
            commandArgs: commandArgs
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    if (event.key.toLowerCase() === "h" && event.shiftKey && activeMap && hoveredAtom.molecule) {
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [
            `${hoveredAtom.molecule.molNo}`,
            `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
            "TRIPLE"]
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "refine_residues_using_atom_cid",
            commandArgs: commandArgs
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    if (event.key.toLowerCase() === "j" && event.shiftKey && activeMap && hoveredAtom.molecule) {
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [
            hoveredAtom.molecule.molNo,
            chosenAtom.chain_id,
            chosenAtom.res_no,
            chosenAtom.ins_code,
            chosenAtom.alt_conf,
            activeMap.molNo]
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "auto_fit_rotamer",
            commandArgs: commandArgs
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    if (event.key.toLowerCase() === "e" && event.shiftKey && activeMap && hoveredAtom.molecule) {
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [hoveredAtom.molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "eigen_flip_ligand",
            commandArgs: commandArgs
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    else if (event.key == "Meta" && event.metaKey) {
        setToastContent(<h4><List>
            <ListItem>Shift-R: Refine sphere</ListItem>
            <ListItem>Shift-Q: Flip peptide</ListItem>
            <ListItem>Shift-H: Refine triplet</ListItem>
            <ListItem>Shift-J: Autofit rotamer</ListItem>
            <ListItem>Shift-E: Eigen flip ligand</ListItem>
        </List></h4>)
        setShowToast(true)
        return false
    }
    return true
}