import * as vec3 from 'gl-matrix/vec3';
import * as mat4 from 'gl-matrix/mat4';
import { webGL } from '../../types/mgWebGL';
import type { MGWebGL } from '../mgWebGL';

/**
 * The low-level buffer-draw helpers - bind instance/vertex attribute arrays
 * and issue draw calls for a single buffer, plus the interactive/PMV
 * transform-matrix draw wrappers - moved out of MGWebGL (following the
 * viewTransforms/framebuffers/overlays pattern). Rendering state,
 * applySymmetryMatrix and setLightUniforms stay on the instance, reached
 * through the explicit `self` parameter.
 */

export function drawBuffer(self: MGWebGL, theBuffer:any,theShaderIn:webGL.MGWebGLShader|webGL.ShaderTrianglesInstanced,j:number,vertexType:number,specialDrawBuffer?:any) : void {

    const bright_y = self.background_colour[0] * 0.299 + self.background_colour[1] * 0.587 + self.background_colour[2] * 0.114;

    let drawBuffer;
    if (specialDrawBuffer) {
        drawBuffer = specialDrawBuffer;
    } else {
        drawBuffer = theBuffer.triangleVertexIndexBuffer[j];
    }

    if (self.ext) {
        const theShader = theShaderIn as webGL.ShaderTrianglesInstanced;
        if(theBuffer.triangleInstanceOriginBuffer[j]){
            self.gl.enableVertexAttribArray(theShader.vertexInstanceOriginAttribute);
            self.gl.bindBuffer(self.gl.ARRAY_BUFFER, theBuffer.triangleInstanceOriginBuffer[j]);
            self.gl.vertexAttribPointer(theShader.vertexInstanceOriginAttribute, theBuffer.triangleInstanceOriginBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
            if (self.WEBGL2) {
                self.gl.vertexAttribDivisor(theShader.vertexInstanceOriginAttribute, 1);
            } else {
                self.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOriginAttribute, 1);
            }
            if(theBuffer.triangleInstanceSizeBuffer[j]){
                self.gl.enableVertexAttribArray(theShader.vertexInstanceSizeAttribute);
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, theBuffer.triangleInstanceSizeBuffer[j]);
                self.gl.vertexAttribPointer(theShader.vertexInstanceSizeAttribute, theBuffer.triangleInstanceSizeBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                if (self.WEBGL2) {
                    self.gl.vertexAttribDivisor(theShader.vertexInstanceSizeAttribute, 1);
                } else {
                    self.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceSizeAttribute, 1);
                }
            }
            if(theBuffer.triangleInstanceOrientationBuffer[j]){
                self.gl.enableVertexAttribArray(theShader.vertexInstanceOrientationAttribute);
                self.gl.enableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+1);
                self.gl.enableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+2);
                self.gl.enableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+3);
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, theBuffer.triangleInstanceOrientationBuffer[j]);
                self.gl.vertexAttribPointer(theShader.vertexInstanceOrientationAttribute, 4, self.gl.FLOAT, false, 64, 0);
                self.gl.vertexAttribPointer(theShader.vertexInstanceOrientationAttribute+1, 4, self.gl.FLOAT, false, 64, 16);
                self.gl.vertexAttribPointer(theShader.vertexInstanceOrientationAttribute+2, 4, self.gl.FLOAT, false, 64, 32);
                self.gl.vertexAttribPointer(theShader.vertexInstanceOrientationAttribute+3, 4, self.gl.FLOAT, false, 64, 48);
                if (self.WEBGL2) {
                    self.gl.vertexAttribDivisor(theShader.vertexInstanceOrientationAttribute, 1);
                    self.gl.vertexAttribDivisor(theShader.vertexInstanceOrientationAttribute+1, 1);
                    self.gl.vertexAttribDivisor(theShader.vertexInstanceOrientationAttribute+2, 1);
                    self.gl.vertexAttribDivisor(theShader.vertexInstanceOrientationAttribute+3, 1);
                } else {
                    self.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOrientationAttribute, 1);
                    self.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOrientationAttribute+1, 1);
                    self.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOrientationAttribute+2, 1);
                    self.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOrientationAttribute+3, 1);
                }
            }
            if(theBuffer.supplementary["instance_use_colors"]){
                if(theShader.vertexColourAttribute>-1){
                    self.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
                    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, theBuffer.triangleColourBuffer[j]);
                    self.gl.vertexAttribPointer(theShader.vertexColourAttribute, theBuffer.triangleColourBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                    if(theBuffer.supplementary["instance_use_colors"][j]){
                        if (self.WEBGL2) {
                            self.gl.vertexAttribDivisor(theShader.vertexColourAttribute, 1);
                        } else {
                            self.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexColourAttribute, 1);
                        }
                    }
                }
                if(self.stencilPass){
                    self.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                    if(bright_y<0.5)
                        self.gl.vertexAttrib4f(theShader.vertexColourAttribute, 1.0, 1.0, 1.0, 1.0);
                    else
                        self.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.0, 0.0, 0.0, 1.0);
                }
            }
            if (self.WEBGL2) {
                if(self.doAnaglyphStereo) {
                    self.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                    self.gl.vertexAttribDivisor(theShader.vertexColourAttribute,0);
                    self.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...self.currentAnaglyphColor)
                }
                self.gl.drawElementsInstanced(vertexType, drawBuffer.numItems, self.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
            } else {
                self.instanced_ext.drawElementsInstancedANGLE(vertexType, drawBuffer.numItems, self.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
            }
            if(theBuffer.symmetryMatrices.length>0){
                if(theShader.vertexColourAttribute>-1&&theBuffer.changeColourWithSymmetry){
                    self.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                    if(bright_y>0.5)
                        self.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.3, 0.3, 0.3, 1.0);
                    else
                        self.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.5, 0.5, 0.5, 1.0);
                }

                const tempMVMatrix = mat4.create();
                const tempMVInvMatrix = mat4.create();
                for (let isym = 0; isym < theBuffer.symmetryMatrices.length; isym++) {

                    self.applySymmetryMatrix(theShader,theBuffer.symmetryMatrices[isym],tempMVMatrix,tempMVInvMatrix)
                    if (self.WEBGL2) {
                        self.gl.drawElementsInstanced(vertexType, drawBuffer.numItems, self.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
                    } else {
                        self.instanced_ext.drawElementsInstancedANGLE(vertexType, drawBuffer.numItems, self.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
                    }

                }
                self.setLightUniforms(theShader);
                self.gl.uniformMatrix4fv(theShader.mvMatrixUniform, false, self.mvMatrix);// All else
                self.gl.uniformMatrix4fv(theShader.mvInvMatrixUniform, false, self.mvInvMatrix);// All else
                if(theShader.vertexColourAttribute>-1) self.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
            }
            if(theShader.light_colours_diffuse) self.gl.uniform4fv(theShader.light_colours_diffuse, self.light_colours_diffuse);
            if(theShader.light_colours_specular) self.gl.uniform4fv(theShader.light_colours_specular, self.light_colours_specular);
            if(theShader.specularPower) self.gl.uniform1f(theShader.specularPower, self.specularPower);
            self.gl.disableVertexAttribArray(theShader.vertexInstanceOriginAttribute);
            self.gl.disableVertexAttribArray(theShader.vertexInstanceSizeAttribute);
            self.gl.disableVertexAttribArray(theShader.vertexInstanceOrientationAttribute);
            self.gl.disableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+1);
            self.gl.disableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+2);
            self.gl.disableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+3);
            if(theShader.vertexColourAttribute>-1){
                if (self.WEBGL2) {
                    self.gl.vertexAttribDivisor(theShader.vertexColourAttribute, 0);
                } else {
                    self.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexColourAttribute, 0);
                }
            }
        } else {
            const theShader = theShaderIn as webGL.MGWebGLShader;
            if (self.WEBGL2) {
                if(self.doAnaglyphStereo) {
                    self.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                    self.gl.vertexAttribDivisor(theShader.vertexColourAttribute,0);
                    self.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...self.currentAnaglyphColor)
                }
                drawMaxElementsUInt(self, vertexType, drawBuffer.numItems);
            } else {
                self.gl.drawElements(vertexType, drawBuffer.numItems, self.gl.UNSIGNED_INT, 0);
            }
            if(theBuffer.symmetryMatrices.length>0){
                if(theShader.vertexColourAttribute>-1&&theBuffer.changeColourWithSymmetry){
                    self.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                    if(bright_y>0.5)
                        self.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.3, 0.3, 0.3, 1.0);
                    else
                        self.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.5, 0.5, 0.5, 1.0);
                }
                const tempMVMatrix = mat4.create();
                const tempMVInvMatrix = mat4.create();
                for (let isym = 0; isym < theBuffer.symmetryMatrices.length; isym++) {

                    self.applySymmetryMatrix(theShader,theBuffer.symmetryMatrices[isym],tempMVMatrix,tempMVInvMatrix)
                    if (self.WEBGL2) {
                        if(self.doAnaglyphStereo) {
                            self.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                            self.gl.vertexAttribDivisor(theShader.vertexColourAttribute,0);
                            self.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...self.currentAnaglyphColor)
                        }
                        drawMaxElementsUInt(self, vertexType, drawBuffer.numItems);
                    } else {
                        self.gl.drawElements(vertexType, drawBuffer.numItems, self.gl.UNSIGNED_INT, 0);
                    }

                }
                self.setLightUniforms(theShader);
                self.gl.uniformMatrix4fv(theShader.mvMatrixUniform, false, self.mvMatrix);// All else
                self.gl.uniformMatrix4fv(theShader.mvInvMatrixUniform, false, self.mvInvMatrix);// All else
                if(theShader.vertexColourAttribute>-1) self.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
            }
        }
    } else {
        self.gl.drawElements(vertexType, drawBuffer.numItems, self.gl.UNSIGNED_SHORT, 0);
    }
}

