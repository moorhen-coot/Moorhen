import * as vec3 from 'gl-matrix/vec3';
import * as mat4 from 'gl-matrix/mat4';
import * as quat4 from 'gl-matrix/quat';
import { useDispatch, useStore } from "react-redux";
import { RootState } from '../../store/MoorhenReduxStore';
import { MoorhenStack } from "../interface-base";
import { useEffect, useRef, useState } from "react"
import { DisplayBuffer } from '../../WebGLgComponents/displayBuffer'
import { quatToMat4, quat4Inverse } from '../../WebGLgComponents/quatToMat4.js';
import { buildBuffers, createOtherDataOtherContext } from '../../WebGLgComponents/buildBuffers'
import { createQuatFromAngle } from '../../WebGLgComponents/quatUtils'
import { getShader, initSideOnShaders, initSideOnShadersInstanced, initSideOnSphereShaders } from '../../WebGLgComponents/mgWebGLShaders'
import { triangle_side_on_view_instanced_vertex_shader_source } from '../../WebGLgComponents/webgl-2/triangle-side-on-view-instanced-vertex-shader.js';
import { triangle_side_on_view_vertex_shader_source } from '../../WebGLgComponents/webgl-2/triangle-side-on-view-vertex-shader.js';
import { triangle_side_on_view_fragment_shader_source } from '../../WebGLgComponents/webgl-2/triangle-side-on-view-fragment-shader.js';
import { twod_side_on_view_vertex_shader_source } from '../../WebGLgComponents/webgl-2/twodshapes-side-on-view-vertex-shader.js';
import { perfect_sphere_side_on_view_fragment_shader_source } from '../../WebGLgComponents/webgl-2/perfect-sphere-side-on-view-fragment-shader.js';

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

