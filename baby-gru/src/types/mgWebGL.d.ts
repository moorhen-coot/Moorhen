import { Dispatch, Store } from "@reduxjs/toolkit";
//import * as vec3 from 'gl-matrix/vec3';
//import * as vec4 from 'gl-matrix/vec4';
import { quat4 } from "gl-matrix";
import React from "react";
import { RootState } from "@/store";
//import * as mat4 from 'gl-matrix/mat4';
//import * as mat3 from 'gl-matrix/mat3';
import { moorhen } from "./moorhen";
import type { CameraController, CameraTarget, MoveResult, Transition } from "../WebGLgComponents/cameraController";
import type { ExternalRenderer } from "../WebGLgComponents/externalRenderer";

export namespace webGL {
    interface MGWebGLRenderingContext extends WebGLRenderingContext {
        viewportWidth: number;
        viewportHeight: number;
    }

    interface MGWebGL2RenderingContext extends WebGL2RenderingContext {
        viewportWidth: number;
        viewportHeight: number;
    }

    interface clickAtom {
        x: number;
        y: number;
        z: number;
        charge: number;
        label: string;
        symbol?: string;
        displayBuffer: DisplayBuffer;
        circleData?: ImageData;
    }

    interface Dictionary<T> {
        [Key: string]: T;
    }

    interface MGWebGLFrameBuffer extends WebGLFramebuffer {
        width: number;
        height: number;
    }

    interface MGWebGLBuffer {
        itemSize: number;
        numItems: number;
    }

    interface MGWebGLShaderDepthPeelAccum extends WebGLProgram {
        vertexPositionAttribute: GLint;
        vertexTextureAttribute: GLint;
        pMatrixUniform: WebGLUniformLocation;
        peelNumber: WebGLUniformLocation;
        depthPeelSamplers: WebGLUniformLocation;
        colorPeelSamplers: WebGLUniformLocation;
        xSSAOScaling: WebGLUniformLocation;
        ySSAOScaling: WebGLUniformLocation;
        resolvedLayer: WebGLUniformLocation;
    }

    interface MGWebGLTextureQuadShader extends WebGLProgram {
        vertexPositionAttribute: GLint;
        vertexTextureAttribute: GLint;
        pMatrixUniform: WebGLUniformLocation;
        mvMatrixUniform: WebGLUniformLocation;
        mvInvMatrixUniform: WebGLUniformLocation;
        fog_start: WebGLUniformLocation;
        fog_end: WebGLUniformLocation;
        fogColour: WebGLUniformLocation;
        clipPlane0: WebGLUniformLocation;
        clipPlane1: WebGLUniformLocation;
        clipPlane2: WebGLUniformLocation;
        clipPlane3: WebGLUniformLocation;
        clipPlane4: WebGLUniformLocation;
        clipPlane5: WebGLUniformLocation;
        clipPlane6: WebGLUniformLocation;
        clipPlane7: WebGLUniformLocation;
        nClipPlanes: WebGLUniformLocation;
        valueMap: WebGLUniformLocation;
        colorMap: WebGLUniformLocation;
    }

    interface MGWebGLShader extends WebGLProgram {
        vertexPositionAttribute: GLint;
        vertexNormalAttribute: GLint;
        vertexColourAttribute: GLint;
        vertexTextureAttribute: GLint;
        pMatrixUniform: WebGLUniformLocation;
        mvMatrixUniform: WebGLUniformLocation;
        mvInvMatrixUniform: WebGLUniformLocation;
        fog_start: WebGLUniformLocation;
        fog_end: WebGLUniformLocation;
        fogColour: WebGLUniformLocation;
        clipPlane0: WebGLUniformLocation;
        clipPlane1: WebGLUniformLocation;
        clipPlane2: WebGLUniformLocation;
        clipPlane3: WebGLUniformLocation;
        clipPlane4: WebGLUniformLocation;
        clipPlane5: WebGLUniformLocation;
        clipPlane6: WebGLUniformLocation;
        clipPlane7: WebGLUniformLocation;
        nClipPlanes: WebGLUniformLocation;
        light_positions: WebGLUniformLocation;
        light_colours_ambient: WebGLUniformLocation;
        light_colours_specular: WebGLUniformLocation;
        light_colours_diffuse: WebGLUniformLocation;
        peelNumber: WebGLUniformLocation;
        depthPeelSamplers: WebGLUniformLocation;
    }

