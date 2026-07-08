import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import * as mat4 from 'gl-matrix/mat4';
import { quatToMat4, quat4Inverse } from './quatToMat4.js';
import { createQuatFromDXAngle, createQuatFromAngle, createZQuatFromDX } from './quatUtils';
import { parseAtomInfoLabel } from '../utils/utils';
import { getDeviceScale } from './webGLUtils';
import { getOffsetRect, MGWebGL } from './mgWebGL';
import type { moorhen } from '../types/moorhen';
import { webGL } from '../types/mgWebGL';

/**
 * Pointer / keyboard event handlers for the MGWebGL canvas. These were methods
 * on MGWebGL and are already written in "collaborator" style — each takes the
 * live instance as an explicit `self`/`event` pair and is registered on the
 * canvas as `self.doMouseDown(evt, self)` etc. Moving them here (following the
 * viewTransforms/framebuffers pattern) keeps all of the interaction state and
 * the helper methods they call (getAtomFomMouseXY, updateLabels, drawScene,
 * getThreeWayMatrixAndViewPort, …) on the instance, reached through `self`.
 *
 * This is the natural seam a future gesture-recognizer library would sit above:
 * it would consume normalized input and call these as the action verbs.
 *
 * The class methods on MGWebGL become thin delegators. `self` is the live
 * instance (type-only-ish import; getOffsetRect is a real runtime import).
 */

export function doRightClick(self: MGWebGL, event) {
    const displayBuffers = self.store.getState().glRef.displayBuffers
    if (self.activeMolecule === null) {

        const [minidx, minj, mindist, minsym, minx, miny, minz] = self.getAtomFomMouseXY(event, self);
        const rightClick: moorhen.AtomRightClickEvent = new CustomEvent("rightClick", {
        "detail": {
            atom: minidx > -1 ? displayBuffers[minidx].atoms[minj] : null,
            buffer: minidx > -1 ? displayBuffers[minidx] : null,
            coords: "",
            pageX: event.pageX,
            pageY: event.pageY,
        }
        });
        document.dispatchEvent(rightClick);
    }
}

export function doClick(self: MGWebGL, event) {
    const displayBuffers = self.store.getState().glRef.displayBuffers
    if (self.activeMolecule == null) {
        document.body.click()
    }

    if (!self.mouseMoved) {
        let updateLabels = false
        //console.log(npass+" "+npass0+" "+npass1+" "+ntest);
        const [minidx, minj, mindist, minsym, minx, miny, minz] = self.getAtomFomMouseXY(event, self);
        if (minidx > -1) {
            const atomLabel = parseAtomInfoLabel(displayBuffers[minidx].atoms[minj]);
            const theAtom : webGL.clickAtom = {
               ...displayBuffers[minidx].atoms[minj],
               label: atomLabel,
               displayBuffer: displayBuffers[minidx]
            };
            const atomClicked: moorhen.AtomClickedEvent = new CustomEvent("atomClicked", {
                "detail": {
                    atom: displayBuffers[minidx].atoms[minj],
                    buffer: displayBuffers[minidx],
                    isResidueSelection: !!self.keysDown['residue_selection'],
                    label: atomLabel
                }
            });
            document.dispatchEvent(atomClicked);
            if (self.draggableMolecule != null && self.draggableMolecule.representations.length > 0 && self.draggableMolecule.buffersInclude(displayBuffers[minidx])) {
                self.currentlyDraggedAtom = { atom: displayBuffers[minidx].atoms[minj], buffer: displayBuffers[minidx] }
            }
            if (self.keysDown['label_atom']) {
                if(self.drawEnvBOcc) {
                    theAtom.label = displayBuffers[minidx].atoms[minj].tempFactor.toFixed(2) + " " + displayBuffers[minidx].atoms[minj].occupancy.toFixed(2) + " " + atomLabel
                }
                updateLabels = true
                if (self.labelledAtoms.length === 0 || (self.labelledAtoms[self.labelledAtoms.length - 1].length > 1)) {
                    self.labelledAtoms.push([]);
                }
                self.labelledAtoms[self.labelledAtoms.length - 1].push(theAtom);
            } else if (self.keysDown['measure_distances']) {
                updateLabels = true
                if (self.measuredAtoms.length === 0) {
                    self.measuredAtoms.push([]);
                }
                self.measuredAtoms[self.measuredAtoms.length - 1].push(theAtom);
            }
        }
        if(updateLabels) self.updateLabels()
    }

    self.drawScene();
}

