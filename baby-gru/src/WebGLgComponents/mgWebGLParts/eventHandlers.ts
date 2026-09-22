import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import * as mat4 from 'gl-matrix/mat4';
import { quatToMat4, quat4Inverse } from '../quatToMat4.js';
import { createQuatFromDXAngle, createQuatFromAngle, createZQuatFromDX } from '../quatUtils';
import { parseAtomInfoLabel } from '../../utils/utils';
import { getDeviceScale } from '../webGLUtils';
import { getOffsetRect, MGWebGL } from '../mgWebGL';
import type { moorhen } from '../../types/moorhen';
import { webGL } from '../../types/mgWebGL';

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

        const [minidx, minj, mindist, minsym, minx, miny, minz, minidx_pi,minj_pi,mindist_pi,minsym_pi,minx_pi,miny_pi,minz_pi] = self.getAtomFomMouseXY(event, self);
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
        const [minidx, minj, mindist, minsym, minx, miny, minz, minidx_pi,minj_pi,mindist_pi,minsym_pi,minx_pi,miny_pi,minz_pi] = self.getAtomFomMouseXY(event, self);
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
                if (self.labelledAtoms.length === 0) {
                    self.labelledAtoms.push([]);
                }
                const idx = self.labelledAtoms[0].findIndex(o => Math.abs(o.x-theAtom.x)<1e-3 && Math.abs(o.y-theAtom.y)<1e-4 && Math.abs(o.z-theAtom.z)<1e-4)
                if(idx===-1)
                    self.labelledAtoms[0].push(theAtom);
                else
                    self.labelledAtoms[0].splice(idx,1)
            } else if (self.keysDown['measure_distances']) {
                updateLabels = true
                if (self.measuredAtoms.length === 0) {
                    self.measuredAtoms.push([]);
                }
                const idx = self.measuredAtoms[0].findIndex(o => Math.abs(o.x-theAtom.x)<1e-3 && Math.abs(o.y-theAtom.y)<1e-4 && Math.abs(o.z-theAtom.z)<1e-4)
                if(self.measuredAtoms[0].length>0&&(idx===self.measuredAtoms[0].length-1))
                    self.measuredAtoms[0].pop()
                else
                    self.measuredAtoms[0].push(theAtom);
            }
        }
        if(updateLabels) self.updateLabels()
    }

    self.drawScene();
}

/**
 * The label a picked buffer gives to the whole instance under the cursor, or null.
 *
 * The instance channel, not the section one: a path labels its sections with the residues they
 * stand for, and separately labels itself with the object it belongs to. This asks the second
 * question. As everywhere else here, the string is passed on unread.
 */
function pickedInstanceTag(
    displayBuffers, bufferIndex: number, pickIndex: number
): { tag: string; kind: string; bufferId: string } | null {
    const pickInfo = bufferIndex > -1 ? displayBuffers[bufferIndex]?.pick_info : null
    if (!pickInfo?.instance_tags || !pickInfo.instance_tag_kind || pickIndex < 0) return null
    // A shape offers many pick points, so the reported index is not the instance index.
    const instance = pickInfo.pick_point_instances?.[pickIndex] ?? pickIndex
    const tag = pickInfo.instance_tags[instance]
    if (!tag) return null
    return { tag, kind: pickInfo.instance_tag_kind, bufferId: displayBuffers[bufferIndex].id }
}

