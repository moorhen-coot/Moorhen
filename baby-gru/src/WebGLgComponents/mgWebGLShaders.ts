export function getShader(gl, str, type) {

    let shader;
    if (type === "fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (type === "vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(shader));
        console.trace()
        console.log(type)
        console.log(str)
        return null;
    }

    return shader;
}

export function initInstancedOutlineShaders(vertexShaderOutline, fragmentShaderOutline, gl) {
    const shaderProgramInstancedOutline = gl.createProgram();

    gl.attachShader(shaderProgramInstancedOutline, vertexShaderOutline);
    gl.attachShader(shaderProgramInstancedOutline, fragmentShaderOutline);
    gl.bindAttribLocation(shaderProgramInstancedOutline, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramInstancedOutline, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramInstancedOutline, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramInstancedOutline, 3, "aVertexTexture");
    gl.bindAttribLocation(shaderProgramInstancedOutline, 4, "instancePosition");
    gl.bindAttribLocation(shaderProgramInstancedOutline, 5, "instanceSize");
    gl.bindAttribLocation(shaderProgramInstancedOutline, 6, "instanceOrientation");
    gl.linkProgram(shaderProgramInstancedOutline);

    if (!gl.getProgramParameter(shaderProgramInstancedOutline, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (shaderProgramInstancedOutline)");
        console.log(gl.getProgramInfoLog(shaderProgramInstancedOutline));
    }

    gl.useProgram(shaderProgramInstancedOutline);

    shaderProgramInstancedOutline.vertexInstanceOriginAttribute = gl.getAttribLocation(shaderProgramInstancedOutline, "instancePosition");
    shaderProgramInstancedOutline.vertexInstanceSizeAttribute = gl.getAttribLocation(shaderProgramInstancedOutline, "instanceSize");
    shaderProgramInstancedOutline.vertexInstanceOrientationAttribute = gl.getAttribLocation(shaderProgramInstancedOutline, "instanceOrientation");

    shaderProgramInstancedOutline.vertexNormalAttribute = gl.getAttribLocation(shaderProgramInstancedOutline, "aVertexNormal");
    //gl.enableVertexAttribArray(shaderProgramInstancedOutline.vertexNormalAttribute);

    shaderProgramInstancedOutline.vertexPositionAttribute = gl.getAttribLocation(shaderProgramInstancedOutline, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramInstancedOutline.vertexPositionAttribute);

    shaderProgramInstancedOutline.vertexColourAttribute = gl.getAttribLocation(shaderProgramInstancedOutline, "aVertexColour");
    gl.enableVertexAttribArray(shaderProgramInstancedOutline.vertexColourAttribute);

    shaderProgramInstancedOutline.pMatrixUniform = gl.getUniformLocation(shaderProgramInstancedOutline, "uPMatrix");
    shaderProgramInstancedOutline.mvMatrixUniform = gl.getUniformLocation(shaderProgramInstancedOutline, "uMVMatrix");
    shaderProgramInstancedOutline.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramInstancedOutline, "uMVINVMatrix");
    shaderProgramInstancedOutline.textureMatrixUniform = gl.getUniformLocation(shaderProgramInstancedOutline, "TextureMatrix");
    shaderProgramInstancedOutline.outlineSize = gl.getUniformLocation(shaderProgramInstancedOutline, "outlineSize");

    shaderProgramInstancedOutline.fog_start = gl.getUniformLocation(shaderProgramInstancedOutline, "fog_start");
    shaderProgramInstancedOutline.fog_end = gl.getUniformLocation(shaderProgramInstancedOutline, "fog_end");
    shaderProgramInstancedOutline.fogColour = gl.getUniformLocation(shaderProgramInstancedOutline, "fogColour");

    shaderProgramInstancedOutline.clipPlane0 = gl.getUniformLocation(shaderProgramInstancedOutline, "clipPlane0");
    shaderProgramInstancedOutline.clipPlane1 = gl.getUniformLocation(shaderProgramInstancedOutline, "clipPlane1");
    shaderProgramInstancedOutline.clipPlane2 = gl.getUniformLocation(shaderProgramInstancedOutline, "clipPlane2");
    shaderProgramInstancedOutline.clipPlane3 = gl.getUniformLocation(shaderProgramInstancedOutline, "clipPlane3");
    shaderProgramInstancedOutline.clipPlane4 = gl.getUniformLocation(shaderProgramInstancedOutline, "clipPlane4");
    shaderProgramInstancedOutline.clipPlane5 = gl.getUniformLocation(shaderProgramInstancedOutline, "clipPlane5");
    shaderProgramInstancedOutline.clipPlane6 = gl.getUniformLocation(shaderProgramInstancedOutline, "clipPlane6");
    shaderProgramInstancedOutline.clipPlane7 = gl.getUniformLocation(shaderProgramInstancedOutline, "clipPlane7");
    shaderProgramInstancedOutline.nClipPlanes = gl.getUniformLocation(shaderProgramInstancedOutline, "nClipPlanes");

    return shaderProgramInstancedOutline

}

export function initInstancedShadowShaders(vertexShaderShadow, fragmentShaderShadow, gl) {
    const shaderProgramInstancedShadow = gl.createProgram();

    gl.attachShader(shaderProgramInstancedShadow, vertexShaderShadow);
    gl.attachShader(shaderProgramInstancedShadow, fragmentShaderShadow);
    gl.bindAttribLocation(shaderProgramInstancedShadow, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramInstancedShadow, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramInstancedShadow, 4, "instancePosition");
    gl.bindAttribLocation(shaderProgramInstancedShadow, 5, "instanceSize");
    gl.bindAttribLocation(shaderProgramInstancedShadow, 6, "instanceOrientation");
    gl.linkProgram(shaderProgramInstancedShadow);

    if (!gl.getProgramParameter(shaderProgramInstancedShadow, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (shaderProgramInstancedShadow)");
        console.log(gl.getProgramInfoLog(shaderProgramInstancedShadow));
    }

    gl.useProgram(shaderProgramInstancedShadow);

    shaderProgramInstancedShadow.vertexInstanceOriginAttribute = gl.getAttribLocation(shaderProgramInstancedShadow, "instancePosition");
    shaderProgramInstancedShadow.vertexInstanceSizeAttribute = gl.getAttribLocation(shaderProgramInstancedShadow, "instanceSize");
    shaderProgramInstancedShadow.vertexInstanceOrientationAttribute = gl.getAttribLocation(shaderProgramInstancedShadow, "instanceOrientation");

    shaderProgramInstancedShadow.vertexPositionAttribute = gl.getAttribLocation(shaderProgramInstancedShadow, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramInstancedShadow.vertexPositionAttribute);

    shaderProgramInstancedShadow.vertexColourAttribute = gl.getAttribLocation(shaderProgramInstancedShadow, "aVertexColour");
    gl.enableVertexAttribArray(shaderProgramInstancedShadow.vertexColourAttribute);

    shaderProgramInstancedShadow.pMatrixUniform = gl.getUniformLocation(shaderProgramInstancedShadow, "uPMatrix");
    shaderProgramInstancedShadow.mvMatrixUniform = gl.getUniformLocation(shaderProgramInstancedShadow, "uMVMatrix");
    shaderProgramInstancedShadow.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramInstancedShadow, "uMVINVMatrix");

    shaderProgramInstancedShadow.fog_start = gl.getUniformLocation(shaderProgramInstancedShadow, "fog_start");
    shaderProgramInstancedShadow.fog_end = gl.getUniformLocation(shaderProgramInstancedShadow, "fog_end");
    shaderProgramInstancedShadow.fogColour = gl.getUniformLocation(shaderProgramInstancedShadow, "fogColour");

    shaderProgramInstancedShadow.clipPlane0 = gl.getUniformLocation(shaderProgramInstancedShadow, "clipPlane0");
    shaderProgramInstancedShadow.clipPlane1 = gl.getUniformLocation(shaderProgramInstancedShadow, "clipPlane1");
    shaderProgramInstancedShadow.clipPlane2 = gl.getUniformLocation(shaderProgramInstancedShadow, "clipPlane2");
    shaderProgramInstancedShadow.clipPlane3 = gl.getUniformLocation(shaderProgramInstancedShadow, "clipPlane3");
    shaderProgramInstancedShadow.clipPlane4 = gl.getUniformLocation(shaderProgramInstancedShadow, "clipPlane4");
    shaderProgramInstancedShadow.clipPlane5 = gl.getUniformLocation(shaderProgramInstancedShadow, "clipPlane5");
    shaderProgramInstancedShadow.clipPlane6 = gl.getUniformLocation(shaderProgramInstancedShadow, "clipPlane6");
    shaderProgramInstancedShadow.clipPlane7 = gl.getUniformLocation(shaderProgramInstancedShadow, "clipPlane7");
    shaderProgramInstancedShadow.nClipPlanes = gl.getUniformLocation(shaderProgramInstancedShadow, "nClipPlanes");

    return shaderProgramInstancedShadow

}

export function initShadowShaders(vertexShaderShadow, fragmentShaderShadow, gl) {
    const shaderProgramShadow = gl.createProgram();

    gl.attachShader(shaderProgramShadow, vertexShaderShadow);
    gl.attachShader(shaderProgramShadow, fragmentShaderShadow);
    gl.bindAttribLocation(shaderProgramShadow, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramShadow, 1, "aVertexColour");
    gl.linkProgram(shaderProgramShadow);

    if (!gl.getProgramParameter(shaderProgramShadow, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initShadowShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramShadow));
    }

    gl.useProgram(shaderProgramShadow);

    shaderProgramShadow.vertexPositionAttribute = gl.getAttribLocation(shaderProgramShadow, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramShadow.vertexPositionAttribute);

    shaderProgramShadow.vertexColourAttribute = gl.getAttribLocation(shaderProgramShadow, "aVertexColour");
    gl.enableVertexAttribArray(shaderProgramShadow.vertexColourAttribute);

    shaderProgramShadow.pMatrixUniform = gl.getUniformLocation(shaderProgramShadow, "uPMatrix");
    shaderProgramShadow.mvMatrixUniform = gl.getUniformLocation(shaderProgramShadow, "uMVMatrix");
    shaderProgramShadow.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramShadow, "uMVINVMatrix");

    shaderProgramShadow.fog_start = gl.getUniformLocation(shaderProgramShadow, "fog_start");
    shaderProgramShadow.fog_end = gl.getUniformLocation(shaderProgramShadow, "fog_end");
    shaderProgramShadow.fogColour = gl.getUniformLocation(shaderProgramShadow, "fogColour");

    shaderProgramShadow.clipPlane0 = gl.getUniformLocation(shaderProgramShadow, "clipPlane0");
    shaderProgramShadow.clipPlane1 = gl.getUniformLocation(shaderProgramShadow, "clipPlane1");
    shaderProgramShadow.clipPlane2 = gl.getUniformLocation(shaderProgramShadow, "clipPlane2");
    shaderProgramShadow.clipPlane3 = gl.getUniformLocation(shaderProgramShadow, "clipPlane3");
    shaderProgramShadow.clipPlane4 = gl.getUniformLocation(shaderProgramShadow, "clipPlane4");
    shaderProgramShadow.clipPlane5 = gl.getUniformLocation(shaderProgramShadow, "clipPlane5");
    shaderProgramShadow.clipPlane6 = gl.getUniformLocation(shaderProgramShadow, "clipPlane6");
    shaderProgramShadow.clipPlane7 = gl.getUniformLocation(shaderProgramShadow, "clipPlane7");
    shaderProgramShadow.nClipPlanes = gl.getUniformLocation(shaderProgramShadow, "nClipPlanes");

    return shaderProgramShadow

}

export function initEdgeDetectShader(vertexShaderEdgeDetect, fragmentShaderEdgeDetect, gl) {
    const shaderProgramEdgeDetect = gl.createProgram();
    gl.attachShader(shaderProgramEdgeDetect, vertexShaderEdgeDetect);
    gl.attachShader(shaderProgramEdgeDetect, fragmentShaderEdgeDetect);
    gl.bindAttribLocation(shaderProgramEdgeDetect, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramEdgeDetect, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramEdgeDetect);
    if (!gl.getProgramParameter(shaderProgramEdgeDetect, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initEdgeDetectShader)");
        console.log(gl.getProgramInfoLog(shaderProgramEdgeDetect));
    }

    gl.useProgram(shaderProgramEdgeDetect);

    shaderProgramEdgeDetect.vertexPositionAttribute = gl.getAttribLocation(shaderProgramEdgeDetect, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramEdgeDetect.vertexPositionAttribute);

    shaderProgramEdgeDetect.vertexTextureAttribute = gl.getAttribLocation(shaderProgramEdgeDetect, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramEdgeDetect.vertexTextureAttribute);

    shaderProgramEdgeDetect.pMatrixUniform = gl.getUniformLocation(shaderProgramEdgeDetect, "uPMatrix");
    shaderProgramEdgeDetect.mvMatrixUniform = gl.getUniformLocation(shaderProgramEdgeDetect, "uMVMatrix");

    shaderProgramEdgeDetect.gPositionTexture = gl.getUniformLocation(shaderProgramEdgeDetect, "gPosition");
    shaderProgramEdgeDetect.gNormalTexture = gl.getUniformLocation(shaderProgramEdgeDetect, "gNormal");

    shaderProgramEdgeDetect.zoom = gl.getUniformLocation(shaderProgramEdgeDetect, "zoom");
    shaderProgramEdgeDetect.depthBufferSize = gl.getUniformLocation(shaderProgramEdgeDetect, "depthBufferSize");

    shaderProgramEdgeDetect.depthThreshold = gl.getUniformLocation(shaderProgramEdgeDetect, "depthThreshold");
    shaderProgramEdgeDetect.normalThreshold = gl.getUniformLocation(shaderProgramEdgeDetect, "normalThreshold");
    shaderProgramEdgeDetect.scaleDepth = gl.getUniformLocation(shaderProgramEdgeDetect, "scaleDepth");
    shaderProgramEdgeDetect.scaleNormal = gl.getUniformLocation(shaderProgramEdgeDetect, "scaleNormal");
    shaderProgramEdgeDetect.xPixelOffset = gl.getUniformLocation(shaderProgramEdgeDetect, "xPixelOffset");
    shaderProgramEdgeDetect.yPixelOffset = gl.getUniformLocation(shaderProgramEdgeDetect, "yPixelOffset");
    shaderProgramEdgeDetect.depthFactor = gl.getUniformLocation(shaderProgramEdgeDetect, "depthFactor");

    return shaderProgramEdgeDetect

}

