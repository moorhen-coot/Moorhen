import * as vec3 from 'gl-matrix/vec3';
import * as mat4 from 'gl-matrix/mat4';
import { useEffect, useRef, useCallback, useState, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux";
import { Button, Form, InputGroup, Stack } from "react-bootstrap";
import { Tooltip } from "@mui/material";
import { useSnackbar } from "notistack";
import { LastPageOutlined } from "@mui/icons-material";
import { moorhen } from "../../types/moorhen";
import { MoorhenReduxStore as store } from '../../store/MoorhenReduxStore'
import { DisplayBuffer } from '../../WebGLgComponents/displayBuffer'
import { cloneBuffers, buildBuffers } from '../../WebGLgComponents/buildBuffers'
import { quatToMat4 } from '../../WebGLgComponents/quatToMat4.js';
import { getShader, initSideOnShaders, initSideOnShadersInstanced, initSideOnSphereShaders } from '../../WebGLgComponents/mgWebGLShaders'
import {
    setClipCap,
    setDepthBlurDepth,
    setDepthBlurRadius,
    setResetClippingFogging,
    setUseOffScreenBuffers,
} from "../../store/sceneSettingsSlice";
import { MoorhenSlider } from "../inputs";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { modalKeys } from "../../utils/enums";
import { hideModal } from "../../store/modalsSlice";
import {
    setFogStart,
    setFogEnd,
    setClipStart,
    setClipEnd,
} from "../../store/glRefSlice";
import { triangle_side_on_view_instanced_vertex_shader_source } from '../../WebGLgComponents/webgl-2/triangle-side-on-view-instanced-vertex-shader.js';
import { triangle_side_on_view_vertex_shader_source } from '../../WebGLgComponents/webgl-2/triangle-side-on-view-vertex-shader.js';
import { triangle_side_on_view_fragment_shader_source } from '../../WebGLgComponents/webgl-2/triangle-side-on-view-fragment-shader.js';
import { twod_side_on_view_vertex_shader_source } from '../../WebGLgComponents/webgl-2/twodshapes-side-on-view-vertex-shader.js';
import { perfect_sphere_side_on_view_fragment_shader_source } from '../../WebGLgComponents/webgl-2/perfect-sphere-side-on-view-fragment-shader.js';
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";

const getOffsetRect = (elem: HTMLCanvasElement) => {
    const box = elem.getBoundingClientRect()
    const body = document.body
    const docElem = document.documentElement

    const scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop
    const scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft
    const clientTop = docElem.clientTop || body.clientTop || 0
    const clientLeft = docElem.clientLeft || body.clientLeft || 0
    const top  = box.top +  scrollTop - clientTop
    const left = box.left + scrollLeft - clientLeft

    return { top: Math.round(top), left: Math.round(left) }
}

const ClipFogBlurOptionsPanel = () => {
    const dispatch = useDispatch();

    const clipCap = useSelector((state: moorhen.State) => state.sceneSettings.clipCap);
    const resetClippingFogging = useSelector((state: moorhen.State) => state.sceneSettings.resetClippingFogging);
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers);
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth);
    const depthBlurRadius = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurRadius);

    return (
        <div className="scene-settings-panel-flex-between">
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="switch"
                    checked={resetClippingFogging}
                    onChange={() => {
                        dispatch(setResetClippingFogging(!resetClippingFogging));
                    }}
                    label="Reset clipping and fogging on zoom"
                />
                <Form.Check
                    type="switch"
                    checked={useOffScreenBuffers}
                    onChange={() => {
                        dispatch(setUseOffScreenBuffers(!useOffScreenBuffers));
                    }}
                    label="Depth Blur"
                />
            </InputGroup>
        </div>
    );
};

enum GrabHandle
{
 NONE,
 CLIP_START,
 CLIP_END,
 FOG_START,
 FOG_END,
 BLUR_DEPTH,
}

interface MGWebGLBuffer {
    itemSize: number;
    numItems: number;
}

interface SideOnProgramSphere extends WebGLProgram {
    vertexPositionAttribute: GLint;
    vertexNormalAttribute: GLint;
    vertexColourAttribute: GLint;
    vertexTextureAttribute: GLint;
    offsetAttribute: GLint;
    sizeAttribute: GLint;
    pMatrixUniform: WebGLUniformLocation;
    mvMatrixUniform: WebGLUniformLocation;
    mvInvMatrixUniform: WebGLUniformLocation;
}

interface SideOnProgram extends WebGLProgram {
    pMatrixUniform: WebGLUniformLocation;
    mvMatrixUniform: WebGLUniformLocation;
    screenZ: WebGLUniformLocation;
    vertexPositionAttribute: GLint;
    vertexNormalAttribute: GLint;
    vertexColourAttribute: GLint;
}

