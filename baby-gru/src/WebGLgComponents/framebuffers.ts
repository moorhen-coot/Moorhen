import { setRttFramebufferSize } from "../store/glRefSlice"
import type { MGWebGL } from './mgWebGL';

/**
 * Framebuffer / offscreen-buffer setup. These methods create and resize the
 * WebGL framebuffer objects used by the render pipeline (silhouette, edge
 * detect, gbuffers, SSAO, simple blur, depth peel, generic offscreen, texture).
 * They are self-contained: no cross-calls, no shader-init dependencies. The
 * buffer/framebuffer fields stay on the MGWebGL instance (the draw pipeline
 * reads them); only the setup logic moves here. `self` is the live instance.
 */

export function recreateSilhouetteBuffers(self: MGWebGL) {
        if(!self.silhouetteFramebuffer){
            self.silhouetteFramebuffer = self.gl.createFramebuffer();

            self.silhouetteTexture = self.gl.createTexture();
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.silhouetteTexture);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.LINEAR);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

            self.silhouetteDepthTexture = self.gl.createTexture();
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.silhouetteDepthTexture);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

            self.silhouetteRenderbufferDepth = self.gl.createRenderbuffer();
            self.silhouetteRenderbufferColor = self.gl.createRenderbuffer();

        }
        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.silhouetteFramebuffer);
        self.silhouetteFramebuffer.width = self.canvas.width;
        self.silhouetteFramebuffer.height = self.canvas.height;

        self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, self.silhouetteRenderbufferColor);
        self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.RENDERBUFFER, self.silhouetteRenderbufferColor);
        self.gl.renderbufferStorage(self.gl.RENDERBUFFER, self.gl.DEPTH_COMPONENT16, self.canvas.width, self.canvas.height);

        self.gl.bindTexture(self.gl.TEXTURE_2D, self.silhouetteTexture);
        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, self.canvas.width, self.canvas.height, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, null);
        self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.silhouetteTexture, 0);

        self.gl.bindTexture(self.gl.TEXTURE_2D, self.silhouetteDepthTexture);
        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.DEPTH_COMPONENT24, self.canvas.width, self.canvas.height, 0, self.gl.DEPTH_COMPONENT, self.gl.UNSIGNED_INT, null);
        self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.TEXTURE_2D, self.silhouetteDepthTexture, 0);

        self.gl.bindTexture(self.gl.TEXTURE_2D, null);
        self.silhouetteBufferReady = true;

}

export function createEdgeDetectFramebufferBuffer(self: MGWebGL, width : number,height : number) {

        if(!self.edgeDetectFramebuffer){
            self.edgeDetectFramebuffer = self.gl.createFramebuffer();

            self.edgeDetectTexture = self.gl.createTexture();
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.edgeDetectTexture);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.LINEAR);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

            const edgeDetectRenderbuffer = self.gl.createRenderbuffer();
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.edgeDetectFramebuffer);
            self.edgeDetectFramebuffer.width = width;
            self.edgeDetectFramebuffer.height = height;

            self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, edgeDetectRenderbuffer);

            self.gl.bindTexture(self.gl.TEXTURE_2D, self.edgeDetectTexture);
            self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, width, height, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, null);
            self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.edgeDetectTexture, 0);

            const status = self.gl.checkFramebufferStatus(self.gl.FRAMEBUFFER);
            //console.log("EdgeDetect framebuffer OK?",(status===self.gl.FRAMEBUFFER_COMPLETE));
        }

        self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, null);
        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
        self.gl.bindTexture(self.gl.TEXTURE_2D, null);

}