export const SimpleWebGL = (props: { stackDirection: "horizontal" | "vertical", width?: number, handleClick?: (clickedDirection: [number,number,number] | null)=> void, getMesh:() => any, refreshKey?: any, pickRadius?: number }) => {

    const store = useStore<RootState>()
    const dispatch = useDispatch();

    const plotWidth = props.width ? props.width : 500
    const plotHeight = plotWidth
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasRefWebGL = useRef<HTMLCanvasElement>(null)

    const initQuat = quat4.create()

    const programRef = useRef<null | SideOnProgram>(null);
    const programInstancedRef = useRef<null | SideOnProgramInstanced>(null);
    const sphereProgramRef = useRef<null | SideOnProgramSphere>(null);

    // Bounding sphere of the current mesh, used to fit the view to the contents
    // so the same mesh frames correctly regardless of its absolute scale.
    const contentRadiusRef = useRef<number>(1.0);
    // Tracks which molecule the fit radius belongs to, so the framing only
    // re-fits on a molecule change — not when sub-meshes are toggled on/off.
    const fitMoleculeRef = useRef<any>(null);

    const displayBuffers = store.getState().glRef.displayBuffers
    const storeMolecules = store.getState().molecules.moleculeList

    const [origin, setOrigin] = useState<[number,number,number]>([0,0,0])
    const [quat, setQuat] = useState<quat4>(initQuat)
    const [zoom, setZoom] = useState<number>(1.0)
    const [mouseHeldDown, setMouseHeldDown] = useState<boolean>(false)
    const [oldXY, setOldXY] = useState<[number,number]>([-1,-1])
    const [moveDist, setMoveDist] = useState<number>(-1)

    const [myBuffers, setMyBuffers] = useState<DisplayBuffer[]>([])

    // Measure the bounding-sphere radius about the origin. The mesh is built
    // radially from the origin (cage, pins, rings all emanate from 0,0,0), so the
    // origin is the natural, stable pivot/centre — using the bounding-box centre
    // instead would drift when the asymmetric pins/rings are toggled.
    const measureContentBounds = (mesh) => {
        let maxR2 = 0
        let any = false
        const groups = mesh?.vert_tri ?? []
        for (const group of groups) {
            for (const verts of group) {
                for (let i = 0; i < verts.length; i += 3) {
                    const x = verts[i], y = verts[i + 1], z = verts[i + 2]
                    const r2 = x * x + y * y + z * z
                    if (r2 > maxR2) maxR2 = r2
                    any = true
                }
            }
        }
        if (!any) return
        const radius = Math.sqrt(maxR2)
        const safeRadius = radius > 0 ? radius : 1.0
        // Re-fit only when the molecule changes; otherwise keep the largest radius
        // seen so toggling sub-meshes (e.g. radial conformations) doesn't rezoom.
        if (fitMoleculeRef.current !== storeMolecules) {
            fitMoleculeRef.current = storeMolecules
            contentRadiusRef.current = safeRadius
        } else {
            contentRadiusRef.current = Math.max(contentRadiusRef.current, safeRadius)
        }
    }

    useEffect(() => {

        if(!canvasRefWebGL)
            return

        if(!canvasRefWebGL.current)
            return

        const setupBuffers = async () => {
            const canvasWebGL = canvasRefWebGL.current
            const gl = canvasWebGL.getContext("webgl2")

            const propMesh = await props.getMesh()
            measureContentBounds(propMesh)
            const theBuffers = createOtherDataOtherContext(propMesh,gl)

            buildBuffers(theBuffers,store,gl)
            setMyBuffers(theBuffers)
        }
        setupBuffers()

    }, [storeMolecules, props.refreshKey])

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
        // Blend so vertex alpha (e.g. the semi-transparent cage) is honoured.
        // Opaque geometry has alpha 1.0 and is unaffected.
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0.0,0.0,0.0,0.0);
        gl.viewport(0, 0, width, height);
        const screenZ = vec3.create();
        vec3.set(screenZ,0,0,1)
        // Fit the orthographic frustum to the mesh bounding sphere (with a small
        // margin) so zoom=1 frames the whole object regardless of its scale.
        const fit = contentRadiusRef.current * 1.1 * zoom
        const depth = contentRadiusRef.current * 4.0
        const pMatrix = mat4.create();
        mat4.ortho(pMatrix, -fit, fit, -fit * height/width, fit * height/width, -depth, depth);

        // Rotate about the origin (the mesh's natural radial centre).
        const mvMatrix = quatToMat4(quat);

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
        setMoveDist(0)

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
                setZoom(newZoom)
            }
            const newDist = moveDist + Math.abs(oldXY[0]-y) + Math.abs(oldXY[1]-y)
            setMoveDist(newDist)
        }
        setOldXY([x,y])
    }

    // Reconstruct the clicked direction in the mesh's local frame by intersecting
    // the orthographic pick ray with the sphere the targets sit on. Returns a unit
    // vector (front hemisphere) or null if the click missed the sphere.
    //
    // The view is fitted to the bounding sphere (radius contentRadius), but the
    // pickable targets (pins) lie on a smaller sphere of radius pickRadius. Using
    // the bounding radius would compress the recovered direction toward the pole
    // and confuse nearby pins, so we rescale by contentRadius/pickRadius to invert
    // the projection onto the *pin* sphere exactly.
    const computeClickDirection = (x: number, y: number): [number,number,number] | null => {
        if(!canvasRef.current) return null
        const width = canvasRef.current.width
        const height = canvasRef.current.height
        const margin = 1.1
        const pickRadius = (props.pickRadius && props.pickRadius > 0) ? props.pickRadius : contentRadiusRef.current
        const k = contentRadiusRef.current / pickRadius
        const ux = (2.0*(x/width) - 1.0) * margin * zoom * k
        const uy = (2.0*(y/height) - 1.0) * margin * zoom * k
        const r2 = ux*ux + uy*uy
        if(r2 > 1.0) return null
        const uz = Math.sqrt(1.0 - r2)
        // View-space point on the sphere (screen y is down, world y is up).
        const pView = vec3.fromValues(ux, -uy, uz)
        const invQuat = quat4.create()
        quat4Inverse(quat, invQuat)
        const invMat = quatToMat4(invQuat)
        const dir = vec3.create()
        vec3.transformMat4(dir, pView, invMat)
        vec3.normalize(dir, dir)
        return [dir[0], dir[1], dir[2]]
    }

    const handleMouseUp = (evt) => {

        setMouseHeldDown(false)

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)
        if(moveDist<4 && props.handleClick){
            props.handleClick(computeClickDirection(x,y))
        }

    }

    const handleWheel = (evt) => {

        if(!canvasRef||!canvasRef.current) return

        // Prevent the surrounding scrollable container (and the page) from
        // scrolling while the cursor is zooming the canvas.
        evt.preventDefault()

        const factor = 1.0 + evt.deltaY / 500.0
        let newZoom = zoom * factor
        if (newZoom < 0.1) {
            newZoom = 0.1
        }
        if (newZoom > 5.0) {
            newZoom = 5.0
        }
        setZoom(newZoom)

    }

    useEffect(() => {

        canvasRef.current.addEventListener("mousemove", handleMouseMove , false)
        canvasRef.current.addEventListener("mousedown", handleMouseDown , false)
        canvasRef.current.addEventListener("mouseup", handleMouseUp , false)
        // Non-passive so preventDefault() can stop the container/page scroll.
        canvasRef.current.addEventListener("wheel", handleWheel , { passive: false })

        return () => {
            if (canvasRef.current !== null) {
                canvasRef.current.removeEventListener("mousemove", handleMouseMove)
                canvasRef.current.removeEventListener("mousedown", handleMouseDown)
                canvasRef.current.removeEventListener("mouseup", handleMouseUp)
                canvasRef.current.removeEventListener("wheel", handleWheel)
            }
        }

    }, [canvasRef,handleMouseMove,handleMouseUp,handleMouseDown,handleWheel])

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

        const setupInitialBuffers = async () => {
            const propMesh = await props.getMesh()
            measureContentBounds(propMesh)
            const theBuffers = createOtherDataOtherContext(propMesh,gl)
            buildBuffers(theBuffers,store,gl)
            setMyBuffers(theBuffers)
        }
        setupInitialBuffers()

    }, [])

    useEffect(() => {
        plotTheData()
    }, [canvasRef.current,quat,storeMolecules,displayBuffers,zoom,myBuffers])

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
}

