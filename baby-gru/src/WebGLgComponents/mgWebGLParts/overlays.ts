import * as vec3 from 'gl-matrix/vec3';
import * as mat4 from 'gl-matrix/mat4';
import { linesToThickLines } from '../buildBuffers';
import { getDeviceScale } from '../webGLUtils';
import { getOffsetRect } from '../mgWebGL';
import type { MGWebGL } from '../mgWebGL';

/**
 * HUD / overlay draws for the MGWebGL canvas: crosshairs, mouse-track, FPS
 * meter, and the text / line / label / circle / textured-shape overlays that
 * sit on top of the 3D scene. These were methods on MGWebGL and have been
 * moved here (following the viewTransforms/framebuffers/eventHandlers pattern).
 * All rendering state and the shared setMatrixUniforms helper stay on the
 * instance, reached through the explicit `self` parameter.
 */

export function drawTransparent(self: MGWebGL, theMatrix) {
}

export function drawImagesAndText(self: MGWebGL, invMat) {
}

export function drawTexturedShapes(self: MGWebGL, invMat) {
    const texturedShapes = self.store.getState().glRef.texturedShapes
    const theShader = self.shaderProgramTextured;
    self.gl.useProgram(theShader);
    self.setMatrixUniforms(theShader);

    for(let i = 0; i<16; i++)
        self.gl.disableVertexAttribArray(i);

    self.gl.enableVertexAttribArray(theShader.vertexPositionAttribute);
    self.gl.enableVertexAttribArray(theShader.vertexTextureAttribute);

    //self.gl.vertexAttrib4f(theShader.vertexColourAttribute, 1.0, 0.3, 0.4, 1.0);
    //self.gl.vertexAttrib3f(theShader.vertexNormalAttribute, 0.0, 0.0, 1.0);

    texturedShapes.forEach(shape => {
        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, shape.vertexBuffer);
        self.gl.vertexAttribPointer(theShader.vertexPositionAttribute, 3, self.gl.FLOAT, false, 0, 0);
        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, shape.texCoordBuffer);
        self.gl.vertexAttribPointer(theShader.vertexTextureAttribute, 2, self.gl.FLOAT, false, 0, 0);
        self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, shape.idxBuffer);
        self.gl.uniform1i(theShader.valueMap, 0);
        self.gl.uniform1i(theShader.colorMap, 1);
        self.gl.activeTexture(self.gl.TEXTURE0);
        self.gl.bindTexture(self.gl.TEXTURE_2D, shape.image_texture);
        self.gl.activeTexture(self.gl.TEXTURE1);
        self.gl.bindTexture(self.gl.TEXTURE_2D, shape.color_ramp_texture);
        self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_INT, 0);
    })
    self.gl.activeTexture(self.gl.TEXTURE0);
}

export function drawTextLabels(self: MGWebGL, up, right) {
    // Labels, angles, etc. should be instanced by texture coords, positions using contextBig

    // make sure we can render it even if it's not a power of 2
    self.gl.bindTexture(self.gl.TEXTURE_2D, self.textTex);
    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.LINEAR);
    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

    return

}

export function drawDistancesAndLabels(self: MGWebGL) {

    // Labels, angles, etc. instanced by texture coords, positions using contextBig

    self.gl.useProgram(self.shaderProgramTextInstanced);
    self.setMatrixUniforms(self.shaderProgramTextInstanced);

    if (self.atomLabelDepthMode) {
        //If we want to fog them
        self.gl.depthFunc(self.gl.LESS);
    } else {
        //If we want them to be on top
        self.gl.depthFunc(self.gl.ALWAYS);
        self.gl.uniform1f(self.shaderProgramTextInstanced.fog_start, 1000.0);
        self.gl.uniform1f(self.shaderProgramTextInstanced.fog_end, 1000.0);
    }

    for(let i = 0; i<16; i++)
        self.gl.disableVertexAttribArray(i);

    [self.measureTextCanvasTexture,self.labelsTextCanvasTexture].forEach((canvasTexture) => {
        canvasTexture.draw();
    })

    self.gl.depthFunc(self.gl.LESS);

}

