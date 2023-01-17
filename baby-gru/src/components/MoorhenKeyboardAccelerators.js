import { List, ListItem } from "@mui/material"
import { cidToSpec } from "../utils/MoorhenUtils"
import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import { quatToMat4, quat4Inverse } from '../WebGL/quatToMat4.js';
import { getDeviceScale, vec3Create } from '../WebGL/mgWebGL';

const apresEdit = (molecule, glRef, setHoveredAtom) => {
    molecule.setAtomsDirty(true)
    molecule.redraw(glRef)
    setHoveredAtom({ molecule: null, cid: null })
    const originChangedEvent = new CustomEvent("originChanged", { "detail": glRef.current.origin })
    document.dispatchEvent(originChangedEvent)
}

export const babyGruKeyPress = (event, collectedProps, shortCuts) => {
    console.log(event)
    let modifiers = []

    if (event.shiftKey) modifiers.push("<Shift>")
    if (event.ctrlKey) modifiers.push("<Ctrl>")
    if (event.metaKey) modifiers.push("<Meta>")
    if (event.altKey) modifiers.push("<Alt>")

    const { setShowToast, setToastContent, hoveredAtom, setHoveredAtom, commandCentre, activeMap, glRef } = collectedProps;

    if (collectedProps.showShortcutToast) {
        setToastContent(<h3>{`${modifiers.join("-")} ${event.key} pushed`}</h3>)
        setShowToast(true)    
    }
    
    let action = null;

    for (const key of Object.keys(shortCuts)) {
        if (shortCuts[key].keyPress === event.key.toLowerCase() && shortCuts[key].modifiers.every(modifier => event[modifier])) {
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
            changesMolecules: [hoveredAtom.molecule.molNo]
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
            changesMolecules: [hoveredAtom.molecule.molNo]
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    else if (action === 'triple_refine' && activeMap && hoveredAtom.molecule) {
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [
            `${hoveredAtom.molecule.molNo}`,
            `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
            "TRIPLE"]
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "refine_residues_using_atom_cid",
            commandArgs: commandArgs,
            changesMolecules: [hoveredAtom.molecule.molNo]
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    else if (action === 'auto_fit_rotamer' && activeMap && hoveredAtom.molecule) {
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
            changesMolecules: [hoveredAtom.molecule.molNo]
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    else if (action === 'add_terminal_residue' && activeMap && hoveredAtom.molecule) {
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [
            hoveredAtom.molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "add_terminal_residue_directly_using_cid",
            commandArgs: commandArgs,
            changesMolecules: [hoveredAtom.molecule.molNo]
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    else if (action === 'delete_residue' && hoveredAtom.molecule) {


        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [hoveredAtom.molecule.molNo,
        `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`,
            'LITERAL']
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "delete_using_cid",
            commandArgs: commandArgs,
            changesMolecules: [hoveredAtom.molecule.molNo]
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    else if (action === 'eigen_flip' && hoveredAtom.molecule) {
        const chosenAtom = cidToSpec(hoveredAtom.cid)
        const commandArgs = [hoveredAtom.molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        commandCentre.current.cootCommand({
            returnType: "status",
            command: "eigen_flip_ligand",
            commandArgs: commandArgs,
            changesMolecules: [hoveredAtom.molecule.molNo]
        }, true).then(_ => {
            apresEdit(hoveredAtom.molecule, glRef, setHoveredAtom)
        })
        return false
    }

    else if (action === 'go_to_blob' && activeMap) {

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
                glRef.current.setOrigin([-newOrigin[0], -newOrigin[1], -newOrigin[2]])
            }
        })
    }

    else if (action === 'clear_labels') {
        glRef.current.clickedAtoms = [];
        glRef.current.drawScene();
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
        const originChangeEvent = new CustomEvent("originChange", { "detail": glRef.current.origin });
        document.dispatchEvent(originChangeEvent);
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
        const originChangeEvent = new CustomEvent("originChange", { "detail": glRef.current.origin });
        document.dispatchEvent(originChangeEvent);
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
        const originChangeEvent = new CustomEvent("originChange", { "detail": glRef.current.origin });
        document.dispatchEvent(originChangeEvent);
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
        const originChangeEvent = new CustomEvent("originChange", { "detail": glRef.current.origin });
        document.dispatchEvent(originChangeEvent);
        glRef.current.drawSceneDirty();
        glRef.current.reContourMaps();
    }

    else if (action === 'restore_scene') {
        glRef.current.myQuat = quat4.create()
        quat4.set(glRef.current.myQuat, 0, 0, 0, -1)
        glRef.current.setZoom(1.0)
        glRef.current.clickedAtoms = []
        glRef.current.drawScene()
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

        const mag = 1;

        const ncells_x = mag;
        const ncells_y = mag;

        const saveCanvas = document.createElement("canvas");
        saveCanvas.width = glRef.current.canvas.width * ncells_x;
        saveCanvas.height = glRef.current.canvas.height * ncells_y;
        const ctx = saveCanvas.getContext("2d");

        let newZoom = glRef.current.zoom / ncells_x
        glRef.current.setZoom(newZoom)

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
                const pixels = glRef.current.pixel_data;

                const imgData = ctx.createImageData(glRef.current.canvas.width, glRef.current.canvas.height);
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

        newZoom = glRef.current.zoom * ncells_x
        glRef.current.setZoom(newZoom)

        glRef.current.origin = [oldOrigin[0], oldOrigin[1], oldOrigin[2]];
        glRef.current.save_pixel_data = false;
        glRef.current.drawScene();

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
        setToastContent(<h4><List>
            {Object.keys(shortCuts).map(key => {
                let modifiers = []
                if (shortCuts[key].modifiers.includes('shiftKey')) modifiers.push("<Shift>")
                if (shortCuts[key].modifiers.includes('ctrlKey')) modifiers.push("<Ctrl>")
                if (shortCuts[key].modifiers.includes('metaKey')) modifiers.push("<Meta>")
                if (shortCuts[key].modifiers.includes('altKey')) modifiers.push("<Alt>")
                return <ListItem>{`${modifiers.join("-")} ${shortCuts[key].keyPress} ${shortCuts[key].label}`}</ListItem>
            })}
        </List></h4>)
        setShowToast(true)
        return false
    }

    return true

}