export function createGBuffers(self: MGWebGL, width : number,height : number) {
        if(!self.gFramebuffer){
            self.gFramebuffer = self.gl.createFramebuffer();
            self.gBufferDepthTexture = self.gl.createTexture();
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.gBufferDepthTexture);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

            self.gBufferPositionTexture = self.gl.createTexture();
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.gBufferPositionTexture);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

            self.gBufferNormalTexture = self.gl.createTexture();
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.gBufferNormalTexture);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

            //FIXME - Sizes?
            const gBufferRenderbuffer = self.gl.createRenderbuffer();
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.gFramebuffer);
            self.gFramebuffer.width = width;
            self.gFramebuffer.height = height;

            self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, gBufferRenderbuffer);
            self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.RENDERBUFFER, gBufferRenderbuffer);
            if (self.WEBGL2) {
                self.gl.renderbufferStorage(self.gl.RENDERBUFFER, self.gl.DEPTH_COMPONENT32F, width, height);
            } else {
                self.gl.renderbufferStorage(self.gl.RENDERBUFFER, self.gl.DEPTH_COMPONENT16, width, height);
            }
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.gBufferDepthTexture);
            self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.DEPTH_COMPONENT32F, width, height, 0, self.gl.DEPTH_COMPONENT, self.gl.FLOAT, null);
            self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.TEXTURE_2D, self.gBufferDepthTexture, 0);

            self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.RENDERBUFFER, gBufferRenderbuffer);
            self.gl.renderbufferStorage(self.gl.RENDERBUFFER, self.gl.RGBA32F, width, height);
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.gBufferPositionTexture);
            self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA32F, width, height, 0, self.gl.RGBA, self.gl.FLOAT, null);
            self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.gBufferPositionTexture, 0);

            self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT1, self.gl.RENDERBUFFER, gBufferRenderbuffer);
            self.gl.renderbufferStorage(self.gl.RENDERBUFFER, self.gl.RGBA32F, width, height);
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.gBufferNormalTexture);
            self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA32F, width, height, 0, self.gl.RGBA, self.gl.FLOAT, null);
            self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT1, self.gl.TEXTURE_2D, self.gBufferNormalTexture, 0);

            const status = self.gl.checkFramebufferStatus(self.gl.FRAMEBUFFER);
            console.log("G-buffer framebuffer OK?",(status===self.gl.FRAMEBUFFER_COMPLETE));

        }
}

export function createSSAOFramebufferBuffer(self: MGWebGL) {

        if(!self.ssaoFramebuffer){
            self.ssaoFramebuffer = self.gl.createFramebuffer();

            self.ssaoTexture = self.gl.createTexture();
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.ssaoTexture);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.LINEAR);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

            //FIXME - Sizes?
            const ssaoRenderbuffer = self.gl.createRenderbuffer();
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.ssaoFramebuffer);
            self.ssaoFramebuffer.width = self.ssaoFramebufferSize;
            self.ssaoFramebuffer.height = self.ssaoFramebufferSize;

            self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, ssaoRenderbuffer);

            self.gl.bindTexture(self.gl.TEXTURE_2D, self.ssaoTexture);
            self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, self.ssaoFramebuffer.width, self.ssaoFramebuffer.height, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, null);
            self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.ssaoTexture, 0);

            const status = self.gl.checkFramebufferStatus(self.gl.FRAMEBUFFER);
            console.log("SSAO",typeof(status))
            console.log("SSAO",typeof(self.gl.FRAMEBUFFER_COMPLETE))
            console.log("SSAO framebuffer OK?",(status===self.gl.FRAMEBUFFER_COMPLETE));
        }

        self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, null);
        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
        self.gl.bindTexture(self.gl.TEXTURE_2D, null);

}

export function createSimpleBlurOffScreeenBuffers(self: MGWebGL) {

        self.offScreenFramebufferSimpleBlurX = self.gl.createFramebuffer();
        self.offScreenFramebufferSimpleBlurY = self.gl.createFramebuffer();

        self.simpleBlurXTexture = self.gl.createTexture();
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.simpleBlurXTexture);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.LINEAR);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

        self.simpleBlurYTexture = self.gl.createTexture();
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.simpleBlurYTexture);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.LINEAR);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebufferSimpleBlurX);
        self.offScreenFramebufferSimpleBlurX.width = 1024;
        self.offScreenFramebufferSimpleBlurX.height = 1024;
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.simpleBlurXTexture);
        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, 1024, 1024, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, null);
        self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.simpleBlurXTexture, 0);

        let status = self.gl.checkFramebufferStatus(self.gl.FRAMEBUFFER);
        console.log("offScreenFramebufferSimpleBlurX framebuffer OK?",(status===self.gl.FRAMEBUFFER_COMPLETE));

        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebufferSimpleBlurY);
        self.offScreenFramebufferSimpleBlurY.width = 1024;
        self.offScreenFramebufferSimpleBlurY.height = 1024;
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.simpleBlurYTexture);
        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, 1024, 1024, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, null);
        self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.simpleBlurYTexture, 0);

        status = self.gl.checkFramebufferStatus(self.gl.FRAMEBUFFER);
        console.log("offScreenFramebufferSimpleBlurY framebuffer OK?",(status===self.gl.FRAMEBUFFER_COMPLETE));

        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
        self.gl.bindTexture(self.gl.TEXTURE_2D, null);

}

