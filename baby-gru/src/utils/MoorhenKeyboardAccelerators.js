import { List, ListItem } from "@mui/material"
import { cidToSpec } from "./MoorhenUtils"
import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import { quatToMat4, quat4Inverse } from '../WebGLgComponents/quatToMat4.js';
import { getDeviceScale, vec3Create } from '../WebGLgComponents/mgWebGL';

const apresEdit = (molecule, glRef, timeCapsuleRef, setHoveredAtom) => {
    molecule.setAtomsDirty(true)
    molecule.redraw(glRef)
    setHoveredAtom({ molecule: null, cid: null })
    const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: glRef.current.origin,  modifiedMolecule: molecule.molNo} })
    document.dispatchEvent(scoresUpdateEvent)
    timeCapsuleRef.current.addModification()
}

export const babyGruKeyPress = (event, collectedProps, shortCuts) => {
    
    const { 
        setShowToast, setToastContent, hoveredAtom, 
        setHoveredAtom, commandCentre, activeMap, 
        glRef, molecules, timeCapsuleRef, viewOnly
    } = collectedProps;

    const getCentreAtom = async () => {
        const visibleMolecules = molecules.filter(molecule => molecule.isVisible && molecule.hasVisibleBuffers())
        if (visibleMolecules.length === 0) {
            return
        }
        const response = await commandCentre.current.cootCommand({
            returnType: "int_string_pair",
            command: "get_active_atom",
            commandArgs: [...glRef.current.origin.map(coord => coord * -1), visibleMolecules.map(molecule => molecule.molNo).join(':')]
        })
        const moleculeMolNo = response.data.result.result.first
        const residueCid = response.data.result.result.second
        const selectedMolecule = visibleMolecules.find(molecule => molecule.molNo === moleculeMolNo)
        return [selectedMolecule, residueCid]
    }
    
    const doShortCut = async (cootCommand, formatArgs) => {
        let chosenMolecule
        let chosenAtom
        let residueCid
        
        if (!collectedProps.shortcutOnHoveredAtom) {
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
            }, true).then(_ => {
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
    
    let modifiers = []
    let eventModifiersCodes = []

    if (event.shiftKey) modifiers.push("<Shift>") && eventModifiersCodes.push('shiftKey')
    if (event.ctrlKey) modifiers.push("<Ctrl>") && eventModifiersCodes.push('ctrlKey')
    if (event.metaKey) modifiers.push("<Meta>") && eventModifiersCodes.push('metaKey')
    if (event.altKey) modifiers.push("<Alt>") && eventModifiersCodes.push('altKey')
    if (event.key === " ") modifiers.push("<Space>")

    if (collectedProps.showShortcutToast && !viewOnly) {
        setToastContent(<h3>{`${modifiers.join("-")} ${event.key} pushed`}</h3>)
        setShowToast(true)    
    }
    
    let action = null;

    for (const key of Object.keys(shortCuts)) {
        if (shortCuts[key].keyPress === event.key.toLowerCase() && shortCuts[key].modifiers.every(modifier => event[modifier]) && eventModifiersCodes.every(modifier => shortCuts[key].modifiers.includes(modifier))) {
            action = key
            break
        }
    }

    if (!action) {
        return true
    }

    if (action === 'sphere_refine' && activeMap && !viewOnly) {
        const formatArgs = (chosenMolecule, chosenAtom) => {
            return [chosenMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, "SPHERE"]
        }
        setToastContent(
            <h3>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pushed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Sphere refine</ListItem>
                </List>
            </h3>
        )
        return doShortCut('refine_residues_using_atom_cid', formatArgs)
    }

    else if (action === 'flip_peptide' && activeMap && !viewOnly) {
        const formatArgs = (chosenMolecule, chosenAtom) => {
            return [chosenMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, '']
        }
        setToastContent(
            <h3>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pushed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Flip peptide</ListItem>
                </List>
            </h3>
        )
        return doShortCut('flipPeptide_cid', formatArgs)
    }

    else if (action === 'triple_refine' && activeMap && !viewOnly) {
        const formatArgs = (chosenMolecule, chosenAtom) => {
            return [chosenMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, "TRIPLE"]
        }
        setToastContent(
            <h3>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pushed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Triple refine</ListItem>
                </List>
            </h3>
        )
        return doShortCut('refine_residues_using_atom_cid', formatArgs)
    }

    else if (action === 'auto_fit_rotamer' && activeMap && !viewOnly) {
        const formatArgs = (chosenMolecule, chosenAtom) => {
            return [
                chosenMolecule.molNo,
                chosenAtom.chain_id,
                chosenAtom.res_no,
                chosenAtom.ins_code,
                chosenAtom.alt_conf,
                activeMap.molNo
            ]
        }
        setToastContent(
            <h3>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pushed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Auto fit rotamer</ListItem>
                </List>
            </h3>
        )
        return doShortCut('auto_fit_rotamer', formatArgs)
    }

    else if (action === 'add_terminal_residue' && activeMap && !viewOnly) {
        const formatArgs = (chosenMolecule, chosenAtom) => {
            return [chosenMolecule.molNo,  `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        }
        setToastContent(
            <h3>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pushed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Add residue</ListItem>
                </List>
            </h3>
        )
        return doShortCut('add_terminal_residue_directly_using_cid', formatArgs)
    }

    else if (action === 'delete_residue' && !viewOnly) {
        const formatArgs = (chosenMolecule, chosenAtom) => {
            return [
                chosenMolecule.molNo, 
                `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, 
                'LITERAL'
            ]
        }
        setToastContent(
            <h3>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pushed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Delete residue</ListItem>
                </List>
            </h3>
        )
        return doShortCut('delete_using_cid', formatArgs)
    }

    else if (action === 'eigen_flip' && !viewOnly) {
        const formatArgs = (chosenMolecule, chosenAtom) => {
            return [chosenMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        }
        setToastContent(
            <h3>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pushed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Eigen flip</ListItem>
                </List>
            </h3>
        )
        return doShortCut('eigen_flip_ligand', formatArgs)
    }

    else if (action === 'go_to_blob' && activeMap && !viewOnly) {
        setToastContent(
            <h3>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pushed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Go to blob</ListItem>
                </List>
            </h3>
        )
        const frontAndBack = glRef.current.getFrontAndBackPos(event);
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
        }).then(response => {
            let newOrigin = response.data.result.result;
            if (newOrigin.length === 3) {
                glRef.current.setOriginAnimated([-newOrigin[0], -newOrigin[1], -newOrigin[2]])
            }
        })
    }

    else if (action === 'clear_labels') {
        glRef.current.labelledAtoms = []
        glRef.current.measuredAtoms = []
        glRef.current.drawScene()
        setToastContent(
            <h3>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pushed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>Clear labels</ListItem>
                </List>
            </h3>
        )
    }

    else if (action === 'move_up') {
        const invQuat = quat4.create();
        quat4Inverse(glRef.current.myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const yshift = vec3Create([0, 4. / getDeviceScale(), 0]);
        vec3.transformMat4(yshift, yshift, theMatrix);
        glRef.current.origin[0] += yshift[0] / 8. * glRef.current.zoom;
        glRef.current.origin[1] += yshift[1] / 8. * glRef.current.zoom;
        glRef.current.origin[2] += yshift[2] / 8. * glRef.current.zoom;
        const scoresUpdateEvent = new CustomEvent("originUpdate", { detail: {origin: glRef.current.origin,  modifiedMolecule: null} })
        document.dispatchEvent(scoresUpdateEvent);    
        glRef.current.drawSceneDirty();
        glRef.current.reContourMaps();
    }

    else if (action === 'move_down') {
        const invQuat = quat4.create();
        quat4Inverse(glRef.current.myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const yshift = vec3Create([0, -4. / getDeviceScale(), 0]);
        vec3.transformMat4(yshift, yshift, theMatrix);
        glRef.current.origin[0] += yshift[0] / 8. * glRef.current.zoom;
        glRef.current.origin[1] += yshift[1] / 8. * glRef.current.zoom;
        glRef.current.origin[2] += yshift[2] / 8. * glRef.current.zoom;
        const scoresUpdateEvent = new CustomEvent("originUpdate", { detail: {origin: glRef.current.origin} })
        document.dispatchEvent(scoresUpdateEvent);    
        glRef.current.drawSceneDirty();
        glRef.current.reContourMaps();
    }

    else if (action === 'move_left') {
        const invQuat = quat4.create();
        quat4Inverse(glRef.current.myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const xshift = vec3Create([-4. / getDeviceScale(), 0, 0]);
        vec3.transformMat4(xshift, xshift, theMatrix);
        glRef.current.origin[0] += xshift[0] / 8. * glRef.current.zoom;
        glRef.current.origin[1] += xshift[1] / 8. * glRef.current.zoom;
        glRef.current.origin[2] += xshift[2] / 8. * glRef.current.zoom;
        const scoresUpdateEvent = new CustomEvent("originUpdate", { detail: {origin: glRef.current.origin} })
        document.dispatchEvent(scoresUpdateEvent);    
        glRef.current.drawSceneDirty();
        glRef.current.reContourMaps();
    }

    else if (action === 'move_right') {
        const invQuat = quat4.create();
        quat4Inverse(glRef.current.myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const xshift = vec3Create([4. / getDeviceScale(), 0, 0]);
        vec3.transformMat4(xshift, xshift, theMatrix);
        glRef.current.origin[0] += xshift[0] / 8. * glRef.current.zoom;
        glRef.current.origin[1] += xshift[1] / 8. * glRef.current.zoom;
        glRef.current.origin[2] += xshift[2] / 8. * glRef.current.zoom;
        const scoresUpdateEvent = new CustomEvent("originUpdate", { detail: {origin: glRef.current.origin} })
        document.dispatchEvent(scoresUpdateEvent);    
        glRef.current.drawSceneDirty();
        glRef.current.reContourMaps();
    }

    else if (action === 'restore_scene') {
        glRef.current.myQuat = quat4.create()
        quat4.set(glRef.current.myQuat, 0, 0, 0, -1)
        glRef.current.setZoom(1.0)
        glRef.current.labelledAtoms = []
        glRef.current.measuredAtoms = []
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
        const oldOrigin = [glRef.current.origin[0], glRef.current.origin[1], glRef.current.origin[2]];

        // Getting up and right for doing tiling (in future?)
        const invQuat = quat4.create();
        quat4Inverse(glRef.current.myQuat, invQuat);

        const invMat = quatToMat4(invQuat);

        const right = vec3.create();
        vec3.set(right, 1.0, 0.0, 0.0);
        const up = vec3.create();
        vec3.set(up, 0.0, 1.0, 0.0);

        vec3.transformMat4(up, up, invMat);
        vec3.transformMat4(right, right, invMat);


        let target_w;
        let target_h;
        let target_xoff;
        let target_yoff;

        const saveCanvas = document.createElement("canvas");

        const w = glRef.current.rttFramebuffer.width;
        const h = glRef.current.rttFramebuffer.height;
        let imgData;
        let pixels;
        let ctx;

        if(!glRef.current.WEBGL2){
            const mag = 1; //FIXME This doesn't work for mag>1

            const ncells_x = mag;
            const ncells_y = mag;
            saveCanvas.width = glRef.current.canvas.width * ncells_x;
            saveCanvas.height = glRef.current.canvas.height * ncells_y;
            ctx = saveCanvas.getContext("2d");

            let newZoom = glRef.current.zoom / ncells_x;
            glRef.current.setZoom(newZoom);

            const ratio = 1.0 * glRef.current.gl.viewportWidth / glRef.current.gl.viewportHeight;
            let jj = 0;
            for (let j = Math.floor(-ncells_y / 2); j < Math.floor(ncells_y / 2); j++) {
                let ii = 0;
                for (let i = Math.floor(-ncells_x / 2); i < Math.floor(ncells_x / 2); i++) {
                    const x_off = ratio * (2.0 * i + 1 + ncells_x % 2);
                    const y_off = (2.0 * j + 1 + ncells_y % 2);

                    glRef.current.origin = [oldOrigin[0], oldOrigin[1], oldOrigin[2]];
                    glRef.current.origin[0] += glRef.current.zoom * right[0] * 24.0 * x_off + glRef.current.zoom * up[0] * 24.0 * y_off;
                    glRef.current.origin[1] += glRef.current.zoom * right[1] * 24.0 * x_off + glRef.current.zoom * up[1] * 24.0 * y_off;
                    glRef.current.origin[2] += glRef.current.zoom * right[2] * 24.0 * x_off + glRef.current.zoom * up[2] * 24.0 * y_off;

                    glRef.current.save_pixel_data = true;
                    glRef.current.drawScene();
                    pixels = glRef.current.pixel_data;

                    imgData = ctx.createImageData(glRef.current.canvas.width, glRef.current.canvas.height);
                    const data = imgData.data;

                    for (let pixi = 0; pixi < glRef.current.canvas.height; pixi++) {
                        for (let pixj = 0; pixj < glRef.current.canvas.width * 4; pixj++) {
                            data[(glRef.current.canvas.height - pixi - 1) * glRef.current.canvas.width * 4 + pixj] = pixels[pixi * glRef.current.canvas.width * 4 + pixj];
                        }
                    }
                    ctx.putImageData(imgData, (ncells_x - ii - 1) * glRef.current.canvas.width, jj * glRef.current.canvas.height);
                    ii++;
                }
                jj++;
            }

            newZoom = glRef.current.zoom * ncells_x;
            glRef.current.setZoom(newZoom);

            glRef.current.origin = [oldOrigin[0], oldOrigin[1], oldOrigin[2]];
            glRef.current.save_pixel_data = false;
            glRef.current.drawScene();
            target_w = w;
            target_h = h;
            target_xoff = 0;
            target_yoff = 0;
        } else {

            glRef.current.renderToTexture = true;
            glRef.current.drawScene();
            const ratio = 1.0 * glRef.current.gl.viewportWidth / glRef.current.gl.viewportHeight;

            if(glRef.current.gl.viewportWidth>glRef.current.gl.viewportHeight){
                target_w = w;
                target_h = parseInt(h / ratio);
                target_xoff = 0;
                target_yoff = parseInt(0.5*glRef.current.rttFramebuffer.height - 0.5 / ratio * glRef.current.rttFramebuffer.height);
            } else {
                target_w = parseInt(w * ratio);
                target_h = h;
                target_xoff = parseInt(0.5*glRef.current.rttFramebuffer.width - 0.5 * ratio * glRef.current.rttFramebuffer.width);
                target_yoff = 0;
            }
            saveCanvas.width = target_w;
            saveCanvas.height = target_h;

            ctx = saveCanvas.getContext("2d");
            pixels = glRef.current.pixel_data;

            if(glRef.current.gl.viewportWidth>glRef.current.gl.viewportHeight){
                imgData = ctx.createImageData(saveCanvas.width,saveCanvas.height);
            } else {
                imgData = ctx.createImageData(saveCanvas.width,saveCanvas.height);
            }

            const data = imgData.data;
            for (let pixi = 0; pixi < saveCanvas.height; pixi++) {
                for (let pixj = 0; pixj < saveCanvas.width * 4; pixj++) {
                    data[(saveCanvas.height - pixi - 1) * saveCanvas.width * 4 + pixj] = pixels[(pixi+target_yoff) * w * 4 + pixj+target_xoff*4];
                }
            }
            ctx.putImageData(imgData, 0,0);
            glRef.current.renderToTexture = false;
        }


        let link = document.getElementById('download_image_link');
        if (!link) {
            link = document.createElement('a');
            link.id = 'download_image_link';
            link.download = 'moorhen.png';
            document.body.appendChild(link);
        }
        link.href = saveCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        link.click();
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
            glRef.current.showShortCutHelp.push(`Use right click to set background color`)
            glRef.current.drawScene()
        } else  {
            glRef.current.showShortCutHelp = null
            glRef.current.drawScene()
        }
        setToastContent(
            <h3>
                <List>
                    <ListItem style={{justifyContent: 'center'}}>{`${modifiers.join("-")} ${event.key} pushed`}</ListItem>
                    <ListItem style={{justifyContent: 'center'}}>{glRef.current.showShortCutHelp ? 'Show help' : 'Hide help'}</ListItem>
                </List>
            </h3>
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
            
            let nextResNum
            const selectedResidueIndex = selectedSequence.sequence.findIndex(res => res.resNum === parseInt(chosenAtom.res_no))
            if (selectedResidueIndex === -1) {
                return
            } else if (action === 'jump_next_residue' && selectedResidueIndex !== selectedSequence.sequence.length - 1) {
                nextResNum = selectedSequence.sequence[selectedResidueIndex + 1].resNum
            } else if (action === 'jump_previous_residue' && selectedResidueIndex !== 0) {
                nextResNum = selectedSequence.sequence[selectedResidueIndex - 1].resNum
            } else {
                return
            }
            selectedMolecule.centreAndAlignViewOn(glRef, `/*/${chosenAtom.chain_id}/${nextResNum}-${nextResNum}/`)
        })
        .catch(err => console.log(err))

    }

    return true

}