export function drawCircles(self: MGWebGL, up, right) {
    self.gl.useProgram(self.shaderProgramCircles);
    self.gl.bindTexture(self.gl.TEXTURE_2D, self.circleTex);
    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.LINEAR);
    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);
    self.gl.uniform3fv(self.shaderProgramCircles.up, up);
    self.gl.uniform3fv(self.shaderProgramCircles.right, right);

    //TODO
    // Use the right coords and colours and not do this for clicked atoms!
    // Big texture
    self.gl.bindTexture(self.gl.TEXTURE_2D, self.textTex);
}

export function drawLineMeasures(self: MGWebGL, invMat) {
    if(self.measurePointsArray.length<1) return;

    self.gl.depthFunc(self.gl.ALWAYS);
    //Begin copy/paste from crosshairs
    const axesOffset = vec3.create();
    vec3.set(axesOffset, 0, 0, 0);
    const xyzOff = self.origin.map((coord, iCoord) => -coord + self.zoom * axesOffset[iCoord])

    self.gl.useProgram(self.shaderProgramThickLines);
    self.setMatrixUniforms(self.shaderProgramThickLines);
    const pmvMatrix = mat4.create();
    const pMatrix = mat4.create();
    const ratio = 1.0 * self.gl.viewportWidth / self.gl.viewportHeight;

    if(self.renderToTexture){
        if(self.gl.viewportWidth > self.gl.viewportHeight){
            const ratio = 1.0 * self.gl.viewportWidth / self.gl.viewportHeight;
            mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24 * ratio, 24 * ratio, 0.1, 1000.0);
        } else {
            mat4.ortho(pMatrix, -24, 24, -24, 24, 0.1, 1000.0);
        }
    } else {
        mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24, 24, 0.1, 1000.0);
    }

    mat4.scale(pMatrix, pMatrix, [1. / self.zoom, 1. / self.zoom, 1.0]);
    mat4.multiply(pmvMatrix, pMatrix, self.mvMatrix);

    self.gl.uniformMatrix4fv(self.shaderProgramThickLines.pMatrixUniform, false, pmvMatrix);
    self.gl.uniform3fv(self.shaderProgramThickLines.screenZ, self.screenZ);
    self.gl.uniform1f(self.shaderProgramThickLines.pixelZoom, 0.04 * self.zoom);

    if (typeof (self.axesPositionBuffer) === "undefined") {
        self.axesPositionBuffer = self.gl.createBuffer();
        self.axesColourBuffer = self.gl.createBuffer();
        self.axesIndexBuffer = self.gl.createBuffer();
        self.axesNormalBuffer = self.gl.createBuffer();
        self.axesTextNormalBuffer = self.gl.createBuffer();
        self.axesTextColourBuffer = self.gl.createBuffer();
        self.axesTextPositionBuffer = self.gl.createBuffer();
        self.axesTextTexCoordBuffer = self.gl.createBuffer();
        self.axesTextIndexesBuffer = self.gl.createBuffer();
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
    const y = self.background_colour[0] * 0.299 + self.background_colour[1] * 0.587 + self.background_colour[2] * 0.114;
    if (y < 0.5) {
        hairColour = [1., 1., 1., 1.];
    }

    const lineStart = vec3.create();
    const lineEnd = vec3.create();

    let lastPoint = null;

    const addLine = (x1,y1,x2,y2) => {
        vec3.set(lineStart, x1 * self.zoom * ratio, y1 * self.zoom, 0.0);
        vec3.transformMat4(lineStart, lineStart, invMat);
        vec3.set(lineEnd,   x2 * self.zoom * ratio, y2 * self.zoom, 0.0);
        vec3.transformMat4(lineEnd, lineEnd, invMat);
        addSegment(renderArrays,
            xyzOff.map((coord, iCoord) => coord + lineStart[iCoord]),
            xyzOff.map((coord, iCoord) => coord + lineEnd[iCoord]),
            hairColour, hairColour
        )
    }

    self.measurePointsArray.forEach(point => {

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
    self.gl.depthFunc(self.gl.ALWAYS);

    for(let i = 0; i<16; i++)
        self.gl.disableVertexAttribArray(i);

    self.gl.enableVertexAttribArray(self.shaderProgramThickLines.vertexNormalAttribute);
    self.gl.enableVertexAttribArray(self.shaderProgramThickLines.vertexPositionAttribute);
    self.gl.enableVertexAttribArray(self.shaderProgramThickLines.vertexColourAttribute);

    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.axesNormalBuffer);
    self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(axesNormals), self.gl.DYNAMIC_DRAW);
    self.gl.vertexAttribPointer(self.shaderProgramThickLines.vertexNormalAttribute, 3, self.gl.FLOAT, false, 0, 0);

    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.axesPositionBuffer);
    self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(axesVertices_new), self.gl.DYNAMIC_DRAW);
    self.gl.vertexAttribPointer(self.shaderProgramThickLines.vertexPositionAttribute, 3, self.gl.FLOAT, false, 0, 0);

    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.axesColourBuffer);
    self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(axesColours_new), self.gl.DYNAMIC_DRAW);
    self.gl.vertexAttribPointer(self.shaderProgramThickLines.vertexColourAttribute, 4, self.gl.FLOAT, false, 0, 0);

    self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, self.axesIndexBuffer);
    if (self.ext) {
        self.gl.bufferData(self.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(axesIndexs_new), self.gl.DYNAMIC_DRAW);
        self.gl.drawElements(self.gl.TRIANGLES, axesIndexs_new.length, self.gl.UNSIGNED_INT, 0);
    } else {
        self.gl.bufferData(self.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(axesIndexs_new), self.gl.DYNAMIC_DRAW);
        self.gl.drawElements(self.gl.TRIANGLES, axesIndexs_new.length, self.gl.UNSIGNED_SHORT, 0);
    }

    self.gl.depthFunc(self.gl.LESS)

}

