import React from 'react';
import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import * as mat4 from 'gl-matrix/mat4';
import { moorhen } from "../types/moorhen";
import { webGL } from "../types/mgWebGL";
import { setIsWebGL2, setGLCtx, setDisplayBuffers, setCanvasSize } from "../store/glRefSlice"
import { parseAtomInfoLabel, guid, gemmiAtomPairsToCylindersInfo } from '../utils/utils';
import  { unProject } from './GLU.js';

//WebGL2 shaders
import { depth_peel_accum_vertex_shader_source as depth_peel_accum_vertex_shader_source_webgl2 } from './webgl-2/depth-peel-accum-vertex-shader.js';
import { depth_peel_accum_fragment_shader_source as depth_peel_accum_fragment_shader_source_webgl2 } from './webgl-2/depth-peel-accum-fragment-shader.js';
import { blur_x_simple_fragment_shader_source as blur_x_simple_fragment_shader_source_webgl2 } from './webgl-2/blur_x_simple-fragment-shader.js';
import { blur_y_simple_fragment_shader_source as blur_y_simple_fragment_shader_source_webgl2 } from './webgl-2/blur_y_simple-fragment-shader.js';
import { blur_vertex_shader_source as blur_vertex_shader_source_webgl2 } from './webgl-2/blur-vertex-shader.js';
import { overlay_fragment_shader_source as overlay_fragment_shader_source_webgl2 } from './webgl-2/overlay-fragment-shader.js';
import { ssao_fragment_shader_source as ssao_fragment_shader_source_webgl2 } from './webgl-2/ssao-fragment-shader.js';
import { edge_detect_fragment_shader_source as edge_detect_fragment_shader_source_webgl2 } from './webgl-2/edge-detect-fragment-shader.js';
import { blur_x_fragment_shader_source as blur_x_fragment_shader_source_webgl2 } from './webgl-2/blur_x-fragment-shader.js';
import { blur_y_fragment_shader_source as blur_y_fragment_shader_source_webgl2 } from './webgl-2/blur_y-fragment-shader.js';
import { lines_fragment_shader_source as lines_fragment_shader_source_webgl2 } from './webgl-2/lines-fragment-shader.js';
import { text_instanced_vertex_shader_source as text_instanced_vertex_shader_source_webgl2 } from './webgl-2/text-vertex-shader.js';
import { lines_vertex_shader_source as lines_vertex_shader_source_webgl2 } from './webgl-2/lines-vertex-shader.js';
import { perfect_sphere_fragment_shader_source as perfect_sphere_fragment_shader_source_webgl2 } from './webgl-2/perfect-sphere-fragment-shader.js';
import { perfect_sphere_outline_fragment_shader_source as perfect_sphere_outline_fragment_shader_source_webgl2 } from './webgl-2/perfect-sphere-outline-fragment-shader.js';
import { pointspheres_fragment_shader_source as pointspheres_fragment_shader_source_webgl2 } from './webgl-2/pointspheres-fragment-shader.js';
import { pointspheres_vertex_shader_source as pointspheres_vertex_shader_source_webgl2 } from './webgl-2/pointspheres-vertex-shader.js';
import { render_framebuffer_fragment_shader_source as render_framebuffer_fragment_shader_source_webgl2 } from './webgl-2/render-framebuffer-fragment-shader.js';
import { shadow_depth_twod_vertex_shader_source as shadow_depth_twod_vertex_shader_source_webgl2 } from './webgl-2/shadow-depth-twodshapes-vertex-shader.js';
import { shadow_depth_perfect_sphere_fragment_shader_source as shadow_depth_perfect_sphere_fragment_shader_source_webgl2 } from './webgl-2/shadow-depth-perfect-sphere-fragment-shader.js';
import { shadow_fragment_shader_source as shadow_fragment_shader_source_webgl2 } from './webgl-2/shadow-depth-fragment-shader.js';
import { flat_colour_fragment_shader_source as flat_colour_fragment_shader_source_webgl2 } from './webgl-2/flat-colour-fragment-shader.js';
import { shadow_vertex_shader_source as shadow_vertex_shader_source_webgl2 } from './webgl-2/shadow-depth-vertex-shader.js';
import { shadow_instanced_vertex_shader_source as shadow_instanced_vertex_shader_source_webgl2 } from './webgl-2/shadow-depth-instanced-vertex-shader.js';
import { text_fragment_shader_source as text_fragment_shader_source_webgl2 } from './webgl-2/text-fragment-shader.js';
import { circles_fragment_shader_source as circles_fragment_shader_source_webgl2 } from './webgl-2/circle-fragment-shader.js';
import { circles_vertex_shader_source as circles_vertex_shader_source_webgl2 } from './webgl-2/circle-vertex-shader.js';
import { thick_lines_vertex_shader_source as thick_lines_vertex_shader_source_webgl2 } from './webgl-2/thick-lines-vertex-shader.js';
import { thick_lines_normal_vertex_shader_source as thick_lines_normal_vertex_shader_source_webgl2 } from './webgl-2/thick-lines-normal-vertex-shader.js';
import { triangle_fragment_shader_source as triangle_fragment_shader_source_webgl2 } from './webgl-2/triangle-fragment-shader.js';
import { fxaa_shader_source as fxaa_shader_source_webgl2 } from './webgl-2/fxaa.js';
import { fxaa_shader_source as fxaa_shader_source_webgl1 } from './webgl-1/fxaa.js';
import { triangle_vertex_shader_source as triangle_vertex_shader_source_webgl2 } from './webgl-2/triangle-vertex-shader.js';
import { twod_fragment_shader_source as twod_fragment_shader_source_webgl2 } from './webgl-2/twodshapes-fragment-shader.js';
import { twod_vertex_shader_source as twod_vertex_shader_source_webgl2 } from './webgl-2/twodshapes-vertex-shader.js';
import { triangle_instanced_vertex_shader_source as triangle_instanced_vertex_shader_source_webgl2 } from './webgl-2/triangle-instanced-vertex-shader.js';
import { triangle_gbuffer_fragment_shader_source as triangle_gbuffer_fragment_shader_source_webgl2 } from './webgl-2/triangle-gbuffer-fragment-shader.js';
import { triangle_gbuffer_vertex_shader_source as triangle_gbuffer_vertex_shader_source_webgl2 } from './webgl-2/triangle-gbuffer-vertex-shader.js';
import { triangle_instanced_gbuffer_vertex_shader_source as triangle_instanced_gbuffer_vertex_shader_source_webgl2 } from './webgl-2/triangle-instanced-gbuffer-vertex-shader.js';
import { twod_gbuffer_vertex_shader_source as twod_gbuffer_vertex_shader_source_webgl2 } from './webgl-2/twodshapes-gbuffer-vertex-shader.js';
import { perfect_sphere_gbuffer_fragment_shader_source as perfect_sphere_gbuffer_fragment_shader_source_webgl2 } from './webgl-2/perfect-sphere-gbuffer-fragment-shader.js';
import { thick_lines_normal_gbuffer_vertex_shader_source as thick_lines_normal_gbuffer_vertex_shader_source_webgl2 } from './webgl-2/thick-lines-normal-gbuffer-vertex-shader.js';
import { triangle_texture_vertex_shader_source as triangle_texture_vertex_shader_source } from './webgl-2/triangle-texture-vertex-shader.js';
import { triangle_texture_fragment_shader_source as triangle_texture_fragment_shader_source } from './webgl-2/triangle-texture-fragment-shader.js';
//WebGL1 shaders
import { depth_peel_accum_vertex_shader_source as depth_peel_accum_vertex_shader_source_webgl1 } from './webgl-1/depth-peel-accum-vertex-shader.js';
import { depth_peel_accum_fragment_shader_source as depth_peel_accum_fragment_shader_source_webgl1 } from './webgl-1/depth-peel-accum-fragment-shader.js';
import { blur_vertex_shader_source as blur_vertex_shader_source_webgl1 } from './webgl-1/blur-vertex-shader.js';
import { overlay_fragment_shader_source as overlay_fragment_shader_source_webgl1 } from './webgl-1/overlay-fragment-shader.js';
import { ssao_fragment_shader_source as ssao_fragment_shader_source_webgl1 } from './webgl-1/ssao-fragment-shader.js';
import { edge_detect_fragment_shader_source as edge_detect_fragment_shader_source_webgl1 } from './webgl-1/edge-detect-fragment-shader.js';
import { blur_x_fragment_shader_source as blur_x_fragment_shader_source_webgl1 } from './webgl-1/blur_x-fragment-shader.js';
import { blur_y_fragment_shader_source as blur_y_fragment_shader_source_webgl1 } from './webgl-1/blur_y-fragment-shader.js';
import { lines_fragment_shader_source as lines_fragment_shader_source_webgl1 } from './webgl-1/lines-fragment-shader.js';
import { text_instanced_vertex_shader_source as text_instanced_vertex_shader_source_webgl1 } from './webgl-1/text-vertex-shader.js';
import { lines_vertex_shader_source as lines_vertex_shader_source_webgl1 } from './webgl-1/lines-vertex-shader.js';
import { perfect_sphere_fragment_shader_source as perfect_sphere_fragment_shader_source_webgl1 } from './webgl-1/perfect-sphere-fragment-shader.js';
import { perfect_sphere_outline_fragment_shader_source as perfect_sphere_outline_fragment_shader_source_webgl1 } from './webgl-1/perfect-sphere-outline-fragment-shader.js';
import { pointspheres_fragment_shader_source as pointspheres_fragment_shader_source_webgl1 } from './webgl-1/pointspheres-fragment-shader.js';
import { pointspheres_vertex_shader_source as pointspheres_vertex_shader_source_webgl1 } from './webgl-1/pointspheres-vertex-shader.js';
import { render_framebuffer_fragment_shader_source as render_framebuffer_fragment_shader_source_webgl1 } from './webgl-1/render-framebuffer-fragment-shader.js';
import { shadow_depth_twod_vertex_shader_source as shadow_depth_twod_vertex_shader_source_webgl1 } from './webgl-1/shadow-depth-twodshapes-vertex-shader.js';
import { shadow_depth_perfect_sphere_fragment_shader_source as shadow_depth_perfect_sphere_fragment_shader_source_webgl1 } from './webgl-1/shadow-depth-perfect-sphere-fragment-shader.js';
import { shadow_fragment_shader_source as shadow_fragment_shader_source_webgl1 } from './webgl-1/shadow-depth-fragment-shader.js';
import { flat_colour_fragment_shader_source as flat_colour_fragment_shader_source_webgl1 } from './webgl-1/flat-colour-fragment-shader.js';
import { shadow_vertex_shader_source as shadow_vertex_shader_source_webgl1 } from './webgl-1/shadow-depth-vertex-shader.js';
import { shadow_instanced_vertex_shader_source as shadow_instanced_vertex_shader_source_webgl1 } from './webgl-1/shadow-depth-instanced-vertex-shader.js';
import { text_fragment_shader_source as text_fragment_shader_source_webgl1 } from './webgl-1/text-fragment-shader.js';
import { circles_fragment_shader_source as circles_fragment_shader_source_webgl1 } from './webgl-1/circle-fragment-shader.js';
import { circles_vertex_shader_source as circles_vertex_shader_source_webgl1 } from './webgl-1/circle-vertex-shader.js';
import { thick_lines_vertex_shader_source as thick_lines_vertex_shader_source_webgl1 } from './webgl-1/thick-lines-vertex-shader.js';
import { thick_lines_normal_vertex_shader_source as thick_lines_normal_vertex_shader_source_webgl1 } from './webgl-1/thick-lines-normal-vertex-shader.js';
import { triangle_fragment_shader_source as triangle_fragment_shader_source_webgl1 } from './webgl-1/triangle-fragment-shader.js';
import { triangle_vertex_shader_source as triangle_vertex_shader_source_webgl1 } from './webgl-1/triangle-vertex-shader.js';
import { twod_fragment_shader_source as twod_fragment_shader_source_webgl1 } from './webgl-1/twodshapes-fragment-shader.js';
import { twod_vertex_shader_source as twod_vertex_shader_source_webgl1 } from './webgl-1/twodshapes-vertex-shader.js';
import { triangle_instanced_vertex_shader_source as triangle_instanced_vertex_shader_source_webgl1 } from './webgl-1/triangle-instanced-vertex-shader.js';
import { triangle_gbuffer_fragment_shader_source as triangle_gbuffer_fragment_shader_source_webgl1 } from './webgl-1/triangle-gbuffer-fragment-shader.js';
import { triangle_gbuffer_vertex_shader_source as triangle_gbuffer_vertex_shader_source_webgl1 } from './webgl-1/triangle-gbuffer-vertex-shader.js';
import { triangle_instanced_gbuffer_vertex_shader_source as triangle_instanced_gbuffer_vertex_shader_source_webgl1 } from './webgl-1/triangle-instanced-gbuffer-vertex-shader.js';
import { twod_gbuffer_vertex_shader_source as twod_gbuffer_vertex_shader_source_webgl1 } from './webgl-1/twodshapes-gbuffer-vertex-shader.js';
import { perfect_sphere_gbuffer_fragment_shader_source as perfect_sphere_gbuffer_fragment_shader_source_webgl1 } from './webgl-1/perfect-sphere-gbuffer-fragment-shader.js';
import { thick_lines_normal_gbuffer_vertex_shader_source as thick_lines_normal_gbuffer_vertex_shader_source_webgl1 } from './webgl-1/thick-lines-normal-gbuffer-vertex-shader.js';
import { DistanceBetweenPointAndLine, DihedralAngle, NormalizeVec3, vec3Cross, vec3Add, vec3Subtract, vec3Create  } from './mgMaths.js';
import { quatToMat4, quat4Inverse } from './quatToMat4.js';
import { TextCanvasTexture } from './textCanvasTexture'
import { DisplayBuffer } from './displayBuffer'
import { buildBuffers, appendOtherData } from './buildBuffers'
import { Camera } from './mgWebGLParts/camera'
import { setupStereoTransformations, setupMultiWayTransformations, setupThreeWayTransformations } from './mgWebGLParts/viewTransforms'
import { recreateSilhouetteBuffers, createEdgeDetectFramebufferBuffer, createGBuffers, createSSAOFramebufferBuffer, createSimpleBlurOffScreeenBuffers, recreateDepthPeelBuffers, recreateOffScreeenBuffers, initTextureFramebuffer } from './mgWebGLParts/framebuffers'
import { makeCircleCanvas, makeTextCanvas } from './mgWebGLParts/canvasTextures'
import { makeBlurBuffers, initializeSSAOBuffers, bindSSAOBuffers } from './mgWebGLParts/postProcessUniformBuffers'
import { doRightClick, doClick, doHover, doWheel, doMouseUpMeasure, doMouseDownMeasure, doMouseMoveMeasure, doMouseUp, doMiddleClick, doDoubleClick, doMouseMove, doMouseDown, handleKeyUp, handleKeyDown } from './mgWebGLParts/eventHandlers'
import { doSpinTestFrame, startSpinTest, stopSpinTest, setOrientationFrame, setOrientationAndZoomFrame, setOrientationAndZoomAnimated, setOrientationAnimated, setOriginOrientationAndZoomFrame, setViewAnimated, setOriginOrientationAndZoomAnimated, drawOriginAndZoomFrame, setOriginAndZoomAnimated, setOriginAnimated, drawOriginFrame, drawZoomFrame, setZoomAnimated } from './mgWebGLParts/cameraAnimations'
import { drawTransparent, drawImagesAndText, drawTexturedShapes, drawTextLabels, drawDistancesAndLabels, drawCircles, drawLineMeasures, drawCrosshairs, drawMouseTrack, drawFPSMeter, drawTextOverlays } from './mgWebGLParts/overlays'
import { drawBuffer, drawMaxElementsUInt, setupModelViewTransformMatrixInteractive, drawTransformMatrixInteractive, drawTransformMatrix, drawTransformMatrixInteractivePMV, drawTransformMatrixPMV } from './mgWebGLParts/bufferDraw'
import { drawPeel, drawTriangles, drawScene } from './mgWebGLParts/drawCore'
import { getDeviceScale} from './webGLUtils'
import {getShader, initInstancedOutlineShaders, initInstancedShadowShaders, initShadowShaders, initEdgeDetectShader, initSSAOShader, initBlurXShader, initBlurYShader, initSimpleBlurXShader, initSimpleBlurYShader, initOverlayShader, initRenderFrameBufferShaders, initCirclesShaders, initTextInstancedShaders, initTextBackgroundShaders, initOutlineShaders, initGBufferShadersPerfectSphere, initGBufferShadersInstanced, initGBufferShaders, initShadersDepthPeelAccum, initShadersTextured, initShaders, initShadersInstanced, initGBufferThickLineNormalShaders, initThickLineNormalShaders, initThickLineShaders, initLineShaders, initDepthShadowPerfectSphereShaders, initPerfectSphereOutlineShaders, initPerfectSphereShaders, initImageShaders, initTwoDShapesShaders, initPointSpheresShaders } from './mgWebGLShaders'
import { Dispatch, Store } from '@reduxjs/toolkit';
import { Root } from 'react-dom/client';
import { RootState } from '@/store/MoorhenReduxStore';

export function getOffsetRect(elem) {
    const box = elem.getBoundingClientRect();
    const body = document.body;
    const docElem = document.documentElement;

    const scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
    const scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
    const clientTop = docElem.clientTop || body.clientTop || 0;
    const clientLeft = docElem.clientLeft || body.clientLeft || 0;
    const top = box.top + scrollTop - clientTop;
    const left = box.left + scrollLeft - clientLeft;
    return { top: Math.round(top), left: Math.round(left) };
}

function initGL(canvas) {
    let gl;
    gl = canvas.getContext("webgl2", {stencil: true});
    let WEBGL2 = true;
    if (!gl) {
        gl = canvas.getContext("webgl", {stencil: true});
        WEBGL2 = false;
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry... Make sure harware acceleration is enabled in your browser settings.");
    }
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    if(WEBGL2){
        console.log("Max texture size:",gl.getParameter(gl.MAX_TEXTURE_SIZE))
        console.log("Max cube map texture size:",gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE))
        console.log("Max renderbuffer size:",gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))
        console.log("Max viewport size:",gl.getParameter(gl.MAX_VIEWPORT_DIMS))
        console.log("Max vertex attribs:",gl.getParameter(gl.MAX_VERTEX_ATTRIBS))
        console.log("Max varying vectors:",gl.getParameter(gl.MAX_VARYING_VECTORS))
        console.log("Max vertex uniform vectors:",gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS))
        console.log("Max fragment uniform vectors:",gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS))
        console.log("Max texture image units:",gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS))
        console.log("Max vertex texture image units:",gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS))
        console.log("Max combined texture image units:",gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS))
        console.log("MAX_ELEMENTS_INDICES:",gl.getParameter(gl.MAX_ELEMENTS_INDICES))
        console.log("MAX_ELEMENT_INDEX:",gl.getParameter(gl.MAX_ELEMENT_INDEX))
        console.log("MAX_VERTEX_ATTRIBS:",gl.getParameter(gl.MAX_VERTEX_ATTRIBS))
    }
    return {gl:gl,WEBGL2:WEBGL2};
}

