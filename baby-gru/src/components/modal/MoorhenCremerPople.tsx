import * as vec3 from 'gl-matrix/vec3';
import * as mat4 from 'gl-matrix/mat4';
import * as quat4 from 'gl-matrix/quat';
import { useEffect, useRef, useCallback, useState } from "react"
import { useDispatch, useSelector, useStore } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { DisplayBuffer } from '../../WebGLgComponents/displayBuffer'
import { buildBuffers, createOtherDataOtherContext } from '../../WebGLgComponents/buildBuffers'
import { quatToMat4 } from '../../WebGLgComponents/quatToMat4.js';
import { RootState } from '../../store/MoorhenReduxStore';
import { MoorhenStack } from "../interface-base";
import { MoorhenToggle } from "../inputs";
import { getShader, initSideOnShaders, initSideOnShadersInstanced, initSideOnSphereShaders } from '../../WebGLgComponents/mgWebGLShaders'
import { createQuatFromAngle } from '../../WebGLgComponents/quatUtils'
import {
    setDepthBlurDepth,
    setResetClippingFogging,
    setUseOffScreenBuffers,
} from "../../store/sceneSettingsSlice";
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

const genSphere = (radius) => {

    const X_1_0 = 0.525731112119
    const X_1_1 = 0.000000000000
    const X_1_2 = 0.850650808352
    const X_1_3 = 0.309016994375
    const X_1_4 = 0.500000000000
    const X_1_5 = 0.809016994375
    const X_1_6 = 1.000000000000

    const icosa_1_col = [
    ]

    const icosa_1_vert = [
      -X_1_0, X_1_2, X_1_1,
      -X_1_3, X_1_5, X_1_4,
      X_1_1, X_1_6, X_1_1,
      X_1_1, X_1_0, X_1_2,
      X_1_3, X_1_5, X_1_4,
      X_1_0, X_1_2, X_1_1,
      -X_1_5, X_1_4, X_1_3,
      -X_1_2, X_1_1, X_1_0,
      -X_1_4, X_1_3, X_1_5,
      -X_1_4, -X_1_3, X_1_5,
      X_1_1, -X_1_0, X_1_2,
      X_1_1, X_1_1, X_1_6,
      X_1_4, X_1_3, X_1_5,
      X_1_4, -X_1_3, X_1_5,
      X_1_2, X_1_1, X_1_0,
      X_1_5, X_1_4, X_1_3,
      X_1_6, X_1_1, X_1_1,
      X_1_2, X_1_1, -X_1_0,
      X_1_5, X_1_4, -X_1_3,
      X_1_5, -X_1_4, X_1_3,
      X_1_0, -X_1_2, X_1_1,
      X_1_5, -X_1_4, -X_1_3,
      X_1_3, -X_1_5, X_1_4,
      -X_1_3, -X_1_5, X_1_4,
      -X_1_0, -X_1_2, X_1_1,
      X_1_1, -X_1_6, X_1_1,
      -X_1_3, -X_1_5, -X_1_4,
      X_1_1, -X_1_0, -X_1_2,
      X_1_3, -X_1_5, -X_1_4,
      X_1_4, -X_1_3, -X_1_5,
      X_1_1, X_1_1, -X_1_6,
      X_1_1, X_1_0, -X_1_2,
      X_1_4, X_1_3, -X_1_5,
      -X_1_4, -X_1_3, -X_1_5,
      -X_1_2, X_1_1, -X_1_0,
      -X_1_4, X_1_3, -X_1_5,
      -X_1_5, X_1_4, -X_1_3,
      -X_1_3, X_1_5, -X_1_4,
      X_1_3, X_1_5, -X_1_4,
      -X_1_6, X_1_1, X_1_1,
      -X_1_5, -X_1_4, X_1_3,
      -X_1_5, -X_1_4, -X_1_3
    ]

    const icosa_1_idxs = [
      0, 1, 2,
      3, 4, 1,
      5, 2, 4,
      1, 4, 2,
      0, 6, 1,
      7, 8, 6,
      3, 1, 8,
      6, 8, 1,
      7, 9, 8,
      10, 11, 9,
      3, 8, 11,
      9, 11, 8,
      3, 11, 12,
      10, 13, 11,
      14, 12, 13,
      11, 13, 12,
      3, 12, 4,
      14, 15, 12,
      5, 4, 15,
      12, 15, 4,
      14, 16, 15,
      17, 18, 16,
      5, 15, 18,
      16, 18, 15,
      14, 19, 16,
      20, 21, 19,
      17, 16, 21,
      19, 21, 16,
      10, 22, 13,
      20, 19, 22,
      14, 13, 19,
      22, 19, 13,
      10, 23, 22,
      24, 25, 23,
      20, 22, 25,
      23, 25, 22,
      24, 26, 25,
      27, 28, 26,
      20, 25, 28,
      26, 28, 25,
      27, 29, 28,
      17, 21, 29,
      20, 28, 21,
      29, 21, 28,
      27, 30, 29,
      31, 32, 30,
      17, 29, 32,
      30, 32, 29,
      27, 33, 30,
      34, 35, 33,
      31, 30, 35,
      33, 35, 30,
      34, 36, 35,
      0, 37, 36,
      31, 35, 37,
      36, 37, 35,
      0, 2, 37,
      5, 38, 2,
      31, 37, 38,
      2, 38, 37,
      31, 38, 32,
      5, 18, 38,
      17, 32, 18,
      38, 18, 32,
      7, 6, 39,
      0, 36, 6,
      34, 39, 36,
      6, 36, 39,
      7, 39, 40,
      34, 41, 39,
      24, 40, 41,
      39, 41, 40,
      7, 40, 9,
      24, 23, 40,
      10, 9, 23,
      40, 23, 9,
      27, 26, 33,
      24, 41, 26,
      34, 33, 41,
      26, 41, 33
    ]

    const sphere_pos = []

    icosa_1_vert.forEach(p => {
        sphere_pos.push(p * radius)
    })

    for(let icol=0; icol<icosa_1_vert.length/3; icol++){
        const r = Math.random()
        const g = Math.random()
        const b = Math.random()
        icosa_1_col.push(r)
        icosa_1_col.push(g)
        icosa_1_col.push(b)
        icosa_1_col.push(1.0)
    }

    const sphere_json = {
        prim_types: [["TRIANGLES"]],
        useIndices: [[true]],
        idx_tri: [[icosa_1_idxs]],
        vert_tri: [[sphere_pos]],
        norm_tri: [[icosa_1_vert]],
        col_tri: [[icosa_1_col]]
    }

    console.log(sphere_json)

    return sphere_json
}