interface SideOnProgramInstanced extends WebGLProgram {
    pMatrixUniform: WebGLUniformLocation;
    mvMatrixUniform: WebGLUniformLocation;
    screenZ: WebGLUniformLocation;
    vertexInstanceOriginAttribute: GLint;
    vertexInstanceSizeAttribute: GLint;
    vertexPositionAttribute: GLint;
    vertexNormalAttribute: GLint;
    vertexColourAttribute: GLint;
    vertexInstanceOrientationAttribute: GLint;
}

const MoorhenSlidersSettings = (props: { stackDirection: "horizontal" | "vertical" }) => {

    const dispatch = useDispatch();

    const isWebGL2 = useSelector((state: moorhen.State) => state.glRef.isWebGL2);
    const plotWidth = 450
    const plotHeight = 300
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasRefWebGL = useRef<HTMLCanvasElement>(null)

    const fogClipOffset = useSelector((state: moorhen.State) => state.glRef.fogClipOffset);
    const gl_fog_start = useSelector((state: moorhen.State) => state.glRef.fogStart);
    const gl_fog_end = useSelector((state: moorhen.State) => state.glRef.fogEnd);
    const clipStart = useSelector((state: moorhen.State) => state.glRef.clipStart);
    const clipEnd = useSelector((state: moorhen.State) => state.glRef.clipEnd);
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth);
    const quat = useSelector((state: moorhen.State) => state.glRef.quat)
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers);

    const programRef = useRef<null | SideOnProgram>(null);
    const programInstancedRef = useRef<null | SideOnProgramInstanced>(null);
    const sphereProgramRef = useRef<null | SideOnProgramSphere>(null);

    const imageBuffersRef = useRef<null | DisplayBuffer>(null);

    const displayBuffers = store.getState().glRef.displayBuffers
    const storeMolecules = store.getState().molecules.moleculeList
    const originState =  store.getState().glRef.origin

    const [clickX, setClickX] = useState<number>(-1)
    const [clickY, setClickY] = useState<number>(-1)
    const [moveX, setMoveX] = useState<number>(-1)
    const [moveY, setMoveY] = useState<number>(-1)
    const [releaseX, setReleaseX] = useState<number>(-1)
    const [releaseY, setReleaseY] = useState<number>(-1)
    const [mouseHeldDown, setMouseHeldDown] = useState<boolean>(false)

    const [grabbed, setGrabbed] = useState<GrabHandle>(GrabHandle.NONE)

    let myBuffers:DisplayBuffer[]
    myBuffers = useMemo(() => {

        if(!canvasRefWebGL)
            return []

        if(!canvasRefWebGL.current)
            return []

        const canvasWebGL = canvasRefWebGL.current
        const gl = canvasWebGL.getContext("webgl2")

        const clonedBuffers = cloneBuffers(displayBuffers,gl)
        buildBuffers(clonedBuffers,gl,true)
        return clonedBuffers

    }, [displayBuffers,storeMolecules])

    const atomSpan = useMemo(() => {
        let min_x =  1e5;
        let max_x = -1e5;
        let min_y =  1e5;
        let max_y = -1e5;
        let min_z =  1e5;
        let max_z = -1e5;
        let haveAtoms = false;

        displayBuffers.forEach(buffer => {
            if (buffer.visible) {
                if(buffer.atoms&&buffer.atoms.length>1)
                    haveAtoms = true
                buffer.atoms.forEach(atom => {
                    if(atom.x>max_x) max_x = atom.x;
                    if(atom.x<min_x) min_x = atom.x;
                    if(atom.y>max_y) max_y = atom.y;
                    if(atom.y<min_y) min_y = atom.y;
                    if(atom.z>max_z) max_z = atom.z;
                    if(atom.z<min_z) min_z = atom.z;
                })
            }
        })

        let atom_span = 9999.0
        if(haveAtoms){
            atom_span = Math.sqrt((max_x - min_x) * (max_x - min_x) + (max_y - min_y) * (max_y - min_y) +(max_z - min_z) * (max_z - min_z));
        }
        return atom_span
    }, [displayBuffers])

    const drawGL = async (width,height) => {

        if(!canvasRefWebGL)
            return

        if(!canvasRefWebGL.current)
            return

        if(!programInstancedRef.current)
            return

        const canvasWebGL = canvasRefWebGL.current
        const gl = canvasWebGL.getContext("webgl2")

        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0.5,0.5,0.5,1.0);
        gl.viewport(0, 0, width, height);
        const screenZ = vec3.create();
        vec3.set(screenZ,0,0,1)
        const pMatrix = mat4.create();
        mat4.ortho(pMatrix, -atomSpan * 0.75, atomSpan * 0.75, -atomSpan * 0.75 * height/width, atomSpan * 0.75 * height/width, 0.1, 1000.0);

        const theMatrix = quatToMat4(quat);

        const mvMatrix = mat4.create();
        mat4.set(mvMatrix,
            0.0, 0.0, 1.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
           -1.0, 0.0, 0.0, 0.0,
            0.0, 0.0, -100.0, 1.0,
        )
        mat4.multiply(mvMatrix, mvMatrix, theMatrix);

        mat4.translate(mvMatrix,mvMatrix,originState)

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// useProgram is not a React hook.
// eslint-disable-next-line
        gl.useProgram(programInstancedRef.current)

        gl.uniform3fv(programInstancedRef.current.screenZ, screenZ);
        gl.uniformMatrix4fv(programInstancedRef.current.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(programInstancedRef.current.mvMatrixUniform, false, mvMatrix);

        for(let i = 0; i<16; i++)
            gl.disableVertexAttribArray(i);
        gl.enableVertexAttribArray(programInstancedRef.current.vertexInstanceOriginAttribute);
        gl.enableVertexAttribArray(programInstancedRef.current.vertexInstanceSizeAttribute);
        gl.enableVertexAttribArray(programInstancedRef.current.vertexColourAttribute);
        gl.enableVertexAttribArray(programInstancedRef.current.vertexPositionAttribute);
        gl.enableVertexAttribArray(programInstancedRef.current.vertexNormalAttribute);

        gl.vertexAttribDivisor(programInstancedRef.current.vertexInstanceSizeAttribute, 1);
        gl.vertexAttribDivisor(programInstancedRef.current.vertexInstanceOriginAttribute, 1);
        gl.vertexAttribDivisor(programInstancedRef.current.vertexColourAttribute,1);

        for (const buffer of myBuffers) {
            if(buffer.visible)
            if(buffer.triangleInstanceOriginBuffer&&buffer.triangleInstanceOriginBuffer.length>0){
                for (let j = 0; j < buffer.triangleInstanceOriginBuffer.length; j++) {
                    if(buffer.bufferTypes[j]&&buffer.bufferTypes[j]==="TRIANGLES"&&buffer.triangleInstanceOriginBuffer[j].numItems>0){
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleInstanceOriginBuffer[j]);
                        gl.vertexAttribPointer(programInstancedRef.current.vertexInstanceOriginAttribute, buffer.triangleInstanceOriginBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleInstanceSizeBuffer[j]);
                        gl.vertexAttribPointer(programInstancedRef.current.vertexInstanceSizeAttribute, buffer.triangleInstanceSizeBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleColourBuffer[j]);
                        gl.vertexAttribPointer(programInstancedRef.current.vertexColourAttribute, buffer.triangleColourBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[j]);
                        gl.vertexAttribPointer(programInstancedRef.current.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[j]);
                        gl.vertexAttribPointer(programInstancedRef.current.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[j]);
                        if(buffer.triangleInstanceOrientationBuffer[j]&&buffer.triangleInstanceOrientations.length>0&&buffer.triangleInstanceOrientations[j].length>0){
                            gl.enableVertexAttribArray(programInstancedRef.current.vertexInstanceOrientationAttribute);
                            gl.enableVertexAttribArray(programInstancedRef.current.vertexInstanceOrientationAttribute+1);
                            gl.enableVertexAttribArray(programInstancedRef.current.vertexInstanceOrientationAttribute+2);
                            gl.enableVertexAttribArray(programInstancedRef.current.vertexInstanceOrientationAttribute+3);
                            gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleInstanceOrientationBuffer[j]);
                            gl.vertexAttribPointer(programInstancedRef.current.vertexInstanceOrientationAttribute, 4, gl.FLOAT, false, 64, 0);
                            gl.vertexAttribPointer(programInstancedRef.current.vertexInstanceOrientationAttribute+1, 4, gl.FLOAT, false, 64, 16);
                            gl.vertexAttribPointer(programInstancedRef.current.vertexInstanceOrientationAttribute+2, 4, gl.FLOAT, false, 64, 32);
                            gl.vertexAttribPointer(programInstancedRef.current.vertexInstanceOrientationAttribute+3, 4, gl.FLOAT, false, 64, 48);
                            gl.vertexAttribDivisor(programInstancedRef.current.vertexInstanceOrientationAttribute, 1);
                            gl.vertexAttribDivisor(programInstancedRef.current.vertexInstanceOrientationAttribute+1, 1);
                            gl.vertexAttribDivisor(programInstancedRef.current.vertexInstanceOrientationAttribute+2, 1);
                            gl.vertexAttribDivisor(programInstancedRef.current.vertexInstanceOrientationAttribute+3, 1);
                            gl.drawElementsInstanced(gl.TRIANGLES, buffer.triangleVertexIndexBuffer[j].numItems, gl.UNSIGNED_INT, 0, buffer.triangleInstanceOriginBuffer[j].numItems);
                        } else {
                            console.log("Oh, no orientations! Need to do something else.")
                            gl.disableVertexAttribArray(programInstancedRef.current.vertexInstanceOrientationAttribute);
                            gl.disableVertexAttribArray(programInstancedRef.current.vertexInstanceOrientationAttribute+1);
                            gl.disableVertexAttribArray(programInstancedRef.current.vertexInstanceOrientationAttribute+2);
                            gl.disableVertexAttribArray(programInstancedRef.current.vertexInstanceOrientationAttribute+3);
                        }
                        /*
                        console.log("Drawing",buffer.triangleVertexIndexBuffer[j].numItems,"triangles")
                        console.log("Buffer",buffer)
                        gl.drawElementsInstanced(gl.TRIANGLES, buffer.triangleVertexIndexBuffer[j].numItems, gl.UNSIGNED_INT, 0, buffer.triangleInstanceOriginBuffer[j].numItems);
                        */
                    }
                }
            }
        }
        gl.vertexAttribDivisor(programInstancedRef.current.vertexInstanceSizeAttribute, 0);
        gl.vertexAttribDivisor(programInstancedRef.current.vertexInstanceOriginAttribute, 0);
        gl.vertexAttribDivisor(programInstancedRef.current.vertexColourAttribute,0);