    interface ShaderThickLines extends MGWebGLShader {
        screenZ: WebGLUniformLocation;
        offset: WebGLUniformLocation;
        size: WebGLUniformLocation;
        scaleMatrix: WebGLUniformLocation;
        ShadowMap: WebGLUniformLocation;
        SSAOMap: WebGLUniformLocation;
        edgeDetectMap: WebGLUniformLocation;
        doShadows: WebGLUniformLocation;
        doSSAO: WebGLUniformLocation;
        doEdgeDetect: WebGLUniformLocation;
        xPixelOffset: WebGLUniformLocation;
        yPixelOffset: WebGLUniformLocation;
        shadowQuality: WebGLUniformLocation;
        pixelZoom: WebGLUniformLocation;
        specularPower: WebGLUniformLocation;
        /** Per-buffer fade; null on a WebGL1 context, whose shaders have no such uniform. */
        alphaMultiplier: WebGLUniformLocation;
        textureMatrixUniform: WebGLUniformLocation;
        shinyBack: WebGLUniformLocation;
    }

    interface ShaderThickLinesNormal extends ShaderThickLines {
        vertexRealNormalAttribute: GLint;
        xSSAOScaling: WebGLUniformLocation; //Perhaps in parent? Perhaps more of parent here?
        ySSAOScaling: WebGLUniformLocation; // ditto
        occludeDiffuse: WebGLUniformLocation;
        doPerspective: WebGLUniformLocation;
    }

    interface ShaderTwodShapes extends MGWebGLShader {
        offset: WebGLUniformLocation;
        size: WebGLUniformLocation;
        scaleMatrix: WebGLUniformLocation;
    }

    interface ShaderTextInstanced extends MGWebGLShader {
        offsetAttribute: GLint;
        sizeAttribute: GLint;
        textureOffsetAttribute: GLint;
        screenOffsetAttribute: GLint;
        pixelZoom: WebGLUniformLocation;
        vertexTextureAttribute: GLint;
        textureMatrixUniform: WebGLUniformLocation;
        xSSAOScaling: WebGLUniformLocation;
        ySSAOScaling: WebGLUniformLocation;
        peelNumber: WebGLUniformLocation;
        depthPeelSamplers: WebGLUniformLocation;
    }

