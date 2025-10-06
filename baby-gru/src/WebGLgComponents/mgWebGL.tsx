import React from 'react';
import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import * as mat4 from 'gl-matrix/mat4';
import * as mat3 from 'gl-matrix/mat3';
import { moorhen } from "../types/moorhen";
import { webGL } from "../types/mgWebGL";
import { MoorhenReduxStore as store } from "../store/MoorhenReduxStore"
import { setIsWebGL2, setGLCtx, setDisplayBuffers, setCanvasSize, setRttFramebufferSize } from "../store/glRefSlice"
import { parseAtomInfoLabel, guid, get_grid , gemmiAtomPairsToCylindersInfo } from '../utils/utils';
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
import { gaussianBlurs } from './gaussianBlurs'
import { getEncodedData } from './encodedData'
import { handleTextureLoaded, initStringTextures, initTextures } from './textureUtils'
import { TexturedShape } from './texturedShape'
import { TextCanvasTexture } from './textCanvasTexture'
import { DisplayBuffer } from './displayBuffer'
import { createQuatFromDXAngle, createQuatFromAngle, createXQuatFromDX, createYQuatFromDY, createZQuatFromDX, quatSlerp } from './quatUtils'
import { createWebGLBuffers } from './createWebGLBuffers'
import { buildBuffers, appendOtherData,linesToThickLines } from './buildBuffers'
import { getDeviceScale} from './webGLUtils'
import {getShader, initInstancedOutlineShaders, initInstancedShadowShaders, initShadowShaders, initEdgeDetectShader, initSSAOShader, initBlurXShader, initBlurYShader, initSimpleBlurXShader, initSimpleBlurYShader, initOverlayShader, initRenderFrameBufferShaders, initCirclesShaders, initTextInstancedShaders, initTextBackgroundShaders, initOutlineShaders, initGBufferShadersPerfectSphere, initGBufferShadersInstanced, initGBufferShaders, initShadersDepthPeelAccum, initShadersTextured, initShaders, initShadersInstanced, initGBufferThickLineNormalShaders, initThickLineNormalShaders, initThickLineShaders, initLineShaders, initDepthShadowPerfectSphereShaders, initPerfectSphereOutlineShaders, initPerfectSphereShaders, initImageShaders, initTwoDShapesShaders, initPointSpheresShadowShaders, initPointSpheresShaders } from './mgWebGLShaders'