export function drawMaxElementsUInt(self: MGWebGL, vertexType, numItems) {

    if(numItems<self.max_elements_indices){
        self.gl.drawElements(vertexType, numItems, self.gl.UNSIGNED_INT, 0);
    } else {
        let inum=0;
        for( ; inum <  numItems / self.max_elements_indices-1; inum++){
            self.gl.drawElements(vertexType, self.max_elements_indices, self.gl.UNSIGNED_INT, inum*self.max_elements_indices*4);
        }
        if((numItems % self.max_elements_indices)>0){
            self.gl.drawElements(vertexType, numItems % self.max_elements_indices, self.gl.UNSIGNED_INT, inum*self.max_elements_indices*4);
        }
    }

}

export function setupModelViewTransformMatrixInteractive(self: MGWebGL, transformMatrix, transformOrigin, buffer, shader, vertexType, bufferIdx, specialDrawBuffer) {

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

    mat4.translate(self.mvMatrix, self.mvMatrix, [transformOrigin[0] - self.origin[0], transformOrigin[1] - self.origin[1], transformOrigin[2] - self.origin[2]]);
    mat4.multiply(tempMVMatrix, self.mvMatrix, symt);
    mat4.translate(self.mvMatrix, self.mvMatrix, [-transformOrigin[0] + self.origin[0], -transformOrigin[1] + self.origin[1], -transformOrigin[2] + self.origin[2]]);
    mat4.translate(tempMVMatrix, tempMVMatrix, [-transformOrigin[0] + self.origin[0], -transformOrigin[1] + self.origin[1], -transformOrigin[2] + self.origin[2]]);

    self.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, tempMVMatrix);
    tempMVMatrix[12] = 0.0;
    tempMVMatrix[13] = 0.0;
    tempMVMatrix[14] = 0.0;
    mat4.invert(tempMVInvMatrix, tempMVMatrix);
    self.gl.uniformMatrix4fv(shader.mvInvMatrixUniform, false, tempMVInvMatrix);// All else
    screenZ[0] = 0.0;
    screenZ[1] = 0.0;
    screenZ[2] = 1.0;
    vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
    self.gl.uniform3fv(shader.screenZ, screenZ);

}