export function initSSAOShader(vertexShaderSSAO, fragmentShaderSSAO, gl, WEBGL2) {
    const shaderProgramSSAO = gl.createProgram();
    gl.attachShader(shaderProgramSSAO, vertexShaderSSAO);
    gl.attachShader(shaderProgramSSAO, fragmentShaderSSAO);
    gl.bindAttribLocation(shaderProgramSSAO, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramSSAO, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramSSAO);
    if (!gl.getProgramParameter(shaderProgramSSAO, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initSSAOShader)");
        console.log(gl.getProgramInfoLog(shaderProgramSSAO));
    }

    gl.useProgram(shaderProgramSSAO);

    shaderProgramSSAO.vertexPositionAttribute = gl.getAttribLocation(shaderProgramSSAO, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramSSAO.vertexPositionAttribute);

    shaderProgramSSAO.vertexTextureAttribute = gl.getAttribLocation(shaderProgramSSAO, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramSSAO.vertexTextureAttribute);

    shaderProgramSSAO.pMatrixUniform = gl.getUniformLocation(shaderProgramSSAO, "uPMatrix");
    shaderProgramSSAO.mvMatrixUniform = gl.getUniformLocation(shaderProgramSSAO, "uMVMatrix");

    if(WEBGL2){
        shaderProgramSSAO.samples = gl.getUniformBlockIndex(shaderProgramSSAO, "sampleBuffer");
        gl.uniformBlockBinding(shaderProgramSSAO, shaderProgramSSAO.samples, 0);
    }

    shaderProgramSSAO.gPositionTexture = gl.getUniformLocation(shaderProgramSSAO, "gPosition");
    shaderProgramSSAO.gNormalTexture = gl.getUniformLocation(shaderProgramSSAO, "gNormal");
    shaderProgramSSAO.texNoiseTexture = gl.getUniformLocation(shaderProgramSSAO, "texNoise");
    shaderProgramSSAO.zoom = gl.getUniformLocation(shaderProgramSSAO, "zoom");
    shaderProgramSSAO.radius = gl.getUniformLocation(shaderProgramSSAO, "radius");
    shaderProgramSSAO.bias = gl.getUniformLocation(shaderProgramSSAO, "bias");
    shaderProgramSSAO.depthFactor = gl.getUniformLocation(shaderProgramSSAO, "depthFactor");
    shaderProgramSSAO.depthBufferSize = gl.getUniformLocation(shaderProgramSSAO, "depthBufferSize");

    return shaderProgramSSAO

}

export function initBlurXShader(vertexShaderBlurX, fragmentShaderBlurX, gl, WEBGL2) {
    const shaderProgramBlurX = gl.createProgram();

    gl.attachShader(shaderProgramBlurX, vertexShaderBlurX);
    gl.attachShader(shaderProgramBlurX, fragmentShaderBlurX);
    gl.bindAttribLocation(shaderProgramBlurX, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramBlurX, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramBlurX);

    if (!gl.getProgramParameter(shaderProgramBlurX, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initRenderBlurXShader)");
        console.log(gl.getProgramInfoLog(shaderProgramBlurX));
    }

    gl.useProgram(shaderProgramBlurX);

    shaderProgramBlurX.vertexPositionAttribute = gl.getAttribLocation(shaderProgramBlurX, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramBlurX.vertexPositionAttribute);

    shaderProgramBlurX.vertexTextureAttribute = gl.getAttribLocation(shaderProgramBlurX, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramBlurX.vertexTextureAttribute);

    shaderProgramBlurX.pMatrixUniform = gl.getUniformLocation(shaderProgramBlurX, "uPMatrix");
    shaderProgramBlurX.mvMatrixUniform = gl.getUniformLocation(shaderProgramBlurX, "uMVMatrix");

    shaderProgramBlurX.blurSize = gl.getUniformLocation(shaderProgramBlurX, "blurSize");
    shaderProgramBlurX.blurDepth = gl.getUniformLocation(shaderProgramBlurX, "blurDepth");
    if(WEBGL2){
        shaderProgramBlurX.blurCoeffs = gl.getUniformBlockIndex(shaderProgramBlurX, "coeffBuffer");
        gl.uniformBlockBinding(shaderProgramBlurX, shaderProgramBlurX.blurCoeffs, 0);
    }

    shaderProgramBlurX.depthTexture = gl.getUniformLocation(shaderProgramBlurX, "depth");
    shaderProgramBlurX.inputTexture = gl.getUniformLocation(shaderProgramBlurX, "shader0");

    return shaderProgramBlurX

}

export function initBlurYShader(vertexShaderBlurY, fragmentShaderBlurY, gl, WEBGL2) {
    const shaderProgramBlurY = gl.createProgram();

    gl.attachShader(shaderProgramBlurY, vertexShaderBlurY);
    gl.attachShader(shaderProgramBlurY, fragmentShaderBlurY);
    gl.bindAttribLocation(shaderProgramBlurY, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramBlurY, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramBlurY);

    if (!gl.getProgramParameter(shaderProgramBlurY, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initRenderBlurYShader)");
        console.log(gl.getProgramInfoLog(shaderProgramBlurY));
    }

    gl.useProgram(shaderProgramBlurY);

    shaderProgramBlurY.vertexPositionAttribute = gl.getAttribLocation(shaderProgramBlurY, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramBlurY.vertexPositionAttribute);

    shaderProgramBlurY.vertexTextureAttribute = gl.getAttribLocation(shaderProgramBlurY, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramBlurY.vertexTextureAttribute);

    shaderProgramBlurY.pMatrixUniform = gl.getUniformLocation(shaderProgramBlurY, "uPMatrix");
    shaderProgramBlurY.mvMatrixUniform = gl.getUniformLocation(shaderProgramBlurY, "uMVMatrix");

    shaderProgramBlurY.blurSize = gl.getUniformLocation(shaderProgramBlurY, "blurSize");
    shaderProgramBlurY.blurDepth = gl.getUniformLocation(shaderProgramBlurY, "blurDepth");
    if(WEBGL2){
        shaderProgramBlurY.blurCoeffs = gl.getUniformBlockIndex(shaderProgramBlurY, "coeffBuffer");
        gl.uniformBlockBinding(shaderProgramBlurY, shaderProgramBlurY.blurCoeffs, 0);
    }

    shaderProgramBlurY.depthTexture = gl.getUniformLocation(shaderProgramBlurY, "depth");
    shaderProgramBlurY.inputTexture = gl.getUniformLocation(shaderProgramBlurY, "shader0");

    return shaderProgramBlurY

}

export function initSimpleBlurXShader(vertexShaderBlurX, fragmentShaderBlurX, gl, WEBGL2) {
    const shaderProgramSimpleBlurX = gl.createProgram();

    gl.attachShader(shaderProgramSimpleBlurX, vertexShaderBlurX);
    gl.attachShader(shaderProgramSimpleBlurX, fragmentShaderBlurX);
    gl.bindAttribLocation(shaderProgramSimpleBlurX, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramSimpleBlurX, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramSimpleBlurX);

    if (!gl.getProgramParameter(shaderProgramSimpleBlurX, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initRenderBlurXShader)");
        console.log(gl.getProgramInfoLog(shaderProgramSimpleBlurX));
    }

    gl.useProgram(shaderProgramSimpleBlurX);

    shaderProgramSimpleBlurX.vertexPositionAttribute = gl.getAttribLocation(shaderProgramSimpleBlurX, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramSimpleBlurX.vertexPositionAttribute);

    shaderProgramSimpleBlurX.vertexTextureAttribute = gl.getAttribLocation(shaderProgramSimpleBlurX, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramSimpleBlurX.vertexTextureAttribute);

    shaderProgramSimpleBlurX.pMatrixUniform = gl.getUniformLocation(shaderProgramSimpleBlurX, "uPMatrix");
    shaderProgramSimpleBlurX.mvMatrixUniform = gl.getUniformLocation(shaderProgramSimpleBlurX, "uMVMatrix");

    shaderProgramSimpleBlurX.blurSize = gl.getUniformLocation(shaderProgramSimpleBlurX, "blurSize");
    if(WEBGL2){
        shaderProgramSimpleBlurX.blurCoeffs = gl.getUniformBlockIndex(shaderProgramSimpleBlurX, "coeffBuffer");
        gl.uniformBlockBinding(shaderProgramSimpleBlurX, shaderProgramSimpleBlurX.blurCoeffs, 0);
    }

    shaderProgramSimpleBlurX.inputTexture = gl.getUniformLocation(shaderProgramSimpleBlurX, "shader0");

    return shaderProgramSimpleBlurX

}

export function initSimpleBlurYShader(vertexShaderBlurY, fragmentShaderBlurY, gl, WEBGL2) {
    const shaderProgramSimpleBlurY = gl.createProgram();

    gl.attachShader(shaderProgramSimpleBlurY, vertexShaderBlurY);
    gl.attachShader(shaderProgramSimpleBlurY, fragmentShaderBlurY);
    gl.bindAttribLocation(shaderProgramSimpleBlurY, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramSimpleBlurY, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramSimpleBlurY);

    if (!gl.getProgramParameter(shaderProgramSimpleBlurY, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initRenderBlurYShader)");
        console.log(gl.getProgramInfoLog(shaderProgramSimpleBlurY));
    }

    gl.useProgram(shaderProgramSimpleBlurY);

    shaderProgramSimpleBlurY.vertexPositionAttribute = gl.getAttribLocation(shaderProgramSimpleBlurY, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramSimpleBlurY.vertexPositionAttribute);

    shaderProgramSimpleBlurY.vertexTextureAttribute = gl.getAttribLocation(shaderProgramSimpleBlurY, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramSimpleBlurY.vertexTextureAttribute);

    shaderProgramSimpleBlurY.pMatrixUniform = gl.getUniformLocation(shaderProgramSimpleBlurY, "uPMatrix");
    shaderProgramSimpleBlurY.mvMatrixUniform = gl.getUniformLocation(shaderProgramSimpleBlurY, "uMVMatrix");

    shaderProgramSimpleBlurY.blurSize = gl.getUniformLocation(shaderProgramSimpleBlurY, "blurSize");
    if(WEBGL2){
        shaderProgramSimpleBlurY.blurCoeffs = gl.getUniformBlockIndex(shaderProgramSimpleBlurY, "coeffBuffer");
        gl.uniformBlockBinding(shaderProgramSimpleBlurY, shaderProgramSimpleBlurY.blurCoeffs, 0);
    }

    shaderProgramSimpleBlurY.inputTexture = gl.getUniformLocation(shaderProgramSimpleBlurY, "shader0");

    return shaderProgramSimpleBlurY

}

export function initOverlayShader(vertexShaderOverlay, fragmentShaderOverlay, gl) {
    const shaderProgramOverlay = gl.createProgram();

    gl.attachShader(shaderProgramOverlay, vertexShaderOverlay);
    gl.attachShader(shaderProgramOverlay, fragmentShaderOverlay);
    gl.bindAttribLocation(shaderProgramOverlay, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramOverlay, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramOverlay);

    if (!gl.getProgramParameter(shaderProgramOverlay, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initRenderOverlayShader)");
        console.log(gl.getProgramInfoLog(shaderProgramOverlay));
    }

    gl.useProgram(shaderProgramOverlay);

    shaderProgramOverlay.vertexPositionAttribute = gl.getAttribLocation(shaderProgramOverlay, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramOverlay.vertexPositionAttribute);

    shaderProgramOverlay.vertexTextureAttribute = gl.getAttribLocation(shaderProgramOverlay, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramOverlay.vertexTextureAttribute);

    shaderProgramOverlay.pMatrixUniform = gl.getUniformLocation(shaderProgramOverlay, "uPMatrix");
    shaderProgramOverlay.mvMatrixUniform = gl.getUniformLocation(shaderProgramOverlay, "uMVMatrix");

    shaderProgramOverlay.inputTexture = gl.getUniformLocation(shaderProgramOverlay, "shader0");

    return shaderProgramOverlay

}

export function initRenderFrameBufferShaders(vertexShaderRenderFrameBuffer, fragmentShaderRenderFrameBuffer, gl) {
    const shaderProgramRenderFrameBuffer = gl.createProgram();

    gl.attachShader(shaderProgramRenderFrameBuffer, vertexShaderRenderFrameBuffer);
    gl.attachShader(shaderProgramRenderFrameBuffer, fragmentShaderRenderFrameBuffer);
    gl.bindAttribLocation(shaderProgramRenderFrameBuffer, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramRenderFrameBuffer, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramRenderFrameBuffer);

    if (!gl.getProgramParameter(shaderProgramRenderFrameBuffer, gl.LINK_STATUS)) {
        //alert("Could not initialise shaders (initRenderFrameBufferShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramRenderFrameBuffer));
    }

    gl.useProgram(shaderProgramRenderFrameBuffer);

    shaderProgramRenderFrameBuffer.vertexPositionAttribute = gl.getAttribLocation(shaderProgramRenderFrameBuffer, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramRenderFrameBuffer.vertexPositionAttribute);

    shaderProgramRenderFrameBuffer.vertexTextureAttribute = gl.getAttribLocation(shaderProgramRenderFrameBuffer, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramRenderFrameBuffer.vertexTextureAttribute);

    shaderProgramRenderFrameBuffer.pMatrixUniform = gl.getUniformLocation(shaderProgramRenderFrameBuffer, "uPMatrix");
    shaderProgramRenderFrameBuffer.mvMatrixUniform = gl.getUniformLocation(shaderProgramRenderFrameBuffer, "uMVMatrix");

    shaderProgramRenderFrameBuffer.focussedTexture = gl.getUniformLocation(shaderProgramRenderFrameBuffer, "inFocus");
    shaderProgramRenderFrameBuffer.blurredTexture = gl.getUniformLocation(shaderProgramRenderFrameBuffer, "blurred");
    shaderProgramRenderFrameBuffer.depthTexture = gl.getUniformLocation(shaderProgramRenderFrameBuffer, "depth");
    shaderProgramRenderFrameBuffer.blurDepth = gl.getUniformLocation(shaderProgramRenderFrameBuffer, "blurDepth");

    return shaderProgramRenderFrameBuffer

}

