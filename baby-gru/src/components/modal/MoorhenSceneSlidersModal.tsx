import * as vec3 from 'gl-matrix/vec3';
import * as mat4 from 'gl-matrix/mat4';
import { useEffect, useRef, useCallback, useState, useMemo } from "react"
import { useDispatch, useSelector, useStore } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { DisplayBuffer } from '../../WebGLgComponents/displayBuffer'
import { cloneBuffers, buildBuffers } from '../../WebGLgComponents/buildBuffers'
import { quatToMat4 } from '../../WebGLgComponents/quatToMat4.js';
import {RootState } from '../../store/MoorhenReduxStore';
import { MoorhenStack } from "../interface-base";
import { MoorhenToggle, MoorhenSlider } from "../inputs";
import { Bounds, boundsAround, mapSpan, sceneSpan } from "../../utils/sceneExtent";
import {
    Handle,
    HandleId,
    constrainOffset,
    handleAtPixel,
    offsetOfPixel,
    partnerOf,
    pixelOfHandle,
    plotHalfRange,
} from "../../utils/sceneSliderGeometry";
import { centreOfObject, extentOfObject } from "../../store/threeDObjectsSlice";
import { getShader, initSideOnShaders, initSideOnShadersInstanced, initSideOnSphereShaders } from '../../WebGLgComponents/mgWebGLShaders'
import {
    setDepthBlurDepth,
    setDepthBlurRadius,
    setDepthPeelLayers,
    setResetClippingFogging,
    setUseOffScreenBuffers,
} from "../../store/sceneSettingsSlice";
import {
    setFogStart,
    setFogEnd,
    setClipStart,
    setClipEnd,
} from "../../store";
import { triangle_side_on_view_instanced_vertex_shader_source } from '../../WebGLgComponents/webgl-2/triangle-side-on-view-instanced-vertex-shader.js';
import { triangle_side_on_view_vertex_shader_source } from '../../WebGLgComponents/webgl-2/triangle-side-on-view-vertex-shader.js';
import { triangle_side_on_view_fragment_shader_source } from '../../WebGLgComponents/webgl-2/triangle-side-on-view-fragment-shader.js';
import { twod_side_on_view_vertex_shader_source } from '../../WebGLgComponents/webgl-2/twodshapes-side-on-view-vertex-shader.js';
import { perfect_sphere_side_on_view_fragment_shader_source } from '../../WebGLgComponents/webgl-2/perfect-sphere-side-on-view-fragment-shader.js';

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