export function drawCrosshairs(self: MGWebGL, invMat,ratioMult=1.0) {

    self.gl.depthFunc(self.gl.ALWAYS);
    self.gl.useProgram(self.shaderProgramTextBackground);
    self.gl.uniform1f(self.shaderProgramTextBackground.fog_start, 1000.0);
    self.gl.uniform1f(self.shaderProgramTextBackground.fog_end, 1000.0);
    const axesOffset = vec3.create();
    vec3.set(axesOffset, 0, 0, 0);
    const xyzOff = self.origin.map((coord, iCoord) => -coord + self.zoom * axesOffset[iCoord])
    self.gl.useProgram(self.shaderProgramThickLines);
    self.setMatrixUniforms(self.shaderProgramThickLines);
    const pmvMatrix = mat4.create();
    const pMatrix = mat4.create();
    const ratio = 1.0 * self.gl.viewportWidth / self.gl.viewportHeight * ratioMult
    if(self.renderToTexture){
        if(self.gl.viewportWidth > self.gl.viewportHeight){
            const ratio = 1.0 * self.gl.viewportWidth / self.gl.viewportHeight;
            mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24 * ratio, 24 * ratio, 0.1, 1000.0);
        } else {
            mat4.ortho(pMatrix, -24, 24, -24, 24, 0.1, 1000.0);
        }
    } else {
        mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24, 24, 0.1, 1000.0);
    }
    mat4.scale(pMatrix, pMatrix, [1. / self.zoom, 1. / self.zoom, 1.0]);
    mat4.multiply(pmvMatrix, pMatrix, self.mvMatrix);

    self.gl.uniformMatrix4fv(self.shaderProgramThickLines.pMatrixUniform, false, pmvMatrix);
    self.gl.uniform3fv(self.shaderProgramThickLines.screenZ, self.screenZ);
    self.gl.uniform1f(self.shaderProgramThickLines.pixelZoom, 0.04 * self.zoom);

    if (typeof (self.axesPositionBuffer) === "undefined") {
        self.axesPositionBuffer = self.gl.createBuffer();
        self.axesColourBuffer = self.gl.createBuffer();
        self.axesIndexBuffer = self.gl.createBuffer();
        self.axesNormalBuffer = self.gl.createBuffer();
        self.axesTextNormalBuffer = self.gl.createBuffer();
        self.axesTextColourBuffer = self.gl.createBuffer();
        self.axesTextPositionBuffer = self.gl.createBuffer();
        self.axesTextTexCoordBuffer = self.gl.createBuffer();
        self.axesTextIndexesBuffer = self.gl.createBuffer();
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
    const y = self.background_colour[0] * 0.299 + self.background_colour[1] * 0.587 + self.background_colour[2] * 0.114;
    if (y < 0.5) {
        hairColour = [1., 1., 1., 0.5];
    }

    // Actual axes
    const cross_hair_scale_factor = 0.3;
    const horizontalHairStart = vec3.create();
    vec3.set(horizontalHairStart, -cross_hair_scale_factor * self.zoom, 0.0, 0.0);
    vec3.transformMat4(horizontalHairStart, horizontalHairStart, invMat);
    const horizontalHairEnd = vec3.create();
    vec3.set(horizontalHairEnd, cross_hair_scale_factor * self.zoom, 0.0, 0.0);
    vec3.transformMat4(horizontalHairEnd, horizontalHairEnd, invMat);

    addSegment(renderArrays,
        xyzOff.map((coord, iCoord) => coord + horizontalHairStart[iCoord]),
        xyzOff.map((coord, iCoord) => coord + horizontalHairEnd[iCoord]),
        hairColour, hairColour
    )

    const verticalHairStart = vec3.create();
    vec3.set(verticalHairStart, 0.0, -cross_hair_scale_factor * self.zoom, 0.0);
    vec3.transformMat4(verticalHairStart, verticalHairStart, invMat);
    const verticalHairEnd = vec3.create();
    vec3.set(verticalHairEnd, 0.0, cross_hair_scale_factor * self.zoom, 0.0);
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
    self.gl.depthFunc(self.gl.ALWAYS);

    for(let i = 0; i<16; i++)
        self.gl.disableVertexAttribArray(i);

    self.gl.uniform1f(self.shaderProgramThickLines.fog_start, 1000.0);
    self.gl.uniform1f(self.shaderProgramThickLines.fog_end, 1000.0);
    self.gl.enableVertexAttribArray(self.shaderProgramThickLines.vertexNormalAttribute);
    self.gl.enableVertexAttribArray(self.shaderProgramThickLines.vertexPositionAttribute);
    self.gl.enableVertexAttribArray(self.shaderProgramThickLines.vertexColourAttribute);

    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.axesNormalBuffer);
    self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(axesNormals), self.gl.DYNAMIC_DRAW);
    self.gl.vertexAttribPointer(self.shaderProgramThickLines.vertexNormalAttribute, 3, self.gl.FLOAT, false, 0, 0);

    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.axesPositionBuffer);
    self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(axesVertices_new), self.gl.DYNAMIC_DRAW);
    self.gl.vertexAttribPointer(self.shaderProgramThickLines.vertexPositionAttribute, 3, self.gl.FLOAT, false, 0, 0);

    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.axesColourBuffer);
    self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(axesColours_new), self.gl.DYNAMIC_DRAW);
    self.gl.vertexAttribPointer(self.shaderProgramThickLines.vertexColourAttribute, 4, self.gl.FLOAT, false, 0, 0);

    self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, self.axesIndexBuffer);
    if (self.ext) {
        self.gl.bufferData(self.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(axesIndexs_new), self.gl.DYNAMIC_DRAW);
        self.gl.drawElements(self.gl.TRIANGLES, axesIndexs_new.length, self.gl.UNSIGNED_INT, 0);
    } else {
        self.gl.bufferData(self.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(axesIndexs_new), self.gl.DYNAMIC_DRAW);
        self.gl.drawElements(self.gl.TRIANGLES, axesIndexs_new.length, self.gl.UNSIGNED_SHORT, 0);
    }

    self.gl.depthFunc(self.gl.LESS)

}