export class MGWebGL extends React.Component implements webGL.MGWebGL {

        //Props
        declare props: webGL.MGWebGLPropsInterface;

        //Other stuff
        store: Store<RootState>;
        dispatch: Dispatch<any>;

        // Core view state now lives in a Camera collaborator. The accessors below
        // present the same `myQuat` / `zoom` / `origin` / `fogClipOffset` interface
        // that internal code and external consumers (glRef.current.*) already use.
        // Getters return the LIVE objects so in-place mutation (e.g.
        // quat4.multiply(this.myQuat, this.myQuat, …)) keeps working unchanged.
        private _camera: Camera = new Camera();
        get myQuat(): quat4 { return this._camera.quat; }
        set myQuat(q: quat4) { this._camera.quat = q; }
        get zoom(): number { return this._camera.zoom; }
        set zoom(z: number) { this._camera.zoom = z; }
        get origin(): [number, number, number] { return this._camera.origin; }
        set origin(o: [number, number, number]) { this._camera.origin = o; }
        get fogClipOffset(): number { return this._camera.fogClipOffset; }
        set fogClipOffset(v: number) { this._camera.fogClipOffset = v; }
        draggableMolecule: moorhen.Molecule
        activeMolecule: moorhen.Molecule
        specularPower: number;
        atomLabelDepthMode: boolean;
        clipCapPerfectSpheres: boolean;
        useOffScreenBuffers: boolean;
        blurSize: number;
        blurDepth:number;
        gl_fog_start: null | number;
        doDrawClickedAtomLines: boolean;
        gl_clipPlane0: null | Float32Array;
        gl_clipPlane1: null | Float32Array;
        gl_fog_end: number;
        light_colours_specular: Float32Array;
        light_colours_diffuse: Float32Array;
        light_positions: Float32Array;
        light_colours_ambient: Float32Array;
        background_colour: [number, number, number, number];
        drawEnvBOcc: boolean;
        environmentAtoms: {atom:webGL.clickAtom,label:string}[][];
        labelledAtoms: webGL.clickAtom[][];
        measuredAtoms: webGL.clickAtom[][];
        pixel_data: Uint8Array;
        screenshotBuffersReady: boolean;
        save_pixel_data: boolean;
        renderToTexture: boolean;
        transparentScreenshotBackground: boolean;
        showShortCutHelp: string[];
        WEBGL2: boolean;
        currentlyDraggedAtom: null | {atom: moorhen.AtomInfo; buffer: DisplayBuffer};
        canvas: HTMLCanvasElement;
        rttFramebuffer: webGL.MGWebGLFrameBuffer;
        doPerspectiveProjection: boolean;
        labelsTextCanvasTexture: TextCanvasTexture;
        texturedShapes: any[];
        circleTex: WebGLTexture;
        clipChangedEvent: Event;
        context2d: CanvasRenderingContext2D;
        doShadow: boolean;
        doSSAO: boolean;
        doEdgeDetect: boolean;
        depthThreshold: number;
        normalThreshold: number;
        scaleDepth: number;
        scaleNormal: number;
        occludeDiffuse: boolean;
        doPeel: boolean;
        doShadowDepthDebug: boolean;
        doSpin: boolean;
        doStenciling: boolean;
        doMultiView: boolean;
        multiViewRowsColumns: number[];
        specifyMultiViewRowsColumns: boolean;
        threeWayViewOrder: string;
        doThreeWayView: boolean;
        doSideBySideStereo: boolean;
        doCrossEyedStereo: boolean;
        doAnaglyphStereo: boolean;
        doneEvents: boolean;
        fpsText: string;
        measurePointsArray: any[];
        mspfArray: number[];
        ssaoRadius: number;
        ssaoBias: number;
        radius: number;
        reContourMapOnlyOnMouseUp: boolean;
        showAxes: boolean;
        showCrosshairs: boolean;
        showScaleBar: boolean;
        showFPS: boolean;
        declare state:  {width: number, height: number };
        displayBuffers: any[];
        gl:  any;
        canvasRef: any;
        animating: boolean;
        doDepthPeelPass: boolean;
        environmentRadius: number;
        edgeDetectFramebufferSize : number;
        ssaoFramebufferSize : number;
        gBuffersFramebufferSize : number;
        doRedraw: boolean;
        circleCanvasInitialized: boolean;
        textCanvasInitialized: boolean;
        gl_cursorPos: Float32Array;
        textCtx: CanvasRenderingContext2D;
        circleCtx: CanvasRenderingContext2D;
        atom_span: number;
        axesColourBuffer: WebGLBuffer;
        axesIndexBuffer: WebGLBuffer;
        axesNormalBuffer: WebGLBuffer;
        axesPositionBuffer: WebGLBuffer;
        axesTextColourBuffer: WebGLBuffer;
        axesTextIndexesBuffer: WebGLBuffer;
        axesTextNormalBuffer: WebGLBuffer;
        axesTextPositionBuffer: WebGLBuffer;
        axesTextTexCoordBuffer: WebGLBuffer;
        backColour: string | number[];
        blurXTexture: WebGLTexture;
        blurYTexture: WebGLTexture;
        simpleBlurXTexture: WebGLTexture;
        simpleBlurYTexture: WebGLTexture;
        calculatingShadowMap: boolean;
        cancelMouseTrack: boolean;
        diskBuffer: DisplayBuffer;
        diskVertices: number[];
        dx: number;
        dy: number;
        fogChangedEvent: Event;
        framebufferDrawBuffersReady: boolean;
        framebufferDrawIndexesBuffer: WebGLBuffer;
        framebufferDrawPositionBuffer: WebGLBuffer;
        framebufferDrawTexCoordBuffer: WebGLBuffer;
        glTextFont: string;
        gl_clipPlane2: Float32Array;
        gl_clipPlane3: Float32Array;
        gl_clipPlane4: Float32Array;
        gl_clipPlane5: Float32Array;
        gl_clipPlane6: Float32Array;
        gl_clipPlane7: Float32Array;
        gl_nClipPlanes: number;
        hitchometerColourBuffer: WebGLBuffer;
        hitchometerIndexBuffer: WebGLBuffer;
        hitchometerNormalBuffer: WebGLBuffer;
        hitchometerPositionBuffer: WebGLBuffer;
        doOrderIndependentTransparency: boolean;
        imageVertices: number[];
        init_x: number;
        init_y: number;
        mapLineWidth: number;
        measureCylinderBuffers: DisplayBuffer[];
        measureTextCanvasTexture: TextCanvasTexture;
        measureText2DCanvasTexture: TextCanvasTexture;
        mouseDown: boolean;
        measureHit: any;
        imageBuffer: DisplayBuffer;
        measureButton: number;
        measureDownPos: any;
        mouseDown_x: number;
        mouseDown_y: number;
        mouseDownedAt: number;
        mouseMoved: boolean;
        mouseTrackColourBuffer: WebGLBuffer;
        mouseTrackIndexBuffer: WebGLBuffer;
        mouseTrackNormalBuffer: WebGLBuffer;
        mouseTrackPoints: number[][];
        mouseTrackPositionBuffer: WebGLBuffer;
        moveFactor: number;
        pointsArray: number[];
        mvInvMatrix: Float32Array;
        mvMatrix: Float32Array;
        nAnimationFrames: number;
        nFrames: number;
        nPrevFrames: number;
        offScreenDepthTexture: WebGLTexture;
        offScreenFramebuffer: webGL.MGWebGLFrameBuffer;
        depthPeelFramebuffers: webGL.MGWebGLFrameBuffer[];
        depthPeelColorTextures: WebGLTexture[];
        depthPeelDepthTextures: WebGLTexture[];
        ssaoFramebuffer: webGL.MGWebGLFrameBuffer;
        edgeDetectFramebuffer: webGL.MGWebGLFrameBuffer;
        gFramebuffer: webGL.MGWebGLFrameBuffer;
        gBufferRenderbufferNormal: WebGLRenderbuffer;
        gBufferRenderbufferPosition: WebGLRenderbuffer;
        gBufferPositionTexture: WebGLTexture;
        gBufferDepthTexture: WebGLTexture;
        gBufferNormalTexture: WebGLTexture;
        ssaoTexture: WebGLTexture;
        edgeDetectTexture: WebGLTexture;
        offScreenFramebufferBlurX: webGL.MGWebGLFrameBuffer;
        offScreenFramebufferBlurY: webGL.MGWebGLFrameBuffer;
        offScreenFramebufferSimpleBlurX: webGL.MGWebGLFrameBuffer;
        offScreenFramebufferSimpleBlurY: webGL.MGWebGLFrameBuffer;
        offScreenFramebufferColor: webGL.MGWebGLFrameBuffer;
        offScreenReady: boolean;
        offScreenRenderbufferColor: WebGLRenderbuffer;
        offScreenRenderbufferDepth: WebGLRenderbuffer;
        depthPeelRenderbufferColor: WebGLRenderbuffer[];
        depthPeelRenderbufferDepth: WebGLRenderbuffer[];
        offScreenTexture: WebGLTexture;
        pMatrix: Float32Array;
        pmvMatrix: Float32Array;
        prevTime: number;
        ready: boolean;
        renderSilhouettesToTexture: boolean;
        rttFramebufferColor: webGL.MGWebGLFrameBuffer;
        rttFramebufferDepth: webGL.MGWebGLFrameBuffer;
        rttTexture: WebGLTexture;
        rttDepthTexture: WebGLTexture;
        rttTextureDepth: WebGLTexture;
        screenZ: number;
        shaderProgramTextured: webGL.MGWebGLTextureQuadShader;
        shaderProgramDepthPeelAccum: webGL.MGWebGLShaderDepthPeelAccum;
        shaderProgram: webGL.ShaderTriangles;
        shaderProgramGBuffers: webGL.ShaderGBuffersTriangles;
        shaderProgramGBuffersInstanced: webGL.ShaderGBuffersTrianglesInstanced;
        shaderProgramGBuffersPerfectSpheres: webGL.ShaderGBuffersPerfectSpheres;
        shaderProgramGBuffersThickLinesNormal: webGL.ShaderGBuffersThickLinesNormal;
        shaderProgramSSAO: webGL.ShaderSSAO;
        shaderProgramEdgeDetect: webGL.ShaderEdgeDetect;
        shaderProgramBlurX: webGL.ShaderBlurX;
        shaderProgramBlurY: webGL.ShaderBlurY;
        shaderProgramSimpleBlurX: webGL.ShaderSimpleBlurX;
        shaderProgramSimpleBlurY: webGL.ShaderSimpleBlurY;
        shaderProgramCircles: webGL.ShaderCircles;
        shaderProgramImages: webGL.ShaderImages;
        shaderProgramInstanced: webGL.ShaderTrianglesInstanced;
        shaderProgramInstancedOutline: webGL.ShaderTrianglesInstanced;
        shaderProgramInstancedShadow: webGL.ShaderTrianglesInstanced;
        shaderProgramLines: webGL.MGWebGLShader;
        shaderProgramOutline: webGL.ShaderOutLine;
        shaderProgramOverlay: webGL.ShaderOverlay;
        shaderProgramPerfectSpheres: webGL.ShaderPerfectSpheres;
        shaderProgramPerfectSpheresOutline: webGL.ShaderPerfectSpheres;
        shaderProgramPointSpheres: webGL.ShaderPointSpheres;
        shaderProgramPointSpheresShadow: webGL.ShaderPointSpheres;
        shaderProgramRenderFrameBuffer: webGL.ShaderFrameBuffer;
        shaderProgramShadow: webGL.MGWebGLShader;
        shaderProgramTextBackground: webGL.ShaderTextBackground;
        shaderProgramTextInstanced: webGL.ShaderTextInstanced;
        shaderProgramThickLines: webGL.ShaderThickLines;
        shaderProgramThickLinesNormal: webGL.ShaderThickLinesNormal;
        shaderProgramTwoDShapes: webGL.ShaderTwodShapes;
        shaderDepthShadowProgramPerfectSpheres: webGL.ShaderPerfectSpheres;
        shinyBack: boolean;
        silhouetteBufferReady: boolean;
        silhouetteDepthTexture: WebGLTexture;
        silhouetteFramebuffer: webGL.MGWebGLFrameBuffer;
        silhouetteRenderbufferColor: WebGLRenderbuffer;
        silhouetteRenderbufferDepth: WebGLRenderbuffer;
        silhouetteTexture: WebGLTexture;
        sphereBuffer: DisplayBuffer;
        stencilPass: boolean;
        stenciling: boolean;
        textHeightScaling: number;
        textTex: WebGLTexture;
        ssaoNoiseTexture: WebGLTexture;
        blurUBOBuffer: WebGLBuffer;
        ssaoKernelBuffer: WebGLBuffer;
        ssaoKernel: number[];
        trackMouse: boolean;
        extraFontCtxs: webGL.Dictionary<HTMLCanvasElement>;
        mouseDownButton: number;
        keysDown: webGL.Dictionary<number>;
        textLegends: any;
        textureMatrix: mat4;
        depth_texture: any;
        frag_depth_ext: any;
        drawBuffersExt: any;
        instanced_ext: any;
        ext: any;
        newTextLabels: any;
        axesTexture: any;
        drawingGBuffers: boolean;
        max_elements_indices: number;
        hoverSize: number;
        currentViewport: number[];
        currentAnaglyphColor: number[];
        threeWayViewports: number[][];
        stereoViewports: number[][];
        threeWayQuats: quat4[];
        stereoQuats: quat4[];
        multiWayViewports: number[][];
        multiViewOrigins: number[][];
        multiWayQuats: quat4[];
        multiWayRatio: number;
        currentMultiViewGroup: number;

    setupStereoTransformations() : void {
        setupStereoTransformations(this)
    }

    getCanvasRef() : React.RefObject<HTMLCanvasElement>{
        return this.canvasRef
    }

    getPixelData(doTransparentBackground=false) : Uint8Array {

        let pixels: Uint8Array = null

        if(this.isWebGL2()){
            this.setDoTransparentScreenshotBackground(doTransparentBackground)
            this.renderToTexture = true;
            this.drawScene();
            pixels = this.pixel_data;
            this.renderToTexture = false;
        } else {
            this.save_pixel_data = true;
            this.drawScene();
            pixels = this.pixel_data;
            this.save_pixel_data = false;
        }

        this.drawScene();

        return pixels
    }

    setupMultiWayTransformations(nmols:number) : {rows:number,cols:number} {
        return setupMultiWayTransformations(this, nmols)
    }

    setupThreeWayTransformations() : void {
        setupThreeWayTransformations(this)
    }

    resize(width: number, height: number) : void {

        const theWidth = width;
        const theHeight = height;

        this.canvas.style.width = Math.floor(theWidth) + "px";
        this.canvas.style.height = Math.floor(theHeight) + "px";
        this.canvas.width = Math.floor(getDeviceScale() * Math.floor(theWidth));
        this.canvas.height = Math.floor(getDeviceScale() * Math.floor(theHeight));

        this.dispatch(setCanvasSize([this.canvas.width,this.canvas.height]))
        this.gl.viewportWidth = this.canvas.width;
        this.gl.viewportHeight = this.canvas.height;

        this.setupThreeWayTransformations()
        this.setupStereoTransformations()
        this.multiWayViewports = []

        if(this.useOffScreenBuffers&&this.WEBGL2){
            this.recreateOffScreeenBuffers(this.canvas.width,this.canvas.height);
        }
        if(this.edgeDetectFramebuffer){
            this.gl.deleteFramebuffer(this.edgeDetectFramebuffer);
            this.edgeDetectFramebuffer = null;

        }

        this.silhouetteBufferReady = false;
        this.screenshotBuffersReady = false;
    }

    constructor(props : webGL.MGWebGLPropsInterface) {

        super(props);

        this.props = props;
        this.glTextFont = "18px Helvetica";
        this.showFPS = false;
        this.nFrames = 0;
        this.nPrevFrames = 0;
        this.prevTime = performance.now();
        this.fpsText = "";
        this.mspfArray = [];
        this.pointsArray = [];
        this.mouseTrackPoints = [];
        this.hoverSize = 0.27;
        this.depthPeelFramebuffers = [];
        this.depthPeelColorTextures = [];
        this.depthPeelDepthTextures = [];
        this.depthPeelRenderbufferDepth = [];
        this.depthPeelRenderbufferColor = [];
        this.currentViewport = [0,0, 400,400];
        this.currentAnaglyphColor = [1.0,0.0,0.0,1.0]
        this.store = props.store;
        this.dispatch = props.dispatch

        setInterval(() => {
            if(!this.gl) return;
            const sum = this.mspfArray.reduce((a, b) => a + b, 0);
            const avg = (sum / this.mspfArray.length) || 0;
            const fps = 1.0/avg * 1000;
            this.fpsText = avg.toFixed(2)+" ms/frame (" + (fps).toFixed(0)+" fps) ["+this.canvas.width+" x "+this.canvas.height+"]";
            }, 1000);

        //Set to false to use WebGL 1
        this.WEBGL2 = false;
        this.state = { width: this.props.width, height: this.props.height };
        this.animating = false
        this.canvasRef = React.createRef();
        this.keysDown = {};
        this.atomLabelDepthMode = false;
        this.showScaleBar = false
        this.showCrosshairs = false
        this.trackMouse = false
        this.showAxes = false;
        this.reContourMapOnlyOnMouseUp = true;
        this.mapLineWidth = 1.0

        if (this.props.reContourMapOnlyOnMouseUp !== null) {
            this.reContourMapOnlyOnMouseUp = this.props.reContourMapOnlyOnMouseUp
        }
        if (this.props.showAxes !== null) {
            this.showAxes = this.props.showAxes
        }
        if (this.props.showScaleBar !== null) {
            this.showScaleBar = this.props.showScaleBar
        }
        if (this.props.showCrosshairs !== null) {
            this.showCrosshairs = this.props.showCrosshairs
        }
        if (this.props.showFPS !== null) {
            this.showFPS = this.props.showFPS
        }
        if (this.props.mapLineWidth !== null) {
            this.mapLineWidth = this.props.mapLineWidth
        }
    }

    render() {
        return <canvas ref={this.canvasRef} height={this.state.width} width={this.state.height} />;
    }

    draw() {
    }

    setSSAORadius(radius) {
        this.ssaoRadius = radius;
    }

    setSSAOBias(bias) {
        this.ssaoBias = bias;
    }

    setBlurSize(blurSize) {
        this.blurSize = blurSize
        this.makeBlurBuffers(blurSize)
    }

    makeBlurBuffers(blurSize) {
        makeBlurBuffers(this, blurSize)
    }

    startSpinTest() {
        startSpinTest(this)
    }

    stopSpinTest() {
        stopSpinTest(this)
    }

    doSpinTestFrame() {
        doSpinTestFrame(this)
    }

    setDrawEnvBOcc(drawEnvBOcc) {
        this.drawEnvBOcc = drawEnvBOcc;
        if(!drawEnvBOcc){
            this.environmentAtoms = []
            this.updateLabels()
        }
    }

    setSpinTestState(doSpin) {
        this.doSpin = doSpin;
        if(this.doSpin){
            this.startSpinTest();
        } else {
            this.stopSpinTest();
        }
    }

