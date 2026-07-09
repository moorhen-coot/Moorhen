import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import * as mat4 from 'gl-matrix/mat4';
import * as mat3 from 'gl-matrix/mat3';
import { quatToMat4, quat4Inverse } from '../quatToMat4.js';
import { vec3Create, NormalizeVec3, vec3Cross } from '../mgMaths.js';
import type { MGWebGL } from '../mgWebGL';

/**
 * The hot render core - drawScene orchestrates the frame (framebuffer setup,
 * passes, post-processing), drawTriangles draws all molecular geometry, and
 * drawPeel does depth-peeled order-independent transparency - moved out of
 * MGWebGL (following the viewTransforms/framebuffers/bufferDraw pattern). All
 * GL state, buffers, shaders and the many draw/setup helpers they call stay on
 * the instance, reached through the explicit `self` parameter.
 *
 * This file is large but is one cohesive module: the two sections below are a
 * single mutually-recursive pipeline, so they deliberately stay together rather
 * than split into two files (which would only create a circular import):
 *
 *   1. GEOMETRY & FRAME     - drawPeel, drawTriangles, drawScene, applySymmetryMatrix
 *   2. PASSES & POST-PROCESS - bindFramebufferDrawBuffers, getMultiViewInfo,
 *                              textureBlur, depthBlur, GLrender
 *
 * The coupling that keeps them one module: drawScene calls into the passes
 * (GLrender / depthBlur / textureBlur / getMultiViewInfo), and GLrender calls
 * back into drawTriangles - a genuine cycle, not an accident of layout.
 */

// ============================================================================
// SECTION 1 - GEOMETRY & FRAME
// ============================================================================

export function drawPeel(self: MGWebGL, theShaders,doClear=true,ratioMult=1.0){
        let invMat
            if(self.renderToTexture) {
                console.log("Delete the normal peel buffers")
                for(let i=0;i<self.depthPeelFramebuffers.length;i++){
                    self.gl.deleteFramebuffer(self.depthPeelFramebuffers[i]);
                    self.gl.deleteRenderbuffer(self.depthPeelRenderbufferDepth[i]);
                    self.gl.deleteRenderbuffer(self.depthPeelRenderbufferColor[i]);
                    self.gl.deleteTexture(self.depthPeelColorTextures[i]);
                    self.gl.deleteTexture(self.depthPeelDepthTextures[i]);
                }
                self.depthPeelFramebuffers = [];
                self.recreateDepthPeelBuffers(4096,4096);
            } else {
                self.recreateDepthPeelBuffers(2048,2048);
            }

            if(doClear) self.gl.clear(self.gl.DEPTH_BUFFER_BIT|self.gl.COLOR_BUFFER_BIT);
            const ratio = 1.0

            if(self.depthPeelFramebuffers.length>0&&self.depthPeelFramebuffers[0].width>0&&self.depthPeelFramebuffers[0].height>0){

                self.gl.enable(self.gl.DEPTH_TEST);
                const depthPeelSampler0 = 3;

                theShaders.forEach(shader => {
                        self.gl.useProgram(shader);
                        self.gl.uniform1f(shader.xSSAOScaling, 1.0/self.depthPeelFramebuffers[0].width );
                        self.gl.uniform1f(shader.ySSAOScaling, 1.0/self.depthPeelFramebuffers[0].height );
                        self.gl.uniform1i(shader.depthPeelSamplers, depthPeelSampler0);
                        })
                self.doDepthPeelPass = true;
                self.gl.disable(self.gl.BLEND);
                self.gl.enable(self.gl.DEPTH_TEST);
                for(let ipeel=0;ipeel<4;ipeel++){
                    self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.depthPeelFramebuffers[ipeel]);
                    self.gl.activeTexture(self.gl.TEXTURE0+depthPeelSampler0);
                    if(ipeel>0){
                        self.gl.bindTexture(self.gl.TEXTURE_2D, self.depthPeelDepthTextures[ipeel-1]);
                    } else {
                        self.gl.bindTexture(self.gl.TEXTURE_2D, null)
                    }
                    theShaders.forEach(shader => {
                            self.gl.useProgram(shader);
                            self.gl.uniform1i(shader.peelNumber,ipeel);
                            })
                    invMat = GLrender(self, false,doClear,ratioMult);
                    self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
                }

                self.doDepthPeelPass = false;
                theShaders.forEach(shader => {
                        self.gl.useProgram(shader);
                        self.gl.uniform1i(shader.peelNumber,-1);
                        })

                // And now accumulate onto one fullscreen quad

                const theShader = self.shaderProgramDepthPeelAccum;
                self.gl.useProgram(theShader);
                for(let i = 0; i<16; i++)
                    self.gl.disableVertexAttribArray(i);
                self.gl.enableVertexAttribArray(theShader.vertexPositionAttribute);
                self.gl.enableVertexAttribArray(theShader.vertexTextureAttribute);
                bindFramebufferDrawBuffers(self);

                const paintPMatrix = mat4.create();
                if(self.renderToTexture) {
                    if(!self.screenshotBuffersReady)
                        self.initTextureFramebuffer();
                    console.log("Binding rttFramebuffer in depth peel accumulate",self.rttFramebuffer);
                    if(!(self.offScreenFramebuffer)||(self.offScreenFramebuffer.width!=self.rttFramebuffer.width)){
                        self.offScreenReady = false
                        self.recreateOffScreeenBuffers(self.rttFramebuffer.width,self.rttFramebuffer.height);
                    }
                    self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebuffer);
                    self.gl.viewport(0, 0, self.rttFramebuffer.width, self.rttFramebuffer.height);
                    self.gl.uniform1f(theShader.xSSAOScaling, 1.0/self.rttFramebuffer.width );
                    self.gl.uniform1f(theShader.ySSAOScaling, 1.0/self.rttFramebuffer.height );
                } else {
                    if(self.useOffScreenBuffers&&self.WEBGL2){
                        if(!self.offScreenReady)
                            self.recreateOffScreeenBuffers(self.canvas.width,self.canvas.height);
                        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebuffer);
                    }
                    self.gl.viewport(0, 0, self.gl.viewportWidth, self.gl.viewportHeight);
                    self.gl.uniform1f(theShader.xSSAOScaling, 1.0/self.gl.viewportWidth );
                    self.gl.uniform1f(theShader.ySSAOScaling, 1.0/self.gl.viewportHeight );
                }
                mat4.ortho(paintPMatrix, -1.0/ratio , 1.0/ratio , -1.0, 1.0, 0.1, 1000.0);
                self.gl.uniformMatrix4fv(theShader.pMatrixUniform, false, paintPMatrix);

                self.gl.enable(self.gl.BLEND);
                self.gl.disable(self.gl.DEPTH_TEST);
                if(self.renderToTexture&&self.transparentScreenshotBackground) {
                    self.gl.clearColor(self.background_colour[0], self.background_colour[1], self.background_colour[2], 0.0);
                } else{
                    self.gl.clearColor(self.background_colour[0], self.background_colour[1], self.background_colour[2], self.background_colour[3]);
                }
                if(doClear) self.gl.clear(self.gl.DEPTH_BUFFER_BIT|self.gl.COLOR_BUFFER_BIT)
                self.gl.uniform1i(theShader.depthPeelSamplers, 0);
                self.gl.uniform1i(theShader.colorPeelSamplers, 1);
                for(let ipeel=3;ipeel>=0;ipeel--){
                    self.gl.activeTexture(self.gl.TEXTURE0);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.depthPeelDepthTextures[ipeel]);
                    self.gl.activeTexture(self.gl.TEXTURE1);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.depthPeelColorTextures[ipeel]);
                    self.gl.uniform1i(theShader.peelNumber,ipeel);
                    if (self.ext) {
                        self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_INT, 0);
                    } else {
                        self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }
            self.gl.activeTexture(self.gl.TEXTURE0);
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
        return invMat
    }