export function drawTransformMatrixInteractive(self: MGWebGL, transformMatrix:number[], transformOrigin:number[], buffer:any, shader:webGL.MGWebGLShader, vertexType:number, bufferIdx:number, specialDrawBuffer?:number) {

    setupModelViewTransformMatrixInteractive(self, transformMatrix, transformOrigin, buffer, shader, vertexType, bufferIdx, specialDrawBuffer);

    drawBuffer(self, buffer,shader,bufferIdx,vertexType,specialDrawBuffer);

    self.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, self.mvMatrix);
    self.gl.uniformMatrix4fv(shader.mvInvMatrixUniform, false, self.mvInvMatrix);// All else
}

export function drawTransformMatrix(self: MGWebGL, transformMatrix:number[], buffer:any, shader:any, vertexType:number, bufferIdx:number, specialDrawBuffer?:any) : void {
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
    mat4.multiply(tempMVMatrix, self.mvMatrix, symt);

    self.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, tempMVMatrix);
    tempMVMatrix[12] = 0.0;
    tempMVMatrix[13] = 0.0;
    tempMVMatrix[14] = 0.0;
    mat4.invert(tempMVInvMatrix, tempMVMatrix);
    self.gl.uniformMatrix4fv(shader.mvInvMatrixUniform, false, tempMVInvMatrix);// All else
    screenZ[0] = 0.0;
    screenZ[1] = 0.0;
    screenZ[2] = 1.0;
    vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
    self.gl.uniform3fv(shader.screenZ, screenZ);
    if (self.ext) {
        self.gl.drawElements(vertexType, drawBuffer.numItems, self.gl.UNSIGNED_INT, 0);
    } else {
        self.gl.drawElements(vertexType, drawBuffer.numItems, self.gl.UNSIGNED_SHORT, 0);
    }
    self.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, self.mvMatrix);
    self.gl.uniformMatrix4fv(shader.mvInvMatrixUniform, false, self.mvInvMatrix);// All else

}