export function drawMouseTrack(self: MGWebGL) {

    const c = self.canvasRef.current;
    const offset = getOffsetRect(c);

    const ratio = 1.0 * self.gl.viewportWidth / self.gl.viewportHeight;
    const frac_x = (getDeviceScale()*(self.init_x-offset.left)/self.gl.viewportWidth-0.5)  * 48.;
    const frac_y = -(getDeviceScale()*(self.init_y-offset.top)/self.gl.viewportHeight-0.5) * 48;

    self.gl.depthFunc(self.gl.ALWAYS);

    self.gl.useProgram(self.shaderProgram);
    self.setMatrixUniforms(self.shaderProgram);
    self.gl.uniform1f(self.shaderProgram.fog_start, 1000.0);
    self.gl.uniform1f(self.shaderProgram.fog_end, 1000.0);
    self.gl.uniform4fv(self.shaderProgram.clipPlane0, [0, 0, -1, 1000]);
    self.gl.uniform4fv(self.shaderProgram.clipPlane1, [0, 0, 1, 1000]);
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
    self.gl.uniformMatrix4fv(self.shaderProgram.pMatrixUniform, false, pmvMatrix);
    self.gl.uniformMatrix4fv(self.shaderProgram.mvMatrixUniform, false, tempInvMVMatrix);
    self.gl.uniformMatrix4fv(self.shaderProgram.mvInvMatrixUniform, false, tempInvMVMatrix);

    self.mouseTrackPoints.push([frac_x,frac_y,performance.now()]);
    if(self.mouseTrackPoints.length>120) self.mouseTrackPoints.shift();

    let mouseTrackVertices = [];
    let mouseTrackColours = [];
    let mouseTrackNormals = [];
    let mouseTrackIndexs = [];

    let i = 0;
    let currentIdx = 0;
    self.mouseTrackPoints.forEach(point => {
        const this_x = point[0];
        const this_y = point[1];
        const timeStamp = point[2];
        const ifrac = i / self.mouseTrackPoints.length;
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

    self.gl.depthFunc(self.gl.ALWAYS);

    for(let i = 0; i<16; i++)
        self.gl.disableVertexAttribArray(i);

    self.gl.enableVertexAttribArray(self.shaderProgram.vertexNormalAttribute);
    self.gl.enableVertexAttribArray(self.shaderProgram.vertexPositionAttribute);
    self.gl.enableVertexAttribArray(self.shaderProgram.vertexColourAttribute);

    if (typeof (self.mouseTrackPositionBuffer) === "undefined") {
        self.mouseTrackPositionBuffer = self.gl.createBuffer();
        self.mouseTrackColourBuffer = self.gl.createBuffer();
        self.mouseTrackIndexBuffer = self.gl.createBuffer();
        self.mouseTrackNormalBuffer = self.gl.createBuffer();
    }

    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.mouseTrackNormalBuffer);
    self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(mouseTrackNormals), self.gl.DYNAMIC_DRAW);
    self.gl.vertexAttribPointer(self.shaderProgram.vertexNormalAttribute, 3, self.gl.FLOAT, false, 0, 0);

    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.mouseTrackPositionBuffer);
    self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(mouseTrackVertices), self.gl.DYNAMIC_DRAW);
    self.gl.vertexAttribPointer(self.shaderProgram.vertexPositionAttribute, 3, self.gl.FLOAT, false, 0, 0);

    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.mouseTrackColourBuffer);
    self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(mouseTrackColours), self.gl.DYNAMIC_DRAW);
    self.gl.vertexAttribPointer(self.shaderProgram.vertexColourAttribute, 4, self.gl.FLOAT, false, 0, 0);

    self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, self.mouseTrackIndexBuffer);
    if (self.ext) {
        self.gl.bufferData(self.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mouseTrackIndexs), self.gl.DYNAMIC_DRAW);
        self.gl.drawElements(self.gl.TRIANGLES, mouseTrackIndexs.length, self.gl.UNSIGNED_INT, 0);
    } else {
        self.gl.bufferData(self.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mouseTrackIndexs), self.gl.DYNAMIC_DRAW);
        self.gl.drawElements(self.gl.TRIANGLES, mouseTrackIndexs.length, self.gl.UNSIGNED_SHORT, 0);
    }
    self.gl.depthFunc(self.gl.LESS)
}