export function drawTriangles(self: MGWebGL, calculatingShadowMap, invMat) {

        const displayBuffers = self.store.getState().glRef.displayBuffers
        const hoverSize = self.store.getState().glRef.hoverSize

        const bright_y = self.background_colour[0] * 0.299 + self.background_colour[1] * 0.587 + self.background_colour[2] * 0.114;

        if(self.doShadow&&!calculatingShadowMap&&!self.drawingGBuffers){
            self.gl.activeTexture(self.gl.TEXTURE0);
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.rttTextureDepth);
        }

        for (let idx = 0; idx < displayBuffers.length; idx++) {

            if (!displayBuffers[idx].visible) {
                continue;
            }
            if(self.doStenciling){
                if(self.stencilPass&&!displayBuffers[idx].doStencil){
                    continue;
                }
                if(self.stenciling&&!displayBuffers[idx].doStencil){
                    continue;
                }
                if (!self.stenciling&&displayBuffers[idx].doStencil){
                    continue;
                }
            }

            if(self.doMultiView&&displayBuffers[idx].origin&&displayBuffers[idx].origin.length===3){
                if(Object.hasOwn(displayBuffers[idx], "isHoverBuffer")&&!displayBuffers[idx].isHoverBuffer){
                    if(displayBuffers[idx].multiViewGroup!==self.currentMultiViewGroup){
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
                if (displayBuffers[idx].transparent&&!self.drawingGBuffers) {
                    //console.log("Not doing normal drawing way ....");
                    if(!self.doPeel)
                        continue;
                }
                let theShader;
                let scaleZ = false;

                if(displayBuffers[idx].triangleInstanceOriginBuffer[j]){
                    if(self.drawingGBuffers){
                        theShader = self.shaderProgramGBuffersInstanced;
                    } else {
                        theShader = self.shaderProgramInstanced;
                        if (calculatingShadowMap)
                            theShader = self.shaderProgramInstancedShadow;
                        if(self.stencilPass)
                            theShader = self.shaderProgramInstancedOutline;
                    }
                } else {
                    if(self.drawingGBuffers){
                        theShader = self.shaderProgramGBuffers;
                    } else {
                        theShader = self.shaderProgram;
                        if (calculatingShadowMap)
                            theShader = self.shaderProgramShadow;
                        if(self.stencilPass){
                            theShader = self.shaderProgramOutline;
                            scaleZ = true;
                        }
                    }
                }

                self.gl.useProgram(theShader);
                self.gl.uniform1i(theShader.doShadows, false);
                if(self.doShadow&&!calculatingShadowMap&&!self.drawingGBuffers){
                    self.gl.uniform1i(theShader.ShadowMap, 0);
                    self.gl.uniform1f(theShader.xPixelOffset, 1.0/self.rttFramebufferDepth.width);
                    self.gl.uniform1f(theShader.yPixelOffset, 1.0/self.rttFramebufferDepth.height);
                    self.gl.uniformMatrix4fv(theShader.textureMatrixUniform, false, self.textureMatrix);
                    self.gl.uniform1i(theShader.doShadows, true);
                    if(self.renderToTexture)
                        self.gl.uniform1i(theShader.shadowQuality, 1);
                    else
                        self.gl.uniform1i(theShader.shadowQuality, 0);
                }
                if(theShader.doSSAO!=null) self.gl.uniform1i(theShader.doSSAO, self.doSSAO);
                if(theShader.doEdgeDetect!=null) self.gl.uniform1i(theShader.doEdgeDetect, self.doEdgeDetect);
                if(theShader.occludeDiffuse!=null) self.gl.uniform1i(theShader.occludeDiffuse, self.occludeDiffuse);
                if(theShader.doPerspective!=null) self.gl.uniform1i(theShader.doPerspective, self.doPerspectiveProjection);
                if(self.WEBGL2&&theShader.doEdgeDetect&&!self.drawingGBuffers){
                    self.gl.uniform1i(theShader.edgeDetectMap, 2);
                    self.gl.activeTexture(self.gl.TEXTURE2);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.edgeDetectTexture);
                    self.gl.activeTexture(self.gl.TEXTURE0);
                }
                if(self.WEBGL2&&theShader.doSSAO&&!self.drawingGBuffers){
                    //SSAO after double blur
                    self.gl.uniform1i(theShader.SSAOMap, 1);
                    self.gl.activeTexture(self.gl.TEXTURE1);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.simpleBlurYTexture);
                    self.gl.activeTexture(self.gl.TEXTURE0);
                    if(!self.doDepthPeelPass){
                        if(self.renderToTexture){
                            self.gl.uniform1f(theShader.xSSAOScaling, 1.0/self.rttFramebuffer.width );
                            self.gl.uniform1f(theShader.ySSAOScaling, 1.0/self.rttFramebuffer.height );
                        } else {
                            self.gl.uniform1f(theShader.xSSAOScaling, 1.0/self.gl.viewportWidth );
                            self.gl.uniform1f(theShader.ySSAOScaling, 1.0/self.gl.viewportHeight );
                        }
                    }
                }

                for(let i = 0; i<16; i++)
                    self.gl.disableVertexAttribArray(i);

                if(typeof(theShader.vertexNormalAttribute)!=="undefined" && theShader.vertexNormalAttribute!==null&&theShader.vertexNormalAttribute>-1){
                    if(!calculatingShadowMap){

                        self.gl.enableVertexAttribArray(theShader.vertexNormalAttribute);
                        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, triangleVertexNormalBuffer[j]);
                        if (bufferTypes[j] !== "PERFECT_SPHERES") self.gl.vertexAttribPointer(theShader.vertexNormalAttribute, triangleVertexNormalBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                    }
                }

                self.gl.enableVertexAttribArray(theShader.vertexPositionAttribute);
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                if (bufferTypes[j] !== "PERFECT_SPHERES") self.gl.vertexAttribPointer(theShader.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);

                if(self.stencilPass){
                    self.gl.disable(self.gl.DEPTH_TEST);
                    self.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                    if(bright_y<0.5)
                        self.gl.vertexAttrib4f(theShader.vertexColourAttribute, 1.0, 1.0, 1.0, 1.0);
                    else
                        self.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.0, 0.0, 0.0, 1.0);
                    const outlineSize = vec3.create();
                    vec3.set(outlineSize, 0.1, 0.1, 0.0);
                    if(scaleZ)
                        vec3.set(outlineSize, 0.1, 0.1, 0.1);
                    self.gl.uniform3fv(theShader.outlineSize, outlineSize);
                } else {
                    if(theShader.vertexColourAttribute>-1){
                        const outlineSize = vec3.create();
                        vec3.set(outlineSize, 0.0, 0.0, 0.0);
                        self.gl.uniform3fv(theShader.outlineSize, outlineSize);
                        if(displayBuffers[idx].customColour&&displayBuffers[idx].customColour.length==4){
                            self.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                            self.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...displayBuffers[idx].customColour)
                        } else {
                            self.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
                            self.gl.bindBuffer(self.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                            self.gl.vertexAttribPointer(theShader.vertexColourAttribute, triangleColourBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                        }
                    }
                }
                if (bufferTypes[j] === "TRIANGLES") {
                    if (displayBuffers[idx].transformMatrix) {
                        self.drawTransformMatrix(displayBuffers[idx].transformMatrix, displayBuffers[idx], theShader, self.gl.TRIANGLES, j);
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
                        self.gl.uniform4fv(theShader.light_colours_ambient, [sfrac,sfrac,sfrac,1.0]);
                        self.drawTransformMatrixInteractive(displayBuffers[idx].transformMatrixInteractive, displayBuffers[idx].transformOriginInteractive, displayBuffers[idx], theShader, self.gl.TRIANGLES, j);
                        self.gl.uniform4fv(theShader.light_colours_ambient, self.light_colours_ambient);
                    } else {
                        self.gl.uniform3fv(theShader.screenZ, self.screenZ);
                        if(self.stencilPass && scaleZ){
                            const outlineSize = vec3.create();
                            for(let i=0;i<10;i++){
                                vec3.set(outlineSize, 0.01*i, 0.01*i, 0.01*i);
                                self.gl.uniform3fv(theShader.outlineSize, outlineSize);
                                self.drawBuffer(displayBuffers[idx],theShader,j,self.gl.TRIANGLES);
                            }
                        } else {
                            self.drawBuffer(displayBuffers[idx],theShader,j,self.gl.TRIANGLES);
                        }
                    }
                } else if (bufferTypes[j] === "TRIANGLE_STRIP") {
                    if (displayBuffers[idx].transformMatrix) {
                        self.drawTransformMatrix(displayBuffers[idx].transformMatrix, displayBuffers[idx], self.shaderProgram, self.gl.TRIANGLE_STRIP, j);
                    } else if (displayBuffers[idx].transformMatrixInteractive) {
                        self.drawTransformMatrixInteractive(displayBuffers[idx].transformMatrixInteractive, displayBuffers[idx].transformOriginInteractive, displayBuffers[idx], self.shaderProgram, self.gl.TRIANGLE_STRIP, j);
                    } else {
                        if (self.ext) {
                        if(self.doAnaglyphStereo) {
                            self.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                            self.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...self.currentAnaglyphColor)
                        }
                            self.gl.drawElements(self.gl.TRIANGLE_STRIP, triangleVertexIndexBuffer[j].numItems, self.gl.UNSIGNED_INT, 0);
                        } else {
                            self.gl.drawElements(self.gl.TRIANGLE_STRIP, triangleVertexIndexBuffer[j].numItems, self.gl.UNSIGNED_SHORT, 0);
                        }
                    }
                }
            }

            //shaderProgramPerfectSpheres
            //FIXME - broken with gbuffers
            for(let i = 0; i<16; i++)
                self.gl.disableVertexAttribArray(i);

            if (self.frag_depth_ext) {
                const invsymt = mat4.create();
                let program = self.shaderProgramPerfectSpheres;
                if (calculatingShadowMap) {
                    program = self.shaderDepthShadowProgramPerfectSpheres;
                }
                if(self.drawingGBuffers){
                    program = self.shaderProgramGBuffersPerfectSpheres;
                }
                if(self.stencilPass){
                    program = self.shaderProgramPerfectSpheresOutline;
                }
                mat4.set(invsymt,
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0,
                );
                self.gl.useProgram(program);
                self.gl.uniformMatrix4fv(program.invSymMatrixUniform, false, invsymt);
                self.setMatrixUniforms(program);
                self.gl.disableVertexAttribArray(program.vertexColourAttribute);
                self.gl.enableVertexAttribArray(program.vertexPositionAttribute);
                if (!calculatingShadowMap) {
                    self.setLightUniforms(program,false);
                    if(program.clipCap!=null) self.gl.uniform1i(program.clipCap,self.clipCapPerfectSpheres);
                    if(program.vertexNormalAttribute!=null&&program.vertexNormalAttribute>-1) self.gl.enableVertexAttribArray(program.vertexNormalAttribute);
                }
                if(program.vertexTextureAttribute!=null) self.gl.enableVertexAttribArray(program.vertexTextureAttribute);
                if(program.vertexColourAttribute!=null) self.gl.enableVertexAttribArray(program.vertexColourAttribute);
                if(program.offsetAttribute!=null) self.gl.enableVertexAttribArray(program.offsetAttribute);
                if(program.sizeAttribute!=null) self.gl.enableVertexAttribArray(program.sizeAttribute);
                if(program.doShadows!=null) self.gl.uniform1i(program.doShadows, false);
                if(self.doShadow&&!calculatingShadowMap&&!self.drawingGBuffers){
                    self.gl.uniform1i(program.ShadowMap, 0);
                    self.gl.activeTexture(self.gl.TEXTURE0);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.rttTextureDepth);
                    self.gl.uniform1f(program.xPixelOffset, 1.0/self.rttFramebufferDepth.width);
                    self.gl.uniform1f(program.yPixelOffset, 1.0/self.rttFramebufferDepth.height);
                    self.gl.uniformMatrix4fv(program.textureMatrixUniform, false, self.textureMatrix);
                    self.gl.uniform1i(program.doShadows, true);
                    if(self.renderToTexture)
                        self.gl.uniform1i(program.shadowQuality, 1);
                    else
                        self.gl.uniform1i(program.shadowQuality, 0);
                }
                if(program.doSSAO!=null) self.gl.uniform1i(program.doSSAO, self.doSSAO);
                if(program.doEdgeDetect!=null) self.gl.uniform1i(program.doEdgeDetect, self.doEdgeDetect);
                if(program.occludeDiffuse!=null) self.gl.uniform1i(program.occludeDiffuse, self.occludeDiffuse);
                if(program.doPerspective!=null) self.gl.uniform1i(program.doPerspective, self.doPerspectiveProjection);
                if(self.WEBGL2&&program.doEdgeDetect&&!self.drawingGBuffers){
                    self.gl.uniform1i(program.edgeDetectMap, 2);
                    self.gl.activeTexture(self.gl.TEXTURE2);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.edgeDetectTexture);
                    self.gl.activeTexture(self.gl.TEXTURE0);
                }
                if(self.WEBGL2&&program.doSSAO&&!self.drawingGBuffers){
                    self.gl.uniform1i(program.SSAOMap, 1);
                    self.gl.activeTexture(self.gl.TEXTURE1);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.simpleBlurYTexture);
                    self.gl.activeTexture(self.gl.TEXTURE0);
                    if(!self.doDepthPeelPass){
                        if(self.renderToTexture){
                            self.gl.uniform1f(program.xSSAOScaling, 1.0/self.rttFramebuffer.width );
                            self.gl.uniform1f(program.ySSAOScaling, 1.0/self.rttFramebuffer.height );
                        } else {
                            self.gl.uniform1f(program.xSSAOScaling, 1.0/self.gl.viewportWidth );
                            self.gl.uniform1f(program.ySSAOScaling, 1.0/self.gl.viewportHeight );
                        }
                    }
                }

                if(self.stencilPass){
                    self.gl.disable(self.gl.DEPTH_TEST);
                    const outlineSize = vec3.create();
                    vec3.set(outlineSize, 0.1, 0.1, 0.0);
                    self.gl.uniform3fv(program.outlineSize, outlineSize);
                } else {
                    const outlineSize = vec3.create();
                    vec3.set(outlineSize, 0.0, 0.0, 0.0);
                    if(program.outlineSize!=null) self.gl.uniform3fv(program.outlineSize, outlineSize);
                }

                for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                    if (bufferTypes[j] === "PERFECT_SPHERES") {

                        const buffer = self.imageBuffer;

                        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, buffer.triangleVertexTextureBuffer[0]);
                        self.gl.vertexAttribPointer(program.vertexTextureAttribute, buffer.triangleVertexTextureBuffer[0].itemSize, self.gl.FLOAT, false, 0, 0);

                        if(program.vertexNormalAttribute!=null&&program.vertexNormalAttribute>-1){
                            self.gl.bindBuffer(self.gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[0]);
                            self.gl.vertexAttribPointer(program.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[0].itemSize, self.gl.FLOAT, false, 0, 0);
                        }

                        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[0]);
                        self.gl.vertexAttribPointer(program.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[0].itemSize, self.gl.FLOAT, false, 0, 0);
                        self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[0]);

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
                            self.gl.uniform4fv(program.light_colours_ambient, [sfrac,sfrac,sfrac,1.0]);
                            //FIXME - Looks like several unused arguments in this function.
                            self.setupModelViewTransformMatrixInteractive(displayBuffers[idx].transformMatrixInteractive, displayBuffers[idx].transformOriginInteractive, null, program, null, null, null);
                            const invsymt2 = mat4.create();
                            mat4.invert(invsymt2, displayBuffers[idx].transformMatrixInteractive);
                            invsymt2[12] = 0.0;
                            invsymt2[13] = 0.0;
                            invsymt2[14] = 0.0;
                            self.gl.uniformMatrix4fv(program.invSymMatrixUniform, false, invsymt2);
                        }
                        self.gl.enableVertexAttribArray(program.offsetAttribute);
                        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, displayBuffers[idx].triangleInstanceOriginBuffer[j]);
                        self.gl.vertexAttribPointer(program.offsetAttribute, displayBuffers[idx].triangleInstanceOriginBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                        self.gl.enableVertexAttribArray(program.sizeAttribute);
                        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, displayBuffers[idx].triangleInstanceSizeBuffer[j]);
                        self.gl.vertexAttribPointer(program.sizeAttribute, displayBuffers[idx].triangleInstanceSizeBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                        if(program.vertexColourAttribute!=null&&program.vertexColourAttribute>-1){
                            self.gl.enableVertexAttribArray(program.vertexColourAttribute);
                            self.gl.bindBuffer(self.gl.ARRAY_BUFFER, displayBuffers[idx].triangleColourBuffer[j]);
                            self.gl.vertexAttribPointer(program.vertexColourAttribute, displayBuffers[idx].triangleColourBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                        }
                        if(self.stencilPass){
                            self.gl.disableVertexAttribArray(program.vertexColourAttribute);
                            if(bright_y<0.5)
                                self.gl.vertexAttrib4f(program.vertexColourAttribute, 1.0, 1.0, 1.0, 1.0);
                            else
                                self.gl.vertexAttrib4f(program.vertexColourAttribute, 0.0, 0.0, 0.0, 1.0);
                        }
                        if (self.WEBGL2) {
                            if(program.vertexColourAttribute!=null) self.gl.vertexAttribDivisor(program.vertexColourAttribute, 1);
                            self.gl.vertexAttribDivisor(program.sizeAttribute, 1);
                            self.gl.vertexAttribDivisor(program.offsetAttribute, 1);
                            if(displayBuffers[idx].isHoverBuffer&&hoverSize>0.27){
                                self.gl.disableVertexAttribArray(program.sizeAttribute);
                                self.gl.vertexAttribDivisor(program.sizeAttribute, 0);
                                const adjustedHoverSize = hoverSize + 0.4;
                                self.gl.vertexAttrib3f(program.sizeAttribute, adjustedHoverSize, adjustedHoverSize, adjustedHoverSize, 1.0);
                            }
                            if(self.doAnaglyphStereo) {
                                self.gl.disableVertexAttribArray(program.vertexColourAttribute);
                                self.gl.vertexAttribDivisor(program.vertexColourAttribute,0);
                                self.gl.vertexAttrib4f(program.vertexColourAttribute, ...self.currentAnaglyphColor)
                            }
                            self.gl.drawElementsInstanced(self.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, self.gl.UNSIGNED_INT, 0, displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                            if(program.vertexColourAttribute!=null) self.gl.vertexAttribDivisor(program.vertexColourAttribute, 0);
                            self.gl.vertexAttribDivisor(program.sizeAttribute, 0);
                            self.gl.vertexAttribDivisor(program.offsetAttribute, 0);
                        } else {
                            if(program.vertexColourAttribute!=null) self.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 1);
                            self.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 1);
                            self.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 1);
                            self.instanced_ext.drawElementsInstancedANGLE(self.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, self.gl.UNSIGNED_INT, 0, displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                            self.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 0);
                            self.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 0);
                            self.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 0);
                        }
                        if (displayBuffers[idx].transformMatrixInteractive) {
                            self.gl.uniform4fv(program.light_colours_ambient, self.light_colours_ambient);
                            self.gl.uniformMatrix4fv(program.mvMatrixUniform, false, self.mvMatrix);
                            self.gl.uniformMatrix4fv(program.mvInvMatrixUniform, false, self.mvInvMatrix);// All else
                            self.gl.uniformMatrix4fv(program.invSymMatrixUniform, false, invsymt);
                        }

                        if(displayBuffers[idx].symmetryMatrices.length>0){
                            if(program.vertexColourAttribute>-1&&displayBuffers[idx].changeColourWithSymmetry){
                                self.gl.disableVertexAttribArray(program.vertexColourAttribute);
                                if(bright_y>0.5)
                                    self.gl.vertexAttrib4f(program.vertexColourAttribute, 0.3, 0.3, 0.3, 1.0);
                                else
                                    self.gl.vertexAttrib4f(program.vertexColourAttribute, 0.5, 0.5, 0.5, 1.0);
                            }

                            const tempMVMatrix = mat4.create();
                            const tempMVInvMatrix = mat4.create();
                            if (self.WEBGL2) {
                                if(program.vertexColourAttribute!=null) self.gl.vertexAttribDivisor(program.vertexColourAttribute, 1);
                                self.gl.vertexAttribDivisor(program.sizeAttribute, 1);
                                self.gl.vertexAttribDivisor(program.offsetAttribute, 1);
                            } else {
                                if(program.vertexColourAttribute!=null) self.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 1);
                                self.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 1);
                                self.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 1);
                            }
                            for (let isym = 0; isym < displayBuffers[idx].symmetryMatrices.length; isym++) {

                                applySymmetryMatrix(self, program,displayBuffers[idx].symmetryMatrices[isym],tempMVMatrix,tempMVInvMatrix,false)
                                    if (self.WEBGL2) {
                                        if(self.doAnaglyphStereo) {
                                            self.gl.disableVertexAttribArray(program.vertexColourAttribute);
                                            self.gl.vertexAttribDivisor(program.vertexColourAttribute,0);
                                            self.gl.vertexAttrib4f(program.vertexColourAttribute, ...self.currentAnaglyphColor)
                                        }
                                        self.gl.drawElementsInstanced(self.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, self.gl.UNSIGNED_INT, 0, displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                                    } else {
                                        self.instanced_ext.drawElementsInstancedANGLE(self.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, self.gl.UNSIGNED_INT, 0, displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                                    }

                            }
                            if (self.WEBGL2) {
                                if(program.vertexColourAttribute!=null) self.gl.vertexAttribDivisor(program.vertexColourAttribute, 0);
                                self.gl.vertexAttribDivisor(program.sizeAttribute, 0);
                                self.gl.vertexAttribDivisor(program.offsetAttribute, 0);
                            } else {
                                if(program.vertexColourAttribute!=null) self.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 0);
                                self.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 0);
                                self.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 0);
                            }
                            self.gl.uniformMatrix4fv(program.mvMatrixUniform, false, self.mvMatrix);// All else
                            self.gl.uniformMatrix4fv(program.mvInvMatrixUniform, false, self.mvInvMatrix);// All else

                            self.gl.enableVertexAttribArray(program.vertexColourAttribute);
                        }
                    }
                }

                if(program.vertexColourAttribute!=null) self.gl.enableVertexAttribArray(program.vertexColourAttribute);
                self.gl.disableVertexAttribArray(program.vertexTextureAttribute);
            }

            let shaderProgramThickLinesNormal = self.shaderProgramThickLinesNormal;
            if(self.drawingGBuffers){
                shaderProgramThickLinesNormal = self.shaderProgramGBuffersThickLinesNormal;
            } else {
                shaderProgramThickLinesNormal = self.shaderProgramThickLinesNormal;
            }

            self.gl.useProgram(shaderProgramThickLinesNormal);

            for(let i = 0; i<16; i++)
                self.gl.disableVertexAttribArray(i);

            self.gl.uniform1i(shaderProgramThickLinesNormal.shinyBack, true);
            self.setLightUniforms(shaderProgramThickLinesNormal);
            self.gl.uniform3fv(shaderProgramThickLinesNormal.screenZ, self.screenZ);
            self.gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexPositionAttribute);
            self.gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexColourAttribute);
            self.gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexNormalAttribute);
            self.gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexRealNormalAttribute);
            self.setMatrixUniforms(shaderProgramThickLinesNormal);
            self.gl.uniformMatrix4fv(shaderProgramThickLinesNormal.pMatrixUniform, false, self.pmvMatrix);

            // I do not think this is useful yet as I do not think that lines contribute to occlusion buffer.
            if(self.WEBGL2&&shaderProgramThickLinesNormal.doSSAO&&!self.drawingGBuffers){
                self.gl.uniform1i(shaderProgramThickLinesNormal.SSAOMap, 1);
                self.gl.activeTexture(self.gl.TEXTURE1);
                self.gl.bindTexture(self.gl.TEXTURE_2D, self.simpleBlurYTexture);
                self.gl.activeTexture(self.gl.TEXTURE0);
                if(!self.doDepthPeelPass){
                    if(self.renderToTexture){
                        self.gl.uniform1f(shaderProgramThickLinesNormal.xSSAOScaling, 1.0/self.rttFramebuffer.width );
                        self.gl.uniform1f(shaderProgramThickLinesNormal.ySSAOScaling, 1.0/self.rttFramebuffer.height );
                    } else {
                        self.gl.uniform1f(shaderProgramThickLinesNormal.xSSAOScaling, 1.0/self.gl.viewportWidth );
                        self.gl.uniform1f(shaderProgramThickLinesNormal.ySSAOScaling, 1.0/self.gl.viewportHeight );
                    }
                }
                if(shaderProgramThickLinesNormal.doSSAO!=null){
                    if(shaderProgramThickLinesNormal.doSSAO!=null) self.gl.uniform1i(shaderProgramThickLinesNormal.doSSAO, self.doSSAO);
                    if(shaderProgramThickLinesNormal.occludeDiffuse!=null) self.gl.uniform1i(shaderProgramThickLinesNormal.occludeDiffuse, self.occludeDiffuse);
                    if(shaderProgramThickLinesNormal.doPerspective!=null) self.gl.uniform1i(shaderProgramThickLinesNormal.doPerspective, self.doPerspectiveProjection);
                }
                //Arguably this should be zero?
                if(shaderProgramThickLinesNormal.doEdgeDetect!=null) self.gl.uniform1i(shaderProgramThickLinesNormal.doEdgeDetect, self.doEdgeDetect);
            }

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] !== "NORMALLINES") {
                    continue;
                }
                // FIXME ? We assume all are the same size. Anything else is a little tricky for now.
                if (typeof (displayBuffers[idx].primitiveSizes) !== "undefined" && typeof (displayBuffers[idx].primitiveSizes[j]) !== "undefined" && typeof (displayBuffers[idx].primitiveSizes[j][0]) !== "undefined") {
                    self.gl.uniform1f(shaderProgramThickLinesNormal.pixelZoom, displayBuffers[idx].primitiveSizes[j][0] * 0.04 * self.zoom);
                } else {
                    self.gl.uniform1f(shaderProgramThickLinesNormal.pixelZoom, 1.0 * 0.04 * self.zoom);
                }
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, triangleVertexNormalBuffer[j]);
                self.gl.vertexAttribPointer(shaderProgramThickLinesNormal.vertexNormalAttribute, triangleVertexNormalBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, triangleVertexRealNormalBuffer[j]);
                self.gl.vertexAttribPointer(shaderProgramThickLinesNormal.vertexRealNormalAttribute, triangleVertexRealNormalBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                self.gl.vertexAttribPointer(shaderProgramThickLinesNormal.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                if(displayBuffers[idx].customColour&&displayBuffers[idx].customColour.length==4){
                    self.gl.disableVertexAttribArray(self.shaderProgramThickLinesNormal.vertexColourAttribute);
                    self.gl.vertexAttrib4f(self.shaderProgramThickLinesNormal.vertexColourAttribute, ...displayBuffers[idx].customColour)
                } else {
                    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                    self.gl.vertexAttribPointer(shaderProgramThickLinesNormal.vertexColourAttribute, triangleColourBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                }
                self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);

                if (displayBuffers[idx].transformMatrix) {
                    self.drawTransformMatrixPMV(displayBuffers[idx].transformMatrix, displayBuffers[idx], shaderProgramThickLinesNormal, self.gl.TRIANGLES, j);
                } else {
                    if (self.ext) {
                        self.drawMaxElementsUInt(self.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems);
                    } else {
                        self.gl.drawElements(self.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems, self.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }

            self.gl.disableVertexAttribArray(shaderProgramThickLinesNormal.vertexRealNormalAttribute);

            if(self.drawingGBuffers){
                //FIXME - Don't skip on thick lines.
                //console.log("Skip most stuff!");
                continue;
            }

            if(self.stencilPass){
                continue;
            }

            if (calculatingShadowMap)
                continue; //Nothing else implemented
            //Cylinders here

            //vertex attribute settings are likely wrong from here on... (REALLY - I HOPE NOT! SJM 26/10/2023)

            const sphereProgram = self.shaderProgramPointSpheres;

            self.gl.useProgram(sphereProgram);

            for(let i = 0; i<16; i++)
                self.gl.disableVertexAttribArray(i);

            self.gl.enableVertexAttribArray(sphereProgram.vertexPositionAttribute);
            self.gl.enableVertexAttribArray(sphereProgram.vertexNormalAttribute);

            const scaleMatrices = displayBuffers[idx].supplementary["scale_matrices"];
            self.gl.disableVertexAttribArray(sphereProgram.vertexColourAttribute);

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                let theseScaleMatrices = [];
                if (bufferTypes[j] !== "SPHEROIDS" && bufferTypes[j] !== "POINTS_SPHERES") {
                    continue;
                }
                let buffer;
                let radMult;
                if (bufferTypes[j] === "POINTS_SPHERES" || bufferTypes[j] === "SPHEROIDS") {
                    buffer = self.sphereBuffer;
                    radMult = 1.0;
                    if (bufferTypes[j] === "SPHEROIDS") {
                        theseScaleMatrices = scaleMatrices[j];
                    }
                }
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[0]);
                self.gl.vertexAttribPointer(sphereProgram.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[0].itemSize, self.gl.FLOAT, false, 0, 0);
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[0]);
                self.gl.vertexAttribPointer(sphereProgram.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[0].itemSize, self.gl.FLOAT, false, 0, 0);
                self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[0]);
                let isphere;

                // FIXME - The scaling will be a property of each object. e.g. B/U factors.
                //       - Perhaps we should have different shaders for scaled objects?
                let scaleMatrix = mat3.clone([1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]);
                self.gl.uniformMatrix3fv(sphereProgram.scaleMatrix, false, scaleMatrix);

                const theOffSet = new Float32Array(3);
                if (theseScaleMatrices.length === triangleVertices[j].length / 3) {
                    for (isphere = 0; isphere < triangleVertices[j].length / 3; isphere++) {
                        scaleMatrix = mat3.clone(theseScaleMatrices[isphere]);
                        self.gl.uniformMatrix3fv(sphereProgram.scaleMatrix, false, scaleMatrix);
                        theOffSet[0] = triangleVertices[j][isphere * 3];
                        theOffSet[1] = triangleVertices[j][isphere * 3 + 1];
                        theOffSet[2] = triangleVertices[j][isphere * 3 + 2];
                        self.gl.vertexAttrib4f(sphereProgram.vertexColourAttribute, triangleColours[j][isphere * 4], triangleColours[j][isphere * 4 + 1], triangleColours[j][isphere * 4 + 2], triangleColours[j][isphere * 4 + 3]);
                        self.gl.uniform3fv(sphereProgram.offset, theOffSet);
                        self.gl.uniform1f(sphereProgram.size, primitiveSizes[j][isphere] * radMult);
                        if (displayBuffers[idx].transformMatrix) {
                            self.drawTransformMatrix(displayBuffers[idx].transformMatrix, buffer, sphereProgram, self.gl.TRIANGLES, j);
                        } else if (displayBuffers[idx].transformMatrixInteractive) {
                            self.drawTransformMatrixInteractive(displayBuffers[idx].transformMatrixInteractive, displayBuffers[idx].transformOriginInteractive, buffer, sphereProgram, self.gl.TRIANGLES, j);
                        } else {
                            if (self.ext) {
                                if(self.doAnaglyphStereo) {
                                    self.gl.disableVertexAttribArray(sphereProgram.vertexColourAttribute);
                                    self.gl.vertexAttribDivisor(sphereProgram.vertexColourAttribute,0);
                                    self.gl.vertexAttrib4f(sphereProgram.vertexColourAttribute, ...self.currentAnaglyphColor)
                                }
                                self.drawMaxElementsUInt(self.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems);
                            } else {
                                self.gl.drawElements(self.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems, self.gl.UNSIGNED_SHORT, 0);
                            }
                        }
                    }
                } else {
                    for (isphere = 0; isphere < triangleVertices[j].length / 3; isphere++) {
                        theOffSet[0] = triangleVertices[j][isphere * 3];
                        theOffSet[1] = triangleVertices[j][isphere * 3 + 1];
                        theOffSet[2] = triangleVertices[j][isphere * 3 + 2];
                        self.gl.vertexAttrib4f(sphereProgram.vertexColourAttribute, triangleColours[j][isphere * 4], triangleColours[j][isphere * 4 + 1], triangleColours[j][isphere * 4 + 2], triangleColours[j][isphere * 4 + 3]);
                        self.gl.uniform3fv(sphereProgram.offset, theOffSet);
                        self.gl.uniform1f(sphereProgram.size, primitiveSizes[j][isphere] * radMult);
                        if (displayBuffers[idx].transformMatrix) {
                            self.drawTransformMatrix(displayBuffers[idx].transformMatrix, buffer, sphereProgram, self.gl.TRIANGLES, j);
                        } else if (displayBuffers[idx].transformMatrixInteractive) {
                            self.drawTransformMatrixInteractive(displayBuffers[idx].transformMatrixInteractive, displayBuffers[idx].transformOriginInteractive, buffer, sphereProgram, self.gl.TRIANGLES, j);
                        } else {
                            if (self.ext) {
                                if(self.doAnaglyphStereo) {
                                    self.gl.disableVertexAttribArray(sphereProgram.vertexColourAttribute);
                                    self.gl.vertexAttribDivisor(sphereProgram.vertexColourAttribute,0);
                                    self.gl.vertexAttrib4f(sphereProgram.vertexColourAttribute, ...self.currentAnaglyphColor)
                                }
                                self.drawMaxElementsUInt(self.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems);
                            } else {
                                self.gl.drawElements(self.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems, self.gl.UNSIGNED_SHORT, 0);
                            }
                        }
                    }
                }
            }
            self.gl.enableVertexAttribArray(sphereProgram.vertexColourAttribute);

            self.gl.useProgram(self.shaderProgramTwoDShapes);
            self.setMatrixUniforms(self.shaderProgramTwoDShapes);
            self.gl.disableVertexAttribArray(self.shaderProgramTwoDShapes.vertexColourAttribute);
            self.gl.vertexAttrib4f(self.shaderProgramTwoDShapes.vertexColourAttribute, 1.0, 1.0, 0.0, 1.0);
            const diskVertices = [];
            if (typeof (self.diskVertices) !== "undefined") {
                for (let iv = 0; iv < self.diskVertices.length; iv += 3) {
                    const vold = vec3Create([self.diskVertices[iv], self.diskVertices[iv + 1], self.diskVertices[iv + 2]]);
                    const vnew = vec3.create();
                    vec3.transformMat4(vnew, vold, invMat);
                    diskVertices[iv] = vnew[0];
                    diskVertices[iv + 1] = vnew[1];
                    diskVertices[iv + 2] = vnew[2];
                }
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.diskBuffer.triangleVertexPositionBuffer[0]);
                self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(diskVertices), self.gl.DYNAMIC_DRAW);
            }
            const imageVertices = [];
            if (typeof (self.imageVertices) !== "undefined") {
                for (let iv = 0; iv < self.imageVertices.length; iv += 3) {
                    const vold = vec3Create([self.imageVertices[iv], self.imageVertices[iv + 1], self.imageVertices[iv + 2]]);
                    const vnew = vec3.create();
                    vec3.transformMat4(vnew, vold, invMat);
                    imageVertices[iv] = vnew[0];
                    imageVertices[iv + 1] = vnew[1];
                    imageVertices[iv + 2] = vnew[2];
                }
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.imageBuffer.triangleVertexPositionBuffer[0]);
                self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(imageVertices), self.gl.DYNAMIC_DRAW);
            }
            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] === "POINTS") {
                    const buffer = self.diskBuffer;
                    let scaleImage = true;
                    if (typeof (self.gl, displayBuffers[idx].supplementary["vert_tri_2d"]) !== "undefined") {
                        const tempMVMatrix = mat4.create();
                        mat4.set(tempMVMatrix, self.mvMatrix[0], self.mvMatrix[1], self.mvMatrix[2], self.mvMatrix[3], self.mvMatrix[4], self.mvMatrix[5], self.mvMatrix[6], self.mvMatrix[7], self.mvMatrix[8], self.mvMatrix[9], self.mvMatrix[10], self.mvMatrix[11], (-24.0 + displayBuffers[idx].supplementary["vert_tri_2d"][0][0] * 48.0) * self.zoom, (-24.0 + displayBuffers[idx].supplementary["vert_tri_2d"][0][1] * 48.0) * self.zoom, -self.fogClipOffset, 1.0);
                        self.gl.uniformMatrix4fv(self.shaderProgramTwoDShapes.mvMatrixUniform, false, tempMVMatrix);
                        scaleImage = false;
                    }

                    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[0]);
                    self.gl.vertexAttribPointer(self.shaderProgramTwoDShapes.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[0].itemSize, self.gl.FLOAT, false, 0, 0);
                    self.gl.bindBuffer(self.gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[0]);
                    self.gl.vertexAttribPointer(self.shaderProgramTwoDShapes.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[0].itemSize, self.gl.FLOAT, false, 0, 0);
                    self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[0]);
                    // FIXME - And loop here
                    const theOffSet = new Float32Array(3);
                    for (let ishape = 0; ishape < triangleVertices[j].length / 3; ishape++) {
                        theOffSet[0] = triangleVertices[j][ishape * 3];
                        theOffSet[1] = triangleVertices[j][ishape * 3 + 1];
                        theOffSet[2] = triangleVertices[j][ishape * 3 + 2];
                        self.gl.uniform3fv(self.shaderProgramTwoDShapes.offset, theOffSet);
                        if (scaleImage) {
                            self.gl.uniform1f(self.shaderProgramTwoDShapes.size, primitiveSizes[j][ishape]);
                        } else {
                            self.gl.uniform1f(self.shaderProgramTwoDShapes.size, primitiveSizes[j][ishape] * self.zoom);
                        }

                        self.gl.vertexAttrib4f(self.shaderProgramTwoDShapes.vertexColourAttribute, triangleColours[j][ishape * 4], triangleColours[j][ishape * 4 + 1], triangleColours[j][ishape * 4 + 2], triangleColours[j][ishape * 4 + 3]);

                        if (self.ext) {
                            self.gl.drawElements(self.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, self.gl.UNSIGNED_INT, 0);
                        } else {
                            self.gl.drawElements(self.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, self.gl.UNSIGNED_SHORT, 0);
                        }
                    }
                    if (typeof (self.gl, displayBuffers[idx].supplementary["vert_tri_2d"]) !== "undefined") {
                        self.setMatrixUniforms(self.shaderProgramTwoDShapes);
                    }
                }
            }

            self.gl.enableVertexAttribArray(self.shaderProgramTwoDShapes.vertexColourAttribute);

            self.gl.useProgram(self.shaderProgramLines);
            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] !== "LINE_LOOP" && bufferTypes[j] !== "LINE_STRIP") {
                    continue;
                }
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                self.gl.vertexAttribPointer(self.shaderProgramLines.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                self.gl.vertexAttribPointer(self.shaderProgramLines.vertexColourAttribute, triangleColourBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);
                //self.gl.disableVertexAttribArray(2)
                if (bufferTypes[j] === "LINES") {
                    //console.log("Try to draw "+triangleVertexIndexBuffer[j].numItems+" lines, "+triangleColourBuffer[j].numItems+" colours, "+triangleVertexPositionBuffer[j].numItems+" vertices.");
                    if (self.ext) {
                        self.gl.drawElements(self.gl.LINES, triangleVertexIndexBuffer[j].numItems, self.gl.UNSIGNED_INT, 0);
                    } else {
                        self.gl.drawElements(self.gl.LINES, triangleVertexIndexBuffer[j].numItems, self.gl.UNSIGNED_SHORT, 0);
                    }
                }
                if (bufferTypes[j] === "LINE_STRIP") {
                    //console.log("Try to draw "+triangleVertexIndexBuffer[j].numItems+" lines, "+triangleColourBuffer[j].numItems+" colours, "+triangleVertexPositionBuffer[j].numItems+" vertices.");
                    if (self.ext) {
                        self.gl.drawElements(self.gl.LINE_STRIP, triangleVertexIndexBuffer[j].numItems, self.gl.UNSIGNED_INT, 0);
                    } else {
                        self.gl.drawElements(self.gl.LINE_STRIP, triangleVertexIndexBuffer[j].numItems, self.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }

            self.gl.useProgram(self.shaderProgramThickLines);
            self.gl.uniform3fv(self.shaderProgramThickLines.screenZ, self.screenZ);
            self.gl.enableVertexAttribArray(self.shaderProgramThickLines.vertexNormalAttribute);
            self.setMatrixUniforms(self.shaderProgramThickLines);
            self.gl.uniformMatrix4fv(self.shaderProgramThickLines.pMatrixUniform, false, self.pmvMatrix);

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] !== "LINES" && bufferTypes[j] !== "CIRCLES") {
                    continue;
                }
                // FIXME ? We assume all are the same size. Anything else is a little tricky for now.
                if (typeof (displayBuffers[idx].primitiveSizes) !== "undefined" && typeof (displayBuffers[idx].primitiveSizes[j]) !== "undefined" && typeof (displayBuffers[idx].primitiveSizes[j][0]) !== "undefined") {
                    self.gl.uniform1f(self.shaderProgramThickLines.pixelZoom, displayBuffers[idx].primitiveSizes[j][0] * 0.04 * self.zoom);
                } else {
                    self.gl.uniform1f(self.shaderProgramThickLines.pixelZoom, 1.0 * 0.04 * self.zoom);
                }
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, triangleVertexNormalBuffer[j]);
                self.gl.vertexAttribPointer(self.shaderProgramThickLines.vertexNormalAttribute, triangleVertexNormalBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                self.gl.vertexAttribPointer(self.shaderProgramThickLines.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                self.gl.bindBuffer(self.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                if(displayBuffers[idx].customColour&&displayBuffers[idx].customColour.length==4){
                    self.gl.disableVertexAttribArray(self.shaderProgramThickLines.vertexColourAttribute);
                    self.gl.vertexAttrib4f(self.shaderProgramThickLines.vertexColourAttribute, ...displayBuffers[idx].customColour)
                } else {
                    self.gl.enableVertexAttribArray(self.shaderProgramThickLines.vertexColourAttribute);
                    self.gl.vertexAttribPointer(self.shaderProgramThickLines.vertexColourAttribute, triangleColourBuffer[j].itemSize, self.gl.FLOAT, false, 0, 0);
                }
                self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);

                if (displayBuffers[idx].transformMatrix) {
                    self.drawTransformMatrixPMV(displayBuffers[idx].transformMatrix, displayBuffers[idx], self.shaderProgramThickLines, self.gl.TRIANGLES, j);
                } else if (displayBuffers[idx].transformMatrixInteractive) {
                    self.drawTransformMatrixInteractivePMV(displayBuffers[idx].transformMatrixInteractive, displayBuffers[idx].transformOriginInteractive, displayBuffers[idx], self.shaderProgramThickLines, self.gl.TRIANGLES, j);
                } else {
                    if (self.ext) {
                        self.drawMaxElementsUInt(self.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems);
                    } else {
                        self.gl.drawElements(self.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems, self.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }
        }
    }

export function drawScene(self: MGWebGL) : void {

        if(self.renderToTexture&&(!self.screenshotBuffersReady))
            self.initTextureFramebuffer();

        const displayBuffers = self.store.getState().glRef.displayBuffers

        let dirty = false
        const thisdisplayBufferslength = displayBuffers.length;

        for (let idx = 0; idx < thisdisplayBufferslength; idx++) {
            if (displayBuffers[idx].isDirty) {
                dirty = true;
                break
            }
        }
        if(dirty) self.buildBuffers()
        if(isNaN(self.myQuat[0])||isNaN(self.myQuat[1])||isNaN(self.myQuat[2])||isNaN(self.myQuat[3])){
            console.log("Something's gone wrong!!!!!!!!!!!!!")
            console.log(self.myQuat)
        }

        if(!self.animating) self.props.onQuatChanged(self.myQuat)
        self.props.setDrawQuat(self.myQuat)

        const theShaders = [
            self.shaderProgram,
            self.shaderProgramInstanced,
            self.shaderProgramThickLinesNormal,
            self.shaderProgramPerfectSpheres,
            self.shaderProgramTextInstanced
        ];

        theShaders.forEach(shader => {
            self.gl.useProgram(shader);
            self.gl.uniform1i(shader.peelNumber,-1);
        })

        self.currentViewport = [0, 0, self.gl.viewportWidth, self.gl.viewportHeight]
        const oldMouseDown = self.mouseDown;

        const origQuat = quat4.clone(self.myQuat);
        const origOrigin = self.origin
        const multiViewInfo = getMultiViewInfo(self)
        const multiViewOrigins = multiViewInfo.multiViewOrigins
        const multiViewGroupsKeys = multiViewInfo.multiViewGroupsKeys
        const quats = multiViewInfo.quats
        const viewports = multiViewInfo.viewports
        const ratioMult = multiViewInfo.ratioMult
        const multi_rows_cols = multiViewInfo.multi_rows_cols

        if ((self.doEdgeDetect||self.doSSAO)&&self.WEBGL2) {
            if(self.renderToTexture) {
                self.gBuffersFramebufferSize = 4096;
                if(self.gFramebuffer){
                    self.gl.deleteFramebuffer(self.gFramebuffer);
                    self.gFramebuffer = null;
                }
                self.createGBuffers(self.gBuffersFramebufferSize,self.gBuffersFramebufferSize);
            }
            if(!self.gFramebuffer) self.createGBuffers(self.gBuffersFramebufferSize,self.gBuffersFramebufferSize);
            //console.log("Do G-buffer pass for gPosition and gNormal)")
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.gFramebuffer);
            self.gl.drawBuffers([self.gl.COLOR_ATTACHMENT0,self.gl.COLOR_ATTACHMENT1]);

            // Need triangle and perfect sphere gBuffer shaders
            self.drawingGBuffers = true;
            self.gl.enable(self.gl.DEPTH_TEST);

            if(self.doMultiView||self.doThreeWayView||self.doSideBySideStereo||self.doCrossEyedStereo){
                for(let i=0;i<viewports.length;i++){
                    if(self.doMultiView){
                        if(multiViewGroupsKeys.length>0){
                            self.currentMultiViewGroup = parseInt(multiViewGroupsKeys[i])
                            if(i<multiViewOrigins.length&& multiViewOrigins[i]&& multiViewOrigins[i].length===3)
                                self.origin = multiViewOrigins[i]
                        } else {
                            continue
                        }
                    }

                    const newXQuat = quat4.clone(origQuat);
                    quat4.multiply(newXQuat, newXQuat, quats[i]);
                    self.myQuat = newXQuat
                    self.currentViewport = viewports[i]
                    const invQuat = quat4.create();
                    quat4Inverse(self.myQuat, invQuat);
                    const invMat = quatToMat4(invQuat);

                    const imageVertices = [];
                    if(typeof (self.imageVertices) !== "undefined") {
                        for (let iv = 0; iv < self.imageVertices.length; iv += 3) {
                            const vold = vec3Create([self.imageVertices[iv], self.imageVertices[iv + 1], self.imageVertices[iv + 2]]);
                            const vnew = vec3.create();
                            vec3.transformMat4(vnew, vold, invMat);
                            imageVertices[iv] = vnew[0];
                            imageVertices[iv + 1] = vnew[1];
                            imageVertices[iv + 2] = vnew[2];
                        }
                        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.imageBuffer.triangleVertexPositionBuffer[0]);
                        self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(imageVertices), self.gl.DYNAMIC_DRAW);
                    }

                    const doClear = i===0 ? true : false
                    GLrender(self, false,doClear,ratioMult);
                }
                self.myQuat = origQuat
                if(self.doMultiView&&multiViewGroupsKeys.length===0){
                    GLrender(self, false);
                }
                self.origin = origOrigin
            } else {
                self.currentViewport = [0, 0, self.gl.viewportWidth, self.gl.viewportHeight]
                GLrender(self, false);
            }

            self.drawingGBuffers = false;

            self.gl.drawBuffers([self.gl.COLOR_ATTACHMENT0]);
        }

        const f = self.gl_clipPlane0[3]+self.fogClipOffset;
        const b = Math.min(self.gl_clipPlane1[3],self.gl_fog_end);

        self.doPeel = false;
        if(self.doOrderIndependentTransparency){
            for (let idx = 0; idx < displayBuffers.length && !self.doPeel; idx++) {
                if (displayBuffers[idx].visible) {
                    const triangleVertexIndexBuffer = displayBuffers[idx].triangleVertexIndexBuffer;
                    for (let j = 0; j < triangleVertexIndexBuffer.length&& !self.doPeel; j++) {
                        if (displayBuffers[idx].transparent&&!displayBuffers[idx].isHoverBuffer) {
                            self.doPeel = true;
                        }
                    }
                }
            }
        }

        if (self.doEdgeDetect&&self.WEBGL2) {

            const ratio = 1.0 * self.gl.viewportWidth / self.gl.viewportHeight;

            if(self.renderToTexture) {
                self.edgeDetectFramebufferSize = 4096;
                if(self.edgeDetectFramebuffer){
                    self.gl.deleteFramebuffer(self.edgeDetectFramebuffer);
                    self.edgeDetectFramebuffer = null;
                }
                self.createGBuffers(self.gBuffersFramebufferSize,self.gBuffersFramebufferSize);
                if(!self.edgeDetectFramebuffer) self.createEdgeDetectFramebufferBuffer(4096,4096);
            } else {
                if(!self.edgeDetectFramebuffer){
                    if(ratio>1.0)
                        self.createEdgeDetectFramebufferBuffer(self.edgeDetectFramebufferSize,self.edgeDetectFramebufferSize/ratio);
                    else
                        self.createEdgeDetectFramebufferBuffer(self.edgeDetectFramebufferSize*ratio,self.edgeDetectFramebufferSize);
                }
            }

            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.edgeDetectFramebuffer);

            self.gl.useProgram(self.shaderProgramEdgeDetect);
            self.gl.uniform1i(self.shaderProgramEdgeDetect.gPositionTexture,0);
            self.gl.uniform1i(self.shaderProgramEdgeDetect.gNormalTexture,1);
            self.gl.uniform1f(self.shaderProgramEdgeDetect.zoom,self.zoom);
            self.gl.uniform1f(self.shaderProgramEdgeDetect.depthBufferSize,(f+b)*2.);

            self.gl.uniform1f(self.shaderProgramEdgeDetect.depthThreshold,self.depthThreshold);
            self.gl.uniform1f(self.shaderProgramEdgeDetect.normalThreshold,self.normalThreshold);
            if(self.renderToTexture){
                self.gl.uniform1f(self.shaderProgramEdgeDetect.scaleDepth,self.scaleDepth*4096./self.gl.viewportWidth*.5);
                self.gl.uniform1f(self.shaderProgramEdgeDetect.scaleNormal,self.scaleNormal*4096./self.gl.viewportWidth*.5);
            } else {
                self.gl.uniform1f(self.shaderProgramEdgeDetect.scaleDepth,self.scaleDepth/ratio);
                self.gl.uniform1f(self.shaderProgramEdgeDetect.scaleNormal,self.scaleNormal);
            }
            self.gl.uniform1f(self.shaderProgramEdgeDetect.xPixelOffset, 2.0/self.edgeDetectFramebuffer.width/ratio);
            self.gl.uniform1f(self.shaderProgramEdgeDetect.yPixelOffset, 2.0/self.edgeDetectFramebuffer.height/ratio);
            if(self.doPerspectiveProjection){
                self.gl.uniform1f(self.shaderProgramEdgeDetect.depthFactor, 1.0/80.0);
            } else {
                self.gl.uniform1f(self.shaderProgramEdgeDetect.depthFactor, 1.0);
            }

            self.gl.activeTexture(self.gl.TEXTURE0);
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.gBufferPositionTexture);
            self.gl.activeTexture(self.gl.TEXTURE1);
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.gBufferNormalTexture);

            for(let i = 0; i<16; i++)
                self.gl.disableVertexAttribArray(i);
            self.gl.enableVertexAttribArray(self.shaderProgramEdgeDetect.vertexTextureAttribute);
            self.gl.enableVertexAttribArray(self.shaderProgramEdgeDetect.vertexPositionAttribute);
            //FIXME - Size
            if(self.renderToTexture) {
                self.gl.viewport(0, 0, self.edgeDetectFramebufferSize, self.edgeDetectFramebufferSize);
            } else {
                if(ratio>1.0)
                    self.gl.viewport(0, 0, self.edgeDetectFramebufferSize, self.edgeDetectFramebufferSize/ratio);
                else
                    self.gl.viewport(0, 0, self.edgeDetectFramebufferSize*ratio, self.edgeDetectFramebufferSize);
            }

            const paintMvMatrix = mat4.create();
            const paintPMatrix = mat4.create();
            mat4.identity(paintMvMatrix);
            mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);
            self.gl.uniformMatrix4fv(self.shaderProgramEdgeDetect.pMatrixUniform, false, paintPMatrix);
            self.gl.uniformMatrix4fv(self.shaderProgramEdgeDetect.mvMatrixUniform, false, paintMvMatrix);

            self.gl.clearBufferfv(self.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
            bindFramebufferDrawBuffers(self);

            if (self.ext) {
                self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_INT, 0);
            } else {
                self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_SHORT, 0);
            }
        }

        if (self.doSSAO&&self.WEBGL2) {
            if(self.renderToTexture){
                self.ssaoFramebufferSize = 4096;
                if(self.ssaoFramebuffer){
                    self.gl.deleteFramebuffer(self.ssaoFramebuffer);
                    self.ssaoFramebuffer = null;
                }
            }

            if(!self.ssaoFramebuffer) self.createSSAOFramebufferBuffer();
            if(!self.offScreenFramebufferSimpleBlurX) self.createSimpleBlurOffScreeenBuffers();

            // HBAO prototype: flip the AO pass to the horizon-based shader when
            // useHBAO is set and its program compiled. Both shaders share this
            // pass's scaffolding (framebuffer, G-buffer/noise textures, tile
            // uniforms, fullscreen-quad draw, blur) - only the program and a few
            // uniforms differ, so we alias the active program as `ao` here.
            const usingHBAO = self.useHBAO && self.shaderProgramHBAO;
            const ao = usingHBAO ? self.shaderProgramHBAO : self.shaderProgramSSAO;

            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.ssaoFramebuffer);
            self.gl.useProgram(ao);
            self.gl.bindBuffer(self.gl.UNIFORM_BUFFER, self.ssaoKernelBuffer);
            self.gl.uniform1i(ao.gPositionTexture,0);
            self.gl.uniform1i(ao.gNormalTexture,1);
            self.gl.uniform1i(ao.texNoiseTexture,2);

            self.gl.uniform1f(ao.depthBufferSize,b+f);
            if(self.doPerspectiveProjection){
                self.gl.uniform1f(ao.depthFactor,1.0/80.0);
                self.gl.uniform1f(ao.radius,self.ssaoRadius*2.0);
            } else {
                self.gl.uniform1f(ao.depthFactor,1.0);
                self.gl.uniform1f(ao.radius,self.ssaoRadius/self.zoom);
            }

            if(usingHBAO){
                // Quality tier -> (directions, steps). Kept <= the shader's
                // MAX_DIRECTIONS/MAX_STEPS (12).
                const tiers = [ [4,4], [6,6], [8,8] ];
                const tier = tiers[Math.max(0, Math.min(2, self.ssaoQuality|0))];
                self.gl.uniform1i(ao.numDirections, tier[0]);
                self.gl.uniform1i(ao.numSteps, tier[1]);
                self.gl.uniform1f(ao.strength, self.ssaoStrength);
                self.gl.uniform1f(ao.angleBias, 0.30); // ~17 deg, rejects self-occlusion
            } else {
                self.gl.uniform1f(ao.bias,self.ssaoBias);
            }
            self.gl.activeTexture(self.gl.TEXTURE0);
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.gBufferPositionTexture);
            self.gl.activeTexture(self.gl.TEXTURE1);
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.gBufferNormalTexture);
            self.gl.activeTexture(self.gl.TEXTURE2);
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.ssaoNoiseTexture);

            for(let i = 0; i<16; i++)
                self.gl.disableVertexAttribArray(i);
            self.gl.enableVertexAttribArray(ao.vertexTextureAttribute);
            self.gl.enableVertexAttribArray(ao.vertexPositionAttribute);

            //These things probably need tweaking in the SSAO multiview case
            self.gl.uniform1f(ao.tileScaleBase_x,0.0);
            self.gl.uniform1f(ao.tileScaleBase_y,0.0);

            if(self.doThreeWayView) {
                self.gl.uniform1f(ao.tileScale_x,0.5);
                self.gl.uniform1f(ao.tileScale_y,0.5);
            } else if(self.doSideBySideStereo||self.doCrossEyedStereo) {
                self.gl.uniform1f(ao.tileScale_x,0.5);
                self.gl.uniform1f(ao.tileScale_y,1.0);
            } else if(self.doMultiView&&multi_rows_cols.rows>0&&multi_rows_cols.cols>0) {
                self.gl.uniform1f(ao.tileScale_x,1.0/multi_rows_cols.cols);
                self.gl.uniform1f(ao.tileScale_y,1.0/multi_rows_cols.rows);
            } else {
                self.gl.uniform1f(ao.tileScale_x,1.0);
                self.gl.uniform1f(ao.tileScale_y,1.0);
            }

            self.gl.viewport(0, 0, self.ssaoFramebuffer.width, self.ssaoFramebuffer.height);

            const paintMvMatrix = mat4.create();
            const paintPMatrix = mat4.create();
            mat4.identity(paintMvMatrix);
            if(self.doPerspectiveProjection){
                mat4.ortho(paintPMatrix, -2.85 , 2.85 , -2.85, 2.85, 0.1, 1000.0);
            } else {
                mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);
            }
            self.gl.uniformMatrix4fv(ao.pMatrixUniform, false, paintPMatrix);
            self.gl.uniformMatrix4fv(ao.mvMatrixUniform, false, paintMvMatrix);

            self.gl.clearBufferfv(self.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
            bindFramebufferDrawBuffers(self);

            if(usingHBAO){
                // HBAO doesn't use the SSAO kernel UBO. Crucially, bindSSAOBuffers()
                // does gl.useProgram(shaderProgramSSAO) internally, so calling it here
                // would silently switch the draw back to SSAO - re-assert HBAO instead.
                self.gl.useProgram(ao);
            } else {
                self.bindSSAOBuffers()
            }

            if (self.ext) {
                self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_INT, 0);
            } else {
                self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_SHORT, 0);
            }

            // Now blur ....

            textureBlur(self, self.offScreenFramebufferSimpleBlurX.width,self.offScreenFramebufferSimpleBlurX.height,self.ssaoTexture);

        }

        if((self.doEdgeDetect||self.doSSAO)&&self.WEBGL2) {
            //Back to normal
            self.gl.activeTexture(self.gl.TEXTURE2);
            self.gl.bindTexture(self.gl.TEXTURE_2D, null);
            self.gl.activeTexture(self.gl.TEXTURE1);
            self.gl.bindTexture(self.gl.TEXTURE_2D, null);
            self.gl.activeTexture(self.gl.TEXTURE0);
            self.gl.bindTexture(self.gl.TEXTURE_2D, null);
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
        }

        if (self.doShadow) {
            self.calculatingShadowMap = true;
            GLrender(self, true);
            self.calculatingShadowMap = false;

            //FIXME - This is all following mgfbo.cc
            self.textureMatrix = mat4.create();
            mat4.identity(self.textureMatrix);
            mat4.translate(self.textureMatrix, self.textureMatrix, [0.5, 0.5, 0.5]);
            mat4.scale(self.textureMatrix, self.textureMatrix, [0.5, 0.5, 0.5]);
            mat4.multiply(self.textureMatrix, self.textureMatrix, self.pMatrix);
            mat4.multiply(self.textureMatrix, self.textureMatrix, self.mvMatrix);
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
        }

        self.stencilPass = false;

        let invMat;

        self.renderSilhouettesToTexture = false;

        if(self.doStenciling){
            //Framebuffer way
            self.renderSilhouettesToTexture = true;
            self.stenciling = false;
            invMat = GLrender(self, false);
            self.gl.clear(self.gl.COLOR_BUFFER_BIT);
            self.stenciling = true;
            invMat = GLrender(self, false);
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
            self.renderSilhouettesToTexture = false;
            self.stenciling = false;
            invMat = GLrender(self, false);

            self.gl.useProgram(self.shaderProgramOverlay);
            for(let i = 0; i<16; i++)
                self.gl.disableVertexAttribArray(i);
            self.gl.enableVertexAttribArray(self.shaderProgramOverlay.vertexTextureAttribute);
            self.gl.enableVertexAttribArray(self.shaderProgramOverlay.vertexPositionAttribute);

            self.gl.uniform1i(self.shaderProgramOverlay.inputTexture,0);
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.silhouetteTexture);

            self.gl.viewport(0, 0, self.gl.viewportWidth, self.gl.viewportHeight);

            const paintMvMatrix = mat4.create();
            const paintPMatrix = mat4.create();
            mat4.identity(paintMvMatrix);
            mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);

            self.gl.uniformMatrix4fv(self.shaderProgramOverlay.pMatrixUniform, false, paintPMatrix);
            self.gl.uniformMatrix4fv(self.shaderProgramOverlay.mvMatrixUniform, false, paintMvMatrix);

            bindFramebufferDrawBuffers(self);

            self.gl.depthFunc(self.gl.ALWAYS);
            if (self.ext) {
                self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_INT, 0);
            } else {
                self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_SHORT, 0);
            }
            self.gl.bindTexture(self.gl.TEXTURE_2D, null)
            self.gl.depthFunc(self.gl.LESS);

        } else {
            self.gl.stencilMask(0x00);
            self.gl.disable(self.gl.STENCIL_TEST);
            self.gl.enable(self.gl.DEPTH_TEST);
                if(self.doMultiView||self.doThreeWayView||self.doSideBySideStereo||self.doCrossEyedStereo){

                    const origQuat = quat4.clone(self.myQuat);
                    const origOrigin = self.origin


                    //console.log(multiViewOrigins)
                    //console.log(viewports)
                    for(let i=0;i<viewports.length;i++){

                        if(self.doMultiView){
                            if(multiViewGroupsKeys.length>0){
                                self.currentMultiViewGroup = parseInt(multiViewGroupsKeys[i])
                                if(i<multiViewOrigins.length&& multiViewOrigins[i]&& multiViewOrigins[i].length===3)
                                    self.origin = multiViewOrigins[i]
                            } else {
                                continue
                            }
                        }

                        const newXQuat = quat4.clone(origQuat);
                        quat4.multiply(newXQuat, newXQuat, quats[i]);
                        self.myQuat = newXQuat
                        self.currentViewport = viewports[i]

                        const doClear = i===0 ? true : false
                        if(self.doPeel){//Do depth peel
                            invMat = drawPeel(self, theShaders,doClear,ratioMult)
                        } else {
                            invMat = GLrender(self, false,doClear,ratioMult);
                        }
                        if (self.doPeel) {
                            self.gl.activeTexture(self.gl.TEXTURE0);
                            self.gl.bindTexture(self.gl.TEXTURE_2D, self.textTex);
                        }
                        if(invMat&&i==0) self.drawTextOverlays(invMat,ratioMult, Math.sqrt(self.gl.viewportHeight /self.currentViewport[3]));
                        if (self.showFPS&&i==0) {
                            self.drawFPSMeter();
                        }
                    }
                    self.myQuat = origQuat
                    if(self.doMultiView&&multiViewGroupsKeys.length===0){
                        if(self.doPeel){//Do depth peel
                            invMat = drawPeel(self, theShaders)
                        } else {
                            invMat = GLrender(self, false);
                        }
                    }
                    self.origin = origOrigin
                } else {
                    self.currentViewport = [0, 0, self.gl.viewportWidth, self.gl.viewportHeight]
                    if(self.doPeel){//Do depth peel
                        invMat = drawPeel(self, theShaders)
                    } else {
                        invMat = GLrender(self, false);
                    }
                }

            if(self.doAnaglyphStereo){
                const origQuat = quat4.clone(self.myQuat);
                const quats = self.stereoQuats

                for(let i=0;i<quats.length;i++){
                    const newXQuat = quat4.clone(origQuat);
                    quat4.multiply(newXQuat, newXQuat, quats[i]);
                    self.myQuat = newXQuat
                    self.currentAnaglyphColor = i===0 ? [1.0,0.0,0.0,1.0] : [0.0,1.0,0.0,1.0]
                    const doClear = i===0 ? true : false
                    invMat = GLrender(self, false,doClear);
                }
                self.myQuat = origQuat
            }
        }

        //console.log(self.mvMatrix);
        //console.log(self.mvInvMatrix);
        //console.log(self.pMatrix);
        //console.log(self.screenZ);
        //console.log(invMat);

        if(!self.doMultiView&&!self.doThreeWayView&&!self.doSideBySideStereo&&!self.doCrossEyedStereo){

            if (self.showFPS) {
                self.drawFPSMeter();
            }

            if(!(self.useOffScreenBuffers&&self.offScreenReady)){
                if(self.renderToTexture){
                    if(self.doPeel){
                        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebuffer);
                    } else {
                        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.rttFramebuffer);
                    }
                }
                if(!self.atomLabelDepthMode) self.drawDistancesAndLabels();
                self.drawLineMeasures(invMat);
                self.drawTextOverlays(invMat);
            }
        }

        if(self.trackMouse&&!self.renderToTexture){
            self.drawMouseTrack();
        }

        self.mouseDown = oldMouseDown;

        if(self.doShadowDepthDebug&&self.doShadow){
            self.gl.clearColor(1.0,1.0,0.0,1.0);
            self.gl.clear(self.gl.COLOR_BUFFER_BIT | self.gl.DEPTH_BUFFER_BIT);
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
            const paintMvMatrix = mat4.create();
            const paintPMatrix = mat4.create();
            mat4.identity(paintMvMatrix);
            mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);
            self.gl.useProgram(self.shaderProgramRenderFrameBuffer);

            self.gl.uniform1i(self.shaderProgramRenderFrameBuffer.focussedTexture,0);
            self.gl.uniform1i(self.shaderProgramRenderFrameBuffer.blurredTexture,1);
            self.gl.uniform1i(self.shaderProgramRenderFrameBuffer.depthTexture,2);

            self.gl.activeTexture(self.gl.TEXTURE0);
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.rttTextureDepth);
            self.gl.activeTexture(self.gl.TEXTURE1);
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.rttTextureDepth);
            self.gl.activeTexture(self.gl.TEXTURE2);
            self.gl.bindTexture(self.gl.TEXTURE_2D, null);

            self.gl.enableVertexAttribArray(self.shaderProgramRenderFrameBuffer.vertexTextureAttribute);

            self.gl.viewport(0, 0, self.gl.viewportWidth, self.gl.viewportHeight);

            self.gl.uniformMatrix4fv(self.shaderProgramRenderFrameBuffer.pMatrixUniform, false, paintPMatrix);
            self.gl.uniformMatrix4fv(self.shaderProgramRenderFrameBuffer.mvMatrixUniform, false, paintMvMatrix);

            bindFramebufferDrawBuffers(self);

            if (self.ext) {
                self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_INT, 0);
            } else {
                self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_SHORT, 0);
            }

            self.gl.disableVertexAttribArray(self.shaderProgramRenderFrameBuffer.vertexTextureAttribute);

            self.gl.activeTexture(self.gl.TEXTURE2);
            self.gl.bindTexture(self.gl.TEXTURE_2D, null);
            self.gl.activeTexture(self.gl.TEXTURE1);
            self.gl.bindTexture(self.gl.TEXTURE_2D, null);
            self.gl.activeTexture(self.gl.TEXTURE0);
            self.gl.bindTexture(self.gl.TEXTURE_2D, null);
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);

            return;
        }

        if (self.save_pixel_data) {
            console.log("Saving pixel data");
            const pixels = new Uint8Array(self.canvas.width * self.canvas.height * 4);
            self.gl.readPixels(0, 0, self.canvas.width, self.canvas.height, self.gl.RGBA, self.gl.UNSIGNED_BYTE, pixels);
            self.pixel_data = pixels;
        }

        if(self.renderToTexture&&!self.useOffScreenBuffers) {
            console.log("SCREENSHOT")
            const width_ratio = self.gl.viewportWidth / self.rttFramebuffer.width;
            const height_ratio = self.gl.viewportHeight / self.rttFramebuffer.height;
            if (self.WEBGL2) {
                if(self.doPeel){
                     self.gl.bindFramebuffer(self.gl.READ_FRAMEBUFFER, self.offScreenFramebuffer);
                     self.gl.bindFramebuffer(self.gl.DRAW_FRAMEBUFFER, self.rttFramebufferColor);
                     self.gl.clearBufferfv(self.gl.COLOR, 0, [1.0, 1.0, 1.0, 1.0]);
                     self.gl.blitFramebuffer(0, 0, self.offScreenFramebuffer.width, self.offScreenFramebuffer.height,
                             0, 0, self.rttFramebuffer.width, self.rttFramebuffer.height,
                             self.gl.COLOR_BUFFER_BIT, self.gl.LINEAR);
                } else {
                     self.gl.bindFramebuffer(self.gl.READ_FRAMEBUFFER, self.rttFramebuffer);
                     self.gl.bindFramebuffer(self.gl.DRAW_FRAMEBUFFER, self.rttFramebufferColor);
                     self.gl.clearBufferfv(self.gl.COLOR, 0, [1.0, 1.0, 1.0, 1.0]);
                     self.gl.blitFramebuffer(0, 0, self.rttFramebuffer.width, self.rttFramebuffer.height,
                             0, 0, self.rttFramebuffer.width, self.rttFramebuffer.height,
                             self.gl.COLOR_BUFFER_BIT, self.gl.LINEAR);
                }
                self.gl.bindFramebuffer(self.gl.READ_FRAMEBUFFER, self.rttFramebufferColor);
            }
            const pixels = new Uint8Array(self.gl.viewportWidth / width_ratio * self.gl.viewportHeight / height_ratio * 4);
            self.gl.readPixels(0, 0, self.gl.viewportWidth / width_ratio, self.gl.viewportHeight / height_ratio, self.gl.RGBA, self.gl.UNSIGNED_BYTE, pixels);
            self.pixel_data = pixels;
        }

        if(self.useOffScreenBuffers&&self.offScreenReady){
            depthBlur(self, invMat);
        }

        if(self.showFPS){
            self.nFrames += 1;
            const thisTime = performance.now();
            const mspf = thisTime - self.prevTime;
            self.mspfArray.push(mspf);
            if(self.mspfArray.length>200) self.mspfArray.shift();
            self.prevTime = thisTime;
        }

        if(self.renderToTexture) {
            self.edgeDetectFramebufferSize = 2048;
            self.gBuffersFramebufferSize = 2048;
            self.ssaoFramebufferSize = 1024;
            if(self.edgeDetectFramebuffer){
                self.gl.deleteFramebuffer(self.edgeDetectFramebuffer);
                self.edgeDetectFramebuffer = null;
            }
            if(self.gFramebuffer){
                self.gl.deleteFramebuffer(self.gFramebuffer);
                self.gFramebuffer = null;
            }
            if(self.ssaoFramebuffer){
                self.gl.deleteFramebuffer(self.ssaoFramebuffer);
                self.ssaoFramebuffer = null;
            }
        }
    }