export const MoorhenSlidersSettings = (props: { stackDirection: "horizontal" | "vertical", width?: number }) => {

    const store = useStore<RootState>()
    const dispatch = useDispatch();
    const resetClippingFogging = useSelector((state: moorhen.State) => state.sceneSettings.resetClippingFogging);
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers);

    const gl_fog_start = useSelector((state: moorhen.State) => state.sceneSettings.fogStart);
    const gl_fog_end = useSelector((state: moorhen.State) => state.sceneSettings.fogEnd);
    const clipStart = useSelector((state: moorhen.State) => state.sceneSettings.clipStart);
    const clipEnd = useSelector((state: moorhen.State) => state.sceneSettings.clipEnd);
    const blurSize = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurRadius);
    const depthPeelLayers = useSelector((state: moorhen.State) => state.sceneSettings.depthPeelLayers);

    const [useFog, setUseFog] = useState<boolean>(true);
    const [useClip, setUseClip] = useState<boolean>(true);
    const [backupFogNear, setBackupFogNear] = useState<number>(500.0);
    const [backupFogFar, setBackupFogFar] = useState<number>(500.0);
    const [backupClipNear, setBackupClipNear] = useState<number>(500.0);
    const [backupClipFar, setBackupClipFar] = useState<number>(500.0);

    const fogOffNear = 998.0
    const fogOffFar = 999.0

    const blurLabel = <>
             <span style={{display: "inline-block", width:"100px"}}>Depth blur</span>
             <span style={{color: "lightblue", backgroundColor:"#aaaaaa"}}><b>&#x2E3B;</b></span>
         </>

    const clipLabel = <>
             <span style={{display: "inline-block", width:"100px"}}>Clip</span>
             <span style={{color: "red", backgroundColor:"#aaaaaa"}}><b>&#x2E3B;</b></span>
         </>

    const fogLabel = <>
             <span style={{display: "inline-block", width:"100px"}}>Fog</span>
             <span style={{color: "yellow", backgroundColor:"#aaaaaa"}}><b>&#x2E3B;</b></span>
         </>

    const plotWidth = props.width ? props.width : 500
    const plotHeight = plotWidth *0.6
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasRefWebGL = useRef<HTMLCanvasElement>(null)
    /**
     * The same canvas, held in state so that its arrival triggers a render.
     *
     * The ref is kept because the drawing code reaches for it from callbacks, where a ref is the
     * right tool. What a ref cannot do is tell anything that it has been filled in, and the
     * buffers are built during render - see myBuffers below.
     */
    const [glCanvas, setGlCanvas] = useState<HTMLCanvasElement | null>(null)
    const attachGlCanvas = useCallback((element: HTMLCanvasElement | null) => {
        canvasRefWebGL.current = element
        setGlCanvas(element)
    }, [])

    const spanScaling = 0.75

    // For the scene span below: everything drawn counts towards it, not only the molecules.
    const maps = useSelector((state: moorhen.State) => state.maps);
    const threeDObjects = useSelector((state: moorhen.State) => state.threeDObjects.objects);
    const fogClipOffset = useSelector((state: moorhen.State) => state.sceneSettings.fogClipOffset);
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth);
    const quat = useSelector((state: moorhen.State) => state.glRef.quat)

    const programRef = useRef<null | SideOnProgram>(null);
    const programInstancedRef = useRef<null | SideOnProgramInstanced>(null);
    const sphereProgramRef = useRef<null | SideOnProgramSphere>(null);

    const imageBuffersRef = useRef<null | DisplayBuffer>(null);

    const displayBuffers = store.getState().glRef.displayBuffers
    const storeMolecules = store.getState().molecules.moleculeList
    const originState =  store.getState().sceneSettings.origin

    const [clickX, setClickX] = useState<number>(-1)
    const [clickY, setClickY] = useState<number>(-1)
    const [moveX, setMoveX] = useState<number>(-1)
    const [moveY, setMoveY] = useState<number>(-1)
    const [releaseX, setReleaseX] = useState<number>(-1)
    const [releaseY, setReleaseY] = useState<number>(-1)
    const [mouseHeldDown, setMouseHeldDown] = useState<boolean>(false)

    const [grabbed, setGrabbed] = useState<HandleId | null>(null)

    /**
     * The scene's buffers, cloned into this widget's own GL context.
     *
     * glCanvas rather than canvasRefWebGL.current is the dependency, and that is the whole
     * point. This runs during render, and a ref is not populated until the commit afterwards,
     * so on the very first render the canvas does not exist yet and this returned an empty
     * list. Neither of the old dependencies changes merely because the canvas has since
     * appeared, so the list stayed empty and the view came up blank - until something replaced
     * displayBuffers, which is why changing the zoom or the origin made it appear.
     *
     * Holding the canvas in state instead means its arrival is a render, and this runs again
     * with a context to build into.
     */
    const myBuffers: DisplayBuffer[] = useMemo(() => {

        if(!glCanvas)
            return []

        const gl = glCanvas.getContext("webgl2")

        const clonedBuffers = cloneBuffers(displayBuffers,gl)
        buildBuffers(clonedBuffers,store,gl)
        return clonedBuffers

    }, [glCanvas,displayBuffers,storeMolecules])

    /**
     * How far this widget's scale has to reach.
     *
     * Everything on screen counts, not only atoms. This used to measure the molecules alone and
     * fall back to 9999 when there were none, so a scene holding a mesh, a primitive or a map
     * got a widget spanning ten thousand angstroms and initial clip distances to match.
     *
     * Maps contribute their unit cell rather than their contour radius - see sceneExtent - so
     * that changing how much of a map is drawn does not move the scale underfoot.
     */
    const atomSpan = useMemo(() => {
        // Accumulated in place rather than collected into an array: a large structure has
        // hundreds of thousands of atoms and this runs whenever the buffers change.
        let haveAtoms = false;
        const min: [number, number, number] = [Infinity, Infinity, Infinity];
        const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

        displayBuffers.forEach(buffer => {
            if (buffer.visible && buffer.atoms) {
                buffer.atoms.forEach(atom => {
                    const p = [atom.x, atom.y, atom.z];
                    if (!p.every(Number.isFinite)) return;
                    haveAtoms = true;
                    for (let i = 0; i < 3; i++) {
                        if (p[i] < min[i]) min[i] = p[i];
                        if (p[i] > max[i]) max[i] = p[i];
                    }
                })
            }
        })

        // Atom coordinates and 3D object centres share a coordinate space, so they go in together
        // and a scene with two things far apart gets a span covering both.
        const positioned: (Bounds | null)[] = [haveAtoms ? { min, max } : null];
        threeDObjects.forEach(obj => {
            positioned.push(boundsAround(centreOfObject(obj), extentOfObject(obj)));
        })

        return sceneSpan({ positioned, sizes: maps.map(mapSpan) })
    }, [displayBuffers, threeDObjects, maps])

    /**
     * Each handle as a signed distance from the view centre, which is the one convention the
     * geometry helpers work in. Clip and fog store their near edge as a positive distance towards
     * the viewer, so those are negated.
     */
    const handles: Handle[] = useMemo(() => [
        { id: "clipStart", offset: -clipStart, visible: useClip },
        { id: "clipEnd", offset: clipEnd, visible: useClip },
        { id: "fogStart", offset: -(fogClipOffset - gl_fog_start), visible: useFog },
        { id: "fogEnd", offset: gl_fog_end - fogClipOffset, visible: useFog },
        { id: "blurDepth", offset: 0, visible: useOffScreenBuffers },
    ], [clipStart, clipEnd, gl_fog_start, gl_fog_end, fogClipOffset, useClip, useFog, useOffScreenBuffers])

    /**
     * Half the plot's extent, in angstroms.
     *
     * The scene span is the floor, not the answer: the range also stretches to contain every
     * visible handle. Handles used to be clamped to the edge when their value fell outside the
     * scene, and because the clamped pixel was then used to hit-test and to guard the drag, two
     * handles off the same end became one unreachable pixel. Fitting the range instead means
     * nothing is ever off the plot, so neither failure has anywhere to happen.
     */
    const plotRange = useMemo(
        () => plotHalfRange(atomSpan * spanScaling, handles),
        [atomSpan, handles])

    /** Where each handle is drawn, by id. */
    const handlePixels = useMemo(() => {
        const pixels = {} as Record<HandleId, number>
        handles.forEach(h => { pixels[h.id] = pixelOfHandle(h, plotRange, plotWidth, depthBlurDepth) })
        return pixels
    }, [handles, plotRange, plotWidth, depthBlurDepth])

    /** The offset a handle must not cross, or null when it has no partner. */
    const partnerOffset = (id: HandleId): number | null => {
        const partner = partnerOf(id)
        if (!partner) return null
        return handles.find(h => h.id === partner)?.offset ?? null
    }

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
        // plotRange, not the scene span: the 2D overlay is drawn to the same range, and the handles
        // would no longer line up with the molecule behind them if these two disagreed.
        mat4.ortho(pMatrix, -plotRange, plotRange, -plotRange * height/width, plotRange * height/width, 0.1, 1000.0);

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
                        gl.drawElementsInstanced(gl.TRIANGLE_FAN, imageBuffersRef.current.triangleVertexIndexBuffer[j].numItems, gl.UNSIGNED_INT, 0, buffer.triangleInstanceOriginBuffer[j].numItems);
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

        const fogStart = fogClipOffset - gl_fog_start
        const fogEnd = gl_fog_end - fogClipOffset

        // No clamping here any more. The range was fitted to these, so they are already on the plot.
        const clipStartPos = handlePixels.clipStart
        const clipEndPos = handlePixels.clipEnd
        const fogStartPos = handlePixels.fogStart
        const fogEndPos = handlePixels.fogEnd
        const depthBlurDepthPos = handlePixels.blurDepth

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

        if(useFog){
            if((grabbed===null||grabbed==="fogStart")&&Math.abs(moveX-fogStartPos)<5&&!hovering){
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

            if((grabbed===null||grabbed==="fogEnd")&&Math.abs(moveX-fogEndPos)<5&&!hovering){
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
        }

        if(useOffScreenBuffers){
            if((grabbed===null||grabbed==="blurDepth")&&Math.abs(moveX-depthBlurDepthPos)<5&&!hovering){
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

        if(useClip){
            if((grabbed===null||grabbed==="clipStart")&&Math.abs(moveX-clipStartPos)<5&&!hovering){
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

                if((grabbed===null||grabbed==="clipEnd")&&Math.abs(moveX-clipEndPos)<5&&!hovering){
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
        }

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

    const handleMouseDown = useCallback((evt) => {

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)

        setMouseHeldDown(true)
        // Nearest visible handle, rather than the first one in a fixed order that happened to be
        // within five pixels. Hidden handles are skipped too: fog that has been switched off used
        // to sit at whatever edge its 998/999 clamped to and swallow clicks meant for clip.
        setGrabbed(handleAtPixel(x, handles, plotRange, plotWidth, depthBlurDepth))

        setClickX(x)
        setClickY(y)

    },[handles, plotRange, plotWidth, depthBlurDepth])

    const handleMouseMove = useCallback((evt) => {

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)

        // Without this a release outside the canvas never reaches handleMouseUp, and the handle
        // then follows the pointer around with no button held down.
        if(grabbed && mouseHeldDown){

            if(grabbed === "blurDepth"){
                dispatch(setDepthBlurDepth(Math.min(1.0, Math.max(0.0, x / plotWidth))))
            } else {
                // Clamp the value, do not gate the dispatch. The old code only dispatched when the
                // pointer was past the partner's drawn pixel, so a partner pinned at the edge of
                // the plot made that test impossible to satisfy and the handle silently froze.
                const partner = partnerOffset(grabbed)
                const wanted = offsetOfPixel(x, plotRange, plotWidth)
                const offset = partner === null
                    ? wanted
                    : constrainOffset(grabbed, wanted, partner, plotRange, plotWidth)

                switch(grabbed){
                    case "clipStart": dispatch(setClipStart(-offset)); break
                    case "clipEnd":   dispatch(setClipEnd(offset)); break
                    case "fogStart":  dispatch(setFogStart(fogClipOffset + offset)); break
                    case "fogEnd":    dispatch(setFogEnd(fogClipOffset + offset)); break
                }
            }
        }

        setMoveX(x)
        setMoveY(y)

    },[grabbed, mouseHeldDown, handles, plotRange, plotWidth, fogClipOffset, dispatch])

    const releaseGrab = useCallback((evt) => {

        setMouseHeldDown(false)
        setGrabbed(null)

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)
        setReleaseX(x)
        setReleaseY(y)

    },[])

    useEffect(() => {

        const canvas = canvasRef.current
        if(!canvas) return

        canvas.addEventListener("mousemove", handleMouseMove , false)
        canvas.addEventListener("mousedown", handleMouseDown , false)
        canvas.addEventListener("mouseup", releaseGrab , false)
        canvas.addEventListener("mouseleave", releaseGrab , false)

        return () => {
            canvas.removeEventListener("mousemove", handleMouseMove)
            canvas.removeEventListener("mousedown", handleMouseDown)
            canvas.removeEventListener("mouseup", releaseGrab)
            canvas.removeEventListener("mouseleave", releaseGrab)
        }

    }, [handleMouseMove, releaseGrab, handleMouseDown])

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

        // The buffers were also built here, and assigned to myBuffers. That assignment went into
        // a render closure that had already returned, so it changed nothing anyone would later
        // read - while still creating a full set of GL buffers that nothing freed. The memo
        // above owns the buffers; this effect owns the programs.
        imageBuffersRef.current = buildDiskBuffers()

    }, [glCanvas])

    // glCanvas is in here so that the first draw happens once the canvas exists and the shader
    // programs have been created: without it this ran only before there was anything to draw
    // into, and the next draw waited on an unrelated change.
    useEffect(() => {
        plotTheData()
    }, [glCanvas,myBuffers,atomSpan,plotRange,handles,grabbed,fogClipOffset,gl_fog_start,gl_fog_end,clipStart,clipEnd,depthBlurDepth,canvasRef.current,moveX,moveY,quat,storeMolecules,displayBuffers])


    return (
        <>
        <MoorhenStack direction={props.stackDirection} card={true}>
            <span style={{ height: "2rem", margin: "0.2rem" }}>Clip, fog and depth blur</span>
            <MoorhenStack gap={1} direction="vertical">
                <div>
                <figure style={{position: "relative", top: 0, left: 0, width: `${plotWidth}px`, height: `${plotHeight}px`, margin: "0px"}}>
                <canvas style={{position: "absolute", top: 0, left: 0}} height={plotHeight} width={plotWidth} ref={attachGlCanvas}></canvas>
                <canvas style={{position: "absolute", top: 0, left: 0}} height={plotHeight} width={plotWidth} ref={canvasRef}></canvas>
                </figure>
                </div>
            </MoorhenStack>
            <MoorhenStack gap={2} direction="vertical">
                <MoorhenToggle
                    type="switch"
                    checked={resetClippingFogging}
                    onChange={() => {
                        dispatch(setResetClippingFogging(!resetClippingFogging));
                    }}
                    label="Reset clip and fog on zoom"
                />
                <MoorhenToggle
                    type="switch"
                    checked={useFog}
                    disabled={resetClippingFogging}
                    onChange={(e) => {
                        if(useFog){
                            setBackupFogNear(gl_fog_start)
                            setBackupFogFar(gl_fog_end)
                            dispatch(setFogStart(fogOffNear));
                            dispatch(setFogEnd(fogOffFar));
                        } else {
                            dispatch(setFogStart(backupFogNear));
                            dispatch(setFogEnd(backupFogFar));
                        }
                        setUseFog(e.target.checked)
                    }}
                    label={fogLabel}
                />
                <MoorhenToggle
                    type="switch"
                    checked={useClip}
                    disabled={resetClippingFogging}
                    onChange={(e) => {
                        if(useClip){
                            setBackupClipNear(clipStart)
                            setBackupClipFar(clipEnd)
                            dispatch(setClipStart(1.5*atomSpan));
                            dispatch(setClipEnd(1.5*atomSpan));
                        } else {
                            dispatch(setClipStart(backupClipNear));
                            dispatch(setClipEnd(backupClipFar));
                        }
                        setUseClip(e.target.checked)
                    }}
                    label={clipLabel}
                />
                <MoorhenToggle
                    type="switch"
                    checked={useOffScreenBuffers}
                    onChange={() => {
                        dispatch(setUseOffScreenBuffers(!useOffScreenBuffers));
                    }}
                    label={blurLabel}
                />
                <MoorhenSlider
                    isDisabled={!useOffScreenBuffers}
                    minVal={1.0}
                    maxVal={12.0}
                    sliderTitle="Blur size"
                    value={blurSize}
                    setValue={newValue => {
                        dispatch(setDepthBlurRadius(newValue))
                    }}
                    stepButtons={1}
                    decimalPlaces={0}
                />
                <MoorhenSlider
                    minVal={1.0}
                    maxVal={8.0}
                    sliderTitle="Transparency layers"
                    value={depthPeelLayers}
                    setValue={newValue => {
                        dispatch(setDepthPeelLayers(newValue))
                    }}
                    stepButtons={1}
                    decimalPlaces={0}
                />
            </MoorhenStack>
            </MoorhenStack>
        </>
    );
};