export function drawTransformMatrixInteractivePMV(self: MGWebGL, transformMatrix:number[], transformOrigin:number[], buffer:any, shader:any, vertexType:number, bufferIdx:number) {
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

    mat4.translate(self.mvMatrix, self.mvMatrix, [transformOrigin[0] - self.origin[0], transformOrigin[1] - self.origin[1], transformOrigin[2] - self.origin[2]]);
    mat4.multiply(tempMVMatrix, self.mvMatrix, symt);
    mat4.translate(self.mvMatrix, self.mvMatrix, [-transformOrigin[0] + self.origin[0], -transformOrigin[1] + self.origin[1], -transformOrigin[2] + self.origin[2]]);
    mat4.translate(tempMVMatrix, tempMVMatrix, [-transformOrigin[0] + self.origin[0], -transformOrigin[1] + self.origin[1], -transformOrigin[2] + self.origin[2]]);
    mat4.multiply(pmvMatrix, self.pMatrix, tempMVMatrix); // Lines

    self.gl.uniformMatrix4fv(shader.pMatrixUniform, false, pmvMatrix); // Lines
    self.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, tempMVMatrix);

    tempMVMatrix[12] = 0.0;
    tempMVMatrix[13] = 0.0;
    tempMVMatrix[14] = 0.0;
    mat4.invert(tempMVInvMatrix, tempMVMatrix);
    screenZ[0] = 0.0;
    screenZ[1] = 0.0;
    screenZ[2] = 1.0;
    vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
    self.gl.uniform3fv(shader.screenZ, screenZ);
    if (self.ext) {
        drawMaxElementsUInt(self, vertexType, drawBuffer.numItems);
    } else {
        self.gl.drawElements(vertexType, drawBuffer.numItems, self.gl.UNSIGNED_SHORT, 0);
    }
    self.gl.uniformMatrix4fv(shader.pMatrixUniform, false, self.pmvMatrix); // Lines
    self.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, self.mvMatrix); // Lines
    self.gl.uniform3fv(shader.screenZ, self.screenZ); // Lines

}

export function drawTransformMatrixPMV(self: MGWebGL, transformMatrix:number[], buffer:any, shader:any, vertexType:number, bufferIdx:number) {
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
    mat4.multiply(tempMVMatrix, self.mvMatrix, symt);
    mat4.multiply(pmvMatrix, self.pMatrix, tempMVMatrix); // Lines
    self.gl.uniformMatrix4fv(shader.pMatrixUniform, false, pmvMatrix); // Lines
    self.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, tempMVMatrix);
    tempMVMatrix[12] = 0.0;
    tempMVMatrix[13] = 0.0;
    tempMVMatrix[14] = 0.0;
    mat4.invert(tempMVInvMatrix, tempMVMatrix);
    screenZ[0] = 0.0;
    screenZ[1] = 0.0;
    screenZ[2] = 1.0;
    vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
    self.gl.uniform3fv(shader.screenZ, screenZ);
    if (self.ext) {
        drawMaxElementsUInt(self, vertexType, drawBuffer.numItems);
    } else {
        self.gl.drawElements(vertexType, drawBuffer.numItems, self.gl.UNSIGNED_SHORT, 0);
    }
    self.gl.uniformMatrix4fv(shader.pMatrixUniform, false, self.pmvMatrix); // Lines
    self.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, self.mvMatrix); // Lines
    self.gl.uniform3fv(shader.screenZ, self.screenZ); // Lines

}