    setDoTransparentScreenshotBackground(transparentScreenshotBackground) {
        this.transparentScreenshotBackground = transparentScreenshotBackground;
    }

    setDoAnaglyphStereo(doAnaglyphStereo) {
        this.doAnaglyphStereo = doAnaglyphStereo;
    }

    setDoCrossEyedStereo(doCrossEyedStereo) {
        this.doCrossEyedStereo = doCrossEyedStereo;
    }

    setDoSideBySideStereo(doSideBySideStereo:boolean) {
        this.doSideBySideStereo = doSideBySideStereo;
    }

    setDoRestrictDrawElements(elementsIndicesRestrict:boolean) {
        //This setting is now effectively always on. We hardwire max_elements_indices
        this.max_elements_indices = 65535;
    }

    setDoMultiView(doMultiView) {
        this.doMultiView = doMultiView;
    }

    setThreeWayViewOrder(threeWayViewOrder: string){
        this.threeWayViewOrder = threeWayViewOrder
    }

    setSpecifyMultiViewRowsColumns(specifyMultiViewRowsColumns: boolean){
        this.specifyMultiViewRowsColumns = specifyMultiViewRowsColumns
        this.multiWayViewports = []
    }

    setMultiViewRowsColumns(multiViewRowsColumns: number[]){
        this.multiViewRowsColumns = multiViewRowsColumns
        this.multiWayViewports = []
    }

    setDoThreeWayView(doThreeWayView) {
        this.doThreeWayView = doThreeWayView;
    }

    setDoOrderIndependentTransparency(doOrderIndependentTransparency) {
        this.doOrderIndependentTransparency = doOrderIndependentTransparency;
    }

    setOutlinesOn(doOutline) {
        this.doStenciling = doOutline;
    }

    setShadowsOn(doShadow) {
        this.doShadow = doShadow;
    }

    setSSAOOn(doSSAO) {
        this.doSSAO = doSSAO;
    }

    setEdgeDetectDepthThreshold(depthThreshold:number) {
        this.depthThreshold = depthThreshold;
    }

    setEdgeDetectNormalThreshold(normalThreshold:number) {
        this.normalThreshold = normalThreshold;
    }

    setEdgeDetectDepthScale(depthScale) {
        this.scaleDepth = depthScale;
    }

    setEdgeDetectNormalScale(normalScale) {
        this.scaleNormal = normalScale;
    }

    setEdgeDetectOn(doEdgeDetect) {
        this.doEdgeDetect = doEdgeDetect;
    }

    setOccludeDiffuse(doOccludeDiffuse) {
        this.occludeDiffuse = doOccludeDiffuse;
    }

    setShadowDepthDebug(doShadowDebug) {
    }

    componentDidUpdate(oldProps) {
        if (oldProps.width !== this.props.width || oldProps.height !== this.props.height) {
            this.resize(this.props.width, this.props.height)
        }
        if (oldProps.showScaleBar !== this.props.showScaleBar){
            this.showScaleBar = this.props.showScaleBar
            this.drawScene()
        }
        if (oldProps.showCrosshairs !== this.props.showCrosshairs){
            this.showCrosshairs = this.props.showCrosshairs
            this.drawScene()
        }
        if (oldProps.showAxes !== this.props.showAxes){
            this.showAxes = this.props.showAxes
            this.drawScene()
        }
        if (oldProps.showFPS !== this.props.showFPS){
            this.showFPS = this.props.showFPS
            this.drawScene()
        }
        if (oldProps.mapLineWidth !== this.props.mapLineWidth){
            this.mapLineWidth = this.props.mapLineWidth
            this.setOrigin(this.origin, true)
            this.drawScene()
        }
        if (oldProps.reContourMapOnlyOnMouseUp !== this.props.reContourMapOnlyOnMouseUp) {
            this.reContourMapOnlyOnMouseUp = this.props.reContourMapOnlyOnMouseUp
        }
    }

    lerp(a, b, f) {
        return a + f * (b - a);
    }

    initializeSSAOBuffers() {
        initializeSSAOBuffers(this)
    }

    bindSSAOBuffers() {
        bindSSAOBuffers(this)
    }

    setFogClipOffset(fogClipOffset: number) {
        this.fogClipOffset = fogClipOffset
    }