export function initCirclesShaders(vertexShader, fragmentShader, gl) {
    const shaderProgramCircles = gl.createProgram();

    gl.attachShader(shaderProgramCircles, vertexShader);
    gl.attachShader(shaderProgramCircles, fragmentShader);
    gl.bindAttribLocation(shaderProgramCircles, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramCircles, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramCircles, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramCircles, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramCircles);

    if (!gl.getProgramParameter(shaderProgramCircles, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initCirclesShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramCircles));
    }

    gl.useProgram(shaderProgramCircles);

    shaderProgramCircles.vertexNormalAttribute = gl.getAttribLocation(shaderProgramCircles, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgramCircles.vertexNormalAttribute);

    shaderProgramCircles.vertexPositionAttribute = gl.getAttribLocation(shaderProgramCircles, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramCircles.vertexPositionAttribute);

    shaderProgramCircles.vertexTextureAttribute = gl.getAttribLocation(shaderProgramCircles, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramCircles.vertexTextureAttribute);

    shaderProgramCircles.pMatrixUniform = gl.getUniformLocation(shaderProgramCircles, "uPMatrix");
    shaderProgramCircles.mvMatrixUniform = gl.getUniformLocation(shaderProgramCircles, "uMVMatrix");
    shaderProgramCircles.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramCircles, "uMVINVMatrix");

    shaderProgramCircles.up = gl.getUniformLocation(shaderProgramCircles, "up");
    shaderProgramCircles.right = gl.getUniformLocation(shaderProgramCircles, "right");

    shaderProgramCircles.fog_start = gl.getUniformLocation(shaderProgramCircles, "fog_start");
    shaderProgramCircles.fog_end = gl.getUniformLocation(shaderProgramCircles, "fog_end");
    shaderProgramCircles.fogColour = gl.getUniformLocation(shaderProgramCircles, "fogColour");

    shaderProgramCircles.clipPlane0 = gl.getUniformLocation(shaderProgramCircles, "clipPlane0");
    shaderProgramCircles.clipPlane1 = gl.getUniformLocation(shaderProgramCircles, "clipPlane1");
    shaderProgramCircles.clipPlane2 = gl.getUniformLocation(shaderProgramCircles, "clipPlane2");
    shaderProgramCircles.clipPlane3 = gl.getUniformLocation(shaderProgramCircles, "clipPlane3");
    shaderProgramCircles.clipPlane4 = gl.getUniformLocation(shaderProgramCircles, "clipPlane4");
    shaderProgramCircles.clipPlane5 = gl.getUniformLocation(shaderProgramCircles, "clipPlane5");
    shaderProgramCircles.clipPlane6 = gl.getUniformLocation(shaderProgramCircles, "clipPlane6");
    shaderProgramCircles.clipPlane7 = gl.getUniformLocation(shaderProgramCircles, "clipPlane7");
    shaderProgramCircles.nClipPlanes = gl.getUniformLocation(shaderProgramCircles, "nClipPlanes");

    return shaderProgramCircles

}

export function initTextInstancedShaders(vertexShader, fragmentShader, gl) {

    const shaderProgramTextInstanced = gl.createProgram();
    gl.attachShader(shaderProgramTextInstanced, vertexShader);
    gl.attachShader(shaderProgramTextInstanced, fragmentShader);
    gl.bindAttribLocation(shaderProgramTextInstanced, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramTextInstanced, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramTextInstanced, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramTextInstanced, 3, "aVertexTexture");
    gl.bindAttribLocation(shaderProgramTextInstanced, 8, "size");
    gl.bindAttribLocation(shaderProgramTextInstanced, 9, "offset");
    gl.bindAttribLocation(shaderProgramTextInstanced, 10, "textureOffsets");
    gl.linkProgram(shaderProgramTextInstanced);

    if (!gl.getProgramParameter(shaderProgramTextInstanced, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initTextInstancedShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramTextInstanced));
    }

    gl.useProgram(shaderProgramTextInstanced);

    shaderProgramTextInstanced.vertexPositionAttribute = gl.getAttribLocation(shaderProgramTextInstanced, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramTextInstanced.vertexPositionAttribute);

    shaderProgramTextInstanced.vertexTextureAttribute = gl.getAttribLocation(shaderProgramTextInstanced, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramTextInstanced.vertexTextureAttribute);

    shaderProgramTextInstanced.offsetAttribute = gl.getAttribLocation(shaderProgramTextInstanced, "offset");
    gl.enableVertexAttribArray(shaderProgramTextInstanced.offsetAttribute);

    shaderProgramTextInstanced.sizeAttribute = gl.getAttribLocation(shaderProgramTextInstanced, "size");
    gl.enableVertexAttribArray(shaderProgramTextInstanced.sizeAttribute);

    shaderProgramTextInstanced.textureOffsetAttribute = gl.getAttribLocation(shaderProgramTextInstanced, "textureOffsets");
    gl.enableVertexAttribArray(shaderProgramTextInstanced.textureOffsetAttribute);

    shaderProgramTextInstanced.pMatrixUniform = gl.getUniformLocation(shaderProgramTextInstanced, "uPMatrix");
    shaderProgramTextInstanced.mvMatrixUniform = gl.getUniformLocation(shaderProgramTextInstanced, "uMVMatrix");
    shaderProgramTextInstanced.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramTextInstanced, "uMVINVMatrix");
    shaderProgramTextInstanced.textureMatrixUniform = gl.getUniformLocation(shaderProgramTextInstanced, "TextureMatrix");

    shaderProgramTextInstanced.fog_start = gl.getUniformLocation(shaderProgramTextInstanced, "fog_start");
    shaderProgramTextInstanced.fog_end = gl.getUniformLocation(shaderProgramTextInstanced, "fog_end");

    shaderProgramTextInstanced.clipPlane0 = gl.getUniformLocation(shaderProgramTextInstanced, "clipPlane0");
    shaderProgramTextInstanced.clipPlane1 = gl.getUniformLocation(shaderProgramTextInstanced, "clipPlane1");
    shaderProgramTextInstanced.clipPlane2 = gl.getUniformLocation(shaderProgramTextInstanced, "clipPlane2");
    shaderProgramTextInstanced.clipPlane3 = gl.getUniformLocation(shaderProgramTextInstanced, "clipPlane3");
    shaderProgramTextInstanced.clipPlane4 = gl.getUniformLocation(shaderProgramTextInstanced, "clipPlane4");
    shaderProgramTextInstanced.clipPlane5 = gl.getUniformLocation(shaderProgramTextInstanced, "clipPlane5");
    shaderProgramTextInstanced.clipPlane6 = gl.getUniformLocation(shaderProgramTextInstanced, "clipPlane6");
    shaderProgramTextInstanced.clipPlane7 = gl.getUniformLocation(shaderProgramTextInstanced, "clipPlane7");
    shaderProgramTextInstanced.nClipPlanes = gl.getUniformLocation(shaderProgramTextInstanced, "nClipPlanes");

    shaderProgramTextInstanced.pixelZoom = gl.getUniformLocation(shaderProgramTextInstanced, "pixelZoom");

    return shaderProgramTextInstanced

}

export function initTextBackgroundShaders(vertexShaderTextBackground, fragmentShaderTextBackground, gl) {

    const shaderProgramTextBackground = gl.createProgram();

    gl.attachShader(shaderProgramTextBackground, vertexShaderTextBackground);
    gl.attachShader(shaderProgramTextBackground, fragmentShaderTextBackground);
    gl.bindAttribLocation(shaderProgramTextBackground, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramTextBackground, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramTextBackground, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramTextBackground, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramTextBackground);

    if (!gl.getProgramParameter(shaderProgramTextBackground, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initTextBackgroundShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramTextBackground));
    }

    gl.useProgram(shaderProgramTextBackground);

    shaderProgramTextBackground.vertexNormalAttribute = gl.getAttribLocation(shaderProgramTextBackground, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgramTextBackground.vertexNormalAttribute);

    shaderProgramTextBackground.vertexPositionAttribute = gl.getAttribLocation(shaderProgramTextBackground, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramTextBackground.vertexPositionAttribute);

    shaderProgramTextBackground.vertexColourAttribute = gl.getAttribLocation(shaderProgramTextBackground, "aVertexColour");
    //gl.enableVertexAttribArray(shaderProgramTextBackground.vertexColourAttribute);

    shaderProgramTextBackground.vertexTextureAttribute = gl.getAttribLocation(shaderProgramTextBackground, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramTextBackground.vertexTextureAttribute);

    shaderProgramTextBackground.pMatrixUniform = gl.getUniformLocation(shaderProgramTextBackground, "uPMatrix");
    shaderProgramTextBackground.mvMatrixUniform = gl.getUniformLocation(shaderProgramTextBackground, "uMVMatrix");
    shaderProgramTextBackground.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramTextBackground, "uMVINVMatrix");

    shaderProgramTextBackground.fog_start = gl.getUniformLocation(shaderProgramTextBackground, "fog_start");
    shaderProgramTextBackground.fog_end = gl.getUniformLocation(shaderProgramTextBackground, "fog_end");
    shaderProgramTextBackground.fogColour = gl.getUniformLocation(shaderProgramTextBackground, "fogColour");
    shaderProgramTextBackground.maxTextureS = gl.getUniformLocation(shaderProgramTextBackground, "maxTextureS");
    gl.uniform1f(shaderProgramTextBackground.fog_start, 1000.0);
    gl.uniform1f(shaderProgramTextBackground.fog_end, 1000.0);
    gl.uniform4fv(shaderProgramTextBackground.fogColour, new Float32Array([1.0, 1.0, 1.0, 1.0]));

    shaderProgramTextBackground.clipPlane0 = gl.getUniformLocation(shaderProgramTextBackground, "clipPlane0");
    shaderProgramTextBackground.clipPlane1 = gl.getUniformLocation(shaderProgramTextBackground, "clipPlane1");
    shaderProgramTextBackground.clipPlane2 = gl.getUniformLocation(shaderProgramTextBackground, "clipPlane2");
    shaderProgramTextBackground.clipPlane3 = gl.getUniformLocation(shaderProgramTextBackground, "clipPlane3");
    shaderProgramTextBackground.clipPlane4 = gl.getUniformLocation(shaderProgramTextBackground, "clipPlane4");
    shaderProgramTextBackground.clipPlane5 = gl.getUniformLocation(shaderProgramTextBackground, "clipPlane5");
    shaderProgramTextBackground.clipPlane6 = gl.getUniformLocation(shaderProgramTextBackground, "clipPlane6");
    shaderProgramTextBackground.clipPlane7 = gl.getUniformLocation(shaderProgramTextBackground, "clipPlane7");
    shaderProgramTextBackground.nClipPlanes = gl.getUniformLocation(shaderProgramTextBackground, "nClipPlanes");

    return shaderProgramTextBackground

}

export function initOutlineShaders(vertexShader, fragmentShader, gl) {
    const shaderProgramOutline = gl.createProgram();

    gl.attachShader(shaderProgramOutline, vertexShader);
    gl.attachShader(shaderProgramOutline, fragmentShader);
    gl.bindAttribLocation(shaderProgramOutline, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramOutline, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramOutline, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramOutline, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramOutline);

    if (!gl.getProgramParameter(shaderProgramOutline, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initOutlineShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramOutline));
    }

    gl.useProgram(shaderProgramOutline);

    shaderProgramOutline.vertexNormalAttribute = gl.getAttribLocation(shaderProgramOutline, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgramOutline.vertexNormalAttribute);

    shaderProgramOutline.vertexPositionAttribute = gl.getAttribLocation(shaderProgramOutline, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramOutline.vertexPositionAttribute);

    shaderProgramOutline.vertexColourAttribute = gl.getAttribLocation(shaderProgramOutline, "aVertexColour");
    gl.enableVertexAttribArray(shaderProgramOutline.vertexColourAttribute);

    shaderProgramOutline.pMatrixUniform = gl.getUniformLocation(shaderProgramOutline, "uPMatrix");
    shaderProgramOutline.mvMatrixUniform = gl.getUniformLocation(shaderProgramOutline, "uMVMatrix");
    shaderProgramOutline.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramOutline, "uMVINVMatrix");
    shaderProgramOutline.textureMatrixUniform = gl.getUniformLocation(shaderProgramOutline, "TextureMatrix");
    shaderProgramOutline.outlineSize = gl.getUniformLocation(shaderProgramOutline, "outlineSize");

    shaderProgramOutline.fog_start = gl.getUniformLocation(shaderProgramOutline, "fog_start");
    shaderProgramOutline.fog_end = gl.getUniformLocation(shaderProgramOutline, "fog_end");
    shaderProgramOutline.fogColour = gl.getUniformLocation(shaderProgramOutline, "fogColour");

    shaderProgramOutline.clipPlane0 = gl.getUniformLocation(shaderProgramOutline, "clipPlane0");
    shaderProgramOutline.clipPlane1 = gl.getUniformLocation(shaderProgramOutline, "clipPlane1");
    shaderProgramOutline.clipPlane2 = gl.getUniformLocation(shaderProgramOutline, "clipPlane2");
    shaderProgramOutline.clipPlane3 = gl.getUniformLocation(shaderProgramOutline, "clipPlane3");
    shaderProgramOutline.clipPlane4 = gl.getUniformLocation(shaderProgramOutline, "clipPlane4");
    shaderProgramOutline.clipPlane5 = gl.getUniformLocation(shaderProgramOutline, "clipPlane5");
    shaderProgramOutline.clipPlane6 = gl.getUniformLocation(shaderProgramOutline, "clipPlane6");
    shaderProgramOutline.clipPlane7 = gl.getUniformLocation(shaderProgramOutline, "clipPlane7");
    shaderProgramOutline.nClipPlanes = gl.getUniformLocation(shaderProgramOutline, "nClipPlanes");

    shaderProgramOutline.cursorPos = gl.getUniformLocation(shaderProgramOutline, "cursorPos");

    return shaderProgramOutline

}

