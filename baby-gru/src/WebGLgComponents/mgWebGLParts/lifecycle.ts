import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import * as mat4 from 'gl-matrix/mat4';
import { setIsWebGL2, setGLCtx } from '../../store/glRefSlice';
import { TextCanvasTexture } from '../textCanvasTexture';
import { initGL, MGWebGL } from '../mgWebGL';

/**
 * componentDidMount, decomposed into ordered phases. The mount used to be one
 * ~450-line method; splitting it into named steps makes the startup sequence
 * legible — which is the point, since the React lifecycle here (a class
 * component driving a WebGL canvas, with no teardown yet) is what we want to
 * scrutinise next.
 *
 * The phases run in this exact order (see MGWebGL.componentDidMount):
 *   1. initInstanceState   — default every instance field (state, matrices, clip planes)
 *   2. initGraphicsContext — create the GL context + the view-transform layouts
 *   3. attachCanvasListeners — wire up all mouse / touch / wheel / key listeners (once)
 *   4. initGraphics        — extensions, shaders, framebuffers, buffers, textures, first draw
 *
 * Order matters and is preserved verbatim from the original. `self` is the live
 * MGWebGL instance (type-only-ish import; initGL is a real runtime import).
 */

/** Phase 1 — default every instance field. Runs before the GL context exists. */
export function initInstanceState(self: MGWebGL): void {
    self.canvas = self.canvasRef.current;

    self.activeMolecule = null;
    self.draggableMolecule = null;
    self.currentlyDraggedAtom = null;
    self.fogClipOffset = 250.0;
    self.doPerspectiveProjection = false;

    self.shinyBack = true;
    self.backColour = "default";

    self.ready = false;
    self.gl = null;
    self.background_colour = [1.0, 1.0, 1.0, 1];
    self.textTex = null;
    self.origin = [0.0, 0.0, 0.0];
    self.radius = 60.0;
    self.moveFactor = 1.0;
    self.init_x = null;
    self.init_y = null;
    self.mouseDown_x = null;
    self.mouseDown_y = null;
    self.dx = null;
    self.dy = null;
    self.myQuat = null;
    self.mouseDown = null;
    self.measurePointsArray = [];
    self.measureHit = null;
    self.measureButton = -1;
    self.measureDownPos = {x:-1,y:-1};
    self.mouseMoved = null;
    self.zoom = null;
    self.ext = null;
    self.drawBuffersExt = null;
    self.instanced_ext = null;
    self.frag_depth_ext = null;
    self.gl_fog_start = null;
    self.gl_fog_end = null;
    self.gl_nClipPlanes = null;
    self.shaderProgram = null;
    self.shaderProgramGBuffers = null;
    self.shaderProgramGBuffersInstanced = null;
    self.shaderProgramGBuffersPerfectSpheres = null;
    self.shaderProgramTextBackground = null;
    self.shaderProgramCircles = null;
    self.shaderProgramLines = null;
    self.shaderProgramPointSpheres = null;

    self.mvMatrix = mat4.create();
    self.mvInvMatrix = mat4.create();
    self.screenZ = vec3.create();
    self.pMatrix = mat4.create();

    self.gl_clipPlane0 = null;
    self.gl_clipPlane1 = null;
    self.gl_clipPlane2 = null;
    self.gl_clipPlane3 = null;
    self.gl_clipPlane4 = null;
    self.gl_clipPlane5 = null;
    self.gl_clipPlane6 = null;
    self.gl_clipPlane7 = null;

    self.displayBuffers = [];

    self.save_pixel_data = false;
    self.renderToTexture = false;
    self.doDepthPeelPass = false;

    self.transparentScreenshotBackground = false;

    self.doStenciling = false;

    self.doShadow = false;
    self.doSSAO = false;
    self.doEdgeDetect = false;
    self.occludeDiffuse = false;

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
    self.depthThreshold = 1.4;
    self.normalThreshold = 0.5;
    self.scaleDepth = 2.0;
    self.scaleNormal = 1.0;

    self.doSpin = false;

    self.doThreeWayView = false;
    self.doSideBySideStereo = false;
    self.doMultiView = false;
    self.doCrossEyedStereo = false;
    self.doAnaglyphStereo = false;

    self.specifyMultiViewRowsColumns = false;
    self.threeWayViewOrder = "";
    self.multiViewRowsColumns = [1,1];

    self.doOrderIndependentTransparency = true;//Request OIT user/state setting
    self.doPeel = false;//Requested and required - above set and there are transparent objects.

    //Debugging only
    self.doShadowDepthDebug = false;
    if(self.doShadowDepthDebug)
        self.doShadow = true;

    self.drawingGBuffers = false;
    self.offScreenFramebuffer = null;
    self.offScreenFramebufferSimpleBlurX = null;
    self.offScreenFramebufferSimpleBlurY = null;
    self.ssaoFramebuffer = null;
    self.edgeDetectFramebuffer = null;
    self.gFramebuffer = null;
    self.useOffScreenBuffers = false; //This means "doDepthBlur" and is historically named.
    self.blurSize = 3;
    self.blurDepth = 0.2;
    self.offScreenReady = false;
    self.framebufferDrawBuffersReady = false;
    self.screenshotBuffersReady = false;

    self.edgeDetectFramebufferSize = 2048;
    self.gBuffersFramebufferSize = 2048;
    self.ssaoFramebufferSize = 1024;

    self.textCtx = document.createElement("canvas").getContext("2d", {willReadFrequently: true});
    self.circleCtx = document.createElement("canvas").getContext("2d");

    self.myQuat = quat4.create();
    quat4.set(self.myQuat, 0, 0, 0, -1);
    self.setZoom(1.0)

    self.gl_clipPlane0 = new Float32Array(4);
    self.gl_clipPlane1 = new Float32Array(4);
    self.gl_clipPlane1[0] = 0.0;
    self.gl_clipPlane1[1] = 0.0;
    self.gl_clipPlane1[2] = 1.0;
    self.gl_clipPlane1[3] = 1000.0;
    self.gl_clipPlane0[0] = 0.0;
    self.gl_clipPlane0[1] = 0.0;
    self.gl_clipPlane0[2] = -1.0;
    self.gl_clipPlane0[3] = -0.0;
    self.gl_clipPlane2 = new Float32Array(4);
    self.gl_clipPlane3 = new Float32Array(4);
    self.gl_clipPlane4 = new Float32Array(4);
    self.gl_clipPlane5 = new Float32Array(4);
    self.gl_clipPlane6 = new Float32Array(4);
    self.gl_clipPlane7 = new Float32Array(4);
    self.clipCapPerfectSpheres = false;
    self.drawEnvBOcc = false;
    self.environmentRadius = 3.5;
    self.environmentAtoms = [];
    self.labelledAtoms = [];
    self.measuredAtoms = [];

    self.gl_cursorPos = new Float32Array(2);
    self.gl_cursorPos[0] = self.canvas.width / 2.;
    self.gl_cursorPos[1] = self.canvas.height / 2.;


    self.gl_nClipPlanes = 0;
    self.gl_fog_start = self.fogClipOffset;
    self.gl_fog_end = 1000+self.fogClipOffset;

    self.origin = [0.0, 0.0, 0.0];

    self.mouseDown = false;
    self.mouseDownButton = -1;
}