export function applySymmetryMatrix(self: MGWebGL, theShader,symmetryMatrix,tempMVMatrix,tempMVInvMatrix,doTransform=true){
        const symt = mat4.create();
        const invsymt = mat4.create();
        mat4.set(symt,
                symmetryMatrix[0], symmetryMatrix[1], symmetryMatrix[2], symmetryMatrix[3],
                symmetryMatrix[4], symmetryMatrix[5], symmetryMatrix[6], symmetryMatrix[7],
                symmetryMatrix[8], symmetryMatrix[9], symmetryMatrix[10], symmetryMatrix[11],
                symmetryMatrix[12], symmetryMatrix[13], symmetryMatrix[14], symmetryMatrix[15]);
        mat4.multiply(tempMVMatrix, self.mvMatrix, symt);
        mat4.invert(invsymt, symt);
        invsymt[12] = 0.0;
        invsymt[13] = 0.0;
        invsymt[14] = 0.0;
        self.gl.uniformMatrix4fv(theShader.mvMatrixUniform, false, tempMVMatrix);
        self.gl.uniformMatrix4fv(theShader.invSymMatrixUniform, false, invsymt);
        tempMVMatrix[12] = 0.0;
        tempMVMatrix[13] = 0.0;
        tempMVMatrix[14] = 0.0;
        mat4.invert(tempMVInvMatrix, tempMVMatrix);// All else
        self.gl.uniformMatrix4fv(theShader.mvInvMatrixUniform, false, tempMVInvMatrix);// All else

        if(doTransform){
            const light_position = vec3.create();
            vec3.transformMat4(light_position, self.light_positions, tempMVInvMatrix);
            NormalizeVec3(light_position);
            self.gl.uniform4fv(theShader.light_positions, new Float32Array([light_position[0],light_position[1],light_position[2],1.0]));
        }

        const screenZ = vec3.create();
        screenZ[0] = 0.0;
        screenZ[1] = 0.0;
        screenZ[2] = 1.0;
        vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
        self.gl.uniform3fv(theShader.screenZ, screenZ);
    }