export function drawFPSMeter(self: MGWebGL) {

    self.gl.depthFunc(self.gl.ALWAYS);

    self.gl.useProgram(self.shaderProgramThickLines);
    self.setMatrixUniforms(self.shaderProgramThickLines);
    self.gl.uniform1f(self.shaderProgramThickLines.fog_start, 1000.0);
    self.gl.uniform1f(self.shaderProgramThickLines.fog_end, 1000.0);
    self.gl.uniform4fv(self.shaderProgramThickLines.clipPlane0, [0, 0, -1, 1000]);
    self.gl.uniform4fv(self.shaderProgramThickLines.clipPlane1, [0, 0, 1, 1000]);
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
    self.gl.uniformMatrix4fv(self.shaderProgramThickLines.pMatrixUniform, false, pmvMatrix);
    self.gl.uniform1f(self.shaderProgramThickLines.pixelZoom, 0.04);

    if (typeof (self.hitchometerPositionBuffer) === "undefined") {
        self.hitchometerPositionBuffer = self.gl.createBuffer();
        self.hitchometerColourBuffer = self.gl.createBuffer();
        self.hitchometerIndexBuffer = self.gl.createBuffer();
        self.hitchometerNormalBuffer = self.gl.createBuffer();
    }

    const size = 1.0;

    const screenZ = vec3.create()
    vec3.set(screenZ,0,0,1)

    self.gl.uniform3fv(self.shaderProgramThickLines.screenZ, screenZ);

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

    for(let i=0; i<self.mspfArray.length;i++){
        let mspf = self.mspfArray[i];
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

    self.gl.depthFunc(self.gl.ALWAYS);

    for(let i = 0; i<16; i++)
        self.gl.disableVertexAttribArray(i);

    self.gl.enableVertexAttribArray(self.shaderProgramThickLines.vertexNormalAttribute);
    self.gl.enableVertexAttribArray(self.shaderProgramThickLines.vertexPositionAttribute);
    self.gl.enableVertexAttribArray(self.shaderProgramThickLines.vertexColourAttribute);

    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.hitchometerNormalBuffer);
    self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(hitchometerNormals), self.gl.DYNAMIC_DRAW);
    self.gl.vertexAttribPointer(self.shaderProgramThickLines.vertexNormalAttribute, 3, self.gl.FLOAT, false, 0, 0);

    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.hitchometerPositionBuffer);
    self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(hitchometerVertices_new), self.gl.DYNAMIC_DRAW);
    self.gl.vertexAttribPointer(self.shaderProgramThickLines.vertexPositionAttribute, 3, self.gl.FLOAT, false, 0, 0);

    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.hitchometerColourBuffer);
    self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(hitchometerColours_new), self.gl.DYNAMIC_DRAW);
    self.gl.vertexAttribPointer(self.shaderProgramThickLines.vertexColourAttribute, 4, self.gl.FLOAT, false, 0, 0);

    self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, self.hitchometerIndexBuffer);
    if (self.ext) {
        self.gl.bufferData(self.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(hitchometerIndexs_new), self.gl.DYNAMIC_DRAW);
        self.gl.drawElements(self.gl.TRIANGLES, hitchometerIndexs_new.length, self.gl.UNSIGNED_INT, 0);
    } else {
        self.gl.bufferData(self.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(hitchometerIndexs_new), self.gl.DYNAMIC_DRAW);
        self.gl.drawElements(self.gl.TRIANGLES, hitchometerIndexs_new.length, self.gl.UNSIGNED_SHORT, 0);
    }

    self.gl.depthFunc(self.gl.LESS)
}