export function recreateDepthPeelBuffers(self: MGWebGL, width,height) {
        //Defines 4 off-screeen multisampled framebuffers and corresponding textures.
        //Requires depth_texture
        //FIXME - Should be called after resize event
        if(self.depth_texture){
            if(self.depthPeelFramebuffers.length===0&&width>0&&height>0){
                console.log("Make depth peel buffers of size",width,height)
                for(let i=0;i<4;i++){
                    self.depthPeelFramebuffers[i] = self.gl.createFramebuffer();
                    self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.depthPeelFramebuffers[i]);

                    self.depthPeelColorTextures[i] = self.gl.createTexture();
                    self.depthPeelDepthTextures[i] = self.gl.createTexture();
                    self.depthPeelRenderbufferDepth[i] = self.gl.createRenderbuffer();
                    self.depthPeelRenderbufferColor[i] = self.gl.createRenderbuffer();

                    self.depthPeelFramebuffers[i].width = width;
                    self.depthPeelFramebuffers[i].height = height;

                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.depthPeelColorTextures[i]);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

                    self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, self.depthPeelRenderbufferColor[i]);
                    self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.RENDERBUFFER, self.depthPeelRenderbufferColor[i]);
                    if (self.WEBGL2) {
                        //FIXME - multismapling isn't actually working - need to blit to another buffer ...
                        self.gl.renderbufferStorageMultisample(self.gl.RENDERBUFFER, self.gl.getParameter(self.gl.MAX_SAMPLES), self.gl.RGBA32F, width, height);
                        //self.gl.renderbufferStorage(self.gl.RENDERBUFFER, self.gl.RGBA32F, width, height);
                        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA32F, width, height, 0, self.gl.RGBA, self.gl.FLOAT, null);
                    } else {
                        self.gl.renderbufferStorage(self.gl.RENDERBUFFER, self.gl.RGBA4, width, height);
                        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, width, height, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, null);
                    }
                    self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.depthPeelColorTextures[i], 0);

                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.depthPeelDepthTextures[i]);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

                    self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, self.depthPeelRenderbufferDepth[i]);
                    self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.RENDERBUFFER, self.depthPeelRenderbufferDepth[i]);
                    if (self.WEBGL2) {
                        self.gl.renderbufferStorage(self.gl.RENDERBUFFER, self.gl.DEPTH_COMPONENT32F, width, height);
                        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.DEPTH_COMPONENT32F, width, height, 0, self.gl.DEPTH_COMPONENT, self.gl.FLOAT, null);
                    } else {
                        self.gl.renderbufferStorage(self.gl.RENDERBUFFER, self.gl.DEPTH_COMPONENT16, width, height);
                        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.DEPTH_COMPONENT, width, height, 0, self.gl.DEPTH_COMPONENT, self.gl.UNSIGNED_INT, null);
                    }
                    self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.TEXTURE_2D, self.depthPeelDepthTextures[i], 0);

                    const canRead = (self.gl.checkFramebufferStatus(self.gl.FRAMEBUFFER) === self.gl.FRAMEBUFFER_COMPLETE);
                    console.log("Depth-peel buffer",i,"completeness",canRead);
                    if(!canRead){
                        if(self.gl.checkFramebufferStatus(self.gl.FRAMEBUFFER) === self.gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT){
                            console.log("FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
                        }
                        if(self.gl.checkFramebufferStatus(self.gl.FRAMEBUFFER) === self.gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT){
                            console.log("FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
                        }
                        if(self.gl.checkFramebufferStatus(self.gl.FRAMEBUFFER) === self.gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS){
                            console.log("FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
                        }
                        if(self.gl.checkFramebufferStatus(self.gl.FRAMEBUFFER) === self.gl.FRAMEBUFFER_UNSUPPORTED){
                            console.log("FRAMEBUFFER_UNSUPPORTED");
                        }
                        if(self.gl.checkFramebufferStatus(self.gl.FRAMEBUFFER) === self.gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE){
                            console.log("FRAMEBUFFER_INCOMPLETE_MULTISAMPLE");
                        }
                    }

                    self.gl.bindTexture(self.gl.TEXTURE_2D, null);
                    self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, null);
                    self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);

                }
            }
        }
}