export function doHover(self: MGWebGL, event) {

    if (self.hoverDebounceTimeout) {
        clearTimeout(self.hoverDebounceTimeout);
    }

    self.hoverDebounceTimeout = setTimeout(() => {
        const displayBuffers = self.store.getState().glRef.displayBuffers
        if (self.props.onAtomHovered) {
            const [minidx, minj, mindist, minsym, minx, miny, minz] = self.getAtomFomMouseXY(event, self);
            if (minidx > -1) {
                self.props.onAtomHovered({ atom: displayBuffers[minidx].atoms[minj], buffer: displayBuffers[minidx] });
            }
            else {
                self.props.onAtomHovered(null)
            }
            self.drawScene();
        }
        self.hoverDebounceTimeout = null;
    }, 15);
}

export function doWheel(self: MGWebGL, event) {
    let factor;
    if (event.deltaY > 0) {
        factor = 1. + 1 / (50.0 - self.props.zoomWheelSensitivityFactor * 5);
    } else {
        factor = 1. - 1 / (50.0 - self.props.zoomWheelSensitivityFactor * 5);
    }

    if (self.keysDown['set_map_contour']) {
        self.setWheelContour(factor, true)
    } else {
        let newZoom = self.zoom * factor;
        if (newZoom < .01) {
            newZoom = 0.01;
        }
        self.setZoom(newZoom, true)
    }

}

export function doMouseUpMeasure(self: MGWebGL, evt) {

    const measure_click_tol = 1.0;

    const xy = self.getMouseXYGL(evt, self.canvas);
    const dist_du_sq = (self.measureDownPos.x - xy.x) * (self.measureDownPos.x - xy.x) + (self.measureDownPos.y - xy.y) * (self.measureDownPos.y - xy.y)

    if(dist_du_sq > 2 && !self.measureHit)
        return;

    const is_close = self.measurePointsArray.some(point => {
        const dist_sq = (point.x - xy.x) * (point.x - xy.x) + (point.y - xy.y) * (point.y - xy.y)
        if(dist_sq < measure_click_tol){
            self.measureHit = point;
            return true;
        }
    })

    if(!is_close && !evt.altKey)
        self.measurePointsArray.push(xy);

    if(evt.altKey && is_close){
        const index = self.measurePointsArray.indexOf(self.measureHit);
        if (index > -1) {
            self.measurePointsArray.splice(index, 1);
        }
    }

    self.measureHit = null;
    self.measureButton = -1;
    self.drawScene();

}

export function doMouseDownMeasure(self: MGWebGL, evt) {

    if(self.doThreeWayView || self.doCrossEyedStereo || self.doSideBySideStereo){
        return
    }

    const measure_click_tol = 1.0;

    const xy = self.getMouseXYGL(evt, self.canvas);
    self.measureHit = null;
    self.measurePointsArray.some(point => {
        const dist_sq = (point.x - xy.x) * (point.x - xy.x) + (point.y - xy.y) * (point.y - xy.y);
        if(dist_sq < measure_click_tol){
            self.measureHit = point;
            return true;
        }
    })

    self.measureButton = evt.button;
    self.measureDownPos.x = xy.x;
    self.measureDownPos.y = xy.y;

}

export function doMouseMoveMeasure(self: MGWebGL, evt) {
    if(self.measureButton > -1 && self.measureHit){
        const xy = self.getMouseXYGL(evt, self.canvas);
        self.measureHit.x = xy.x;
        self.measureHit.y = xy.y;
        self.drawScene();
    }
}