export function initGBufferShadersPerfectSphere(vertexShader, fragmentShader, gl) {
    const shaderProgramGBuffersPerfectSpheres = gl.createProgram();
    gl.attachShader(shaderProgramGBuffersPerfectSpheres, vertexShader);
    gl.attachShader(shaderProgramGBuffersPerfectSpheres, fragmentShader);
    gl.bindAttribLocation(shaderProgramGBuffersPerfectSpheres, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramGBuffersPerfectSpheres, 3, "aVertexTexture");
    gl.bindAttribLocation(shaderProgramGBuffersPerfectSpheres, 8, "size");
    gl.bindAttribLocation(shaderProgramGBuffersPerfectSpheres, 9, "offset");
    gl.linkProgram(shaderProgramGBuffersPerfectSpheres);

    if (!gl.getProgramParameter(shaderProgramGBuffersPerfectSpheres, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initGBufferShadersPerfectSphere)");
        console.log(gl.getProgramInfoLog(shaderProgramGBuffersPerfectSpheres));
    }

    gl.useProgram(shaderProgramGBuffersPerfectSpheres);

    shaderProgramGBuffersPerfectSpheres.vertexPositionAttribute = gl.getAttribLocation(shaderProgramGBuffersPerfectSpheres, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramGBuffersPerfectSpheres.vertexPositionAttribute);

    shaderProgramGBuffersPerfectSpheres.vertexTextureAttribute = gl.getAttribLocation(shaderProgramGBuffersPerfectSpheres, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramGBuffersPerfectSpheres.vertexTextureAttribute);

    shaderProgramGBuffersPerfectSpheres.offsetAttribute = gl.getAttribLocation(shaderProgramGBuffersPerfectSpheres, "offset");
    gl.enableVertexAttribArray(shaderProgramGBuffersPerfectSpheres.offsetAttribute);

    shaderProgramGBuffersPerfectSpheres.sizeAttribute= gl.getAttribLocation(shaderProgramGBuffersPerfectSpheres, "size");
    gl.enableVertexAttribArray(shaderProgramGBuffersPerfectSpheres.sizeAttribute);

    shaderProgramGBuffersPerfectSpheres.pMatrixUniform = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "uPMatrix");
    shaderProgramGBuffersPerfectSpheres.mvMatrixUniform = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "uMVMatrix");
    shaderProgramGBuffersPerfectSpheres.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "uMVINVMatrix");
    shaderProgramGBuffersPerfectSpheres.invSymMatrixUniform = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "uINVSymmMatrix");

    shaderProgramGBuffersPerfectSpheres.clipPlane0 = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "clipPlane0");
    shaderProgramGBuffersPerfectSpheres.clipPlane1 = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "clipPlane1");
    shaderProgramGBuffersPerfectSpheres.clipPlane2 = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "clipPlane2");
    shaderProgramGBuffersPerfectSpheres.clipPlane3 = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "clipPlane3");
    shaderProgramGBuffersPerfectSpheres.clipPlane4 = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "clipPlane4");
    shaderProgramGBuffersPerfectSpheres.clipPlane5 = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "clipPlane5");
    shaderProgramGBuffersPerfectSpheres.clipPlane6 = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "clipPlane6");
    shaderProgramGBuffersPerfectSpheres.clipPlane7 = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "clipPlane7");
    shaderProgramGBuffersPerfectSpheres.nClipPlanes = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "nClipPlanes");
    shaderProgramGBuffersPerfectSpheres.clipCap = gl.getUniformLocation(shaderProgramGBuffersPerfectSpheres, "clipCap");

    return shaderProgramGBuffersPerfectSpheres

}

export function initGBufferShadersInstanced(vertexShader, fragmentShader, gl) {

    const shaderProgramGBuffersInstanced = gl.createProgram();

    gl.attachShader(shaderProgramGBuffersInstanced, vertexShader);
    gl.attachShader(shaderProgramGBuffersInstanced, fragmentShader);
    gl.bindAttribLocation(shaderProgramGBuffersInstanced, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramGBuffersInstanced, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramGBuffersInstanced, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramGBuffersInstanced, 4, "instancePosition");
    gl.bindAttribLocation(shaderProgramGBuffersInstanced, 5, "instanceSize");
    gl.bindAttribLocation(shaderProgramGBuffersInstanced, 6, "instanceOrientation");
    gl.linkProgram(shaderProgramGBuffersInstanced);

    if (!gl.getProgramParameter(shaderProgramGBuffersInstanced, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initGBufferShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramGBuffersInstanced));
    }

    shaderProgramGBuffersInstanced.vertexNormalAttribute = gl.getAttribLocation(shaderProgramGBuffersInstanced, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgramGBuffersInstanced.vertexNormalAttribute);

    shaderProgramGBuffersInstanced.vertexPositionAttribute = gl.getAttribLocation(shaderProgramGBuffersInstanced, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramGBuffersInstanced.vertexPositionAttribute);

    shaderProgramGBuffersInstanced.vertexColourAttribute = -1;

    shaderProgramGBuffersInstanced.vertexInstanceOriginAttribute = gl.getAttribLocation(shaderProgramGBuffersInstanced, "instancePosition");
    shaderProgramGBuffersInstanced.vertexInstanceSizeAttribute = gl.getAttribLocation(shaderProgramGBuffersInstanced, "instanceSize");
    shaderProgramGBuffersInstanced.vertexInstanceOrientationAttribute = gl.getAttribLocation(shaderProgramGBuffersInstanced, "instanceOrientation");

    shaderProgramGBuffersInstanced.pMatrixUniform = gl.getUniformLocation(shaderProgramGBuffersInstanced, "uPMatrix");
    shaderProgramGBuffersInstanced.mvMatrixUniform = gl.getUniformLocation(shaderProgramGBuffersInstanced, "uMVMatrix");
    shaderProgramGBuffersInstanced.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramGBuffersInstanced, "uMVINVMatrix");

    shaderProgramGBuffersInstanced.clipPlane0 = gl.getUniformLocation(shaderProgramGBuffersInstanced, "clipPlane0");
    shaderProgramGBuffersInstanced.clipPlane1 = gl.getUniformLocation(shaderProgramGBuffersInstanced, "clipPlane1");
    shaderProgramGBuffersInstanced.clipPlane2 = gl.getUniformLocation(shaderProgramGBuffersInstanced, "clipPlane2");
    shaderProgramGBuffersInstanced.clipPlane3 = gl.getUniformLocation(shaderProgramGBuffersInstanced, "clipPlane3");
    shaderProgramGBuffersInstanced.clipPlane4 = gl.getUniformLocation(shaderProgramGBuffersInstanced, "clipPlane4");
    shaderProgramGBuffersInstanced.clipPlane5 = gl.getUniformLocation(shaderProgramGBuffersInstanced, "clipPlane5");
    shaderProgramGBuffersInstanced.clipPlane6 = gl.getUniformLocation(shaderProgramGBuffersInstanced, "clipPlane6");
    shaderProgramGBuffersInstanced.clipPlane7 = gl.getUniformLocation(shaderProgramGBuffersInstanced, "clipPlane7");
    shaderProgramGBuffersInstanced.nClipPlanes = gl.getUniformLocation(shaderProgramGBuffersInstanced, "nClipPlanes");

    return shaderProgramGBuffersInstanced

}

export function initGBufferShaders(vertexShader, fragmentShader, gl) {
    const shaderProgramGBuffers = gl.createProgram();

    gl.attachShader(shaderProgramGBuffers, vertexShader);
    gl.attachShader(shaderProgramGBuffers, fragmentShader);
    gl.bindAttribLocation(shaderProgramGBuffers, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramGBuffers, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramGBuffers, 2, "aVertexNormal");
    gl.linkProgram(shaderProgramGBuffers);

    if (!gl.getProgramParameter(shaderProgramGBuffers, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initGBufferShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramGBuffers));
    }

    shaderProgramGBuffers.vertexNormalAttribute = gl.getAttribLocation(shaderProgramGBuffers, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgramGBuffers.vertexNormalAttribute);

    shaderProgramGBuffers.vertexPositionAttribute = gl.getAttribLocation(shaderProgramGBuffers, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramGBuffers.vertexPositionAttribute);

    shaderProgramGBuffers.vertexColourAttribute = -1;

    shaderProgramGBuffers.pMatrixUniform = gl.getUniformLocation(shaderProgramGBuffers, "uPMatrix");
    shaderProgramGBuffers.mvMatrixUniform = gl.getUniformLocation(shaderProgramGBuffers, "uMVMatrix");
    shaderProgramGBuffers.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramGBuffers, "uMVINVMatrix");

    shaderProgramGBuffers.clipPlane0 = gl.getUniformLocation(shaderProgramGBuffers, "clipPlane0");
    shaderProgramGBuffers.clipPlane1 = gl.getUniformLocation(shaderProgramGBuffers, "clipPlane1");
    shaderProgramGBuffers.clipPlane2 = gl.getUniformLocation(shaderProgramGBuffers, "clipPlane2");
    shaderProgramGBuffers.clipPlane3 = gl.getUniformLocation(shaderProgramGBuffers, "clipPlane3");
    shaderProgramGBuffers.clipPlane4 = gl.getUniformLocation(shaderProgramGBuffers, "clipPlane4");
    shaderProgramGBuffers.clipPlane5 = gl.getUniformLocation(shaderProgramGBuffers, "clipPlane5");
    shaderProgramGBuffers.clipPlane6 = gl.getUniformLocation(shaderProgramGBuffers, "clipPlane6");
    shaderProgramGBuffers.clipPlane7 = gl.getUniformLocation(shaderProgramGBuffers, "clipPlane7");
    shaderProgramGBuffers.nClipPlanes = gl.getUniformLocation(shaderProgramGBuffers, "nClipPlanes");

    return shaderProgramGBuffers

}

export function initShadersDepthPeelAccum(vertexShader, fragmentShader, gl) {

    const shaderProgramDepthPeelAccum = gl.createProgram();

    gl.attachShader(shaderProgramDepthPeelAccum, vertexShader);
    gl.attachShader(shaderProgramDepthPeelAccum, fragmentShader);
    gl.bindAttribLocation(shaderProgramDepthPeelAccum, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramDepthPeelAccum, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramDepthPeelAccum);

    if (!gl.getProgramParameter(shaderProgramDepthPeelAccum, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initShadersDepthPeelAccum)");
        console.log(gl.getProgramInfoLog(shaderProgramDepthPeelAccum));
    }

    gl.useProgram(shaderProgramDepthPeelAccum);

    shaderProgramDepthPeelAccum.vertexPositionAttribute = gl.getAttribLocation(shaderProgramDepthPeelAccum, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramDepthPeelAccum.vertexPositionAttribute);

    shaderProgramDepthPeelAccum.vertexTextureAttribute = gl.getAttribLocation(shaderProgramDepthPeelAccum, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramDepthPeelAccum.vertexTextureAttribute);

    shaderProgramDepthPeelAccum.pMatrixUniform = gl.getUniformLocation(shaderProgramDepthPeelAccum, "uPMatrix");
    shaderProgramDepthPeelAccum.peelNumber = gl.getUniformLocation(shaderProgramDepthPeelAccum, "peelNumber");
    shaderProgramDepthPeelAccum.depthPeelSamplers = gl.getUniformLocation(shaderProgramDepthPeelAccum, "depthPeelSamplers");
    shaderProgramDepthPeelAccum.xSSAOScaling = gl.getUniformLocation(shaderProgramDepthPeelAccum, "xSSAOScaling");
    shaderProgramDepthPeelAccum.ySSAOScaling = gl.getUniformLocation(shaderProgramDepthPeelAccum, "ySSAOScaling");
    shaderProgramDepthPeelAccum.colorPeelSamplers = gl.getUniformLocation(shaderProgramDepthPeelAccum, "colorPeelSamplers");

    return shaderProgramDepthPeelAccum

}

export function initShadersTextured(vertexShader, fragmentShader, gl) {

    const shaderProgramTextured = gl.createProgram();

    gl.attachShader(shaderProgramTextured, vertexShader);
    gl.attachShader(shaderProgramTextured, fragmentShader);
    gl.bindAttribLocation(shaderProgramTextured, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramTextured, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramTextured);

    if (!gl.getProgramParameter(shaderProgramTextured, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initShadersTextured)");
        console.log(gl.getProgramInfoLog(shaderProgramTextured));
    }

    gl.useProgram(shaderProgramTextured);

    shaderProgramTextured.vertexPositionAttribute = gl.getAttribLocation(shaderProgramTextured, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramTextured.vertexPositionAttribute);

    shaderProgramTextured.vertexTextureAttribute = gl.getAttribLocation(shaderProgramTextured, "aVertexTexture");
    gl.enableVertexAttribArray(shaderProgramTextured.vertexTextureAttribute);

    shaderProgramTextured.pMatrixUniform = gl.getUniformLocation(shaderProgramTextured, "uPMatrix");
    shaderProgramTextured.mvMatrixUniform = gl.getUniformLocation(shaderProgramTextured, "uMVMatrix");
    shaderProgramTextured.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramTextured, "uMVINVMatrix");

    shaderProgramTextured.fog_start = gl.getUniformLocation(shaderProgramTextured, "fog_start");
    shaderProgramTextured.fog_end = gl.getUniformLocation(shaderProgramTextured, "fog_end");
    shaderProgramTextured.fogColour = gl.getUniformLocation(shaderProgramTextured, "fogColour");

    shaderProgramTextured.clipPlane0 = gl.getUniformLocation(shaderProgramTextured, "clipPlane0");
    shaderProgramTextured.clipPlane1 = gl.getUniformLocation(shaderProgramTextured, "clipPlane1");
    shaderProgramTextured.clipPlane2 = gl.getUniformLocation(shaderProgramTextured, "clipPlane2");
    shaderProgramTextured.clipPlane3 = gl.getUniformLocation(shaderProgramTextured, "clipPlane3");
    shaderProgramTextured.clipPlane4 = gl.getUniformLocation(shaderProgramTextured, "clipPlane4");
    shaderProgramTextured.clipPlane5 = gl.getUniformLocation(shaderProgramTextured, "clipPlane5");
    shaderProgramTextured.clipPlane6 = gl.getUniformLocation(shaderProgramTextured, "clipPlane6");
    shaderProgramTextured.clipPlane7 = gl.getUniformLocation(shaderProgramTextured, "clipPlane7");
    shaderProgramTextured.nClipPlanes = gl.getUniformLocation(shaderProgramTextured, "nClipPlanes");

    shaderProgramTextured.valueMap = gl.getUniformLocation(shaderProgramTextured, "valueMap");
    shaderProgramTextured.colorMap = gl.getUniformLocation(shaderProgramTextured, "colorMap");

    return shaderProgramTextured

}