// ============================================================================
// SECTION 2 - PASSES & POST-PROCESS
// GLrender is the top-level render entry (multi-view / stereo); depthBlur and
// textureBlur are post-processing passes; getMultiViewInfo / bindFramebuffer-
// DrawBuffers are framebuffer plumbing. GLrender calls back into drawTriangles
// (section 1), which is why the two sections stay in one module.
// ============================================================================

export function bindFramebufferDrawBuffers(self: MGWebGL) {
        if(!self.framebufferDrawBuffersReady) {
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

            self.framebufferDrawPositionBuffer = self.gl.createBuffer();
            self.framebufferDrawTexCoordBuffer = self.gl.createBuffer();
            self.framebufferDrawIndexesBuffer = self.gl.createBuffer();

            self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, self.framebufferDrawIndexesBuffer);
            if (self.ext) {
                self.gl.bufferData(self.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(textIndexs), self.gl.STATIC_DRAW);
            } else {
                self.gl.bufferData(self.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(textIndexs), self.gl.STATIC_DRAW);
            }

            self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.framebufferDrawTexCoordBuffer);
            self.gl.vertexAttribPointer(self.shaderProgramRenderFrameBuffer.vertexTextureAttribute, 2, self.gl.FLOAT, false, 0, 0);
            self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(textTexCoords), self.gl.STATIC_DRAW);

            self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.framebufferDrawPositionBuffer);
            self.gl.vertexAttribPointer(self.shaderProgramRenderFrameBuffer.vertexPositionAttribute, 3, self.gl.FLOAT, false, 0, 0);
            self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(textVertices), self.gl.DYNAMIC_DRAW);
            self.framebufferDrawBuffersReady = true;
        }

        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.framebufferDrawTexCoordBuffer);
        self.gl.vertexAttribPointer(self.shaderProgramRenderFrameBuffer.vertexTextureAttribute, 2, self.gl.FLOAT, false, 0, 0);
        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.framebufferDrawPositionBuffer);
        self.gl.vertexAttribPointer(self.shaderProgramRenderFrameBuffer.vertexPositionAttribute, 3, self.gl.FLOAT, false, 0, 0);
        self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, self.framebufferDrawIndexesBuffer);
    }