export function drawTextOverlays(self: MGWebGL, invMat,ratioMult=1.0,font_scale=1.0) {

    const ratio = 1.0 * self.gl.viewportWidth / self.gl.viewportHeight * ratioMult

    let textColour = "black";
    const y = self.background_colour[0] * 0.299 + self.background_colour[1] * 0.587 + self.background_colour[2] * 0.114;
    if (y < 0.5) {
        textColour = "white";
    }

    self.measureText2DCanvasTexture.clearBigTexture()

    const drawString = (s, xpos, ypos, zpos, font, threeD) => {
        if(font) self.textCtx.font = font;
        const axesOffset = vec3.create();
        vec3.set(axesOffset, xpos,ypos, 0);
        vec3.transformMat4(axesOffset, axesOffset, invMat);

        const xyzOff = self.origin.map((coord, iCoord) => -coord + self.zoom * axesOffset[iCoord]);
        const base_x = xyzOff[0];
        const base_y = xyzOff[1];
        const base_z = xyzOff[2];

        self.measureText2DCanvasTexture.addBigTextureTextImage({font:font,text:s,x:base_x,y:base_y,z:base_z})

    }

    self.textLegends.forEach(label => {
            const xpos = label.x * 48.0 -24.*ratio;
            const ypos = label.y * 48.0 -24.;
            drawString(label.text,xpos,ypos, 0.0, label.font, false);
    });

    let fontMult = 1.0
    if(window.devicePixelRatio){
        fontMult *= window.devicePixelRatio
    }
    if(self.showFPS) drawString(self.fpsText, -23.5*ratio, -23.5, 0.0, (fontMult * 20 * font_scale).toFixed(0)+"px helvetica", false);

    let lastPoint = null;
    let lastLastPoint = null;

    if(!self.doMultiView&&!self.doThreeWayView&&!self.doCrossEyedStereo&&!self.doSideBySideStereo){

        self.measurePointsArray.forEach(point => {
            if(lastPoint){
                let fnSize = 24
                if(window.devicePixelRatio){
                    fnSize *= window.devicePixelRatio
                }
                const fnSizePx = fnSize + "px"
                const dist = Math.sqrt(self.zoom* self.gl.viewportWidth / self.gl.viewportHeight*(point.x-lastPoint.x) * self.zoom* self.gl.viewportWidth / self.gl.viewportHeight*(point.x-lastPoint.x) + self.zoom*(point.y-lastPoint.y) * self.zoom*(point.y-lastPoint.y));
                const mid_point = {x:(point.x+lastPoint.x)/2,y:(point.y+lastPoint.y)/2}
                drawString(dist.toFixed(1)+"Å", mid_point.x*ratio, -mid_point.y, 0.0, fnSizePx+" helvetica", false);
                if(lastLastPoint){
                    const l1 = {x:(point.x-lastPoint.x),y:(point.y-lastPoint.y)}
                    l1.x /= dist / self.zoom;
                    l1.y /= dist / self.zoom;
                    const dist2 = Math.sqrt(self.zoom* self.gl.viewportWidth / self.gl.viewportHeight*(lastLastPoint.x-lastPoint.x) * self.zoom* self.gl.viewportWidth / self.gl.viewportHeight*(lastLastPoint.x-lastPoint.x) + self.zoom*(lastLastPoint.y-lastPoint.y) * self.zoom*(lastLastPoint.y-lastPoint.y));
                    const l2 = {x:(lastLastPoint.x-lastPoint.x),y:(lastLastPoint.y-lastPoint.y)}
                    l2.x /= dist2 / self.zoom;
                    l2.y /= dist2 / self.zoom;
                    const l1_dot_l2 = self.gl.viewportWidth / self.gl.viewportHeight*self.gl.viewportWidth / self.gl.viewportHeight*l1.x*l2.x + l1.y*l2.y;
                    const angle = Math.acos(l1_dot_l2) / Math.PI * 180.0;
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
    self.newTextLabels.forEach(tlabel => {
        tlabel.forEach(label => {
            drawString(label.text, label.x,label.y,label.z, "30px helvetica", true);
        })
    })

    self.measureText2DCanvasTexture.recreateBigTextureBuffers();

    self.gl.useProgram(self.shaderProgramTextInstanced);
    self.setMatrixUniforms(self.shaderProgramTextInstanced);

    //If we want them to be on top
    self.gl.depthFunc(self.gl.ALWAYS);
    self.gl.uniform1f(self.shaderProgramTextInstanced.fog_start, 1000.0);
    self.gl.uniform1f(self.shaderProgramTextInstanced.fog_end, 1000.0);

    for(let i = 0; i<16; i++)
        self.gl.disableVertexAttribArray(i);


    self.measureText2DCanvasTexture.draw();

    self.gl.depthFunc(self.gl.LESS)
}