export function doMouseUp(self: MGWebGL, event) {
    const displayBuffers = self.store.getState().glRef.displayBuffers
    const event_x = event.pageX;
    const event_y = event.pageY;
    self.init_y = event.pageY;
    self.currentlyDraggedAtom = null
    if (event.which === 2) {
        event.preventDefault();
    }
    if (self.keysDown['center_atom'] || event.which === 2) {
        if(Math.abs(event_x - self.mouseDown_x) < 5 && Math.abs(event_y - self.mouseDown_y) < 5){
            if(displayBuffers.length > 0){
                const [minidx, minj, mindist, minsym, minx, miny, minz] = self.getAtomFomMouseXY(event, self);
                if(displayBuffers[minidx] && displayBuffers[minidx].atoms) {
                    const atx = displayBuffers[minidx].atoms[minj].x;
                    const aty = displayBuffers[minidx].atoms[minj].y;
                    const atz = displayBuffers[minidx].atoms[minj].z;
                    if(minsym > -1){
                        //self.setOriginAnimated([-minx, -miny, -minz], true);
                        self.props.onOriginChanged([-minx, -miny, -minz])
                    } else {
                        //self.setOriginAnimated([-atx, -aty, -atz], true);
                        self.props.onOriginChanged([-atx, -aty, -atz])
                    }
                }
            }
        } else if (self.reContourMapOnlyOnMouseUp) {
            self.handleOriginUpdated(true)
        }
    } else if (event.altKey && event.shiftKey && self.reContourMapOnlyOnMouseUp) {
        self.handleOriginUpdated(true)
    }
    self.mouseDown = false;
    self.doHover(event, self);
}

export function doMiddleClick(self: MGWebGL, evt) {
    const goToAtomEvent = new CustomEvent("goToAtomMiddleClick");
    document.dispatchEvent(goToAtomEvent);
}

export function doDoubleClick(self: MGWebGL, event) {
    const frontAndBack = self.getFrontAndBackPos(event);
    const goToBlobEvent = new CustomEvent("goToBlobDoubleClick", {
        "detail": {
            back: [frontAndBack[0][0], frontAndBack[0][1], frontAndBack[0][2]],
            front: [frontAndBack[1][0], frontAndBack[1][1], frontAndBack[1][2]],
            windowX: frontAndBack[2],
            windowY: frontAndBack[3],
            key: 'G'
        }
    });
    document.dispatchEvent(goToBlobEvent);
}

