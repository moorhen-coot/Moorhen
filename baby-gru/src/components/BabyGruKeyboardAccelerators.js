import { List, ListItem } from "@mui/material"
import { cidToSpec } from "../utils/BabyGruUtils"

const apresEdit = (molecule, glRef, setHoveredAtom) => {
    molecule.setAtomsDirty(true)
    molecule.redraw(glRef)
    setHoveredAtom({ molecule: null, cid: null })
}

export const babyGruKeyPress = (event, collectedProps, shortCuts) => {
    console.log(event)
    let modifiers = []

    if (event.shiftKey) modifiers.push("<Shift>")
    if (event.ctrlKey) modifiers.push("<Ctrl>")
    if (event.metaKey) modifiers.push("<Meta>")
    if (event.altKey) modifiers.push("<Alt>")

    const { setShowToast, setToastContent, hoveredAtom, setHoveredAtom, commandCentre, activeMap, glRef } = collectedProps;

    setToastContent(<h3>{`${modifiers.join("-")} ${event.key} pushed`}</h3>)
    setShowToast(true)

    let action = null;

    for (const key of Object.keys(shortCuts)) {
        if(shortCuts[key].keyPress === event.key.toLowerCase() && shortCuts[key].modifiers.every(modifier => event[modifier])) {
            action = key
            break
        }
    }

    if (!action) {
        return true
    }

    console.log(`Shortcut for action ${action} detected...`)
    
    if (action === 'sphere_refine' && activeMap && hoveredAtom.molecule) {
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [
            `${hoveredAtom.molecule.molNo}`,
            `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
            "SPHERE"]
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "refine_residues_using_atom_cid",
            commandArgs: commandArgs,
            changesMolecules:[hoveredAtom.molecule.molNo]
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    else if (action === 'flip_peptide' && activeMap && hoveredAtom.molecule) {
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [
            `${hoveredAtom.molecule.molNo}`,
            `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`,
            '']
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "flipPeptide_cid",
            commandArgs: commandArgs,
            changesMolecules:[hoveredAtom.molecule.molNo]
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    if (action === 'triple_refine' && activeMap && hoveredAtom.molecule) {
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [
            `${hoveredAtom.molecule.molNo}`,
            `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
            "TRIPLE"]
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "refine_residues_using_atom_cid",
            commandArgs: commandArgs,
            changesMolecules:[hoveredAtom.molecule.molNo]
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    if (action === 'auto_fit_rotamer' && activeMap && hoveredAtom.molecule) {
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
            commandArgs: commandArgs,
            changesMolecules:[hoveredAtom.molecule.molNo]
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    if (action === 'add_terminal_residue' && activeMap && hoveredAtom.molecule) {
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [
            hoveredAtom.molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "add_terminal_residue_directly_using_cid",
            commandArgs: commandArgs,
            changesMolecules:[hoveredAtom.molecule.molNo]
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }
    
    if (action === 'delete_residue' && hoveredAtom.molecule) {
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [
            hoveredAtom.molecule.molNo,
            `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}`,
            "RESIDUE"
        ]
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "delete_using_cid",
            commandArgs: commandArgs,
            changesMolecules:[hoveredAtom.molecule.molNo]
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }
    
    if (action === 'eigen_flip'  && hoveredAtom.molecule) {
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [hoveredAtom.molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "eigen_flip_ligand",
            commandArgs: commandArgs,
            changesMolecules:[hoveredAtom.molecule.molNo]
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    else if (action === 'show_shortcuts') {
        setToastContent(<h4><List>
            {Object.keys(shortCuts).map(key => {
                let modifiers = []
                if (shortCuts[key].modifiers.includes('shiftKey')) modifiers.push("<Shift>")
                if (shortCuts[key].modifiers.includes('ctrlKey')) modifiers.push("<Ctrl>")
                if (shortCuts[key].modifiers.includes('metaKey')) modifiers.push("<Meta>")
                if (shortCuts[key].modifiers.includes('altKey')) modifiers.push("<Alt>")                
                return <ListItem>{`${modifiers.join("-")} ${shortCuts[key].label}`}</ListItem>
            })}
        </List></h4>)
        setShowToast(true)
        return false
    }
    return true
}