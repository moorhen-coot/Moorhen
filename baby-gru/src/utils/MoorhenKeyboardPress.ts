import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import { Dispatch, createRef, useState } from "react";
import { AnyAction } from "@reduxjs/toolkit";
import { useSelector } from 'react-redux';
import { EnqueueSnackbar, closeSnackbar } from "notistack";
import { quatToMat4, quat4Inverse } from '../WebGLgComponents/quatToMat4';
import { getDeviceScale } from '../WebGLgComponents/webGLUtils';
import { vec3Create } from '../WebGLgComponents/mgMaths';
import { moorhen } from "../types/moorhen";
import { webGL } from "../types/mgWebGL";
import { setHoveredAtom } from "../store/hoveringStatesSlice";
import { changeMapRadius } from "../store/mapContourSettingsSlice";
import { triggerUpdate } from "../store/moleculeMapUpdateSlice";
import { setAtomInfoIds } from "../store/atomInfoCardsSlice";
import { setOrigin, setZoom, setQuat, setShortCutHelp,
         setClipStart, setClipEnd, setFogStart, setFogEnd, triggerClearLabels } from "../store/glRefSlice";
import store from '../store/MoorhenReduxStore'
import { cidToSpec, getCentreAtom } from "./utils"

const apresEdit = (molecule: moorhen.Molecule, glRef: React.RefObject<webGL.MGWebGL>, dispatch: Dispatch<AnyAction>) => {
    molecule.setAtomsDirty(true)
    molecule.redraw()
    dispatch( setHoveredAtom({ molecule: null, cid: null }) )
    dispatch( triggerUpdate(molecule.molNo) )
}