export function getMultiViewInfo(self: MGWebGL) : {multiViewOrigins,multiViewGroupsKeys,quats,viewports,ratioMult,multi_rows_cols} {

        const displayBuffers = self.store.getState().glRef.displayBuffers

        const multiViewOrigins = []
        let multiViewGroupsKeys = []

        let quats
        let viewports
        let ratioMult = 1.0
        let multi_rows_cols = {rows:0,cols:0}

        if(self.doThreeWayView){
            quats = self.threeWayQuats
            viewports = self.threeWayViewports
        } else if(self.doMultiView) {

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
            self.multiViewOrigins = multiViewOrigins
            multiViewGroupsKeys = Object.keys(multiViewGroups)
            if(self.multiWayViewports.length!==multiViewGroupsKeys.length&&multiViewGroupsKeys.length>0){
                multi_rows_cols = self.setupMultiWayTransformations(multiViewGroupsKeys.length)
            }

            quats = self.multiWayQuats
            viewports = self.multiWayViewports
            ratioMult = self.multiWayRatio
        } else if(self.doSideBySideStereo) {
            quats = self.stereoQuats
            viewports = self.stereoViewports
            ratioMult = 0.5
        } else {
            quats = self.stereoQuats.toReversed()
            viewports = self.stereoViewports
            ratioMult = 0.5
        }

        return {multiViewOrigins,multiViewGroupsKeys,quats,viewports,ratioMult,multi_rows_cols}

    }