export function initShaders(vertexShader, fragmentShader, gl) {

    const shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.bindAttribLocation(shaderProgram, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgram, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgram, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgram, 3, "aVertexTexture");
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initShaders)");
        console.log(gl.getProgramInfoLog(shaderProgram));
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexColourAttribute = gl.getAttribLocation(shaderProgram, "aVertexColour");
    gl.enableVertexAttribArray(shaderProgram.vertexColourAttribute);

    shaderProgram.vertexTextureAttribute = gl.getAttribLocation(shaderProgram, "aVertexTexture");
    if(shaderProgram.vertexTextureAttribute>1) gl.enableVertexAttribArray(shaderProgram.vertexTextureAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.mvInvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVINVMatrix");
    shaderProgram.textureMatrixUniform = gl.getUniformLocation(shaderProgram, "TextureMatrix");

    shaderProgram.fog_start = gl.getUniformLocation(shaderProgram, "fog_start");
    shaderProgram.fog_end = gl.getUniformLocation(shaderProgram, "fog_end");
    shaderProgram.fogColour = gl.getUniformLocation(shaderProgram, "fogColour");
    shaderProgram.ShadowMap = gl.getUniformLocation(shaderProgram, "ShadowMap");
    shaderProgram.SSAOMap = gl.getUniformLocation(shaderProgram, "SSAOMap");
    shaderProgram.edgeDetectMap = gl.getUniformLocation(shaderProgram, "edgeDetectMap");
    shaderProgram.xPixelOffset = gl.getUniformLocation(shaderProgram, "xPixelOffset");
    shaderProgram.yPixelOffset = gl.getUniformLocation(shaderProgram, "yPixelOffset");
    shaderProgram.xSSAOScaling = gl.getUniformLocation(shaderProgram, "xSSAOScaling");
    shaderProgram.ySSAOScaling = gl.getUniformLocation(shaderProgram, "ySSAOScaling");
    shaderProgram.doShadows = gl.getUniformLocation(shaderProgram, "doShadows");
    shaderProgram.doSSAO = gl.getUniformLocation(shaderProgram, "doSSAO");
    shaderProgram.doEdgeDetect = gl.getUniformLocation(shaderProgram, "doEdgeDetect");
    shaderProgram.occludeDiffuse = gl.getUniformLocation(shaderProgram, "occludeDiffuse");
    shaderProgram.doPerspective = gl.getUniformLocation(shaderProgram, "doPerspective");
    shaderProgram.shadowQuality = gl.getUniformLocation(shaderProgram, "shadowQuality");

    shaderProgram.clipPlane0 = gl.getUniformLocation(shaderProgram, "clipPlane0");
    shaderProgram.clipPlane1 = gl.getUniformLocation(shaderProgram, "clipPlane1");
    shaderProgram.clipPlane2 = gl.getUniformLocation(shaderProgram, "clipPlane2");
    shaderProgram.clipPlane3 = gl.getUniformLocation(shaderProgram, "clipPlane3");
    shaderProgram.clipPlane4 = gl.getUniformLocation(shaderProgram, "clipPlane4");
    shaderProgram.clipPlane5 = gl.getUniformLocation(shaderProgram, "clipPlane5");
    shaderProgram.clipPlane6 = gl.getUniformLocation(shaderProgram, "clipPlane6");
    shaderProgram.clipPlane7 = gl.getUniformLocation(shaderProgram, "clipPlane7");
    shaderProgram.nClipPlanes = gl.getUniformLocation(shaderProgram, "nClipPlanes");

    shaderProgram.cursorPos = gl.getUniformLocation(shaderProgram, "cursorPos");

    shaderProgram.shinyBack = gl.getUniformLocation(shaderProgram, "shinyBack");
    shaderProgram.defaultColour = gl.getUniformLocation(shaderProgram, "defaultColour");
    shaderProgram.backColour = gl.getUniformLocation(shaderProgram, "backColour");

    shaderProgram.light_positions = gl.getUniformLocation(shaderProgram, "light_positions");
    shaderProgram.light_colours_ambient = gl.getUniformLocation(shaderProgram, "light_colours_ambient");
    shaderProgram.light_colours_specular = gl.getUniformLocation(shaderProgram, "light_colours_specular");
    shaderProgram.light_colours_diffuse = gl.getUniformLocation(shaderProgram, "light_colours_diffuse");

    shaderProgram.specularPower = gl.getUniformLocation(shaderProgram, "specularPower");
    shaderProgram.screenZ = gl.getUniformLocation(shaderProgram, "screenZFrag");

    shaderProgram.peelNumber = gl.getUniformLocation(shaderProgram, "peelNumber");
    shaderProgram.depthPeelSamplers = gl.getUniformLocation(shaderProgram, "depthPeelSamplers");

    return shaderProgram

}

export function initShadersInstanced(vertexShader, fragmentShader, gl) {

    const shaderProgramInstanced = gl.createProgram();

    gl.attachShader(shaderProgramInstanced, vertexShader);
    gl.attachShader(shaderProgramInstanced, fragmentShader);
    gl.bindAttribLocation(shaderProgramInstanced, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramInstanced, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramInstanced, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramInstanced, 3, "aVertexTexture");
    gl.bindAttribLocation(shaderProgramInstanced, 4, "instancePosition");
    gl.bindAttribLocation(shaderProgramInstanced, 5, "instanceSize");
    gl.bindAttribLocation(shaderProgramInstanced, 6, "instanceOrientation");
    gl.linkProgram(shaderProgramInstanced);

    if (!gl.getProgramParameter(shaderProgramInstanced, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initShadersInstanced)");
        console.log(gl.getProgramInfoLog(shaderProgramInstanced));
    }

    gl.useProgram(shaderProgramInstanced);

    shaderProgramInstanced.vertexNormalAttribute = gl.getAttribLocation(shaderProgramInstanced, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgramInstanced.vertexNormalAttribute);

    shaderProgramInstanced.vertexPositionAttribute = gl.getAttribLocation(shaderProgramInstanced, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramInstanced.vertexPositionAttribute);

    shaderProgramInstanced.vertexColourAttribute = gl.getAttribLocation(shaderProgramInstanced, "aVertexColour");
    gl.enableVertexAttribArray(shaderProgramInstanced.vertexColourAttribute);

    shaderProgramInstanced.vertexTextureAttribute = gl.getAttribLocation(shaderProgramInstanced, "aVertexTexture");
    if(shaderProgramInstanced.vertexTextureAttribute>1) gl.enableVertexAttribArray(shaderProgramInstanced.vertexTextureAttribute);

    shaderProgramInstanced.vertexInstanceOriginAttribute = gl.getAttribLocation(shaderProgramInstanced, "instancePosition");
    shaderProgramInstanced.vertexInstanceSizeAttribute = gl.getAttribLocation(shaderProgramInstanced, "instanceSize");
    shaderProgramInstanced.vertexInstanceOrientationAttribute = gl.getAttribLocation(shaderProgramInstanced, "instanceOrientation");

    gl.enableVertexAttribArray(shaderProgramInstanced.vertexColourAttribute);

    shaderProgramInstanced.pMatrixUniform = gl.getUniformLocation(shaderProgramInstanced, "uPMatrix");
    shaderProgramInstanced.mvMatrixUniform = gl.getUniformLocation(shaderProgramInstanced, "uMVMatrix");
    shaderProgramInstanced.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramInstanced, "uMVINVMatrix");
    shaderProgramInstanced.textureMatrixUniform = gl.getUniformLocation(shaderProgramInstanced, "TextureMatrix");
    shaderProgramInstanced.outlineSize = gl.getUniformLocation(shaderProgramInstanced, "outlineSize");

    shaderProgramInstanced.fog_start = gl.getUniformLocation(shaderProgramInstanced, "fog_start");
    shaderProgramInstanced.fog_end = gl.getUniformLocation(shaderProgramInstanced, "fog_end");
    shaderProgramInstanced.fogColour = gl.getUniformLocation(shaderProgramInstanced, "fogColour");
    shaderProgramInstanced.ShadowMap = gl.getUniformLocation(shaderProgramInstanced, "ShadowMap");
    shaderProgramInstanced.SSAOMap = gl.getUniformLocation(shaderProgramInstanced, "SSAOMap");
    shaderProgramInstanced.edgeDetectMap = gl.getUniformLocation(shaderProgramInstanced, "edgeDetectMap");
    shaderProgramInstanced.xPixelOffset = gl.getUniformLocation(shaderProgramInstanced, "xPixelOffset");
    shaderProgramInstanced.yPixelOffset = gl.getUniformLocation(shaderProgramInstanced, "yPixelOffset");
    shaderProgramInstanced.xSSAOScaling = gl.getUniformLocation(shaderProgramInstanced, "xSSAOScaling");
    shaderProgramInstanced.ySSAOScaling = gl.getUniformLocation(shaderProgramInstanced, "ySSAOScaling");
    shaderProgramInstanced.doShadows = gl.getUniformLocation(shaderProgramInstanced, "doShadows");
    shaderProgramInstanced.doSSAO = gl.getUniformLocation(shaderProgramInstanced, "doSSAO");
    shaderProgramInstanced.doEdgeDetect = gl.getUniformLocation(shaderProgramInstanced, "doEdgeDetect");
    shaderProgramInstanced.occludeDiffuse = gl.getUniformLocation(shaderProgramInstanced, "occludeDiffuse");
    shaderProgramInstanced.doPerspective = gl.getUniformLocation(shaderProgramInstanced, "doPerspective");
    shaderProgramInstanced.shadowQuality = gl.getUniformLocation(shaderProgramInstanced, "shadowQuality");

    shaderProgramInstanced.clipPlane0 = gl.getUniformLocation(shaderProgramInstanced, "clipPlane0");
    shaderProgramInstanced.clipPlane1 = gl.getUniformLocation(shaderProgramInstanced, "clipPlane1");
    shaderProgramInstanced.clipPlane2 = gl.getUniformLocation(shaderProgramInstanced, "clipPlane2");
    shaderProgramInstanced.clipPlane3 = gl.getUniformLocation(shaderProgramInstanced, "clipPlane3");
    shaderProgramInstanced.clipPlane4 = gl.getUniformLocation(shaderProgramInstanced, "clipPlane4");
    shaderProgramInstanced.clipPlane5 = gl.getUniformLocation(shaderProgramInstanced, "clipPlane5");
    shaderProgramInstanced.clipPlane6 = gl.getUniformLocation(shaderProgramInstanced, "clipPlane6");
    shaderProgramInstanced.clipPlane7 = gl.getUniformLocation(shaderProgramInstanced, "clipPlane7");
    shaderProgramInstanced.nClipPlanes = gl.getUniformLocation(shaderProgramInstanced, "nClipPlanes");

    shaderProgramInstanced.cursorPos = gl.getUniformLocation(shaderProgramInstanced, "cursorPos");

    shaderProgramInstanced.shinyBack = gl.getUniformLocation(shaderProgramInstanced, "shinyBack");
    shaderProgramInstanced.defaultColour = gl.getUniformLocation(shaderProgramInstanced, "defaultColour");
    shaderProgramInstanced.backColour = gl.getUniformLocation(shaderProgramInstanced, "backColour");

    shaderProgramInstanced.light_positions = gl.getUniformLocation(shaderProgramInstanced, "light_positions");
    shaderProgramInstanced.light_colours_ambient = gl.getUniformLocation(shaderProgramInstanced, "light_colours_ambient");
    shaderProgramInstanced.light_colours_specular = gl.getUniformLocation(shaderProgramInstanced, "light_colours_specular");
    shaderProgramInstanced.light_colours_diffuse = gl.getUniformLocation(shaderProgramInstanced, "light_colours_diffuse");

    shaderProgramInstanced.specularPower = gl.getUniformLocation(shaderProgramInstanced, "specularPower");
    shaderProgramInstanced.screenZ = gl.getUniformLocation(shaderProgramInstanced, "screenZFrag");

    shaderProgramInstanced.peelNumber = gl.getUniformLocation(shaderProgramInstanced, "peelNumber");
    shaderProgramInstanced.depthPeelSamplers = gl.getUniformLocation(shaderProgramInstanced, "depthPeelSamplers");

    return shaderProgramInstanced

}

export function initGBufferThickLineNormalShaders(vertexShader, fragmentShader, gl) {
    //initGBufferThickLineNormalShaders
    const shaderProgramGBuffersThickLinesNormal = gl.createProgram();
    gl.attachShader(shaderProgramGBuffersThickLinesNormal, vertexShader);
    gl.attachShader(shaderProgramGBuffersThickLinesNormal, fragmentShader);
    gl.bindAttribLocation(shaderProgramGBuffersThickLinesNormal, 0, "aVertexPosition");
    //gl.bindAttribLocation(shaderProgramGBuffersThickLinesNormal, 1, "aVertexColour");
    //gl.bindAttribLocation(shaderProgramGBuffersThickLinesNormal, 2, "aVertexNormal");
    //gl.bindAttribLocation(shaderProgramGBuffersThickLinesNormal, 8, "aVertexRealNormal");//4,5,6,7 Give wrong normals. Why?
    gl.linkProgram(shaderProgramGBuffersThickLinesNormal);

    if (!gl.getProgramParameter(shaderProgramGBuffersThickLinesNormal, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initGBufferThickLineNormalShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramGBuffersThickLinesNormal));
    }

    gl.useProgram(shaderProgramGBuffersThickLinesNormal);

    shaderProgramGBuffersThickLinesNormal.vertexPositionAttribute = gl.getAttribLocation(shaderProgramGBuffersThickLinesNormal, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramGBuffersThickLinesNormal.vertexPositionAttribute);

    shaderProgramGBuffersThickLinesNormal.vertexNormalAttribute = gl.getAttribLocation(shaderProgramGBuffersThickLinesNormal, "aVertexNormal");
    //gl.enableVertexAttribArray(shaderProgramGBuffersThickLinesNormal.vertexNormalAttribute);

    shaderProgramGBuffersThickLinesNormal.vertexRealNormalAttribute = gl.getAttribLocation(shaderProgramGBuffersThickLinesNormal, "aVertexRealNormal");
    //gl.enableVertexAttribArray(shaderProgramGBuffersThickLinesNormal.vertexRealNormalAttribute);

    shaderProgramGBuffersThickLinesNormal.pMatrixUniform = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "uPMatrix");
    shaderProgramGBuffersThickLinesNormal.mvMatrixUniform = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "uMVMatrix");
    shaderProgramGBuffersThickLinesNormal.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "uMVINVMatrix");
    shaderProgramGBuffersThickLinesNormal.screenZ = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "screenZ");

    shaderProgramGBuffersThickLinesNormal.clipPlane0 = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "clipPlane0");
    shaderProgramGBuffersThickLinesNormal.clipPlane1 = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "clipPlane1");
    shaderProgramGBuffersThickLinesNormal.clipPlane2 = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "clipPlane2");
    shaderProgramGBuffersThickLinesNormal.clipPlane3 = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "clipPlane3");
    shaderProgramGBuffersThickLinesNormal.clipPlane4 = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "clipPlane4");
    shaderProgramGBuffersThickLinesNormal.clipPlane5 = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "clipPlane5");
    shaderProgramGBuffersThickLinesNormal.clipPlane6 = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "clipPlane6");
    shaderProgramGBuffersThickLinesNormal.clipPlane7 = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "clipPlane7");
    shaderProgramGBuffersThickLinesNormal.nClipPlanes = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "nClipPlanes");

    shaderProgramGBuffersThickLinesNormal.pixelZoom = gl.getUniformLocation(shaderProgramGBuffersThickLinesNormal, "pixelZoom");

    return shaderProgramGBuffersThickLinesNormal

}

