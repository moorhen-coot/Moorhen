import { List, ListItem } from "@mui/material"
import { cidToSpec, guid } from "./MoorhenUtils"
import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import { quatToMat4, quat4Inverse } from '../WebGLgComponents/quatToMat4.js';
import { getDeviceScale, vec3Create } from '../WebGLgComponents/mgWebGL';
import { moorhen } from "../types/moorhen";
import { webGL } from "../types/mgWebGL";
import { libcootApi } from "../types/libcoot";
import { MoorhenNotification } from "../components/misc/MoorhenNotification";

const apresEdit = (molecule: moorhen.Molecule, glRef: React.RefObject<webGL.MGWebGL>, timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>, setHoveredAtom: (arg0: moorhen.HoveredAtom) => void) => {
    molecule.setAtomsDirty(true)
    molecule.redraw()
    setHoveredAtom({ molecule: null, cid: null })
    const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: glRef.current.origin,  modifiedMolecule: molecule.molNo} })
    document.dispatchEvent(scoresUpdateEvent)
}

export const babyGruKeyPress = (
    event: KeyboardEvent, 
    collectedProps: {
        isDark: boolean;
        setNotificationContent: (arg: JSX.Element) => void;
        hoveredAtom: moorhen.HoveredAtom;
        setHoveredAtom: (arg: moorhen.HoveredAtom) => void;
        commandCentre: React.RefObject<moorhen.CommandCentre>;
        activeMap: moorhen.Map;
        molecules: moorhen.Molecule[];
        timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
        glRef: React.RefObject<webGL.MGWebGL>;
        viewOnly: boolean;
        windowWidth: number;
        videoRecorderRef: React.RefObject<moorhen.ScreenRecorder>;
    }, 
    shortCuts: {[key: string]: moorhen.Shortcut}, 
    showShortcutToast: boolean, 
    shortcutOnHoveredAtom: boolean
): boolean | Promise<boolean> => {
    
    const { 
        setNotificationContent, hoveredAtom, setHoveredAtom, commandCentre, activeMap, 
        glRef, molecules, timeCapsuleRef, viewOnly, videoRecorderRef, isDark, windowWidth
    } = collectedProps;

    const getCentreAtom = async (): Promise<[moorhen.Molecule, string]> => {
        const visibleMolecules: moorhen.Molecule[] = molecules.filter((molecule: moorhen.Molecule) => molecule.isVisible && molecule.hasVisibleBuffers())
        if (visibleMolecules.length === 0) {
            return
        }
        const response = await commandCentre.current.cootCommand({
            returnType: "int_string_pair",
            command: "get_active_atom",
            commandArgs: [...glRef.current.origin.map(coord => coord * -1), visibleMolecules.map(molecule => molecule.molNo).join(':')]
        }, false) as moorhen.WorkerResponse<libcootApi.PairType<number, string>>
        const moleculeMolNo: number = response.data.result.result.first
        const residueCid: string = response.data.result.result.second
        const selectedMolecule = visibleMolecules.find((molecule: moorhen.Molecule) => molecule.molNo === moleculeMolNo)
        return [selectedMolecule, residueCid]
    }
    
    const doShortCut = async (cootCommand: string, formatArgs: (arg0: moorhen.Molecule, arg1: moorhen.ResidueSpec) => any[]): Promise<boolean> => {
        let chosenMolecule: moorhen.Molecule
        let chosenAtom: moorhen.ResidueSpec
        let residueCid: string
        
        if (!shortcutOnHoveredAtom) {
            [chosenMolecule, residueCid] = await getCentreAtom()
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
                apresEdit(chosenMolecule, glRef, timeCapsuleRef, setHoveredAtom)
            })
            .then(_ => false)
            .catch(err => {
                console.log(err)
                return true
            })
        }
        return true
    }
    
    let modifiers: string[] = []
    let eventModifiersCodes: string[] = []

    if (event.shiftKey) modifiers.push("<Shift>") && eventModifiersCodes.push('shiftKey')
    if (event.ctrlKey) modifiers.push("<Ctrl>") && eventModifiersCodes.push('ctrlKey')
    if (event.metaKey) modifiers.push("<Meta>") && eventModifiersCodes.push('metaKey')
    if (event.altKey) modifiers.push("<Alt>") && eventModifiersCodes.push('altKey')
    if (event.key === " ") modifiers.push("<Space>")

    if (showShortcutToast && !viewOnly) {
        setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
                <h5 style={{margin: 0}}>{`${modifiers.join("-")} ${event.key} pressed`}</h5>
            </MoorhenNotification>
        )
    }
    
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
        showShortcutToast && setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Sphere refine</ListItem>
                </List>
            </h5>
            </MoorhenNotification>
        )
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
            const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", {
                detail: { origin: glRef.current.origin, modifiedMolecule: selectedMolecule.molNo } 
            })
            document.dispatchEvent(scoresUpdateEvent)        
        })
        return false
    }

    else if (action === 'flip_peptide' && activeMap && !viewOnly) {
        const formatArgs = (chosenMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            return [chosenMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, '']
        }
        showShortcutToast && setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Flip peptide</ListItem>
                </List>
            </h5>
            </MoorhenNotification>
        )
        return doShortCut('flipPeptide_cid', formatArgs)
    }

    else if (action === 'triple_refine' && activeMap && !viewOnly) {
        const formatArgs = (chosenMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            return [chosenMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, "TRIPLE", 4000]
        }
        showShortcutToast && setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Triple refine</ListItem>
                </List>
            </h5>
            </MoorhenNotification>
        )
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
        showShortcutToast && setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Auto fit rotamer</ListItem>
                </List>
            </h5>
            </MoorhenNotification>
        )
        return doShortCut('auto_fit_rotamer', formatArgs)
    }

    else if (action === 'add_terminal_residue' && activeMap && !viewOnly) {
        const formatArgs = (chosenMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            return [chosenMolecule.molNo,  `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        }
        showShortcutToast && setNotificationContent(
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Add residue</ListItem>
                </List>
            </h5>
        )
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
        showShortcutToast && setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Delete residue</ListItem>
                </List>
            </h5>
            </MoorhenNotification>
        )
        return doShortCut('delete_using_cid', formatArgs)
    }

    else if (action === 'eigen_flip' && !viewOnly) {
        const formatArgs = (chosenMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            return [chosenMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        }
        showShortcutToast && setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Eigen flip</ListItem>
                </List>
            </h5>
            </MoorhenNotification>
        )
        return doShortCut('eigen_flip_ligand', formatArgs)
    }

    else if (action === 'go_to_blob' && activeMap && !viewOnly) {
        showShortcutToast && setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Go to blob</ListItem>
                </List>
            </h5>
            </MoorhenNotification>
        )
        const frontAndBack: [number[], number[], number, number] = glRef.current.getFrontAndBackPos(event);
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
            let newOrigin = response.data.result.result;
            if (newOrigin.length === 3) {
                glRef.current.setOriginAnimated([-newOrigin[0], -newOrigin[1], -newOrigin[2]])
            }
        })
    }

    else if (action === 'clear_labels') {
        glRef.current.labelledAtoms = []
        glRef.current.measuredAtoms = []
        glRef.current.clearMeasureCylinderBuffers()
        glRef.current.drawScene()
        showShortcutToast && setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Clear labels</ListItem>
                </List>
            </h5>
            </MoorhenNotification>
        )
    }

    else if (action === 'move_up') {
        const invQuat = quat4.create();
        quat4Inverse(glRef.current.myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const yshift = vec3Create([0, 4. / getDeviceScale(), 0]);
        vec3.transformMat4(yshift, yshift, theMatrix);
        const x = glRef.current.origin[0] + (yshift[0] / 8. * glRef.current.zoom)
        const y = glRef.current.origin[1] + (yshift[1] / 8. * glRef.current.zoom)
        const z = glRef.current.origin[2] + (yshift[2] / 8. * glRef.current.zoom)
        glRef.current.setOrigin([x, y, z], true, true)
    }

    else if (action === 'move_down') {
        const invQuat = quat4.create();
        quat4Inverse(glRef.current.myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const yshift = vec3Create([0, -4. / getDeviceScale(), 0]);
        vec3.transformMat4(yshift, yshift, theMatrix);
        const x = glRef.current.origin[0] + (yshift[0] / 8. * glRef.current.zoom);
        const y = glRef.current.origin[1] + (yshift[1] / 8. * glRef.current.zoom);
        const z = glRef.current.origin[2] + (yshift[2] / 8. * glRef.current.zoom);
        glRef.current.setOrigin([x, y, z], true, true)
    }

    else if (action === 'move_left') {
        const invQuat = quat4.create();
        quat4Inverse(glRef.current.myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const xshift = vec3Create([-4. / getDeviceScale(), 0, 0]);
        vec3.transformMat4(xshift, xshift, theMatrix);
        const x = glRef.current.origin[0] + (xshift[0] / 8. * glRef.current.zoom)
        const y = glRef.current.origin[1] + (xshift[1] / 8. * glRef.current.zoom)
        const z = glRef.current.origin[2] + (xshift[2] / 8. * glRef.current.zoom)
        glRef.current.setOrigin([x, y, z], true, true)
    }

    else if (action === 'move_right') {
        const invQuat = quat4.create();
        quat4Inverse(glRef.current.myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const xshift = vec3Create([4. / getDeviceScale(), 0, 0]);
        vec3.transformMat4(xshift, xshift, theMatrix);
        const x = glRef.current.origin[0] + (xshift[0] / 8. * glRef.current.zoom)
        const y = glRef.current.origin[1] + (xshift[1] / 8. * glRef.current.zoom)
        const z = glRef.current.origin[2] + (xshift[2] / 8. * glRef.current.zoom)
        glRef.current.setOrigin([x, y, z], true, true)
    }

    else if (action === 'restore_scene') {
        glRef.current.myQuat = quat4.create()
        quat4.set(glRef.current.myQuat, 0, 0, 0, -1)
        glRef.current.setZoom(1.0)
        glRef.current.labelledAtoms = []
        glRef.current.measuredAtoms = []
        glRef.current.clearMeasureCylinderBuffers()
        glRef.current.drawScene()
    }

    else if (action === 'increase_map_radius' || action === 'decrease_map_radius') {
        if (activeMap) {
            const mapRadiusChanged = new CustomEvent("mapRadiusChanged", {
                "detail": {
                    factor: action === 'increase_map_radius' ? 2 : -2,
                }
            })
            document.dispatchEvent(mapRadiusChanged)
        }
    }

    else if (action === 'take_screenshot') {
        videoRecorderRef.current?.takeScreenShot("moorhen.png")
    }

    else if (action === 'show_shortcuts') {
        if (!glRef.current.showShortCutHelp) {
            glRef.current.showShortCutHelp = Object.keys(shortCuts).filter(key => !viewOnly || shortCuts[key].viewOnly).map(key => {
                let modifiers = []
                if (shortCuts[key].modifiers.includes('shiftKey')) modifiers.push("<Shift>")
                if (shortCuts[key].modifiers.includes('ctrlKey')) modifiers.push("<Ctrl>")
                if (shortCuts[key].modifiers.includes('metaKey')) modifiers.push("<Meta>")
                if (shortCuts[key].modifiers.includes('altKey')) modifiers.push("<Alt>")
                if (shortCuts[key].keyPress === " ") modifiers.push("<Space>")
                return `${modifiers.join("-")} ${shortCuts[key].keyPress} ${shortCuts[key].label}`
            })
            glRef.current.showShortCutHelp.push(`<Shift><Alt> Translate View`)
            glRef.current.showShortCutHelp.push(`<Shift> Rotate View`)
            glRef.current.showShortCutHelp.push(`Double click go to blob`)
            glRef.current.drawScene()
        } else  {
            glRef.current.showShortCutHelp = null
            glRef.current.drawScene()
        }
        showShortcutToast && setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>{glRef.current.showShortCutHelp ? 'Show help' : 'Hide help'}</ListItem>
                </List>
            </h5>
            </MoorhenNotification>
        )
        return false
    }

    else if (action === 'jump_next_residue' || action === 'jump_previous_residue') {
        getCentreAtom()
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
            selectedMolecule.centreAndAlignViewOn(`/*/${chosenAtom.chain_id}/${nextResNum}-${nextResNum}/`)
        })
        .catch(err => console.log(err))

    }

    else if (action === 'decrease_front_clip') {
        glRef.current.gl_clipPlane0[3] = glRef.current.gl_clipPlane0[3] - 0.5
        glRef.current.drawScene()
        showShortcutToast && setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Front Clip -</ListItem>
                </List>
            </h5>
            </MoorhenNotification>
        )
        return false
    }

    else if (action === 'increase_front_clip') {
        glRef.current.gl_clipPlane0[3] = glRef.current.gl_clipPlane0[3] + 0.5
        glRef.current.drawScene()
        showShortcutToast && setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Front Clip +</ListItem>
                </List>
            </h5>
            </MoorhenNotification>
        )
        return false
    }

    else if (action === 'decrease_back_clip') {
        glRef.current.gl_clipPlane1[3] = glRef.current.gl_clipPlane1[3] - 0.5
        glRef.current.drawScene()
        showShortcutToast && setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Back Clip -</ListItem>
                </List>
            </h5>
            </MoorhenNotification>
        )
        return false
    }

    else if (action === 'increase_back_clip') {
        glRef.current.gl_clipPlane1[3] = glRef.current.gl_clipPlane1[3] + 0.5
        glRef.current.drawScene()
        showShortcutToast && setNotificationContent(
            <MoorhenNotification key={guid()} hideDelay={5000}>
            <h5 style={{margin: 0}}>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pressed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Back Clip +</ListItem>
                </List>
            </h5>
            </MoorhenNotification>
        )
        return false
    }

    return true

}