// useProgram is not a React hook.
// eslint-disable-next-line
        gl.useProgram(programRef.current);

        gl.uniform3fv(programRef.current.screenZ, screenZ);
        gl.uniformMatrix4fv(programRef.current.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(programRef.current.mvMatrixUniform, false, mvMatrix);

        for(let i = 0; i<16; i++)
            gl.disableVertexAttribArray(i);
        gl.enableVertexAttribArray(programRef.current.vertexColourAttribute);
        gl.enableVertexAttribArray(programRef.current.vertexPositionAttribute);
        gl.enableVertexAttribArray(programRef.current.vertexNormalAttribute);

        for (const buffer of myBuffers) {
            if(buffer.visible)
            if(!buffer.triangleInstanceOriginBuffer||buffer.triangleInstanceOriginBuffer.length===0){
                for (let j = 0; j < buffer.triangleVertexPositionBuffer.length; j++) {
                    if(buffer.bufferTypes[j]&&buffer.bufferTypes[j]==="TRIANGLES"&&buffer.triangleVertexPositionBuffer[j].numItems>0){
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleColourBuffer[j]);
                        gl.vertexAttribPointer(programRef.current.vertexColourAttribute, buffer.triangleColourBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[j]);
                        gl.vertexAttribPointer(programRef.current.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[j]);
                        gl.vertexAttribPointer(programRef.current.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[j]);
                        gl.drawElements(gl.TRIANGLES, buffer.triangleVertexIndexBuffer[j].numItems, gl.UNSIGNED_INT, 0);
                    }
                }
            }
        }