export function doMouseMove(self: MGWebGL, event) {
    const activeMoleculeMotion = (self.activeMolecule != null) && (self.activeMolecule.representations.length > 0) && !self.keysDown['residue_camera_wiggle'];

    const centreOfMass = function (atoms) {
        let totX = 0.0;
        let totY = 0.0;
        let totZ = 0.0;
        if (atoms.length > 0) {
            for (let iat = 0; iat < atoms.length; iat++) {
                totX += atoms[iat].x;
                totY += atoms[iat].y;
                totZ += atoms[iat].z;
            }
            totX /= atoms.length;
            totY /= atoms.length;
            totZ /= atoms.length;
        }
        return [totX, totY, totZ];
    }

    self.mouseMoved = true;

    self.cancelMouseTrack = true;
    if(self.trackMouse)
        requestAnimationFrame(self.mouseMoveAnimateTrack.bind(self, true, 20))

    if (true) {
        let x;
        let y;
        const e = event;
        if (e.pageX || e.pageY) {
            x = e.pageX;
            y = e.pageY;
        }
        else {
            x = e.clientX;
            y = e.clientY;
        }

        const c = self.canvasRef.current;
        const offset = getOffsetRect(c);

        x -= offset.left;
        y -= offset.top;
        x *= getDeviceScale();
        y *= getDeviceScale();

        self.gl_cursorPos[0] = x;
        self.gl_cursorPos[1] = self.canvas.height - y;
        self.props.cursorPositionChanged(x/getDeviceScale(), y/getDeviceScale()) //I am updating this in real window coords
    }
    if (!self.mouseDown) {
        self.init_x = event.pageX;
        self.init_y = event.pageY;
        self.doHover(event, self);
        return;
    }
    self.dx = (event.pageX - self.init_x) * self.props.mouseSensitivityFactor;
    self.dy = (event.pageY - self.init_y) * self.props.mouseSensitivityFactor;
    self.init_x = event.pageX;
    self.init_y = event.pageY;

    const moveFactor = getDeviceScale() * 400.0 / self.canvas.height * self.moveFactor / self.props.mouseSensitivityFactor;

    if ((event.altKey && event.shiftKey) || (self.mouseDownButton === 1)) {
        if (self.mouseDownButton === 1) {
            event.preventDefault();
        }
        const invQuat = quat4.create();
        quat4Inverse(self.myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const xshift = vec3.create();
        vec3.set(xshift, moveFactor * self.dx, 0, 0);
        const yshift = vec3.create();
        vec3.set(yshift, 0, moveFactor * self.dy, 0);
        vec3.transformMat4(xshift, xshift, theMatrix);
        vec3.transformMat4(yshift, yshift, theMatrix);

        if (!activeMoleculeMotion) {
            const newOrigin = self.origin.map((coord, coordIndex) => {
                return coord + (self.zoom * xshift[coordIndex] / 8.) - (self.zoom * yshift[coordIndex] / 8.)
            })
            self.setOrigin(newOrigin as [number, number, number], false, !self.reContourMapOnlyOnMouseUp)
        } else {
            const newOrigin = self.activeMolecule.displayObjectsTransformation.origin.map((coord, coordIndex) => {
                return coord + (self.zoom * xshift[coordIndex] / 8.) - (self.zoom * yshift[coordIndex] / 8.)
            })
            const newOriginSet : [number, number, number] = [ newOrigin[0], newOrigin[1], newOrigin[2]];
            self.activeMolecule.displayObjectsTransformation.origin = newOriginSet;
            if (!self.activeMolecule.displayObjectsTransformation.quat) {
                self.activeMolecule.displayObjectsTransformation.quat = quat4.create();
                quat4.set(self.activeMolecule.displayObjectsTransformation.quat, 0, 0, 0, -1);
            }
            const theMatrix = quatToMat4(self.activeMolecule.displayObjectsTransformation.quat);
            theMatrix[12] = self.activeMolecule.displayObjectsTransformation.origin[0];
            theMatrix[13] = self.activeMolecule.displayObjectsTransformation.origin[1];
            theMatrix[14] = self.activeMolecule.displayObjectsTransformation.origin[2];
            for (const representation of self.activeMolecule.representations) {
                const value = representation.buffers
                for (let ibuf = 0; ibuf < value.length; ibuf++) {
                    value[ibuf].transformMatrixInteractive = theMatrix;
                }
            }
        }
        self.drawScene();
        return;
    }

    if (event.altKey) {
        const factor = 1. - self.dy / 50.0;
        let newZoom = self.zoom * factor;
        if (newZoom < .01) {
            newZoom = 0.01;
        }
        self.setZoom(newZoom)
        self.drawScene();
        return;
    }

    if (event.shiftKey) {

        const c = self.canvasRef.current;
        const offset = getOffsetRect(c);
        const frac_x = 2.0*(getDeviceScale()*(event.pageX - offset.left)/self.gl.viewportWidth - 0.5);
        const frac_y = -2.0*(getDeviceScale()*(event.pageY - offset.top)/self.gl.viewportHeight - 0.5);
        const zQ = createZQuatFromDX(frac_x*self.dy + frac_y*self.dx);
        quat4.multiply(self.myQuat, self.myQuat, zQ);

    } else if (event.buttons === 1) {

        const rot_x_axis = vec3.create()
        const rot_y_axis = vec3.create()
        vec3.set(rot_x_axis, 1.0, 0.0, 0.0);
        vec3.set(rot_y_axis, 0.0, 1.0, 0.0);

        if(self.doThreeWayView && self.threeWayViewports.length > 0){
            const quats = self.threeWayQuats
            const viewports = self.threeWayViewports
            const mVPQ = self.getThreeWayMatrixAndViewPort(self.gl_cursorPos[0], self.gl_cursorPos[1], quats, viewports)
            if(mVPQ.quat) {
                const theRotMatrix = quatToMat4(mVPQ.quat);
                mat4.invert(theRotMatrix, theRotMatrix)
                vec3.transformMat4(rot_x_axis, rot_x_axis, theRotMatrix);
                vec3.transformMat4(rot_y_axis, rot_y_axis, theRotMatrix);
            }
        }

        const xQ = createQuatFromAngle(-self.dy, rot_x_axis);
        const yQ = createQuatFromAngle(-self.dx, rot_y_axis);
        quat4.multiply(xQ, xQ, yQ);

        if (self.currentlyDraggedAtom) {

            // ###############
            // FILO: COPY PASTED FROM ABOVE
            const invQuat = quat4.create();
            quat4Inverse(self.myQuat, invQuat);
            const theMatrix = quatToMat4(invQuat);
            const xshift = vec3.create();
            vec3.set(xshift, moveFactor * self.dx, 0, 0);
            const yshift = vec3.create();
            vec3.set(yshift, 0, moveFactor * self.dy, 0);
            vec3.transformMat4(xshift, xshift, theMatrix);
            vec3.transformMat4(yshift, yshift, theMatrix);

            const newOrigin = self.draggableMolecule.displayObjectsTransformation.origin.map((coord, coordIndex) => {
                return coord + (self.zoom * xshift[coordIndex] / 8.) - (self.zoom * yshift[coordIndex] / 8.)
            })
            const newOriginSet : [number, number, number] = [ newOrigin[0], newOrigin[1], newOrigin[2]];
            self.draggableMolecule.displayObjectsTransformation.origin = newOriginSet;
            if (!self.draggableMolecule.displayObjectsTransformation.quat) {
                self.draggableMolecule.displayObjectsTransformation.quat = quat4.create();
                quat4.set(self.draggableMolecule.displayObjectsTransformation.quat, 0, 0, 0, -1);
            }

            // ###############

            const draggedAtomEvent: moorhen.AtomDraggedEvent = new CustomEvent("atomDragged", { detail: self.currentlyDraggedAtom });
            document.dispatchEvent(draggedAtomEvent);
            return

        } else if (!activeMoleculeMotion) {
            quat4.multiply(self.myQuat, self.myQuat, xQ);
        } else {
            // ###############
            //TODO - Move all this somewhere else ...

            const invQuat = quat4.create();
            quat4Inverse(self.myQuat, invQuat);
            const invMat = quatToMat4(invQuat);
            const x_rot = vec3.create();
            const y_rot = vec3.create();
            vec3.set(x_rot, 1.0, 0.0, 0.0);
            vec3.set(y_rot, 0.0, 1.0, 0.0);
            vec3.transformMat4(x_rot, x_rot, invMat);
            vec3.transformMat4(y_rot, y_rot, invMat);

            const xQp = createQuatFromDXAngle(-self.dy, x_rot);
            const yQp = createQuatFromDXAngle(-self.dx, y_rot);
            quat4.multiply(xQp, xQp, yQp);

            if (!self.activeMolecule.displayObjectsTransformation.quat) {
                self.activeMolecule.displayObjectsTransformation.quat = quat4.create();
                quat4.set(self.activeMolecule.displayObjectsTransformation.quat, 0, 0, 0, -1);
            }
            quat4.multiply(self.activeMolecule.displayObjectsTransformation.quat, self.activeMolecule.displayObjectsTransformation.quat, xQp);
            const theMatrix = quatToMat4(self.activeMolecule.displayObjectsTransformation.quat);
            theMatrix[12] = self.activeMolecule.displayObjectsTransformation.origin[0];
            theMatrix[13] = self.activeMolecule.displayObjectsTransformation.origin[1];
            theMatrix[14] = self.activeMolecule.displayObjectsTransformation.origin[2];
            // Pivot the interactive render about the fragment centre of mass
            // (in world space: COM + view origin). This MUST be the same pivot used
            // by the accept coordinate math (displayObjectsTransformation.centre in
            // transformedCachedAtomsAsMovedAtoms), so the position shown during
            // manipulation equals the accepted coordinates. Previously a shadowed
            // `diff` left transformOriginInteractive at [0,0,0] (the view origin),
            // so the fragment visibly pivoted about the screen and landed elsewhere
            // on accept.
            let centre: [number, number, number] = self.activeMolecule.displayObjectsTransformation.centre;

            const dispObjs: moorhen.DisplayObject[][]  = self.activeMolecule.representations.filter(item => item.style !== 'transformation').map(item => item.buffers)
            for (const value of dispObjs) {
                if (value.length > 0) {
                    const com = centreOfMass(value[0].atoms);
                    centre = [com[0] + self.origin[0], com[1] + self.origin[1], com[2] + self.origin[2]];
                    self.activeMolecule.displayObjectsTransformation.centre = centre;
                    break;
                }
            }
            for (const value of dispObjs) {
                for (let ibuf = 0; ibuf < value.length; ibuf++) {
                    value[ibuf].transformMatrixInteractive = theMatrix;
                    value[ibuf].transformOriginInteractive = centre;
                }
            }
            // ###############
        }
    }

    self.drawScene();
}

export function doMouseDown(self: MGWebGL, event) {
    self.init_x = event.pageX;
    self.init_y = event.pageY;
    self.mouseDown_x = event.pageX;
    self.mouseDown_y = event.pageY;
    self.mouseDown = true;
    self.mouseDownButton = event.button;
    self.mouseMoved = false;
    if (event.button === 1) {
        event.preventDefault();
    }
}

// The `keyboardAccelerators` prop and `keysDown` field are declared in
// mgWebGL.d.ts as Dictionary<string>/Dictionary<number>, but at runtime each
// accelerator is an object ({ keyPress, modifiers }) and keysDown holds booleans.
// The originals took an untyped `self`, so this mismatch was never checked;
// keep the exact runtime behaviour by reading through the real shape here.
type KeyboardAccelerator = { keyPress: string; modifiers: string[] }

export function handleKeyUp(self: MGWebGL, event) {
    const accelerators = self.props.keyboardAccelerators as unknown as Record<string, KeyboardAccelerator>
    const keysDown = self.keysDown as unknown as Record<string, boolean>
    Object.keys(accelerators).forEach(key => {
        if (event.key && accelerators[key].keyPress === event.key.toLowerCase() && accelerators[key]) {
            keysDown[key] = false;
        }
    })
}

export function handleKeyDown(self: MGWebGL, event) {
    const accelerators = self.props.keyboardAccelerators as unknown as Record<string, KeyboardAccelerator>
    const keysDown = self.keysDown as unknown as Record<string, boolean>
    const eventModifiersCodes: string[] = []

    if (event.shiftKey) eventModifiersCodes.push('shiftKey')
    if (event.ctrlKey) eventModifiersCodes.push('ctrlKey')
    if (event.metaKey) eventModifiersCodes.push('metaKey')
    if (event.altKey) eventModifiersCodes.push('altKey')

    Object.keys(accelerators).forEach(key => {
        if (
            event.key &&
            accelerators[key].keyPress === event.key.toLowerCase() &&
            accelerators[key].modifiers.every(modifier => event[modifier]) &&
            eventModifiersCodes.every(modifier => accelerators[key].modifiers.includes(modifier))
        ) {
            keysDown[key] = true
        } else {
            keysDown[key] = false
        }
    })

    /**
     * No longer necessary but leaving it here in case we want to handle something
     * not taken care of upstairs
    */

    let doContinue = true
    if (self.props.onKeyPress) {
        doContinue = self.props.onKeyPress(event) as boolean
    }

    if (!doContinue) return

}