function getOffsetRect(elem) {
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

function sortIndicesByProj(a, b) {
    if (a.proj > b.proj)
        return -1;
    if (a.proj < b.proj)
        return 1;
    return 0;
}

function SortThing(proj, id1, id2, id3) {
    this.proj = proj;
    this.id1 = id1;
    this.id2 = id2;
    this.id3 = id3;
}

export class MGWebGL extends React.Component implements webGL.MGWebGL {

        //Props
        props: webGL.MGWebGLPropsInterface;

        //Other stuff
        draggableMolecule: moorhen.Molecule
        activeMolecule: moorhen.Molecule
        specularPower: number;
        atomLabelDepthMode: boolean;
        clipCapPerfectSpheres: boolean;
        useOffScreenBuffers: boolean;
        blurSize: number;
        blurDepth:number;
        myQuat: quat4;
        gl_fog_start: null | number;
        doDrawClickedAtomLines: boolean;
        gl_clipPlane0: null | Float32Array;
        gl_clipPlane1: null | Float32Array;
        fogClipOffset: number;
        zoom: number;
        gl_fog_end: number;
        light_colours_specular: Float32Array;
        light_colours_diffuse: Float32Array;
        light_positions: Float32Array;
        light_colours_ambient: Float32Array;
        background_colour: [number, number, number, number];
        origin: [number, number, number];
        drawEnvBOcc: boolean;
        environmentAtoms: webGL.clickAtom[][];
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
        state:  {width: number, height: number };
        displayBuffers: any[];
        gl:  any;
        canvasRef: any;
        animating: boolean;
        doDepthPeelPass: boolean;
        environmentRadius: number;
        edgeDetectFramebufferSize : number;
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

        this.stereoViewports = []
        this.stereoQuats = []
        this.stereoViewports.push([0, 0, this.gl.viewportWidth/2, this.gl.viewportHeight])
        this.stereoViewports.push([this.gl.viewportWidth/2, 0, this.gl.viewportWidth/2, this.gl.viewportHeight])
        const yaxis = vec3.create();
        vec3.set(yaxis, 0.0, -1.0, 0.0)

        const angle = 3./180.*Math.PI;

        const dval3_p = Math.cos(angle / 2.0);
        const dval0_y_p = yaxis[0] * Math.sin(angle / 2.0);
        const dval1_y_p = yaxis[1] * Math.sin(angle / 2.0);
        const dval2_y_p = yaxis[2] * Math.sin(angle / 2.0);

        const dval3_m = Math.cos(-angle / 2.0);
        const dval0_y_m = yaxis[0] * Math.sin(-angle / 2.0);
        const dval1_y_m = yaxis[1] * Math.sin(-angle / 2.0);
        const dval2_y_m = yaxis[2] * Math.sin(-angle / 2.0);

        const rotY_p = quat4.create();
        const rotY_m = quat4.create();

        quat4.set(rotY_p, dval0_y_p, dval1_y_p, dval2_y_p, dval3_p);
        quat4.set(rotY_m, dval0_y_m, dval1_y_m, dval2_y_m, dval3_m);

        this.stereoQuats.push(rotY_p)
        this.stereoQuats.push(rotY_m)

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

    setupMultiWayTransformations(nmols:number) : void {

        let wh : number[] = get_grid(nmols)
        if(this.specifyMultiViewRowsColumns){
           wh = this.multiViewRowsColumns
        }

        this.currentViewport = [0, 0, this.gl.viewportWidth, this.gl.viewportHeight]
        this.multiWayViewports = []
        this.multiWayQuats = []

        const rotZ = quat4.create();
        quat4.set(rotZ, 0, 0, 0, -1);

        for(let i=0;i<wh[1];i++){
            for(let j=0;j<wh[0];j++){
                const frac_i = i/wh[1]
                const frac_j = j/wh[0]
                this.multiWayViewports.push([frac_i*this.gl.viewportWidth,frac_j*this.gl.viewportHeight, this.gl.viewportWidth/wh[1], this.gl.viewportHeight/wh[0]])
                this.multiWayQuats.push(rotZ)
            }
        }
        this.multiWayRatio = wh[0]/wh[1]
        this.currentMultiViewGroup = 0

    }

    setupThreeWayTransformations() : void {

        this.currentViewport = [0, 0, this.gl.viewportWidth, this.gl.viewportHeight]
        this.threeWayViewports = []
        this.threeWayQuats = []

        const BL = [0, 0, this.gl.viewportWidth/2, this.gl.viewportHeight/2]
        const BR = [this.gl.viewportWidth/2, 0, this.gl.viewportWidth/2, this.gl.viewportHeight/2]
        const TR = [this.gl.viewportWidth/2, this.gl.viewportHeight/2,this.gl.viewportWidth/2, this.gl.viewportHeight/2]
        const TL = [0, this.gl.viewportHeight/2,this.gl.viewportWidth/2, this.gl.viewportHeight/2]

        if(this.threeWayViewOrder&&this.threeWayViewOrder.length===4){
            if(this.threeWayViewOrder.indexOf(" ")===0){
                this.threeWayViewports.push(BL)
                this.threeWayViewports.push(BR)
                this.threeWayViewports.push(TR)
            } else if(this.threeWayViewOrder.indexOf(" ")===1){
                this.threeWayViewports.push(BL)
                this.threeWayViewports.push(BR)
                this.threeWayViewports.push(TL)
            } else if(this.threeWayViewOrder.indexOf(" ")===2){
                this.threeWayViewports.push(BR)
                this.threeWayViewports.push(TL)
                this.threeWayViewports.push(TR)
            } else if(this.threeWayViewOrder.indexOf(" ")===3){
                this.threeWayViewports.push(BL)
                this.threeWayViewports.push(TL)
                this.threeWayViewports.push(TR)
            }
        } else {
            this.threeWayViewports.push(BL)
            this.threeWayViewports.push(TL)
            this.threeWayViewports.push(TR)
        }

        const xaxis = vec3.create();
        vec3.set(xaxis, 1.0, 0.0, 0.0)
        const yaxis = vec3.create();
        vec3.set(yaxis, 0.0, -1.0, 0.0)

        const zaxis = vec3.create();
        vec3.set(zaxis, 0.0, 0.0, 1.0)

        const angle = -Math.PI/2.;

        const dval3 = Math.cos(angle / 2.0);

        const dval0_x = xaxis[0] * Math.sin(angle / 2.0);
        const dval1_x = xaxis[1] * Math.sin(angle / 2.0);
        const dval2_x = xaxis[2] * Math.sin(angle / 2.0);

        const dval0_y = yaxis[0] * Math.sin(angle / 2.0);
        const dval1_y = yaxis[1] * Math.sin(angle / 2.0);
        const dval2_y = yaxis[2] * Math.sin(angle / 2.0);

        const dval0_z_p = zaxis[0] * Math.sin(angle / 2.0);
        const dval1_z_p = zaxis[1] * Math.sin(angle / 2.0);
        const dval2_z_p = zaxis[2] * Math.sin(angle / 2.0);
        const dval3_z_p = Math.cos(angle / 2.0);

        const dval0_z_m = zaxis[0] * Math.sin(-angle / 2.0);
        const dval1_z_m = zaxis[1] * Math.sin(-angle / 2.0);
        const dval2_z_m = zaxis[2] * Math.sin(-angle / 2.0);
        const dval3_z_m = Math.cos(-angle / 2.0);

        const yForward = quat4.create();
        const xForward = quat4.create();
        const zForward = quat4.create();
        const zPlus = quat4.create();
        const zMinus = quat4.create();

        quat4.set(zForward, 0, 0, 0, -1);
        quat4.set(yForward, dval0_x, dval1_x, dval2_x, dval3);
        quat4.set(xForward, dval0_y, dval1_y, dval2_y, dval3);

        quat4.set(zPlus, dval0_z_p, dval1_z_p, dval2_z_p, dval3_z_p);
        quat4.set(zMinus, dval0_z_m, dval1_z_m, dval2_z_m, dval3_z_p);

        quat4.multiply(xForward, xForward, zMinus);
        quat4.multiply(yForward, yForward, zPlus);

        if(this.threeWayViewOrder&&this.threeWayViewOrder.length===4){

            const top = this.threeWayViewOrder.substring(0,2)
            const bottom = this.threeWayViewOrder.substring(2,4)

            for(const c of bottom.trim()) {
                if(c==="X")
                    this.threeWayQuats.push(xForward)
                if(c==="Y")
                    this.threeWayQuats.push(yForward)
                if(c==="Z")
                    this.threeWayQuats.push(zForward)
            }
            for(const c of top.trim()) {
                if(c==="X")
                    this.threeWayQuats.push(xForward)
                if(c==="Y")
                    this.threeWayQuats.push(yForward)
                if(c==="Z")
                    this.threeWayQuats.push(zForward)
            }
        } else {
            this.threeWayQuats.push(yForward)
            this.threeWayQuats.push(zForward)
            this.threeWayQuats.push(xForward)
        }

    }

    resize(width: number, height: number) : void {

        const theWidth = width;
        const theHeight = height;

        this.canvas.style.width = Math.floor(theWidth) + "px";
        this.canvas.style.height = Math.floor(theHeight) + "px";
        this.canvas.width = Math.floor(getDeviceScale() * Math.floor(theWidth));
        this.canvas.height = Math.floor(getDeviceScale() * Math.floor(theHeight));

        store.dispatch(setCanvasSize([this.canvas.width,this.canvas.height]))
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
    }

    constructor(props : webGL.MGWebGLPropsInterface) {

        super(props);

        this.props = props;
        const self = this;
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

        setInterval(() => {
            if(!self.gl) return;
            const sum = this.mspfArray.reduce((a, b) => a + b, 0);
            const avg = (sum / this.mspfArray.length) || 0;
            const fps = 1.0/avg * 1000;
            self.fpsText = avg.toFixed(2)+" ms/frame (" + (fps).toFixed(0)+" fps) ["+this.canvas.width+" x "+this.canvas.height+"]";
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
        this.blurSize = blurSize;

        if(this.WEBGL2){
            const blockSize = this.gl.getActiveUniformBlockParameter( this.shaderProgramBlurX, this.shaderProgramBlurX.blurCoeffs, this.gl.UNIFORM_BLOCK_DATA_SIZE);
            //console.log("blur blockSize",blockSize);

            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.blurUBOBuffer);
            this.gl.bufferData(this.gl.UNIFORM_BUFFER, blockSize, this.gl.DYNAMIC_DRAW);//????
            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
            this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.blurUBOBuffer);
            const uboVariableNames = ["row0","row1","row2","row3","row4","row5","row6","row7","row8","nsteps"];
            const uboVariableIndices = this.gl.getUniformIndices( this.shaderProgramBlurX, uboVariableNames);
            const uboVariableOffsets = this.gl.getActiveUniforms( this.shaderProgramBlurX, uboVariableIndices, this.gl.UNIFORM_OFFSET);

            const uboVariableInfo = {};

            uboVariableNames.forEach((name, index) => {
                uboVariableInfo[name] = {
                    index: uboVariableIndices[index],
                    offset: uboVariableOffsets[index],
                };
            });

            this.gl.useProgram(this.shaderProgramSimpleBlurY);
            let index = this.gl.getUniformBlockIndex(this.shaderProgramSimpleBlurY, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramSimpleBlurY, index, 0);

            this.gl.useProgram(this.shaderProgramSimpleBlurX);
            index = this.gl.getUniformBlockIndex(this.shaderProgramSimpleBlurX, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramSimpleBlurX, index, 0);

            this.gl.useProgram(this.shaderProgramBlurY);
            index = this.gl.getUniformBlockIndex(this.shaderProgramBlurY, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramBlurY, index, 0);

            this.gl.useProgram(this.shaderProgramBlurX);
            index = this.gl.getUniformBlockIndex(this.shaderProgramBlurX, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramBlurX, index, 0);

            // This might have to be done every frame if we ever have multiple UBOs.
            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.blurUBOBuffer);
            const bigBlurArray = new Array(36).fill(0);
            for(let iblur=0;iblur<gaussianBlurs[this.blurSize];iblur++){
                bigBlurArray[iblur] = gaussianBlurs[this.blurSize][iblur];
            }

            const bigFloatArray = new Float32Array(gaussianBlurs[this.blurSize]);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row0"].offset, bigFloatArray.subarray( 0, 4), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row1"].offset, bigFloatArray.subarray( 4, 8), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row2"].offset, bigFloatArray.subarray( 8,12), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row3"].offset, bigFloatArray.subarray(12,16), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row4"].offset, bigFloatArray.subarray(16,20), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row5"].offset, bigFloatArray.subarray(20,24), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row6"].offset, bigFloatArray.subarray(24,28), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row7"].offset, bigFloatArray.subarray(28,32), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row8"].offset, bigFloatArray.subarray(32,36), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["nsteps"].offset, new Int32Array([this.blurSize]), 0);
            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null)
        }

    }

    startSpinTest() {
        this.doSpin = true;
        requestAnimationFrame(this.doSpinTestFrame.bind(this));
    }

    stopSpinTest() {
        this.doSpin = false;
    }

    doSpinTestFrame() {
        const xQ = createXQuatFromDX(0);
        const yQ = createYQuatFromDY(1);
        quat4.multiply(xQ, xQ, yQ);
        quat4.multiply(this.myQuat, this.myQuat, xQ);
        this.drawScene()
        if(this.doSpin)
            requestAnimationFrame(this.doSpinTestFrame.bind(this));
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
        this.ssaoKernel = [];
        for (let i = 0; i < 16; ++i) {

            const sample = vec3Create([Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0, Math.random()]);

            NormalizeVec3(sample);
            vec3.scale(sample,sample,Math.random());
            let scale = i / 64.0;

            // scale samples s.t. they're more aligned to center of kernel
            scale = this.lerp(0.1, 1.0, scale * scale);
            vec3.scale(sample,sample,scale);
            this.ssaoKernel.push(sample[0]);
            this.ssaoKernel.push(sample[1]);
            this.ssaoKernel.push(sample[2]);
            this.ssaoKernel.push(1.0);
        }
        //console.log(this.ssaoKernel);
        //console.log(this.ssaoKernel.length);

        const ssaoNoise = [];
        for (let i = 0; i < 16; i++) {
            ssaoNoise.push(Math.random() * 2.0 - 1.0);
            ssaoNoise.push(Math.random() * 2.0 - 1.0);
            ssaoNoise.push(0.0);
        }

        this.ssaoNoiseTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.ssaoNoiseTexture);
        console.log("Do texImage2D for noise");
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB32F, 4, 4, 0, this.gl.RGB, this.gl.FLOAT, new Float32Array(ssaoNoise));
        console.log("Done texImage2D for noise");
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);

        this.gl.useProgram(this.shaderProgramSSAO);
        this.ssaoKernelBuffer = this.gl.createBuffer();
        this.bindSSAOBuffers()
    }

    bindSSAOBuffers() {
        const blockSize = this.gl.getActiveUniformBlockParameter( this.shaderProgramSSAO, this.shaderProgramSSAO.samples, this.gl.UNIFORM_BLOCK_DATA_SIZE);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.ssaoKernelBuffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, blockSize, this.gl.DYNAMIC_DRAW);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.ssaoKernelBuffer);
        const uboVariableNames = [
        "samples"
        ];
        const uboVariableIndices = this.gl.getUniformIndices( this.shaderProgramSSAO, uboVariableNames);
        const uboVariableOffsets = this.gl.getActiveUniforms( this.shaderProgramSSAO, uboVariableIndices, this.gl.UNIFORM_OFFSET);

        const uboVariableInfo = {};

        uboVariableNames.forEach((name, index) => {
            uboVariableInfo[name] = {
                index: uboVariableIndices[index],
                offset: uboVariableOffsets[index],
            };
        });

        this.gl.useProgram(this.shaderProgramSSAO);
        const index = this.gl.getUniformBlockIndex(this.shaderProgramSSAO, "sampleBuffer");
        this.gl.uniformBlockBinding(this.shaderProgramSSAO, index, 0);

        const bigFloatArray = new Float32Array(this.ssaoKernel);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.ssaoKernelBuffer);
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.ssaoKernelBuffer);
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["samples"].offset,  bigFloatArray.subarray( 0, 64), 0);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);

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
        this.fogClipOffset = 250;
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
        this.gBuffersFramebufferSize = 1024;

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
        this.environmentRadius = 8.0;
        this.environmentAtoms = [];
        this.labelledAtoms = [];
        this.measuredAtoms = [];

        this.gl_cursorPos = new Float32Array(2);
        this.gl_cursorPos[0] = this.canvas.width / 2.;
        this.gl_cursorPos[1] = this.canvas.height / 2.;


        this.gl_nClipPlanes = 0;
        this.gl_fog_start = this.fogClipOffset;
        this.gl_fog_end = 1000.+this.fogClipOffset;

        self.origin = [0.0, 0.0, 0.0];

        self.mouseDown = false;
        self.mouseDownButton = -1;

        const glc = initGL(this.canvas);
        this.gl = glc.gl;
        this.WEBGL2 = glc.WEBGL2;
        store.dispatch(setIsWebGL2(this.WEBGL2))
        store.dispatch(setGLCtx(this.gl))
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
                    if (e.changedTouches.length === 1) {
                    }
                    else if (e.changedTouches.length === 2) {
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
                    if (e.touches.length === 1) {
                    }
                    else if (e.touches.length === 2) {
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
                    if (e.changedTouches.length === 1) {
                    }
                    else if (e.changedTouches.length === 2) {
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

        self.light_positions = new Float32Array([0.0, 0.0, 60.0, 1.0]);
        self.light_colours_ambient = new Float32Array([0.0, 0.0, 0.0, 1.0]);
        self.light_colours_specular = new Float32Array([1.0, 1.0, 1.0, 1.0]);
        self.light_colours_diffuse = new Float32Array([1.0, 1.0, 1.0, 1.0]);
        self.specularPower = 64.0;

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

        this.textHeightScaling = 800.;
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
        this.gl_fog_end = 1000.+this.fogClipOffset;
        //this.gl.lineWidth(2.0);
        this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.enable(this.gl.BLEND);

        this.ssaoRadius = 0.4;
        this.ssaoBias = 1.0;
        if(this.WEBGL2) this.initializeSSAOBuffers();

        self.buildBuffers();

        this.measureText2DCanvasTexture = new TextCanvasTexture(this.gl,this.ext,this.instanced_ext,this.shaderProgramTextInstanced,768,2048);
        this.measureTextCanvasTexture = new TextCanvasTexture(this.gl,this.ext,this.instanced_ext,this.shaderProgramTextInstanced,1024,2048);
        this.labelsTextCanvasTexture = new TextCanvasTexture(this.gl,this.ext,this.instanced_ext,this.shaderProgramTextInstanced,1024,2048);
        this.texturedShapes = [];

        self.gl.clearColor(self.background_colour[0], self.background_colour[1], self.background_colour[2], self.background_colour[3]);
        self.gl.enable(self.gl.DEPTH_TEST);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        self.origin = [0.0, 0.0, 0.0];
        //const shader_version = self.gl.getParameter(self.gl.SHADING_LANGUAGE_VERSION);

        self.mouseDown = false;
        self.mouseDownButton = -1;

        self.setBlurSize(self.blurSize);
        self.drawScene();
        self.ready = true;

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
        const self = this;
        self.gl_fog_start = this.fogClipOffset + fog[0];
        self.gl_fog_end = this.fogClipOffset + fog[1];
        self.drawScene();
    }

    setSlab(slab) {
        const self = this;
        self.gl_clipPlane0[3] = -this.fogClipOffset + slab[0] * 0.5 + slab[1];
        self.gl_clipPlane1[3] = this.fogClipOffset + slab[0] * 0.5 - slab[1];
        self.drawScene();
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
        const frac = iframe / this.nAnimationFrames;
        const newQuat = quatSlerp(qOld, qNew,frac)
        quat4.set(this.myQuat,newQuat[0],newQuat[1],newQuat[2],newQuat[3])
        this.drawScene()
        if(iframe<this.nAnimationFrames){
            requestAnimationFrame(this.setOrientationFrame.bind(this,qOld, qNew,iframe+1))
        }
    }

    setOrientationAndZoomFrame(qOld, qNew, oldZoom, zoomDelta, iframe) {
        const frac = iframe / this.nAnimationFrames;
        const newQuat = quatSlerp(qOld, qNew,frac)
        quat4.set(this.myQuat,newQuat[0],newQuat[1],newQuat[2],newQuat[3])
        this.setZoom(oldZoom + iframe * zoomDelta)
        this.drawScene()
        if(iframe<this.nAnimationFrames){
            requestAnimationFrame(this.setOrientationAndZoomFrame.bind(this,qOld, qNew,oldZoom,zoomDelta,iframe+1))
        }
    }

    setOrientationAndZoomAnimated(q,z) {
        this.nAnimationFrames = 15;
        const oldQuat = quat4.create();
        const oldZoom = this.zoom;
        const zoomDelta = (z - this.zoom) / this.nAnimationFrames
        quat4.set(oldQuat,this.myQuat[0],this.myQuat[1],this.myQuat[2],this.myQuat[3])
        requestAnimationFrame(this.setOrientationAndZoomFrame.bind(this,oldQuat,q,oldZoom,zoomDelta,1))
    }

    setOrientationAnimated(q) {
        this.nAnimationFrames = 15;
        const oldQuat = quat4.create()
        quat4.set(oldQuat,this.myQuat[0],this.myQuat[1],this.myQuat[2],this.myQuat[3])
        requestAnimationFrame(this.setOrientationFrame.bind(this,oldQuat,q,1))
    }

    handleOriginUpdated(doDispatch: boolean) {
        const displayBuffers = store.getState().glRef.displayBuffers
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
                atom.label = atom.tempFactor.toFixed(2) + " " + atom.occupancy.toFixed(2) + spacing + ")"
                //atom.label = atom.tempFactor.toFixed(2) + " " + atom.occupancy.toFixed(2) + " " + atomLabel
                this.environmentAtoms[this.environmentAtoms.length - 1].push(atom)
            })
            this.updateLabels()
        }
    }

    setOriginOrientationAndZoomFrame(oo,d,qOld, qNew, oldZoom, zoomDelta, iframe) {
        const frac = iframe / this.nAnimationFrames;
        const newQuat = quatSlerp(qOld, qNew,frac)
        if(isNaN(newQuat[0])||isNaN(newQuat[1])||isNaN(newQuat[2])||isNaN(newQuat[3])){
            console.log("Something's gone wrong!!!!!!!!!!!!!")
            console.log(newQuat)
            console.log(qOld)
            console.log(qNew)
            console.log(frac)
        }
        quat4.set(this.myQuat,newQuat[0],newQuat[1],newQuat[2],newQuat[3])
        this.zoom = oldZoom + iframe * zoomDelta
        this.origin = [oo[0]+iframe*d[0],oo[1]+iframe*d[1],oo[2]+iframe*d[2]];
        this.drawScene()
        if(iframe<this.nAnimationFrames){
            requestAnimationFrame(this.setOriginOrientationAndZoomFrame.bind(this,oo,d,qOld,qNew,oldZoom,zoomDelta,iframe+1))
            return
        }
        this.animating = false
        this.handleOriginUpdated(true)
        const zoomChanged = new CustomEvent("zoomChanged", { detail: { oldZoom, newZoom: this.zoom } })
        document.dispatchEvent(zoomChanged)
    }

    setViewAnimated(o,q,z) {
        this.setOriginOrientationAndZoomAnimated(o,q,z)
    }

    setOriginOrientationAndZoomAnimated(o: number[],q: quat4,z: number) : void {
        if(this.animating) return
        this.nAnimationFrames = 15;
        const old_x = this.origin[0]
        const old_y = this.origin[1]
        const old_z = this.origin[2]
        const new_x = o[0]
        const new_y = o[1]
        const new_z = o[2]
        const DX = new_x - old_x
        const DY = new_y - old_y
        const DZ = new_z - old_z
        const dx = DX/this.nAnimationFrames
        const dy = DY/this.nAnimationFrames
        const dz = DZ/this.nAnimationFrames
        const oldQuat = quat4.create();
        const oldZoom = this.zoom;
        const zoomDelta = (z - this.zoom) / this.nAnimationFrames
        quat4.set(oldQuat,this.myQuat[0],this.myQuat[1],this.myQuat[2],this.myQuat[3])
        this.animating = true
        requestAnimationFrame(this.setOriginOrientationAndZoomFrame.bind(this,[old_x,old_y,old_z],[dx,dy,dz],oldQuat,q,oldZoom,zoomDelta,1))
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
        this.nAnimationFrames = 15
        const deltaOrigin = this.calculateOriginDelta(newOrigin, this.origin, this.nAnimationFrames)
        const deltaZoom = (newZoom - this.zoom) / this.nAnimationFrames
        requestAnimationFrame(this.drawOriginAndZoomFrame.bind(this, this.origin, this.zoom, deltaOrigin, deltaZoom, 1))
    }

    drawOriginAndZoomFrame(oldOrigin: [number, number, number], oldZoom: number, deltaOrigin: [number, number, number], deltaZoom: number, iframe: number) {
        const [ DX, DY, DZ ] = deltaOrigin
        const [ X, Y, Z ] = oldOrigin
        this.origin = [ X + iframe * DX , Y + iframe * DY, Z + iframe * DZ ]
        this.zoom = oldZoom + deltaZoom * iframe
        this.drawScene()
        if (iframe < this.nAnimationFrames) {
            requestAnimationFrame(this.drawOriginAndZoomFrame.bind(this, oldOrigin, oldZoom, deltaOrigin, deltaZoom, iframe + 1))
        } else {
            const zoomChanged = new CustomEvent("zoomChanged", { detail: { oldZoom, newZoom: this.zoom } })
            document.dispatchEvent(zoomChanged)
            this.handleOriginUpdated(true)
        }
    }

    setOriginAnimated(oldOrigin: number[]) : void {
        const [ DX, DY, DZ ] = this.calculateOriginDelta(oldOrigin as [number, number, number], this.origin, 1)
        const distance = Math.sqrt(DX**2 + DY**2 + DZ**2)
        const nFrames = Math.floor(distance / 1.5)
        this.nAnimationFrames = nFrames > 15 ? 15 : nFrames < 5 ? 5 : nFrames
        const dx = DX/this.nAnimationFrames
        const dy = DY/this.nAnimationFrames
        const dz = DZ/this.nAnimationFrames
        requestAnimationFrame(this.drawOriginFrame.bind(this, [...this.origin], [dx, dy, dz], 1))
    }

    drawOriginFrame(oo,d,iframe){
        this.origin = [oo[0]+iframe*d[0],oo[1]+iframe*d[1],oo[2]+iframe*d[2]];
        this.drawScene()
        if(iframe<this.nAnimationFrames){
            requestAnimationFrame(this.drawOriginFrame.bind(this,oo,d,iframe+1))
        } else {
            this.handleOriginUpdated(true)
            this.props.onOriginChanged(this.origin)
        }
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
        const deltaZoom = (newZoom - oldZoom) / this.nAnimationFrames
        const currentZoom = oldZoom + deltaZoom * iframe
        this.zoom = currentZoom
        this.drawScene()
        if (iframe < this.nAnimationFrames) {
            const fieldDepthFront = 8
            const fieldDepthBack = 21
            this.set_fog_range(this.fogClipOffset - (this.zoom * fieldDepthFront), this.fogClipOffset + (this.zoom * fieldDepthBack))
            this.set_clip_range(0 - (this.zoom * fieldDepthFront), 0 + (this.zoom * fieldDepthBack))
            requestAnimationFrame(this.drawZoomFrame.bind(this, oldZoom, newZoom, iframe + 1))
        } else {
            const zoomChanged = new CustomEvent("zoomChanged", {
                "detail": {
                    oldZoom,
                    newZoom
                }
            });
            document.dispatchEvent(zoomChanged);
        }
    }

    setZoomAnimated(newZoom: number) {
        const oldZoom = this.zoom
        this.nAnimationFrames = 15
        requestAnimationFrame(this.drawZoomFrame.bind(this, oldZoom, newZoom, 1))
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
        if(!this.silhouetteFramebuffer){
            this.silhouetteFramebuffer = this.gl.createFramebuffer();

            this.silhouetteTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.silhouetteTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.silhouetteDepthTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.silhouetteDepthTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.silhouetteRenderbufferDepth = this.gl.createRenderbuffer();
            this.silhouetteRenderbufferColor = this.gl.createRenderbuffer();

        }
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.silhouetteFramebuffer);
        this.silhouetteFramebuffer.width = this.canvas.width;
        this.silhouetteFramebuffer.height = this.canvas.height;

        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.silhouetteRenderbufferColor);
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.silhouetteRenderbufferColor);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.canvas.width, this.canvas.height);

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.silhouetteTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.silhouetteTexture, 0);

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.silhouetteDepthTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT24, this.canvas.width, this.canvas.height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.silhouetteDepthTexture, 0);

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.silhouetteBufferReady = true;

    }

    createEdgeDetectFramebufferBuffer(width : number,height : number){

        if(!this.edgeDetectFramebuffer){
            this.edgeDetectFramebuffer = this.gl.createFramebuffer();

            this.edgeDetectTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.edgeDetectTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            const edgeDetectRenderbuffer = this.gl.createRenderbuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.edgeDetectFramebuffer);
            this.edgeDetectFramebuffer.width = width;
            this.edgeDetectFramebuffer.height = height;

            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, edgeDetectRenderbuffer);

            this.gl.bindTexture(this.gl.TEXTURE_2D, this.edgeDetectTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.edgeDetectTexture, 0);

            const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
            //console.log("EdgeDetect framebuffer OK?",(status===this.gl.FRAMEBUFFER_COMPLETE));
        }

        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    }

    createGBuffers(width : number,height : number){
        if(!this.gFramebuffer){
            this.gFramebuffer = this.gl.createFramebuffer();
            this.gBufferDepthTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferDepthTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.gBufferPositionTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferPositionTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.gBufferNormalTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferNormalTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            //FIXME - Sizes?
            const gBufferRenderbuffer = this.gl.createRenderbuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gFramebuffer);
            this.gFramebuffer.width = width;
            this.gFramebuffer.height = height;

            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, gBufferRenderbuffer);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, gBufferRenderbuffer);
            if (this.WEBGL2) {
                this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT32F, width, height);
            } else {
                this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
            }
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferDepthTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT32F, width, height, 0, this.gl.DEPTH_COMPONENT, this.gl.FLOAT, null);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.gBufferDepthTexture, 0);

            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.RENDERBUFFER, gBufferRenderbuffer);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.RGBA32F, width, height);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferPositionTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, width, height, 0, this.gl.RGBA, this.gl.FLOAT, null);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.gBufferPositionTexture, 0);

            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT1, this.gl.RENDERBUFFER, gBufferRenderbuffer);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.RGBA32F, width, height);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferNormalTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, width, height, 0, this.gl.RGBA, this.gl.FLOAT, null);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT1, this.gl.TEXTURE_2D, this.gBufferNormalTexture, 0);

            const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
            console.log("G-buffer framebuffer OK?",(status===this.gl.FRAMEBUFFER_COMPLETE));

        }
    }

    createSSAOFramebufferBuffer(){

        if(!this.ssaoFramebuffer){
            this.ssaoFramebuffer = this.gl.createFramebuffer();

            this.ssaoTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.ssaoTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            //FIXME - Sizes?
            const ssaoRenderbuffer = this.gl.createRenderbuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.ssaoFramebuffer);
            this.ssaoFramebuffer.width = 1024;
            this.ssaoFramebuffer.height = 1024;

            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, ssaoRenderbuffer);

            this.gl.bindTexture(this.gl.TEXTURE_2D, this.ssaoTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1024, 1024, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.ssaoTexture, 0);

            const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
            console.log("SSAO",typeof(status))
            console.log("SSAO",typeof(this.gl.FRAMEBUFFER_COMPLETE))
            console.log("SSAO framebuffer OK?",(status===this.gl.FRAMEBUFFER_COMPLETE));
        }

        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    }

    createSimpleBlurOffScreeenBuffers(){

        this.offScreenFramebufferSimpleBlurX = this.gl.createFramebuffer();
        this.offScreenFramebufferSimpleBlurY = this.gl.createFramebuffer();

        this.simpleBlurXTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurXTexture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.simpleBlurYTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurYTexture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferSimpleBlurX);
        this.offScreenFramebufferSimpleBlurX.width = 1024;
        this.offScreenFramebufferSimpleBlurX.height = 1024;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurXTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1024, 1024, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.simpleBlurXTexture, 0);

        let status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        console.log("offScreenFramebufferSimpleBlurX framebuffer OK?",(status===this.gl.FRAMEBUFFER_COMPLETE));

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferSimpleBlurY);
        this.offScreenFramebufferSimpleBlurY.width = 1024;
        this.offScreenFramebufferSimpleBlurY.height = 1024;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurYTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1024, 1024, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.simpleBlurYTexture, 0);

        status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        console.log("offScreenFramebufferSimpleBlurY framebuffer OK?",(status===this.gl.FRAMEBUFFER_COMPLETE));

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    }

    recreateDepthPeelBuffers(width,height){
        //Defines 4 off-screeen multisampled framebuffers and corresponding textures.
        //Requires depth_texture
        //FIXME - Should be called after resize event
        if(this.depth_texture){
            if(this.depthPeelFramebuffers.length===0&&width>0&&height>0){
                console.log("Make depth peel buffers of size",width,height)
                for(let i=0;i<4;i++){
                    this.depthPeelFramebuffers[i] = this.gl.createFramebuffer();
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.depthPeelFramebuffers[i]);

                    this.depthPeelColorTextures[i] = this.gl.createTexture();
                    this.depthPeelDepthTextures[i] = this.gl.createTexture();
                    this.depthPeelRenderbufferDepth[i] = this.gl.createRenderbuffer();
                    this.depthPeelRenderbufferColor[i] = this.gl.createRenderbuffer();

                    this.depthPeelFramebuffers[i].width = width;
                    this.depthPeelFramebuffers[i].height = height;

                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelColorTextures[i]);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

                    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthPeelRenderbufferColor[i]);
                    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.RENDERBUFFER, this.depthPeelRenderbufferColor[i]);
                    if (this.WEBGL2) {
                        //FIXME - multismapling isn't actually working - need to blit to another buffer ...
                        this.gl.renderbufferStorageMultisample(this.gl.RENDERBUFFER, this.gl.getParameter(this.gl.MAX_SAMPLES), this.gl.RGBA32F, width, height);
                        //this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.RGBA32F, width, height);
                        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, width, height, 0, this.gl.RGBA, this.gl.FLOAT, null);
                    } else {
                        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.RGBA4, width, height);
                        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
                    }
                    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.depthPeelColorTextures[i], 0);

                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelDepthTextures[i]);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

                    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthPeelRenderbufferDepth[i]);
                    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.depthPeelRenderbufferDepth[i]);
                    if (this.WEBGL2) {
                        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT32F, width, height);
                        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT32F, width, height, 0, this.gl.DEPTH_COMPONENT, this.gl.FLOAT, null);
                    } else {
                        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
                        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT, width, height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
                    }
                    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.depthPeelDepthTextures[i], 0);

                    const canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
                    console.log("Depth-peel buffer",i,"completeness",canRead);
                    if(!canRead){
                        if(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT){
                            console.log("FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
                        }
                        if(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT){
                            console.log("FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
                        }
                        if(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS){
                            console.log("FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
                        }
                        if(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_UNSUPPORTED){
                            console.log("FRAMEBUFFER_UNSUPPORTED");
                        }
                        if(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE){
                            console.log("FRAMEBUFFER_INCOMPLETE_MULTISAMPLE");
                        }
                    }

                    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
                    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

                }
            }
        }
    }

    recreateOffScreeenBuffers(width,height){
        // This defines an off-screeen multisampled framebuffer and an off-screen framebuffer and texture to blit to.
        if(!this.offScreenFramebuffer){
            this.offScreenFramebuffer = this.gl.createFramebuffer();
            this.offScreenFramebufferColor = this.gl.createFramebuffer();
            this.offScreenFramebufferBlurX = this.gl.createFramebuffer();
            this.offScreenFramebufferBlurY = this.gl.createFramebuffer();

            this.blurXTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurXTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.blurYTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.offScreenTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.offScreenDepthTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.offScreenRenderbufferDepth = this.gl.createRenderbuffer();
            this.offScreenRenderbufferColor = this.gl.createRenderbuffer();
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebuffer);
        this.offScreenFramebuffer.width = width;
        this.offScreenFramebuffer.height = height;

        if (this.WEBGL2) {
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.offScreenRenderbufferDepth);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.offScreenRenderbufferDepth);
            this.gl.renderbufferStorageMultisample(this.gl.RENDERBUFFER, this.gl.getParameter(this.gl.MAX_SAMPLES),
                    this.gl.DEPTH_COMPONENT24, width, height);

            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.offScreenRenderbufferColor);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.RENDERBUFFER, this.offScreenRenderbufferColor);
            this.gl.renderbufferStorageMultisample(this.gl.RENDERBUFFER, this.gl.getParameter(this.gl.MAX_SAMPLES),
                    this.gl.RGBA8, width, height);
        } else {
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.offScreenRenderbufferColor);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.offScreenRenderbufferColor);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
        }


        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferColor);
        this.offScreenFramebufferColor.width = width;
        this.offScreenFramebufferColor.height = height;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.offScreenTexture, 0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT24, width, height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.offScreenDepthTexture, 0);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferBlurX);
        this.offScreenFramebufferBlurX.width = width;
        this.offScreenFramebufferBlurX.height = height;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurXTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.blurXTexture, 0);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferBlurY);
        this.offScreenFramebufferBlurY.width = width;
        this.offScreenFramebufferBlurY.height = height;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.blurYTexture, 0);

        this.offScreenReady = true;

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    initTextureFramebuffer() : void {

        this.rttFramebuffer = this.gl.createFramebuffer();
        this.rttFramebufferColor = this.gl.createFramebuffer();

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebuffer);

        this.rttFramebuffer.width = Math.min(this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE),4096);
        this.rttFramebuffer.height = this.rttFramebuffer.width;
        store.dispatch(setRttFramebufferSize([this.rttFramebuffer.width,this.rttFramebuffer.height]))

        this.rttTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTexture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.rttFramebuffer.width, this.rttFramebuffer.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);

        this.rttDepthTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttDepthTexture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        if (this.WEBGL2) {
            const renderbufferDepth = this.gl.createRenderbuffer();
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbufferDepth);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, renderbufferDepth);
            this.gl.renderbufferStorageMultisample(this.gl.RENDERBUFFER,
                                    this.gl.getParameter(this.gl.MAX_SAMPLES),
                                    this.gl.DEPTH_COMPONENT24,
                                    this.rttFramebuffer.width,
                                    this.rttFramebuffer.height);
            const renderbuffer = this.gl.createRenderbuffer();
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbuffer);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.RENDERBUFFER, renderbuffer);
            this.gl.renderbufferStorageMultisample(this.gl.RENDERBUFFER,
                                    this.gl.getParameter(this.gl.MAX_SAMPLES),
                                    this.gl.RGBA8,
                                    this.rttFramebuffer.width,
                                    this.rttFramebuffer.height);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebufferColor);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.rttTexture, 0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttDepthTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT24, this.rttFramebuffer.width, this.rttFramebuffer.height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.rttDepthTexture, 0);
        } else {
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.rttTexture, 0);
            const renderbuffer = this.gl.createRenderbuffer();
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbuffer);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, renderbuffer);
            //Sigh. Maybe DEPTH_STENCIL? Is anyone actually stuck on WebGL1?
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.rttFramebuffer.width, this.rttFramebuffer.height);
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        this.rttFramebufferDepth = null;
        if (this.depth_texture) {
            this.rttFramebufferDepth = this.gl.createFramebuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebufferDepth);
            this.rttFramebufferDepth.width = Math.min(this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE),4096)//1024;
            this.rttFramebufferDepth.height = Math.min(this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE),4096)//1024;
            this.rttTextureDepth = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTextureDepth);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            if (this.WEBGL2) {
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT24, this.rttFramebufferDepth.width, this.rttFramebufferDepth.height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
            } else {
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT, this.rttFramebufferDepth.width, this.rttFramebufferDepth.height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_SHORT, null);
            }
            const renderbufferCol = this.gl.createRenderbuffer();
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbufferCol);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.RGBA4, this.rttFramebufferDepth.width, this.rttFramebufferDepth.height);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.rttTextureDepth, 0);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.RENDERBUFFER, renderbufferCol);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
        this.screenshotBuffersReady = true;

    }

    centreOn(idx) {
        const displayBuffers = store.getState().glRef.displayBuffers
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
            const old_origin = [self.origin[0], self.origin[1], self.origin[2]];

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
        if (program.hasOwnProperty("cursorPos")) {
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
        buildBuffers(this.displayBuffers)
    }

    drawTransformMatrixInteractive(transformMatrix:number[], transformOrigin:number[], buffer:any, shader:webGL.MGWebGLShader, vertexType:number, bufferIdx:number, specialDrawBuffer?:number) {

        this.setupModelViewTransformMatrixInteractive(transformMatrix, transformOrigin, buffer, shader, vertexType, bufferIdx, specialDrawBuffer);

        this.drawBuffer(buffer,shader,bufferIdx,vertexType,specialDrawBuffer);

        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, this.mvMatrix);
        this.gl.uniformMatrix4fv(shader.mvInvMatrixUniform, false, this.mvInvMatrix);// All else
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

        const bright_y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;

        let drawBuffer;
        if (specialDrawBuffer) {
            drawBuffer = specialDrawBuffer;
        } else {
            drawBuffer = theBuffer.triangleVertexIndexBuffer[j];
        }

        if (this.ext) {
            const theShader = theShaderIn as webGL.ShaderTrianglesInstanced;
            if(theBuffer.triangleInstanceOriginBuffer[j]){
                this.gl.enableVertexAttribArray(theShader.vertexInstanceOriginAttribute);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.triangleInstanceOriginBuffer[j]);
                this.gl.vertexAttribPointer(theShader.vertexInstanceOriginAttribute, theBuffer.triangleInstanceOriginBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                if (this.WEBGL2) {
                    this.gl.vertexAttribDivisor(theShader.vertexInstanceOriginAttribute, 1);
                } else {
                    this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOriginAttribute, 1);
                }
                if(theBuffer.triangleInstanceSizeBuffer[j]){
                    this.gl.enableVertexAttribArray(theShader.vertexInstanceSizeAttribute);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.triangleInstanceSizeBuffer[j]);
                    this.gl.vertexAttribPointer(theShader.vertexInstanceSizeAttribute, theBuffer.triangleInstanceSizeBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                    if (this.WEBGL2) {
                        this.gl.vertexAttribDivisor(theShader.vertexInstanceSizeAttribute, 1);
                    } else {
                        this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceSizeAttribute, 1);
                    }
                }
                if(theBuffer.triangleInstanceOrientationBuffer[j]){
                    this.gl.enableVertexAttribArray(theShader.vertexInstanceOrientationAttribute);
                    this.gl.enableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+1);
                    this.gl.enableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+2);
                    this.gl.enableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+3);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.triangleInstanceOrientationBuffer[j]);
                    this.gl.vertexAttribPointer(theShader.vertexInstanceOrientationAttribute, 4, this.gl.FLOAT, false, 64, 0);
                    this.gl.vertexAttribPointer(theShader.vertexInstanceOrientationAttribute+1, 4, this.gl.FLOAT, false, 64, 16);
                    this.gl.vertexAttribPointer(theShader.vertexInstanceOrientationAttribute+2, 4, this.gl.FLOAT, false, 64, 32);
                    this.gl.vertexAttribPointer(theShader.vertexInstanceOrientationAttribute+3, 4, this.gl.FLOAT, false, 64, 48);
                    if (this.WEBGL2) {
                        this.gl.vertexAttribDivisor(theShader.vertexInstanceOrientationAttribute, 1);
                        this.gl.vertexAttribDivisor(theShader.vertexInstanceOrientationAttribute+1, 1);
                        this.gl.vertexAttribDivisor(theShader.vertexInstanceOrientationAttribute+2, 1);
                        this.gl.vertexAttribDivisor(theShader.vertexInstanceOrientationAttribute+3, 1);
                    } else {
                        this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOrientationAttribute, 1);
                        this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOrientationAttribute+1, 1);
                        this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOrientationAttribute+2, 1);
                        this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOrientationAttribute+3, 1);
                    }
                }
                if(theBuffer.supplementary["instance_use_colors"]){
                    if(theShader.vertexColourAttribute>-1){
                        this.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.triangleColourBuffer[j]);
                        this.gl.vertexAttribPointer(theShader.vertexColourAttribute, theBuffer.triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                        if(theBuffer.supplementary["instance_use_colors"][j]){
                            if (this.WEBGL2) {
                                this.gl.vertexAttribDivisor(theShader.vertexColourAttribute, 1);
                            } else {
                                this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexColourAttribute, 1);
                            }
                        }
                    }
                    if(this.stencilPass){
                        this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                        if(bright_y<0.5)
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 1.0, 1.0, 1.0, 1.0);
                        else
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.0, 0.0, 0.0, 1.0);
                    }
                }
                if (this.WEBGL2) {
                    if(this.doAnaglyphStereo) {
                        this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                        this.gl.vertexAttribDivisor(theShader.vertexColourAttribute,0);
                        this.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...this.currentAnaglyphColor)
                    }
                    this.gl.drawElementsInstanced(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
                } else {
                    this.instanced_ext.drawElementsInstancedANGLE(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
                }
                if(theBuffer.symmetryMatrices.length>0){
                    if(theShader.vertexColourAttribute>-1&&theBuffer.changeColourWithSymmetry){
                        this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                        if(bright_y>0.5)
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.3, 0.3, 0.3, 1.0);
                        else
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.5, 0.5, 0.5, 1.0);
                    }

                    const tempMVMatrix = mat4.create();
                    const tempMVInvMatrix = mat4.create();
                    for (let isym = 0; isym < theBuffer.symmetryMatrices.length; isym++) {

                        this.applySymmetryMatrix(theShader,theBuffer.symmetryMatrices[isym],tempMVMatrix,tempMVInvMatrix)
                        if (this.WEBGL2) {
                            this.gl.drawElementsInstanced(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
                        } else {
                            this.instanced_ext.drawElementsInstancedANGLE(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
                        }

                    }
                    this.setLightUniforms(theShader);
                    this.gl.uniformMatrix4fv(theShader.mvMatrixUniform, false, this.mvMatrix);// All else
                    this.gl.uniformMatrix4fv(theShader.mvInvMatrixUniform, false, this.mvInvMatrix);// All else
                    if(theShader.vertexColourAttribute>-1) this.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
                }
                if(theShader.light_colours_diffuse) this.gl.uniform4fv(theShader.light_colours_diffuse, this.light_colours_diffuse);
                if(theShader.light_colours_specular) this.gl.uniform4fv(theShader.light_colours_specular, this.light_colours_specular);
                if(theShader.specularPower) this.gl.uniform1f(theShader.specularPower, this.specularPower);
                this.gl.disableVertexAttribArray(theShader.vertexInstanceOriginAttribute);
                this.gl.disableVertexAttribArray(theShader.vertexInstanceSizeAttribute);
                this.gl.disableVertexAttribArray(theShader.vertexInstanceOrientationAttribute);
                this.gl.disableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+1);
                this.gl.disableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+2);
                this.gl.disableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+3);
                if(theShader.vertexColourAttribute>-1){
                    if (this.WEBGL2) {
                        this.gl.vertexAttribDivisor(theShader.vertexColourAttribute, 0);
                    } else {
                        this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexColourAttribute, 0);
                    }
                }
            } else {
                const theShader = theShaderIn as webGL.MGWebGLShader;
                if (this.WEBGL2) {
                    if(this.doAnaglyphStereo) {
                        this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                        this.gl.vertexAttribDivisor(theShader.vertexColourAttribute,0);
                        this.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...this.currentAnaglyphColor)
                    }
                    this.drawMaxElementsUInt(vertexType, drawBuffer.numItems);
                } else {
                    this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0);
                }
                if(theBuffer.symmetryMatrices.length>0){
                    if(theShader.vertexColourAttribute>-1&&theBuffer.changeColourWithSymmetry){
                        this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                        if(bright_y>0.5)
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.3, 0.3, 0.3, 1.0);
                        else
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.5, 0.5, 0.5, 1.0);
                    }
                    const tempMVMatrix = mat4.create();
                    const tempMVInvMatrix = mat4.create();
                    for (let isym = 0; isym < theBuffer.symmetryMatrices.length; isym++) {

                        this.applySymmetryMatrix(theShader,theBuffer.symmetryMatrices[isym],tempMVMatrix,tempMVInvMatrix)
                        if (this.WEBGL2) {
                            if(this.doAnaglyphStereo) {
                                this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                                this.gl.vertexAttribDivisor(theShader.vertexColourAttribute,0);
                                this.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...this.currentAnaglyphColor)
                            }
                            this.drawMaxElementsUInt(vertexType, drawBuffer.numItems);
                        } else {
                            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0);
                        }

                    }
                    this.setLightUniforms(theShader);
                    this.gl.uniformMatrix4fv(theShader.mvMatrixUniform, false, this.mvMatrix);// All else
                    this.gl.uniformMatrix4fv(theShader.mvInvMatrixUniform, false, this.mvInvMatrix);// All else
                    if(theShader.vertexColourAttribute>-1) this.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
                }
            }
        } else {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
        }
    }

    drawMaxElementsUInt(vertexType, numItems) {

        if(numItems<this.max_elements_indices){
            this.gl.drawElements(vertexType, numItems, this.gl.UNSIGNED_INT, 0);
        } else {
            let inum=0;
            for( ; inum <  numItems / this.max_elements_indices-1; inum++){
                this.gl.drawElements(vertexType, this.max_elements_indices, this.gl.UNSIGNED_INT, inum*this.max_elements_indices*4);
            }
            if((numItems % this.max_elements_indices)>0){
                this.gl.drawElements(vertexType, numItems % this.max_elements_indices, this.gl.UNSIGNED_INT, inum*this.max_elements_indices*4);
            }
        }

    }

    setupModelViewTransformMatrixInteractive(transformMatrix, transformOrigin, buffer, shader, vertexType, bufferIdx, specialDrawBuffer) {

        const screenZ = vec3.create();
        const tempMVMatrix = mat4.create();
        const tempMVInvMatrix = mat4.create();
        const symt = mat4.create();
        mat4.set(symt,
            transformMatrix[0],
            transformMatrix[1],
            transformMatrix[2],
            transformMatrix[3],
            transformMatrix[4],
            transformMatrix[5],
            transformMatrix[6],
            transformMatrix[7],
            transformMatrix[8],
            transformMatrix[9],
            transformMatrix[10],
            transformMatrix[11],
            transformMatrix[12],
            transformMatrix[13],
            transformMatrix[14],
            transformMatrix[15],
        );
        //mat4.transpose(symt,symt_t);

        mat4.translate(this.mvMatrix, this.mvMatrix, [transformOrigin[0] - this.origin[0], transformOrigin[1] - this.origin[1], transformOrigin[2] - this.origin[2]]);
        mat4.multiply(tempMVMatrix, this.mvMatrix, symt);
        mat4.translate(this.mvMatrix, this.mvMatrix, [-transformOrigin[0] + this.origin[0], -transformOrigin[1] + this.origin[1], -transformOrigin[2] + this.origin[2]]);
        mat4.translate(tempMVMatrix, tempMVMatrix, [-transformOrigin[0] + this.origin[0], -transformOrigin[1] + this.origin[1], -transformOrigin[2] + this.origin[2]]);

        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, tempMVMatrix);
        tempMVMatrix[12] = 0.0;
        tempMVMatrix[13] = 0.0;
        tempMVMatrix[14] = 0.0;
        mat4.invert(tempMVInvMatrix, tempMVMatrix);
        this.gl.uniformMatrix4fv(shader.mvInvMatrixUniform, false, tempMVInvMatrix);// All else
        screenZ[0] = 0.0;
        screenZ[1] = 0.0;
        screenZ[2] = 1.0;
        vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
        this.gl.uniform3fv(shader.screenZ, screenZ);

    }

    drawTransformMatrix(transformMatrix:number[], buffer:any, shader:any, vertexType:number, bufferIdx:number, specialDrawBuffer?:any) : void {
        const triangleVertexIndexBuffer = buffer.triangleVertexIndexBuffer;

        let drawBuffer;
        if (specialDrawBuffer) {
            drawBuffer = specialDrawBuffer;
        } else {
            drawBuffer = triangleVertexIndexBuffer[bufferIdx];
        }

        const screenZ = vec3.create();
        const tempMVMatrix = mat4.create();
        const tempMVInvMatrix = mat4.create();
        const symt_t = mat4.create();
        const symt = mat4.create();
        mat4.set(symt_t,
            transformMatrix[0],
            transformMatrix[1],
            transformMatrix[2],
            transformMatrix[3],
            transformMatrix[4],
            transformMatrix[5],
            transformMatrix[6],
            transformMatrix[7],
            transformMatrix[8],
            transformMatrix[9],
            transformMatrix[10],
            transformMatrix[11],
            transformMatrix[12],
            transformMatrix[13],
            transformMatrix[14],
            transformMatrix[15],
        );
        mat4.transpose(symt, symt_t);
        mat4.multiply(tempMVMatrix, this.mvMatrix, symt);

        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, tempMVMatrix);
        tempMVMatrix[12] = 0.0;
        tempMVMatrix[13] = 0.0;
        tempMVMatrix[14] = 0.0;
        mat4.invert(tempMVInvMatrix, tempMVMatrix);
        this.gl.uniformMatrix4fv(shader.mvInvMatrixUniform, false, tempMVInvMatrix);// All else
        screenZ[0] = 0.0;
        screenZ[1] = 0.0;
        screenZ[2] = 1.0;
        vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
        this.gl.uniform3fv(shader.screenZ, screenZ);
        if (this.ext) {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
        }
        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, this.mvMatrix);
        this.gl.uniformMatrix4fv(shader.mvInvMatrixUniform, false, this.mvInvMatrix);// All else

    }

    drawTransformMatrixInteractivePMV(transformMatrix:number[], transformOrigin:number[], buffer:any, shader:any, vertexType:number, bufferIdx:number) {
        const triangleVertexIndexBuffer = buffer.triangleVertexIndexBuffer;

        const drawBuffer = triangleVertexIndexBuffer[bufferIdx];

        const pmvMatrix = mat4.create();
        const screenZ = vec3.create();
        const tempMVMatrix = mat4.create();
        const tempMVInvMatrix = mat4.create();
        const symt = mat4.create();
        mat4.set(symt,
            transformMatrix[0],
            transformMatrix[1],
            transformMatrix[2],
            transformMatrix[3],
            transformMatrix[4],
            transformMatrix[5],
            transformMatrix[6],
            transformMatrix[7],
            transformMatrix[8],
            transformMatrix[9],
            transformMatrix[10],
            transformMatrix[11],
            transformMatrix[12],
            transformMatrix[13],
            transformMatrix[14],
            transformMatrix[15],
        );
        //mat4.transpose(symt,symt_t);

        mat4.translate(this.mvMatrix, this.mvMatrix, [transformOrigin[0] - this.origin[0], transformOrigin[1] - this.origin[1], transformOrigin[2] - this.origin[2]]);
        mat4.multiply(tempMVMatrix, this.mvMatrix, symt);
        mat4.translate(this.mvMatrix, this.mvMatrix, [-transformOrigin[0] + this.origin[0], -transformOrigin[1] + this.origin[1], -transformOrigin[2] + this.origin[2]]);
        mat4.translate(tempMVMatrix, tempMVMatrix, [-transformOrigin[0] + this.origin[0], -transformOrigin[1] + this.origin[1], -transformOrigin[2] + this.origin[2]]);
        mat4.multiply(pmvMatrix, this.pMatrix, tempMVMatrix); // Lines

        this.gl.uniformMatrix4fv(shader.pMatrixUniform, false, pmvMatrix); // Lines
        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, tempMVMatrix);

        tempMVMatrix[12] = 0.0;
        tempMVMatrix[13] = 0.0;
        tempMVMatrix[14] = 0.0;
        mat4.invert(tempMVInvMatrix, tempMVMatrix);
        screenZ[0] = 0.0;
        screenZ[1] = 0.0;
        screenZ[2] = 1.0;
        vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
        this.gl.uniform3fv(shader.screenZ, screenZ);
        if (this.ext) {
            this.drawMaxElementsUInt(vertexType, drawBuffer.numItems);
        } else {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
        }
        this.gl.uniformMatrix4fv(shader.pMatrixUniform, false, this.pmvMatrix); // Lines
        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, this.mvMatrix); // Lines
        this.gl.uniform3fv(shader.screenZ, this.screenZ); // Lines

    }

    drawTransformMatrixPMV(transformMatrix:number[], buffer:any, shader:any, vertexType:number, bufferIdx:number) {
        const triangleVertexIndexBuffer = buffer.triangleVertexIndexBuffer;

        const drawBuffer = triangleVertexIndexBuffer[bufferIdx];

        const pmvMatrix = mat4.create();
        const screenZ = vec3.create();
        const tempMVMatrix = mat4.create();
        const tempMVInvMatrix = mat4.create();
        const symt_t = mat4.create();
        const symt = mat4.create();
        mat4.set(symt_t,
            transformMatrix[0],
            transformMatrix[1],
            transformMatrix[2],
            transformMatrix[3],
            transformMatrix[4],
            transformMatrix[5],
            transformMatrix[6],
            transformMatrix[7],
            transformMatrix[8],
            transformMatrix[9],
            transformMatrix[10],
            transformMatrix[11],
            transformMatrix[12],
            transformMatrix[13],
            transformMatrix[14],
            transformMatrix[15],
        );
        mat4.transpose(symt, symt_t);
        mat4.multiply(tempMVMatrix, this.mvMatrix, symt);
        mat4.multiply(pmvMatrix, this.pMatrix, tempMVMatrix); // Lines
        this.gl.uniformMatrix4fv(shader.pMatrixUniform, false, pmvMatrix); // Lines
        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, tempMVMatrix);
        tempMVMatrix[12] = 0.0;
        tempMVMatrix[13] = 0.0;
        tempMVMatrix[14] = 0.0;
        mat4.invert(tempMVInvMatrix, tempMVMatrix);
        screenZ[0] = 0.0;
        screenZ[1] = 0.0;
        screenZ[2] = 1.0;
        vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
        this.gl.uniform3fv(shader.screenZ, screenZ);
        if (this.ext) {
            this.drawMaxElementsUInt(vertexType, drawBuffer.numItems);
        } else {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
        }
        this.gl.uniformMatrix4fv(shader.pMatrixUniform, false, this.pmvMatrix); // Lines
        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, this.mvMatrix); // Lines
        this.gl.uniform3fv(shader.screenZ, this.screenZ); // Lines

    }

    GLrender(calculatingShadowMap,doClear=true,ratioMult=1.0) {
        const displayBuffers = store.getState().glRef.displayBuffers
        const ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight * ratioMult;

        let fb_scale = 1.0

        if (calculatingShadowMap) {
            if(!this.offScreenReady)
                this.recreateOffScreeenBuffers(this.canvas.width,this.canvas.height);
            if(!this.screenshotBuffersReady)
                this.initTextureFramebuffer();
            const width_ratio = this.gl.viewportWidth / this.rttFramebuffer.width;
            const height_ratio = this.gl.viewportHeight / this.rttFramebuffer.height;
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebufferDepth);
            this.gl.viewport(0, 0, this.gl.viewportWidth / width_ratio, this.gl.viewportHeight / height_ratio);
        } else if(this.drawingGBuffers) {
            const width_ratio = this.gl.viewportWidth / this.gFramebuffer.width;
            const height_ratio = this.gl.viewportHeight / this.gFramebuffer.height;
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gFramebuffer);
            this.gl.viewport(0, 0, this.gl.viewportWidth / width_ratio, this.gl.viewportHeight / height_ratio);
        } else if(this.renderSilhouettesToTexture) {
            if(!this.silhouetteBufferReady)
                this.recreateSilhouetteBuffers();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.silhouetteFramebuffer);
            const canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
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
            const canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            if(this.useOffScreenBuffers&&this.WEBGL2){
                if(!this.offScreenReady)
                    this.recreateOffScreeenBuffers(this.canvas.width,this.canvas.height);
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebuffer);
                const canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
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

            mat4.ortho(this.pMatrix, -d * ratio, d * ratio, -d, d, 0.1, 1000.);
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
                    mat4.perspective(this.pMatrix, 1.0, 1.0, 100., 1270.0);
                } else {
                    const f = this.gl_clipPlane0[3]+this.fogClipOffset;
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
                    mat4.perspective(this.pMatrix, 1.0, this.gl.viewportWidth / this.gl.viewportHeight, 100., 1270.0);
                } else {
                    const b = Math.min(this.gl_clipPlane1[3],this.gl_fog_end);
                    const f = this.gl_clipPlane0[3]+this.fogClipOffset;
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
            this.drawDistancesAndLabels(up, right);
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
        let invMat
            if(this.renderToTexture) {
                console.log("Delete the normal peel buffers")
                for(let i=0;i<this.depthPeelFramebuffers.length;i++){
                    this.gl.deleteFramebuffer(this.depthPeelFramebuffers[i]);
                    this.gl.deleteRenderbuffer(this.depthPeelRenderbufferDepth[i]);
                    this.gl.deleteRenderbuffer(this.depthPeelRenderbufferColor[i]);
                    this.gl.deleteTexture(this.depthPeelColorTextures[i]);
                    this.gl.deleteTexture(this.depthPeelDepthTextures[i]);
                }
                this.depthPeelFramebuffers = [];
                this.recreateDepthPeelBuffers(4096,4096);
            } else {
                this.recreateDepthPeelBuffers(2048,2048);
            }

            if(doClear) this.gl.clear(this.gl.DEPTH_BUFFER_BIT|this.gl.COLOR_BUFFER_BIT);
            const ratio = 1.0

            if(this.depthPeelFramebuffers.length>0&&this.depthPeelFramebuffers[0].width>0&&this.depthPeelFramebuffers[0].height>0){

                this.gl.enable(this.gl.DEPTH_TEST);
                const depthPeelSampler0 = 3;

                theShaders.forEach(shader => {
                        this.gl.useProgram(shader);
                        this.gl.uniform1f(shader.xSSAOScaling, 1.0/this.depthPeelFramebuffers[0].width );
                        this.gl.uniform1f(shader.ySSAOScaling, 1.0/this.depthPeelFramebuffers[0].height );
                        this.gl.uniform1i(shader.depthPeelSamplers, depthPeelSampler0);
                        })
                this.doDepthPeelPass = true;
                this.gl.disable(this.gl.BLEND);
                this.gl.enable(this.gl.DEPTH_TEST);
                for(let ipeel=0;ipeel<4;ipeel++){
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.depthPeelFramebuffers[ipeel]);
                    this.gl.activeTexture(this.gl.TEXTURE0+depthPeelSampler0);
                    if(ipeel>0){
                        this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelDepthTextures[ipeel-1]);
                    } else {
                        this.gl.bindTexture(this.gl.TEXTURE_2D, null)
                    }
                    theShaders.forEach(shader => {
                            this.gl.useProgram(shader);
                            this.gl.uniform1i(shader.peelNumber,ipeel);
                            })
                    invMat = this.GLrender(false,doClear,ratioMult);
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
                }

                this.doDepthPeelPass = false;
                theShaders.forEach(shader => {
                        this.gl.useProgram(shader);
                        this.gl.uniform1i(shader.peelNumber,-1);
                        })

                // And now accumulate onto one fullscreen quad

                const theShader = this.shaderProgramDepthPeelAccum;
                this.gl.useProgram(theShader);
                for(let i = 0; i<16; i++)
                    this.gl.disableVertexAttribArray(i);
                this.gl.enableVertexAttribArray(theShader.vertexPositionAttribute);
                this.gl.enableVertexAttribArray(theShader.vertexTextureAttribute);
                this.bindFramebufferDrawBuffers();

                const paintPMatrix = mat4.create();
                if(this.renderToTexture) {
                    if(!this.screenshotBuffersReady)
                        this.initTextureFramebuffer();
                    console.log("Binding rttFramebuffer in depth peel accumulate",this.rttFramebuffer);
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebuffer);
                    this.gl.viewport(0, 0, this.rttFramebuffer.width, this.rttFramebuffer.height);
                    this.gl.uniform1f(theShader.xSSAOScaling, 1.0/this.rttFramebuffer.width );
                    this.gl.uniform1f(theShader.ySSAOScaling, 1.0/this.rttFramebuffer.height );
                } else {
                    if(this.useOffScreenBuffers&&this.WEBGL2){
                        if(!this.offScreenReady)
                            this.recreateOffScreeenBuffers(this.canvas.width,this.canvas.height);
                        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebuffer);
                        const canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
                    }
                    this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
                    this.gl.uniform1f(theShader.xSSAOScaling, 1.0/this.gl.viewportWidth );
                    this.gl.uniform1f(theShader.ySSAOScaling, 1.0/this.gl.viewportHeight );
                }
                mat4.ortho(paintPMatrix, -1.0/ratio , 1.0/ratio , -1.0, 1.0, 0.1, 1000.0);
                this.gl.uniformMatrix4fv(theShader.pMatrixUniform, false, paintPMatrix);

                this.gl.enable(this.gl.BLEND);
                this.gl.disable(this.gl.DEPTH_TEST);
                if(this.renderToTexture&&this.transparentScreenshotBackground) {
                    this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], 0.0);
                } else{
                    this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], this.background_colour[3]);
                }
                if(doClear) this.gl.clear(this.gl.DEPTH_BUFFER_BIT|this.gl.COLOR_BUFFER_BIT)
                this.gl.uniform1i(theShader.depthPeelSamplers, 0);
                this.gl.uniform1i(theShader.colorPeelSamplers, 1);
                for(let ipeel=3;ipeel>=0;ipeel--){
                    this.gl.activeTexture(this.gl.TEXTURE0);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelDepthTextures[ipeel]);
                    this.gl.activeTexture(this.gl.TEXTURE1);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelColorTextures[ipeel]);
                    this.gl.uniform1i(theShader.peelNumber,ipeel);
                    if (this.ext) {
                        this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
                    } else {
                        this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            if(this.renderToTexture) {
                console.log("Delete screenshot peel buffers")
                for(let i=0;i<this.depthPeelFramebuffers.length;i++){
                    this.gl.deleteFramebuffer(this.depthPeelFramebuffers[i]);
                    this.gl.deleteRenderbuffer(this.depthPeelRenderbufferDepth[i]);
                    this.gl.deleteRenderbuffer(this.depthPeelRenderbufferColor[i]);
                    this.gl.deleteTexture(this.depthPeelColorTextures[i]);
                    this.gl.deleteTexture(this.depthPeelDepthTextures[i]);
                }
                this.depthPeelFramebuffers = [];
            }
        return invMat
    }

    drawScene() : void {

        if(this.renderToTexture&&(!this.screenshotBuffersReady))
            this.initTextureFramebuffer();

        const displayBuffers = store.getState().glRef.displayBuffers

        let dirty = false
        const thisdisplayBufferslength = displayBuffers.length;

        for (let idx = 0; idx < thisdisplayBufferslength; idx++) {
            if (displayBuffers[idx].isDirty) {
                dirty = true;
                break
            }
        }
        if(dirty) this.buildBuffers()
        if(isNaN(this.myQuat[0])||isNaN(this.myQuat[1])||isNaN(this.myQuat[2])||isNaN(this.myQuat[3])){
            console.log("Something's gone wrong!!!!!!!!!!!!!")
            console.log(this.myQuat)
        }

        if(!this.animating) this.props.onQuatChanged(this.myQuat)
        this.props.setDrawQuat(this.myQuat)

        const theShaders = [
            this.shaderProgram,
            this.shaderProgramInstanced,
            this.shaderProgramThickLinesNormal,
            this.shaderProgramPerfectSpheres
        ];

        theShaders.forEach(shader => {
            this.gl.useProgram(shader);
            this.gl.uniform1i(shader.peelNumber,-1);
        })

        this.currentViewport = [0, 0, this.gl.viewportWidth, this.gl.viewportHeight]
        const oldMouseDown = this.mouseDown;

        if ((this.doEdgeDetect||this.doSSAO)&&this.WEBGL2) {
            if(this.renderToTexture) {
                this.gBuffersFramebufferSize = 4096;
                if(this.gFramebuffer){
                    this.gl.deleteFramebuffer(this.gFramebuffer);
                    this.gFramebuffer = null;
                }
                this.createGBuffers(this.gBuffersFramebufferSize,this.gBuffersFramebufferSize);
            }
            if(!this.gFramebuffer) this.createGBuffers(this.gBuffersFramebufferSize,this.gBuffersFramebufferSize);
            //console.log("Do G-buffer pass for gPosition and gNormal)")
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gFramebuffer);
            this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0,this.gl.COLOR_ATTACHMENT1]);

            // Need triangle and perfect sphere gBuffer shaders
            this.drawingGBuffers = true;
            this.gl.enable(this.gl.DEPTH_TEST);
            this.GLrender(false);
            this.drawingGBuffers = false;

            this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0]);
        }

        const f = this.gl_clipPlane0[3]+this.fogClipOffset;
        const b = Math.min(this.gl_clipPlane1[3],this.gl_fog_end);

        this.doPeel = false;
        if(this.doOrderIndependentTransparency){
            for (let idx = 0; idx < displayBuffers.length && !this.doPeel; idx++) {
                if (displayBuffers[idx].visible) {
                    const triangleVertexIndexBuffer = displayBuffers[idx].triangleVertexIndexBuffer;
                    for (let j = 0; j < triangleVertexIndexBuffer.length&& !this.doPeel; j++) {
                        if (displayBuffers[idx].transparent&&!displayBuffers[idx].isHoverBuffer) {
                            this.doPeel = true;
                        }
                    }
                }
            }
        }

        if (this.doEdgeDetect&&this.WEBGL2) {

            const ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;

            if(this.renderToTexture) {
                this.edgeDetectFramebufferSize = 4096;
                if(this.edgeDetectFramebuffer){
                    this.gl.deleteFramebuffer(this.edgeDetectFramebuffer);
                    this.edgeDetectFramebuffer = null;
                }
                this.createGBuffers(this.gBuffersFramebufferSize,this.gBuffersFramebufferSize);
                if(!this.edgeDetectFramebuffer) this.createEdgeDetectFramebufferBuffer(4096,4096);
            } else {
                if(!this.edgeDetectFramebuffer){
                    if(ratio>1.0)
                        this.createEdgeDetectFramebufferBuffer(this.edgeDetectFramebufferSize,this.edgeDetectFramebufferSize/ratio);
                    else
                        this.createEdgeDetectFramebufferBuffer(this.edgeDetectFramebufferSize*ratio,this.edgeDetectFramebufferSize);
                }
            }

            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.edgeDetectFramebuffer);

            this.gl.useProgram(this.shaderProgramEdgeDetect);
            this.gl.uniform1i(this.shaderProgramEdgeDetect.gPositionTexture,0);
            this.gl.uniform1i(this.shaderProgramEdgeDetect.gNormalTexture,1);
            this.gl.uniform1f(this.shaderProgramEdgeDetect.zoom,this.zoom);
            this.gl.uniform1f(this.shaderProgramEdgeDetect.depthBufferSize,(f+b)*2.);

            this.gl.uniform1f(this.shaderProgramEdgeDetect.depthThreshold,this.depthThreshold);
            this.gl.uniform1f(this.shaderProgramEdgeDetect.normalThreshold,this.normalThreshold);
            if(this.renderToTexture){
                this.gl.uniform1f(this.shaderProgramEdgeDetect.scaleDepth,this.scaleDepth*4096./this.gl.viewportWidth*.5);
                this.gl.uniform1f(this.shaderProgramEdgeDetect.scaleNormal,this.scaleNormal*4096./this.gl.viewportWidth*.5);
            } else {
                this.gl.uniform1f(this.shaderProgramEdgeDetect.scaleDepth,this.scaleDepth/ratio);
                this.gl.uniform1f(this.shaderProgramEdgeDetect.scaleNormal,this.scaleNormal);
            }
            this.gl.uniform1f(this.shaderProgramEdgeDetect.xPixelOffset, 1.0/this.edgeDetectFramebuffer.width/this.zoom/ratio);
            this.gl.uniform1f(this.shaderProgramEdgeDetect.yPixelOffset, 1.0/this.edgeDetectFramebuffer.height/this.zoom/ratio);
            if(this.doPerspectiveProjection){
                this.gl.uniform1f(this.shaderProgramEdgeDetect.depthFactor, 1.0/80.0);
            } else {
                this.gl.uniform1f(this.shaderProgramEdgeDetect.depthFactor, 1.0);
            }

            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferPositionTexture);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferNormalTexture);

            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);
            this.gl.enableVertexAttribArray(this.shaderProgramEdgeDetect.vertexTextureAttribute);
            this.gl.enableVertexAttribArray(this.shaderProgramEdgeDetect.vertexPositionAttribute);
            //FIXME - Size
            if(this.renderToTexture) {
                this.gl.viewport(0, 0, this.edgeDetectFramebufferSize, this.edgeDetectFramebufferSize);
            } else {
                if(ratio>1.0)
                    this.gl.viewport(0, 0, this.edgeDetectFramebufferSize, this.edgeDetectFramebufferSize/ratio);
                else
                    this.gl.viewport(0, 0, this.edgeDetectFramebufferSize*ratio, this.edgeDetectFramebufferSize);
            }

            const paintMvMatrix = mat4.create();
            const paintPMatrix = mat4.create();
            mat4.identity(paintMvMatrix);
            mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);
            this.gl.uniformMatrix4fv(this.shaderProgramEdgeDetect.pMatrixUniform, false, paintPMatrix);
            this.gl.uniformMatrix4fv(this.shaderProgramEdgeDetect.mvMatrixUniform, false, paintMvMatrix);

            this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
            this.bindFramebufferDrawBuffers();

            if (this.ext) {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
            } else {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
            }
        }

        if (this.doSSAO&&this.WEBGL2) {
            if(!this.ssaoFramebuffer) this.createSSAOFramebufferBuffer();
            if(!this.offScreenFramebufferSimpleBlurX) this.createSimpleBlurOffScreeenBuffers();

            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.ssaoFramebuffer);
            this.gl.useProgram(this.shaderProgramSSAO);
            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.ssaoKernelBuffer);
            this.gl.uniform1i(this.shaderProgramSSAO.gPositionTexture,0);
            this.gl.uniform1i(this.shaderProgramSSAO.gNormalTexture,1);
            this.gl.uniform1i(this.shaderProgramSSAO.texNoiseTexture,2);

            this.gl.uniform1f(this.shaderProgramSSAO.depthBufferSize,b+f);
            if(this.doPerspectiveProjection){
                this.gl.uniform1f(this.shaderProgramSSAO.depthFactor,1.0/80.);
                this.gl.uniform1f(this.shaderProgramSSAO.radius,this.ssaoRadius*2.0);
            } else {
                this.gl.uniform1f(this.shaderProgramSSAO.depthFactor,1.0);
                this.gl.uniform1f(this.shaderProgramSSAO.radius,this.ssaoRadius);
            }

            this.gl.uniform1f(this.shaderProgramSSAO.bias,this.ssaoBias);
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferPositionTexture);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferNormalTexture);
            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.ssaoNoiseTexture);

            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);
            this.gl.enableVertexAttribArray(this.shaderProgramSSAO.vertexTextureAttribute);
            this.gl.enableVertexAttribArray(this.shaderProgramSSAO.vertexPositionAttribute);
            //FIXME - Size
            this.gl.viewport(0, 0, 1024, 1024);

            const paintMvMatrix = mat4.create();
            const paintPMatrix = mat4.create();
            mat4.identity(paintMvMatrix);
            if(this.doPerspectiveProjection){
                mat4.ortho(paintPMatrix, -2.85 , 2.85 , -2.85, 2.85, 0.1, 1000.0);
            } else {
                mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);
            }
            this.gl.uniformMatrix4fv(this.shaderProgramSSAO.pMatrixUniform, false, paintPMatrix);
            this.gl.uniformMatrix4fv(this.shaderProgramSSAO.mvMatrixUniform, false, paintMvMatrix);

            this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
            this.bindFramebufferDrawBuffers();

            this.bindSSAOBuffers()

            if (this.ext) {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
            } else {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
            }

            // Now blur ....

            this.textureBlur(this.offScreenFramebufferSimpleBlurX.width,this.offScreenFramebufferSimpleBlurX.height,this.ssaoTexture);

        }

        if((this.doEdgeDetect||this.doSSAO)&&this.WEBGL2) {
            //Back to normal
            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }

        if (this.doShadow) {
            this.calculatingShadowMap = true;
            this.GLrender(true);
            this.calculatingShadowMap = false;

            //FIXME - This is all following mgfbo.cc
            this.textureMatrix = mat4.create();
            mat4.identity(this.textureMatrix);
            mat4.translate(this.textureMatrix, this.textureMatrix, [0.5, 0.5, 0.5]);
            mat4.scale(this.textureMatrix, this.textureMatrix, [0.5, 0.5, 0.5]);
            mat4.multiply(this.textureMatrix, this.textureMatrix, this.pMatrix);
            mat4.multiply(this.textureMatrix, this.textureMatrix, this.mvMatrix);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }

        this.stencilPass = false;

        let invMat;

        this.renderSilhouettesToTexture = false;

        if(this.doStenciling){
            //Framebuffer way
            this.renderSilhouettesToTexture = true;
            this.stenciling = false;
            invMat = this.GLrender(false);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            this.stenciling = true;
            invMat = this.GLrender(false);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            this.renderSilhouettesToTexture = false;
            this.stenciling = false;
            invMat = this.GLrender(false);

            this.gl.useProgram(this.shaderProgramOverlay);
            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);
            this.gl.enableVertexAttribArray(this.shaderProgramOverlay.vertexTextureAttribute);
            this.gl.enableVertexAttribArray(this.shaderProgramOverlay.vertexPositionAttribute);

            this.gl.uniform1i(this.shaderProgramOverlay.inputTexture,0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.silhouetteTexture);

            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);

            const paintMvMatrix = mat4.create();
            const paintPMatrix = mat4.create();
            mat4.identity(paintMvMatrix);
            mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);

            this.gl.uniformMatrix4fv(this.shaderProgramOverlay.pMatrixUniform, false, paintPMatrix);
            this.gl.uniformMatrix4fv(this.shaderProgramOverlay.mvMatrixUniform, false, paintMvMatrix);

            this.bindFramebufferDrawBuffers();

            this.gl.depthFunc(this.gl.ALWAYS);
            if (this.ext) {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
            } else {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
            }
            this.gl.bindTexture(this.gl.TEXTURE_2D, null)
            this.gl.depthFunc(this.gl.LESS);

        } else {
            this.gl.stencilMask(0x00);
            this.gl.disable(this.gl.STENCIL_TEST);
            this.gl.enable(this.gl.DEPTH_TEST);
                if(this.doMultiView||this.doThreeWayView||this.doSideBySideStereo||this.doCrossEyedStereo){

                    let multiViewGroupsKeys = []
                    const origQuat = quat4.clone(this.myQuat);
                    const origOrigin = this.origin
                    const multiViewOrigins = []

                    let quats
                    let viewports
                    let ratioMult = 1.0

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
                            this.setupMultiWayTransformations(multiViewGroupsKeys.length)
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

                    //console.log(multiViewOrigins)
                    //console.log(viewports)
                    for(let i=0;i<viewports.length;i++){

                        if(this.doMultiView){
                            if(multiViewGroupsKeys.length>0){
                                this.currentMultiViewGroup = parseInt(multiViewGroupsKeys[i])
                                if(i<multiViewOrigins.length&& multiViewOrigins[i]&& multiViewOrigins[i].length===3)
                                    this.origin = multiViewOrigins[i]
                            } else {
                                continue
                            }
                        }

                        const newXQuat = quat4.clone(origQuat);
                        quat4.multiply(newXQuat, newXQuat, quats[i]);
                        this.myQuat = newXQuat
                        this.currentViewport = viewports[i]

                        const doClear = i===0 ? true : false
                        if(this.doPeel){//Do depth peel
                            invMat = this.drawPeel(theShaders,doClear,ratioMult)
                        } else {
                            invMat = this.GLrender(false,doClear,ratioMult);
                        }
                        if (this.doPeel) {
                            this.gl.activeTexture(this.gl.TEXTURE0);
                            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTex);
                        }
                        if(invMat&&i==0) this.drawTextOverlays(invMat,ratioMult, Math.sqrt(this.gl.viewportHeight /this.currentViewport[3]));
                        if (this.showFPS&&i==0) {
                            this.drawFPSMeter();
                        }
                    }
                    this.myQuat = origQuat
                    if(this.doMultiView&&multiViewGroupsKeys.length===0){
                        if(this.doPeel){//Do depth peel
                            invMat = this.drawPeel(theShaders)
                        } else {
                            invMat = this.GLrender(false);
                        }
                    }
                    this.origin = origOrigin
                } else {
                    this.currentViewport = [0, 0, this.gl.viewportWidth, this.gl.viewportHeight]
                    if(this.doPeel){//Do depth peel
                        invMat = this.drawPeel(theShaders)
                    } else {
                        invMat = this.GLrender(false);
                    }
                }

            if(this.doAnaglyphStereo){
                const origQuat = quat4.clone(this.myQuat);
                const quats = this.stereoQuats

                for(let i=0;i<quats.length;i++){
                    const newXQuat = quat4.clone(origQuat);
                    quat4.multiply(newXQuat, newXQuat, quats[i]);
                    this.myQuat = newXQuat
                    this.currentAnaglyphColor = i===0 ? [1.0,0.0,0.0,1.0] : [0.0,1.0,0.0,1.0]
                    const doClear = i===0 ? true : false
                    invMat = this.GLrender(false,doClear);
                }
                this.myQuat = origQuat
            }
        }

        //console.log(this.mvMatrix);
        //console.log(this.mvInvMatrix);
        //console.log(this.pMatrix);
        //console.log(this.screenZ);
        //console.log(invMat);

        if(!this.doMultiView&&!this.doThreeWayView&&!this.doSideBySideStereo&&!this.doCrossEyedStereo){

            if (this.showFPS) {
                this.drawFPSMeter();
            }

            if(!(this.useOffScreenBuffers&&this.offScreenReady)){
                this.drawLineMeasures(invMat);
                this.drawTextOverlays(invMat);
            }
        }

        if(this.trackMouse&&!this.renderToTexture){
            this.drawMouseTrack();
        }

        this.mouseDown = oldMouseDown;

        if(this.doShadowDepthDebug&&this.doShadow){
            this.gl.clearColor(1.0,1.0,0.0,1.0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            const paintMvMatrix = mat4.create();
            const paintPMatrix = mat4.create();
            mat4.identity(paintMvMatrix);
            mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);
            this.gl.useProgram(this.shaderProgramRenderFrameBuffer);

            this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.focussedTexture,0);
            this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.blurredTexture,1);
            this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.depthTexture,2);

            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTextureDepth);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTextureDepth);
            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);

            this.gl.enableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute);

            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);

            this.gl.uniformMatrix4fv(this.shaderProgramRenderFrameBuffer.pMatrixUniform, false, paintPMatrix);
            this.gl.uniformMatrix4fv(this.shaderProgramRenderFrameBuffer.mvMatrixUniform, false, paintMvMatrix);

            this.bindFramebufferDrawBuffers();

            if (this.ext) {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
            } else {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
            }

            this.gl.disableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute);

            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

            return;
        }

        if (this.save_pixel_data) {
            console.log("Saving pixel data");
            const pixels = new Uint8Array(this.canvas.width * this.canvas.height * 4);
            this.gl.readPixels(0, 0, this.canvas.width, this.canvas.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
            this.pixel_data = pixels;
        }

        if(this.renderToTexture&&!this.useOffScreenBuffers) {
            console.log("SCREENSHOT")
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
            }
            const pixels = new Uint8Array(this.gl.viewportWidth / width_ratio * this.gl.viewportHeight / height_ratio * 4);
            this.gl.readPixels(0, 0, this.gl.viewportWidth / width_ratio, this.gl.viewportHeight / height_ratio, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
            this.pixel_data = pixels;
        }

        if(this.useOffScreenBuffers&&this.offScreenReady){
            this.depthBlur(invMat);
        }

        if(this.showFPS){
            this.nFrames += 1;
            const thisTime = performance.now();
            const mspf = thisTime - this.prevTime;
            this.mspfArray.push(mspf);
            if(this.mspfArray.length>200) this.mspfArray.shift();
            this.prevTime = thisTime;
        }

        if(this.renderToTexture) {
            this.edgeDetectFramebufferSize = 2048;
            this.gBuffersFramebufferSize = 1024;
            if(this.edgeDetectFramebuffer){
                this.gl.deleteFramebuffer(this.edgeDetectFramebuffer);
                this.edgeDetectFramebuffer = null;
            }
            if(this.gFramebuffer){
                this.gl.deleteFramebuffer(this.gFramebuffer);
                this.gFramebuffer = null;
            }
        }
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
        if(this.renderToTexture) {
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
        //FIXME - UG!
        this.setBlurSize(this.blurSize);
        this.gl.useProgram(this.shaderProgramBlurX);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);
        this.gl.enableVertexAttribArray(this.shaderProgramBlurX.vertexTextureAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramBlurX.vertexPositionAttribute);

        this.gl.uniform1i(this.shaderProgramBlurX.inputTexture,0);
        this.gl.uniform1i(this.shaderProgramBlurX.depthTexture,1);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferBlurX);

        this.gl.activeTexture(this.gl.TEXTURE0);
        if(this.renderToTexture) {
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

        let f = -(this.gl_clipPlane0[3]+this.fogClipOffset);
        let b = Math.min(this.gl_clipPlane1[3],this.gl_fog_end);
        if(this.doPerspectiveProjection){
            f = 100.
            b = 270.
        }
        //console.log("In blur",f,b,this.blurDepth)
        const absDepth = this.blurDepth * (1000. - -1000.) - 1000.;
        let fracDepth = (absDepth-f)/(b - f);
        fracDepth = this.blurDepth * 1000. / (b-f) - f/(b-f) - this.fogClipOffset/(b-f);
        console.log(fracDepth);
        //console.log(this.blurDepth,fracDepth,b-f,b+f,b,f);
        if(fracDepth > 1.0) fracDepth = 1.0;
        if(fracDepth < 0.0) fracDepth = 0.0;

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
        //FIXME - UG!
        this.setBlurSize(this.blurSize);
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
        if(this.renderToTexture) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTexture);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);
        }

        this.gl.activeTexture(this.gl.TEXTURE1);
        if(this.renderToTexture) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture);
        }

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

        const blurSizeX = this.blurSize/width;
        const blurSizeY = this.blurSize/height;

        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.blurUBOBuffer);
        //FIXME - UG!
        this.setBlurSize(this.blurSize);
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
        //FIXME - UG!
        this.setBlurSize(this.blurSize);
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

        const displayBuffers = store.getState().glRef.displayBuffers
        const hoverSize = store.getState().glRef.hoverSize

        const symmetries = [];
        const symms = [];
        const bright_y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;

        if(this.doShadow&&!calculatingShadowMap&&!this.drawingGBuffers){
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTextureDepth);
        }

        for (let idx = 0; idx < displayBuffers.length; idx++) {

            if (!displayBuffers[idx].visible) {
                continue;
            }
            if(this.doStenciling){
                if(this.stencilPass&&!displayBuffers[idx].doStencil){
                    continue;
                }
                if(this.stenciling&&!displayBuffers[idx].doStencil){
                    continue;
                }
                if (!this.stenciling&&displayBuffers[idx].doStencil){
                    continue;
                }
            }

            if(this.doMultiView&&displayBuffers[idx].origin&&displayBuffers[idx].origin.length===3){
                if(Object.hasOwn(displayBuffers[idx], "isHoverBuffer")&&!displayBuffers[idx].isHoverBuffer){
                    if(displayBuffers[idx].multiViewGroup!==this.currentMultiViewGroup){
                        continue
                    }
                }
            }

            const bufferTypes = displayBuffers[idx].bufferTypes;

            const triangleVertexNormalBuffer = displayBuffers[idx].triangleVertexNormalBuffer;
            const triangleVertexRealNormalBuffer = displayBuffers[idx].triangleVertexRealNormalBuffer;
            const triangleVertexPositionBuffer = displayBuffers[idx].triangleVertexPositionBuffer;
            const triangleVertexIndexBuffer = displayBuffers[idx].triangleVertexIndexBuffer;
            const triangleColourBuffer = displayBuffers[idx].triangleColourBuffer;

            const triangleVertices = displayBuffers[idx].triangleVertices;
            const triangleColours = displayBuffers[idx].triangleColours;

            const primitiveSizes = displayBuffers[idx].primitiveSizes;

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (displayBuffers[idx].transparent&&!this.drawingGBuffers) {
                    //console.log("Not doing normal drawing way ....");
                    if(!this.doPeel)
                        continue;
                }
                let theShader;
                let scaleZ = false;

                if(displayBuffers[idx].triangleInstanceOriginBuffer[j]){
                    if(this.drawingGBuffers){
                        theShader = this.shaderProgramGBuffersInstanced;
                    } else {
                        theShader = this.shaderProgramInstanced;
                        if (calculatingShadowMap)
                            theShader = this.shaderProgramInstancedShadow;
                        if(this.stencilPass)
                            theShader = this.shaderProgramInstancedOutline;
                    }
                } else {
                    if(this.drawingGBuffers){
                        theShader = this.shaderProgramGBuffers;
                    } else {
                        theShader = this.shaderProgram;
                        if (calculatingShadowMap)
                            theShader = this.shaderProgramShadow;
                        if(this.stencilPass){
                            theShader = this.shaderProgramOutline;
                            scaleZ = true;
                        }
                    }
                }

                this.gl.useProgram(theShader);
                this.gl.uniform1i(theShader.doShadows, false);
                if(this.doShadow&&!calculatingShadowMap&&!this.drawingGBuffers){
                    this.gl.uniform1i(theShader.ShadowMap, 0);
                    this.gl.uniform1f(theShader.xPixelOffset, 1.0/this.rttFramebufferDepth.width);
                    this.gl.uniform1f(theShader.yPixelOffset, 1.0/this.rttFramebufferDepth.height);
                    this.gl.uniformMatrix4fv(theShader.textureMatrixUniform, false, this.textureMatrix);
                    this.gl.uniform1i(theShader.doShadows, true);
                    if(this.renderToTexture)
                        this.gl.uniform1i(theShader.shadowQuality, 1);
                    else
                        this.gl.uniform1i(theShader.shadowQuality, 0);
                }
                if(theShader.doSSAO!=null) this.gl.uniform1i(theShader.doSSAO, this.doSSAO);
                if(theShader.doEdgeDetect!=null) this.gl.uniform1i(theShader.doEdgeDetect, this.doEdgeDetect);
                if(theShader.occludeDiffuse!=null) this.gl.uniform1i(theShader.occludeDiffuse, this.occludeDiffuse);
                if(theShader.doPerspective!=null) this.gl.uniform1i(theShader.doPerspective, this.doPerspectiveProjection);
                if(this.WEBGL2&&theShader.doEdgeDetect&&!this.drawingGBuffers){
                    this.gl.uniform1i(theShader.edgeDetectMap, 2);
                    this.gl.activeTexture(this.gl.TEXTURE2);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.edgeDetectTexture);
                    this.gl.activeTexture(this.gl.TEXTURE0);
                }
                if(this.WEBGL2&&theShader.doSSAO&&!this.drawingGBuffers){
                    //SSAO after double blur
                    this.gl.uniform1i(theShader.SSAOMap, 1);
                    this.gl.activeTexture(this.gl.TEXTURE1);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurYTexture);
                    this.gl.activeTexture(this.gl.TEXTURE0);
                    if(!this.doDepthPeelPass){
                        if(this.renderToTexture){
                            this.gl.uniform1f(theShader.xSSAOScaling, 1.0/this.rttFramebuffer.width );
                            this.gl.uniform1f(theShader.ySSAOScaling, 1.0/this.rttFramebuffer.height );
                        } else {
                            this.gl.uniform1f(theShader.xSSAOScaling, 1.0/this.gl.viewportWidth );
                            this.gl.uniform1f(theShader.ySSAOScaling, 1.0/this.gl.viewportHeight );
                        }
                    }
                }

                for(let i = 0; i<16; i++)
                    this.gl.disableVertexAttribArray(i);

                if(typeof(theShader.vertexNormalAttribute!=="undefined") && theShader.vertexNormalAttribute!==null&&theShader.vertexNormalAttribute>-1){
                    if(!calculatingShadowMap){

                        this.gl.enableVertexAttribArray(theShader.vertexNormalAttribute);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexNormalBuffer[j]);
                        if (bufferTypes[j] !== "PERFECT_SPHERES") this.gl.vertexAttribPointer(theShader.vertexNormalAttribute, triangleVertexNormalBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                    }
                }

                this.gl.enableVertexAttribArray(theShader.vertexPositionAttribute);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                if (bufferTypes[j] !== "PERFECT_SPHERES") this.gl.vertexAttribPointer(theShader.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);

                if(this.stencilPass){
                    this.gl.disable(this.gl.DEPTH_TEST);
                    this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                    if(bright_y<0.5)
                        this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 1.0, 1.0, 1.0, 1.0);
                    else
                        this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.0, 0.0, 0.0, 1.0);
                    const outlineSize = vec3.create();
                    vec3.set(outlineSize, 0.1, 0.1, 0.0);
                    if(scaleZ)
                        vec3.set(outlineSize, 0.1, 0.1, 0.1);
                    this.gl.uniform3fv(theShader.outlineSize, outlineSize);
                } else {
                    if(theShader.vertexColourAttribute>-1){
                        const outlineSize = vec3.create();
                        vec3.set(outlineSize, 0.0, 0.0, 0.0);
                        this.gl.uniform3fv(theShader.outlineSize, outlineSize);
                        if(displayBuffers[idx].customColour&&displayBuffers[idx].customColour.length==4){
                            this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...displayBuffers[idx].customColour)
                        } else {
                            this.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
                            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                            this.gl.vertexAttribPointer(theShader.vertexColourAttribute, triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                        }
                    }
                }
                if (bufferTypes[j] === "TRIANGLES") {
                    if (displayBuffers[idx].transformMatrix) {
                        this.drawTransformMatrix(displayBuffers[idx].transformMatrix, displayBuffers[idx], theShader, this.gl.TRIANGLES, j);
                    } else if (displayBuffers[idx].transformMatrixInteractive) {
                        //And this is based on time...
                        const t = Date.now()
                        const tdiff = (Math.round(t/1000) - t/1000)
                        let sfrac;
                        if(tdiff<0){
                            sfrac = Math.sin(Math.PI+tdiff*Math.PI)
                        } else {
                            sfrac = Math.sin(tdiff*Math.PI)
                        }
                        this.gl.uniform4fv(theShader.light_colours_ambient, [sfrac,sfrac,sfrac,1.0]);
                        this.drawTransformMatrixInteractive(displayBuffers[idx].transformMatrixInteractive, displayBuffers[idx].transformOriginInteractive, displayBuffers[idx], theShader, this.gl.TRIANGLES, j);
                        this.gl.uniform4fv(theShader.light_colours_ambient, this.light_colours_ambient);
                    } else {
                        this.gl.uniform3fv(theShader.screenZ, this.screenZ);
                        if(this.stencilPass && scaleZ){
                            const outlineSize = vec3.create();
                            for(let i=0;i<10;i++){
                                vec3.set(outlineSize, 0.01*i, 0.01*i, 0.01*i);
                                this.gl.uniform3fv(theShader.outlineSize, outlineSize);
                                this.drawBuffer(displayBuffers[idx],theShader,j,this.gl.TRIANGLES);
                            }
                        } else {
                            this.drawBuffer(displayBuffers[idx],theShader,j,this.gl.TRIANGLES);
                        }
                    }
                } else if (bufferTypes[j] === "TRIANGLE_STRIP") {
                    if (displayBuffers[idx].transformMatrix) {
                        this.drawTransformMatrix(displayBuffers[idx].transformMatrix, displayBuffers[idx], this.shaderProgram, this.gl.TRIANGLE_STRIP, j);
                    } else if (displayBuffers[idx].transformMatrixInteractive) {
                        this.drawTransformMatrixInteractive(displayBuffers[idx].transformMatrixInteractive, displayBuffers[idx].transformOriginInteractive, displayBuffers[idx], this.shaderProgram, this.gl.TRIANGLE_STRIP, j);
                    } else {
                        if (this.ext) {
                        if(this.doAnaglyphStereo) {
                            this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...this.currentAnaglyphColor)
                        }
                            this.gl.drawElements(this.gl.TRIANGLE_STRIP, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_INT, 0);
                        } else {
                            this.gl.drawElements(this.gl.TRIANGLE_STRIP, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_SHORT, 0);
                        }
                    }
                }
            }

            //shaderProgramPerfectSpheres
            //FIXME - broken with gbuffers
            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);

            if (this.frag_depth_ext) {
                const invsymt = mat4.create();
                let program = this.shaderProgramPerfectSpheres;
                if (calculatingShadowMap) {
                    program = this.shaderDepthShadowProgramPerfectSpheres;
                }
                if(this.drawingGBuffers){
                    program = this.shaderProgramGBuffersPerfectSpheres;
                }
                if(this.stencilPass){
                    program = this.shaderProgramPerfectSpheresOutline;
                }

                mat4.set(invsymt,
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0,
                );
                this.gl.useProgram(program);
                this.gl.uniformMatrix4fv(program.invSymMatrixUniform, false, invsymt);
                this.setMatrixUniforms(program);
                this.gl.disableVertexAttribArray(program.vertexColourAttribute);
                this.gl.enableVertexAttribArray(program.vertexPositionAttribute);
                if (!calculatingShadowMap) {
                    this.setLightUniforms(program,false);
                    if(program.clipCap!=null) this.gl.uniform1i(program.clipCap,this.clipCapPerfectSpheres);
                    if(program.vertexNormalAttribute!=null&&program.vertexNormalAttribute>-1) this.gl.enableVertexAttribArray(program.vertexNormalAttribute);
                }
                if(program.vertexTextureAttribute!=null) this.gl.enableVertexAttribArray(program.vertexTextureAttribute);
                if(program.vertexColourAttribute!=null) this.gl.enableVertexAttribArray(program.vertexColourAttribute);
                if(program.offsetAttribute!=null) this.gl.enableVertexAttribArray(program.offsetAttribute);
                if(program.sizeAttribute!=null) this.gl.enableVertexAttribArray(program.sizeAttribute);
                if(program.doShadows!=null) this.gl.uniform1i(program.doShadows, false);
                if(this.doShadow&&!calculatingShadowMap&&!this.drawingGBuffers){
                    this.gl.uniform1i(program.ShadowMap, 0);
                    this.gl.activeTexture(this.gl.TEXTURE0);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTextureDepth);
                    this.gl.uniform1f(program.xPixelOffset, 1.0/this.rttFramebufferDepth.width);
                    this.gl.uniform1f(program.yPixelOffset, 1.0/this.rttFramebufferDepth.height);
                    this.gl.uniformMatrix4fv(program.textureMatrixUniform, false, this.textureMatrix);
                    this.gl.uniform1i(program.doShadows, true);
                    if(this.renderToTexture)
                        this.gl.uniform1i(program.shadowQuality, 1);
                    else
                        this.gl.uniform1i(program.shadowQuality, 0);
                }
                if(program.doSSAO!=null) this.gl.uniform1i(program.doSSAO, this.doSSAO);
                if(program.doEdgeDetect!=null) this.gl.uniform1i(program.doEdgeDetect, this.doEdgeDetect);
                if(program.occludeDiffuse!=null) this.gl.uniform1i(program.occludeDiffuse, this.occludeDiffuse);
                if(program.doPerspective!=null) this.gl.uniform1i(program.doPerspective, this.doPerspectiveProjection);
                if(this.WEBGL2&&program.doEdgeDetect&&!this.drawingGBuffers){
                    this.gl.uniform1i(program.edgeDetectMap, 2);
                    this.gl.activeTexture(this.gl.TEXTURE2);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.edgeDetectTexture);
                    this.gl.activeTexture(this.gl.TEXTURE0);
                }
                if(this.WEBGL2&&program.doSSAO&&!this.drawingGBuffers){
                    this.gl.uniform1i(program.SSAOMap, 1);
                    this.gl.activeTexture(this.gl.TEXTURE1);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurYTexture);
                    this.gl.activeTexture(this.gl.TEXTURE0);
                    if(!this.doDepthPeelPass){
                        if(this.renderToTexture){
                            this.gl.uniform1f(program.xSSAOScaling, 1.0/this.rttFramebuffer.width );
                            this.gl.uniform1f(program.ySSAOScaling, 1.0/this.rttFramebuffer.height );
                        } else {
                            this.gl.uniform1f(program.xSSAOScaling, 1.0/this.gl.viewportWidth );
                            this.gl.uniform1f(program.ySSAOScaling, 1.0/this.gl.viewportHeight );
                        }
                    }
                }

                if(this.stencilPass){
                    this.gl.disable(this.gl.DEPTH_TEST);
                    const outlineSize = vec3.create();
                    vec3.set(outlineSize, 0.1, 0.1, 0.0);
                    this.gl.uniform3fv(program.outlineSize, outlineSize);
                } else {
                    const outlineSize = vec3.create();
                    vec3.set(outlineSize, 0.0, 0.0, 0.0);
                    if(program.outlineSize!=null) this.gl.uniform3fv(program.outlineSize, outlineSize);
                }

                for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                    if (bufferTypes[j] === "PERFECT_SPHERES") {

                        const buffer = this.imageBuffer;

                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexTextureBuffer[0]);
                        this.gl.vertexAttribPointer(program.vertexTextureAttribute, buffer.triangleVertexTextureBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);

                        if(program.vertexNormalAttribute!=null&&program.vertexNormalAttribute>-1){
                            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[0]);
                            this.gl.vertexAttribPointer(program.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                        }

                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[0]);
                        this.gl.vertexAttribPointer(program.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[0]);

                        //pos,normal, texture, index in "buffer"
                        //Instanced colour
                        //Instanced size
                        //Instanced offset
                        if (displayBuffers[idx].transformMatrixInteractive) {
                            const t = Date.now();
                            const tdiff = (Math.round(t/1000) - t/1000);
                            let sfrac;
                            if(tdiff<0){
                                sfrac = Math.sin(Math.PI+tdiff*Math.PI);
                            } else {
                                sfrac = Math.sin(tdiff*Math.PI);
                            }
                            this.gl.uniform4fv(program.light_colours_ambient, [sfrac,sfrac,sfrac,1.0]);
                            //FIXME - Looks like several unused arguments in this function.
                            this.setupModelViewTransformMatrixInteractive(displayBuffers[idx].transformMatrixInteractive, displayBuffers[idx].transformOriginInteractive, null, program, null, null, null);
                            const invsymt2 = mat4.create();
                            mat4.invert(invsymt2, displayBuffers[idx].transformMatrixInteractive);
                            invsymt2[12] = 0.0;
                            invsymt2[13] = 0.0;
                            invsymt2[14] = 0.0;
                            this.gl.uniformMatrix4fv(program.invSymMatrixUniform, false, invsymt2);
                        }
                        this.gl.enableVertexAttribArray(program.offsetAttribute);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, displayBuffers[idx].triangleInstanceOriginBuffer[j]);
                        this.gl.vertexAttribPointer(program.offsetAttribute, displayBuffers[idx].triangleInstanceOriginBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                        this.gl.enableVertexAttribArray(program.sizeAttribute);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, displayBuffers[idx].triangleInstanceSizeBuffer[j]);
                        this.gl.vertexAttribPointer(program.sizeAttribute, displayBuffers[idx].triangleInstanceSizeBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                        if(program.vertexColourAttribute!=null&&program.vertexColourAttribute>-1){
                            this.gl.enableVertexAttribArray(program.vertexColourAttribute);
                            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, displayBuffers[idx].triangleColourBuffer[j]);
                            this.gl.vertexAttribPointer(program.vertexColourAttribute, displayBuffers[idx].triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                        }
                        if(this.stencilPass){
                            this.gl.disableVertexAttribArray(program.vertexColourAttribute);
                            if(bright_y<0.5)
                                this.gl.vertexAttrib4f(program.vertexColourAttribute, 1.0, 1.0, 1.0, 1.0);
                            else
                                this.gl.vertexAttrib4f(program.vertexColourAttribute, 0.0, 0.0, 0.0, 1.0);
                        }
                        if (this.WEBGL2) {
                            if(program.vertexColourAttribute!=null) this.gl.vertexAttribDivisor(program.vertexColourAttribute, 1);
                            this.gl.vertexAttribDivisor(program.sizeAttribute, 1);
                            this.gl.vertexAttribDivisor(program.offsetAttribute, 1);
                            if(displayBuffers[idx].isHoverBuffer&&hoverSize>0.27){
                                this.gl.disableVertexAttribArray(program.sizeAttribute);
                                this.gl.vertexAttribDivisor(program.sizeAttribute, 0);
                                const adjustedHoverSize = hoverSize + 0.4;
                                this.gl.vertexAttrib3f(program.sizeAttribute, adjustedHoverSize, adjustedHoverSize, adjustedHoverSize, 1.0);
                            }
                            if(this.doAnaglyphStereo) {
                                this.gl.disableVertexAttribArray(program.vertexColourAttribute);
                                this.gl.vertexAttribDivisor(program.vertexColourAttribute,0);
                                this.gl.vertexAttrib4f(program.vertexColourAttribute, ...this.currentAnaglyphColor)
                            }
                            this.gl.drawElementsInstanced(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0, displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                            if(program.vertexColourAttribute!=null) this.gl.vertexAttribDivisor(program.vertexColourAttribute, 0);
                            this.gl.vertexAttribDivisor(program.sizeAttribute, 0);
                            this.gl.vertexAttribDivisor(program.offsetAttribute, 0);
                        } else {
                            if(program.vertexColourAttribute!=null) this.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 1);
                            this.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 1);
                            this.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 1);
                            this.instanced_ext.drawElementsInstancedANGLE(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0, displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                            this.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 0);
                            this.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 0);
                            this.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 0);
                        }
                        if (displayBuffers[idx].transformMatrixInteractive) {
                            this.gl.uniform4fv(program.light_colours_ambient, this.light_colours_ambient);
                            this.gl.uniformMatrix4fv(program.mvMatrixUniform, false, this.mvMatrix);
                            this.gl.uniformMatrix4fv(program.mvInvMatrixUniform, false, this.mvInvMatrix);// All else
                            this.gl.uniformMatrix4fv(program.invSymMatrixUniform, false, invsymt);
                        }

                        if(displayBuffers[idx].symmetryMatrices.length>0){
                            if(program.vertexColourAttribute>-1&&displayBuffers[idx].changeColourWithSymmetry){
                                this.gl.disableVertexAttribArray(program.vertexColourAttribute);
                                if(bright_y>0.5)
                                    this.gl.vertexAttrib4f(program.vertexColourAttribute, 0.3, 0.3, 0.3, 1.0);
                                else
                                    this.gl.vertexAttrib4f(program.vertexColourAttribute, 0.5, 0.5, 0.5, 1.0);
                            }

                            const tempMVMatrix = mat4.create();
                            const tempMVInvMatrix = mat4.create();
                            if (this.WEBGL2) {
                                if(program.vertexColourAttribute!=null) this.gl.vertexAttribDivisor(program.vertexColourAttribute, 1);
                                this.gl.vertexAttribDivisor(program.sizeAttribute, 1);
                                this.gl.vertexAttribDivisor(program.offsetAttribute, 1);
                            } else {
                                if(program.vertexColourAttribute!=null) this.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 1);
                                this.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 1);
                                this.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 1);
                            }
                            for (let isym = 0; isym < displayBuffers[idx].symmetryMatrices.length; isym++) {

                                this.applySymmetryMatrix(program,displayBuffers[idx].symmetryMatrices[isym],tempMVMatrix,tempMVInvMatrix,false)
                                    if (this.WEBGL2) {
                                        if(this.doAnaglyphStereo) {
                                            this.gl.disableVertexAttribArray(program.vertexColourAttribute);
                                            this.gl.vertexAttribDivisor(program.vertexColourAttribute,0);
                                            this.gl.vertexAttrib4f(program.vertexColourAttribute, ...this.currentAnaglyphColor)
                                        }
                                        this.gl.drawElementsInstanced(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0, displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                                    } else {
                                        this.instanced_ext.drawElementsInstancedANGLE(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0, displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                                    }

                            }
                            if (this.WEBGL2) {
                                if(program.vertexColourAttribute!=null) this.gl.vertexAttribDivisor(program.vertexColourAttribute, 0);
                                this.gl.vertexAttribDivisor(program.sizeAttribute, 0);
                                this.gl.vertexAttribDivisor(program.offsetAttribute, 0);
                            } else {
                                if(program.vertexColourAttribute!=null) this.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 0);
                                this.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 0);
                                this.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 0);
                            }
                            this.gl.uniformMatrix4fv(program.mvMatrixUniform, false, this.mvMatrix);// All else
                            this.gl.uniformMatrix4fv(program.mvInvMatrixUniform, false, this.mvInvMatrix);// All else

                            this.gl.enableVertexAttribArray(program.vertexColourAttribute);
                        }
                    }
                }

                if(program.vertexColourAttribute!=null) this.gl.enableVertexAttribArray(program.vertexColourAttribute);
                this.gl.disableVertexAttribArray(program.vertexTextureAttribute);
            }

            let shaderProgramThickLinesNormal = this.shaderProgramThickLinesNormal;
            if(this.drawingGBuffers){
                shaderProgramThickLinesNormal = this.shaderProgramGBuffersThickLinesNormal;
            } else {
                shaderProgramThickLinesNormal = this.shaderProgramThickLinesNormal;
            }

            this.gl.useProgram(shaderProgramThickLinesNormal);

            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);

            this.gl.uniform1i(shaderProgramThickLinesNormal.shinyBack, true);
            this.setLightUniforms(shaderProgramThickLinesNormal);
            this.gl.uniform3fv(shaderProgramThickLinesNormal.screenZ, this.screenZ);
            this.gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexPositionAttribute);
            this.gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexColourAttribute);
            this.gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexNormalAttribute);
            this.gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexRealNormalAttribute);
            this.setMatrixUniforms(shaderProgramThickLinesNormal);
            this.gl.uniformMatrix4fv(shaderProgramThickLinesNormal.pMatrixUniform, false, this.pmvMatrix);

            // I do not think this is useful yet as I do not think that lines contribute to occlusion buffer.
            if(this.WEBGL2&&shaderProgramThickLinesNormal.doSSAO&&!this.drawingGBuffers){
                this.gl.uniform1i(shaderProgramThickLinesNormal.SSAOMap, 1);
                this.gl.activeTexture(this.gl.TEXTURE1);
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurYTexture);
                this.gl.activeTexture(this.gl.TEXTURE0);
                if(!this.doDepthPeelPass){
                    if(this.renderToTexture){
                        this.gl.uniform1f(shaderProgramThickLinesNormal.xSSAOScaling, 1.0/this.rttFramebuffer.width );
                        this.gl.uniform1f(shaderProgramThickLinesNormal.ySSAOScaling, 1.0/this.rttFramebuffer.height );
                    } else {
                        this.gl.uniform1f(shaderProgramThickLinesNormal.xSSAOScaling, 1.0/this.gl.viewportWidth );
                        this.gl.uniform1f(shaderProgramThickLinesNormal.ySSAOScaling, 1.0/this.gl.viewportHeight );
                    }
                }
                if(shaderProgramThickLinesNormal.doSSAO!=null){
                    if(shaderProgramThickLinesNormal.doSSAO!=null) this.gl.uniform1i(shaderProgramThickLinesNormal.doSSAO, this.doSSAO);
                    if(shaderProgramThickLinesNormal.occludeDiffuse!=null) this.gl.uniform1i(shaderProgramThickLinesNormal.occludeDiffuse, this.occludeDiffuse);
                    if(shaderProgramThickLinesNormal.doPerspective!=null) this.gl.uniform1i(shaderProgramThickLinesNormal.doPerspective, this.doPerspectiveProjection);
                }
                //Arguably this should be zero?
                if(shaderProgramThickLinesNormal.doEdgeDetect!=null) this.gl.uniform1i(shaderProgramThickLinesNormal.doEdgeDetect, this.doEdgeDetect);
            }

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] !== "NORMALLINES") {
                    continue;
                }
                // FIXME ? We assume all are the same size. Anything else is a little tricky for now.
                if (typeof (displayBuffers[idx].primitiveSizes) !== "undefined" && typeof (displayBuffers[idx].primitiveSizes[j]) !== "undefined" && typeof (displayBuffers[idx].primitiveSizes[j][0]) !== "undefined") {
                    this.gl.uniform1f(shaderProgramThickLinesNormal.pixelZoom, displayBuffers[idx].primitiveSizes[j][0] * 0.04 * this.zoom);
                } else {
                    this.gl.uniform1f(shaderProgramThickLinesNormal.pixelZoom, 1.0 * 0.04 * this.zoom);
                }
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexNormalBuffer[j]);
                this.gl.vertexAttribPointer(shaderProgramThickLinesNormal.vertexNormalAttribute, triangleVertexNormalBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexRealNormalBuffer[j]);
                this.gl.vertexAttribPointer(shaderProgramThickLinesNormal.vertexRealNormalAttribute, triangleVertexRealNormalBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                this.gl.vertexAttribPointer(shaderProgramThickLinesNormal.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                if(displayBuffers[idx].customColour&&displayBuffers[idx].customColour.length==4){
                    this.gl.disableVertexAttribArray(this.shaderProgramThickLinesNormal.vertexColourAttribute);
                    this.gl.vertexAttrib4f(this.shaderProgramThickLinesNormal.vertexColourAttribute, ...displayBuffers[idx].customColour)
                } else {
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                    this.gl.vertexAttribPointer(shaderProgramThickLinesNormal.vertexColourAttribute, triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                }
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);

                if (displayBuffers[idx].transformMatrix) {
                    this.drawTransformMatrixPMV(displayBuffers[idx].transformMatrix, displayBuffers[idx], shaderProgramThickLinesNormal, this.gl.TRIANGLES, j);
                } else {
                    if (this.ext) {
                        this.drawMaxElementsUInt(this.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems);
                    } else {
                        this.gl.drawElements(this.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }

            this.gl.disableVertexAttribArray(shaderProgramThickLinesNormal.vertexRealNormalAttribute);

            if(this.drawingGBuffers){
                //FIXME - Don't skip on thick lines.
                //console.log("Skip most stuff!");
                continue;
            }

            if(this.stencilPass){
                continue;
            }

            if (calculatingShadowMap)
                continue; //Nothing else implemented
            //Cylinders here

            //vertex attribute settings are likely wrong from here on... (REALLY - I HOPE NOT! SJM 26/10/2023)

            const sphereProgram = this.shaderProgramPointSpheres;

            this.gl.useProgram(sphereProgram);

            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);

            this.gl.enableVertexAttribArray(sphereProgram.vertexPositionAttribute);
            this.gl.enableVertexAttribArray(sphereProgram.vertexNormalAttribute);

            const scaleMatrices = displayBuffers[idx].supplementary["scale_matrices"];
            this.gl.disableVertexAttribArray(sphereProgram.vertexColourAttribute);

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                let theseScaleMatrices = [];
                if (bufferTypes[j] !== "SPHEROIDS" && bufferTypes[j] !== "POINTS_SPHERES") {
                    continue;
                }
                let buffer;
                let radMult;
                if (bufferTypes[j] === "POINTS_SPHERES" || bufferTypes[j] === "SPHEROIDS") {
                    buffer = this.sphereBuffer;
                    radMult = 1.0;
                    if (bufferTypes[j] === "SPHEROIDS") {
                        theseScaleMatrices = scaleMatrices[j];
                    }
                }
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[0]);
                this.gl.vertexAttribPointer(sphereProgram.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[0]);
                this.gl.vertexAttribPointer(sphereProgram.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[0]);
                let isphere;

                // FIXME - The scaling will be a property of each object. e.g. B/U factors.
                //       - Perhaps we should have different shaders for scaled objects?
                let scaleMatrix = mat3.clone([1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]);
                this.gl.uniformMatrix3fv(sphereProgram.scaleMatrix, false, scaleMatrix);

                const theOffSet = new Float32Array(3);
                if (theseScaleMatrices.length === triangleVertices[j].length / 3) {
                    for (isphere = 0; isphere < triangleVertices[j].length / 3; isphere++) {
                        scaleMatrix = mat3.clone(theseScaleMatrices[isphere]);
                        this.gl.uniformMatrix3fv(sphereProgram.scaleMatrix, false, scaleMatrix);
                        theOffSet[0] = triangleVertices[j][isphere * 3];
                        theOffSet[1] = triangleVertices[j][isphere * 3 + 1];
                        theOffSet[2] = triangleVertices[j][isphere * 3 + 2];
                        this.gl.vertexAttrib4f(sphereProgram.vertexColourAttribute, triangleColours[j][isphere * 4], triangleColours[j][isphere * 4 + 1], triangleColours[j][isphere * 4 + 2], triangleColours[j][isphere * 4 + 3]);
                        this.gl.uniform3fv(sphereProgram.offset, theOffSet);
                        this.gl.uniform1f(sphereProgram.size, primitiveSizes[j][isphere] * radMult);
                        if (displayBuffers[idx].transformMatrix) {
                            this.drawTransformMatrix(displayBuffers[idx].transformMatrix, buffer, sphereProgram, this.gl.TRIANGLES, j);
                        } else if (displayBuffers[idx].transformMatrixInteractive) {
                            this.drawTransformMatrixInteractive(displayBuffers[idx].transformMatrixInteractive, displayBuffers[idx].transformOriginInteractive, buffer, sphereProgram, this.gl.TRIANGLES, j);
                        } else {
                            if (this.ext) {
                                if(this.doAnaglyphStereo) {
                                    this.gl.disableVertexAttribArray(sphereProgram.vertexColourAttribute);
                                    this.gl.vertexAttribDivisor(sphereProgram.vertexColourAttribute,0);
                                    this.gl.vertexAttrib4f(sphereProgram.vertexColourAttribute, ...this.currentAnaglyphColor)
                                }
                                this.drawMaxElementsUInt(this.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems);
                            } else {
                                this.gl.drawElements(this.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_SHORT, 0);
                            }
                        }
                    }
                } else {
                    for (isphere = 0; isphere < triangleVertices[j].length / 3; isphere++) {
                        theOffSet[0] = triangleVertices[j][isphere * 3];
                        theOffSet[1] = triangleVertices[j][isphere * 3 + 1];
                        theOffSet[2] = triangleVertices[j][isphere * 3 + 2];
                        this.gl.vertexAttrib4f(sphereProgram.vertexColourAttribute, triangleColours[j][isphere * 4], triangleColours[j][isphere * 4 + 1], triangleColours[j][isphere * 4 + 2], triangleColours[j][isphere * 4 + 3]);
                        this.gl.uniform3fv(sphereProgram.offset, theOffSet);
                        this.gl.uniform1f(sphereProgram.size, primitiveSizes[j][isphere] * radMult);
                        if (displayBuffers[idx].transformMatrix) {
                            this.drawTransformMatrix(displayBuffers[idx].transformMatrix, buffer, sphereProgram, this.gl.TRIANGLES, j);
                        } else if (displayBuffers[idx].transformMatrixInteractive) {
                            this.drawTransformMatrixInteractive(displayBuffers[idx].transformMatrixInteractive, displayBuffers[idx].transformOriginInteractive, buffer, sphereProgram, this.gl.TRIANGLES, j);
                        } else {
                            if (this.ext) {
                                if(this.doAnaglyphStereo) {
                                    this.gl.disableVertexAttribArray(sphereProgram.vertexColourAttribute);
                                    this.gl.vertexAttribDivisor(sphereProgram.vertexColourAttribute,0);
                                    this.gl.vertexAttrib4f(sphereProgram.vertexColourAttribute, ...this.currentAnaglyphColor)
                                }
                                this.drawMaxElementsUInt(this.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems);
                            } else {
                                this.gl.drawElements(this.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_SHORT, 0);
                            }
                        }
                    }
                }
            }
            this.gl.enableVertexAttribArray(sphereProgram.vertexColourAttribute);

            this.gl.useProgram(this.shaderProgramTwoDShapes);
            this.setMatrixUniforms(this.shaderProgramTwoDShapes);
            this.gl.disableVertexAttribArray(this.shaderProgramTwoDShapes.vertexColourAttribute);
            this.gl.vertexAttrib4f(this.shaderProgramTwoDShapes.vertexColourAttribute, 1.0, 1.0, 0.0, 1.0);
            const diskVertices = [];
            if (typeof (this.diskVertices) !== "undefined") {
                for (let iv = 0; iv < this.diskVertices.length; iv += 3) {
                    const vold = vec3Create([this.diskVertices[iv], this.diskVertices[iv + 1], this.diskVertices[iv + 2]]);
                    const vnew = vec3.create();
                    vec3.transformMat4(vnew, vold, invMat);
                    diskVertices[iv] = vnew[0];
                    diskVertices[iv + 1] = vnew[1];
                    diskVertices[iv + 2] = vnew[2];
                }
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.diskBuffer.triangleVertexPositionBuffer[0]);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(diskVertices), this.gl.DYNAMIC_DRAW);
            }
            const imageVertices = [];
            if (typeof (this.imageVertices) !== "undefined") {
                for (let iv = 0; iv < this.imageVertices.length; iv += 3) {
                    const vold = vec3Create([this.imageVertices[iv], this.imageVertices[iv + 1], this.imageVertices[iv + 2]]);
                    const vnew = vec3.create();
                    vec3.transformMat4(vnew, vold, invMat);
                    imageVertices[iv] = vnew[0];
                    imageVertices[iv + 1] = vnew[1];
                    imageVertices[iv + 2] = vnew[2];
                }
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.imageBuffer.triangleVertexPositionBuffer[0]);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(imageVertices), this.gl.DYNAMIC_DRAW);
            }
            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] === "POINTS") {
                    const buffer = this.diskBuffer;
                    let scaleImage = true;
                    if (typeof (this.gl, displayBuffers[idx].supplementary["vert_tri_2d"]) !== "undefined") {
                        const tempMVMatrix = mat4.create();
                        mat4.set(tempMVMatrix, this.mvMatrix[0], this.mvMatrix[1], this.mvMatrix[2], this.mvMatrix[3], this.mvMatrix[4], this.mvMatrix[5], this.mvMatrix[6], this.mvMatrix[7], this.mvMatrix[8], this.mvMatrix[9], this.mvMatrix[10], this.mvMatrix[11], (-24.0 + displayBuffers[idx].supplementary["vert_tri_2d"][0][0] * 48.0) * this.zoom, (-24.0 + displayBuffers[idx].supplementary["vert_tri_2d"][0][1] * 48.0) * this.zoom, -this.fogClipOffset, 1.0);
                        this.gl.uniformMatrix4fv(this.shaderProgramTwoDShapes.mvMatrixUniform, false, tempMVMatrix);
                        scaleImage = false;
                    }

                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[0]);
                    this.gl.vertexAttribPointer(this.shaderProgramTwoDShapes.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[0]);
                    this.gl.vertexAttribPointer(this.shaderProgramTwoDShapes.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[0]);
                    // FIXME - And loop here
                    const theOffSet = new Float32Array(3);
                    for (let ishape = 0; ishape < triangleVertices[j].length / 3; ishape++) {
                        theOffSet[0] = triangleVertices[j][ishape * 3];
                        theOffSet[1] = triangleVertices[j][ishape * 3 + 1];
                        theOffSet[2] = triangleVertices[j][ishape * 3 + 2];
                        this.gl.uniform3fv(this.shaderProgramTwoDShapes.offset, theOffSet);
                        if (scaleImage) {
                            this.gl.uniform1f(this.shaderProgramTwoDShapes.size, primitiveSizes[j][ishape]);
                        } else {
                            this.gl.uniform1f(this.shaderProgramTwoDShapes.size, primitiveSizes[j][ishape] * this.zoom);
                        }

                        this.gl.vertexAttrib4f(this.shaderProgramTwoDShapes.vertexColourAttribute, triangleColours[j][ishape * 4], triangleColours[j][ishape * 4 + 1], triangleColours[j][ishape * 4 + 2], triangleColours[j][ishape * 4 + 3]);

                        if (this.ext) {
                            this.gl.drawElements(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0);
                        } else {
                            this.gl.drawElements(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_SHORT, 0);
                        }
                    }
                    if (typeof (this.gl, displayBuffers[idx].supplementary["vert_tri_2d"]) !== "undefined") {
                        this.setMatrixUniforms(this.shaderProgramTwoDShapes);
                    }
                }
            }

            this.gl.enableVertexAttribArray(this.shaderProgramTwoDShapes.vertexColourAttribute);

            this.gl.useProgram(this.shaderProgramLines);
            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] !== "LINE_LOOP" && bufferTypes[j] !== "LINE_STRIP") {
                    continue;
                }
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                this.gl.vertexAttribPointer(this.shaderProgramLines.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                this.gl.vertexAttribPointer(this.shaderProgramLines.vertexColourAttribute, triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);
                //this.gl.disableVertexAttribArray(2)
                if (bufferTypes[j] === "LINES") {
                    //console.log("Try to draw "+triangleVertexIndexBuffer[j].numItems+" lines, "+triangleColourBuffer[j].numItems+" colours, "+triangleVertexPositionBuffer[j].numItems+" vertices.");
                    if (this.ext) {
                        this.gl.drawElements(this.gl.LINES, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_INT, 0);
                    } else {
                        this.gl.drawElements(this.gl.LINES, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_SHORT, 0);
                    }
                }
                if (bufferTypes[j] === "LINE_STRIP") {
                    //console.log("Try to draw "+triangleVertexIndexBuffer[j].numItems+" lines, "+triangleColourBuffer[j].numItems+" colours, "+triangleVertexPositionBuffer[j].numItems+" vertices.");
                    if (this.ext) {
                        this.gl.drawElements(this.gl.LINE_STRIP, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_INT, 0);
                    } else {
                        this.gl.drawElements(this.gl.LINE_STRIP, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }

            this.gl.useProgram(this.shaderProgramThickLines);
            this.gl.uniform3fv(this.shaderProgramThickLines.screenZ, this.screenZ);
            this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexNormalAttribute);
            this.setMatrixUniforms(this.shaderProgramThickLines);
            this.gl.uniformMatrix4fv(this.shaderProgramThickLines.pMatrixUniform, false, this.pmvMatrix);

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] !== "LINES" && bufferTypes[j] !== "CIRCLES") {
                    continue;
                }
                // FIXME ? We assume all are the same size. Anything else is a little tricky for now.
                if (typeof (displayBuffers[idx].primitiveSizes) !== "undefined" && typeof (displayBuffers[idx].primitiveSizes[j]) !== "undefined" && typeof (displayBuffers[idx].primitiveSizes[j][0]) !== "undefined") {
                    this.gl.uniform1f(this.shaderProgramThickLines.pixelZoom, displayBuffers[idx].primitiveSizes[j][0] * 0.04 * this.zoom);
                } else {
                    this.gl.uniform1f(this.shaderProgramThickLines.pixelZoom, 1.0 * 0.04 * this.zoom);
                }
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexNormalBuffer[j]);
                this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexNormalAttribute, triangleVertexNormalBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                if(displayBuffers[idx].customColour&&displayBuffers[idx].customColour.length==4){
                    this.gl.disableVertexAttribArray(this.shaderProgramThickLines.vertexColourAttribute);
                    this.gl.vertexAttrib4f(this.shaderProgramThickLines.vertexColourAttribute, ...displayBuffers[idx].customColour)
                } else {
                    this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexColourAttribute);
                    this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexColourAttribute, triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                }
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);

                if (displayBuffers[idx].transformMatrix) {
                    this.drawTransformMatrixPMV(displayBuffers[idx].transformMatrix, displayBuffers[idx], this.shaderProgramThickLines, this.gl.TRIANGLES, j);
                } else if (displayBuffers[idx].transformMatrixInteractive) {
                    this.drawTransformMatrixInteractivePMV(displayBuffers[idx].transformMatrixInteractive, displayBuffers[idx].transformOriginInteractive, displayBuffers[idx], this.shaderProgramThickLines, this.gl.TRIANGLES, j);
                } else {
                    if (this.ext) {
                        this.drawMaxElementsUInt(this.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems);
                    } else {
                        this.gl.drawElements(this.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }
        }
    }

    drawTransparent(theMatrix) {
    }

    drawImagesAndText(invMat) {
    }

    clearTextPositionBuffers() {
        if(this.displayBuffers && this.displayBuffers[0])
            delete this.displayBuffers[0].textPositionBuffer;
    }

    drawTexturedShapes(invMat) {
        const texturedShapes = store.getState().glRef.texturedShapes
        const theShader = this.shaderProgramTextured;
        this.gl.useProgram(theShader);
        this.setMatrixUniforms(theShader);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        this.gl.enableVertexAttribArray(theShader.vertexPositionAttribute);
        this.gl.enableVertexAttribArray(theShader.vertexTextureAttribute);

        //this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 1.0, 0.3, 0.4, 1.0);
        //this.gl.vertexAttrib3f(theShader.vertexNormalAttribute, 0.0, 0.0, 1.0);

        texturedShapes.forEach(shape => {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, shape.vertexBuffer);
            this.gl.vertexAttribPointer(theShader.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, shape.texCoordBuffer);
            this.gl.vertexAttribPointer(theShader.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, shape.idxBuffer);
            this.gl.uniform1i(theShader.valueMap, 0);
            this.gl.uniform1i(theShader.colorMap, 1);
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, shape.image_texture);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, shape.color_ramp_texture);
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        })
        this.gl.activeTexture(this.gl.TEXTURE0);
    }

    drawTextLabels(up, right) {
        // Labels, angles, etc. should be instanced by texture coords, positions using contextBig

        // make sure we can render it even if it's not a power of 2
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTex);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        return

    }

    isWebGL2() {
        return this.WEBGL2;
    }

    drawDistancesAndLabels(up, right) {

        // Labels, angles, etc. instanced by texture coords, positions using contextBig

        this.gl.useProgram(this.shaderProgramTextInstanced);
        this.setMatrixUniforms(this.shaderProgramTextInstanced);

        if (this.atomLabelDepthMode) {
            //If we want to fog them
            this.gl.depthFunc(this.gl.LESS);
        } else {
            //If we want them to be on top
            this.gl.depthFunc(this.gl.ALWAYS);
            this.gl.uniform1f(this.shaderProgramTextInstanced.fog_start, 1000.0);
            this.gl.uniform1f(this.shaderProgramTextInstanced.fog_end, 1000.0);
        }

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        [this.measureTextCanvasTexture,this.labelsTextCanvasTexture].forEach((canvasTexture) => {
            canvasTexture.draw();
        })

        this.gl.depthFunc(this.gl.LESS);

    }

    drawCircles(up, right) {
        this.gl.useProgram(this.shaderProgramCircles);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.circleTex);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.uniform3fv(this.shaderProgramCircles.up, up);
        this.gl.uniform3fv(this.shaderProgramCircles.right, right);

        //TODO
        // Use the right coords and colours and not do this for clicked atoms!
        // Big texture
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTex);
    }

    getFrontAndBackPos(event: KeyboardEvent) : [number[], number[], number, number]  {
        const self = this;
        const x = this.gl_cursorPos[0];
        const y = this.canvas.height - this.gl_cursorPos[1];
        const invQuat = quat4.create();
        quat4Inverse(self.myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const ratio = 1.0 * self.gl.viewportWidth / self.gl.viewportHeight;
        const minX = (-24. * ratio * self.zoom);
        const maxX = (24. * ratio * self.zoom);
        const minY = (-24. * self.zoom);
        const maxY = (24. * self.zoom);
        const fracX = 1.0 * x / self.gl.viewportWidth;
        const fracY = 1.0 * (y) / self.gl.viewportHeight;
        const theX = minX + fracX * (maxX - minX);
        const theY = maxY - fracY * (maxY - minY);
        //let frontPos = vec3Create([theX,theY,-1000.0]);
        //let backPos  = vec3Create([theX,theY,1000.0]);
        //MN Changed to improve picking
        const frontPos = vec3Create([theX, theY, -this.gl_clipPlane0[3] - this.fogClipOffset]);
        const backPos = vec3Create([theX, theY, this.gl_clipPlane1[3] - this.fogClipOffset]);
        vec3.transformMat4(frontPos, frontPos, theMatrix);
        vec3.transformMat4(backPos, backPos, theMatrix);
        vec3.subtract(frontPos, frontPos, self.origin);
        vec3.subtract(backPos, backPos, self.origin);
        return [frontPos, backPos, x, y];
    }

    doRightClick(event, self) {
        const displayBuffers = store.getState().glRef.displayBuffers
        if (self.activeMolecule === null) {

            const [minidx,minj,mindist,minsym,minx,miny,minz] = self.getAtomFomMouseXY(event,self);
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

    doClick(event, self) {
        const displayBuffers = store.getState().glRef.displayBuffers
        if (this.activeMolecule == null) {
            document.body.click()
        }

        if (!self.mouseMoved) {
            let updateLabels = false
            //console.log(npass+" "+npass0+" "+npass1+" "+ntest);
            const [minidx,minj,mindist,minsym,minx,miny,minz] = self.getAtomFomMouseXY(event,self);
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
                        isResidueSelection: self.keysDown['residue_selection']
                    }
                });
                document.dispatchEvent(atomClicked);
                if (this.draggableMolecule != null && this.draggableMolecule.representations.length > 0 && this.draggableMolecule.buffersInclude(displayBuffers[minidx])) {
                    this.currentlyDraggedAtom = { atom: displayBuffers[minidx].atoms[minj], buffer: displayBuffers[minidx] }
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

    updateLabels(){
        const displayBuffers = store.getState().glRef.displayBuffers
        let newBuffers = []
        const self = this;
        self.clearMeasureCylinderBuffers()
        const atomPairs = []
        self.measuredAtoms.forEach(bump => {
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
                    self.measureTextCanvasTexture.addBigTextureTextImage({font:self.glTextFont,text:linesize,x:mid[0],y:mid[1],z:mid[2]})
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
                        self.measureTextCanvasTexture.addBigTextureTextImage({font:self.glTextFont,text:angle,x:second.x+v12plusv23[0],y:second.y+v12plusv23[1],z:second.z+v12plusv23[2]})

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
                            self.measureTextCanvasTexture.addBigTextureTextImage({font:self.glTextFont,text:dihedral,x:mid23[0]+dihedralOffset[0],y:mid23[1]+dihedralOffset[1],z:mid23[2]+dihedralOffset[2]})
                        }
                    }

                }
            }
        })
        const atomColours = {}
        const colour = [1.0,0.0,0.0,1.0]
        atomPairs.forEach(atom => { atomColours[`${atom[0].serial}`] = colour; atomColours[`${atom[1].serial}`] = colour })
        const objects = [
            gemmiAtomPairsToCylindersInfo(atomPairs, 0.07, atomColours, false, 0.01, 1000.)
        ]
        objects.filter(object => typeof object !== 'undefined' && object !== null).forEach(object => {
            const a = appendOtherData(object, true);
            newBuffers = [...newBuffers,...a]
            buildBuffers(a)
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
                self.measureTextCanvasTexture.addBigTextureTextImage({font:self.glTextFont,text:atom.label,x:atom.x,y:atom.y,z:atom.z})
            })
        })

        self.measureTextCanvasTexture.recreateBigTextureBuffers();
        store.dispatch(setDisplayBuffers([...displayBuffers,...newBuffers]))
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
        const displayBuffers = store.getState().glRef.displayBuffers
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

        let mindist = 100000.;
        let minx = 100000.;
        let miny = 100000.;
        let minz = 100000.;
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

    doHover(event, self) {
        const displayBuffers = store.getState().glRef.displayBuffers
        if (this.props.onAtomHovered) {
            const [minidx,minj,mindist,minsym,minx,miny,minz] = self.getAtomFomMouseXY(event,self);
            if (minidx > -1) {
                this.props.onAtomHovered({ atom: displayBuffers[minidx].atoms[minj], buffer: displayBuffers[minidx] });
            }
            else {
                this.props.onAtomHovered(null)
            }
            self.drawScene();
        }
    }

    doWheel(event) {
        const self = this
        let factor;
        if (event.deltaY > 0) {
            factor = 1. + 1 / (50.0 - self.props.zoomWheelSensitivityFactor * 5);
        } else {
            factor = 1. - 1 / (50.0 - self.props.zoomWheelSensitivityFactor * 5);
        }

        if (self.keysDown['set_map_contour']) {
            this.setWheelContour(factor, true)
        } else {
            let newZoom = this.zoom * factor;
            if (newZoom < .01) {
                newZoom = 0.01;
            }
            this.setZoom(newZoom, true)
        }

    }

    drawLineMeasures(invMat) {
        if(this.measurePointsArray.length<1) return;

        this.gl.depthFunc(this.gl.ALWAYS);
        //Begin copy/paste from crosshairs
        const axesOffset = vec3.create();
        vec3.set(axesOffset, 0, 0, 0);
        const xyzOff = this.origin.map((coord, iCoord) => -coord + this.zoom * axesOffset[iCoord])

        this.gl.useProgram(this.shaderProgramThickLines);
        this.setMatrixUniforms(this.shaderProgramThickLines);
        const pmvMatrix = mat4.create();
        const pMatrix = mat4.create();
        const ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;

        const mat_width = 48;
        const mat_height = 48;
        if(this.renderToTexture){
            if(this.gl.viewportWidth > this.gl.viewportHeight){
                const ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;
                mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24 * ratio, 24 * ratio, 0.1, 1000.0);
            } else {
                mat4.ortho(pMatrix, -24, 24, -24, 24, 0.1, 1000.0);
            }
        } else {
            mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24, 24, 0.1, 1000.0);
        }

        mat4.scale(pMatrix, pMatrix, [1. / this.zoom, 1. / this.zoom, 1.0]);
        mat4.multiply(pmvMatrix, pMatrix, this.mvMatrix);

        this.gl.uniformMatrix4fv(this.shaderProgramThickLines.pMatrixUniform, false, pmvMatrix);
        this.gl.uniform3fv(this.shaderProgramThickLines.screenZ, this.screenZ);
        this.gl.uniform1f(this.shaderProgramThickLines.pixelZoom, 0.04 * this.zoom);

        if (typeof (this.axesPositionBuffer) === "undefined") {
            this.axesPositionBuffer = this.gl.createBuffer();
            this.axesColourBuffer = this.gl.createBuffer();
            this.axesIndexBuffer = this.gl.createBuffer();
            this.axesNormalBuffer = this.gl.createBuffer();
            this.axesTextNormalBuffer = this.gl.createBuffer();
            this.axesTextColourBuffer = this.gl.createBuffer();
            this.axesTextPositionBuffer = this.gl.createBuffer();
            this.axesTextTexCoordBuffer = this.gl.createBuffer();
            this.axesTextIndexesBuffer = this.gl.createBuffer();
        }
        const renderArrays = {
            axesVertices: [],
            axesColours: [],
            axesIdx: []
        }
        const addSegment = (renderArrays, point1, point2, colour1, colour2) => {
            renderArrays.axesIdx.push(renderArrays.axesVertices.length)
            renderArrays.axesVertices = renderArrays.axesVertices.concat(point1)
            renderArrays.axesIdx.push(renderArrays.axesVertices.length)
            renderArrays.axesVertices = renderArrays.axesVertices.concat(point2)
            renderArrays.axesColours = renderArrays.axesColours.concat([...colour1, ...colour2])
        }

        let hairColour = [0., 0., 0., 1.];
        const y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;
        if (y < 0.5) {
            hairColour = [1., 1., 1., 1.];
        }

        const lineStart = vec3.create();
        const lineEnd = vec3.create();

        let lastPoint = null;

        const addLine = (x1,y1,x2,y2) => {
            vec3.set(lineStart, x1 * this.zoom * ratio, y1 * this.zoom, 0.0);
            vec3.transformMat4(lineStart, lineStart, invMat);
            vec3.set(lineEnd,   x2 * this.zoom * ratio, y2 * this.zoom, 0.0);
            vec3.transformMat4(lineEnd, lineEnd, invMat);
            addSegment(renderArrays,
                xyzOff.map((coord, iCoord) => coord + lineStart[iCoord]),
                xyzOff.map((coord, iCoord) => coord + lineEnd[iCoord]),
                hairColour, hairColour
            )
        }

        this.measurePointsArray.forEach(point => {

            const x2 =  point.x;
            const y2 = -point.y;

            addLine(x2-.3/ratio,  y2-.3, x2+.3/ratio, y2-.3);
            addLine(x2-.3/ratio,  y2+.3, x2+.3/ratio, y2+.3);
            addLine(x2-.25/ratio, y2-.3, x2-.25/ratio, y2+.3);
            addLine(x2+.25/ratio, y2-.3, x2+.25/ratio, y2+.3);

            if(lastPoint){
                const x1 =  lastPoint.x;
                const y1 = -lastPoint.y;
                addLine(x1,y1,x2,y2);
            }
            lastPoint = point;
        })

        const size = 1.5;
        const thickLines = linesToThickLines(renderArrays.axesVertices, renderArrays.axesColours, size);
        const axesNormals = thickLines["normals"];
        const axesVertices_new = thickLines["vertices"];
        const axesColours_new = thickLines["colours"];
        const axesIndexs_new = thickLines["indices"];

        //console.log("thickLines",thickLines);
        this.gl.depthFunc(this.gl.ALWAYS);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexNormalAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexPositionAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexColourAttribute);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axesNormals), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesPositionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axesVertices_new), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesColourBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axesColours_new), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexColourAttribute, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.axesIndexBuffer);
        if (this.ext) {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(axesIndexs_new), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, axesIndexs_new.length, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(axesIndexs_new), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, axesIndexs_new.length, this.gl.UNSIGNED_SHORT, 0);
        }

        this.gl.depthFunc(this.gl.LESS)

    }

    drawCrosshairs(invMat,ratioMult=1.0) {

        this.gl.depthFunc(this.gl.ALWAYS);
        this.gl.useProgram(this.shaderProgramTextBackground);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_end, 1000.0);
        const axesOffset = vec3.create();
        vec3.set(axesOffset, 0, 0, 0);
        const xyzOff = this.origin.map((coord, iCoord) => -coord + this.zoom * axesOffset[iCoord])
        this.gl.useProgram(this.shaderProgramThickLines);
        this.setMatrixUniforms(this.shaderProgramThickLines);
        const pmvMatrix = mat4.create();
        const pMatrix = mat4.create();
        const ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight * ratioMult
        if(this.renderToTexture){
            if(this.gl.viewportWidth > this.gl.viewportHeight){
                const ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;
                mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24 * ratio, 24 * ratio, 0.1, 1000.0);
            } else {
                mat4.ortho(pMatrix, -24, 24, -24, 24, 0.1, 1000.0);
            }
        } else {
            mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24, 24, 0.1, 1000.0);
        }
        mat4.scale(pMatrix, pMatrix, [1. / this.zoom, 1. / this.zoom, 1.0]);
        mat4.multiply(pmvMatrix, pMatrix, this.mvMatrix);

        this.gl.uniformMatrix4fv(this.shaderProgramThickLines.pMatrixUniform, false, pmvMatrix);
        this.gl.uniform3fv(this.shaderProgramThickLines.screenZ, this.screenZ);
        this.gl.uniform1f(this.shaderProgramThickLines.pixelZoom, 0.04 * this.zoom);

        if (typeof (this.axesPositionBuffer) === "undefined") {
            this.axesPositionBuffer = this.gl.createBuffer();
            this.axesColourBuffer = this.gl.createBuffer();
            this.axesIndexBuffer = this.gl.createBuffer();
            this.axesNormalBuffer = this.gl.createBuffer();
            this.axesTextNormalBuffer = this.gl.createBuffer();
            this.axesTextColourBuffer = this.gl.createBuffer();
            this.axesTextPositionBuffer = this.gl.createBuffer();
            this.axesTextTexCoordBuffer = this.gl.createBuffer();
            this.axesTextIndexesBuffer = this.gl.createBuffer();
        }
        const renderArrays = {
            axesVertices: [],
            axesColours: [],
            axesIdx: []
        }
        const addSegment = (renderArrays, point1, point2, colour1, colour2) => {
            renderArrays.axesIdx.push(renderArrays.axesVertices.length)
            renderArrays.axesVertices = renderArrays.axesVertices.concat(point1)
            renderArrays.axesIdx.push(renderArrays.axesVertices.length)
            renderArrays.axesVertices = renderArrays.axesVertices.concat(point2)
            renderArrays.axesColours = renderArrays.axesColours.concat([...colour1, ...colour2])
        }

        let hairColour = [0., 0., 0., 0.5];
        const y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;
        if (y < 0.5) {
            hairColour = [1., 1., 1., 0.5];
        }

        // Actual axes
        const cross_hair_scale_factor = 0.3;
        const horizontalHairStart = vec3.create();
        vec3.set(horizontalHairStart, -cross_hair_scale_factor * this.zoom, 0.0, 0.0);
        vec3.transformMat4(horizontalHairStart, horizontalHairStart, invMat);
        const horizontalHairEnd = vec3.create();
        vec3.set(horizontalHairEnd, cross_hair_scale_factor * this.zoom, 0.0, 0.0);
        vec3.transformMat4(horizontalHairEnd, horizontalHairEnd, invMat);

        addSegment(renderArrays,
            xyzOff.map((coord, iCoord) => coord + horizontalHairStart[iCoord]),
            xyzOff.map((coord, iCoord) => coord + horizontalHairEnd[iCoord]),
            hairColour, hairColour
        )

        const verticalHairStart = vec3.create();
        vec3.set(verticalHairStart, 0.0, -cross_hair_scale_factor * this.zoom, 0.0);
        vec3.transformMat4(verticalHairStart, verticalHairStart, invMat);
        const verticalHairEnd = vec3.create();
        vec3.set(verticalHairEnd, 0.0, cross_hair_scale_factor * this.zoom, 0.0);
        vec3.transformMat4(verticalHairEnd, verticalHairEnd, invMat);

        addSegment(renderArrays,
            xyzOff.map((coord, iCoord) => coord + verticalHairStart[iCoord]),
            xyzOff.map((coord, iCoord) => coord + verticalHairEnd[iCoord]),
            hairColour, hairColour
        )

        const size = 1.0;
        const thickLines = linesToThickLines(renderArrays.axesVertices, renderArrays.axesColours, size);
        const axesNormals = thickLines["normals"];
        const axesVertices_new = thickLines["vertices"];
        const axesColours_new = thickLines["colours"];
        const axesIndexs_new = thickLines["indices"];

        //console.log("thickLines",thickLines);
        this.gl.depthFunc(this.gl.ALWAYS);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        this.gl.uniform1f(this.shaderProgramThickLines.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramThickLines.fog_end, 1000.0);
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexNormalAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexPositionAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexColourAttribute);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axesNormals), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesPositionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axesVertices_new), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesColourBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axesColours_new), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexColourAttribute, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.axesIndexBuffer);
        if (this.ext) {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(axesIndexs_new), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, axesIndexs_new.length, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(axesIndexs_new), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, axesIndexs_new.length, this.gl.UNSIGNED_SHORT, 0);
        }

        this.gl.depthFunc(this.gl.LESS)

    }

    drawMouseTrack() {

        const c = this.canvasRef.current;
        const offset = getOffsetRect(c);

        const ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;
        const frac_x = (getDeviceScale()*(this.init_x-offset.left)/this.gl.viewportWidth-0.5)  * 48.;
        const frac_y = -(getDeviceScale()*(this.init_y-offset.top)/this.gl.viewportHeight-0.5) * 48;

        this.gl.depthFunc(this.gl.ALWAYS);

        this.gl.useProgram(this.shaderProgram);
        this.setMatrixUniforms(this.shaderProgram);
        this.gl.uniform1f(this.shaderProgram.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgram.fog_end, 1000.0);
        this.gl.uniform4fv(this.shaderProgram.clipPlane0, [0, 0, -1, 1000]);
        this.gl.uniform4fv(this.shaderProgram.clipPlane1, [0, 0, 1, 1000]);
        const pmvMatrix = mat4.create();
        const tempMVMatrix = mat4.create();
        mat4.set(tempMVMatrix,
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, -50.0, 1.0,
        )
        const tempInvMVMatrix = mat4.create();
        mat4.set(tempInvMVMatrix,
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
        )
        const pMatrix = mat4.create();
        mat4.ortho(pMatrix, -24, 24, -24, 24, 0.1, 1000.0);
        mat4.multiply(pmvMatrix, pMatrix, tempMVMatrix); // Lines
        this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, pmvMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, tempInvMVMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgram.mvInvMatrixUniform, false, tempInvMVMatrix);

        this.mouseTrackPoints.push([frac_x,frac_y,performance.now()]);
        if(this.mouseTrackPoints.length>120) this.mouseTrackPoints.shift();

        let mouseTrackVertices = [];
        let mouseTrackColours = [];
        let mouseTrackNormals = [];
        let mouseTrackIndexs = [];

        let i = 0;
        let currentIdx = 0;
        this.mouseTrackPoints.forEach(point => {
            const this_x = point[0];
            const this_y = point[1];
            const timeStamp = point[2];
            const ifrac = i / this.mouseTrackPoints.length;
            if((performance.now()-timeStamp)<200){
            mouseTrackVertices = mouseTrackVertices.concat([
                this_x-ifrac/ratio, this_y-ifrac, 0.0,
                this_x+ifrac/ratio, this_y-ifrac, 0.0,
                this_x+ifrac/ratio, this_y+ifrac, 0.0,
                this_x-ifrac/ratio, this_y+ifrac, 0.0,
            ]);
            mouseTrackColours = mouseTrackColours.concat([
                1, 0, 0, 1,
                1, 0, 0, 1,
                1, 0, 0, 1,
                1, 0, 0, 1,
            ]);
            mouseTrackNormals = mouseTrackNormals.concat([
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
            ]);
            mouseTrackIndexs = mouseTrackIndexs.concat([
               currentIdx, currentIdx+1, currentIdx+2,
               currentIdx, currentIdx+2, currentIdx+3,
            ])
               currentIdx += 4;
            }
            i += 1;
        })

        this.gl.depthFunc(this.gl.ALWAYS);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        this.gl.enableVertexAttribArray(this.shaderProgram.vertexNormalAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgram.vertexColourAttribute);

        if (typeof (this.mouseTrackPositionBuffer) === "undefined") {
            this.mouseTrackPositionBuffer = this.gl.createBuffer();
            this.mouseTrackColourBuffer = this.gl.createBuffer();
            this.mouseTrackIndexBuffer = this.gl.createBuffer();
            this.mouseTrackNormalBuffer = this.gl.createBuffer();
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mouseTrackNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(mouseTrackNormals), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgram.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mouseTrackPositionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(mouseTrackVertices), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mouseTrackColourBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(mouseTrackColours), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgram.vertexColourAttribute, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.mouseTrackIndexBuffer);
        if (this.ext) {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mouseTrackIndexs), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, mouseTrackIndexs.length, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mouseTrackIndexs), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, mouseTrackIndexs.length, this.gl.UNSIGNED_SHORT, 0);
        }
        this.gl.depthFunc(this.gl.LESS)
    }

    drawFPSMeter() {

        this.gl.depthFunc(this.gl.ALWAYS);

        this.gl.useProgram(this.shaderProgramThickLines);
        this.setMatrixUniforms(this.shaderProgramThickLines);
        this.gl.uniform1f(this.shaderProgramThickLines.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramThickLines.fog_end, 1000.0);
        this.gl.uniform4fv(this.shaderProgramThickLines.clipPlane0, [0, 0, -1, 1000]);
        this.gl.uniform4fv(this.shaderProgramThickLines.clipPlane1, [0, 0, 1, 1000]);
        const pmvMatrix = mat4.create();
        const tempMVMatrix = mat4.create();
        mat4.set(tempMVMatrix,
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, -50.0, 1.0,
        )
        const pMatrix = mat4.create();
        mat4.ortho(pMatrix, -24, 24, -24, 24, 0.1, 1000.0);
        mat4.multiply(pmvMatrix, pMatrix, tempMVMatrix); // Lines
        this.gl.uniformMatrix4fv(this.shaderProgramThickLines.pMatrixUniform, false, pmvMatrix);
        this.gl.uniform1f(this.shaderProgramThickLines.pixelZoom, 0.04);

        if (typeof (this.hitchometerPositionBuffer) === "undefined") {
            this.hitchometerPositionBuffer = this.gl.createBuffer();
            this.hitchometerColourBuffer = this.gl.createBuffer();
            this.hitchometerIndexBuffer = this.gl.createBuffer();
            this.hitchometerNormalBuffer = this.gl.createBuffer();
        }

        const size = 1.0;

        const screenZ = vec3.create()
        vec3.set(screenZ,0,0,1)

        this.gl.uniform3fv(this.shaderProgramThickLines.screenZ, screenZ);

        const hitchometerColours = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
        const hitchometerVertices = [
            -22.9, -11.4, 0.0,
            -12.7, -11.4, 0.0,
            -22.9, -21.6, 0.0,
            -12.7, -21.6, 0.0,
            -22.9, -11.4, 0.0,
            -22.9, -21.6, 0.0,
            -12.7, -11.4, 0.0,
            -12.7, -21.6, 0.0,

        ];

        for(let i=0; i<this.mspfArray.length;i++){
            let mspf = this.mspfArray[i];
            if(mspf>200.0) mspf = 200.0;

            const l = mspf / 200.0 * 10.0;
            const x = -22.8 + i/20.;
            const y1 = -21.5;
            const y2 = -21.5 + l;
            const z = 0.0;
            hitchometerVertices.push(x,y1,z,x,y2,z);
            if(mspf<17){
                hitchometerColours.push(0.2, 0.8, 0.2, 1.0);
                hitchometerColours.push(0.2, 0.8, 0.2, 1.0);
            } else if(mspf<24) {
                hitchometerColours.push(0.7, 0.7, 0.3, 1.0);
                hitchometerColours.push(0.7, 0.7, 0.3, 1.0);
            } else if(mspf<50) {
                hitchometerColours.push(0.8, 0.4, 0.3, 1.0);
                hitchometerColours.push(0.8, 0.4, 0.3, 1.0);
            } else {
                hitchometerColours.push(0.8, 0.2, 0.2, 1.0);
                hitchometerColours.push(0.8, 0.2, 0.2, 1.0);
            }
        }

        const thickLines = linesToThickLines(hitchometerVertices, hitchometerColours, size);
        const hitchometerNormals = thickLines["normals"];
        const hitchometerVertices_new = thickLines["vertices"];
        const hitchometerColours_new = thickLines["colours"];
        const hitchometerIndexs_new = thickLines["indices"];

        this.gl.depthFunc(this.gl.ALWAYS);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexNormalAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexPositionAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexColourAttribute);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.hitchometerNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(hitchometerNormals), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.hitchometerPositionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(hitchometerVertices_new), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.hitchometerColourBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(hitchometerColours_new), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexColourAttribute, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.hitchometerIndexBuffer);
        if (this.ext) {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(hitchometerIndexs_new), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, hitchometerIndexs_new.length, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(hitchometerIndexs_new), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, hitchometerIndexs_new.length, this.gl.UNSIGNED_SHORT, 0);
        }

        this.gl.depthFunc(this.gl.LESS)
    }

    drawTextOverlays(invMat,ratioMult=1.0,font_scale=1.0) {

        const ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight * ratioMult

        let textColour = "black";
        const y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;
        if (y < 0.5) {
            textColour = "white";
        }

        this.measureText2DCanvasTexture.clearBigTexture()

        const drawString = (s, xpos, ypos, zpos, font, threeD) => {
            if(font) this.textCtx.font = font;
            const axesOffset = vec3.create();
            vec3.set(axesOffset, xpos,ypos, 0);
            vec3.transformMat4(axesOffset, axesOffset, invMat);

            const xyzOff = this.origin.map((coord, iCoord) => -coord + this.zoom * axesOffset[iCoord]);
            const base_x = xyzOff[0];
            const base_y = xyzOff[1];
            const base_z = xyzOff[2];

            this.measureText2DCanvasTexture.addBigTextureTextImage({font:font,text:s,x:base_x,y:base_y,z:base_z})

        }

        this.textLegends.forEach(label => {
                const xpos = label.x * 48.0 -24.*ratio;
                const ypos = label.y * 48.0 -24.;
                drawString(label.text,xpos,ypos, 0.0, label.font, false);
        });

        let fontMult = 1.0
        if(window.devicePixelRatio){
            fontMult *= window.devicePixelRatio
        }
        if(this.showFPS) drawString(this.fpsText, -23.5*ratio, -23.5, 0.0, (fontMult * 20 * font_scale).toFixed(0)+"px helvetica", false);

        let lastPoint = null;
        let lastLastPoint = null;

        if(!this.doMultiView&&!this.doThreeWayView&&!this.doCrossEyedStereo&&!this.doSideBySideStereo){

            this.measurePointsArray.forEach(point => {
                if(lastPoint){
                    let fnSize = 24
                    if(window.devicePixelRatio){
                        fnSize *= window.devicePixelRatio
                    }
                    const fnSizePx = fnSize + "px"
                    const dist = Math.sqrt(this.zoom* this.gl.viewportWidth / this.gl.viewportHeight*(point.x-lastPoint.x) * this.zoom* this.gl.viewportWidth / this.gl.viewportHeight*(point.x-lastPoint.x) + this.zoom*(point.y-lastPoint.y) * this.zoom*(point.y-lastPoint.y));
                    const mid_point = {x:(point.x+lastPoint.x)/2,y:(point.y+lastPoint.y)/2}
                    drawString(dist.toFixed(1)+"Å", mid_point.x*ratio, -mid_point.y, 0.0, fnSizePx+" helvetica", false);
                    if(lastLastPoint){
                        const l1 = {x:(point.x-lastPoint.x),y:(point.y-lastPoint.y)}
                        l1.x /= dist / this.zoom;
                        l1.y /= dist / this.zoom;
                        const dist2 = Math.sqrt(this.zoom* this.gl.viewportWidth / this.gl.viewportHeight*(lastLastPoint.x-lastPoint.x) * this.zoom* this.gl.viewportWidth / this.gl.viewportHeight*(lastLastPoint.x-lastPoint.x) + this.zoom*(lastLastPoint.y-lastPoint.y) * this.zoom*(lastLastPoint.y-lastPoint.y));
                        const l2 = {x:(lastLastPoint.x-lastPoint.x),y:(lastLastPoint.y-lastPoint.y)}
                        l2.x /= dist2 / this.zoom;
                        l2.y /= dist2 / this.zoom;
                        const l1_dot_l2 = this.gl.viewportWidth / this.gl.viewportHeight*this.gl.viewportWidth / this.gl.viewportHeight*l1.x*l2.x + l1.y*l2.y;
                        const angle = Math.acos(l1_dot_l2) / Math.PI * 180.;
                        const angle_t = angle.toFixed(1)+"º";
                        drawString(angle_t, lastPoint.x*ratio, -lastPoint.y, 0.0, fnSizePx+" helvetica", false);
                    }
                    lastLastPoint = lastPoint;
                }
                lastPoint = point;
            })
        }

        //Do we ever have any newTextLabels?
        //Draw Hbond, etc. text.
        this.newTextLabels.forEach(tlabel => {
            tlabel.forEach(label => {
                drawString(label.text, label.x,label.y,label.z, "30px helvetica", true);
            })
        })

        this.measureText2DCanvasTexture.recreateBigTextureBuffers();

        this.gl.useProgram(this.shaderProgramTextInstanced);
        this.setMatrixUniforms(this.shaderProgramTextInstanced);

        //If we want them to be on top
        this.gl.depthFunc(this.gl.ALWAYS);
        this.gl.uniform1f(this.shaderProgramTextInstanced.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramTextInstanced.fog_end, 1000.0);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);


        this.measureText2DCanvasTexture.draw();

        this.gl.depthFunc(this.gl.LESS)
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

        const measure_click_tol = 1.0;

        const xy = self.getMouseXYGL(evt,self.canvas);
        const dist_du_sq = (self.measureDownPos.x-xy.x) * (self.measureDownPos.x-xy.x) + (self.measureDownPos.y-xy.y) * (self.measureDownPos.y-xy.y)

        if(dist_du_sq>2&&!self.measureHit)
            return;

        let i =0;
        const is_close = self.measurePointsArray.some(point => {
            const dist_sq = (point.x-xy.x) * (point.x-xy.x) + (point.y-xy.y) * (point.y-xy.y)
            if(dist_sq<measure_click_tol){
                self.measureHit = point;
                return true;
            }
            i++;
        })

        if(!is_close&&!evt.altKey)
            self.measurePointsArray.push(xy);

        if(evt.altKey&&is_close){
            const index = self.measurePointsArray.indexOf(self.measureHit);
            if (index > -1) {
                self.measurePointsArray.splice(index, 1);
            }
        }

        self.measureHit = null;
        self.measureButton = -1;
        this.drawScene();

    }

    doMouseDownMeasure(evt, self) {

        if(this.doThreeWayView||this.doCrossEyedStereo||this.doSideBySideStereo){
            return
        }

        const measure_click_tol = 1.0;

        const xy = self.getMouseXYGL(evt,self.canvas);
        let i = 0;
        self.measureHit = null;
        const is_close = self.measurePointsArray.some(point => {
            const dist_sq = (point.x-xy.x) * (point.x-xy.x) + (point.y-xy.y) * (point.y-xy.y);
            if(dist_sq<measure_click_tol){
                self.measureHit = point;
                return true;
            }
            i++;
        })

        self.measureButton = evt.button;
        self.measureDownPos.x = xy.x;
        self.measureDownPos.y = xy.y;

    }

    doMouseMoveMeasure(evt, self) {
        if(self.measureButton>-1&&self.measureHit){
            const xy = self.getMouseXYGL(evt,self.canvas);
            self.measureHit.x = xy.x;
            self.measureHit.y = xy.y;
            this.drawScene();
        }
    }

    doMouseUp(event, self) {
        const displayBuffers = store.getState().glRef.displayBuffers
        const event_x = event.pageX;
        const event_y = event.pageY;
        self.init_y = event.pageY;
        this.currentlyDraggedAtom = null
        if (self.keysDown['center_atom'] || event.which===2) {
            if(Math.abs(event_x-self.mouseDown_x)<5 && Math.abs(event_y-self.mouseDown_y)<5){
                if(displayBuffers.length>0){
                    const [minidx,minj,mindist,minsym,minx,miny,minz] = self.getAtomFomMouseXY(event,self);
                    if(displayBuffers[minidx] && displayBuffers[minidx].atoms) {
                        const atx = displayBuffers[minidx].atoms[minj].x;
                        const aty = displayBuffers[minidx].atoms[minj].y;
                        const atz = displayBuffers[minidx].atoms[minj].z;
                        if(minsym>-1){
                            //self.setOriginAnimated([-minx, -miny, -minz], true);
                            self.props.onOriginChanged([-minx, -miny, -minz])
                        } else {
                            //self.setOriginAnimated([-atx, -aty, -atz], true);
                            self.props.onOriginChanged([-atx, -aty, -atz])
                        }
                    }
                }
            } else if (this.reContourMapOnlyOnMouseUp) {
                this.handleOriginUpdated(true)
            }
        } else if (event.altKey && event.shiftKey && this.reContourMapOnlyOnMouseUp) {
            this.handleOriginUpdated(true)
        }
        self.mouseDown = false;
        self.doHover(event,self);
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
        const goToAtomEvent = new CustomEvent("goToAtomMiddleClick");
        document.dispatchEvent(goToAtomEvent);
    }

    doDoubleClick(event, self) {
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
        const activeMoleculeMotion = (this.activeMolecule != null) && (this.activeMolecule.representations.length > 0) && !self.keysDown['residue_camera_wiggle'];

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
        if(this.trackMouse)
            requestAnimationFrame(self.mouseMoveAnimateTrack.bind(self,true,20))

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

            const c = this.canvasRef.current;
            const offset = getOffsetRect(c);

            x -= offset.left;
            y -= offset.top;
            x *= getDeviceScale();
            y *= getDeviceScale();

            this.gl_cursorPos[0] = x;
            this.gl_cursorPos[1] = this.canvas.height - y;
            this.props.cursorPositionChanged(x/getDeviceScale(),y/getDeviceScale()) //I am updating this in real window coords
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

        const moveFactor = getDeviceScale() * 400. / this.canvas.height * self.moveFactor / self.props.mouseSensitivityFactor;

        if ((event.altKey && event.shiftKey) || (self.mouseDownButton === 1)) {
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
                self.setOrigin(newOrigin, false, !this.reContourMapOnlyOnMouseUp)
            } else {
                const newOrigin = this.activeMolecule.displayObjectsTransformation.origin.map((coord, coordIndex) => {
                    return coord + (self.zoom * xshift[coordIndex] / 8.) - (self.zoom * yshift[coordIndex] / 8.)
                })
                const newOriginSet : [number,number,number] = [ newOrigin[0], newOrigin[1], newOrigin[2]];
                this.activeMolecule.displayObjectsTransformation.origin = newOriginSet;
                if (!this.activeMolecule.displayObjectsTransformation.quat) {
                    this.activeMolecule.displayObjectsTransformation.quat = quat4.create();
                    quat4.set(this.activeMolecule.displayObjectsTransformation.quat, 0, 0, 0, -1);
                }
                const theMatrix = quatToMat4(this.activeMolecule.displayObjectsTransformation.quat);
                theMatrix[12] = this.activeMolecule.displayObjectsTransformation.origin[0];
                theMatrix[13] = this.activeMolecule.displayObjectsTransformation.origin[1];
                theMatrix[14] = this.activeMolecule.displayObjectsTransformation.origin[2];
                for (const representation of this.activeMolecule.representations) {
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
            const factor = 1. - self.dy / 50.;
            let newZoom = self.zoom * factor;
            if (newZoom < .01) {
                newZoom = 0.01;
            }
            self.setZoom(newZoom)
            self.drawScene();
            return;
        }

        if (event.shiftKey) {

            const c = this.canvasRef.current;
            const offset = getOffsetRect(c);
            const frac_x = 2.0*(getDeviceScale()*(event.pageX-offset.left)/this.gl.viewportWidth-0.5);
            const frac_y = -2.0*(getDeviceScale()*(event.pageY-offset.top)/this.gl.viewportHeight-0.5);
            const zQ = createZQuatFromDX(frac_x*self.dy+frac_y*self.dx);
            quat4.multiply(self.myQuat, self.myQuat, zQ);

        } else if (event.buttons === 1) {

            const rot_x_axis = vec3.create()
            const rot_y_axis = vec3.create()
            vec3.set(rot_x_axis, 1.0, 0.0, 0.0);
            vec3.set(rot_y_axis, 0.0, 1.0, 0.0);

            if(this.doThreeWayView&&this.threeWayViewports.length>0){
                const quats = this.threeWayQuats
                const viewports = this.threeWayViewports
                const mVPQ = this.getThreeWayMatrixAndViewPort(this.gl_cursorPos[0],this.gl_cursorPos[1],quats,viewports)
                if(mVPQ.quat) {
                    const theRotMatrix = quatToMat4(mVPQ.quat);
                    mat4.invert(theRotMatrix,theRotMatrix)
                    vec3.transformMat4(rot_x_axis, rot_x_axis, theRotMatrix);
                    vec3.transformMat4(rot_y_axis, rot_y_axis, theRotMatrix);
                }
            }

            const xQ = createQuatFromAngle(-self.dy,rot_x_axis);
            const yQ = createQuatFromAngle(-self.dx,rot_y_axis);
            quat4.multiply(xQ, xQ, yQ);

            if (this.currentlyDraggedAtom) {

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

                const newOrigin = this.draggableMolecule.displayObjectsTransformation.origin.map((coord, coordIndex) => {
                    return coord + (self.zoom * xshift[coordIndex] / 8.) - (self.zoom * yshift[coordIndex] / 8.)
                })
                const newOriginSet : [number,number,number] = [ newOrigin[0], newOrigin[1], newOrigin[2]];
                this.draggableMolecule.displayObjectsTransformation.origin = newOriginSet;
                if (!this.draggableMolecule.displayObjectsTransformation.quat) {
                    this.draggableMolecule.displayObjectsTransformation.quat = quat4.create();
                    quat4.set(this.draggableMolecule.displayObjectsTransformation.quat, 0, 0, 0, -1);
                }

                // ###############

                const draggedAtomEvent: moorhen.AtomDraggedEvent = new CustomEvent("atomDragged", { detail: this.currentlyDraggedAtom });
                document.dispatchEvent(draggedAtomEvent);
                return

            } else if (!activeMoleculeMotion) {
                quat4.multiply(self.myQuat, self.myQuat, xQ);
            } else {
                // ###############
                //TODO - Move all this somewhere else ...

                const invQuat = quat4.create();
                quat4Inverse(this.myQuat, invQuat);
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

                if (!this.activeMolecule.displayObjectsTransformation.quat) {
                    this.activeMolecule.displayObjectsTransformation.quat = quat4.create();
                    quat4.set(this.activeMolecule.displayObjectsTransformation.quat, 0, 0, 0, -1);
                }
                quat4.multiply(this.activeMolecule.displayObjectsTransformation.quat, this.activeMolecule.displayObjectsTransformation.quat, xQp);
                const theMatrix = quatToMat4(this.activeMolecule.displayObjectsTransformation.quat);
                theMatrix[12] = this.activeMolecule.displayObjectsTransformation.origin[0];
                theMatrix[13] = this.activeMolecule.displayObjectsTransformation.origin[1];
                theMatrix[14] = this.activeMolecule.displayObjectsTransformation.origin[2];
                //Just consider one origin.
                const diff = [0, 0, 0];

                const dispObjs: moorhen.DisplayObject[][]  = this.activeMolecule.representations.filter(item => item.style !== 'transformation').map(item => item.buffers)
                for (const value of dispObjs) {
                    if (value.length > 0) {
                        const com = centreOfMass(value[0].atoms);
                        const diff : [number,number,number] = [com[0] + this.origin[0], com[1] + this.origin[1], com[2] + this.origin[2]];
                        this.activeMolecule.displayObjectsTransformation.centre = diff;
                        break;
                    }
                }
                for (const value of dispObjs) {
                    for (let ibuf = 0; ibuf < value.length; ibuf++) {
                        value[ibuf].transformMatrixInteractive = theMatrix;
                        value[ibuf].transformOriginInteractive = diff;
                    }
                }
                // ###############
            }
        }

        self.drawScene();
    }

    doMouseDown(event, self) {
        self.init_x = event.pageX;
        self.init_y = event.pageY;
        self.mouseDown_x = event.pageX;
        self.mouseDown_y = event.pageY;
        self.mouseDown = true;
        self.mouseDownButton = event.button;
        self.mouseMoved = false;
    }

    handleKeyUp(event, self) {
        Object.keys(self.props.keyboardAccelerators).forEach(key => {
            if (event.key && self.props.keyboardAccelerators[key].keyPress === event.key.toLowerCase() && self.props.keyboardAccelerators[key]) {
                self.keysDown[key] = false;
            }
        })
    }

    handleKeyDown(event, self) {
        const eventModifiersCodes: string[] = []

        if (event.shiftKey) eventModifiersCodes.push('shiftKey')
        if (event.ctrlKey) eventModifiersCodes.push('ctrlKey')
        if (event.metaKey) eventModifiersCodes.push('metaKey')
        if (event.altKey) eventModifiersCodes.push('altKey')

        Object.keys(self.props.keyboardAccelerators).forEach(key => {
            if (
                event.key &&
                self.props.keyboardAccelerators[key].keyPress === event.key.toLowerCase() &&
                self.props.keyboardAccelerators[key].modifiers.every(modifier => event[modifier]) &&
                eventModifiersCodes.every(modifier => self.props.keyboardAccelerators[key].modifiers.includes(modifier))
            ) {
                self.keysDown[key] = true
            } else {
                self.keysDown[key] = false
            }
        })

        /**
         * No longer necessary but leaving it here in case we want to handle something
         * not taken care of upstairs
        */

        let doContinue = true
        if (this.props.onKeyPress) {
            doContinue = this.props.onKeyPress(event) as boolean
        }

        if (!doContinue) return

    }

    makeCircleCanvas(text, width, height, circleColour) {
        this.circleCanvasInitialized = false;
        if (!this.circleCanvasInitialized) {
            this.circleCtx.canvas.width = width;
            this.circleCtx.canvas.height = height;
            this.circleCtx.font = "80px helvetica";
            this.circleCtx.textAlign = "left";
            this.circleCtx.textBaseline = "middle";
            this.circleCanvasInitialized = true;
        }
        this.circleCtx.fillStyle = "red";
        this.circleCtx.clearRect(0, 0, this.circleCtx.canvas.width, this.circleCtx.canvas.height);
        this.circleCtx.fillRect(0, 0, this.circleCtx.canvas.width, this.circleCtx.canvas.height);
        this.circleCtx.fillStyle = circleColour;
        this.circleCtx.strokeStyle = circleColour;
        this.circleCtx.lineWidth = width / 10;
        this.circleCtx.arc(width / 2, height / 2, width / 2 - width / 20 - 1, 0, 2 * Math.PI);
        this.circleCtx.stroke();
        const tm = this.circleCtx.measureText(text);
        this.circleCtx.fillText(text, width / 2 - tm.width / 2, height / 2 + 30);
    }

    // Puts text in center of canvas.
    makeTextCanvas(text:string, width:number, height:number, textColour:string, font?:string)  : [number,CanvasRenderingContext2D] {
        if(font){
            let theCtx;
            if(this.extraFontCtxs && (font in this.extraFontCtxs)){
                theCtx = this.extraFontCtxs[font];
            } else {
                theCtx = document.createElement("canvas").getContext("2d", {willReadFrequently: true});
            }
            theCtx.canvas.width = width;
            theCtx.canvas.height = height;
            theCtx.textBaseline = "alphabetic";
            theCtx.font = font;
            let textMetric = theCtx.measureText("Mgq!^(){}|'\"~`√∫Å");
            let actualHeight = textMetric.fontBoundingBoxAscent + textMetric.fontBoundingBoxDescent;
            let loop = 0;
            while(actualHeight>theCtx.canvas.height&&loop<3){
                theCtx.canvas.height *= 2;
                theCtx.font = font;
                textMetric = theCtx.measureText("M");
                actualHeight = textMetric.fontBoundingBoxAscent + textMetric.fontBoundingBoxDescent;
                loop += 1;
            }
            theCtx.textAlign = "left";
            theCtx.fillStyle = "#00000000";
            theCtx.fillRect(0, 0, theCtx.canvas.width, theCtx.canvas.height);
            theCtx.fillStyle = textColour;
            theCtx.fillText(text, 0, theCtx.canvas.height + textMetric.ideographicBaseline,theCtx.canvas.width);
            if(!this.extraFontCtxs)
                this.extraFontCtxs = {};
            this.extraFontCtxs[font] = theCtx;
            textMetric = theCtx.measureText(text);
            return [textMetric.actualBoundingBoxRight / width,theCtx];
        }
        this.textCanvasInitialized = false;
        if (!this.textCanvasInitialized) {
            this.textCtx.canvas.width = width;
            this.textCtx.canvas.height = height;
            this.textCtx.font = "20px helvetica";
            this.textCtx.textAlign = "left";
            this.textCtx.textBaseline = "middle";
            this.textCanvasInitialized = true;
        }
        this.textCtx.fillStyle = "#00000000";
        this.textCtx.fillRect(0, 0, this.textCtx.canvas.width, this.textCtx.canvas.height);
        this.textCtx.fillStyle = textColour;
        this.textCtx.fillText(text, 0, height / 2,this.textCtx.canvas.width);
        const textMetric = this.textCtx.measureText(text);
        //Return the maximum width in fractional box coordinates
        return [textMetric.actualBoundingBoxRight / width,this.textCtx];
    }

}
