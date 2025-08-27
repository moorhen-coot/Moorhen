import React from "react";
//import * as vec3 from 'gl-matrix/vec3';
//import * as vec4 from 'gl-matrix/vec4';
import { quat4 } from "gl-matrix";
//import * as mat4 from 'gl-matrix/mat4';
//import * as mat3 from 'gl-matrix/mat3';
import { moorhen } from "./moorhen";

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
        pixelZoom: WebGLUniformLocation;
        vertexTextureAttribute: GLint;
        textureMatrixUniform: WebGLUniformLocation;
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
        scaleMatrix: WebGLUniformLocation;
    }

    interface ShaderTriangles extends MGWebGLShader {
        specularPower: WebGLUniformLocation;
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
    }

    interface ShaderGBuffersTriangles extends MGWebGLShader {}

    interface ShaderGBuffersThickLinesNormal extends ShaderThickLinesNormal {}

    interface ShaderBlurX extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        inputTexture: WebGLUniformLocation;
        depthTexture: WebGLUniformLocation;
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
        depthBufferSize: WebGLUniformLocation | null;
        samples: WebGLUniformLocation | null;
        radius: WebGLUniformLocation | null;
        bias: WebGLUniformLocation | null;
        depthFactor: WebGLUniformLocation | null;
    }

    interface ShaderEdgeDetect extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        gPositionTexture: WebGLUniformLocation;
        gNormalTexture: WebGLUniformLocation;
        depthBufferSize: WebGLUniformLocation | null;
        depthThreshold: WebGLUniformLocation | null;
        normalThreshold: WebGLUniformLocation | null;
        scaleDepth: WebGLUniformLocation | null;
        scaleNormal: WebGLUniformLocation | null;
        xPixelOffset: WebGLUniformLocation | null;
        yPixelOffset: WebGLUniformLocation | null;
        depthFactor: WebGLUniformLocation | null;
        zoom: WebGLUniformLocation | null;
    }

    interface ShaderBlurY extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        inputTexture: WebGLUniformLocation;
        depthTexture: WebGLUniformLocation;
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

    interface ShaderOutLine extends MGWebGLShader {
        outlineSize: WebGLUniformLocation;
        cursorPos: WebGLUniformLocation;
        textureMatrixUniform: WebGLUniformLocation;
    }

    interface ShaderOverlay extends MGWebGLShader {
        vertexTextureAttribute: GLint;
        inputTexture: WebGLUniformLocation;
    }

    interface MGWebGLPropsInterface {
        reContourMapOnlyOnMouseUp: boolean | null;
        onAtomHovered: (identifier: { buffer: { id: string }; atom: moorhen.AtomInfo }) => void;
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
    }

    interface MGWebGL extends React.Component {
        //These 2 are used in MoorhenScreenRecorder
        getCanvasRef(): React.RefObject<HTMLCanvasElement>;
        getPixelData(doTransparentBackground?: boolean): Uint8Array;
        //These 2 are used in MoorhenVercelBuild
        origin: [number, number, number];
        background_colour: [number, number, number, number];
    }
}