export function recreateOffScreeenBuffers(self: MGWebGL, width,height) {
        // This defines an off-screeen multisampled framebuffer and an off-screen framebuffer and texture to blit to.
        if(!self.offScreenFramebuffer){
            self.offScreenFramebuffer = self.gl.createFramebuffer();
            self.offScreenFramebufferColor = self.gl.createFramebuffer();
            self.offScreenFramebufferBlurX = self.gl.createFramebuffer();
            self.offScreenFramebufferBlurY = self.gl.createFramebuffer();

            self.blurXTexture = self.gl.createTexture();
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.blurXTexture);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.LINEAR);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

            self.blurYTexture = self.gl.createTexture();
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.blurYTexture);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.LINEAR);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

            self.offScreenTexture = self.gl.createTexture();
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.offScreenTexture);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.LINEAR);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

            self.offScreenDepthTexture = self.gl.createTexture();
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.offScreenDepthTexture);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

            self.offScreenRenderbufferDepth = self.gl.createRenderbuffer();
            self.offScreenRenderbufferColor = self.gl.createRenderbuffer();
        }

        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebuffer);
        self.offScreenFramebuffer.width = width;
        self.offScreenFramebuffer.height = height;

        if (self.WEBGL2) {
            self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, self.offScreenRenderbufferDepth);
            self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.RENDERBUFFER, self.offScreenRenderbufferDepth);
            self.gl.renderbufferStorageMultisample(self.gl.RENDERBUFFER, self.gl.getParameter(self.gl.MAX_SAMPLES),
                    self.gl.DEPTH_COMPONENT24, width, height);

            self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, self.offScreenRenderbufferColor);
            self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.RENDERBUFFER, self.offScreenRenderbufferColor);
            self.gl.renderbufferStorageMultisample(self.gl.RENDERBUFFER, self.gl.getParameter(self.gl.MAX_SAMPLES),
                    self.gl.RGBA8, width, height);
        } else {
            self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, self.offScreenRenderbufferColor);
            self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.RENDERBUFFER, self.offScreenRenderbufferColor);
            self.gl.renderbufferStorage(self.gl.RENDERBUFFER, self.gl.DEPTH_COMPONENT16, width, height);
        }


        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebufferColor);
        self.offScreenFramebufferColor.width = width;
        self.offScreenFramebufferColor.height = height;
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.offScreenTexture);
        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, width, height, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, null);
        self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.offScreenTexture, 0);
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.offScreenDepthTexture);
        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.DEPTH_COMPONENT24, width, height, 0, self.gl.DEPTH_COMPONENT, self.gl.UNSIGNED_INT, null);
        self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.TEXTURE_2D, self.offScreenDepthTexture, 0);

        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebufferBlurX);
        self.offScreenFramebufferBlurX.width = width;
        self.offScreenFramebufferBlurX.height = height;
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.blurXTexture);
        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, width, height, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, null);
        self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.blurXTexture, 0);

        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.offScreenFramebufferBlurY);
        self.offScreenFramebufferBlurY.width = width;
        self.offScreenFramebufferBlurY.height = height;
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.blurYTexture);
        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, width, height, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, null);
        self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.blurYTexture, 0);

        self.offScreenReady = true;

        self.gl.bindTexture(self.gl.TEXTURE_2D, null);
        self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, null);
        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
}