export function doHover(self: MGWebGL, event) {

    if (self.hoverDebounceTimeout) {
        clearTimeout(self.hoverDebounceTimeout);
    }

    self.hoverDebounceTimeout = setTimeout(() => {
        const displayBuffers = self.store.getState().glRef.displayBuffers
        if (self.props.onAtomHovered) {
            const [minidx, minj, mindist, minsym, minx, miny, minz, minidx_pi,minj_pi,mindist_pi,minsym_pi,minx_pi,miny_pi,minz_pi] = self.getAtomFomMouseXY(event, self);
            if(minidx_pi > -1 && displayBuffers[minidx_pi].pick_info && displayBuffers[minidx_pi].pick_info.influence_weights_texture && displayBuffers[minidx_pi].pick_info.influence_point_indexes_texture && displayBuffers[minidx_pi].pick_info.influence_index_offsets_texture && displayBuffers[minidx_pi].pick_info.pick_points){
                self.setState({ hoveridx: minidx_pi })
                self.setState({ hover_point: minj_pi })
                self.setState({ hoverIndices: [] })
            } else if (minidx_pi > -1 && displayBuffers[minidx_pi].pick_info && displayBuffers[minidx_pi].pick_info.point_triangles && displayBuffers[minidx_pi].pick_info.point_triangles.length>0 && displayBuffers[minidx_pi].pick_info.point_triangles[minj_pi].length>0) {
                //Hmm, I am worried, could triangleIndexs.length > 1 ?
                const completeHoverIndices = []
                displayBuffers[minidx_pi]["pick_info"].point_triangles[minj_pi].forEach(idx => {
                    completeHoverIndices.push(displayBuffers[minidx_pi].triangleIndexs[0][3*idx])
                    completeHoverIndices.push(displayBuffers[minidx_pi].triangleIndexs[0][3*idx+1])
                    completeHoverIndices.push(displayBuffers[minidx_pi].triangleIndexs[0][3*idx+2])
                })
                self.setState({ hoveridx: minidx_pi })
                self.setState({ hover_point: -1 })
                self.setState({ hoverIndices: completeHoverIndices })
            } else if (minidx_pi > -1 && displayBuffers[minidx_pi].pick_info && displayBuffers[minidx_pi].pick_info.pick_points) {
                // A buffer offering only pick_points, with no per-vertex influence data and no
                // triangle lists: the instanced shapes, where one pick point stands for one whole
                // instance. hover_point is then the instance index, which the instanced vertex
                // shader compares against gl_InstanceID.
                self.setState({ hoveridx: minidx_pi })
                self.setState({ hover_point: minj_pi })
                self.setState({ hoverIndices: [] })
            } else {
                self.setState({ hoveridx: -1 })
                self.setState({ hover_point: -1 })
                self.setState({ hoverIndices: [] })
            }
            if (minidx > -1) {
                self.props.onAtomHovered({ atom: displayBuffers[minidx].atoms[minj], buffer: displayBuffers[minidx] });
            }
            else {
                self.props.onAtomHovered(null)
            }

            // A buffer may label its pickable pieces with strings that mean nothing here. Report
            // the one under the cursor and let whoever understands the scheme act on it.
            //
            // An atom under the cursor takes precedence: the two pick channels are independent,
            // so both can find something at once, and this is the renderer saying which of its
            // own answers wins. Reported after onAtomHovered, which has already cleared the
            // hover state on the way past when there is no atom - so a labelled piece fills the
            // gap rather than fighting over it.
            if (self.props.onSectionHovered) {
                const atomHasIt = minidx > -1
                const pickInfo = (!atomHasIt && minidx_pi > -1) ? displayBuffers[minidx_pi].pick_info : null
                const tag = (pickInfo?.pick_point_tags && minj_pi > -1)
                    ? pickInfo.pick_point_tags[minj_pi]
                    : null
                self.props.onSectionHovered(
                    tag ? { kind: pickInfo.pick_tag_kind, tag: tag, buffer: displayBuffers[minidx_pi] } : null
                )
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
    if (self.pointerClaim) {
        document.dispatchEvent(new CustomEvent("handleGrabEnd", { detail: { ...self.pointerClaim } }))
        self.pointerClaim = null
        self.mouseDown = false
        // Nothing else on the way out: no centring, and no hover recomputed from a pointer that
        // has been busy dragging.
        return
    }

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
                const [minidx, minj, mindist, minsym, minx, miny, minz, minidx_pi,minj_pi,mindist_pi,minsym_pi,minx_pi,miny_pi,minz_pi] = self.getAtomFomMouseXY(event, self);
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
                } else {
                    // No atom there, but perhaps a mesh - which may stand for nothing, so there
                    // is no cid to centre on, only a position. The pick has already been done
                    // above: minidx_pi and minj_pi are the other half of its answer.
                    //
                    // Atoms keep precedence, as they do when hovering: where both are under the
                    // pointer, the atom is the finer thing to have been aiming at.
                    const claimsPointer = minidx_pi > -1
                        && !!displayBuffers[minidx_pi]?.pick_info?.claims_pointer
                    const meshPosition = claimsPointer
                        ? null
                        : pickedMeshPosition(displayBuffers, minidx_pi, minj_pi, self.pickLevel)
                    if(meshPosition){
                        self.props.onOriginChanged([-meshPosition[0], -meshPosition[1], -meshPosition[2]])
                    }
                }
            }
        } else if (self.reContourMapOnlyOnMouseUp) {
            self.handleOriginUpdated(true)
        }
    } else if (event.altKey && event.shiftKey && self.reContourMapOnlyOnMouseUp) {
        self.handleOriginUpdated(true)
    } else if (event.button === 0 && clickWasFree(self)) {
        // Report what was clicked, for anyone who can make sense of the label.
        //
        // Here rather than in doClick because doClick runs on mousedown, and a press is not yet
        // a click: turning the view starts with a press on whatever happens to be under the
        // pointer, usually empty space. Reporting then would rewrite the selection every time
        // the camera moved. The same small-movement test the centring above uses tells the two
        // apart. A press on a manipulation handle never reaches here at all - the claim at the
        // top of this function has already returned.
        if (Math.abs(event_x - self.mouseDown_x) < 5 && Math.abs(event_y - self.mouseDown_y) < 5) {
            const [minidx, , , , , , , minidx_pi, minj_pi] = self.getAtomFomMouseXY(event, self)
            // Atoms take precedence, as they do when hovering and when centring: where both are
            // under the pointer, the atom is the finer thing to have been aiming at.
            if (minidx < 0) {
                const picked = pickedInstanceTag(displayBuffers, minidx_pi, minj_pi)
                document.dispatchEvent(new CustomEvent("meshClicked", {
                    // Null for empty space, and null too for a mesh carrying no label of its
                    // own. Both say the same thing to a listener: nothing of yours was clicked.
                    detail: picked ?? { tag: null, kind: null, bufferId: null }
                }))
            }
        }
    }
    self.mouseDown = false;
    self.doHover(event, self);
}