export function initThickLineNormalShaders(vertexShader, fragmentShader, gl) {

    const shaderProgramThickLinesNormal = gl.createProgram();
    gl.attachShader(shaderProgramThickLinesNormal, vertexShader);
    gl.attachShader(shaderProgramThickLinesNormal, fragmentShader);
    gl.bindAttribLocation(shaderProgramThickLinesNormal, 0, "aVertexPosition");
    //gl.bindAttribLocation(shaderProgramThickLinesNormal, 1, "aVertexColour");
    //gl.bindAttribLocation(shaderProgramThickLinesNormal, 2, "aVertexNormal");
    //gl.bindAttribLocation(shaderProgramThickLinesNormal, 8, "aVertexRealNormal");//4,5,6,7 Give wrong normals. Why?
    gl.linkProgram(shaderProgramThickLinesNormal);

    if (!gl.getProgramParameter(shaderProgramThickLinesNormal, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initThickLineNormalShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramThickLinesNormal));
    }

    gl.useProgram(shaderProgramThickLinesNormal);

    shaderProgramThickLinesNormal.vertexPositionAttribute = gl.getAttribLocation(shaderProgramThickLinesNormal, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexPositionAttribute);

    shaderProgramThickLinesNormal.vertexColourAttribute = gl.getAttribLocation(shaderProgramThickLinesNormal, "aVertexColour");
    gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexColourAttribute);

    shaderProgramThickLinesNormal.vertexNormalAttribute = gl.getAttribLocation(shaderProgramThickLinesNormal, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexNormalAttribute);

    shaderProgramThickLinesNormal.vertexRealNormalAttribute = gl.getAttribLocation(shaderProgramThickLinesNormal, "aVertexRealNormal");
    gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexRealNormalAttribute);

    shaderProgramThickLinesNormal.pMatrixUniform = gl.getUniformLocation(shaderProgramThickLinesNormal, "uPMatrix");
    shaderProgramThickLinesNormal.mvMatrixUniform = gl.getUniformLocation(shaderProgramThickLinesNormal, "uMVMatrix");
    shaderProgramThickLinesNormal.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramThickLinesNormal, "uMVINVMatrix");
    shaderProgramThickLinesNormal.screenZ = gl.getUniformLocation(shaderProgramThickLinesNormal, "screenZ");
    shaderProgramThickLinesNormal.textureMatrixUniform = gl.getUniformLocation(shaderProgramThickLinesNormal, "TextureMatrix");

    shaderProgramThickLinesNormal.fog_start = gl.getUniformLocation(shaderProgramThickLinesNormal, "fog_start");
    shaderProgramThickLinesNormal.fog_end = gl.getUniformLocation(shaderProgramThickLinesNormal, "fog_end");
    shaderProgramThickLinesNormal.fogColour = gl.getUniformLocation(shaderProgramThickLinesNormal, "fogColour");
    shaderProgramThickLinesNormal.ShadowMap = gl.getUniformLocation(shaderProgramThickLinesNormal, "ShadowMap");
    shaderProgramThickLinesNormal.SSAOMap = gl.getUniformLocation(shaderProgramThickLinesNormal, "SSAOMap");
    shaderProgramThickLinesNormal.edgeDetectMap = gl.getUniformLocation(shaderProgramThickLinesNormal, "edgeDetectMap");
    shaderProgramThickLinesNormal.xPixelOffset = gl.getUniformLocation(shaderProgramThickLinesNormal, "xPixelOffset");
    shaderProgramThickLinesNormal.yPixelOffset = gl.getUniformLocation(shaderProgramThickLinesNormal, "yPixelOffset");
    shaderProgramThickLinesNormal.doShadows = gl.getUniformLocation(shaderProgramThickLinesNormal, "doShadows");
    shaderProgramThickLinesNormal.doSSAO = gl.getUniformLocation(shaderProgramThickLinesNormal, "doSSAO");
    shaderProgramThickLinesNormal.doEdgeDetect = gl.getUniformLocation(shaderProgramThickLinesNormal, "doEdgeDetect");
    shaderProgramThickLinesNormal.xSSAOScaling = gl.getUniformLocation(shaderProgramThickLinesNormal, "xSSAOScaling");
    shaderProgramThickLinesNormal.ySSAOScaling = gl.getUniformLocation(shaderProgramThickLinesNormal, "ySSAOScaling");
    shaderProgramThickLinesNormal.occludeDiffuse = gl.getUniformLocation(shaderProgramThickLinesNormal, "occludeDiffuse");
    shaderProgramThickLinesNormal.doPerspective = gl.getUniformLocation(shaderProgramThickLinesNormal, "doPerspective");
    shaderProgramThickLinesNormal.shadowQuality = gl.getUniformLocation(shaderProgramThickLinesNormal, "shadowQuality");
    shaderProgramThickLinesNormal.clipPlane0 = gl.getUniformLocation(shaderProgramThickLinesNormal, "clipPlane0");
    shaderProgramThickLinesNormal.clipPlane1 = gl.getUniformLocation(shaderProgramThickLinesNormal, "clipPlane1");
    shaderProgramThickLinesNormal.clipPlane2 = gl.getUniformLocation(shaderProgramThickLinesNormal, "clipPlane2");
    shaderProgramThickLinesNormal.clipPlane3 = gl.getUniformLocation(shaderProgramThickLinesNormal, "clipPlane3");
    shaderProgramThickLinesNormal.clipPlane4 = gl.getUniformLocation(shaderProgramThickLinesNormal, "clipPlane4");
    shaderProgramThickLinesNormal.clipPlane5 = gl.getUniformLocation(shaderProgramThickLinesNormal, "clipPlane5");
    shaderProgramThickLinesNormal.clipPlane6 = gl.getUniformLocation(shaderProgramThickLinesNormal, "clipPlane6");
    shaderProgramThickLinesNormal.clipPlane7 = gl.getUniformLocation(shaderProgramThickLinesNormal, "clipPlane7");
    shaderProgramThickLinesNormal.nClipPlanes = gl.getUniformLocation(shaderProgramThickLinesNormal, "nClipPlanes");

    shaderProgramThickLinesNormal.pixelZoom = gl.getUniformLocation(shaderProgramThickLinesNormal, "pixelZoom");

    shaderProgramThickLinesNormal.light_positions = gl.getUniformLocation(shaderProgramThickLinesNormal, "light_positions");
    shaderProgramThickLinesNormal.light_colours_ambient = gl.getUniformLocation(shaderProgramThickLinesNormal, "light_colours_ambient");
    shaderProgramThickLinesNormal.light_colours_specular = gl.getUniformLocation(shaderProgramThickLinesNormal, "light_colours_specular");
    shaderProgramThickLinesNormal.light_colours_diffuse = gl.getUniformLocation(shaderProgramThickLinesNormal, "light_colours_diffuse");

    shaderProgramThickLinesNormal.specularPower = gl.getUniformLocation(shaderProgramThickLinesNormal, "specularPower");

    shaderProgramThickLinesNormal.peelNumber = gl.getUniformLocation(shaderProgramThickLinesNormal, "peelNumber");
    shaderProgramThickLinesNormal.depthPeelSamplers = gl.getUniformLocation(shaderProgramThickLinesNormal, "depthPeelSamplers");

    return shaderProgramThickLinesNormal

}

export function initThickLineShaders(vertexShader, fragmentShader, gl) {

    const shaderProgramThickLines = gl.createProgram();
    gl.attachShader(shaderProgramThickLines, vertexShader);
    gl.attachShader(shaderProgramThickLines, fragmentShader);
    gl.bindAttribLocation(shaderProgramThickLines, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramThickLines, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramThickLines, 2, "aVertexNormal");
    gl.linkProgram(shaderProgramThickLines);

    if (!gl.getProgramParameter(shaderProgramThickLines, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initThickLineShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramThickLines));
    }

    gl.useProgram(shaderProgramThickLines);

    shaderProgramThickLines.vertexPositionAttribute = gl.getAttribLocation(shaderProgramThickLines, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramThickLines.vertexPositionAttribute);

    shaderProgramThickLines.vertexColourAttribute = gl.getAttribLocation(shaderProgramThickLines, "aVertexColour");
    gl.enableVertexAttribArray(shaderProgramThickLines.vertexColourAttribute);

    shaderProgramThickLines.vertexNormalAttribute = gl.getAttribLocation(shaderProgramThickLines, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgramThickLines.vertexNormalAttribute);

    shaderProgramThickLines.pMatrixUniform = gl.getUniformLocation(shaderProgramThickLines, "uPMatrix");
    shaderProgramThickLines.mvMatrixUniform = gl.getUniformLocation(shaderProgramThickLines, "uMVMatrix");
    shaderProgramThickLines.screenZ = gl.getUniformLocation(shaderProgramThickLines, "screenZ");

    shaderProgramThickLines.fog_start = gl.getUniformLocation(shaderProgramThickLines, "fog_start");
    shaderProgramThickLines.fog_end = gl.getUniformLocation(shaderProgramThickLines, "fog_end");
    shaderProgramThickLines.fogColour = gl.getUniformLocation(shaderProgramThickLines, "fogColour");
    shaderProgramThickLines.clipPlane0 = gl.getUniformLocation(shaderProgramThickLines, "clipPlane0");
    shaderProgramThickLines.clipPlane1 = gl.getUniformLocation(shaderProgramThickLines, "clipPlane1");
    shaderProgramThickLines.clipPlane2 = gl.getUniformLocation(shaderProgramThickLines, "clipPlane2");
    shaderProgramThickLines.clipPlane3 = gl.getUniformLocation(shaderProgramThickLines, "clipPlane3");
    shaderProgramThickLines.clipPlane4 = gl.getUniformLocation(shaderProgramThickLines, "clipPlane4");
    shaderProgramThickLines.clipPlane5 = gl.getUniformLocation(shaderProgramThickLines, "clipPlane5");
    shaderProgramThickLines.clipPlane6 = gl.getUniformLocation(shaderProgramThickLines, "clipPlane6");
    shaderProgramThickLines.clipPlane7 = gl.getUniformLocation(shaderProgramThickLines, "clipPlane7");
    shaderProgramThickLines.nClipPlanes = gl.getUniformLocation(shaderProgramThickLines, "nClipPlanes");

    shaderProgramThickLines.pixelZoom = gl.getUniformLocation(shaderProgramThickLines, "pixelZoom");

    shaderProgramThickLines.peelNumber = gl.getUniformLocation(shaderProgramThickLines, "peelNumber");
    shaderProgramThickLines.depthPeelSamplers = gl.getUniformLocation(shaderProgramThickLines, "depthPeelSamplers");

    return shaderProgramThickLines

}

export function initLineShaders(vertexShader, fragmentShader, gl) {

    const shaderProgramLines = gl.createProgram();
    gl.attachShader(shaderProgramLines, vertexShader);
    gl.attachShader(shaderProgramLines, fragmentShader);
    gl.bindAttribLocation(shaderProgramLines, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramLines, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramLines, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramLines, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramLines);

    if (!gl.getProgramParameter(shaderProgramLines, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initLineShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramLines));
    }

    gl.useProgram(shaderProgramLines);

    shaderProgramLines.vertexPositionAttribute = gl.getAttribLocation(shaderProgramLines, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramLines.vertexPositionAttribute);

    shaderProgramLines.vertexColourAttribute = gl.getAttribLocation(shaderProgramLines, "aVertexColour");
    gl.enableVertexAttribArray(shaderProgramLines.vertexColourAttribute);

    shaderProgramLines.vertexNormalAttribute = -1;

    shaderProgramLines.pMatrixUniform = gl.getUniformLocation(shaderProgramLines, "uPMatrix");
    shaderProgramLines.mvMatrixUniform = gl.getUniformLocation(shaderProgramLines, "uMVMatrix");
    shaderProgramLines.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramLines, "uMVINVMatrix");

    shaderProgramLines.fog_start = gl.getUniformLocation(shaderProgramLines, "fog_start");
    shaderProgramLines.fog_end = gl.getUniformLocation(shaderProgramLines, "fog_end");
    shaderProgramLines.fogColour = gl.getUniformLocation(shaderProgramLines, "fogColour");
    shaderProgramLines.clipPlane0 = gl.getUniformLocation(shaderProgramLines, "clipPlane0");
    shaderProgramLines.clipPlane1 = gl.getUniformLocation(shaderProgramLines, "clipPlane1");
    shaderProgramLines.clipPlane2 = gl.getUniformLocation(shaderProgramLines, "clipPlane2");
    shaderProgramLines.clipPlane3 = gl.getUniformLocation(shaderProgramLines, "clipPlane3");
    shaderProgramLines.clipPlane4 = gl.getUniformLocation(shaderProgramLines, "clipPlane4");
    shaderProgramLines.clipPlane5 = gl.getUniformLocation(shaderProgramLines, "clipPlane5");
    shaderProgramLines.clipPlane6 = gl.getUniformLocation(shaderProgramLines, "clipPlane6");
    shaderProgramLines.clipPlane7 = gl.getUniformLocation(shaderProgramLines, "clipPlane7");
    shaderProgramLines.nClipPlanes = gl.getUniformLocation(shaderProgramLines, "nClipPlanes");

    shaderProgramLines.peelNumber = gl.getUniformLocation(shaderProgramLines, "peelNumber");
    shaderProgramLines.depthPeelSamplers = gl.getUniformLocation(shaderProgramLines, "depthPeelSamplers");

    return shaderProgramLines

}