// useProgram is not a React hook.
// eslint-disable-next-line
        gl.useProgram(sphereProgramRef.current)
        gl.uniformMatrix4fv(sphereProgramRef.current.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(sphereProgramRef.current.mvMatrixUniform, false, mvMatrix);
        const invmat = mat4.create();
        const invmatin = mat4.create();
        mat4.set(invmatin,
                mvMatrix[0], mvMatrix[1], mvMatrix[2], 0.0,
                mvMatrix[4], mvMatrix[5], mvMatrix[6], 0.0,
                mvMatrix[8], mvMatrix[9], mvMatrix[10], 0.0,
                0.0, 0.0, 0.0, 1.0);
        mat4.invert(invmat, invmatin);
        gl.uniformMatrix4fv(sphereProgramRef.current.mvInvMatrixUniform, false, invmat);

        for(let i = 0; i<16; i++)
            gl.disableVertexAttribArray(i);

        gl.enableVertexAttribArray(sphereProgramRef.current.vertexPositionAttribute);
        gl.enableVertexAttribArray(sphereProgramRef.current.vertexNormalAttribute);
        gl.enableVertexAttribArray(sphereProgramRef.current.vertexTextureAttribute);

        gl.enableVertexAttribArray(sphereProgramRef.current.vertexColourAttribute);
        gl.enableVertexAttribArray(sphereProgramRef.current.offsetAttribute);
        gl.enableVertexAttribArray(sphereProgramRef.current.sizeAttribute);

        gl.vertexAttribDivisor(sphereProgramRef.current.sizeAttribute, 1);
        gl.vertexAttribDivisor(sphereProgramRef.current.offsetAttribute, 1);
        gl.vertexAttribDivisor(sphereProgramRef.current.vertexColourAttribute,1);

        for (const buffer of myBuffers) {
            if(buffer.visible)
            if(buffer.triangleInstanceOriginBuffer&&buffer.triangleInstanceOriginBuffer.length>0){
                for (let j = 0; j < buffer.triangleInstanceOriginBuffer.length; j++) {
                    if(buffer.bufferTypes[j]&&buffer.bufferTypes[j]==="PERFECT_SPHERES"&&buffer.triangleInstanceOriginBuffer[j].numItems>0){
                        gl.bindBuffer(gl.ARRAY_BUFFER, imageBuffersRef.current.triangleVertexNormalBuffer[j]);
                        gl.vertexAttribPointer(sphereProgramRef.current.vertexNormalAttribute, imageBuffersRef.current.triangleVertexNormalBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, imageBuffersRef.current.triangleVertexPositionBuffer[j]);
                        gl.vertexAttribPointer(sphereProgramRef.current.vertexPositionAttribute, imageBuffersRef.current.triangleVertexPositionBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, imageBuffersRef.current.triangleVertexTextureBuffer[j]);
                        gl.vertexAttribPointer(sphereProgramRef.current.vertexTextureAttribute, imageBuffersRef.current.triangleVertexTextureBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleInstanceOriginBuffer[j]);
                        gl.vertexAttribPointer(sphereProgramRef.current.offsetAttribute, buffer.triangleInstanceOriginBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleInstanceSizeBuffer[j]);
                        gl.vertexAttribPointer(sphereProgramRef.current.sizeAttribute, buffer.triangleInstanceSizeBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleColourBuffer[j]);
                        gl.vertexAttribPointer(sphereProgramRef.current.vertexColourAttribute, buffer.triangleColourBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, imageBuffersRef.current.triangleVertexIndexBuffer[j]);
                        gl.drawElementsInstanced(gl.TRIANGLES, imageBuffersRef.current.triangleVertexIndexBuffer[j].numItems, gl.UNSIGNED_INT, 0, buffer.triangleInstanceOriginBuffer[j].numItems);
                    }
                }
            }
        }
        gl.vertexAttribDivisor(sphereProgramRef.current.sizeAttribute, 0);
        gl.vertexAttribDivisor(sphereProgramRef.current.offsetAttribute, 0);
        gl.vertexAttribDivisor(sphereProgramRef.current.vertexColourAttribute,0);
    }

    const buildDiskBuffers = ():DisplayBuffer => {

        if(!canvasRefWebGL)
            return

        if(!canvasRefWebGL.current)
            return

        if(!programInstancedRef.current)
            return

        const canvasWebGL = canvasRefWebGL.current
        const gl = canvasWebGL.getContext("webgl2")

        const diskIndices = [];
        const diskNormals = [];
        const imageVertices = [];
        const accuStep = 90;
        let diskIdx = 0;
        imageVertices.push(0.0);
        imageVertices.push(0.0);
        imageVertices.push(0.0);
        diskNormals.push(0.0);
        diskNormals.push(0.0);
        diskNormals.push(-1.0);
        diskIndices.push(diskIdx++);
        for(let theta = 45; theta <= 405; theta += accuStep) {
            const theta1 = Math.PI * (theta) / 180.0;
            const x1 = Math.cos(theta1);
            const y1 = Math.sin(theta1);
            imageVertices.push(x1);
            imageVertices.push(-y1);
            imageVertices.push(0.0);
            diskNormals.push(0.0);
            diskNormals.push(0.0);
            diskNormals.push(-1.0);
            diskIndices.push(diskIdx++);
        }
        const imageBuffer = new DisplayBuffer();
        imageBuffer.triangleVertexNormalBuffer.push(gl.createBuffer() as MGWebGLBuffer);
        imageBuffer.triangleVertexIndexBuffer.push(gl.createBuffer() as MGWebGLBuffer);
        imageBuffer.triangleVertexTextureBuffer.push(gl.createBuffer() as MGWebGLBuffer);
        imageBuffer.triangleVertexPositionBuffer.push(gl.createBuffer() as MGWebGLBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, imageBuffer.triangleVertexIndexBuffer[0]);
        imageBuffer.triangleVertexIndexBuffer[0].itemSize = 1;
        imageBuffer.triangleVertexIndexBuffer[0].numItems = diskIndices.length;
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(diskIndices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, imageBuffer.triangleVertexNormalBuffer[0]);
        imageBuffer.triangleVertexNormalBuffer[0].itemSize = 3;
        imageBuffer.triangleVertexNormalBuffer[0].numItems = diskNormals.length / 3;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(diskNormals), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, imageBuffer.triangleVertexPositionBuffer[0]);
        imageBuffer.triangleVertexPositionBuffer[0].itemSize = 3;
        imageBuffer.triangleVertexPositionBuffer[0].numItems = imageVertices.length / 3;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(imageVertices), gl.DYNAMIC_DRAW);

        const imageTextures = [0.5, 0.5, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0];
        gl.bindBuffer(gl.ARRAY_BUFFER, imageBuffer.triangleVertexTextureBuffer[0]);
        imageBuffer.triangleVertexTextureBuffer[0].itemSize = 2;
        imageBuffer.triangleVertexTextureBuffer[0].numItems = imageTextures.length / 2;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(imageTextures), gl.STATIC_DRAW);

        return imageBuffer
    }

    const plotTheData = async () => {

        if(!canvasRef)
            return

        if(!canvasRef.current)
            return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")

        const scale = atomSpan * 0.75

        const fogStart = fogClipOffset - gl_fog_start
        const fogEnd = gl_fog_end - fogClipOffset
        const clipStartPos = plotWidth * .5 - clipStart / scale * plotWidth * .5
        const clipEndPos = plotWidth * .5 + clipEnd / scale * plotWidth * .5
        const fogStartPos = plotWidth * .5 - fogStart / scale * plotWidth * .5
        const fogEndPos = plotWidth * .5 + fogEnd / scale * plotWidth * .5
        const depthBlurDepthPos = depthBlurDepth * plotWidth

        ctx.save()

        ctx.clearRect(0,0,canvas.width,canvas.height)
        ctx.fillStyle = "#77777700"
        ctx.fillRect(0,0,canvas.width,canvas.height)
        ctx.fillStyle = "#00222244"
        ctx.fillRect(0,0,clipStartPos,canvas.height)
        ctx.fillRect(clipEndPos,0,canvas.width-clipStartPos,canvas.height)


        const fogGradient = ctx.createLinearGradient(fogStartPos, 0, fogEndPos, 0)
        fogGradient.addColorStop(0, "#ffffff00");
        fogGradient.addColorStop(1, "#ffffffff");

        ctx.fillStyle = fogGradient
        const fogDrawStart = Math.max(fogStartPos,clipStartPos)
        const fogDrawWidth = Math.min(fogEndPos,clipEndPos)-fogDrawStart
        ctx.fillRect(fogDrawStart,0,fogDrawWidth,canvas.height)

        let hovering = false
        let drawText = ""

        canvas.style.cursor = "auto"
        if((grabbed===GrabHandle.NONE||grabbed===GrabHandle.FOG_START)&&Math.abs(moveX-fogStartPos)<5&&!hovering){
            ctx.strokeStyle = "white"
            ctx.lineWidth = 4
            hovering = true
            drawText = "Front fog " + fogStart.toFixed(2)
        } else {
            ctx.strokeStyle = "yellow"
            ctx.lineWidth = 3
        }
        ctx.beginPath()
        ctx.moveTo(fogStartPos,0)
        ctx.lineTo(fogStartPos,canvas.height)
        ctx.stroke()

        if((grabbed===GrabHandle.NONE||grabbed===GrabHandle.FOG_END)&&Math.abs(moveX-fogEndPos)<5&&!hovering){
            ctx.strokeStyle = "white"
            ctx.lineWidth = 4
            hovering = true
            drawText = "Back fog " + fogEnd.toFixed(2)
        } else {
            ctx.strokeStyle = "yellow"
            ctx.lineWidth = 3
        }
        ctx.beginPath()
        ctx.moveTo(fogEndPos,0)
        ctx.lineTo(fogEndPos,canvas.height)
        ctx.stroke()

        if(useOffScreenBuffers){
            if((grabbed===GrabHandle.NONE||grabbed===GrabHandle.BLUR_DEPTH)&&Math.abs(moveX-depthBlurDepthPos)<5&&!hovering){
                ctx.strokeStyle = "white"
                ctx.lineWidth = 4
                hovering = true
                drawText = "Blur depth "+depthBlurDepth.toFixed(2)
            } else {
                ctx.strokeStyle = "lightblue"
                ctx.lineWidth = 3
            }

            ctx.beginPath()
            ctx.moveTo(depthBlurDepthPos,0)
            ctx.lineTo(depthBlurDepthPos,canvas.height)
            ctx.stroke()
        }

        if((grabbed===GrabHandle.NONE||grabbed===GrabHandle.CLIP_START)&&Math.abs(moveX-clipStartPos)<5&&!hovering){
            ctx.strokeStyle = "white"
            ctx.lineWidth = 4
            hovering = true
            drawText = "Front clip " + clipStart.toFixed(2)
        } else {
            ctx.strokeStyle = "red"
            ctx.lineWidth = 3
        }
        ctx.beginPath()
        ctx.moveTo(clipStartPos,0)
        ctx.lineTo(clipStartPos,canvas.height)
        ctx.stroke()

        if((grabbed===GrabHandle.NONE||grabbed===GrabHandle.CLIP_END)&&Math.abs(moveX-clipEndPos)<5&&!hovering){
            ctx.strokeStyle = "white"
            ctx.lineWidth = 4
            hovering = true
            drawText = "Back clip " + clipEnd.toFixed(2)
        } else {
            ctx.strokeStyle = "red"
            ctx.lineWidth = 3
        }
        ctx.beginPath()
        ctx.moveTo(clipEndPos,0)
        ctx.lineTo(clipEndPos,canvas.height)
        ctx.stroke()

        ctx.fillStyle = "white"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(5, canvas.height/2, 30, -0.7, 0.7)
        ctx.fill()

        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(29,canvas.height/2-20)
        ctx.lineTo(5,canvas.height/2)
        ctx.lineTo(29,canvas.height/2+20)
        ctx.fill()

        ctx.fillStyle = "lightblue"
        ctx.beginPath()
        ctx.arc(5, canvas.height/2, 30, -0.6, 0.6)
        ctx.fill()

        ctx.fillStyle = "black"
        ctx.beginPath()
        ctx.arc(5, canvas.height/2, 30, -0.3, 0.3)
        ctx.fill()

        ctx.strokeStyle = "black"
        ctx.beginPath()
        ctx.moveTo(35,canvas.height/2-25)
        ctx.lineTo(5,canvas.height/2)
        ctx.lineTo(35,canvas.height/2+25)
        ctx.stroke()

        if(drawText.length>0){
            ctx.font = "11pt Arial"
            ctx.fillStyle = "white"
            const tm = ctx.measureText(drawText)
            ctx.fillRect(3,20-tm.actualBoundingBoxDescent-tm.actualBoundingBoxAscent-2,tm.width+4,tm.fontBoundingBoxAscent + tm.fontBoundingBoxDescent+4)
            ctx.fillStyle = "black"
            ctx.fillText(drawText,5,20)
        }

        if(hovering) canvas.style.cursor = "ew-resize"
        ctx.restore()
        drawGL(canvas.width,canvas.height)

    }

    const getXY = (evt) => {
        if(!canvasRef||!canvasRef.current) return

        const canvas = canvasRef.current
        const offset = getOffsetRect(canvas)
        let x: number
        let y: number

        if (evt.pageX || evt.pageY) {
            x = evt.pageX
            y = evt.pageY
        } else {
            x = evt.clientX
            y = evt.clientY
        }
        x -= offset.left
        y -= offset.top

        return [x,y]
    }

    const handleMouseDown = (evt) => {

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)

        setMouseHeldDown(true)

        const scale = atomSpan * 0.75

        const fogStart = fogClipOffset - gl_fog_start
        const fogEnd = gl_fog_end - fogClipOffset
        const clipStartPos = plotWidth * .5 - clipStart / scale * plotWidth * .5
        const clipEndPos = plotWidth * .5 + clipEnd / scale * plotWidth * .5
        const fogStartPos = plotWidth * .5 - fogStart / scale * plotWidth * .5
        const fogEndPos = plotWidth * .5 + fogEnd / scale * plotWidth * .5
        const depthBlurDepthPos = depthBlurDepth * plotWidth

        if(Math.abs(x-clipStartPos)<5){
            setGrabbed(GrabHandle.CLIP_START)
        } else if(Math.abs(x-clipEndPos)<5){
            setGrabbed(GrabHandle.CLIP_END)
        } else if(Math.abs(x-fogStartPos)<5){
            setGrabbed(GrabHandle.FOG_START)
        } else if(Math.abs(x-fogEndPos)<5){
            setGrabbed(GrabHandle.FOG_END)
        } else if(Math.abs(x-depthBlurDepthPos)<5 && useOffScreenBuffers){
            setGrabbed(GrabHandle.BLUR_DEPTH)
        } else {
            setGrabbed(GrabHandle.NONE)
        }

        setClickX(x)
        setClickY(y)

    }

    const handleMouseMove = useCallback((evt) => {

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)

        const scale = atomSpan * 0.75

        if(grabbed===GrabHandle.CLIP_START){
            const newValue = (plotWidth * 0.5 - x) * scale / plotWidth / 0.5
            dispatch(setClipStart(newValue))
        } else if(grabbed===GrabHandle.CLIP_END){
            const newValue = (x - plotWidth * 0.5) * scale / plotWidth / 0.5
            dispatch(setClipEnd(newValue))
        } else if(grabbed===GrabHandle.FOG_START){
            const newValue = (plotWidth * 0.5 -x) * scale / plotWidth / 0.5
            dispatch(setFogStart(fogClipOffset - newValue));
        } else if(grabbed===GrabHandle.FOG_END){
            const newValue = (x - plotWidth * 0.5) * scale / plotWidth / 0.5
            dispatch(setFogEnd(newValue + fogClipOffset))
        } else if(grabbed===GrabHandle.BLUR_DEPTH){
            if(useOffScreenBuffers){
                const newValue = x / plotWidth
                dispatch(setDepthBlurDepth(newValue))
            }
        }

        setMoveX(x)
        setMoveY(y)

    },[mouseHeldDown,clickX,clickY,releaseX,releaseY])

    const handleMouseUp = useCallback(async(evt) => {

        setMouseHeldDown(false)

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)
        setReleaseX(x)
        setReleaseY(y)
        setGrabbed(GrabHandle.NONE)

    },[clickX,clickY,releaseX,releaseY])

    useEffect(() => {

        canvasRef.current.addEventListener("mousemove", handleMouseMove , false)
        canvasRef.current.addEventListener("mousedown", handleMouseDown , false)
        canvasRef.current.addEventListener("mouseup", handleMouseUp , false)

        return () => {
            if (canvasRef.current !== null) {
                canvasRef.current.removeEventListener("mousemove", handleMouseMove)
                canvasRef.current.removeEventListener("mousedown", handleMouseDown)
                canvasRef.current.removeEventListener("mouseup", handleMouseUp)
            }
        }

    }, [canvasRef, handleMouseMove,handleMouseUp,handleMouseDown])

    useEffect(() => {

        if(!canvasRefWebGL) return
        if(!canvasRefWebGL.current) return

        const canvasWebGL = canvasRefWebGL.current
        const gl = canvasWebGL.getContext("webgl2")
        const vertexShaderInstanced = getShader(gl, triangle_side_on_view_instanced_vertex_shader_source, "vertex");
        const fragmentShader = getShader(gl, triangle_side_on_view_fragment_shader_source, "fragment");
        programInstancedRef.current = initSideOnShadersInstanced(vertexShaderInstanced,fragmentShader,gl)
        const vertexShader = getShader(gl, triangle_side_on_view_vertex_shader_source, "vertex");
        programRef.current = initSideOnShaders(vertexShader,fragmentShader,gl)
        const sphereVertexShader = getShader(gl, twod_side_on_view_vertex_shader_source, "vertex");
        const sphereFragmentShader = getShader(gl, perfect_sphere_side_on_view_fragment_shader_source, "fragment");
        sphereProgramRef.current = initSideOnSphereShaders(sphereVertexShader,sphereFragmentShader,gl)

        const clonedBuffers = cloneBuffers(displayBuffers,gl)
        buildBuffers(clonedBuffers,gl,true)
        myBuffers = clonedBuffers
        imageBuffersRef.current = buildDiskBuffers()

    }, [])

    useEffect(() => {
        plotTheData()
    }, [fogClipOffset,gl_fog_start,gl_fog_end,clipStart,clipEnd,depthBlurDepth,canvasRef.current,moveX,moveY,quat,storeMolecules,displayBuffers])


    return (
        <>
        <Stack
            gap={2}
            direction={props.stackDirection}
            style={{ display: "flex", alignItems: "start", width: "100%", height: "100%" }}
        >
            <Stack gap={2} direction="vertical">
                <ClipFogBlurOptionsPanel />
            </Stack>
            <Stack gap={1} direction="vertical">
                <div>
                <figure style={{position: "relative", top: 0, left: 0, width: `${plotWidth}px`, height: `${plotHeight}px`, margin: "0px"}}>
                <canvas style={{position: "absolute", top: 0, left: 0}} height={plotHeight} width={plotWidth} ref={canvasRefWebGL}></canvas>
                <canvas style={{position: "absolute", top: 0, left: 0}} height={plotHeight} width={plotWidth} ref={canvasRef}></canvas>
                </figure>
                </div>
            </Stack>
        </Stack>
        </>
    );
};