export function textureBlur(self: MGWebGL, width,height,inputTexture) {

        const paintMvMatrix = mat4.create();
        const paintPMatrix = mat4.create();
        mat4.identity(paintMvMatrix);
        mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);

        const blurSize = 3

        const blurSizeX = blurSize/width;
        const blurSizeY = blurSize/height;

        self.gl.bindBuffer(self.gl.UNIFORM_BUFFER, self.blurUBOBuffer);
        self.makeBlurBuffers(blurSize);
        self.gl.useProgram(self.shaderProgramSimpleBlurX);

        for(let i = 0; i<16; i++)
            self.gl.disableVertexAttribArray(i);
        self.gl.enableVertexAttribArray(self.shaderProgramSimpleBlurX.vertexTextureAttribute);
        self.gl.enableVertexAttribArray(self.shaderProgramSimpleBlurX.vertexPositionAttribute);

        self.gl.uniform1i(self.shaderProgramSimpleBlurX.inputTexture,0);

        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebufferSimpleBlurX);
        self.gl.activeTexture(self.gl.TEXTURE0);
        self.gl.bindTexture(self.gl.TEXTURE_2D, inputTexture);
        self.gl.viewport(0, 0, width, height);

        self.gl.uniformMatrix4fv(self.shaderProgramSimpleBlurX.pMatrixUniform, false, paintPMatrix);
        self.gl.uniformMatrix4fv(self.shaderProgramSimpleBlurX.mvMatrixUniform, false, paintMvMatrix);

        self.gl.uniform1f(self.shaderProgramSimpleBlurX.blurSize,blurSizeX);

        self.gl.clearBufferfv(self.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
        bindFramebufferDrawBuffers(self);

        if (self.ext) {
            self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_INT, 0);
        } else {
            self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_SHORT, 0);
        }

        self.gl.bindBuffer(self.gl.UNIFORM_BUFFER, self.blurUBOBuffer);
        self.makeBlurBuffers(blurSize);
        self.gl.useProgram(self.shaderProgramSimpleBlurY);
        for(let i = 0; i<16; i++)
            self.gl.disableVertexAttribArray(i);
        self.gl.enableVertexAttribArray(self.shaderProgramSimpleBlurY.vertexTextureAttribute);
        self.gl.enableVertexAttribArray(self.shaderProgramSimpleBlurY.vertexPositionAttribute);

        self.gl.uniform1i(self.shaderProgramSimpleBlurY.inputTexture,0);

        self.gl.enableVertexAttribArray(self.shaderProgramSimpleBlurY.vertexTextureAttribute);
        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebufferSimpleBlurY);
        self.gl.activeTexture(self.gl.TEXTURE0);
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.simpleBlurXTexture);
        self.gl.viewport(0, 0, width, height);

        self.gl.uniformMatrix4fv(self.shaderProgramSimpleBlurY.pMatrixUniform, false, paintPMatrix);
        self.gl.uniformMatrix4fv(self.shaderProgramSimpleBlurY.mvMatrixUniform, false, paintMvMatrix);

        self.gl.uniform1f(self.shaderProgramSimpleBlurY.blurSize,blurSizeY);

        self.gl.clearBufferfv(self.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
        bindFramebufferDrawBuffers(self);

        if (self.ext) {
            self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_INT, 0);
        } else {
            self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_SHORT, 0);
        }

        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
        // And now our FB texture is blurred
    }