export const moorhenKeyPress = (
    event: KeyboardEvent, 
    collectedProps: {
        dispatch: Dispatch<AnyAction>;
        enqueueSnackbar: EnqueueSnackbar;
        hoveredAtom: moorhen.HoveredAtom;
        commandCentre: React.RefObject<moorhen.CommandCentre>;
        activeMap: moorhen.Map;
        molecules: moorhen.Molecule[];
        glRef: React.RefObject<webGL.MGWebGL>;
        viewOnly: boolean;
        videoRecorderRef: React.RefObject<moorhen.ScreenRecorder>;
    }, 
    shortCuts: {[key: string]: moorhen.Shortcut}, 
    showShortcutToast: boolean, 
    shortcutOnHoveredAtom: boolean
): boolean | Promise<boolean> => {
    
    const { 
        hoveredAtom, commandCentre, activeMap, glRef, molecules, 
        viewOnly, videoRecorderRef, enqueueSnackbar, dispatch
    } = collectedProps;

    const originState = store.getState().glRef.origin
    const zoom = store.getState().glRef.zoom
    const myQuat = store.getState().glRef.quat
    const fogStart = store.getState().glRef.fogStart
    const fogEnd = store.getState().glRef.fogEnd
    const clipStart = store.getState().glRef.clipStart
    const clipEnd = store.getState().glRef.clipEnd
    const width = store.getState().sceneSettings.width
    const height = store.getState().sceneSettings.height
    const cursorPosition = store.getState().glRef.cursorPosition
    const shortCutHelp = store.getState().glRef.shortCutHelp
    const atomInfoIds = store.getState().atomInfoCards.atomInfoIds

    const getFrontAndBackPos = () : [number[], number[], number, number] =>  {
        const x = cursorPosition[0];
        const y = cursorPosition[1];
        const invQuat = quat4.create();
        quat4Inverse(myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const ratio = width / height;
        const minX = (-24. * ratio * zoom);
        const maxX = (24. * ratio * zoom);
        const minY = (-24. * zoom);
        const maxY = (24. * zoom);
        const fracX = 1.0 * x / width
        const fracY = 1.0 * (y) / height
        const theX = minX + fracX * (maxX - minX);
        const theY = maxY - fracY * (maxY - minY);
        const frontPos = vec3Create([theX, theY, -clipStart]); // Maybe should be -clipStart
        const backPos = vec3Create([theX, theY, clipEnd]);
        vec3.transformMat4(frontPos, frontPos, theMatrix);
        vec3.transformMat4(backPos, backPos, theMatrix);
        vec3.subtract(frontPos, frontPos, originState);
        vec3.subtract(backPos, backPos, originState);
        return [frontPos, backPos, x*getDeviceScale(), y*getDeviceScale()];
    }

    const doAtomInfo = async (): Promise<boolean> => {
        if (hoveredAtom.molecule) {
            let chosenAtom: moorhen.ResidueSpec
            chosenAtom = cidToSpec(hoveredAtom.cid)
            const fragmentCid = chosenAtom.cid
            const chosenMolecule = hoveredAtom.molecule
            for(let i_id=0;i_id<atomInfoIds.length;i_id++)
                await closeSnackbar(atomInfoIds[i_id])
            if(showShortcutToast) {
                const newId = await enqueueSnackbar("atoms-info_"+chosenMolecule.molNo+"_"+fragmentCid, {
                    variant: "atomInformation",
                    monomerLibraryPath: hoveredAtom.molecule.monomerLibraryPath,
                    commandCentre: commandCentre,
                    cidRef: fragmentCid,
                    moleculeRef: chosenMolecule,
                    persist: true
                })
                collectedProps.dispatch(setAtomInfoIds([newId]))
            }
            return false
        }
    }

    const doShortCut = async (cootCommand: string, formatArgs: (arg0: moorhen.Molecule, arg1: moorhen.ResidueSpec) => any[]): Promise<boolean> => {
        let chosenMolecule: moorhen.Molecule
        let chosenAtom: moorhen.ResidueSpec
        let residueCid: string
        
        if (!shortcutOnHoveredAtom) {
            [chosenMolecule, residueCid] = await getCentreAtom(molecules, commandCentre, glRef)
            if (typeof chosenMolecule === 'undefined' || !residueCid) {
                console.log('Cannot find atom in the centre of the view...')
                return true
            }
            chosenAtom = cidToSpec(residueCid)
        } else if (hoveredAtom.molecule) {
            chosenAtom = cidToSpec(hoveredAtom.cid)
            chosenMolecule = hoveredAtom.molecule
        }
        
        if (chosenAtom && chosenMolecule) {
            return commandCentre.current.cootCommand({
                returnType: "status",
                command: cootCommand,
                commandArgs: formatArgs(chosenMolecule, chosenAtom),
                changesMolecules: [chosenMolecule.molNo]
            }, true)
            .then(_ => {
                apresEdit(chosenMolecule, glRef, dispatch)
            })
            .then(_ => false)
            .catch(err => {
                console.log(err)
                return true
            })
        }
        return true
    }
    
    const modifiers: string[] = []
    const eventModifiersCodes: string[] = []

    if (event.shiftKey) modifiers.push("<Shift>") && eventModifiersCodes.push('shiftKey')
    if (event.ctrlKey) modifiers.push("<Ctrl>") && eventModifiersCodes.push('ctrlKey')
    if (event.metaKey) modifiers.push("<Meta>") && eventModifiersCodes.push('metaKey')
    if (event.altKey) modifiers.push("<Alt>") && eventModifiersCodes.push('altKey')
    if (event.key === " ") modifiers.push("<Space>")

    let action: null | string = null;

    for (const key of Object.keys(shortCuts)) {
        if (event.key && shortCuts[key].keyPress === event.key.toLowerCase() && shortCuts[key].modifiers.every(modifier => event[modifier]) && eventModifiersCodes.every(modifier => shortCuts[key].modifiers.includes(modifier))) {
            action = key
            break
        }
    }

    if (!action) {
        return true
    }

    if (action === 'sphere_refine' && activeMap && !viewOnly) {
        const formatArgs = (chosenMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            return [chosenMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, "SPHERE", 4000]
        }
        showShortcutToast && enqueueSnackbar("Sphere refine", { variant: "info"})
        return doShortCut('refine_residues_using_atom_cid', formatArgs)
    }

    else if ((action === 'undo' || action === 'redo') && !viewOnly) {
        const selectedMolNo = commandCentre.current.history.lastModifiedMolNo()
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedMolNo)
        let promise: Promise<void>
        if(!selectedMolecule) {
            return true
        } else if (action === 'undo') {
            promise = selectedMolecule.undo()
        } else {
            promise = selectedMolecule.redo()
        }
        promise.then(_ => {
            dispatch( triggerUpdate(selectedMolecule.molNo) )
        })
        return false
    }

    else if (action === 'flip_peptide' && activeMap && !viewOnly) {
        const formatArgs = (chosenMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            return [chosenMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, '']
        }
        showShortcutToast && enqueueSnackbar("Flip peptide", { variant: "info"})
        return doShortCut('flipPeptide_cid', formatArgs)
    }

    else if (action === 'triple_refine' && activeMap && !viewOnly) {
        const formatArgs = (chosenMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            return [chosenMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, "TRIPLE", 4000]
        }
        showShortcutToast && enqueueSnackbar("Triple refine", { variant: "info"})
        return doShortCut('refine_residues_using_atom_cid', formatArgs)
    }

    else if (action === 'auto_fit_rotamer' && activeMap && !viewOnly) {
        const formatArgs = (chosenMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            return [
                chosenMolecule.molNo,
                chosenAtom.chain_id,
                chosenAtom.res_no,
                chosenAtom.ins_code,
                chosenAtom.alt_conf,
                activeMap.molNo
            ]
        }
        showShortcutToast && enqueueSnackbar("Auto fit rotamer", { variant: "info"})
        return doShortCut('auto_fit_rotamer', formatArgs)
    }

    else if (action === 'add_terminal_residue' && activeMap && !viewOnly) {
        const formatArgs = (chosenMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            return [chosenMolecule.molNo,  `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        }
        showShortcutToast && enqueueSnackbar("Add residue", { variant: "info"})
        return doShortCut('add_terminal_residue_directly_using_cid', formatArgs)
    }

    else if (action === 'delete_residue' && !viewOnly) {
        const formatArgs = (chosenMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            return [
                chosenMolecule.molNo, 
                `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, 
                'LITERAL'
            ]
        }
        showShortcutToast && enqueueSnackbar("Delete residue", { variant: "info"})
        return doShortCut('delete_using_cid', formatArgs)
    }

    else if (action === 'eigen_flip' && !viewOnly) {
        const formatArgs = (chosenMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            return [chosenMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        }
        showShortcutToast && enqueueSnackbar("Eigen flip", { variant: "info"})
        return doShortCut('eigen_flip_ligand', formatArgs)
    }

    else if (action === 'go_to_residue' && molecules.length > 0) {
        enqueueSnackbar("go-to-residue", {
            variant: "goToResidue",
            persist: true,
            glRef: glRef,
            commandCentre: commandCentre,
        })
    }

    else if (action === 'go_to_blob' && activeMap && !viewOnly) {
        showShortcutToast && enqueueSnackbar("Go to blob", { variant: "info"})
        const frontAndBack: [number[], number[], number, number] = getFrontAndBackPos()
        const goToBlobEvent = {
            back: [frontAndBack[0][0], frontAndBack[0][1], frontAndBack[0][2]],
            front: [frontAndBack[1][0], frontAndBack[1][1], frontAndBack[1][2]],
            windowX: frontAndBack[2],
            windowY: frontAndBack[3],
        };

        commandCentre.current.cootCommand({
            returnType: "float_array",
            command: "go_to_blob_array",
            commandArgs: [goToBlobEvent.front[0], goToBlobEvent.front[1], goToBlobEvent.front[2], goToBlobEvent.back[0], goToBlobEvent.back[1], goToBlobEvent.back[2], 0.5]
        }, false)
        .then(response => {
            const newOrigin = response.data.result.result;
            if (newOrigin.length === 3) {
                dispatch(setOrigin([-newOrigin[0], -newOrigin[1], -newOrigin[2]]))
            }
        })
    }

    else if (action === 'clear_labels') {
        dispatch(triggerClearLabels(true))
        molecules.forEach(molecule => molecule.clearBuffersOfStyle('residueSelection'))
        showShortcutToast && enqueueSnackbar("Clear labels", { variant: "info"})
    }

    else if (action === 'move_up') {
        const invQuat = quat4.create();
        quat4Inverse(myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const yshift = vec3Create([0, 4. / getDeviceScale(), 0]);
        vec3.transformMat4(yshift, yshift, theMatrix);
        const x = originState[0] + (yshift[0] / 8. * zoom)
        const y = originState[1] + (yshift[1] / 8. * zoom)
        const z = originState[2] + (yshift[2] / 8. * zoom)
        dispatch(setOrigin([x, y, z]))
    }

    else if (action === 'move_down') {
        const invQuat = quat4.create();
        quat4Inverse(myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const yshift = vec3Create([0, -4. / getDeviceScale(), 0]);
        vec3.transformMat4(yshift, yshift, theMatrix);
        const x = originState[0] + (yshift[0] / 8. * zoom);
        const y = originState[1] + (yshift[1] / 8. * zoom);
        const z = originState[2] + (yshift[2] / 8. * zoom);
        dispatch(setOrigin([x, y, z]))
    }

    else if (action === 'move_left') {
        const invQuat = quat4.create();
        quat4Inverse(myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const xshift = vec3Create([-4. / getDeviceScale(), 0, 0]);
        vec3.transformMat4(xshift, xshift, theMatrix);
        const x = originState[0] + (xshift[0] / 8. * zoom)
        const y = originState[1] + (xshift[1] / 8. * zoom)
        const z = originState[2] + (xshift[2] / 8. * zoom)
        dispatch(setOrigin([x, y, z]))
    }

    else if (action === 'move_right') {
        const invQuat = quat4.create();
        quat4Inverse(myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const xshift = vec3Create([4. / getDeviceScale(), 0, 0]);
        vec3.transformMat4(xshift, xshift, theMatrix);
        const x = originState[0] + (xshift[0] / 8. * zoom)
        const y = originState[1] + (xshift[1] / 8. * zoom)
        const z = originState[2] + (xshift[2] / 8. * zoom)
        dispatch(setOrigin([x, y, z]))
    }

    else if (action === 'restore_scene') {
        const newQuat = quat4.create()
        quat4.set(newQuat, 0, 0, 0, -1)
        dispatch(setZoom(1.0))
        dispatch(setQuat(newQuat))
        dispatch(triggerClearLabels(true))
    }

    else if (action === 'increase_map_radius' || action === 'decrease_map_radius') {
        if (activeMap) {
            dispatch( changeMapRadius({ molNo: activeMap.molNo, factor: action === 'increase_map_radius' ? 2 : -2 }) )
        }
    }

    else if (action === 'take_screenshot') {
        enqueueSnackbar("screenshot", {
            variant: "screenshot",
            persist: true,
            videoRecorderRef: videoRecorderRef 
        })
    }

    else if (action === 'show_shortcuts') {
        let showShortCutHelp: string[] = [];

        if(shortCutHelp.length===0){
            showShortCutHelp = Object.keys(shortCuts).filter(key => !viewOnly || shortCuts[key].viewOnly).map(key => {
                const modifiers = []
                if (shortCuts[key].modifiers.includes('shiftKey')) modifiers.push("<Shift>")
                if (shortCuts[key].modifiers.includes('ctrlKey')) modifiers.push("<Ctrl>")
                if (shortCuts[key].modifiers.includes('metaKey')) modifiers.push("<Meta>")
                if (shortCuts[key].modifiers.includes('altKey')) modifiers.push("<Alt>")
                if (shortCuts[key].keyPress === " ") modifiers.push("<Space>")
                return `${modifiers.join("-")} ${shortCuts[key].keyPress} ${shortCuts[key].label}`
            })
            showShortCutHelp.push(`<Shift><Alt> Translate View`)
            showShortCutHelp.push(`<Shift> Rotate View`)
            showShortCutHelp.push(`Double click go to blob`)
            showShortCutHelp.push(`<Ctrl><Scroll> Change active map contour lvl.`)
        } else  {
            showShortCutHelp = []
        }
        dispatch(setShortCutHelp(showShortCutHelp))
        showShortcutToast && enqueueSnackbar((showShortCutHelp.length>0) ? 'Show help' : 'Hide help', { variant: "info"})
        return false
    }

    else if (action === 'jump_next_residue' || action === 'jump_previous_residue') {
        getCentreAtom(molecules, commandCentre, glRef)
        .then(result => {
            if (!result) {
                return
            }
            const [selectedMolecule, residueCid] = result
            if (typeof selectedMolecule === 'undefined' || !residueCid) {
                return
            }

            const chosenAtom = cidToSpec(residueCid)
            const selectedSequence = selectedMolecule.sequences.find(sequence => sequence.chain === chosenAtom.chain_id)
            if (typeof selectedSequence === 'undefined') {
                return
            }
            
            let nextResNum: number
            const selectedResidueIndex = selectedSequence.sequence.findIndex(res => res.resNum === chosenAtom.res_no)
            if (selectedResidueIndex === -1) {
                return
            } else if (action === 'jump_next_residue' && selectedResidueIndex !== selectedSequence.sequence.length - 1) {
                nextResNum = selectedSequence.sequence[selectedResidueIndex + 1].resNum
            } else if (action === 'jump_previous_residue' && selectedResidueIndex !== 0) {
                nextResNum = selectedSequence.sequence[selectedResidueIndex - 1].resNum
            } else {
                return
            }
            selectedMolecule.centreAndAlignViewOn(`/*/${chosenAtom.chain_id}/${nextResNum}-${nextResNum}/`, true)
        })
        .catch(err => console.log(err))

    }

    else if (action === 'decrease_front_clip') {
        dispatch(setClipStart(clipStart-0.5))
        showShortcutToast && enqueueSnackbar("Front clip down", { variant: "info"})
        return false
    }

    else if (action === 'increase_front_clip') {
        dispatch(setClipStart(clipStart+0.5))
        showShortcutToast && enqueueSnackbar("Front clip up", { variant: "info"})
        return false
    }

    else if (action === 'decrease_back_clip') {
        dispatch(setClipEnd(clipEnd-0.5))
        showShortcutToast && enqueueSnackbar("Back clip down", { variant: "info"})
        return false
    }

    else if (action === 'increase_back_clip') {
        dispatch(setClipEnd(clipEnd+0.5))
        showShortcutToast && enqueueSnackbar("Back clip up", { variant: "info"})
        return false
    }
    else if (action === 'show_atom_info') {
        return doAtomInfo()
    }

    return true
}