export const MoorhenCremerPople = (props: { stackDirection: "horizontal" | "vertical", width?: number }) => {

    const store = useStore<RootState>()
    const dispatch = useDispatch();
    const resetClippingFogging = useSelector((state: moorhen.State) => state.sceneSettings.resetClippingFogging);
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers);

    const gl_fog_start = useSelector((state: moorhen.State) => state.glRef.fogStart);
    const gl_fog_end = useSelector((state: moorhen.State) => state.glRef.fogEnd);
    const clipStart = useSelector((state: moorhen.State) => state.glRef.clipStart);
    const clipEnd = useSelector((state: moorhen.State) => state.glRef.clipEnd);

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
    const plotHeight = plotWidth
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasRefWebGL = useRef<HTMLCanvasElement>(null)

    const initQuat = quat4.create();//useSelector((state: moorhen.State) => state.glRef.quat)

    const programRef = useRef<null | SideOnProgram>(null);
    const programInstancedRef = useRef<null | SideOnProgramInstanced>(null);
    const sphereProgramRef = useRef<null | SideOnProgramSphere>(null);

    const displayBuffers = store.getState().glRef.displayBuffers
    const storeMolecules = store.getState().molecules.moleculeList
    const originState =  store.getState().glRef.origin

    const [quat, setQuat] = useState<quat4>(initQuat)
    const [zoom, setZoom] = useState<number>(1.0)
    const [clickX, setClickX] = useState<number>(-1)
    const [clickY, setClickY] = useState<number>(-1)
    const [moveX, setMoveX] = useState<number>(-1)
    const [moveY, setMoveY] = useState<number>(-1)
    const [releaseX, setReleaseX] = useState<number>(-1)
    const [releaseY, setReleaseY] = useState<number>(-1)
    const [mouseHeldDown, setMouseHeldDown] = useState<boolean>(false)
    const [oldXY, setOldXY] = useState<[number,number]>([-1,-1])

    const [myBuffers, setMyBuffers] = useState<DisplayBuffer[]>([])

    useEffect(() => {

        if(!canvasRefWebGL)
            return

        if(!canvasRefWebGL.current)
            return

        const canvasWebGL = canvasRefWebGL.current
        const gl = canvasWebGL.getContext("webgl2")

        const theBuffers = createOtherDataOtherContext(genSphere(10),gl)
        buildBuffers(theBuffers,store,gl)
        setMyBuffers(theBuffers)

    }, [storeMolecules])

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
        mat4.ortho(pMatrix, -30*zoom, 30*zoom, -30*zoom * height/width, 30*zoom * height/width, -100.0, 100.0);

        const theMatrix = quatToMat4(quat);

        const mvMatrix = mat4.create();
        mat4.set(mvMatrix,
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
        )
        mat4.multiply(mvMatrix, mvMatrix, theMatrix);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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
    }

    const plotTheData = async () => {

        if(!canvasRef)
            return

        if(!canvasRef.current)
            return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")

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

        setOldXY([x,y])

        setMouseHeldDown(true)

    }

    const handleMouseMove = (evt) => {

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)

        if(mouseHeldDown){
            if(!evt.altKey){
                const rot_x_axis = vec3.create()
                const rot_y_axis = vec3.create()
                vec3.set(rot_x_axis, 1.0, 0.0, 0.0);
                vec3.set(rot_y_axis, 0.0, 1.0, 0.0);
                setOldXY([x,y])
                const xQ = createQuatFromAngle(oldXY[1]-y,rot_x_axis);
                const yQ = createQuatFromAngle(oldXY[0]-x,rot_y_axis);
                quat4.multiply(xQ, xQ, yQ);
                const newQuat = quat4.create();
                quat4.multiply(newQuat, quat, xQ);
                setQuat(newQuat)
            } else {
                const factor = 1.0 + (oldXY[1]-y) / 50.0;
                let newZoom = zoom * factor;
                if (newZoom < 0.1) {
                    newZoom = 0.1;
                }
                if (newZoom > 5.0) {
                    newZoom = 5.0;
                }
                setOldXY([x,y])
                setZoom(newZoom)
            }
        }

    }

    const handleMouseUp = useCallback(async(evt) => {

        setMouseHeldDown(false)

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)
        setReleaseX(x)
        setReleaseY(y)

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

        const theBuffers = createOtherDataOtherContext(genSphere(10),gl)
        buildBuffers(theBuffers,store,gl)
        setMyBuffers(theBuffers)

    }, [])

    useEffect(() => {
        plotTheData()
    }, [canvasRef.current,moveX,moveY,quat,storeMolecules,displayBuffers,zoom])

    return (
        <>
        <MoorhenStack direction={props.stackDirection} card={true}>
            <span style={{ height: "2rem", margin: "0.2rem" }}>Cremer-Pople analysis</span>
            <MoorhenStack gap={1} direction="vertical">
                <div>
                <figure style={{position: "relative", top: 0, left: 0, width: `${plotWidth}px`, height: `${plotHeight}px`, margin: "0px"}}>
                <canvas style={{position: "absolute", top: 0, left: 0}} height={plotHeight} width={plotWidth} ref={canvasRefWebGL}></canvas>
                <canvas style={{position: "absolute", top: 0, left: 0}} height={plotHeight} width={plotWidth} ref={canvasRef}></canvas>
                </figure>
                </div>
            </MoorhenStack>
        </MoorhenStack>
        </>
    );
};