export function initDepthShadowPerfectSphereShaders(vertexShader, fragmentShader, gl) {
    const shaderDepthShadowProgramPerfectSpheres = gl.createProgram();
    gl.attachShader(shaderDepthShadowProgramPerfectSpheres, vertexShader);
    gl.attachShader(shaderDepthShadowProgramPerfectSpheres, fragmentShader);
    gl.bindAttribLocation(shaderDepthShadowProgramPerfectSpheres, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderDepthShadowProgramPerfectSpheres, 1, "aVertexColour");
    gl.bindAttribLocation(shaderDepthShadowProgramPerfectSpheres, 3, "aVertexTexture");
    gl.bindAttribLocation(shaderDepthShadowProgramPerfectSpheres, 8, "size");
    gl.bindAttribLocation(shaderDepthShadowProgramPerfectSpheres, 9, "offset");
    gl.linkProgram(shaderDepthShadowProgramPerfectSpheres);

    if (!gl.getProgramParameter(shaderDepthShadowProgramPerfectSpheres, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initDepthShadowPerfectSphereShaders)");
        console.log(gl.getProgramInfoLog(shaderDepthShadowProgramPerfectSpheres));
    }

    gl.useProgram(shaderDepthShadowProgramPerfectSpheres);

    shaderDepthShadowProgramPerfectSpheres.vertexPositionAttribute = gl.getAttribLocation(shaderDepthShadowProgramPerfectSpheres, "aVertexPosition");
    //gl.enableVertexAttribArray(shaderDepthShadowProgramPerfectSpheres.vertexPositionAttribute);

    shaderDepthShadowProgramPerfectSpheres.vertexColourAttribute = gl.getAttribLocation(shaderDepthShadowProgramPerfectSpheres, "aVertexColour");
    //gl.enableVertexAttribArray(shaderDepthShadowProgramPerfectSpheres.vertexColourAttribute);

    shaderDepthShadowProgramPerfectSpheres.vertexTextureAttribute = gl.getAttribLocation(shaderDepthShadowProgramPerfectSpheres, "aVertexTexture");
    //gl.enableVertexAttribArray(shaderDepthShadowProgramPerfectSpheres.vertexTextureAttribute);

    shaderDepthShadowProgramPerfectSpheres.offsetAttribute = gl.getAttribLocation(shaderDepthShadowProgramPerfectSpheres, "offset");
    //gl.enableVertexAttribArray(shaderDepthShadowProgramPerfectSpheres.offsetAttribute);

    shaderDepthShadowProgramPerfectSpheres.sizeAttribute= gl.getAttribLocation(shaderDepthShadowProgramPerfectSpheres, "size");
    //gl.enableVertexAttribArray(shaderDepthShadowProgramPerfectSpheres.sizeAttribute);

    shaderDepthShadowProgramPerfectSpheres.pMatrixUniform = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "uPMatrix");
    shaderDepthShadowProgramPerfectSpheres.mvMatrixUniform = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "uMVMatrix");
    shaderDepthShadowProgramPerfectSpheres.mvInvMatrixUniform = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "uMVINVMatrix");
    shaderDepthShadowProgramPerfectSpheres.invSymMatrixUniform = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "uINVSymmMatrix");

    shaderDepthShadowProgramPerfectSpheres.fog_start = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "fog_start");
    shaderDepthShadowProgramPerfectSpheres.fog_end = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "fog_end");
    shaderDepthShadowProgramPerfectSpheres.fogColour = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "fogColour");

    shaderDepthShadowProgramPerfectSpheres.clipPlane0 = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "clipPlane0");
    shaderDepthShadowProgramPerfectSpheres.clipPlane1 = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "clipPlane1");
    shaderDepthShadowProgramPerfectSpheres.clipPlane2 = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "clipPlane2");
    shaderDepthShadowProgramPerfectSpheres.clipPlane3 = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "clipPlane3");
    shaderDepthShadowProgramPerfectSpheres.clipPlane4 = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "clipPlane4");
    shaderDepthShadowProgramPerfectSpheres.clipPlane5 = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "clipPlane5");
    shaderDepthShadowProgramPerfectSpheres.clipPlane6 = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "clipPlane6");
    shaderDepthShadowProgramPerfectSpheres.clipPlane7 = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "clipPlane7");
    shaderDepthShadowProgramPerfectSpheres.nClipPlanes = gl.getUniformLocation(shaderDepthShadowProgramPerfectSpheres, "nClipPlanes");

    return shaderDepthShadowProgramPerfectSpheres

}

export function initPerfectSphereOutlineShaders(vertexShader, fragmentShader, gl) {
    const shaderProgramPerfectSpheresOutline = gl.createProgram();
    gl.attachShader(shaderProgramPerfectSpheresOutline, vertexShader);
    gl.attachShader(shaderProgramPerfectSpheresOutline, fragmentShader);
    gl.bindAttribLocation(shaderProgramPerfectSpheresOutline, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramPerfectSpheresOutline, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramPerfectSpheresOutline, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramPerfectSpheresOutline, 3, "aVertexTexture");
    gl.bindAttribLocation(shaderProgramPerfectSpheresOutline, 8, "size");
    gl.bindAttribLocation(shaderProgramPerfectSpheresOutline, 9, "offset");
    gl.linkProgram(shaderProgramPerfectSpheresOutline);

    if (!gl.getProgramParameter(shaderProgramPerfectSpheresOutline, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initPerfectSphereOutlineShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramPerfectSpheresOutline));
    }

    gl.useProgram(shaderProgramPerfectSpheresOutline);

    shaderProgramPerfectSpheresOutline.vertexPositionAttribute = gl.getAttribLocation(shaderProgramPerfectSpheresOutline, "aVertexPosition");
    //gl.enableVertexAttribArray(shaderProgramPerfectSpheresOutline.vertexPositionAttribute);

    shaderProgramPerfectSpheresOutline.vertexNormalAttribute = gl.getAttribLocation(shaderProgramPerfectSpheresOutline, "aVertexNormal");
    //gl.enableVertexAttribArray(shaderProgramPerfectSpheresOutline.vertexNormalAttribute);

    shaderProgramPerfectSpheresOutline.vertexColourAttribute = gl.getAttribLocation(shaderProgramPerfectSpheresOutline, "aVertexColour");
    //gl.enableVertexAttribArray(shaderProgramPerfectSpheresOutline.vertexColourAttribute);

    shaderProgramPerfectSpheresOutline.vertexTextureAttribute = gl.getAttribLocation(shaderProgramPerfectSpheresOutline, "aVertexTexture");
    //gl.enableVertexAttribArray(shaderProgramPerfectSpheresOutline.vertexTextureAttribute);

    shaderProgramPerfectSpheresOutline.offsetAttribute = gl.getAttribLocation(shaderProgramPerfectSpheresOutline, "offset");
    //gl.enableVertexAttribArray(shaderProgramPerfectSpheresOutline.offsetAttribute);

    shaderProgramPerfectSpheresOutline.sizeAttribute= gl.getAttribLocation(shaderProgramPerfectSpheresOutline, "size");
    //gl.enableVertexAttribArray(shaderProgramPerfectSpheresOutline.sizeAttribute);

    shaderProgramPerfectSpheresOutline.pMatrixUniform = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "uPMatrix");
    shaderProgramPerfectSpheresOutline.mvMatrixUniform = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "uMVMatrix");
    shaderProgramPerfectSpheresOutline.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "uMVINVMatrix");
    shaderProgramPerfectSpheresOutline.textureMatrixUniform = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "TextureMatrix");
    shaderProgramPerfectSpheresOutline.invSymMatrixUniform = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "uINVSymmMatrix");
    shaderProgramPerfectSpheresOutline.outlineSize = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "outlineSize");

    shaderProgramPerfectSpheresOutline.fog_start = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "fog_start");
    shaderProgramPerfectSpheresOutline.fog_end = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "fog_end");
    shaderProgramPerfectSpheresOutline.fogColour = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "fogColour");

    shaderProgramPerfectSpheresOutline.scaleMatrix = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "scaleMatrix");

    shaderProgramPerfectSpheresOutline.clipPlane0 = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "clipPlane0");
    shaderProgramPerfectSpheresOutline.clipPlane1 = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "clipPlane1");
    shaderProgramPerfectSpheresOutline.clipPlane2 = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "clipPlane2");
    shaderProgramPerfectSpheresOutline.clipPlane3 = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "clipPlane3");
    shaderProgramPerfectSpheresOutline.clipPlane4 = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "clipPlane4");
    shaderProgramPerfectSpheresOutline.clipPlane5 = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "clipPlane5");
    shaderProgramPerfectSpheresOutline.clipPlane6 = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "clipPlane6");
    shaderProgramPerfectSpheresOutline.clipPlane7 = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "clipPlane7");
    shaderProgramPerfectSpheresOutline.nClipPlanes = gl.getUniformLocation(shaderProgramPerfectSpheresOutline, "nClipPlanes");

    return shaderProgramPerfectSpheresOutline

}

export function initPerfectSphereShaders(vertexShader, fragmentShader, gl) {
    const shaderProgramPerfectSpheres = gl.createProgram();
    gl.attachShader(shaderProgramPerfectSpheres, vertexShader);
    gl.attachShader(shaderProgramPerfectSpheres, fragmentShader);
    gl.bindAttribLocation(shaderProgramPerfectSpheres, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramPerfectSpheres, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramPerfectSpheres, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramPerfectSpheres, 3, "aVertexTexture");
    gl.bindAttribLocation(shaderProgramPerfectSpheres, 8, "size");
    gl.bindAttribLocation(shaderProgramPerfectSpheres, 9, "offset");
    gl.linkProgram(shaderProgramPerfectSpheres);

    if (!gl.getProgramParameter(shaderProgramPerfectSpheres, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initPerfectSphereShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramPerfectSpheres));
    }

    gl.useProgram(shaderProgramPerfectSpheres);

    shaderProgramPerfectSpheres.vertexPositionAttribute = gl.getAttribLocation(shaderProgramPerfectSpheres, "aVertexPosition");
    //gl.enableVertexAttribArray(shaderProgramPerfectSpheres.vertexPositionAttribute);

    shaderProgramPerfectSpheres.vertexNormalAttribute = gl.getAttribLocation(shaderProgramPerfectSpheres, "aVertexNormal");
    //gl.enableVertexAttribArray(shaderProgramPerfectSpheres.vertexNormalAttribute);

    shaderProgramPerfectSpheres.vertexColourAttribute = gl.getAttribLocation(shaderProgramPerfectSpheres, "aVertexColour");
    //gl.enableVertexAttribArray(shaderProgramPerfectSpheres.vertexColourAttribute);

    shaderProgramPerfectSpheres.vertexTextureAttribute = gl.getAttribLocation(shaderProgramPerfectSpheres, "aVertexTexture");
    //gl.enableVertexAttribArray(shaderProgramPerfectSpheres.vertexTextureAttribute);

    shaderProgramPerfectSpheres.offsetAttribute = gl.getAttribLocation(shaderProgramPerfectSpheres, "offset");
    //gl.enableVertexAttribArray(shaderProgramPerfectSpheres.offsetAttribute);

    shaderProgramPerfectSpheres.sizeAttribute= gl.getAttribLocation(shaderProgramPerfectSpheres, "size");
    //gl.enableVertexAttribArray(shaderProgramPerfectSpheres.sizeAttribute);

    shaderProgramPerfectSpheres.pMatrixUniform = gl.getUniformLocation(shaderProgramPerfectSpheres, "uPMatrix");
    shaderProgramPerfectSpheres.mvMatrixUniform = gl.getUniformLocation(shaderProgramPerfectSpheres, "uMVMatrix");
    shaderProgramPerfectSpheres.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramPerfectSpheres, "uMVINVMatrix");
    shaderProgramPerfectSpheres.textureMatrixUniform = gl.getUniformLocation(shaderProgramPerfectSpheres, "TextureMatrix");
    shaderProgramPerfectSpheres.invSymMatrixUniform = gl.getUniformLocation(shaderProgramPerfectSpheres, "uINVSymmMatrix");
    shaderProgramPerfectSpheres.outlineSize = gl.getUniformLocation(shaderProgramPerfectSpheres, "outlineSize");

    shaderProgramPerfectSpheres.fog_start = gl.getUniformLocation(shaderProgramPerfectSpheres, "fog_start");
    shaderProgramPerfectSpheres.fog_end = gl.getUniformLocation(shaderProgramPerfectSpheres, "fog_end");
    shaderProgramPerfectSpheres.fogColour = gl.getUniformLocation(shaderProgramPerfectSpheres, "fogColour");
    shaderProgramPerfectSpheres.ShadowMap = gl.getUniformLocation(shaderProgramPerfectSpheres, "ShadowMap");
    shaderProgramPerfectSpheres.SSAOMap = gl.getUniformLocation(shaderProgramPerfectSpheres, "SSAOMap");
    shaderProgramPerfectSpheres.edgeDetectMap = gl.getUniformLocation(shaderProgramPerfectSpheres, "edgeDetectMap");
    shaderProgramPerfectSpheres.xPixelOffset = gl.getUniformLocation(shaderProgramPerfectSpheres, "xPixelOffset");
    shaderProgramPerfectSpheres.yPixelOffset = gl.getUniformLocation(shaderProgramPerfectSpheres, "yPixelOffset");
    shaderProgramPerfectSpheres.xSSAOScaling = gl.getUniformLocation(shaderProgramPerfectSpheres, "xSSAOScaling");
    shaderProgramPerfectSpheres.ySSAOScaling = gl.getUniformLocation(shaderProgramPerfectSpheres, "ySSAOScaling");
    shaderProgramPerfectSpheres.doShadows = gl.getUniformLocation(shaderProgramPerfectSpheres, "doShadows");
    shaderProgramPerfectSpheres.doSSAO = gl.getUniformLocation(shaderProgramPerfectSpheres, "doSSAO");
    shaderProgramPerfectSpheres.doEdgeDetect = gl.getUniformLocation(shaderProgramPerfectSpheres, "doEdgeDetect");
    shaderProgramPerfectSpheres.occludeDiffuse = gl.getUniformLocation(shaderProgramPerfectSpheres, "occludeDiffuse");
    shaderProgramPerfectSpheres.doPerspective = gl.getUniformLocation(shaderProgramPerfectSpheres, "doPerspective");
    shaderProgramPerfectSpheres.shadowQuality = gl.getUniformLocation(shaderProgramPerfectSpheres, "shadowQuality");

    shaderProgramPerfectSpheres.scaleMatrix = gl.getUniformLocation(shaderProgramPerfectSpheres, "scaleMatrix");

    shaderProgramPerfectSpheres.light_positions = gl.getUniformLocation(shaderProgramPerfectSpheres, "light_positions");
    shaderProgramPerfectSpheres.light_colours_ambient = gl.getUniformLocation(shaderProgramPerfectSpheres, "light_colours_ambient");
    shaderProgramPerfectSpheres.light_colours_specular = gl.getUniformLocation(shaderProgramPerfectSpheres, "light_colours_specular");
    shaderProgramPerfectSpheres.light_colours_diffuse = gl.getUniformLocation(shaderProgramPerfectSpheres, "light_colours_diffuse");

    shaderProgramPerfectSpheres.specularPower = gl.getUniformLocation(shaderProgramPerfectSpheres, "specularPower");

    shaderProgramPerfectSpheres.clipPlane0 = gl.getUniformLocation(shaderProgramPerfectSpheres, "clipPlane0");
    shaderProgramPerfectSpheres.clipPlane1 = gl.getUniformLocation(shaderProgramPerfectSpheres, "clipPlane1");
    shaderProgramPerfectSpheres.clipPlane2 = gl.getUniformLocation(shaderProgramPerfectSpheres, "clipPlane2");
    shaderProgramPerfectSpheres.clipPlane3 = gl.getUniformLocation(shaderProgramPerfectSpheres, "clipPlane3");
    shaderProgramPerfectSpheres.clipPlane4 = gl.getUniformLocation(shaderProgramPerfectSpheres, "clipPlane4");
    shaderProgramPerfectSpheres.clipPlane5 = gl.getUniformLocation(shaderProgramPerfectSpheres, "clipPlane5");
    shaderProgramPerfectSpheres.clipPlane6 = gl.getUniformLocation(shaderProgramPerfectSpheres, "clipPlane6");
    shaderProgramPerfectSpheres.clipPlane7 = gl.getUniformLocation(shaderProgramPerfectSpheres, "clipPlane7");
    shaderProgramPerfectSpheres.nClipPlanes = gl.getUniformLocation(shaderProgramPerfectSpheres, "nClipPlanes");
    shaderProgramPerfectSpheres.clipCap = gl.getUniformLocation(shaderProgramPerfectSpheres, "clipCap");

    shaderProgramPerfectSpheres.peelNumber = gl.getUniformLocation(shaderProgramPerfectSpheres, "peelNumber");
    shaderProgramPerfectSpheres.depthPeelSamplers = gl.getUniformLocation(shaderProgramPerfectSpheres, "depthPeelSamplers");

    return shaderProgramPerfectSpheres

}