    interface ShaderTextBackground extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        pixelZoom: WebGLUniformLocation;
        screenZ: WebGLUniformLocation;
        maxTextureS: WebGLUniformLocation;
    }

    interface ShaderFrameBuffer extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        blurredTexture: WebGLUniformLocation;
        depthTexture: WebGLUniformLocation;
    depthTexture2: WebGLUniformLocation;
    haveDepth2: WebGLUniformLocation;
        focussedTexture: WebGLUniformLocation;
        blurDepth: WebGLUniformLocation;
    }

    interface ShaderPointSpheres extends MGWebGLShader {
        size: WebGLUniformLocation;
        offset: WebGLUniformLocation;
        scaleMatrix: WebGLUniformLocation;
        textureMatrixUniform: WebGLUniformLocation;
    }

    interface ShaderPerfectSpheres extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        offsetAttribute: GLint;
        sizeAttribute: GLint;
        invSymMatrixUniform: WebGLUniformLocation;
        textureMatrixUniform: WebGLUniformLocation;
        xPixelOffset: WebGLUniformLocation;
        yPixelOffset: WebGLUniformLocation;
        xSSAOScaling: WebGLUniformLocation;
        ySSAOScaling: WebGLUniformLocation;
        ShadowMap: WebGLUniformLocation;
        SSAOMap: WebGLUniformLocation;
        edgeDetectMap: WebGLUniformLocation;
        outlineSize: WebGLUniformLocation;
        shadowQuality: WebGLUniformLocation;
        doShadows: WebGLUniformLocation;
        doSSAO: WebGLUniformLocation;
        doEdgeDetect: WebGLUniformLocation;
        occludeDiffuse: WebGLUniformLocation;
        doPerspective: WebGLUniformLocation;
        clipCap: WebGLUniformLocation;
        specularPower: WebGLUniformLocation;
        /** Per-buffer fade; null on a WebGL1 context, whose shaders have no such uniform. */
        alphaMultiplier: WebGLUniformLocation;
        scaleMatrix: WebGLUniformLocation;
        ssaoMultiviewWidthHeightRatio: WebGLUniformLocation;
        zoom: WebGLUniformLocation;
    }

    interface ShaderTriangles extends MGWebGLShader {
        specularPower: WebGLUniformLocation;
        /** Per-buffer fade; null on a WebGL1 context, whose shaders have no such uniform. */
        alphaMultiplier: WebGLUniformLocation;
        shinyBack: WebGLUniformLocation;
        backColour: WebGLUniformLocation;
        defaultColour: WebGLUniformLocation;
        ShadowMap: WebGLUniformLocation;
        SSAOMap: WebGLUniformLocation;
        edgeDetectMap: WebGLUniformLocation;
        shadowQuality: WebGLUniformLocation;
        doShadows: WebGLUniformLocation;
        doSSAO: WebGLUniformLocation;
        doEdgeDetect: WebGLUniformLocation;
        cursorPos: WebGLUniformLocation;
        xPixelOffset: WebGLUniformLocation;
        yPixelOffset: WebGLUniformLocation;
        xSSAOScaling: WebGLUniformLocation;
        ySSAOScaling: WebGLUniformLocation;
        occludeDiffuse: WebGLUniformLocation;
        doPerspective: WebGLUniformLocation;
        textureMatrixUniform: WebGLUniformLocation;
        screenZ: WebGLUniformLocation;
        ssaoMultiviewWidthHeightRatio: WebGLUniformLocation;
        zoom: WebGLUniformLocation;
        //Fancy picking ...
        uPointTex: WebGLUniformLocation;
        uWeightTex: WebGLUniformLocation;
        uOffsetTex: WebGLUniformLocation;
        uPointTexWidth: WebGLUniformLocation;
        uWeightTexWidth: WebGLUniformLocation;
        uOffsetTexWidth: WebGLUniformLocation;
        uHoveredPoint: WebGLUniformLocation;
    }

    interface ShaderGBuffersTriangles extends MGWebGLShader {}

    interface ShaderGBuffersThickLinesNormal extends ShaderThickLinesNormal {}

    interface ShaderBlurX extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        inputTexture: WebGLUniformLocation;
        depthTexture: WebGLUniformLocation;
    depthTexture2: WebGLUniformLocation;
    haveDepth2: WebGLUniformLocation;
        blurSize: WebGLUniformLocation;
        blurDepth: WebGLUniformLocation;
        blurCoeffs: WebGLUniformLocation | null;
    }

    interface ShaderSimpleBlurX extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        inputTexture: WebGLUniformLocation;
        blurSize: WebGLUniformLocation;
        blurCoeffs: WebGLUniformLocation | null;
    }

    interface ShaderSSAO extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        gPositionTexture: WebGLUniformLocation;
        gNormalTexture: WebGLUniformLocation;
        texNoiseTexture: WebGLUniformLocation;
        zoom: WebGLUniformLocation | null;
        samples: WebGLUniformLocation | null;
        radius: WebGLUniformLocation | null;
        bias: WebGLUniformLocation | null;
        sceneProjection: WebGLUniformLocation | null;
        sceneProjectionInverse: WebGLUniformLocation | null;
        tileScale_x: WebGLUniformLocation | null;
        tileScale_y: WebGLUniformLocation | null;
        tileScaleBase_x: WebGLUniformLocation | null;
        tileScaleBase_y: WebGLUniformLocation | null;
    }

    interface ShaderEdgeDetect extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        gPositionTexture: WebGLUniformLocation;
        gNormalTexture: WebGLUniformLocation;
        depthThreshold: WebGLUniformLocation | null;
        normalThreshold: WebGLUniformLocation | null;
        scaleDepth: WebGLUniformLocation | null;
        scaleNormal: WebGLUniformLocation | null;
        xPixelOffset: WebGLUniformLocation | null;
        yPixelOffset: WebGLUniformLocation | null;
        clipNear: WebGLUniformLocation | null;
        clipFar: WebGLUniformLocation | null;
        perspectiveProjection: WebGLUniformLocation | null;
        zoom: WebGLUniformLocation | null;
    }

    interface ShaderBlurY extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        inputTexture: WebGLUniformLocation;
        depthTexture: WebGLUniformLocation;
    depthTexture2: WebGLUniformLocation;
    haveDepth2: WebGLUniformLocation;
        blurSize: WebGLUniformLocation;
        blurDepth: WebGLUniformLocation;
        blurCoeffs: WebGLUniformLocation | null;
    }

    interface ShaderSimpleBlurY extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        inputTexture: WebGLUniformLocation;
        blurSize: WebGLUniformLocation;
        blurCoeffs: WebGLUniformLocation | null;
    }

    interface ShaderCircles extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        up: WebGLUniformLocation;
        right: WebGLUniformLocation;
    }

    interface ShaderImages extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        size: WebGLUniformLocation;
        offset: WebGLUniformLocation;
        scaleMatrix: WebGLUniformLocation;
    }

    interface ShaderTrianglesInstanced extends ShaderTriangles {
        vertexInstanceOriginAttribute: GLint;
        vertexInstanceSizeAttribute: GLint;
        vertexInstanceOrientationAttribute: GLint;
        outlineSize: WebGLUniformLocation;
    }

    interface ShaderGBuffersPerfectSpheres extends ShaderPerfectSpheres {}

    interface ShaderGBuffersTrianglesInstanced extends ShaderGBuffersTriangles {
        vertexInstanceOriginAttribute: GLint;
        vertexInstanceSizeAttribute: GLint;
        vertexInstanceOrientationAttribute: GLint;
    }

    interface MGWebGLPropsInterface {
        reContourMapOnlyOnMouseUp: boolean | null;
        onAtomHovered: (identifier: { buffer: { id: string }; atom: moorhen.AtomInfo }) => void;
        // A hover on a labelled piece of a mesh. The label is opaque to the renderer.
        onSectionHovered?: (identifier: { buffer: { id: string }; kind: string; tag: string }) => void;
        onKeyPress: (event: KeyboardEvent) => boolean | Promise<boolean>;
        onZoomChanged: (newZoom: number) => void;
        onOriginChanged: (newOrigin: [number, number, number]) => void;
        onQuatChanged: (newQuat: [number, number, number, number]) => void;
        cursorPositionChanged: (x: number, y: number) => void;
        messageChanged: (d: Dictionary<string>) => void;
        mouseSensitivityFactor: number | null;
        zoomWheelSensitivityFactor: number | null;
        keyboardAccelerators: Dictionary<string>;
        showCrosshairs: boolean | null;
        showScaleBar: boolean | null;
        showAxes: boolean | null;
        showFPS: boolean | null;
        mapLineWidth: number;
        width?: number;
        height?: number;
        setDrawQuat: (q: quat4) => void;
        store: Store<RootState>;
        dispatch: Dispatch;
    }

    interface MGWebGL extends React.Component {
        //These 2 are used in MoorhenScreenRecorder
        getCanvasRef(): React.RefObject<HTMLCanvasElement>;
        getPixelData(doTransparentBackground?: boolean): Uint8Array;
        /** Another renderer drawing the view (the WebGPU main view); screenshots ask it. */
        externalRenderer: ExternalRenderer | null;
        //These 2 are used in MoorhenVercelBuild
        origin: [number, number, number];
        background_colour: [number, number, number, number];
        //These are used in moviePlayer, which steps the view a frame at a time and can
        //render off-screen at a size that does not depend on the window
        drawScene(): void;
        myQuat: quat4;
        zoom: number;
        /**
         * True while a centring move is in flight. Informational only.
         *
         * @deprecated Read `cameraController.moving`, which covers a movie as well as a move, or
         * `cameraController.driver` to ask who is moving the camera. Setting this no longer does
         * anything: it used to make moveCameraTo decline, which was a flag standing in for
         * ownership, and ownership is now something the camera can be asked about directly.
         */
        animating: boolean;
        /**
         * The camera. Owns where the view is; see WebGLgComponents/cameraController.
         */
        /**
         * Whether objects can be faded in and out. False on a WebGL1 context, where the
         * shaders have no fade uniform and an object stays solid however it is animated.
         */
        supportsObjectFading: boolean;
        cameraController: CameraController;
        /**
         * Put the camera somewhere, over whatever time the caller asks for. A transition of
         * `{ kind: "instant" }` moves it with no animation at all, which is what an export wants.
         */
        moveCameraTo(target: CameraTarget, transition: Transition): Promise<MoveResult>;
        /**
         * Turn the view by a relative rotation. A turn arriving during a move accumulates and is
         * applied when the move lands, so a nudge of the mouse cannot stop the camera arriving.
         */
        turnCameraBy(delta: [number, number, number, number]): void;
        /**
         * The time, in seconds, the camera is advanced to on the next draw; null means wall clock.
         * An export sets it to i/fps before each frame so that no frame is dropped and the output
         * runs at its authored speed however long rendering took.
         */
        cameraTime: number | null;
        set_clip_range(clipStart: number, clipEnd: number, update?: boolean): void;
        set_fog_range(fogStart: number, fogEnd: number, update?: boolean): void;
        setDrawingBufferSize(width: number, height: number): void;
        // The camera, slab and lighting, which the WebGPU renderer reads too (PreviewCameraSource).
        fogClipOffset: number;
        gl_clipPlane0: ArrayLike<number>;
        gl_clipPlane1: ArrayLike<number>;
        gl_fog_start: number | null;
        gl_fog_end: number;
        doPerspectiveProjection: boolean;
        light_positions: ArrayLike<number>;
        light_colours_ambient: ArrayLike<number>;
        light_colours_diffuse: ArrayLike<number>;
        light_colours_specular: ArrayLike<number>;
        specularPower: number;
    }
}