export function depthBlur(self: MGWebGL, invMat) {

        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);

        self.gl.viewport(0, 0, self.gl.viewportWidth, self.gl.viewportHeight);
        //Hmm - Why these 3 lines?
        //self.gl.clearColor(self.background_colour[0], self.background_colour[1], self.background_colour[2], self.background_colour[3]);
        //self.gl.clearColor(1.0,1.0,0.0,1.0);
        //self.gl.clear(self.gl.COLOR_BUFFER_BIT | self.gl.DEPTH_BUFFER_BIT);

        const paintMvMatrix = mat4.create();
        const paintPMatrix = mat4.create();
        mat4.identity(paintMvMatrix);
        mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);

        let srcWidth;
        let srcHeight;
        let dstWidth;
        let dstHeight;
        if(self.renderToTexture&&!self.doPeel) {
            self.recreateOffScreeenBuffers(self.rttFramebuffer.width,self.rttFramebuffer.height);
            // FIXME - This cannnot work with current framebuffers, textures, etc.
            console.log("Need to combine depthBlur and screenshot ...");
            self.gl.bindFramebuffer(self.gl.READ_FRAMEBUFFER, self.rttFramebuffer);
            self.gl.bindFramebuffer(self.gl.DRAW_FRAMEBUFFER, self.rttFramebufferColor);
            srcWidth = self.rttFramebuffer.width;
            srcHeight = self.rttFramebuffer.height;
            dstWidth = srcWidth;
            dstHeight = srcHeight;
        } else {
            self.gl.bindFramebuffer(self.gl.READ_FRAMEBUFFER, self.offScreenFramebuffer);
            self.gl.bindFramebuffer(self.gl.DRAW_FRAMEBUFFER, self.offScreenFramebufferColor);
            srcWidth = self.offScreenFramebuffer.width;
            srcHeight = self.offScreenFramebuffer.height;
            dstWidth = self.offScreenFramebufferColor.width;
            dstHeight = self.offScreenFramebufferColor.height;
        }

        self.gl.clearBufferfv(self.gl.COLOR, 0, [1.0, 1.0, 1.0, 1.0]);
        self.gl.clearBufferfi(self.gl.DEPTH_STENCIL, 0, 0.0, 0);

        self.gl.blitFramebuffer(0, 0, srcWidth, srcHeight, 0, 0, dstWidth, dstHeight, self.gl.COLOR_BUFFER_BIT, self.gl.LINEAR);
        self.gl.blitFramebuffer(0, 0, srcWidth, srcHeight, 0, 0, dstWidth, dstHeight, self.gl.DEPTH_BUFFER_BIT, self.gl.NEAREST);

        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);


        /*
         * In focus     - self.offScreenFramebufferBlurX
         * Out of focus - self.blurYTexture
         * Depth        - self.offScreenDepthTexture
         */

        //This is an example of chaining framebuffer shader effects.
        //FIXME - Scale to deal with different sized Framebuffers ...
        const blurSizeX = self.blurSize/self.gl.viewportWidth;
        let blurSizeY = self.blurSize/self.gl.viewportHeight;
        if(self.renderToTexture)
            blurSizeY *= self.gl.viewportHeight/dstHeight;

        self.gl.bindBuffer(self.gl.UNIFORM_BUFFER, self.blurUBOBuffer);
        self.makeBlurBuffers(self.blurSize);
        self.gl.useProgram(self.shaderProgramBlurX);

        for(let i = 0; i<16; i++)
            self.gl.disableVertexAttribArray(i);
        self.gl.enableVertexAttribArray(self.shaderProgramBlurX.vertexTextureAttribute);
        self.gl.enableVertexAttribArray(self.shaderProgramBlurX.vertexPositionAttribute);

        self.gl.uniform1i(self.shaderProgramBlurX.inputTexture,0);
        self.gl.uniform1i(self.shaderProgramBlurX.depthTexture,1);

        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebufferBlurX);

        self.gl.activeTexture(self.gl.TEXTURE0);
        if(self.renderToTexture&&!self.doPeel) {
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.rttTexture);
        } else {
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.offScreenTexture);
        }
        self.gl.activeTexture(self.gl.TEXTURE1);
        if(self.doPeel){
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.depthPeelDepthTextures[0]);
        } else if(self.renderToTexture) {
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.rttDepthTexture);
        } else {
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.offScreenDepthTexture);
        }
        if(self.renderToTexture) {
            self.gl.viewport(0, 0, srcWidth, srcHeight);
        } else {
            self.gl.viewport(0, 0, self.gl.viewportWidth, self.gl.viewportHeight);
        }

        self.gl.uniformMatrix4fv(self.shaderProgramBlurX.pMatrixUniform, false, paintPMatrix);
        self.gl.uniformMatrix4fv(self.shaderProgramBlurX.mvMatrixUniform, false, paintMvMatrix);

        let f = -(self.gl_clipPlane0[3]);
        let b = Math.min(self.gl_clipPlane1[3],self.gl_fog_end);
        if(self.doPerspectiveProjection){
            f = 100
            b = 270
        }

        const displayBuffers = self.store.getState().glRef.displayBuffers
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
        self.atom_span = atom_span;

        //console.log("In blur",f.toFixed(2),b.toFixed(2),self.blurDepth.toFixed(2))
        const fPrime = f-self.fogClipOffset
        const bPrime = b-self.fogClipOffset
        //NB The 1.5 scaling is because it is 2 * 0.75 where 0.75 is scaling in the new widget.
        const fPrimeFrac = fPrime/(1.5*atom_span)+0.5
        const bPrimeFrac = bPrime/(1.5*atom_span)+0.5
        const fracDepth = (self.blurDepth-fPrimeFrac)/(bPrimeFrac-fPrimeFrac)

        self.gl.uniform1f(self.shaderProgramBlurX.blurDepth,fracDepth);
        self.gl.uniform1f(self.shaderProgramBlurX.blurSize,blurSizeX);

        if(self.renderToTexture&&self.transparentScreenshotBackground){
            self.gl.clearBufferfv(self.gl.COLOR, 0, [self.background_colour[0], self.background_colour[1], self.background_colour[2], 0.0]);
        } else {
            self.gl.clearBufferfv(self.gl.COLOR, 0, [self.background_colour[0], self.background_colour[1], self.background_colour[2], 1.0]);
        }
        bindFramebufferDrawBuffers(self);

        if (self.ext) {
            self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_INT, 0);
        } else {
            self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_SHORT, 0);
        }

        self.gl.bindBuffer(self.gl.UNIFORM_BUFFER, self.blurUBOBuffer);
        self.makeBlurBuffers(self.blurSize);
        self.gl.useProgram(self.shaderProgramBlurY);
        for(let i = 0; i<16; i++)
            self.gl.disableVertexAttribArray(i);
        self.gl.enableVertexAttribArray(self.shaderProgramBlurY.vertexTextureAttribute);
        self.gl.enableVertexAttribArray(self.shaderProgramBlurY.vertexPositionAttribute);

        self.gl.uniform1i(self.shaderProgramBlurY.inputTexture,0);
        self.gl.uniform1i(self.shaderProgramBlurY.depthTexture,1);

        self.gl.enableVertexAttribArray(self.shaderProgramBlurY.vertexTextureAttribute);
        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebufferBlurY);
        self.gl.activeTexture(self.gl.TEXTURE0);
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.blurXTexture);
        self.gl.activeTexture(self.gl.TEXTURE1);
        if(self.doPeel){
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.depthPeelDepthTextures[0]);
        } else if(self.renderToTexture) {
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.rttDepthTexture);
        } else {
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.offScreenDepthTexture);
        }
        if(self.renderToTexture) {
            self.gl.viewport(0, 0, srcWidth, srcHeight);
        } else {
            self.gl.viewport(0, 0, self.gl.viewportWidth, self.gl.viewportHeight);
        }

        self.gl.uniformMatrix4fv(self.shaderProgramBlurY.pMatrixUniform, false, paintPMatrix);
        self.gl.uniformMatrix4fv(self.shaderProgramBlurY.mvMatrixUniform, false, paintMvMatrix);

        self.gl.uniform1f(self.shaderProgramBlurY.blurDepth,fracDepth);
        self.gl.uniform1f(self.shaderProgramBlurY.blurSize,blurSizeY);

        if(self.renderToTexture&&self.transparentScreenshotBackground){
            self.gl.clearBufferfv(self.gl.COLOR, 0, [self.background_colour[0], self.background_colour[1], self.background_colour[2], 0.0]);
        } else {
            self.gl.clearBufferfv(self.gl.COLOR, 0, [self.background_colour[0], self.background_colour[1], self.background_colour[2], 1.0]);
        }
        bindFramebufferDrawBuffers(self);

        if (self.ext) {
            self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_INT, 0);
        } else {
            self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_SHORT, 0);
        }

        if(self.renderToTexture) {
            //Do something different from below ....
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.rttFramebuffer);
        } else {
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
        }

        self.gl.bindTexture(self.gl.TEXTURE_2D, self.blurYTexture);
        self.gl.useProgram(self.shaderProgramRenderFrameBuffer);
        self.gl.uniform1f(self.shaderProgramRenderFrameBuffer.blurDepth,fracDepth);

        self.gl.uniform1i(self.shaderProgramRenderFrameBuffer.focussedTexture,0);
        self.gl.uniform1i(self.shaderProgramRenderFrameBuffer.blurredTexture,1);
        self.gl.uniform1i(self.shaderProgramRenderFrameBuffer.depthTexture,2);

        self.gl.activeTexture(self.gl.TEXTURE0);
        if(self.renderToTexture&&!self.doPeel) {
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.rttTexture);
        } else {
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.offScreenTexture);
        }


        self.gl.activeTexture(self.gl.TEXTURE1);
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.blurYTexture);

        self.gl.activeTexture(self.gl.TEXTURE2);
        if(self.doPeel){
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.depthPeelDepthTextures[0]);
        } else if(self.renderToTexture) {
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.rttDepthTexture);
        } else {
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.offScreenDepthTexture);
        }

        for(let i = 0; i<16; i++)
            self.gl.disableVertexAttribArray(i);
        self.gl.enableVertexAttribArray(self.shaderProgramRenderFrameBuffer.vertexTextureAttribute);
        self.gl.enableVertexAttribArray(self.shaderProgramRenderFrameBuffer.vertexPositionAttribute);

        if(self.renderToTexture) {
            self.gl.viewport(0, 0, srcWidth, srcHeight);
        } else {
            self.gl.viewport(0, 0, self.gl.viewportWidth, self.gl.viewportHeight);
        }

        self.gl.uniformMatrix4fv(self.shaderProgramRenderFrameBuffer.pMatrixUniform, false, paintPMatrix);
        self.gl.uniformMatrix4fv(self.shaderProgramRenderFrameBuffer.mvMatrixUniform, false, paintMvMatrix);

        bindFramebufferDrawBuffers(self);

        if (self.ext) {
            self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_INT, 0);
        } else {
            self.gl.drawElements(self.gl.TRIANGLES, 6, self.gl.UNSIGNED_SHORT, 0);
        }

        if(!self.atomLabelDepthMode) self.drawDistancesAndLabels();
        self.drawLineMeasures(invMat);
        self.drawTextOverlays(invMat);

        if(self.renderToTexture) {
            console.log("SCREENSHOT MkII !");

            const width_ratio = self.gl.viewportWidth / self.rttFramebuffer.width;
            const height_ratio = self.gl.viewportHeight / self.rttFramebuffer.height;
            if (self.WEBGL2) {
                self.gl.bindFramebuffer(self.gl.READ_FRAMEBUFFER, self.rttFramebuffer);
                self.gl.bindFramebuffer(self.gl.DRAW_FRAMEBUFFER, self.rttFramebufferColor);
                self.gl.clearBufferfv(self.gl.COLOR, 0, [1.0, 1.0, 1.0, 1.0]);
                self.gl.blitFramebuffer(0, 0, self.rttFramebuffer.width, self.rttFramebuffer.height,
                        0, 0, self.rttFramebuffer.width, self.rttFramebuffer.height,
                        self.gl.COLOR_BUFFER_BIT, self.gl.LINEAR);

                self.gl.bindFramebuffer(self.gl.READ_FRAMEBUFFER, self.rttFramebufferColor);
                for(let i=0;i<self.depthPeelFramebuffers.length;i++){
                    self.gl.deleteFramebuffer(self.depthPeelFramebuffers[i]);
                    self.gl.deleteRenderbuffer(self.depthPeelRenderbufferDepth[i]);
                    self.gl.deleteRenderbuffer(self.depthPeelRenderbufferColor[i]);
                    self.gl.deleteTexture(self.depthPeelColorTextures[i]);
                    self.gl.deleteTexture(self.depthPeelDepthTextures[i]);
                }
                self.depthPeelFramebuffers = [];
                self.offScreenReady = false
            }
            self.gl.bindFramebuffer(self.gl.READ_FRAMEBUFFER, self.rttFramebufferColor);
            const pixels = new Uint8Array(self.gl.viewportWidth / width_ratio * self.gl.viewportHeight / height_ratio * 4);
            self.gl.readPixels(0, 0, self.gl.viewportWidth / width_ratio, self.gl.viewportHeight / height_ratio, self.gl.RGBA, self.gl.UNSIGNED_BYTE, pixels);
            self.pixel_data = pixels;
            self.recreateOffScreeenBuffers(self.canvas.width,self.canvas.height);
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
        }

        self.gl.disableVertexAttribArray(self.shaderProgramRenderFrameBuffer.vertexTextureAttribute);

        self.gl.activeTexture(self.gl.TEXTURE2);
        self.gl.bindTexture(self.gl.TEXTURE_2D, null);
        self.gl.activeTexture(self.gl.TEXTURE1);
        self.gl.bindTexture(self.gl.TEXTURE_2D, null);
        self.gl.activeTexture(self.gl.TEXTURE0);
        self.gl.bindTexture(self.gl.TEXTURE_2D, null);

    }