/** Phase 2 — create the WebGL context and the stereo / three-way view layouts. */
export function initGraphicsContext(self: MGWebGL): void {
    const glc = initGL(self.canvas);
    self.gl = glc.gl;
    self.WEBGL2 = glc.WEBGL2;
    self.dispatch(setIsWebGL2(self.WEBGL2))
    self.dispatch(setGLCtx(self.gl))
    self.currentViewport = [0,0, self.gl.viewportWidth, self.gl.viewportWidth];
    self.currentAnaglyphColor = [1.0,0.0,0.0,1.0]

    self.max_elements_indices = 65535;

    self.setupThreeWayTransformations()
    self.setupStereoTransformations()

    self.blurUBOBuffer = self.gl.createBuffer();
    self.axesTexture = {black:{},white:{}};

    const extensionArray = self.gl.getSupportedExtensions();
}

/**
 * Phase 3 — attach all canvas mouse / touch / wheel / key listeners, once.
 *
 * Handlers are captured as named consts and recorded in
 * self.canvasEventListeners so detachCanvasListeners() can remove the exact
 * same references on unmount (anonymous inline handlers can't be removed). The
 * handler bodies are unchanged from the original inline versions.
 */
export function attachCanvasListeners(self: MGWebGL): void {
    if (self.doneEvents === undefined) {

        const onMouseDown = function (evt) {
            if (self.keysDown['dist_ang_2d']) {
                self.doMouseDownMeasure(evt, self);
            } else {
                self.doMouseDown(evt, self);
            }
            evt.stopPropagation();
        };

        const onMouseUp = function (evt) {
            if (self.keysDown['dist_ang_2d']) {
                self.doMouseUpMeasure(evt, self);
            } else {
                self.doMouseUp(evt, self);
            }
        };

        const onContextMenu = function (evt) {
            self.doRightClick(evt, self);
            evt.stopPropagation();
            evt.preventDefault();
        };

        const onMouseDownClick = function (evt) {
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
        };

        const onDblClick = function (evt) {
            self.doDoubleClick(evt, self);
            evt.stopPropagation();
        };

        const onMouseMove = function (evt) {
            if (self.keysDown['dist_ang_2d']) {
                self.doMouseMoveMeasure(evt, self);
            } else {
                self.doMouseMove(evt, self);
            }
            evt.stopPropagation();
        };

        const onMouseEnter = function (evt) {
            document.onkeydown = function (evt2) {
                self.handleKeyDown(evt2, self);
            }
            document.onkeyup = function (evt2) {
                self.handleKeyUp(evt2, self);
            }
        };

        const onMouseLeave = function (evt) {
            document.onkeydown = function (evt2) {
            }
        };

        const onWheel = function (evt) {
            self.doWheel(evt);
            evt.stopPropagation();
            evt.preventDefault();
        };

        const onTouchStart = function (e) {
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
        };

        const onTouchMove = function (e) {
            const touchobj = e.touches[0]; // reference first touch point for this event
            const evt = { pageX: touchobj.pageX, pageY: touchobj.pageY, shiftKey: false, altKey: false, buttons: 1 };
            if (e.touches.length === 2) {
                evt.shiftKey = true;
                evt.altKey = true;
            }
            self.doMouseMove(evt, self);
            e.stopPropagation();
            e.preventDefault();
        };

        const onTouchEnd = function (e) {
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
        };

        // Record every binding so detachCanvasListeners can remove the exact refs.
        // Order/args preserved from the original addEventListener calls.
        self.canvasEventListeners = [
            ["mousedown", onMouseDown],
            ["mouseup", onMouseUp],
            ["contextmenu", onContextMenu],
            ["mousedown", onMouseDownClick],
            ["dblclick", onDblClick],
            ["mousemove", onMouseMove],
            ["mouseenter", onMouseEnter],
            ["mouseleave", onMouseLeave],
            ["wheel", onWheel],
            ["touchstart", onTouchStart],
            ["touchmove", onTouchMove],
            ["touchend", onTouchEnd],
        ];

        console.log("addEventListener");
        for (const [type, handler] of self.canvasEventListeners) {
            self.canvas.addEventListener(type, handler, false);
        }
    }
    self.doneEvents = true;
}