/**
 * Whether a click means only itself.
 *
 * Each of these shortcuts already gives a click a meaning - label an atom, measure to it, take
 * it as one end of a residue range - and a click cannot mean two things at once.
 */
function clickWasFree(self: MGWebGL): boolean {
    return !self.keysDown['label_atom']
        && !self.keysDown['measure_distances']
        && !self.keysDown['residue_selection']
}

/**
 * Where on a mesh a pick landed, in scene coordinates, or null if it did not land on one.
 *
 * A buffer divided into sections gives the section that was picked, so that a trace centres on
 * the residue pointed at rather than on the middle of the whole chain. Anything else gives the
 * centre of the instance, which is the first pick point it offers - the rest are scattered over
 * its surface to make it hoverable, and centring on one of those would put the view on the
 * shape's edge.
 *
 * A position rather than an identity, because a mesh need not stand for anything at all.
 *
 * `level` says how much of a sectioned mesh counts as one thing at the current zoom: centring
 * lands on the middle of whatever is highlighted, so pulled back far enough it goes to the
 * middle of a whole chain rather than of the residue happening to be under the pointer.
 */
function pickedMeshPosition(
    displayBuffers, bufferIndex: number, pickIndex: number, level: number = 0
): number[] | null {
    const pickInfo = bufferIndex > -1 ? displayBuffers[bufferIndex]?.pick_info : null;
    if (!pickInfo?.pick_points || pickIndex < 0) {
        return null;
    }
    // A section's aim point at this grain, when the mesh offers coarser ones.
    const section = pickInfo.pick_point_sections?.[pickIndex];
    const coarse = section !== undefined
        ? pickInfo.section_level_points?.[level]?.[section]
        : undefined;
    if (coarse) return coarse;
    let index = pickIndex;
    if (!pickInfo.pick_point_sections) {
        const instances = pickInfo.pick_point_instances;
        if (instances) {
            const first = instances.indexOf(instances[pickIndex]);
            if (first > -1) index = first;
        }
    }
    return pickInfo.pick_points[index] ?? null;
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
    // A claimed drag never reaches the camera.
    if (self.pointerClaim) {
        self.mouseMoved = true
        document.dispatchEvent(new CustomEvent("handleGrabMove", {
            detail: { ...self.pointerClaim, ...pointerRay(self, event) }
        }))
        return
    }

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

    updateCursorPosition(self, event)
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

/**
 * The label of whatever has taken the pointer at this position, or null.
 *
 * A buffer may declare that it wants pointer events for itself - the manipulation handles do -
 * and this is the whole of what the renderer knows about that. It reports a label it does not
 * interpret, and stops driving the camera; someone else decides what the label means.
 */
function pointerClaimAt(self: MGWebGL, event): { tag: string; bufferId: string } | null {
    const displayBuffers = self.store.getState().glRef.displayBuffers
    if (!displayBuffers || displayBuffers.length === 0) return null
    const [, , , , , , , minidx_pi, minj_pi] = self.getAtomFomMouseXY(event, self)
    const pickInfo = minidx_pi > -1 ? displayBuffers[minidx_pi]?.pick_info : null

    if (minidx_pi < 0 || minj_pi < 0) return null
    if (!pickInfo?.claims_pointer || !pickInfo.pick_point_tags) return null
    const tag = pickInfo.pick_point_tags[minj_pi]
    return tag ? { tag, bufferId: displayBuffers[minidx_pi].id } : null
}

/**
 * Record where the pointer is, in the renderer's own terms.
 *
 * Everything that turns a screen position into a scene position reads gl_cursorPos rather than
 * the event - getFrontAndBackPos takes an event argument and ignores it entirely - so anything
 * that wants a ray has to make sure this is current first.
 */
function updateCursorPosition(self: MGWebGL, event) {
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

/**
 * The pointer as a ray through the scene.
 *
 * Named for what getFrontAndBackPos actually returns - front first, then back. The blob-fitting
 * double click labels the same two the other way round, which does no harm there and would do
 * none here either, both ends describing one line, but the honest names are cheaper to read.
 */
function pointerRay(self: MGWebGL, event) {
    // The ray is built from the recorded cursor position, so that has to be current first.
    updateCursorPosition(self, event)
    const frontAndBack = self.getFrontAndBackPos(event)
    return {
        front: [frontAndBack[0][0], frontAndBack[0][1], frontAndBack[0][2]],
        back: [frontAndBack[1][0], frontAndBack[1][1], frontAndBack[1][2]],
    }
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

    // Before the camera gets any of this: has something claimed the pointer? If so the drag
    // belongs to it, and the view must not turn underneath it.
    self.pointerClaim = null
    if (event.button === 0 && !self.keysDown['residue_selection']) {
        const claim = pointerClaimAt(self, event)
        if (claim) {
            self.pointerClaim = claim
            self.mouseDown = false
            document.dispatchEvent(new CustomEvent("handleGrabStart", {
                detail: { ...claim, ...pointerRay(self, event) }
            }))
            event.preventDefault()
        }
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