    componentDidMount() {
        this.canvas = this.canvasRef.current;


        const self = this;
        this.activeMolecule = null;
        this.draggableMolecule = null;
        this.currentlyDraggedAtom = null;
        this.fogClipOffset = 250.0;
        this.doPerspectiveProjection = false;

        this.shinyBack = true;
        this.backColour = "default";

        this.ready = false;
        this.gl = null;
        this.background_colour = [1.0, 1.0, 1.0, 1];
        this.textTex = null;
        this.origin = [0.0, 0.0, 0.0];
        this.radius = 60.0;
        this.moveFactor = 1.0;
        this.init_x = null;
        this.init_y = null;
        this.mouseDown_x = null;
        this.mouseDown_y = null;
        this.dx = null;
        this.dy = null;
        this.myQuat = null;
        this.mouseDown = null;
        this.measurePointsArray = [];
        this.measureHit = null;
        this.measureButton = -1;
        this.measureDownPos = {x:-1,y:-1};
        this.mouseMoved = null;
        this.zoom = null;
        this.ext = null;
        this.drawBuffersExt = null;
        this.instanced_ext = null;
        this.frag_depth_ext = null;
        this.gl_fog_start = null;
        this.gl_fog_end = null;
        this.gl_nClipPlanes = null;
        this.shaderProgram = null;
        this.shaderProgramGBuffers = null;
        this.shaderProgramGBuffersInstanced = null;
        this.shaderProgramGBuffersPerfectSpheres = null;
        this.shaderProgramTextBackground = null;
        this.shaderProgramCircles = null;
        this.shaderProgramLines = null;
        this.shaderProgramPointSpheres = null;

        this.mvMatrix = mat4.create();
        this.mvInvMatrix = mat4.create();
        this.screenZ = vec3.create();
        this.pMatrix = mat4.create();

        this.gl_clipPlane0 = null;
        this.gl_clipPlane1 = null;
        this.gl_clipPlane2 = null;
        this.gl_clipPlane3 = null;
        this.gl_clipPlane4 = null;
        this.gl_clipPlane5 = null;
        this.gl_clipPlane6 = null;
        this.gl_clipPlane7 = null;

        this.displayBuffers = [];

        this.save_pixel_data = false;
        this.renderToTexture = false;
        this.doDepthPeelPass = false;

        this.transparentScreenshotBackground = false;

        this.doStenciling = false;

        this.doShadow = false;
        this.doSSAO = false;
        this.doEdgeDetect = false;
        this.occludeDiffuse = false;

        /*
            Suitable(?) Edge detect settings:
            Ribbons, Gaussian, VdW, Rama balls, Dodos, glycoblocks, H-Bonds:
               Depth scale:         2
               Normal scale:        1
               Depth threshold:   1.4
               Normal threshoold: 0.5
            Bonds:
               Depth scale:         2
               Normal scale:        0
               Depth threshold:   1.0
               Normal threshoold: N/A
            Spheres:
               Depth scale:         2
               Normal scale:        2 (or 0 depending on desired effect)
               Depth threshold:   1.4
               Normal threshoold: 0.5
        */
        this.depthThreshold = 1.4;
        this.normalThreshold = 0.5;
        this.scaleDepth = 2.0;
        this.scaleNormal = 1.0;

        this.doSpin = false;

        this.doThreeWayView = false;
        this.doSideBySideStereo = false;
        this.doMultiView = false;
        this.doCrossEyedStereo = false;
        this.doAnaglyphStereo = false;

        this.specifyMultiViewRowsColumns = false;
        this.threeWayViewOrder = "";
        this.multiViewRowsColumns = [1,1];

        this.doOrderIndependentTransparency = true;//Request OIT user/state setting
        this.doPeel = false;//Requested and required - above set and there are transparent objects.

        //Debugging only
        this.doShadowDepthDebug = false;
        if(this.doShadowDepthDebug)
            this.doShadow = true;

        this.drawingGBuffers = false;
        this.offScreenFramebuffer = null;
        this.offScreenFramebufferSimpleBlurX = null;
        this.offScreenFramebufferSimpleBlurY = null;
        this.ssaoFramebuffer = null;
        this.edgeDetectFramebuffer = null;
        this.gFramebuffer = null;
        this.useOffScreenBuffers = false; //This means "doDepthBlur" and is historically named.
        this.blurSize = 3;
        this.blurDepth = 0.2;
        this.offScreenReady = false;
        this.framebufferDrawBuffersReady = false;
        this.screenshotBuffersReady = false;

        this.edgeDetectFramebufferSize = 2048;
        this.gBuffersFramebufferSize = 2048;
        this.ssaoFramebufferSize = 1024;

        this.textCtx = document.createElement("canvas").getContext("2d", {willReadFrequently: true});
        this.circleCtx = document.createElement("canvas").getContext("2d");

        this.myQuat = quat4.create();
        quat4.set(this.myQuat, 0, 0, 0, -1);
        this.setZoom(1.0)

        this.gl_clipPlane0 = new Float32Array(4);
        this.gl_clipPlane1 = new Float32Array(4);
        this.gl_clipPlane1[0] = 0.0;
        this.gl_clipPlane1[1] = 0.0;
        this.gl_clipPlane1[2] = 1.0;
        this.gl_clipPlane1[3] = 1000.0;
        this.gl_clipPlane0[0] = 0.0;
        this.gl_clipPlane0[1] = 0.0;
        this.gl_clipPlane0[2] = -1.0;
        this.gl_clipPlane0[3] = -0.0;
        this.gl_clipPlane2 = new Float32Array(4);
        this.gl_clipPlane3 = new Float32Array(4);
        this.gl_clipPlane4 = new Float32Array(4);
        this.gl_clipPlane5 = new Float32Array(4);
        this.gl_clipPlane6 = new Float32Array(4);
        this.gl_clipPlane7 = new Float32Array(4);
        this.clipCapPerfectSpheres = false;
        this.drawEnvBOcc = false;
        this.environmentRadius = 3.5;
        this.environmentAtoms = [];
        this.labelledAtoms = [];
        this.measuredAtoms = [];

        this.gl_cursorPos = new Float32Array(2);
        this.gl_cursorPos[0] = this.canvas.width / 2.;
        this.gl_cursorPos[1] = this.canvas.height / 2.;


        this.gl_nClipPlanes = 0;
        this.gl_fog_start = this.fogClipOffset;
        this.gl_fog_end = 1000+this.fogClipOffset;

        this.origin = [0.0, 0.0, 0.0];

        this.mouseDown = false;
        this.mouseDownButton = -1;

        const glc = initGL(this.canvas);
        this.gl = glc.gl;
        this.WEBGL2 = glc.WEBGL2;
        this.dispatch(setIsWebGL2(this.WEBGL2))
        this.dispatch(setGLCtx(this.gl))
        this.currentViewport = [0,0, this.gl.viewportWidth, this.gl.viewportWidth];
        this.currentAnaglyphColor = [1.0,0.0,0.0,1.0]

        this.max_elements_indices = 65535;

        this.setupThreeWayTransformations()
        this.setupStereoTransformations()

        this.blurUBOBuffer = this.gl.createBuffer();
        this.axesTexture = {black:{},white:{}};

        const extensionArray = this.gl.getSupportedExtensions();

        if (this.doneEvents === undefined) {
            self.canvas.addEventListener("mousedown",
                function (evt) {
                    if (self.keysDown['dist_ang_2d']) {
                        self.doMouseDownMeasure(evt, self);
                    } else {
                        self.doMouseDown(evt, self);
                    }
                    evt.stopPropagation();
                },
                false);
                self.canvas.addEventListener("mouseup",
                function (evt) {
                    if (self.keysDown['dist_ang_2d']) {
                        self.doMouseUpMeasure(evt, self);
                    } else {
                        self.doMouseUp(evt, self);
                    }
                },
                false);
            self.canvas.addEventListener("contextmenu",
                function (evt) {
                    self.doRightClick(evt, self);
                    evt.stopPropagation();
                    evt.preventDefault();
                },
                false);
            self.canvas.addEventListener("mousedown",
                function (evt) {
                    if (evt.which === 1) {
                        self.doClick(evt, self);
                        evt.stopPropagation();
                    } else if (evt.which === 2) {
                        evt.stopPropagation();
                        evt.preventDefault();
                    } else {
                        self.doRightClick(evt, self);
                        evt.stopPropagation();
                        evt.preventDefault();
                    }
                },
                false);
            self.canvas.addEventListener("dblclick",
                function (evt) {
                    self.doDoubleClick(evt, self);
                    evt.stopPropagation();
                },
                false);
            console.log("addEventListener");
            self.canvas.addEventListener("mousemove",
                function (evt) {
                    if (self.keysDown['dist_ang_2d']) {
                        self.doMouseMoveMeasure(evt, self);
                    } else {
                        self.doMouseMove(evt, self);
                    }
                    evt.stopPropagation();
                },
                false);
            self.canvas.addEventListener("mouseenter",
                function (evt) {
                    document.onkeydown = function (evt2) {
                        self.handleKeyDown(evt2, self);
                    }
                    document.onkeyup = function (evt2) {
                        self.handleKeyUp(evt2, self);
                    }
                },
                false);
            self.canvas.addEventListener("mouseleave",
                function (evt) {
                    document.onkeydown = function (evt2) {
                    }
                },
                false);
            self.canvas.addEventListener("wheel",
                function (evt) {
                    self.doWheel(evt);
                    evt.stopPropagation();
                    evt.preventDefault();
                },
                false);
            self.canvas.addEventListener('touchstart',
                function (e) {
                    const touchobj = e.changedTouches[0];
                    const evt = { pageX: touchobj.pageX, pageY: touchobj.pageY, shiftKey: false, altKey: false, button: 0 };
                    //alert(e.changedTouches.length)
                    if (e.changedTouches.length === 2) {
                        evt.shiftKey = true;
                        evt.altKey = true;
                    }
                    self.doMouseDown(evt, self);
                    self.mouseDownedAt = (e.timeStamp)
                    e.stopPropagation();
                    e.preventDefault();
                    // Create a timeout that will check if the user is holding down on the same spot to open the context menu
                    setTimeout(() => {
                        if (self.mouseDown && !self.mouseMoved) {
                            self.doRightClick(evt, self);
                        }
                    }, 1000)
                }, false)

            self.canvas.addEventListener('touchmove',
                function (e) {
                    const touchobj = e.touches[0]; // reference first touch point for this event
                    const evt = { pageX: touchobj.pageX, pageY: touchobj.pageY, shiftKey: false, altKey: false, buttons: 1 };
                    if (e.touches.length === 2) {
                        evt.shiftKey = true;
                        evt.altKey = true;
                    }
                    self.doMouseMove(evt, self);
                    e.stopPropagation();
                    e.preventDefault();
                }, false)

            self.canvas.addEventListener('touchend',
                function (e) {
                    const touchobj = e.changedTouches[0]; // reference first touch point for this event
                    const evt = { pageX: touchobj.pageX, pageY: touchobj.pageY, shiftKey: false, altKey: false, button: 0 };
                    if (e.changedTouches.length === 2) {
                        evt.shiftKey = true;
                        evt.altKey = true;
                    }
                    const deltaTime = e.timeStamp - self.mouseDownedAt;
                    if (deltaTime < 300) {
                        self.doClick(evt, self);
                    }
                    self.doMouseUp(evt, self);
                    e.stopPropagation();
                    e.preventDefault();
                }, false)
        }
        this.doneEvents = true;

        this.light_positions = new Float32Array([25.0, 25.0, 50.0, 1.0]);
        this.light_colours_ambient = new Float32Array([0.0, 0.0, 0.0, 1.0]);
        this.light_colours_specular = new Float32Array([1.0, 1.0, 1.0, 1.0]);
        this.light_colours_diffuse = new Float32Array([1.0, 1.0, 1.0, 1.0]);
        this.specularPower = 64.0;

        this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], this.background_colour[3]);
        if (this.WEBGL2) {
            console.log("WebGL2")
            this.ext = true;
            this.frag_depth_ext = true;
            this.instanced_ext = true;
            this.depth_texture = true;
            const color_buffer_float_ext = this.gl.getExtension("EXT_color_buffer_float");
            if(!color_buffer_float_ext){
                alert("No WebGL extension EXT_color_buffer_float! Some or all rendering may not work properly");
            } else {
                console.log("color_buffer_float_ext?",color_buffer_float_ext)
            }
        } else {
            this.ext = this.gl.getExtension("OES_element_index_uint");
            if (!this.ext) {
                alert("No OES_element_index_uint support");
            }
            console.log("##################################################");
            console.log("Got extension");
            console.log(this.ext);
            const color_buffer_float_ext = this.gl.getExtension("WEBGL_color_buffer_float");
            if(!color_buffer_float_ext){
                console.log("No WEBGL_color_buffer_float! Some or all rendering may not work properly");
            } else {
                console.log("color_buffer_float_ext?",color_buffer_float_ext)
            }
            this.frag_depth_ext = this.gl.getExtension("EXT_frag_depth");
            this.depth_texture = this.gl.getExtension("WEBGL_depth_texture");
            this.instanced_ext = this.gl.getExtension("ANGLE_instanced_arrays");
            this.drawBuffersExt = this.gl.getExtension("WEBGL_draw_buffers");
            if (!this.instanced_ext) {
                alert("No instancing support");
            }
            if (!this.drawBuffersExt) {
                alert("No WEBGL_draw_buffers support");
            }
            if (!this.depth_texture) {
                this.depth_texture = this.gl.getExtension("MOZ_WEBGL_depth_texture");
                if (!this.depth_texture) {
                    this.depth_texture = this.gl.getExtension("WEBKIT_WEBGL_depth_texture");
                    if (!this.depth_texture) {
                        alert("No depth texture extension");
                    }
                }
            }
        }

        setInterval(function () { self.drawSceneIfDirty() }, 16);
        this.initializeShaders();

        this.textLegends = [];
        this.newTextLabels = [];

        this.textHeightScaling = 800;
        if(this.doShadow) this.initTextureFramebuffer(); //This is testing only

        if (!this.frag_depth_ext) {
            console.log("No EXT_frag_depth support");
            console.log("This is supported in most browsers, except IE. And may never be supported in IE.");
            console.log("This extension is supported in Microsoft Edge, so Windows 10 is required for perfect spheres in MS Browser.");
            console.log("Other browers on Windows 7/8/8.1 do have this extension.");
        }
        this.textTex = this.gl.createTexture();
        this.circleTex = this.gl.createTexture();

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.circleTex);
        this.makeCircleCanvas("H", 128, 128, "black");
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.circleCtx.canvas);

        this.gl_nClipPlanes = 0;
        this.gl_fog_start = this.fogClipOffset;
        this.gl_fog_end = 1000+this.fogClipOffset;
        //this.gl.lineWidth(2.0);
        this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.enable(this.gl.BLEND);

        this.ssaoRadius = 0.4;
        this.ssaoBias = 1.0;
        if(this.WEBGL2) this.initializeSSAOBuffers();

        this.buildBuffers();

        this.measureText2DCanvasTexture = new TextCanvasTexture(this.gl,this.ext,this.instanced_ext,this.shaderProgramTextInstanced,768,2048, this.store);
        this.measureTextCanvasTexture = new TextCanvasTexture(this.gl,this.ext,this.instanced_ext,this.shaderProgramTextInstanced,1024,2048, this.store);
        this.labelsTextCanvasTexture = new TextCanvasTexture(this.gl,this.ext,this.instanced_ext,this.shaderProgramTextInstanced,1024,2048, this.store);
        this.texturedShapes = [];

        this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], this.background_colour[3]);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.origin = [0.0, 0.0, 0.0];
        //const shader_version = this.gl.getParameter(this.gl.SHADING_LANGUAGE_VERSION);

        this.mouseDown = false;
        this.mouseDownButton = -1;

        this.setBlurSize(this.blurSize);
        this.drawScene();
        this.ready = true;

        this.multiWayViewports = []

    }

    initializeShaders() : void {
        let vertexShader;
        let fragmentShader;
        let gBufferVertexShader;
        let gBufferInstancedVertexShader;
        let gBufferFragmentShader;
        let gBufferTwodVertexShader;
        let gBufferThickLineNormalVertexShader;
        let gBufferPerfectSphereFragmentShader;
        let blurVertexShader;
        let ssaoFragmentShader;
        let edgeDetectFragmentShader;
        let overlayFragmentShader;
        let blurXFragmentShader;
        let blurYFragmentShader;
        let simpleBlurXFragmentShader;
        let simpleBlurYFragmentShader;
        let lineVertexShader;
        let thickLineVertexShader;
        let thickLineNormalVertexShader;
        let lineFragmentShader;
        let textVertexShader;
        let textVertexShaderInstanced;
        let circlesVertexShader;
        let textFragmentShader;
        let circlesFragmentShader;
        let pointSpheresVertexShader;
        let pointSpheresFragmentShader;
        let twoDShapesFragmentShader;
        let twoDShapesVertexShader;
        let renderFrameBufferFragmentShader;
        let perfectSphereFragmentShader;
        let perfectSphereOutlineFragmentShader;

        let shadowVertexShader; //Depth pass
        let shadowVertexShaderInstanced; //Depth pass
        let shadowFragmentShader; //Depth pass
        let shadowDepthPerfectSphereFragmentShader; //Depth pass
        let shadowDeptTwoDShapesVertexShader; //Depth pass

        this.doRedraw = false;

        let ssao_fragment_shader_source = ssao_fragment_shader_source_webgl1;
        let edge_detect_fragment_shader_source = edge_detect_fragment_shader_source_webgl1;
        let blur_vertex_shader_source = blur_vertex_shader_source_webgl1;
        let blur_x_fragment_shader_source = blur_x_fragment_shader_source_webgl1;
        //I'm giving up on WebGL1 now ...
        let blur_x_simple_fragment_shader_source = blur_x_fragment_shader_source_webgl1;
        let blur_y_simple_fragment_shader_source = blur_y_fragment_shader_source_webgl1;
        let overlay_fragment_shader_source = overlay_fragment_shader_source_webgl1;
        let blur_y_fragment_shader_source = blur_y_fragment_shader_source_webgl1;
        let lines_fragment_shader_source = lines_fragment_shader_source_webgl1;
        let text_instanced_vertex_shader_source = text_instanced_vertex_shader_source_webgl1;
        let lines_vertex_shader_source = lines_vertex_shader_source_webgl1;
        let perfect_sphere_fragment_shader_source = perfect_sphere_fragment_shader_source_webgl1+fxaa_shader_source_webgl1;
        let perfect_sphere_outline_fragment_shader_source = perfect_sphere_outline_fragment_shader_source_webgl1;
        let pointspheres_fragment_shader_source = pointspheres_fragment_shader_source_webgl1;
        let pointspheres_vertex_shader_source = pointspheres_vertex_shader_source_webgl1;
        let render_framebuffer_fragment_shader_source = render_framebuffer_fragment_shader_source_webgl1;
        let shadow_fragment_shader_source = shadow_fragment_shader_source_webgl1;
        let flat_colour_fragment_shader_source = flat_colour_fragment_shader_source_webgl1;
        let shadow_depth_perfect_sphere_fragment_shader_source = shadow_depth_perfect_sphere_fragment_shader_source_webgl1;
        let shadow_depth_twod_vertex_shader_source = shadow_depth_twod_vertex_shader_source_webgl1;
        let shadow_vertex_shader_source = shadow_vertex_shader_source_webgl1;
        let shadow_instanced_vertex_shader_source = shadow_instanced_vertex_shader_source_webgl1;
        let text_fragment_shader_source = text_fragment_shader_source_webgl1;
        let circles_fragment_shader_source = circles_fragment_shader_source_webgl1;
        let circles_vertex_shader_source = circles_vertex_shader_source_webgl1;
        let thick_lines_vertex_shader_source = thick_lines_vertex_shader_source_webgl1;
        let thick_lines_normal_vertex_shader_source = thick_lines_normal_vertex_shader_source_webgl1;
        let triangle_fragment_shader_source = triangle_fragment_shader_source_webgl1+fxaa_shader_source_webgl1;
        let triangle_vertex_shader_source = triangle_vertex_shader_source_webgl1;
        let twod_fragment_shader_source = twod_fragment_shader_source_webgl1;
        let twod_vertex_shader_source = twod_vertex_shader_source_webgl1;
        let triangle_instanced_vertex_shader_source = triangle_instanced_vertex_shader_source_webgl1;
        let triangle_gbuffer_fragment_shader_source = triangle_gbuffer_fragment_shader_source_webgl1;
        let triangle_gbuffer_vertex_shader_source = triangle_gbuffer_vertex_shader_source_webgl1;
        let triangle_instanced_gbuffer_vertex_shader_source = triangle_instanced_gbuffer_vertex_shader_source_webgl1;
        let perfect_sphere_gbuffer_fragment_shader_source = perfect_sphere_gbuffer_fragment_shader_source_webgl1;
        let twod_gbuffer_vertex_shader_source = twod_gbuffer_vertex_shader_source_webgl1;
        let thick_lines_normal_gbuffer_vertex_shader_source = thick_lines_normal_gbuffer_vertex_shader_source_webgl1;
        let depth_peel_accum_vertex_shader_source = depth_peel_accum_vertex_shader_source_webgl1;
        let depth_peel_accum_fragment_shader_source = depth_peel_accum_fragment_shader_source_webgl1;

        if(this.WEBGL2){
            ssao_fragment_shader_source = ssao_fragment_shader_source_webgl2;
            edge_detect_fragment_shader_source = edge_detect_fragment_shader_source_webgl2;
            blur_vertex_shader_source = blur_vertex_shader_source_webgl2;
            blur_x_fragment_shader_source = blur_x_fragment_shader_source_webgl2;
            blur_x_simple_fragment_shader_source = blur_x_simple_fragment_shader_source_webgl2;
            blur_y_simple_fragment_shader_source = blur_y_simple_fragment_shader_source_webgl2;
            overlay_fragment_shader_source = overlay_fragment_shader_source_webgl2;
            blur_y_fragment_shader_source = blur_y_fragment_shader_source_webgl2;
            lines_fragment_shader_source = lines_fragment_shader_source_webgl2;
            text_instanced_vertex_shader_source = text_instanced_vertex_shader_source_webgl2;
            lines_vertex_shader_source = lines_vertex_shader_source_webgl2;
            perfect_sphere_fragment_shader_source = perfect_sphere_fragment_shader_source_webgl2+fxaa_shader_source_webgl2;
            perfect_sphere_outline_fragment_shader_source = perfect_sphere_outline_fragment_shader_source_webgl2;
            pointspheres_fragment_shader_source = pointspheres_fragment_shader_source_webgl2;
            pointspheres_vertex_shader_source = pointspheres_vertex_shader_source_webgl2;
            render_framebuffer_fragment_shader_source = render_framebuffer_fragment_shader_source_webgl2;
            shadow_fragment_shader_source = shadow_fragment_shader_source_webgl2;
            flat_colour_fragment_shader_source = flat_colour_fragment_shader_source_webgl2;
            shadow_depth_perfect_sphere_fragment_shader_source = shadow_depth_perfect_sphere_fragment_shader_source_webgl2;
            shadow_depth_twod_vertex_shader_source = shadow_depth_twod_vertex_shader_source_webgl2;
            shadow_vertex_shader_source = shadow_vertex_shader_source_webgl2;
            shadow_instanced_vertex_shader_source = shadow_instanced_vertex_shader_source_webgl2;
            text_fragment_shader_source = text_fragment_shader_source_webgl2;
            circles_fragment_shader_source = circles_fragment_shader_source_webgl2;
            circles_vertex_shader_source = circles_vertex_shader_source_webgl2;
            thick_lines_vertex_shader_source = thick_lines_vertex_shader_source_webgl2;
            thick_lines_normal_vertex_shader_source = thick_lines_normal_vertex_shader_source_webgl2;
            triangle_fragment_shader_source = triangle_fragment_shader_source_webgl2+fxaa_shader_source_webgl2;
            triangle_vertex_shader_source = triangle_vertex_shader_source_webgl2;
            twod_fragment_shader_source = twod_fragment_shader_source_webgl2;
            twod_vertex_shader_source = twod_vertex_shader_source_webgl2;
            triangle_instanced_vertex_shader_source = triangle_instanced_vertex_shader_source_webgl2;
            triangle_gbuffer_fragment_shader_source = triangle_gbuffer_fragment_shader_source_webgl2;
            triangle_gbuffer_vertex_shader_source = triangle_gbuffer_vertex_shader_source_webgl2;
            triangle_instanced_gbuffer_vertex_shader_source = triangle_instanced_gbuffer_vertex_shader_source_webgl2;
            perfect_sphere_gbuffer_fragment_shader_source = perfect_sphere_gbuffer_fragment_shader_source_webgl2;
            twod_gbuffer_vertex_shader_source = twod_gbuffer_vertex_shader_source_webgl2;
            thick_lines_normal_gbuffer_vertex_shader_source = thick_lines_normal_gbuffer_vertex_shader_source_webgl2;
            depth_peel_accum_vertex_shader_source = depth_peel_accum_vertex_shader_source_webgl2;
            depth_peel_accum_fragment_shader_source = depth_peel_accum_fragment_shader_source_webgl2+fxaa_shader_source_webgl2;
        }

        vertexShader = getShader(this.gl, triangle_vertex_shader_source, "vertex");
        const vertexShaderInstanced = getShader(this.gl, triangle_instanced_vertex_shader_source, "vertex");
        fragmentShader = getShader(this.gl, triangle_fragment_shader_source, "fragment");
        gBufferFragmentShader = getShader(this.gl, triangle_gbuffer_fragment_shader_source, "fragment");
        gBufferInstancedVertexShader = getShader(this.gl, triangle_instanced_gbuffer_vertex_shader_source, "vertex");
        gBufferTwodVertexShader = getShader(this.gl, twod_gbuffer_vertex_shader_source, "vertex");
        gBufferThickLineNormalVertexShader = getShader(this.gl, thick_lines_normal_gbuffer_vertex_shader_source, "vertex");
        gBufferPerfectSphereFragmentShader = getShader(this.gl, perfect_sphere_gbuffer_fragment_shader_source, "fragment");
        gBufferVertexShader = getShader(this.gl, triangle_gbuffer_vertex_shader_source, "vertex");
        this.shaderProgramGBuffers = initGBufferShaders(gBufferVertexShader, gBufferFragmentShader, this.gl);
        lineVertexShader = getShader(this.gl, lines_vertex_shader_source, "vertex");
        thickLineVertexShader = getShader(this.gl, thick_lines_vertex_shader_source, "vertex");
        thickLineNormalVertexShader = getShader(this.gl, thick_lines_normal_vertex_shader_source, "vertex");
        blurVertexShader = getShader(this.gl, blur_vertex_shader_source, "vertex");
        edgeDetectFragmentShader = getShader(this.gl, edge_detect_fragment_shader_source, "fragment");
        ssaoFragmentShader = getShader(this.gl, ssao_fragment_shader_source, "fragment");
        blurXFragmentShader = getShader(this.gl, blur_x_fragment_shader_source, "fragment");
        overlayFragmentShader = getShader(this.gl, overlay_fragment_shader_source, "fragment");
        blurYFragmentShader = getShader(this.gl, blur_y_fragment_shader_source, "fragment");
        simpleBlurXFragmentShader = getShader(this.gl, blur_x_simple_fragment_shader_source, "fragment");
        simpleBlurYFragmentShader = getShader(this.gl, blur_y_simple_fragment_shader_source, "fragment");
        lineFragmentShader = getShader(this.gl, lines_fragment_shader_source, "fragment");
        textVertexShader = getShader(this.gl, triangle_vertex_shader_source, "vertex");
        textVertexShaderInstanced = getShader(this.gl, text_instanced_vertex_shader_source, "vertex");
        circlesVertexShader = getShader(this.gl, circles_vertex_shader_source, "vertex");
        textFragmentShader = getShader(this.gl, text_fragment_shader_source, "fragment");
        circlesFragmentShader = getShader(this.gl, circles_fragment_shader_source, "fragment");
        pointSpheresVertexShader = getShader(this.gl, pointspheres_vertex_shader_source, "vertex");
        pointSpheresFragmentShader = getShader(this.gl, pointspheres_fragment_shader_source, "fragment");
        twoDShapesVertexShader = getShader(this.gl, twod_vertex_shader_source, "vertex");
        twoDShapesFragmentShader = getShader(this.gl, twod_fragment_shader_source, "fragment");
        renderFrameBufferFragmentShader = getShader(this.gl, render_framebuffer_fragment_shader_source, "fragment");
        const flatColourFragmentShader = getShader(this.gl, flat_colour_fragment_shader_source, "fragment");
        if (this.frag_depth_ext) {
            perfectSphereFragmentShader = getShader(this.gl, perfect_sphere_fragment_shader_source, "fragment");
            perfectSphereOutlineFragmentShader = getShader(this.gl, perfect_sphere_outline_fragment_shader_source, "fragment");
            shadowVertexShader = getShader(this.gl, shadow_vertex_shader_source, "vertex");
            shadowVertexShaderInstanced = getShader(this.gl, shadow_instanced_vertex_shader_source, "vertex");
            shadowFragmentShader = getShader(this.gl, shadow_fragment_shader_source, "fragment");
            this.shaderProgramShadow = initShadowShaders(shadowVertexShader, shadowFragmentShader, this.gl);
            this.shaderProgramInstancedShadow = initInstancedShadowShaders(shadowVertexShaderInstanced, shadowFragmentShader, this.gl);
            this.shaderProgramInstancedOutline = initInstancedOutlineShaders(vertexShaderInstanced, flatColourFragmentShader, this.gl);
        }

        this.shaderProgramRenderFrameBuffer = initRenderFrameBufferShaders(blurVertexShader, renderFrameBufferFragmentShader, this.gl);
        this.shaderProgramLines = initLineShaders(lineVertexShader, lineFragmentShader, this.gl);
        this.shaderProgramOverlay = initOverlayShader(blurVertexShader, overlayFragmentShader, this.gl);
        this.shaderProgramBlurX = initBlurXShader(blurVertexShader, blurXFragmentShader, this.gl, this.WEBGL2);
        this.shaderProgramSSAO = initSSAOShader(blurVertexShader, ssaoFragmentShader, this.gl, this.WEBGL2);
        this.shaderProgramEdgeDetect = initEdgeDetectShader(blurVertexShader, edgeDetectFragmentShader, this.gl);
        this.shaderProgramBlurY = initBlurYShader(blurVertexShader, blurYFragmentShader, this.gl, this.WEBGL2);
        this.shaderProgramSimpleBlurX = initSimpleBlurXShader(blurVertexShader, simpleBlurXFragmentShader, this.gl, this.WEBGL2);
        this.shaderProgramSimpleBlurY = initSimpleBlurYShader(blurVertexShader, simpleBlurYFragmentShader, this.gl, this.WEBGL2);
        this.shaderProgramThickLines = initThickLineShaders(thickLineVertexShader, lineFragmentShader, this.gl);
        this.shaderProgramThickLinesNormal = initThickLineNormalShaders(thickLineNormalVertexShader, fragmentShader, this.gl);
        this.shaderProgramPointSpheres = initPointSpheresShaders(pointSpheresVertexShader, pointSpheresFragmentShader, this.gl);
        this.shaderProgramTwoDShapes = initTwoDShapesShaders(twoDShapesVertexShader, twoDShapesFragmentShader, this.gl);
        this.shaderProgramImages = initImageShaders(twoDShapesVertexShader, textFragmentShader, this.gl);
        if (this.frag_depth_ext) {
            this.shaderProgramPerfectSpheres = initPerfectSphereShaders(twoDShapesVertexShader, perfectSphereFragmentShader, this.gl);
            this.shaderProgramPerfectSpheresOutline = initPerfectSphereOutlineShaders(twoDShapesVertexShader, perfectSphereOutlineFragmentShader, this.gl);
            shadowDepthPerfectSphereFragmentShader = getShader(this.gl, shadow_depth_perfect_sphere_fragment_shader_source, "fragment");
            shadowDeptTwoDShapesVertexShader = getShader(this.gl, shadow_depth_twod_vertex_shader_source, "vertex");
            this.shaderDepthShadowProgramPerfectSpheres = initDepthShadowPerfectSphereShaders(shadowDepthPerfectSphereFragmentShader, shadowDeptTwoDShapesVertexShader, this.gl);
        }
        this.shaderProgramTextBackground = initTextBackgroundShaders(textVertexShader, textFragmentShader, this.gl);
        this.shaderProgramTextInstanced = initTextInstancedShaders(textVertexShaderInstanced, textFragmentShader, this.gl);
        this.gl.disableVertexAttribArray(this.shaderProgramTextBackground.vertexTextureAttribute, this.gl);
        this.shaderProgramCircles = initCirclesShaders(circlesVertexShader, circlesFragmentShader, this.gl);
        this.gl.disableVertexAttribArray(this.shaderProgramCircles.vertexTextureAttribute);
        this.shaderProgram = initShaders(vertexShader, fragmentShader, this.gl);
        this.shaderProgramOutline = initOutlineShaders(vertexShader, flatColourFragmentShader, this.gl);
        this.shaderProgramInstanced = initShadersInstanced(vertexShaderInstanced, fragmentShader, this.gl);
        this.shaderProgramGBuffersInstanced = initGBufferShadersInstanced(gBufferInstancedVertexShader, gBufferFragmentShader, this.gl);
        this.shaderProgramGBuffersPerfectSpheres = initGBufferShadersPerfectSphere(gBufferTwodVertexShader, gBufferPerfectSphereFragmentShader, this.gl);
        this.shaderProgramGBuffersThickLinesNormal = initGBufferThickLineNormalShaders(gBufferThickLineNormalVertexShader, gBufferFragmentShader, this.gl);
        if(this.WEBGL2){
            const vertexShaderTextured = getShader(this.gl, triangle_texture_vertex_shader_source, "vertex");
            const fragmentShaderTextured = getShader(this.gl, triangle_texture_fragment_shader_source, "fragment");
            this.shaderProgramTextured = initShadersTextured(vertexShaderTextured, fragmentShaderTextured, this.gl);
        }
        const vertexShaderDepthPeelAccum = getShader(this.gl, depth_peel_accum_vertex_shader_source, "vertex");
        const fragmentShaderDepthPeelAccum = getShader(this.gl, depth_peel_accum_fragment_shader_source, "fragment");
        this.shaderProgramDepthPeelAccum = initShadersDepthPeelAccum(vertexShaderDepthPeelAccum, fragmentShaderDepthPeelAccum, this.gl);
    }

    setActiveMolecule(molecule: moorhen.Molecule) : void {
        console.log("**************************************************")
        console.log("**************************************************")
        console.log("setActiveMolecule",molecule)
        console.log("**************************************************")
        console.log("**************************************************")
        this.activeMolecule = molecule;
    }

    appendOtherData(jsondata: any, skipRebuild?: boolean, name?: string) : any {

        const theseBuffers = [];
        return theseBuffers;
    }

    setFog(fog) {
        this.gl_fog_start = this.fogClipOffset + fog[0];
        this.gl_fog_end = this.fogClipOffset + fog[1];
        this.drawScene();
    }

    setSlab(slab) {
        this.gl_clipPlane0[3] = -this.fogClipOffset + slab[0] * 0.5 + slab[1];
        this.gl_clipPlane1[3] = this.fogClipOffset + slab[0] * 0.5 - slab[1];
        this.drawScene();
    }

    setQuat(q: quat4) : void {
        this.myQuat = q;
        this.drawScene();
    }

    setTextFont(family: string,size: number) : void {
        if(family && size){
            this.glTextFont = ""+size+"px "+family;
            this.updateLabels();
            this.labelsTextCanvasTexture.clearBigTexture();
            this.drawScene();
        }
    }

    setBackground(col: [number, number, number, number]) : void {
        this.background_colour = col;
        this.updateLabels()
        this.drawScene();
    }

    setOrientationFrame(qOld, qNew, iframe) {
        setOrientationFrame(this, qOld, qNew, iframe)
    }

    setOrientationAndZoomFrame(qOld, qNew, oldZoom, zoomDelta, iframe) {
        setOrientationAndZoomFrame(this, qOld, qNew, oldZoom, zoomDelta, iframe)
    }

    setOrientationAndZoomAnimated(q,z) {
        setOrientationAndZoomAnimated(this, q, z)
    }

    setOrientationAnimated(q) {
        setOrientationAnimated(this, q)
    }

    handleOriginUpdated(doDispatch: boolean) {
        const displayBuffers = this.store.getState().glRef.displayBuffers
        if(doDispatch){
            //FIXME - This might have to go ...
            const originUpdateEvent = new CustomEvent("originUpdate", { detail: {origin: this.origin} })
            document.dispatchEvent(originUpdateEvent);
        }
        if(this.drawEnvBOcc) {
            const near_atoms = []
            displayBuffers.forEach(buffer => {
                if (buffer.visible) {
                    buffer.atoms.forEach(atom => {
                        const ax = atom.x
                        const ay = atom.y
                        const az = atom.z
                        const ox = -this.origin[0]
                        const oy = -this.origin[1]
                        const oz = -this.origin[2]
                        if(Math.abs(ax-ox)<this.environmentRadius && Math.abs(ay-oy)<this.environmentRadius && Math.abs(az-oz)<this.environmentRadius){
                            const distsq = (ax-ox)*(ax-ox) + (ay-oy)*(ay-oy) + (az-oz)*(az-oz)
                            if(distsq<this.environmentRadius*this.environmentRadius) near_atoms.push(atom)
                        }
                    })
                }
            })
            this.environmentAtoms = []
            const spacing = " ".repeat(400)
            near_atoms.forEach(atom => {
                const atomLabel = parseAtomInfoLabel(atom);
                if (this.environmentAtoms.length === 0 || (this.environmentAtoms[this.environmentAtoms.length - 1].length > 1)) {
                    this.environmentAtoms.push([]);
                }
                // The spacing + ")" adjusts the height/baseline so that they are same as click atom labels.
                const label = atom.tempFactor.toFixed(2) + " " + atom.occupancy.toFixed(2) + spacing + ")"
                //atom.label = atom.tempFactor.toFixed(2) + " " + atom.occupancy.toFixed(2) + spacing + ")"
                //atom.label = atom.tempFactor.toFixed(2) + " " + atom.occupancy.toFixed(2) + " " + atomLabel
                this.environmentAtoms[this.environmentAtoms.length - 1].push({atom:atom,label:label})
            })
            this.updateLabels()
        }
    }

    setOriginOrientationAndZoomFrame(oo,d,qOld, qNew, oldZoom, zoomDelta, iframe) {
        setOriginOrientationAndZoomFrame(this, oo, d, qOld, qNew, oldZoom, zoomDelta, iframe)
    }

    setViewAnimated(o,q,z) {
        setViewAnimated(this, o, q, z)
    }

    setOriginOrientationAndZoomAnimated(o: number[],q: quat4,z: number) : void {
        setOriginOrientationAndZoomAnimated(this, o, q, z)
    }

    calculateOriginDelta(newOrigin: [number, number, number], oldOrigin: [number, number, number], nFrames: number): [number, number, number] {
        const [old_x, old_y, old_z] = oldOrigin
        const [new_x, new_y, new_z] = newOrigin
        const DX = (new_x - old_x) / nFrames
        const DY = (new_y - old_y) / nFrames
        const DZ = (new_z - old_z) / nFrames
        return [ DX, DY, DZ ]
    }

    setOriginAndZoomAnimated(newOrigin: [number, number, number], newZoom: number) {
        setOriginAndZoomAnimated(this, newOrigin, newZoom)
    }

    drawOriginAndZoomFrame(oldOrigin: [number, number, number], oldZoom: number, deltaOrigin: [number, number, number], deltaZoom: number, iframe: number) {
        drawOriginAndZoomFrame(this, oldOrigin, oldZoom, deltaOrigin, deltaZoom, iframe)
    }

    setOriginAnimated(oldOrigin: number[]) : void {
        setOriginAnimated(this, oldOrigin)
    }

    drawOriginFrame(oo,d,iframe){
        drawOriginFrame(this, oo, d, iframe)
    }

    setOrigin(o: [number, number, number], doDrawScene=true, dispatchEvent=true) : void {
        this.origin = o;
        //default is to drawScene, unless doDrawScene provided and value is false
        if (doDrawScene) {
            this.drawScene();
        }
        this.handleOriginUpdated(dispatchEvent)
        this.props.onOriginChanged(o)
    }

    setAmbientLightNoUpdate(r:number, g:number, b:number) : void {
        this.light_colours_ambient = new Float32Array([r, g, b, 1.0]);
    }

    setSpecularLightNoUpdate(r:number, g:number, b:number) : void {
        this.light_colours_specular = new Float32Array([r, g, b, 1.0]);
    }

    setSpecularPowerNoUpdate(p) {
        this.specularPower = p;
    }

    setDiffuseLightNoUpdate(r:number, g:number, b:number) : void {
        this.light_colours_diffuse = new Float32Array([r, g, b, 1.0]);
    }

    setLightPositionNoUpdate(x:number, y:number, z:number) : void {
        this.light_positions = new Float32Array([x, y, z, 1.0]);
    }

    setAmbientLight(r:number, g:number, b:number) : void {
        this.light_colours_ambient = new Float32Array([r, g, b, 1.0]);
        this.drawScene();
    }

    setSpecularLight(r:number, g:number, b:number) : void {
        this.light_colours_specular = new Float32Array([r, g, b, 1.0]);
        this.drawScene();
    }

    setSpecularPower(p:number) : void {
        this.specularPower = p;
        this.drawScene();
    }

    setDiffuseLight(r:number, g:number, b:number) : void {
        this.light_colours_diffuse = new Float32Array([r, g, b, 1.0]);
        this.drawScene();
    }

    setLightPosition(x:number, y:number, z:number) : void {
        this.light_positions = new Float32Array([x, y, z, 1.0]);
        this.drawScene();
    }

    setWheelContour(contourFactor:number, drawScene:boolean) {
        const wheelContourChanged = new CustomEvent("wheelContourLevelChanged", {
            "detail": {
                factor: contourFactor,
            }
        });
        document.dispatchEvent(wheelContourChanged);

        if (drawScene) this.drawScene();
    }

    drawZoomFrame(oldZoom: number, newZoom: number, iframe: number) {
        drawZoomFrame(this, oldZoom, newZoom, iframe)
    }

    setZoomAnimated(newZoom: number) {
        setZoomAnimated(this, newZoom)
    }

    setZoom(z: number, drawScene?: boolean) {
        const oldZoom = this.zoom
        this.zoom = z;
        const zoomChanged = new CustomEvent("zoomChanged", {
            "detail": {
                oldZoom,
                newZoom: z
            }
        });
        document.dispatchEvent(zoomChanged);
        this.props.onZoomChanged(z)

        if (drawScene) this.drawScene();
    }

    setShowAxes(a) {
        this.showAxes = a;
        this.drawScene();
    }

    recreateSilhouetteBuffers(){
        recreateSilhouetteBuffers(this)
    }

    createEdgeDetectFramebufferBuffer(width : number,height : number){
        createEdgeDetectFramebufferBuffer(this, width, height)
    }

    createGBuffers(width : number,height : number){
        createGBuffers(this, width, height)
    }

    createSSAOFramebufferBuffer(){
        createSSAOFramebufferBuffer(this)
    }

    createSimpleBlurOffScreeenBuffers(){
        createSimpleBlurOffScreeenBuffers(this)
    }

    recreateDepthPeelBuffers(width,height){
        recreateDepthPeelBuffers(this, width, height)
    }

    recreateOffScreeenBuffers(width,height){
        recreateOffScreeenBuffers(this, width, height)
    }

    initTextureFramebuffer() : void {
        initTextureFramebuffer(this)
    }

    centreOn(idx) {
        const displayBuffers = this.store.getState().glRef.displayBuffers
        const self = this;
        if (displayBuffers[idx].atoms.length > 0) {
            let xtot = 0;
            let ytot = 0;
            let ztot = 0;
            for (let j = 0; j < displayBuffers[idx].atoms.length; j++) {
                xtot += displayBuffers[idx].atoms[j].x;
                ytot += displayBuffers[idx].atoms[j].y;
                ztot += displayBuffers[idx].atoms[j].z;
            }
            xtot /= displayBuffers[idx].atoms.length;
            ytot /= displayBuffers[idx].atoms.length;
            ztot /= displayBuffers[idx].atoms.length;

            const new_origin = [-xtot, -ytot, -ztot];
            const old_origin = [this.origin[0], this.origin[1], this.origin[2]];

            const myVar = setInterval(function () { myTimer() }, 10);
            let frac = 0;
            function myTimer() {
                const ffrac = 0.01 * frac;
                self.origin = [ffrac * new_origin[0] + (1.0 - ffrac) * old_origin[0], ffrac * new_origin[1] + (1.0 - ffrac) * old_origin[1], ffrac * new_origin[2] + (1.0 - ffrac) * old_origin[2]];
                self.drawScene();
                if (frac > 99) {
                    clearInterval(myVar);
                }
                frac += 1;
            }
        }
    }

    initTextBuffersBuffer(buffer) {
        buffer.textNormalBuffer = this.gl.createBuffer();
        buffer.textPositionBuffer = this.gl.createBuffer();
        buffer.textColourBuffer = this.gl.createBuffer();
        buffer.textTexCoordBuffer = this.gl.createBuffer();
        buffer.textIndexesBuffer = this.gl.createBuffer();

        buffer.clickLinePositionBuffer = this.gl.createBuffer();
        buffer.clickLineColourBuffer = this.gl.createBuffer();
        buffer.clickLineIndexesBuffer = this.gl.createBuffer();
    }

    initTextBuffers() {
    }

    set_clip_range(clipStart: number, clipEnd: number, update?: boolean) : void {
        if (typeof (this.gl) === 'undefined') {
            return;
        }
        this.gl_clipPlane0[3] = -this.fogClipOffset - clipStart;
        this.gl_clipPlane1[3] = this.fogClipOffset + clipEnd;
        if (update)
            this.drawScene();
    }

    set_fog_range(fogStart: number, fogEnd: number, update?: boolean) : void {
        this.gl_fog_start = fogStart;
        this.gl_fog_end = fogEnd;
        //console.log("Fog "+this.gl_fog_start+" "+this.gl_fog_end);
        if (typeof (this.gl) === 'undefined') {
            return;
        }
        if (update)
            this.drawScene();
    }

    setLightUniforms(program,transform=true) {
        if(transform) {
            const light_position = vec3.create();
            vec3.transformMat4(light_position, this.light_positions, this.mvInvMatrix);
            NormalizeVec3(light_position);
            this.gl.uniform4fv(program.light_positions, new Float32Array([light_position[0],light_position[1],light_position[2],1.0]));
        } else {
            this.gl.uniform4fv(program.light_positions, this.light_positions);
        }
        this.gl.uniform4fv(program.light_colours_ambient, this.light_colours_ambient);
        this.gl.uniform4fv(program.light_colours_specular, this.light_colours_specular);
        this.gl.uniform4fv(program.light_colours_diffuse, this.light_colours_diffuse);
        if(program.specularPower) this.gl.uniform1f(program.specularPower, this.specularPower);
    }

    setMatrixUniforms(program) {
        this.gl.uniformMatrix4fv(program.pMatrixUniform, false, this.pMatrix);
        this.gl.uniformMatrix4fv(program.mvMatrixUniform, false, this.mvMatrix);
        this.gl.uniformMatrix4fv(program.mvInvMatrixUniform, false, this.mvInvMatrix);
        this.gl.uniform1f(program.fog_start, this.gl_fog_start);
        this.gl.uniform1f(program.fog_end, this.gl_fog_end);
        this.gl.uniform1i(program.nClipPlanes, this.gl_nClipPlanes);
        if(this.calculatingShadowMap&&typeof(this.atom_span)!=="undefined"){
            const offy = -this.atom_span+(this.fogClipOffset+this.gl_clipPlane0[3])
            this.gl.uniform4fv(program.clipPlane0, [0, 0, -1, offy]);
        }else{
            //console.log(this.gl_clipPlane0[3],this.gl_clipPlane1[3])
            this.gl.uniform4fv(program.clipPlane0, this.gl_clipPlane0);
        }
        this.gl.uniform4fv(program.clipPlane1, this.gl_clipPlane1);
        this.gl.uniform4fv(program.clipPlane2, this.gl_clipPlane2);
        this.gl.uniform4fv(program.clipPlane3, this.gl_clipPlane3);
        this.gl.uniform4fv(program.clipPlane4, this.gl_clipPlane4);
        this.gl.uniform4fv(program.clipPlane5, this.gl_clipPlane5);
        this.gl.uniform4fv(program.clipPlane6, this.gl_clipPlane6);
        this.gl.uniform4fv(program.clipPlane7, this.gl_clipPlane7);
        this.gl.uniform4fv(program.fogColour, new Float32Array(this.background_colour));
        if(Object.prototype.hasOwnProperty.call(program,"cursorPos")) {
            this.gl.uniform2fv(program.cursorPos, this.gl_cursorPos);
        }
    }

    buildBuffers() : void {
        if (typeof (this.imageBuffer) === "undefined") {
            const diskIndices = [];
            const diskNormals = [];
            this.imageVertices = [];
            const accuStep = 90;
            let diskIdx = 0;
            this.imageVertices.push(0.0);
            this.imageVertices.push(0.0);
            this.imageVertices.push(0.0);
            diskNormals.push(0.0);
            diskNormals.push(0.0);
            diskNormals.push(-1.0);
            diskIndices.push(diskIdx++);
            for (let theta = 45; theta <= 405; theta += accuStep) {
                const theta1 = Math.PI * (theta) / 180.0;
                const x1 = Math.cos(theta1);
                const y1 = Math.sin(theta1);
                this.imageVertices.push(x1);
                this.imageVertices.push(-y1);
                this.imageVertices.push(0.0);
                diskNormals.push(0.0);
                diskNormals.push(0.0);
                diskNormals.push(-1.0);
                diskIndices.push(diskIdx++);
            }
            this.imageBuffer = new DisplayBuffer();
            this.imageBuffer.triangleVertexNormalBuffer.push(this.gl.createBuffer());
            this.imageBuffer.triangleVertexPositionBuffer.push(this.gl.createBuffer());
            this.imageBuffer.triangleVertexIndexBuffer.push(this.gl.createBuffer());
            this.imageBuffer.triangleVertexTextureBuffer.push(this.gl.createBuffer());
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.imageBuffer.triangleVertexIndexBuffer[0]);
            this.imageBuffer.triangleVertexIndexBuffer[0].itemSize = 1;
            this.imageBuffer.triangleVertexIndexBuffer[0].numItems = diskIndices.length;
            if (this.isWebGL2) {
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(diskIndices), this.gl.STATIC_DRAW);
            } else {
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(diskIndices), this.gl.STATIC_DRAW);
            }
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.imageBuffer.triangleVertexNormalBuffer[0]);
            this.imageBuffer.triangleVertexNormalBuffer[0].itemSize = 3;
            this.imageBuffer.triangleVertexNormalBuffer[0].numItems = diskNormals.length / 3;
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(diskNormals), this.gl.STATIC_DRAW);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.imageBuffer.triangleVertexPositionBuffer[0]);
            this.imageBuffer.triangleVertexPositionBuffer[0].itemSize = 3;
            this.imageBuffer.triangleVertexPositionBuffer[0].numItems = this.imageVertices.length / 3;
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.imageVertices), this.gl.DYNAMIC_DRAW);

            const imageTextures = [0.5, 0.5, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0];
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.imageBuffer.triangleVertexTextureBuffer[0]);
            this.imageBuffer.triangleVertexTextureBuffer[0].itemSize = 2;
            this.imageBuffer.triangleVertexTextureBuffer[0].numItems = imageTextures.length / 2;
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(imageTextures), this.gl.STATIC_DRAW);
        }
        buildBuffers(this.displayBuffers, this.store)
    }

    drawTransformMatrixInteractive(transformMatrix:number[], transformOrigin:number[], buffer:any, shader:webGL.MGWebGLShader, vertexType:number, bufferIdx:number, specialDrawBuffer?:number) {
        drawTransformMatrixInteractive(this, transformMatrix, transformOrigin, buffer, shader, vertexType, bufferIdx, specialDrawBuffer);
    }

    applySymmetryMatrix(theShader,symmetryMatrix,tempMVMatrix,tempMVInvMatrix,doTransform=true){
        const symt = mat4.create();
        const invsymt = mat4.create();
        mat4.set(symt,
                symmetryMatrix[0], symmetryMatrix[1], symmetryMatrix[2], symmetryMatrix[3],
                symmetryMatrix[4], symmetryMatrix[5], symmetryMatrix[6], symmetryMatrix[7],
                symmetryMatrix[8], symmetryMatrix[9], symmetryMatrix[10], symmetryMatrix[11],
                symmetryMatrix[12], symmetryMatrix[13], symmetryMatrix[14], symmetryMatrix[15]);
        mat4.multiply(tempMVMatrix, this.mvMatrix, symt);
        mat4.invert(invsymt, symt);
        invsymt[12] = 0.0;
        invsymt[13] = 0.0;
        invsymt[14] = 0.0;
        this.gl.uniformMatrix4fv(theShader.mvMatrixUniform, false, tempMVMatrix);
        this.gl.uniformMatrix4fv(theShader.invSymMatrixUniform, false, invsymt);
        tempMVMatrix[12] = 0.0;
        tempMVMatrix[13] = 0.0;
        tempMVMatrix[14] = 0.0;
        mat4.invert(tempMVInvMatrix, tempMVMatrix);// All else
        this.gl.uniformMatrix4fv(theShader.mvInvMatrixUniform, false, tempMVInvMatrix);// All else

        if(doTransform){
            const light_position = vec3.create();
            vec3.transformMat4(light_position, this.light_positions, tempMVInvMatrix);
            NormalizeVec3(light_position);
            this.gl.uniform4fv(theShader.light_positions, new Float32Array([light_position[0],light_position[1],light_position[2],1.0]));
        }

        const screenZ = vec3.create();
        screenZ[0] = 0.0;
        screenZ[1] = 0.0;
        screenZ[2] = 1.0;
        vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
        this.gl.uniform3fv(theShader.screenZ, screenZ);
    }

    drawBuffer(theBuffer:any,theShaderIn:webGL.MGWebGLShader|webGL.ShaderTrianglesInstanced,j:number,vertexType:number,specialDrawBuffer?:any) : void {
        drawBuffer(this, theBuffer, theShaderIn, j, vertexType, specialDrawBuffer);
    }

    drawMaxElementsUInt(vertexType, numItems) {
        drawMaxElementsUInt(this, vertexType, numItems);
    }

    setupModelViewTransformMatrixInteractive(transformMatrix, transformOrigin, buffer, shader, vertexType, bufferIdx, specialDrawBuffer) {
        setupModelViewTransformMatrixInteractive(this, transformMatrix, transformOrigin, buffer, shader, vertexType, bufferIdx, specialDrawBuffer);
    }

    drawTransformMatrix(transformMatrix:number[], buffer:any, shader:any, vertexType:number, bufferIdx:number, specialDrawBuffer?:any) : void {
        drawTransformMatrix(this, transformMatrix, buffer, shader, vertexType, bufferIdx, specialDrawBuffer);
    }

    drawTransformMatrixInteractivePMV(transformMatrix:number[], transformOrigin:number[], buffer:any, shader:any, vertexType:number, bufferIdx:number) {
        drawTransformMatrixInteractivePMV(this, transformMatrix, transformOrigin, buffer, shader, vertexType, bufferIdx);
    }

    drawTransformMatrixPMV(transformMatrix:number[], buffer:any, shader:any, vertexType:number, bufferIdx:number) {
        drawTransformMatrixPMV(this, transformMatrix, buffer, shader, vertexType, bufferIdx);
    }

    GLrender(calculatingShadowMap,doClear=true,ratioMult=1.0) {
        const displayBuffers = this.store.getState().glRef.displayBuffers
        const ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight * ratioMult;

        let fb_scale = 1.0

        if(this.WEBGL2){
            this.gl.useProgram(this.shaderProgram);
            this.gl.uniform1f(this.shaderProgram.ssaoMultiviewWidthHeightRatio,1.0);
            this.gl.uniform1f(this.shaderProgram.zoom,this.zoom);
            this.gl.useProgram(this.shaderProgramInstanced);
            this.gl.uniform1f(this.shaderProgramInstanced.ssaoMultiviewWidthHeightRatio,1.0);
            this.gl.uniform1f(this.shaderProgramInstanced.zoom,this.zoom);
            this.gl.useProgram(this.shaderProgramPerfectSpheres);
            this.gl.uniform1f(this.shaderProgramPerfectSpheres.ssaoMultiviewWidthHeightRatio,1.0);
            this.gl.uniform1f(this.shaderProgramPerfectSpheres.zoom,this.zoom);
        }

        if (calculatingShadowMap) {
            if(!this.offScreenReady)
                this.recreateOffScreeenBuffers(this.canvas.width,this.canvas.height);
            if(!this.screenshotBuffersReady)
                this.initTextureFramebuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebufferDepth);
            this.gl.viewport(0, 0, this.rttFramebufferDepth.width, this.rttFramebufferDepth.height);
        } else if(this.drawingGBuffers) {
            const width_ratio = this.gl.viewportWidth / this.gFramebuffer.width;
            const height_ratio = this.gl.viewportHeight / this.gFramebuffer.height;
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gFramebuffer);
            this.gl.viewport(this.currentViewport[0]/ width_ratio, this.currentViewport[1]/ height_ratio, this.currentViewport[2]/ width_ratio, this.currentViewport[3]/ height_ratio);
        } else if(this.renderSilhouettesToTexture) {
            if(!this.silhouetteBufferReady)
                this.recreateSilhouetteBuffers();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.silhouetteFramebuffer);
            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        } else if(this.doDepthPeelPass&&this.renderToTexture&&(this.doMultiView||this.doThreeWayView||this.doSideBySideStereo||this.doCrossEyedStereo)) {
            if(!this.screenshotBuffersReady)
                this.initTextureFramebuffer();
            let viewport_start_x = Math.trunc(this.currentViewport[0] * this.rttFramebuffer.width  / this.gl.viewportWidth)
            let viewport_start_y = Math.trunc(this.currentViewport[1] * this.rttFramebuffer.height / this.gl.viewportHeight)
            let viewport_width =   Math.trunc(this.currentViewport[2] * this.rttFramebuffer.width  / this.gl.viewportWidth)
            let viewport_height =  Math.trunc(this.currentViewport[3] * this.rttFramebuffer.height / this.gl.viewportHeight)
            this.gl.viewport(viewport_start_x,viewport_start_y,viewport_width,viewport_height);
            if(this.gl.viewportWidth>this.gl.viewportHeight){
                const hp = this.gl.viewportHeight/this.gl.viewportWidth * this.rttFramebuffer.width
                const b = 0.5*(this.rttFramebuffer.height - hp)
                const vh = this.currentViewport[3] * this.rttFramebuffer.width  / this.gl.viewportWidth
                const bp = this.currentViewport[1] * this.rttFramebuffer.width  / this.gl.viewportWidth
                viewport_height = vh
                viewport_start_y = bp + b
            } else {
                const wp = this.gl.viewportWidth/this.gl.viewportHeight * this.rttFramebuffer.height
                const b = 0.5*(this.rttFramebuffer.width - wp)
                const vw = this.currentViewport[2] * this.rttFramebuffer.width  / this.gl.viewportHeight
                const bp = this.currentViewport[0] * this.rttFramebuffer.width  / this.gl.viewportHeight
                viewport_width = vw
                viewport_start_x =  bp + b
            }
            this.gl.viewport(viewport_start_x,viewport_start_y,viewport_width,viewport_height);
        } else if(this.doDepthPeelPass) {
            const viewport_start_x = Math.trunc(this.currentViewport[0] * this.depthPeelFramebuffers[0].width  / this.gl.viewportWidth)
            const viewport_start_y = Math.trunc(this.currentViewport[1] * this.depthPeelFramebuffers[0].height / this.gl.viewportHeight)
            const viewport_width =   Math.trunc(this.currentViewport[2] * this.depthPeelFramebuffers[0].width  / this.gl.viewportWidth)
            const viewport_height =  Math.trunc(this.currentViewport[3] * this.depthPeelFramebuffers[0].height / this.gl.viewportHeight)
            this.gl.viewport(viewport_start_x,viewport_start_y,viewport_width,viewport_height);
        } else if(this.renderToTexture) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebuffer);
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.depthFunc(this.gl.LESS);
            let viewport_start_x = Math.trunc(this.currentViewport[0] * this.rttFramebuffer.width  / this.gl.viewportWidth)
            let viewport_start_y = Math.trunc(this.currentViewport[1] * this.rttFramebuffer.height / this.gl.viewportHeight)
            let viewport_width =   Math.trunc(this.currentViewport[2] * this.rttFramebuffer.width  / this.gl.viewportWidth)
            let viewport_height =  Math.trunc(this.currentViewport[3] * this.rttFramebuffer.height / this.gl.viewportHeight)
            this.gl.viewport(viewport_start_x,viewport_start_y,viewport_width,viewport_height);
            if(this.doMultiView||this.doThreeWayView||this.doSideBySideStereo||this.doCrossEyedStereo){
                this.gl.useProgram(this.shaderProgram);
                if(this.WEBGL2) this.gl.uniform1f(this.shaderProgram.ssaoMultiviewWidthHeightRatio,1.0*this.canvas.width/this.canvas.height);
                this.gl.useProgram(this.shaderProgramInstanced);
                if(this.WEBGL2) this.gl.uniform1f(this.shaderProgramInstanced.ssaoMultiviewWidthHeightRatio,1.0*this.canvas.width/this.canvas.height);
                this.gl.useProgram(this.shaderProgramPerfectSpheres);
                if(this.WEBGL2) this.gl.uniform1f(this.shaderProgramPerfectSpheres.ssaoMultiviewWidthHeightRatio,1.0*this.canvas.width/this.canvas.height);
                if(this.gl.viewportWidth>this.gl.viewportHeight){
                    const hp = this.gl.viewportHeight/this.gl.viewportWidth * this.rttFramebuffer.width
                    const b = 0.5*(this.rttFramebuffer.height - hp)
                    const vh = this.currentViewport[3] * this.rttFramebuffer.width  / this.gl.viewportWidth
                    const bp = this.currentViewport[1] * this.rttFramebuffer.width  / this.gl.viewportWidth
                    viewport_height = vh
                    viewport_start_y = bp + b
                } else {
                    const wp = this.gl.viewportWidth/this.gl.viewportHeight * this.rttFramebuffer.height
                    const b = 0.5*(this.rttFramebuffer.width - wp)
                    const vw = this.currentViewport[2] * this.rttFramebuffer.width  / this.gl.viewportHeight
                    const bp = this.currentViewport[0] * this.rttFramebuffer.width  / this.gl.viewportHeight
                    viewport_width = vw
                    viewport_start_x =  bp + b
                }
                this.gl.viewport(viewport_start_x,viewport_start_y,viewport_width,viewport_height);
            } else {
                this.gl.viewport(0, 0, this.rttFramebuffer.width, this.rttFramebuffer.height);
            }
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            if(this.useOffScreenBuffers&&this.WEBGL2){
                if(!this.offScreenReady)
                    this.recreateOffScreeenBuffers(this.canvas.width,this.canvas.height);
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebuffer);
            }
            this.gl.viewport(this.currentViewport[0], this.currentViewport[1], this.currentViewport[2], this.currentViewport[3]);
        }

        if(this.renderSilhouettesToTexture||this.drawingGBuffers||(this.renderToTexture&&this.transparentScreenshotBackground)) {
            this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], 0.0);
        } else {
            this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], this.background_colour[3]);
        }
        if(this.doStenciling){
            if(!this.stenciling){
                this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
            }
        } else {
            if(doClear) this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        }

        mat4.identity(this.mvMatrix);

        const oldQuat = quat4.clone(this.myQuat);
        const newQuat = quat4.clone(this.myQuat);

        if (calculatingShadowMap) {

            let min_x =  1e5;
            let max_x = -1e5;
            let min_y =  1e5;
            let max_y = -1e5;
            let min_z =  1e5;
            let max_z = -1e5;

            displayBuffers.forEach(buffer => {
                if (buffer.visible) {
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
            let atom_span = Math.sqrt((max_x - min_x) * (max_x - min_x) + (max_y - min_y) * (max_y - min_y) +(max_z - min_z) * (max_z - min_z));
            atom_span = Math.min(1000.0,atom_span);
            this.atom_span = atom_span;
            const shadowExtent = Math.max(170.0,atom_span); // 170. ??

            //The extent (atom_span) should probably be scaled to viewable area - lets see if we can calculate that.
            //But, the angle of the light is important ...

            let d = Math.min(48*this.zoom,atom_span)

            let rotX = quat4.create();
            quat4.set(rotX, 0, 0, 0, -1);
            const zprime = vec3Create([this.light_positions[0], this.light_positions[1], this.light_positions[2]]);
            NormalizeVec3(zprime);
            const zorig = vec3Create([0.0, 0.0, 1.0]);
            const dp = vec3.dot(zprime, zorig);
            let tanA = 0.0;
            if ((1.0 - dp) > 1e-6) {
                const axis = vec3.create();
                vec3Cross(zprime, zorig, axis);
                NormalizeVec3(axis);
                const angle = -Math.acos(dp);
                const dval3 = Math.cos(angle / 2.0);
                const dval0 = axis[0] * Math.sin(angle / 2.0);
                const dval1 = axis[1] * Math.sin(angle / 2.0);
                const dval2 = axis[2] * Math.sin(angle / 2.0);
                rotX = quat4.create();
                quat4.set(rotX, dval0, dval1, dval2, dval3);
                quat4.multiply(newQuat, newQuat, rotX);
                tanA = Math.tan(angle)
            }

            let excess = Math.abs(shadowExtent*tanA);
            if(this.doPerspectiveProjection){
                excess += 150; // ?? It works.
            }
            d += excess;

            d /= 2.0
            d = Math.max(d,60.0)

            mat4.ortho(this.pMatrix, -d * ratio, d * ratio, -d, d, 0.1, 1000.0);
            mat4.translate(this.mvMatrix, this.mvMatrix, [0, 0, -atom_span]);

            this.gl.disable(this.gl.CULL_FACE);
            this.gl.cullFace(this.gl.FRONT);
        } else {
            this.gl.disable(this.gl.CULL_FACE);
            this.gl.cullFace(this.gl.BACK);
            if(this.renderToTexture){
                //FIXME - drawingGBuffers stanza?
                if(this.doPerspectiveProjection){
                    //FIXME - with  multiviews
                    mat4.perspective(this.pMatrix, 1.0, 1.0, 100, 1270.0);
                } else {
                    const f = this.gl_clipPlane0[3];
                    const b = Math.min(this.gl_clipPlane1[3],this.gl_fog_end);
                    if(this.currentViewport[2] > this.currentViewport[3]){
                        if(this.doMultiView||this.doThreeWayView||this.doSideBySideStereo||this.doCrossEyedStereo){
                            mat4.ortho(this.pMatrix, -24 * ratio, 24 * ratio, -24, 24, -f, b);
                        } else {
                            mat4.ortho(this.pMatrix, -24 * ratio, 24 * ratio, -24 * ratio, 24 * ratio, -f, b);
                        }
                    } else {
                        if(this.doMultiView||this.doThreeWayView||this.doSideBySideStereo||this.doCrossEyedStereo)
                            fb_scale = this.currentViewport[2]/this.currentViewport[3]
                        mat4.ortho(this.pMatrix, -24*fb_scale, 24*fb_scale, -24, 24, -f, b);
                    }
                }
            } else {
                if(this.doPerspectiveProjection){
                    mat4.perspective(this.pMatrix, 1.0, this.gl.viewportWidth / this.gl.viewportHeight, 100, 1270.0);
                } else {
                    const b = Math.min(this.gl_clipPlane1[3],this.gl_fog_end);
                    const f = this.gl_clipPlane0[3];
                    mat4.ortho(this.pMatrix, -24 * ratio, 24 * ratio, -24, 24, -f, b);
                }
            }

            mat4.translate(this.mvMatrix, this.mvMatrix, [0, 0, -this.fogClipOffset]);

        }

        this.myQuat = quat4.clone(newQuat);
        const theMatrix = quatToMat4(this.myQuat);

        mat4.multiply(this.mvMatrix, this.mvMatrix, theMatrix);

        mat4.identity(this.mvInvMatrix);

        const invQuat = quat4.create();
        quat4Inverse(this.myQuat, invQuat);

        const invMat = quatToMat4(invQuat);
        this.mvInvMatrix = invMat;

        const right = vec3.create();
        vec3.set(right, 1.0, 0.0, 0.0);
        const up = vec3.create();
        vec3.set(up, 0.0, 1.0, 0.0);
        vec3.transformMat4(up, up, invMat);
        vec3.transformMat4(right, right, invMat);

        this.screenZ[0] = 0.0;
        this.screenZ[1] = 0.0;
        this.screenZ[2] = 1.0;

        vec3.transformMat4(this.screenZ, this.screenZ, invMat);

        this.gl.useProgram(this.shaderProgram);
        if (this.backColour === "default") {
            this.gl.uniform1i(this.shaderProgram.defaultColour, true);
        } else {
            this.gl.uniform1i(this.shaderProgram.defaultColour, false);
            this.gl.uniform4fv(this.shaderProgram.backColour, new Float32Array(this.backColour as number[]));
        }
        this.gl.uniform1i(this.shaderProgram.shinyBack, this.shinyBack);

        this.gl.useProgram(this.shaderProgramInstanced);
        if (this.backColour === "default") {
            this.gl.uniform1i(this.shaderProgramInstanced.defaultColour, true);
        } else {
            this.gl.uniform1i(this.shaderProgramInstanced.defaultColour, false);
            this.gl.uniform4fv(this.shaderProgramInstanced.backColour, new Float32Array(this.backColour as number[]));
        }
        this.gl.uniform1i(this.shaderProgramInstanced.shinyBack, this.shinyBack);

        if(this.doPerspectiveProjection){
            //FIXME - What is the justificatio of 5.7? (Approximately tan(acos(48./270.)), but not quite close enough)....
            let perspMult = 1.0;
            if(this.renderToTexture){
                if(this.gl.viewportWidth > this.gl.viewportHeight){
                    perspMult = 1.0 / ratio;
                }
            }
            mat4.scale(this.pMatrix, this.pMatrix, [perspMult * 5.7 / this.zoom, perspMult * 5.7 / this.zoom, 1.0]);
        } else {
            mat4.scale(this.pMatrix, this.pMatrix, [1. / this.zoom, 1. / this.zoom, 1.0]);
        }
        mat4.translate(this.mvMatrix, this.mvMatrix, this.origin);

        this.pmvMatrix = mat4.create();
        mat4.multiply(this.pmvMatrix, this.pMatrix, this.mvMatrix);

        this.gl.useProgram(this.shaderProgramGBuffers);
        this.setMatrixUniforms(this.shaderProgramGBuffers);

        this.gl.useProgram(this.shaderProgramGBuffersInstanced);
        this.setMatrixUniforms(this.shaderProgramGBuffersInstanced);

        this.gl.useProgram(this.shaderProgramGBuffersPerfectSpheres);
        this.setMatrixUniforms(this.shaderProgramGBuffersPerfectSpheres);

        this.gl.useProgram(this.shaderProgram);
        this.setMatrixUniforms(this.shaderProgram);
        this.setLightUniforms(this.shaderProgram);

        this.gl.useProgram(this.shaderProgramOutline);
        this.setMatrixUniforms(this.shaderProgramOutline);
        this.setLightUniforms(this.shaderProgramOutline);

        this.gl.useProgram(this.shaderProgramInstanced);
        this.setMatrixUniforms(this.shaderProgramInstanced);
        this.setLightUniforms(this.shaderProgramInstanced);

        this.gl.useProgram(this.shaderProgramInstancedOutline);
        this.setMatrixUniforms(this.shaderProgramInstancedOutline);
        this.setLightUniforms(this.shaderProgramInstancedOutline);

        this.gl.useProgram(this.shaderProgramInstancedShadow);
        this.setMatrixUniforms(this.shaderProgramInstancedShadow);
        this.setLightUniforms(this.shaderProgramInstancedShadow);

        this.gl.useProgram(this.shaderProgramShadow);
        this.setMatrixUniforms(this.shaderProgramShadow);
        this.setLightUniforms(this.shaderProgramShadow);

        this.gl.useProgram(this.shaderProgramLines);
        this.setMatrixUniforms(this.shaderProgramLines);

        this.gl.useProgram(this.shaderProgramPointSpheres);
        this.setMatrixUniforms(this.shaderProgramPointSpheres);
        this.setLightUniforms(this.shaderProgramPointSpheres);

        this.gl.useProgram(this.shaderProgram);
        this.gl.enableVertexAttribArray(this.shaderProgram.vertexNormalAttribute);

        this.gl.useProgram(this.shaderProgramGBuffers);
        this.gl.enableVertexAttribArray(this.shaderProgramGBuffers.vertexNormalAttribute);

        this.gl.useProgram(this.shaderProgramGBuffersInstanced);
        this.gl.enableVertexAttribArray(this.shaderProgramGBuffersInstanced.vertexNormalAttribute);

        this.gl.useProgram(this.shaderProgramOutline);
        this.gl.enableVertexAttribArray(this.shaderProgramOutline.vertexNormalAttribute);

        //this.gl.useProgram(this.shaderProgramInstancedOutline);
        //this.gl.enableVertexAttribArray(this.shaderProgramInstancedOutline.vertexNormalAttribute);

        this.gl.useProgram(this.shaderProgramInstanced);
        this.gl.enableVertexAttribArray(this.shaderProgramInstanced.vertexNormalAttribute);

        if(this.doDepthPeelPass||(this.drawingGBuffers&&this.doPerspectiveProjection)){
            this.gl.disable(this.gl.BLEND);
        } else {
            this.gl.enable(this.gl.BLEND);
        }

        if(this.drawingGBuffers){
            this.drawTriangles(calculatingShadowMap, invMat);
            return;
        }

        this.drawTriangles(calculatingShadowMap, invMat);

        if(!calculatingShadowMap){
            this.drawImagesAndText(invMat);
            if(this.atomLabelDepthMode) this.drawDistancesAndLabels();
            this.drawTextLabels(up, right);
            if(this.WEBGL2){
                this.drawTexturedShapes(theMatrix);
            }
            //this.drawCircles(up, right);
        }

        this.myQuat = quat4.clone(oldQuat);

        return invMat;

    }

    drawPeel(theShaders,doClear=true,ratioMult=1.0){
        return drawPeel(this, theShaders,doClear,ratioMult)
    }

    getMultiViewInfo() : {multiViewOrigins,multiViewGroupsKeys,quats,viewports,ratioMult,multi_rows_cols} {

        const displayBuffers = this.store.getState().glRef.displayBuffers

        const multiViewOrigins = []
        let multiViewGroupsKeys = []

        let quats
        let viewports
        let ratioMult = 1.0
        let multi_rows_cols = {rows:0,cols:0}

        if(this.doThreeWayView){
            quats = this.threeWayQuats
            viewports = this.threeWayViewports
        } else if(this.doMultiView) {

            const multiViewGroups = {}
            for (let idx = 0; idx < displayBuffers.length; idx++) {
                if(displayBuffers[idx].multiViewGroup!==undefined&&displayBuffers[idx].origin&&displayBuffers[idx].origin.length===3){
                    //console.log(idx,displayBuffers[idx].multiViewGroup)
                    if(Object.hasOwn(displayBuffers[idx], "isHoverBuffer")&&!displayBuffers[idx].isHoverBuffer){
                        if(!(displayBuffers[idx].multiViewGroup in multiViewGroups)){
                            multiViewGroups[displayBuffers[idx].multiViewGroup] = displayBuffers[idx].multiViewGroup
                            multiViewOrigins[displayBuffers[idx].multiViewGroup] = displayBuffers[idx].origin
                        }
                    }
                }
            }
            //console.log(multiViewGroups)
            this.multiViewOrigins = multiViewOrigins
            multiViewGroupsKeys = Object.keys(multiViewGroups)
            if(this.multiWayViewports.length!==multiViewGroupsKeys.length&&multiViewGroupsKeys.length>0){
                multi_rows_cols = this.setupMultiWayTransformations(multiViewGroupsKeys.length)
            }

            quats = this.multiWayQuats
            viewports = this.multiWayViewports
            ratioMult = this.multiWayRatio
        } else if(this.doSideBySideStereo) {
            quats = this.stereoQuats
            viewports = this.stereoViewports
            ratioMult = 0.5
        } else {
            quats = this.stereoQuats.toReversed()
            viewports = this.stereoViewports
            ratioMult = 0.5
        }

        return {multiViewOrigins,multiViewGroupsKeys,quats,viewports,ratioMult,multi_rows_cols}

    }

    drawScene() : void {
        drawScene(this)
    }

    depthBlur(invMat) {

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        //Hmm - Why these 3 lines?
        //this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], this.background_colour[3]);
        //this.gl.clearColor(1.0,1.0,0.0,1.0);
        //this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        const paintMvMatrix = mat4.create();
        const paintPMatrix = mat4.create();
        mat4.identity(paintMvMatrix);
        mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);

        let srcWidth;
        let srcHeight;
        let dstWidth;
        let dstHeight;
        if(this.renderToTexture&&!this.doPeel) {
            this.recreateOffScreeenBuffers(this.rttFramebuffer.width,this.rttFramebuffer.height);
            // FIXME - This cannnot work with current framebuffers, textures, etc.
            console.log("Need to combine depthBlur and screenshot ...");
            this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.rttFramebuffer);
            this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.rttFramebufferColor);
            srcWidth = this.rttFramebuffer.width;
            srcHeight = this.rttFramebuffer.height;
            dstWidth = srcWidth;
            dstHeight = srcHeight;
        } else {
            this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.offScreenFramebuffer);
            this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.offScreenFramebufferColor);
            srcWidth = this.offScreenFramebuffer.width;
            srcHeight = this.offScreenFramebuffer.height;
            dstWidth = this.offScreenFramebufferColor.width;
            dstHeight = this.offScreenFramebufferColor.height;
        }

        this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 1.0, 1.0, 1.0]);
        this.gl.clearBufferfi(this.gl.DEPTH_STENCIL, 0, 0.0, 0);

        this.gl.blitFramebuffer(0, 0, srcWidth, srcHeight, 0, 0, dstWidth, dstHeight, this.gl.COLOR_BUFFER_BIT, this.gl.LINEAR);
        this.gl.blitFramebuffer(0, 0, srcWidth, srcHeight, 0, 0, dstWidth, dstHeight, this.gl.DEPTH_BUFFER_BIT, this.gl.NEAREST);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);


        /*
         * In focus     - this.offScreenFramebufferBlurX
         * Out of focus - this.blurYTexture
         * Depth        - this.offScreenDepthTexture
         */

        //This is an example of chaining framebuffer shader effects.
        //FIXME - Scale to deal with different sized Framebuffers ...
        const blurSizeX = this.blurSize/this.gl.viewportWidth;
        let blurSizeY = this.blurSize/this.gl.viewportHeight;
        if(this.renderToTexture)
            blurSizeY *= this.gl.viewportHeight/dstHeight;

        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.blurUBOBuffer);
        this.makeBlurBuffers(this.blurSize);
        this.gl.useProgram(this.shaderProgramBlurX);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);
        this.gl.enableVertexAttribArray(this.shaderProgramBlurX.vertexTextureAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramBlurX.vertexPositionAttribute);

        this.gl.uniform1i(this.shaderProgramBlurX.inputTexture,0);
        this.gl.uniform1i(this.shaderProgramBlurX.depthTexture,1);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferBlurX);

        this.gl.activeTexture(this.gl.TEXTURE0);
        if(this.renderToTexture&&!this.doPeel) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTexture);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);
        }
        this.gl.activeTexture(this.gl.TEXTURE1);
        if(this.doPeel){
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelDepthTextures[0]);
        } else if(this.renderToTexture) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttDepthTexture);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);
        }
        if(this.renderToTexture) {
            this.gl.viewport(0, 0, srcWidth, srcHeight);
        } else {
            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        }

        this.gl.uniformMatrix4fv(this.shaderProgramBlurX.pMatrixUniform, false, paintPMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgramBlurX.mvMatrixUniform, false, paintMvMatrix);

        let f = -(this.gl_clipPlane0[3]);
        let b = Math.min(this.gl_clipPlane1[3],this.gl_fog_end);
        if(this.doPerspectiveProjection){
            f = 100
            b = 270
        }

        const displayBuffers = this.store.getState().glRef.displayBuffers
        let min_x =  1e5;
        let max_x = -1e5;
        let min_y =  1e5;
        let max_y = -1e5;
        let min_z =  1e5;
        let max_z = -1e5;

        displayBuffers.forEach(buffer => {
            if (buffer.visible) {
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
        //console.log(min_x,min_y,min_z,max_x,max_y,max_z)
        let atom_span = Math.sqrt((max_x - min_x) * (max_x - min_x) + (max_y - min_y) * (max_y - min_y) +(max_z - min_z) * (max_z - min_z));
        atom_span = Math.min(1000.0,atom_span);
        this.atom_span = atom_span;

        //console.log("In blur",f.toFixed(2),b.toFixed(2),this.blurDepth.toFixed(2))
        const fPrime = f-this.fogClipOffset
        const bPrime = b-this.fogClipOffset
        //NB The 1.5 scaling is because it is 2 * 0.75 where 0.75 is scaling in the new widget.
        const fPrimeFrac = fPrime/(1.5*atom_span)+0.5
        const bPrimeFrac = bPrime/(1.5*atom_span)+0.5
        const fracDepth = (this.blurDepth-fPrimeFrac)/(bPrimeFrac-fPrimeFrac)

        this.gl.uniform1f(this.shaderProgramBlurX.blurDepth,fracDepth);
        this.gl.uniform1f(this.shaderProgramBlurX.blurSize,blurSizeX);

        if(this.renderToTexture&&this.transparentScreenshotBackground){
            this.gl.clearBufferfv(this.gl.COLOR, 0, [this.background_colour[0], this.background_colour[1], this.background_colour[2], 0.0]);
        } else {
            this.gl.clearBufferfv(this.gl.COLOR, 0, [this.background_colour[0], this.background_colour[1], this.background_colour[2], 1.0]);
        }
        this.bindFramebufferDrawBuffers();

        if (this.ext) {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        }

        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.blurUBOBuffer);
        this.makeBlurBuffers(this.blurSize);
        this.gl.useProgram(this.shaderProgramBlurY);
        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);
        this.gl.enableVertexAttribArray(this.shaderProgramBlurY.vertexTextureAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramBlurY.vertexPositionAttribute);

        this.gl.uniform1i(this.shaderProgramBlurY.inputTexture,0);
        this.gl.uniform1i(this.shaderProgramBlurY.depthTexture,1);

        this.gl.enableVertexAttribArray(this.shaderProgramBlurY.vertexTextureAttribute);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferBlurY);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurXTexture);
        this.gl.activeTexture(this.gl.TEXTURE1);
        if(this.doPeel){
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelDepthTextures[0]);
        } else if(this.renderToTexture) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttDepthTexture);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);
        }
        if(this.renderToTexture) {
            this.gl.viewport(0, 0, srcWidth, srcHeight);
        } else {
            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        }

        this.gl.uniformMatrix4fv(this.shaderProgramBlurY.pMatrixUniform, false, paintPMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgramBlurY.mvMatrixUniform, false, paintMvMatrix);

        this.gl.uniform1f(this.shaderProgramBlurY.blurDepth,fracDepth);
        this.gl.uniform1f(this.shaderProgramBlurY.blurSize,blurSizeY);

        if(this.renderToTexture&&this.transparentScreenshotBackground){
            this.gl.clearBufferfv(this.gl.COLOR, 0, [this.background_colour[0], this.background_colour[1], this.background_colour[2], 0.0]);
        } else {
            this.gl.clearBufferfv(this.gl.COLOR, 0, [this.background_colour[0], this.background_colour[1], this.background_colour[2], 1.0]);
        }
        this.bindFramebufferDrawBuffers();

        if (this.ext) {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        }

        if(this.renderToTexture) {
            //Do something different from below ....
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebuffer);
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture);
        this.gl.useProgram(this.shaderProgramRenderFrameBuffer);
        this.gl.uniform1f(this.shaderProgramRenderFrameBuffer.blurDepth,fracDepth);

        this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.focussedTexture,0);
        this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.blurredTexture,1);
        this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.depthTexture,2);

        this.gl.activeTexture(this.gl.TEXTURE0);
        if(this.renderToTexture&&!this.doPeel) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTexture);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);
        }


        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture);

        this.gl.activeTexture(this.gl.TEXTURE2);
        if(this.doPeel){
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelDepthTextures[0]);
        } else if(this.renderToTexture) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttDepthTexture);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);
        }

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);
        this.gl.enableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexPositionAttribute);

        if(this.renderToTexture) {
            this.gl.viewport(0, 0, srcWidth, srcHeight);
        } else {
            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        }

        this.gl.uniformMatrix4fv(this.shaderProgramRenderFrameBuffer.pMatrixUniform, false, paintPMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgramRenderFrameBuffer.mvMatrixUniform, false, paintMvMatrix);

        this.bindFramebufferDrawBuffers();

        if (this.ext) {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        }

        if(!this.atomLabelDepthMode) this.drawDistancesAndLabels();
        this.drawLineMeasures(invMat);
        this.drawTextOverlays(invMat);

        if(this.renderToTexture) {
            console.log("SCREENSHOT MkII !");

            const width_ratio = this.gl.viewportWidth / this.rttFramebuffer.width;
            const height_ratio = this.gl.viewportHeight / this.rttFramebuffer.height;
            if (this.WEBGL2) {
                this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.rttFramebuffer);
                this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.rttFramebufferColor);
                this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 1.0, 1.0, 1.0]);
                this.gl.blitFramebuffer(0, 0, this.rttFramebuffer.width, this.rttFramebuffer.height,
                        0, 0, this.rttFramebuffer.width, this.rttFramebuffer.height,
                        this.gl.COLOR_BUFFER_BIT, this.gl.LINEAR);

                this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.rttFramebufferColor);
                for(let i=0;i<this.depthPeelFramebuffers.length;i++){
                    this.gl.deleteFramebuffer(this.depthPeelFramebuffers[i]);
                    this.gl.deleteRenderbuffer(this.depthPeelRenderbufferDepth[i]);
                    this.gl.deleteRenderbuffer(this.depthPeelRenderbufferColor[i]);
                    this.gl.deleteTexture(this.depthPeelColorTextures[i]);
                    this.gl.deleteTexture(this.depthPeelDepthTextures[i]);
                }
                this.depthPeelFramebuffers = [];
                this.offScreenReady = false
            }
            this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.rttFramebufferColor);
            const pixels = new Uint8Array(this.gl.viewportWidth / width_ratio * this.gl.viewportHeight / height_ratio * 4);
            this.gl.readPixels(0, 0, this.gl.viewportWidth / width_ratio, this.gl.viewportHeight / height_ratio, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
            this.pixel_data = pixels;
            this.recreateOffScreeenBuffers(this.canvas.width,this.canvas.height);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }

        this.gl.disableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    }

    textureBlur(width,height,inputTexture) {

        const paintMvMatrix = mat4.create();
        const paintPMatrix = mat4.create();
        mat4.identity(paintMvMatrix);
        mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);

        const blurSize = 3

        const blurSizeX = blurSize/width;
        const blurSizeY = blurSize/height;

        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.blurUBOBuffer);
        this.makeBlurBuffers(blurSize);
        this.gl.useProgram(this.shaderProgramSimpleBlurX);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);
        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurX.vertexTextureAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurX.vertexPositionAttribute);

        this.gl.uniform1i(this.shaderProgramSimpleBlurX.inputTexture,0);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferSimpleBlurX);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inputTexture);
        this.gl.viewport(0, 0, width, height);

        this.gl.uniformMatrix4fv(this.shaderProgramSimpleBlurX.pMatrixUniform, false, paintPMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgramSimpleBlurX.mvMatrixUniform, false, paintMvMatrix);

        this.gl.uniform1f(this.shaderProgramSimpleBlurX.blurSize,blurSizeX);

        this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
        this.bindFramebufferDrawBuffers();

        if (this.ext) {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        }

        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.blurUBOBuffer);
        this.makeBlurBuffers(blurSize);
        this.gl.useProgram(this.shaderProgramSimpleBlurY);
        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);
        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurY.vertexTextureAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurY.vertexPositionAttribute);

        this.gl.uniform1i(this.shaderProgramSimpleBlurY.inputTexture,0);

        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurY.vertexTextureAttribute);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferSimpleBlurY);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurXTexture);
        this.gl.viewport(0, 0, width, height);

        this.gl.uniformMatrix4fv(this.shaderProgramSimpleBlurY.pMatrixUniform, false, paintPMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgramSimpleBlurY.mvMatrixUniform, false, paintMvMatrix);

        this.gl.uniform1f(this.shaderProgramSimpleBlurY.blurSize,blurSizeY);

        this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
        this.bindFramebufferDrawBuffers();

        if (this.ext) {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        // And now our FB texture is blurred
    }

    bindFramebufferDrawBuffers() {
        if(!this.framebufferDrawBuffersReady) {
            const textTexCoords = [0.0, 0.0, 1.0, 0.0, 1.0, 1.0,
                  0.0, 0.0, 1.0, 1.0, 0.0, 1.0];
            const textVertices = [
                -1.0, - 1.0, -200,
                1.0, - 1.0, -200,
                1.0,  1.0, -200,
                -1.0,  - 1.0, -200,
                1.0, 1.0, -200,
                -1.0,  1.0, -200];
            const textIndexs = [0, 2, 1, 3, 4, 5];

            this.framebufferDrawPositionBuffer = this.gl.createBuffer();
            this.framebufferDrawTexCoordBuffer = this.gl.createBuffer();
            this.framebufferDrawIndexesBuffer = this.gl.createBuffer();

            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.framebufferDrawIndexesBuffer);
            if (this.ext) {
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(textIndexs), this.gl.STATIC_DRAW);
            } else {
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(textIndexs), this.gl.STATIC_DRAW);
            }

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.framebufferDrawTexCoordBuffer);
            this.gl.vertexAttribPointer(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textTexCoords), this.gl.STATIC_DRAW);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.framebufferDrawPositionBuffer);
            this.gl.vertexAttribPointer(this.shaderProgramRenderFrameBuffer.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textVertices), this.gl.DYNAMIC_DRAW);
            this.framebufferDrawBuffersReady = true;
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.framebufferDrawTexCoordBuffer);
        this.gl.vertexAttribPointer(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.framebufferDrawPositionBuffer);
        this.gl.vertexAttribPointer(this.shaderProgramRenderFrameBuffer.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.framebufferDrawIndexesBuffer);
    }

    drawTriangles(calculatingShadowMap, invMat) {
        drawTriangles(this, calculatingShadowMap, invMat)
    }

    drawTransparent(theMatrix) {
        drawTransparent(this, theMatrix)
    }

    drawImagesAndText(invMat) {
        drawImagesAndText(this, invMat)
    }

    clearTextPositionBuffers() {
        if(this.displayBuffers && this.displayBuffers[0])
            delete this.displayBuffers[0].textPositionBuffer;
    }

    drawTexturedShapes(invMat) {
        drawTexturedShapes(this, invMat)
    }

    drawTextLabels(up, right) {
        drawTextLabels(this, up, right)
    }

    isWebGL2() {
        return this.WEBGL2;
    }

    drawDistancesAndLabels() {
        drawDistancesAndLabels(this)
    }

    drawCircles(up, right) {
        drawCircles(this, up, right)
    }

    getFrontAndBackPos(event: KeyboardEvent) : [number[], number[], number, number]  {
        const x = this.gl_cursorPos[0];
        const y = this.canvas.height - this.gl_cursorPos[1];
        const invQuat = quat4.create();
        quat4Inverse(this.myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;
        const minX = (-24. * ratio * this.zoom);
        const maxX = (24. * ratio * this.zoom);
        const minY = (-24. * this.zoom);
        const maxY = (24. * this.zoom);
        const fracX = 1.0 * x / this.gl.viewportWidth;
        const fracY = 1.0 * (y) / this.gl.viewportHeight;
        const theX = minX + fracX * (maxX - minX);
        const theY = maxY - fracY * (maxY - minY);
        //let frontPos = vec3Create([theX,theY,-1000.0]);
        //let backPos  = vec3Create([theX,theY,1000.0]);
        //MN Changed to improve picking
        const frontPos = vec3Create([theX, theY, -this.gl_clipPlane0[3] - this.fogClipOffset]);
        const backPos = vec3Create([theX, theY, this.gl_clipPlane1[3] - this.fogClipOffset]);
        vec3.transformMat4(frontPos, frontPos, theMatrix);
        vec3.transformMat4(backPos, backPos, theMatrix);
        vec3.subtract(frontPos, frontPos, this.origin);
        vec3.subtract(backPos, backPos, this.origin);
        return [frontPos, backPos, x, y];
    }

    doRightClick(event, self) {
        doRightClick(this, event)
    }

    doClick(event, self) {
        doClick(this, event)
    }

    updateLabels(){
        const displayBuffers = this.store.getState().glRef.displayBuffers
        let newBuffers = []
        const self = this;
        this.clearMeasureCylinderBuffers()
        const atomPairs = []
        this.measuredAtoms.forEach(bump => {
            if(bump.length>1){
                for(let ib=1;ib<bump.length;ib++){
                    const first = bump[ib];
                    const second = bump[ib-1];
                    const firstAtomInfo = {
                        pos: [first.x, first.y, first.z],
                        x: first.x,
                        y: first.y,
                        z: first.z,
                    }

                    const secondAtomInfo = {
                        pos: [second.x, second.y, second.z],
                        x: second.x,
                        y: second.y,
                        z: second.z,
                    }

                    const pair = [firstAtomInfo, secondAtomInfo]
                    atomPairs.push(pair)

                    const v1 = vec3Create([first.x, first.y, first.z]);
                    const v2 = vec3Create([second.x, second.y, second.z]);

                    const v1diffv2 = vec3.create();
                    vec3Subtract(v1, v2, v1diffv2);
                    const linesize = vec3.length(v1diffv2).toFixed(3);
                    const mid = vec3.create();
                    vec3Add(v1, v2, mid);
                    mid[0] *= 0.5;
                    mid[1] *= 0.5;
                    mid[2] *= 0.5;
                    this.measureTextCanvasTexture.addBigTextureTextImage({font:this.glTextFont,text:linesize,x:mid[0],y:mid[1],z:mid[2]})
                    if(bump.length>2&&ib>1){
                        const third = bump[ib-2];
                        const v3 = vec3Create([third.x, third.y, third.z]);
                        const v2diffv3 = vec3.create();
                        vec3Subtract(v2, v3, v2diffv3);
                        NormalizeVec3(v2diffv3);
                        const v2diffv1 = vec3.create();
                        vec3Subtract(v2, v1, v2diffv1);
                        NormalizeVec3(v2diffv1);

                        const v12plusv23 = vec3.create();
                        vec3Add(v2diffv3, v2diffv1, v12plusv23);
                        NormalizeVec3(v12plusv23);
                        v12plusv23[0] *= -.5
                        v12plusv23[1] *= -.5
                        v12plusv23[2] *= -.5

                        const angle = (Math.acos(vec3.dot(v2diffv1, v2diffv3)) * 180.0 / Math.PI).toFixed(1)+"˚";
                        this.measureTextCanvasTexture.addBigTextureTextImage({font:this.glTextFont,text:angle,x:second.x+v12plusv23[0],y:second.y+v12plusv23[1],z:second.z+v12plusv23[2]})

                        if(bump.length>3&&ib>2){
                            const fourth = bump[ib-3];
                            const v4 = vec3Create([fourth.x, fourth.y, fourth.z]);
                            const dihedral = (DihedralAngle(v1, v2, v3, v4) * 180.0 / Math.PI).toFixed(1)+"˚"
                            const cross = vec3.create();
                            vec3Cross(v2diffv1, v2diffv3,cross)
                            NormalizeVec3(cross);
                            const dihedralOffset = vec3.create();
                            vec3Cross(v2diffv3, cross, dihedralOffset)
                            dihedralOffset[0] *= .25
                            dihedralOffset[1] *= .25
                            dihedralOffset[2] *= .25
                            const mid23 = vec3.create();
                            vec3Add(v2, v3, mid23);
                            mid23[0] *= 0.5;
                            mid23[1] *= 0.5;
                            mid23[2] *= 0.5;
                            this.measureTextCanvasTexture.addBigTextureTextImage({font:this.glTextFont,text:dihedral,x:mid23[0]+dihedralOffset[0],y:mid23[1]+dihedralOffset[1],z:mid23[2]+dihedralOffset[2]})
                        }
                    }

                }
            }
        })
        const atomColours = {}
        const colour = [1.0,0.0,0.0,1.0]
        atomPairs.forEach(atom => { atomColours[`${atom[0].serial}`] = colour; atomColours[`${atom[1].serial}`] = colour })
        const objects = [
            gemmiAtomPairsToCylindersInfo(atomPairs, 0.07, atomColours, false, 0.01, 1000.0)
        ]
        objects.filter(object => typeof object !== 'undefined' && object !== null).forEach(object => {
            const a = appendOtherData(object, this.store, true);
            newBuffers = [...newBuffers,...a]
            buildBuffers(a, this.store)
            self.measureCylinderBuffers = self.measureCylinderBuffers.concat(a)
        })
        self.measuredAtoms.forEach(atoms => {
            atoms.forEach(atom => {
                self.measureTextCanvasTexture.addBigTextureTextImage({font:self.glTextFont,text:atom.label,x:atom.x,y:atom.y,z:atom.z})
            })
        })

        self.labelledAtoms.forEach(atoms => {
            atoms.forEach(atom => {
                self.measureTextCanvasTexture.addBigTextureTextImage({font:self.glTextFont,text:atom.label,x:atom.x,y:atom.y,z:atom.z})
            })
        })

        self.environmentAtoms.forEach(atoms => {
            atoms.forEach(atom => {
                self.measureTextCanvasTexture.addBigTextureTextImage({font:self.glTextFont,text:atom.label,x:atom.atom.x,y:atom.atom.y,z:atom.atom.z})
            })
        })

        this.measureTextCanvasTexture.recreateBigTextureBuffers();
        this.dispatch(setDisplayBuffers([...displayBuffers,...newBuffers]))
    }

    clearMeasureCylinderBuffers() : void {
        if(this.measureCylinderBuffers){
            this.measureCylinderBuffers.forEach((buffer) => {
                if("clearBuffers" in buffer){
                    buffer.clearBuffers()
                    this.displayBuffers = this.displayBuffers.filter(glBuffer => glBuffer.id !== buffer.id)
                }
            })
        }
        this.measureCylinderBuffers = []
        this.measureTextCanvasTexture.clearBigTexture()
    }

    getThreeWayMatrixAndViewPort(x,yp,quats,viewports){
        const newQuat = quat4.clone(this.myQuat);
        let mvMatrix = []
        let viewportArray = []
        let theQuat = null
        for(let i=0;i<viewports.length;i++){
            if(x>=viewports[i][0]&&x<(viewports[i][0]+viewports[i][2])&&
               yp>=viewports[i][1]&&yp<(viewports[i][1]+viewports[i][3])){
                viewportArray = viewports[i]
                const theMatrix = mat4.create()
                mat4.translate(theMatrix, theMatrix, [0, 0, -this.fogClipOffset]);
                quat4.multiply(newQuat, newQuat, quats[i]);
                const theRotMatrix = quatToMat4(newQuat);
                mat4.multiply(theMatrix, theMatrix, theRotMatrix);
                if(this.doMultiView&&i<=this.multiViewOrigins.length&&this.multiViewOrigins.length>0&&this.multiViewOrigins[i])
                    mat4.translate(theMatrix, theMatrix, this.multiViewOrigins[i])
                else
                    mat4.translate(theMatrix, theMatrix, this.origin)
                mvMatrix = theMatrix
                theQuat = quats[i]
            }
        }
       return {"mat":mvMatrix,"viewport":viewportArray,quat:theQuat}
    }

    getAtomFomMouseXY(event, self) {
        const displayBuffers = this.store.getState().glRef.displayBuffers
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

        const c = this.canvasRef.current;
        const offset = getOffsetRect(c);

        x -= offset.left;
        y -= offset.top;
        x *= getDeviceScale();
        y *= getDeviceScale();

        let viewportArray = [
            0, 0, this.gl.viewportWidth, this.gl.viewportHeight
        ];
        let mvMatrix = mat4.clone(this.mvMatrix)

        const yp = this.canvas.height - y

        if(this.doMultiView||this.doThreeWayView||this.doSideBySideStereo||this.doCrossEyedStereo){
            let viewports
            let quats

            if(this.doThreeWayView){
                quats = this.threeWayQuats
                viewports = this.threeWayViewports
            } else if(this.doMultiView) {
                quats = this.multiWayQuats
                viewports = this.multiWayViewports
            } else if(this.doSideBySideStereo) {
                quats = this.stereoQuats
                viewports = this.stereoViewports
            } else {
                quats = this.stereoQuats.toReversed()
                viewports = this.stereoViewports
            }

            const mVPQ = this.getThreeWayMatrixAndViewPort(x,yp,quats,viewports)
            if(mVPQ.mat.length>0&& mVPQ.viewport.length>0) {
                mvMatrix = mVPQ.mat
                viewportArray = mVPQ.viewport
            }
        }

        // The results of the operation will be stored in this array.
        const modelPointArrayResultsFront = [];
        const modelPointArrayResultsBack = [];

        //FIXME - This is hackery
        let factor = 999.9;
        if(this.doPerspectiveProjection){
            factor = 99.9;
        }
        let success = unProject(
                x, yp, -(this.gl_clipPlane0[3]-this.fogClipOffset)/factor,
                mvMatrix as unknown as number[], this.pMatrix as unknown as number[],
                viewportArray, modelPointArrayResultsFront);

        success = unProject(
                x, yp, -(this.gl_clipPlane1[3]-this.fogClipOffset)/factor,
                mvMatrix as unknown as number[], this.pMatrix as unknown as number[],
                viewportArray, modelPointArrayResultsBack);

        let mindist = 100000.0;
        let minx = 100000.0;
        let miny = 100000.0;
        let minz = 100000.0;
        let minidx = -1;
        let minj = -1;
        //FIXME - This needs to depend on whether spheres, surface are drawn

        let minsym = -1;

        for (let idx = 0; idx < displayBuffers.length; idx++) {
            let clickTol = 3.65 * this.zoom;
            if (!displayBuffers[idx].visible) {
                continue;
            }
            if(displayBuffers[idx].clickTol){
                clickTol = displayBuffers[idx].clickTol;
            }
            for (let j = 0; j < displayBuffers[idx].atoms.length; j++) {

                const atx = displayBuffers[idx].atoms[j].x;
                const aty = displayBuffers[idx].atoms[j].y;
                const atz = displayBuffers[idx].atoms[j].z;
                const p = vec3Create([atx, aty, atz]);

                const dpl = DistanceBetweenPointAndLine(modelPointArrayResultsFront, modelPointArrayResultsBack, p);

                const atPosTrans = vec3Create([0, 0, 0]);
                vec3.transformMat4(atPosTrans, p, mvMatrix);
                const azDot = this.gl_clipPlane0[3]-atPosTrans[2];
                const bzDot = this.gl_clipPlane1[3]+atPosTrans[2];

                if (
                        dpl[0] < clickTol //* targetFactor //clickTol modified to reflect proximity to rptation origin
                        && dpl[0] < mindist //closest click seen
                        && azDot > 0 //Beyond near clipping plane
                        && bzDot > 0 //In front of far clipping plan
                   ) {
                    minidx = idx;
                    minj = j;
                    mindist = dpl[0];
                }
            }
            let isym = 0;
            displayBuffers[idx].symmetryAtoms.forEach(symmats => {
                let j = 0;
                symmats.forEach(symmat => {
                    const p = symmat.pos;
                    const dpl = DistanceBetweenPointAndLine(modelPointArrayResultsFront, modelPointArrayResultsBack, p);
                    const atPosTrans = vec3Create([0, 0, 0]);
                    vec3.transformMat4(atPosTrans, p, mvMatrix);
                    const azDot = this.gl_clipPlane0[3]-atPosTrans[2];
                    const bzDot = this.gl_clipPlane1[3]+atPosTrans[2];
                    if (
                        dpl[0] < clickTol //* targetFactor //clickTol modified to reflect proximity to rptation origin
                        && dpl[0] < mindist //closest click seen
                        && azDot > 0 //Beyond near clipping plane
                        && bzDot > 0 //In front of far clipping plan
                    ) {
                    minidx = idx;
                    minj = j;
                    mindist = dpl[0];
                    minsym = isym;
                    minx = p[0];
                    miny = p[1];
                    minz = p[2];
                    }
                    j++;
                })
                isym++;
            })
        }

        return [minidx,minj,mindist,minsym,minx,miny,minz];

    }

    hoverDebounceTimeout: NodeJS.Timeout | null = null;

    doHover(event, self) {
        doHover(this, event)
    }

    doWheel(event) {
        doWheel(this, event)
    }

    drawLineMeasures(invMat) {
        drawLineMeasures(this, invMat)
    }

    drawCrosshairs(invMat,ratioMult=1.0) {
        drawCrosshairs(this, invMat, ratioMult)
    }

    drawMouseTrack() {
        drawMouseTrack(this)
    }

    drawFPSMeter() {
        drawFPSMeter(this)
    }

    drawTextOverlays(invMat,ratioMult=1.0,font_scale=1.0) {
        drawTextOverlays(this, invMat, ratioMult, font_scale)
    }

    canvasPointToGLPoint(point) {
        const mat_width = 48;
        const mat_height = 48;
        const x = ((point.x/this.gl.viewportWidth  * getDeviceScale())-0.5)*mat_width;
        const y = ((point.y/this.gl.viewportHeight * getDeviceScale())-0.5)*mat_height;
        return {x:x,y:y};
    }

    getMouseXYGL(evt,canvas){
        let x;
        let y;
        const e = evt;
        if (e.pageX || e.pageY) {
            x = e.pageX;
            y = e.pageY;
        }
        else {
            x = e.clientX;
            y = e.clientY;
        }

        const offset = getOffsetRect(canvas);

        x -= offset.left;
        y -= offset.top;

        return this.canvasPointToGLPoint({x:x,y:y});
    }

    doMouseUpMeasure(evt, self) {
        doMouseUpMeasure(this, evt)
    }

    doMouseDownMeasure(evt, self) {
        doMouseDownMeasure(this, evt)
    }

    doMouseMoveMeasure(evt, self) {
        doMouseMoveMeasure(this, evt)
    }

    doMouseUp(event, self) {
        doMouseUp(this, event)
    }

    drawSceneDirty() {
    }

    drawSceneIfDirty() {
        const activeMoleculeMotion = (this.activeMolecule != null) && (this.activeMolecule.representations.length > 0) ;
        if (this.activeMolecule) {
            if (this.activeMolecule.representations) {
                const dispObjs: moorhen.DisplayObject[][] = this.activeMolecule.representations.filter(item => item.style !== 'transformation').map(item => item.buffers)
                for (const value of dispObjs) {
                    for (let ibuf = 0; ibuf < value.length; ibuf++) {
                        if(!value[ibuf].transformMatrixInteractive){
                           value[ibuf].transformMatrixInteractive = [
                           1.0, 0.0, 0.0, 0.0,
                           0.0, 1.0, 0.0, 0.0,
                           0.0, 0.0, 1.0, 0.0,
                           0.0, 0.0, 0.0, 1.0,
                           ];
                        }
                        if(!value[ibuf].transformOriginInteractive){
                           value[ibuf].transformOriginInteractive = [0.0,0.0,0.0];
                        }
                    }
                }
            }
        }
        if (this.doRedraw||activeMoleculeMotion) {
            this.doRedraw = false;
            this.drawScene();
        }
    }

    reContourMaps() : void {
    }

    doMiddleClick(evt, self) {
        doMiddleClick(this, evt)
    }

    doDoubleClick(event, self) {
        doDoubleClick(this, event)
    }

    setDraggableMolecule(molecule: moorhen.Molecule): void {
        this.draggableMolecule = molecule
    }

    mouseMoveAnimateTrack(force,count){
        if(count===0||(this.cancelMouseTrack&&!force)){
            return;
        }
        this.drawScene()
        this.cancelMouseTrack = false;
        requestAnimationFrame(this.mouseMoveAnimateTrack.bind(this,false,count-1));
    }

    calculate3DVectorFrom2DVector(inp) {
        //What is this method for?
        const [dx,dy] = inp;
        const theVector = vec3.create();
        vec3.set(theVector, dx, dy, 0.0);
        const invQuat = quat4.create();
        quat4Inverse(this.myQuat, invQuat);
        const invMat = quatToMat4(invQuat);
        vec3.transformMat4(theVector, theVector, invMat);
        vec3.scale(theVector, theVector, this.zoom*getDeviceScale() * 48. / this.canvas.height);
        return theVector;
    }

    doMouseMove(event, self) {
        doMouseMove(this, event)
    }

    doMouseDown(event, self) {
        doMouseDown(this, event)
    }

    handleKeyUp(event, self) {
        handleKeyUp(this, event)
    }

    handleKeyDown(event, self) {
        handleKeyDown(this, event)
    }

    makeCircleCanvas(text, width, height, circleColour) {
        makeCircleCanvas(this, text, width, height, circleColour)
    }

    // Puts text in center of canvas.
    makeTextCanvas(text:string, width:number, height:number, textColour:string, font?:string)  : [number,CanvasRenderingContext2D] {
        return makeTextCanvas(this, text, width, height, textColour, font)
    }

}