export function initTextureFramebuffer(self: MGWebGL) : void {

        self.rttFramebuffer = self.gl.createFramebuffer();
        self.rttFramebufferColor = self.gl.createFramebuffer();

        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.rttFramebuffer);

        self.rttFramebuffer.width = Math.min(self.gl.getParameter(self.gl.MAX_TEXTURE_SIZE),self.gl.getParameter(self.gl.MAX_RENDERBUFFER_SIZE),4096);
        self.rttFramebuffer.height = self.rttFramebuffer.width;
        self.dispatch(setRttFramebufferSize([self.rttFramebuffer.width,self.rttFramebuffer.height]))

        self.rttTexture = self.gl.createTexture();
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.rttTexture);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.LINEAR);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, self.rttFramebuffer.width, self.rttFramebuffer.height, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, null);

        self.rttDepthTexture = self.gl.createTexture();
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.rttDepthTexture);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

        if (self.WEBGL2) {
            const renderbufferDepth = self.gl.createRenderbuffer();
            self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, renderbufferDepth);
            self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.RENDERBUFFER, renderbufferDepth);
            self.gl.renderbufferStorageMultisample(self.gl.RENDERBUFFER,
                                    self.gl.getParameter(self.gl.MAX_SAMPLES),
                                    self.gl.DEPTH_COMPONENT24,
                                    self.rttFramebuffer.width,
                                    self.rttFramebuffer.height);
            const renderbuffer = self.gl.createRenderbuffer();
            self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, renderbuffer);
            self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.RENDERBUFFER, renderbuffer);
            self.gl.renderbufferStorageMultisample(self.gl.RENDERBUFFER,
                                    self.gl.getParameter(self.gl.MAX_SAMPLES),
                                    self.gl.RGBA8,
                                    self.rttFramebuffer.width,
                                    self.rttFramebuffer.height);
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.rttFramebufferColor);
            self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.rttTexture, 0);
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.rttDepthTexture);
            self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.DEPTH_COMPONENT24, self.rttFramebuffer.width, self.rttFramebuffer.height, 0, self.gl.DEPTH_COMPONENT, self.gl.UNSIGNED_INT, null);
            self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.TEXTURE_2D, self.rttDepthTexture, 0);
        } else {
            self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.rttTexture, 0);
            const renderbuffer = self.gl.createRenderbuffer();
            self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, renderbuffer);
            self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.RENDERBUFFER, renderbuffer);
            //Sigh. Maybe DEPTH_STENCIL? Is anyone actually stuck on WebGL1?
            self.gl.renderbufferStorage(self.gl.RENDERBUFFER, self.gl.DEPTH_COMPONENT16, self.rttFramebuffer.width, self.rttFramebuffer.height);
        }

        self.gl.bindTexture(self.gl.TEXTURE_2D, null);
        self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, null);
        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);

        self.rttFramebufferDepth = null;
        if (self.depth_texture) {
            self.rttFramebufferDepth = self.gl.createFramebuffer();
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.rttFramebufferDepth);
            const hwLimit = Math.min(self.gl.getParameter(self.gl.MAX_TEXTURE_SIZE), self.gl.getParameter(self.gl.MAX_RENDERBUFFER_SIZE));
            const maxDim = Math.max(1, self.canvas.width, self.canvas.height);
            const shadowSize = Math.max(1024, Math.min(4096, hwLimit, Math.pow(2, Math.ceil(Math.log2(maxDim)))));
            self.rttFramebufferDepth.width = shadowSize;
            self.rttFramebufferDepth.height = shadowSize;
            self.rttTextureDepth = self.gl.createTexture();
            self.gl.bindTexture(self.gl.TEXTURE_2D, self.rttTextureDepth);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
            self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

            if (self.WEBGL2) {
                self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.DEPTH_COMPONENT24, self.rttFramebufferDepth.width, self.rttFramebufferDepth.height, 0, self.gl.DEPTH_COMPONENT, self.gl.UNSIGNED_INT, null);
            } else {
                self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.DEPTH_COMPONENT, self.rttFramebufferDepth.width, self.rttFramebufferDepth.height, 0, self.gl.DEPTH_COMPONENT, self.gl.UNSIGNED_SHORT, null);
            }
            const renderbufferCol = self.gl.createRenderbuffer();
            self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, renderbufferCol);
            self.gl.renderbufferStorage(self.gl.RENDERBUFFER, self.gl.RGBA4, self.rttFramebufferDepth.width, self.rttFramebufferDepth.height);
            self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.TEXTURE_2D, self.rttTextureDepth, 0);
            self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.RENDERBUFFER, renderbufferCol);
            self.gl.bindTexture(self.gl.TEXTURE_2D, null);
            self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, null);
            self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
        }
        self.screenshotBuffersReady = true;

}