export const MoorhenSceneSlidersModal = () => {
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

    const dispatch = useDispatch();

    const { enqueueSnackbar } = useSnackbar();

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.SCENE_SLIDERS}
            left={width / 5}
            top={height / 6}
            headerTitle="Fog/clip/blur"
            minHeight={convertViewtoPx(40, height)}
            minWidth={convertRemToPx(40)}
            maxHeight={convertViewtoPx(75, height)}
            maxWidth={convertRemToPx(60)}
            enforceMaxBodyDimensions={true}
            body={<MoorhenSlidersSettings stackDirection="horizontal" />}
            footer={null}
            additionalHeaderButtons={[
                <Tooltip title={"Move to side panel"} key={1}>
                    <Button
                        variant="white"
                        style={{ margin: "0.1rem", padding: "0.1rem" }}
                        onClick={() => {
                            dispatch(hideModal(modalKeys.SCENE_SLIDERS));
                            enqueueSnackbar(modalKeys.SCENE_SLIDERS, {
                                variant: "sideBar",
                                persist: true,
                                anchorOrigin: { horizontal: "right", vertical: "bottom" },
                                title: "Scene settings",
                                modalId: modalKeys.SCENE_SLIDERS,
                                children: (
                                    <div style={{ overflowY: "scroll", overflowX: "hidden", maxHeight: "50vh" }}>
                                        <MoorhenSlidersSettings stackDirection="vertical" />
                                    </div>
                                ),
                            });
                        }}
                    >
                        <LastPageOutlined />
                    </Button>
                </Tooltip>,
            ]}
        />
    );
};