export function initImageShaders(vertexShader, fragmentShader, gl) {
    const shaderProgramImages = gl.createProgram();
    gl.attachShader(shaderProgramImages, vertexShader);
    gl.attachShader(shaderProgramImages, fragmentShader);
    gl.bindAttribLocation(shaderProgramImages, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramImages, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramImages, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramImages, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramImages);

    if (!gl.getProgramParameter(shaderProgramImages, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initImageShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramImages));
    }

    gl.useProgram(shaderProgramImages);

    shaderProgramImages.vertexPositionAttribute = gl.getAttribLocation(shaderProgramImages, "aVertexPosition");
    //gl.enableVertexAttribArray(shaderProgramImages.vertexPositionAttribute);

    shaderProgramImages.vertexNormalAttribute = gl.getAttribLocation(shaderProgramImages, "aVertexNormal");
    //gl.enableVertexAttribArray(shaderProgramImages.vertexNormalAttribute);

    shaderProgramImages.vertexColourAttribute = gl.getAttribLocation(shaderProgramImages, "aVertexColour");
    //gl.enableVertexAttribArray(shaderProgramImages.vertexColourAttribute);

    shaderProgramImages.vertexTextureAttribute = gl.getAttribLocation(shaderProgramImages, "aVertexTexture");

    shaderProgramImages.pMatrixUniform = gl.getUniformLocation(shaderProgramImages, "uPMatrix");
    shaderProgramImages.mvMatrixUniform = gl.getUniformLocation(shaderProgramImages, "uMVMatrix");
    shaderProgramImages.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramImages, "uMVINVMatrix");

    shaderProgramImages.fog_start = gl.getUniformLocation(shaderProgramImages, "fog_start");
    shaderProgramImages.fog_end = gl.getUniformLocation(shaderProgramImages, "fog_end");
    shaderProgramImages.fogColour = gl.getUniformLocation(shaderProgramImages, "fogColour");

    shaderProgramImages.offset = gl.getUniformLocation(shaderProgramImages, "offset");
    shaderProgramImages.size = gl.getUniformLocation(shaderProgramImages, "size");
    shaderProgramImages.scaleMatrix = gl.getUniformLocation(shaderProgramImages, "scaleMatrix");

    return shaderProgramImages

}

export function initTwoDShapesShaders(vertexShader, fragmentShader, gl) {
    const shaderProgramTwoDShapes = gl.createProgram();
    gl.attachShader(shaderProgramTwoDShapes, vertexShader);
    gl.attachShader(shaderProgramTwoDShapes, fragmentShader);
    gl.bindAttribLocation(shaderProgramTwoDShapes, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramTwoDShapes, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramTwoDShapes, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramTwoDShapes, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramTwoDShapes);

    if (!gl.getProgramParameter(shaderProgramTwoDShapes, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initTwoDShapesShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramTwoDShapes));
    }

    gl.useProgram(shaderProgramTwoDShapes);

    shaderProgramTwoDShapes.vertexPositionAttribute = gl.getAttribLocation(shaderProgramTwoDShapes, "aVertexPosition");
    //gl.enableVertexAttribArray(shaderProgramTwoDShapes.vertexPositionAttribute);

    shaderProgramTwoDShapes.vertexNormalAttribute = gl.getAttribLocation(shaderProgramTwoDShapes, "aVertexNormal");
    //gl.enableVertexAttribArray(shaderProgramTwoDShapes.vertexNormalAttribute);

    shaderProgramTwoDShapes.vertexColourAttribute = gl.getAttribLocation(shaderProgramTwoDShapes, "aVertexColour");
    //gl.enableVertexAttribArray(shaderProgramTwoDShapes.vertexColourAttribute);

    shaderProgramTwoDShapes.pMatrixUniform = gl.getUniformLocation(shaderProgramTwoDShapes, "uPMatrix");
    shaderProgramTwoDShapes.mvMatrixUniform = gl.getUniformLocation(shaderProgramTwoDShapes, "uMVMatrix");
    shaderProgramTwoDShapes.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramTwoDShapes, "uMVINVMatrix");

    shaderProgramTwoDShapes.fog_start = gl.getUniformLocation(shaderProgramTwoDShapes, "fog_start");
    shaderProgramTwoDShapes.fog_end = gl.getUniformLocation(shaderProgramTwoDShapes, "fog_end");
    shaderProgramTwoDShapes.fogColour = gl.getUniformLocation(shaderProgramTwoDShapes, "fogColour");

    shaderProgramTwoDShapes.offset = gl.getUniformLocation(shaderProgramTwoDShapes, "offset");
    shaderProgramTwoDShapes.size = gl.getUniformLocation(shaderProgramTwoDShapes, "size");
    shaderProgramTwoDShapes.scaleMatrix = gl.getUniformLocation(shaderProgramTwoDShapes, "scaleMatrix");

    return shaderProgramTwoDShapes

}


export function initPointSpheresShadowShaders(vertexShader, fragmentShader, gl) {

    const shaderProgramPointSpheresShadow = gl.createProgram();
    gl.attachShader(shaderProgramPointSpheresShadow, vertexShader);
    gl.attachShader(shaderProgramPointSpheresShadow, fragmentShader);
    gl.bindAttribLocation(shaderProgramPointSpheresShadow, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramPointSpheresShadow, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramPointSpheresShadow, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramPointSpheresShadow, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramPointSpheresShadow);

    if (!gl.getProgramParameter(shaderProgramPointSpheresShadow, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initPointSpheresShadowShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramPointSpheresShadow));
    }

    gl.useProgram(shaderProgramPointSpheresShadow);

    shaderProgramPointSpheresShadow.vertexPositionAttribute = gl.getAttribLocation(shaderProgramPointSpheresShadow, "aVertexPosition");
    //gl.enableVertexAttribArray(shaderProgramPointSpheresShadow.vertexPositionAttribute);

    shaderProgramPointSpheresShadow.vertexNormalAttribute = gl.getAttribLocation(shaderProgramPointSpheresShadow, "aVertexNormal");
    //gl.enableVertexAttribArray(shaderProgramPointSpheresShadow.vertexNormalAttribute);

    shaderProgramPointSpheresShadow.vertexColourAttribute = gl.getAttribLocation(shaderProgramPointSpheresShadow, "aVertexColour");
    //gl.enableVertexAttribArray(shaderProgramPointSpheresShadow.vertexColourAttribute);

    shaderProgramPointSpheresShadow.pMatrixUniform = gl.getUniformLocation(shaderProgramPointSpheresShadow, "uPMatrix");
    shaderProgramPointSpheresShadow.mvMatrixUniform = gl.getUniformLocation(shaderProgramPointSpheresShadow, "uMVMatrix");
    shaderProgramPointSpheresShadow.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramPointSpheresShadow, "uMVINVMatrix");
    shaderProgramPointSpheresShadow.textureMatrixUniform = gl.getUniformLocation(shaderProgramPointSpheresShadow, "TextureMatrix");

    shaderProgramPointSpheresShadow.fog_start = gl.getUniformLocation(shaderProgramPointSpheresShadow, "fog_start");
    shaderProgramPointSpheresShadow.fog_end = gl.getUniformLocation(shaderProgramPointSpheresShadow, "fog_end");
    shaderProgramPointSpheresShadow.fogColour = gl.getUniformLocation(shaderProgramPointSpheresShadow, "fogColour");

    shaderProgramPointSpheresShadow.offset = gl.getUniformLocation(shaderProgramPointSpheresShadow, "offset");
    shaderProgramPointSpheresShadow.size = gl.getUniformLocation(shaderProgramPointSpheresShadow, "size");
    shaderProgramPointSpheresShadow.scaleMatrix = gl.getUniformLocation(shaderProgramPointSpheresShadow, "scaleMatrix");

    shaderProgramPointSpheresShadow.light_positions = gl.getUniformLocation(shaderProgramPointSpheresShadow, "light_positions");
    shaderProgramPointSpheresShadow.light_colours_ambient = gl.getUniformLocation(shaderProgramPointSpheresShadow, "light_colours_ambient");
    shaderProgramPointSpheresShadow.light_colours_specular = gl.getUniformLocation(shaderProgramPointSpheresShadow, "light_colours_specular");
    shaderProgramPointSpheresShadow.light_colours_diffuse = gl.getUniformLocation(shaderProgramPointSpheresShadow, "light_colours_diffuse");

    return shaderProgramPointSpheresShadow

}

export function initPointSpheresShaders(vertexShader, fragmentShader, gl) {

    const shaderProgramPointSpheres = gl.createProgram();
    gl.attachShader(shaderProgramPointSpheres, vertexShader);
    gl.attachShader(shaderProgramPointSpheres, fragmentShader);
    gl.bindAttribLocation(shaderProgramPointSpheres, 0, "aVertexPosition");
    gl.bindAttribLocation(shaderProgramPointSpheres, 1, "aVertexColour");
    gl.bindAttribLocation(shaderProgramPointSpheres, 2, "aVertexNormal");
    gl.bindAttribLocation(shaderProgramPointSpheres, 3, "aVertexTexture");
    gl.linkProgram(shaderProgramPointSpheres);

    if (!gl.getProgramParameter(shaderProgramPointSpheres, gl.LINK_STATUS)) {
        alert("Could not initialise shaders (initPointSpheresShaders)");
        console.log(gl.getProgramInfoLog(shaderProgramPointSpheres));
    }

    gl.useProgram(shaderProgramPointSpheres);

    shaderProgramPointSpheres.vertexPositionAttribute = gl.getAttribLocation(shaderProgramPointSpheres, "aVertexPosition");
    //gl.enableVertexAttribArray(shaderProgramPointSpheres.vertexPositionAttribute);

    shaderProgramPointSpheres.vertexNormalAttribute = gl.getAttribLocation(shaderProgramPointSpheres, "aVertexNormal");
    //gl.enableVertexAttribArray(shaderProgramPointSpheres.vertexNormalAttribute);

    shaderProgramPointSpheres.vertexColourAttribute = gl.getAttribLocation(shaderProgramPointSpheres, "aVertexColour");
    //gl.enableVertexAttribArray(shaderProgramPointSpheres.vertexColourAttribute);

    shaderProgramPointSpheres.pMatrixUniform = gl.getUniformLocation(shaderProgramPointSpheres, "uPMatrix");
    shaderProgramPointSpheres.mvMatrixUniform = gl.getUniformLocation(shaderProgramPointSpheres, "uMVMatrix");
    shaderProgramPointSpheres.mvInvMatrixUniform = gl.getUniformLocation(shaderProgramPointSpheres, "uMVINVMatrix");

    shaderProgramPointSpheres.fog_start = gl.getUniformLocation(shaderProgramPointSpheres, "fog_start");
    shaderProgramPointSpheres.fog_end = gl.getUniformLocation(shaderProgramPointSpheres, "fog_end");
    shaderProgramPointSpheres.fogColour = gl.getUniformLocation(shaderProgramPointSpheres, "fogColour");

    shaderProgramPointSpheres.offset = gl.getUniformLocation(shaderProgramPointSpheres, "offset");
    shaderProgramPointSpheres.size = gl.getUniformLocation(shaderProgramPointSpheres, "size");
    shaderProgramPointSpheres.scaleMatrix = gl.getUniformLocation(shaderProgramPointSpheres, "scaleMatrix");

    shaderProgramPointSpheres.light_positions = gl.getUniformLocation(shaderProgramPointSpheres, "light_positions");
    shaderProgramPointSpheres.light_colours_ambient = gl.getUniformLocation(shaderProgramPointSpheres, "light_colours_ambient");
    shaderProgramPointSpheres.light_colours_specular = gl.getUniformLocation(shaderProgramPointSpheres, "light_colours_specular");
    shaderProgramPointSpheres.light_colours_diffuse = gl.getUniformLocation(shaderProgramPointSpheres, "light_colours_diffuse");

    shaderProgramPointSpheres.clipPlane0 = gl.getUniformLocation(shaderProgramPointSpheres, "clipPlane0");
    shaderProgramPointSpheres.clipPlane1 = gl.getUniformLocation(shaderProgramPointSpheres, "clipPlane1");
    shaderProgramPointSpheres.clipPlane2 = gl.getUniformLocation(shaderProgramPointSpheres, "clipPlane2");
    shaderProgramPointSpheres.clipPlane3 = gl.getUniformLocation(shaderProgramPointSpheres, "clipPlane3");
    shaderProgramPointSpheres.clipPlane4 = gl.getUniformLocation(shaderProgramPointSpheres, "clipPlane4");
    shaderProgramPointSpheres.clipPlane5 = gl.getUniformLocation(shaderProgramPointSpheres, "clipPlane5");
    shaderProgramPointSpheres.clipPlane6 = gl.getUniformLocation(shaderProgramPointSpheres, "clipPlane6");
    shaderProgramPointSpheres.clipPlane7 = gl.getUniformLocation(shaderProgramPointSpheres, "clipPlane7");
    shaderProgramPointSpheres.nClipPlanes = gl.getUniformLocation(shaderProgramPointSpheres, "nClipPlanes");

    return shaderProgramPointSpheres

}