export function GLrender(self: MGWebGL, calculatingShadowMap,doClear=true,ratioMult=1.0) {
        const displayBuffers = self.store.getState().glRef.displayBuffers
        const ratio = 1.0 * self.gl.viewportWidth / self.gl.viewportHeight * ratioMult;

        let fb_scale = 1.0

        if(self.WEBGL2){
            self.gl.useProgram(self.shaderProgram);
            self.gl.uniform1f(self.shaderProgram.ssaoMultiviewWidthHeightRatio,1.0);
            self.gl.uniform1f(self.shaderProgram.zoom,self.zoom);
            self.gl.useProgram(self.shaderProgramInstanced);
            self.gl.uniform1f(self.shaderProgramInstanced.ssaoMultiviewWidthHeightRatio,1.0);
            self.gl.uniform1f(self.shaderProgramInstanced.zoom,self.zoom);
            self.gl.useProgram(self.shaderProgramPerfectSpheres);
            self.gl.uniform1f(self.shaderProgramPerfectSpheres.ssaoMultiviewWidthHeightRatio,1.0);
            self.gl.uniform1f(self.shaderProgramPerfectSpheres.zoom,self.zoom);
        }

        if (calculatingShadowMap) {
            if(!self.offScreenReady)
                self.recreateOffScreeenBuffers(self.canvas.width,self.canvas.height);
            if(!self.screenshotBuffersReady)
                self.initTextureFramebuffer();
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.rttFramebufferDepth);
            self.gl.viewport(0, 0, self.rttFramebufferDepth.width, self.rttFramebufferDepth.height);
        } else if(self.drawingGBuffers) {
            const width_ratio = self.gl.viewportWidth / self.gFramebuffer.width;
            const height_ratio = self.gl.viewportHeight / self.gFramebuffer.height;
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.gFramebuffer);
            self.gl.viewport(self.currentViewport[0]/ width_ratio, self.currentViewport[1]/ height_ratio, self.currentViewport[2]/ width_ratio, self.currentViewport[3]/ height_ratio);
        } else if(self.renderSilhouettesToTexture) {
            if(!self.silhouetteBufferReady)
                self.recreateSilhouetteBuffers();
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.silhouetteFramebuffer);
            self.gl.viewport(0, 0, self.gl.viewportWidth, self.gl.viewportHeight);
        } else if(self.doDepthPeelPass&&self.renderToTexture&&(self.doMultiView||self.doThreeWayView||self.doSideBySideStereo||self.doCrossEyedStereo)) {
            if(!self.screenshotBuffersReady)
                self.initTextureFramebuffer();
            let viewport_start_x = Math.trunc(self.currentViewport[0] * self.rttFramebuffer.width  / self.gl.viewportWidth)
            let viewport_start_y = Math.trunc(self.currentViewport[1] * self.rttFramebuffer.height / self.gl.viewportHeight)
            let viewport_width =   Math.trunc(self.currentViewport[2] * self.rttFramebuffer.width  / self.gl.viewportWidth)
            let viewport_height =  Math.trunc(self.currentViewport[3] * self.rttFramebuffer.height / self.gl.viewportHeight)
            self.gl.viewport(viewport_start_x,viewport_start_y,viewport_width,viewport_height);
            if(self.gl.viewportWidth>self.gl.viewportHeight){
                const hp = self.gl.viewportHeight/self.gl.viewportWidth * self.rttFramebuffer.width
                const b = 0.5*(self.rttFramebuffer.height - hp)
                const vh = self.currentViewport[3] * self.rttFramebuffer.width  / self.gl.viewportWidth
                const bp = self.currentViewport[1] * self.rttFramebuffer.width  / self.gl.viewportWidth
                viewport_height = vh
                viewport_start_y = bp + b
            } else {
                const wp = self.gl.viewportWidth/self.gl.viewportHeight * self.rttFramebuffer.height
                const b = 0.5*(self.rttFramebuffer.width - wp)
                const vw = self.currentViewport[2] * self.rttFramebuffer.width  / self.gl.viewportHeight
                const bp = self.currentViewport[0] * self.rttFramebuffer.width  / self.gl.viewportHeight
                viewport_width = vw
                viewport_start_x =  bp + b
            }
            self.gl.viewport(viewport_start_x,viewport_start_y,viewport_width,viewport_height);
        } else if(self.doDepthPeelPass) {
            const viewport_start_x = Math.trunc(self.currentViewport[0] * self.depthPeelFramebuffers[0].width  / self.gl.viewportWidth)
            const viewport_start_y = Math.trunc(self.currentViewport[1] * self.depthPeelFramebuffers[0].height / self.gl.viewportHeight)
            const viewport_width =   Math.trunc(self.currentViewport[2] * self.depthPeelFramebuffers[0].width  / self.gl.viewportWidth)
            const viewport_height =  Math.trunc(self.currentViewport[3] * self.depthPeelFramebuffers[0].height / self.gl.viewportHeight)
            self.gl.viewport(viewport_start_x,viewport_start_y,viewport_width,viewport_height);
        } else if(self.renderToTexture) {
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.rttFramebuffer);
            self.gl.enable(self.gl.DEPTH_TEST);
            self.gl.depthFunc(self.gl.LESS);
            let viewport_start_x = Math.trunc(self.currentViewport[0] * self.rttFramebuffer.width  / self.gl.viewportWidth)
            let viewport_start_y = Math.trunc(self.currentViewport[1] * self.rttFramebuffer.height / self.gl.viewportHeight)
            let viewport_width =   Math.trunc(self.currentViewport[2] * self.rttFramebuffer.width  / self.gl.viewportWidth)
            let viewport_height =  Math.trunc(self.currentViewport[3] * self.rttFramebuffer.height / self.gl.viewportHeight)
            self.gl.viewport(viewport_start_x,viewport_start_y,viewport_width,viewport_height);
            if(self.doMultiView||self.doThreeWayView||self.doSideBySideStereo||self.doCrossEyedStereo){
                self.gl.useProgram(self.shaderProgram);
                if(self.WEBGL2) self.gl.uniform1f(self.shaderProgram.ssaoMultiviewWidthHeightRatio,1.0*self.canvas.width/self.canvas.height);
                self.gl.useProgram(self.shaderProgramInstanced);
                if(self.WEBGL2) self.gl.uniform1f(self.shaderProgramInstanced.ssaoMultiviewWidthHeightRatio,1.0*self.canvas.width/self.canvas.height);
                self.gl.useProgram(self.shaderProgramPerfectSpheres);
                if(self.WEBGL2) self.gl.uniform1f(self.shaderProgramPerfectSpheres.ssaoMultiviewWidthHeightRatio,1.0*self.canvas.width/self.canvas.height);
                if(self.gl.viewportWidth>self.gl.viewportHeight){
                    const hp = self.gl.viewportHeight/self.gl.viewportWidth * self.rttFramebuffer.width
                    const b = 0.5*(self.rttFramebuffer.height - hp)
                    const vh = self.currentViewport[3] * self.rttFramebuffer.width  / self.gl.viewportWidth
                    const bp = self.currentViewport[1] * self.rttFramebuffer.width  / self.gl.viewportWidth
                    viewport_height = vh
                    viewport_start_y = bp + b
                } else {
                    const wp = self.gl.viewportWidth/self.gl.viewportHeight * self.rttFramebuffer.height
                    const b = 0.5*(self.rttFramebuffer.width - wp)
                    const vw = self.currentViewport[2] * self.rttFramebuffer.width  / self.gl.viewportHeight
                    const bp = self.currentViewport[0] * self.rttFramebuffer.width  / self.gl.viewportHeight
                    viewport_width = vw
                    viewport_start_x =  bp + b
                }
                self.gl.viewport(viewport_start_x,viewport_start_y,viewport_width,viewport_height);
            } else {
                self.gl.viewport(0, 0, self.rttFramebuffer.width, self.rttFramebuffer.height);
            }
        } else {
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
            if(self.useOffScreenBuffers&&self.WEBGL2){
                if(!self.offScreenReady)
                    self.recreateOffScreeenBuffers(self.canvas.width,self.canvas.height);
                self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebuffer);
            }
            self.gl.viewport(self.currentViewport[0], self.currentViewport[1], self.currentViewport[2], self.currentViewport[3]);
        }

        if(self.renderSilhouettesToTexture||self.drawingGBuffers||(self.renderToTexture&&self.transparentScreenshotBackground)) {
            self.gl.clearColor(self.background_colour[0], self.background_colour[1], self.background_colour[2], 0.0);
        } else {
            self.gl.clearColor(self.background_colour[0], self.background_colour[1], self.background_colour[2], self.background_colour[3]);
        }
        if(self.doStenciling){
            if(!self.stenciling){
                self.gl.clear(self.gl.COLOR_BUFFER_BIT | self.gl.DEPTH_BUFFER_BIT);
            }
        } else {
            if(doClear) self.gl.clear(self.gl.COLOR_BUFFER_BIT | self.gl.DEPTH_BUFFER_BIT);
        }

        mat4.identity(self.mvMatrix);

        const oldQuat = quat4.clone(self.myQuat);
        const newQuat = quat4.clone(self.myQuat);

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
            self.atom_span = atom_span;
            const shadowExtent = Math.max(170.0,atom_span); // 170. ??

            //The extent (atom_span) should probably be scaled to viewable area - lets see if we can calculate that.
            //But, the angle of the light is important ...

            let d = Math.min(48*self.zoom,atom_span)

            let rotX = quat4.create();
            quat4.set(rotX, 0, 0, 0, -1);
            const zprime = vec3Create([self.light_positions[0], self.light_positions[1], self.light_positions[2]]);
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
            if(self.doPerspectiveProjection){
                excess += 150; // ?? It works.
            }
            d += excess;

            d /= 2.0
            d = Math.max(d,60.0)

            mat4.ortho(self.pMatrix, -d * ratio, d * ratio, -d, d, 0.1, 1000.0);
            mat4.translate(self.mvMatrix, self.mvMatrix, [0, 0, -atom_span]);

            self.gl.disable(self.gl.CULL_FACE);
            self.gl.cullFace(self.gl.FRONT);
        } else {
            self.gl.disable(self.gl.CULL_FACE);
            self.gl.cullFace(self.gl.BACK);
            if(self.renderToTexture){
                //FIXME - drawingGBuffers stanza?
                if(self.doPerspectiveProjection){
                    //FIXME - with  multiviews
                    mat4.perspective(self.pMatrix, 1.0, 1.0, 100, 1270.0);
                } else {
                    const f = self.gl_clipPlane0[3];
                    const b = Math.min(self.gl_clipPlane1[3],self.gl_fog_end);
                    if(self.currentViewport[2] > self.currentViewport[3]){
                        if(self.doMultiView||self.doThreeWayView||self.doSideBySideStereo||self.doCrossEyedStereo){
                            mat4.ortho(self.pMatrix, -24 * ratio, 24 * ratio, -24, 24, -f, b);
                        } else {
                            mat4.ortho(self.pMatrix, -24 * ratio, 24 * ratio, -24 * ratio, 24 * ratio, -f, b);
                        }
                    } else {
                        if(self.doMultiView||self.doThreeWayView||self.doSideBySideStereo||self.doCrossEyedStereo)
                            fb_scale = self.currentViewport[2]/self.currentViewport[3]
                        mat4.ortho(self.pMatrix, -24*fb_scale, 24*fb_scale, -24, 24, -f, b);
                    }
                }
            } else {
                if(self.doPerspectiveProjection){
                    mat4.perspective(self.pMatrix, 1.0, self.gl.viewportWidth / self.gl.viewportHeight, 100, 1270.0);
                } else {
                    const b = Math.min(self.gl_clipPlane1[3],self.gl_fog_end);
                    const f = self.gl_clipPlane0[3];
                    mat4.ortho(self.pMatrix, -24 * ratio, 24 * ratio, -24, 24, -f, b);
                }
            }

            mat4.translate(self.mvMatrix, self.mvMatrix, [0, 0, -self.fogClipOffset]);

        }

        self.myQuat = quat4.clone(newQuat);
        const theMatrix = quatToMat4(self.myQuat);

        mat4.multiply(self.mvMatrix, self.mvMatrix, theMatrix);

        mat4.identity(self.mvInvMatrix);

        const invQuat = quat4.create();
        quat4Inverse(self.myQuat, invQuat);

        const invMat = quatToMat4(invQuat);
        self.mvInvMatrix = invMat;

        const right = vec3.create();
        vec3.set(right, 1.0, 0.0, 0.0);
        const up = vec3.create();
        vec3.set(up, 0.0, 1.0, 0.0);
        vec3.transformMat4(up, up, invMat);
        vec3.transformMat4(right, right, invMat);

        self.screenZ[0] = 0.0;
        self.screenZ[1] = 0.0;
        self.screenZ[2] = 1.0;

        vec3.transformMat4(self.screenZ, self.screenZ, invMat);

        self.gl.useProgram(self.shaderProgram);
        if (self.backColour === "default") {
            self.gl.uniform1i(self.shaderProgram.defaultColour, true);
        } else {
            self.gl.uniform1i(self.shaderProgram.defaultColour, false);
            self.gl.uniform4fv(self.shaderProgram.backColour, new Float32Array(self.backColour as number[]));
        }
        self.gl.uniform1i(self.shaderProgram.shinyBack, self.shinyBack);

        self.gl.useProgram(self.shaderProgramInstanced);
        if (self.backColour === "default") {
            self.gl.uniform1i(self.shaderProgramInstanced.defaultColour, true);
        } else {
            self.gl.uniform1i(self.shaderProgramInstanced.defaultColour, false);
            self.gl.uniform4fv(self.shaderProgramInstanced.backColour, new Float32Array(self.backColour as number[]));
        }
        self.gl.uniform1i(self.shaderProgramInstanced.shinyBack, self.shinyBack);

        if(self.doPerspectiveProjection){
            //FIXME - What is the justificatio of 5.7? (Approximately tan(acos(48./270.)), but not quite close enough)....
            let perspMult = 1.0;
            if(self.renderToTexture){
                if(self.gl.viewportWidth > self.gl.viewportHeight){
                    perspMult = 1.0 / ratio;
                }
            }
            mat4.scale(self.pMatrix, self.pMatrix, [perspMult * 5.7 / self.zoom, perspMult * 5.7 / self.zoom, 1.0]);
        } else {
            mat4.scale(self.pMatrix, self.pMatrix, [1. / self.zoom, 1. / self.zoom, 1.0]);
        }
        mat4.translate(self.mvMatrix, self.mvMatrix, self.origin);

        self.pmvMatrix = mat4.create();
        mat4.multiply(self.pmvMatrix, self.pMatrix, self.mvMatrix);

        self.gl.useProgram(self.shaderProgramGBuffers);
        self.setMatrixUniforms(self.shaderProgramGBuffers);

        self.gl.useProgram(self.shaderProgramGBuffersInstanced);
        self.setMatrixUniforms(self.shaderProgramGBuffersInstanced);

        self.gl.useProgram(self.shaderProgramGBuffersPerfectSpheres);
        self.setMatrixUniforms(self.shaderProgramGBuffersPerfectSpheres);

        self.gl.useProgram(self.shaderProgram);
        self.setMatrixUniforms(self.shaderProgram);
        self.setLightUniforms(self.shaderProgram);

        self.gl.useProgram(self.shaderProgramOutline);
        self.setMatrixUniforms(self.shaderProgramOutline);
        self.setLightUniforms(self.shaderProgramOutline);

        self.gl.useProgram(self.shaderProgramInstanced);
        self.setMatrixUniforms(self.shaderProgramInstanced);
        self.setLightUniforms(self.shaderProgramInstanced);

        self.gl.useProgram(self.shaderProgramInstancedOutline);
        self.setMatrixUniforms(self.shaderProgramInstancedOutline);
        self.setLightUniforms(self.shaderProgramInstancedOutline);

        self.gl.useProgram(self.shaderProgramInstancedShadow);
        self.setMatrixUniforms(self.shaderProgramInstancedShadow);
        self.setLightUniforms(self.shaderProgramInstancedShadow);

        self.gl.useProgram(self.shaderProgramShadow);
        self.setMatrixUniforms(self.shaderProgramShadow);
        self.setLightUniforms(self.shaderProgramShadow);

        self.gl.useProgram(self.shaderProgramLines);
        self.setMatrixUniforms(self.shaderProgramLines);

        self.gl.useProgram(self.shaderProgramPointSpheres);
        self.setMatrixUniforms(self.shaderProgramPointSpheres);
        self.setLightUniforms(self.shaderProgramPointSpheres);

        self.gl.useProgram(self.shaderProgram);
        self.gl.enableVertexAttribArray(self.shaderProgram.vertexNormalAttribute);

        self.gl.useProgram(self.shaderProgramGBuffers);
        self.gl.enableVertexAttribArray(self.shaderProgramGBuffers.vertexNormalAttribute);

        self.gl.useProgram(self.shaderProgramGBuffersInstanced);
        self.gl.enableVertexAttribArray(self.shaderProgramGBuffersInstanced.vertexNormalAttribute);

        self.gl.useProgram(self.shaderProgramOutline);
        self.gl.enableVertexAttribArray(self.shaderProgramOutline.vertexNormalAttribute);

        //self.gl.useProgram(self.shaderProgramInstancedOutline);
        //self.gl.enableVertexAttribArray(self.shaderProgramInstancedOutline.vertexNormalAttribute);

        self.gl.useProgram(self.shaderProgramInstanced);
        self.gl.enableVertexAttribArray(self.shaderProgramInstanced.vertexNormalAttribute);

        if(self.doDepthPeelPass||(self.drawingGBuffers&&self.doPerspectiveProjection)){
            self.gl.disable(self.gl.BLEND);
        } else {
            self.gl.enable(self.gl.BLEND);
        }

        if(self.drawingGBuffers){
            drawTriangles(self, calculatingShadowMap, invMat);
            return;
        }

        drawTriangles(self, calculatingShadowMap, invMat);

        if(!calculatingShadowMap){
            self.drawImagesAndText(invMat);
            if(self.atomLabelDepthMode) self.drawDistancesAndLabels();
            self.drawTextLabels(up, right);
            if(self.WEBGL2){
                self.drawTexturedShapes(theMatrix);
            }
            //self.drawCircles(up, right);
        }

        self.myQuat = quat4.clone(oldQuat);

        return invMat;

    }