// export const MoorhenSceneSlidersModal = () => {
//     const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
//     const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

//     const dispatch = useDispatch();

//     return (
//         <MoorhenDraggableModalBase
//             modalId={modalKeys.SCENE_SLIDERS}
//             left={width / 5}
//             top={height / 6}
//             headerTitle="Fog/clip/blur"
//             minHeight={convertViewtoPx(40, height)}
//             minWidth={convertRemToPx(30)}
//             maxHeight={convertViewtoPx(75, height)}
//             maxWidth={convertRemToPx(60)}
//             enforceMaxBodyDimensions={true}
//             body={<MoorhenSlidersSettings stackDirection="vertical" />}
//             footer={null}
//             additionalHeaderButtons={[
//                 <Tooltip title={"Move to side panel"} key={1}>
//                     <Button
//                         variant="white"
//                         style={{ margin: "0.1rem", padding: "0.1rem" }}
//                         onClick={() => {
//                             dispatch(hideModal(modalKeys.SCENE_SLIDERS));
//                             enqueueSnackbar(modalKeys.SCENE_SLIDERS, {
//                                 variant: "sideBar",
//                                 persist: true,
//                                 anchorOrigin: { horizontal: "right", vertical: "bottom" },
//                                 title: "Scene settings",
//                                 modalId: modalKeys.SCENE_SLIDERS,
//                                 children: (
//                                     <div style={{ overflowY: "scroll", overflowX: "hidden", maxHeight: "50vh" }}>
//                                         <MoorhenSlidersSettings stackDirection="vertical" />
//                                     </div>
//                                 ),
//                             });
//                         }}
//                     >
//                         <LastPageOutlined />
//                     </Button>
//                 </Tooltip>,
//             ]}
//         />
//     );
// };