/**
 * Teardown counterpart to attachCanvasListeners — remove every canvas listener
 * that was recorded, and clear the document-level key handlers that mouseenter
 * installs. Called from MGWebGL.componentWillUnmount so listeners don't leak
 * across unmount / remount.
 */
export function detachCanvasListeners(self: MGWebGL): void {
    if (self.canvasEventListeners && self.canvas) {
        for (const [type, handler] of self.canvasEventListeners) {
            self.canvas.removeEventListener(type, handler, false);
        }
    }
    self.canvasEventListeners = [];
    // mouseenter set these on document; drop them so they don't outlive us.
    document.onkeydown = null;
    document.onkeyup = null;
    self.doneEvents = undefined;
}

/** Phase 4 — extensions, shaders, framebuffers, buffers, textures, first draw. */
export function initGraphics(self: MGWebGL): void {
    self.light_positions = new Float32Array([25.0, 25.0, 50.0, 1.0]);
    self.light_colours_ambient = new Float32Array([0.0, 0.0, 0.0, 1.0]);
    self.light_colours_specular = new Float32Array([1.0, 1.0, 1.0, 1.0]);
    self.light_colours_diffuse = new Float32Array([1.0, 1.0, 1.0, 1.0]);
    self.specularPower = 64.0;

    self.gl.clearColor(self.background_colour[0], self.background_colour[1], self.background_colour[2], self.background_colour[3]);
    if (self.WEBGL2) {
        console.log("WebGL2")
        self.ext = true;
        self.frag_depth_ext = true;
        self.instanced_ext = true;
        self.depth_texture = true;
        const color_buffer_float_ext = self.gl.getExtension("EXT_color_buffer_float");
        if(!color_buffer_float_ext){
            alert("No WebGL extension EXT_color_buffer_float! Some or all rendering may not work properly");
        } else {
            console.log("color_buffer_float_ext?",color_buffer_float_ext)
        }
    } else {
        self.ext = self.gl.getExtension("OES_element_index_uint");
        if (!self.ext) {
            alert("No OES_element_index_uint support");
        }
        console.log("##################################################");
        console.log("Got extension");
        console.log(self.ext);
        const color_buffer_float_ext = self.gl.getExtension("WEBGL_color_buffer_float");
        if(!color_buffer_float_ext){
            console.log("No WEBGL_color_buffer_float! Some or all rendering may not work properly");
        } else {
            console.log("color_buffer_float_ext?",color_buffer_float_ext)
        }
        self.frag_depth_ext = self.gl.getExtension("EXT_frag_depth");
        self.depth_texture = self.gl.getExtension("WEBGL_depth_texture");
        self.instanced_ext = self.gl.getExtension("ANGLE_instanced_arrays");
        self.drawBuffersExt = self.gl.getExtension("WEBGL_draw_buffers");
        if (!self.instanced_ext) {
            alert("No instancing support");
        }
        if (!self.drawBuffersExt) {
            alert("No WEBGL_draw_buffers support");
        }
        if (!self.depth_texture) {
            self.depth_texture = self.gl.getExtension("MOZ_WEBGL_depth_texture");
            if (!self.depth_texture) {
                self.depth_texture = self.gl.getExtension("WEBKIT_WEBGL_depth_texture");
                if (!self.depth_texture) {
                    alert("No depth texture extension");
                }
            }
        }
    }

    self.drawDirtyIntervalId = setInterval(function () { self.drawSceneIfDirty() }, 16);
    self.initializeShaders();

    self.textLegends = [];
    self.newTextLabels = [];

    self.textHeightScaling = 800;
    if(self.doShadow) self.initTextureFramebuffer(); //This is testing only

    if (!self.frag_depth_ext) {
        console.log("No EXT_frag_depth support");
        console.log("This is supported in most browsers, except IE. And may never be supported in IE.");
        console.log("This extension is supported in Microsoft Edge, so Windows 10 is required for perfect spheres in MS Browser.");
        console.log("Other browers on Windows 7/8/8.1 do have this extension.");
    }
    self.textTex = self.gl.createTexture();
    self.circleTex = self.gl.createTexture();

    self.gl.bindTexture(self.gl.TEXTURE_2D, self.circleTex);
    self.makeCircleCanvas("H", 128, 128, "black");
    self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, self.gl.RGBA, self.gl.UNSIGNED_BYTE, self.circleCtx.canvas);

    self.gl_nClipPlanes = 0;
    self.gl_fog_start = self.fogClipOffset;
    self.gl_fog_end = 1000+self.fogClipOffset;
    //self.gl.lineWidth(2.0);
    self.gl.blendFuncSeparate(self.gl.SRC_ALPHA, self.gl.ONE_MINUS_SRC_ALPHA, self.gl.ONE, self.gl.ONE_MINUS_SRC_ALPHA);
    self.gl.enable(self.gl.BLEND);

    self.ssaoRadius = 0.4;
    self.ssaoBias = 1.0;
    if(self.WEBGL2) self.initializeSSAOBuffers();

    self.buildBuffers();

    self.measureText2DCanvasTexture = new TextCanvasTexture(self.gl,self.ext,self.instanced_ext,self.shaderProgramTextInstanced,768,2048, self.store);
    self.measureTextCanvasTexture = new TextCanvasTexture(self.gl,self.ext,self.instanced_ext,self.shaderProgramTextInstanced,1024,2048, self.store);
    self.labelsTextCanvasTexture = new TextCanvasTexture(self.gl,self.ext,self.instanced_ext,self.shaderProgramTextInstanced,1024,2048, self.store);
    self.texturedShapes = [];

    self.gl.clearColor(self.background_colour[0], self.background_colour[1], self.background_colour[2], self.background_colour[3]);
    self.gl.enable(self.gl.DEPTH_TEST);
    self.gl.clear(self.gl.COLOR_BUFFER_BIT | self.gl.DEPTH_BUFFER_BIT);

    self.origin = [0.0, 0.0, 0.0];
    //const shader_version = self.gl.getParameter(self.gl.SHADING_LANGUAGE_VERSION);

    self.mouseDown = false;
    self.mouseDownButton = -1;

    self.setBlurSize(self.blurSize);
    self.drawScene();
    self.ready = true;

    self.multiWayViewports = []
}
