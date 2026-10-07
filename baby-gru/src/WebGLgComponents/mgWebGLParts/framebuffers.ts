import { setRttFramebufferSize } from "../../store/glRefSlice"
import type { MGWebGL } from '../mgWebGL';

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

/**
 * Release every depth-peel layer.
 *
 * Gathered here because the layers are now rebuilt whenever the size or the count changes, and
 * freeing five arrays by hand at each call site is how one of them gets forgotten. GL objects
 * are not reclaimed with their JavaScript handles, so a missed delete is a leak that only shows
 * up as memory pressure much later.
 */
export function deleteDepthPeelBuffers(self: MGWebGL) {
    for (let i = 0; i < self.depthPeelFramebuffers.length; i++) {
        if (self.depthPeelFramebuffers[i]) self.gl.deleteFramebuffer(self.depthPeelFramebuffers[i]);
        if (self.depthPeelColorTextures[i]) self.gl.deleteTexture(self.depthPeelColorTextures[i]);
        if (self.depthPeelDepthTextures[i]) self.gl.deleteTexture(self.depthPeelDepthTextures[i]);
        if (self.depthPeelRenderbufferDepth?.[i]) self.gl.deleteRenderbuffer(self.depthPeelRenderbufferDepth[i]);
        if (self.depthPeelRenderbufferColor?.[i]) self.gl.deleteRenderbuffer(self.depthPeelRenderbufferColor[i]);
    }
    self.depthPeelFramebuffers = [];
    self.depthPeelColorTextures = [];
    self.depthPeelDepthTextures = [];
    self.depthPeelRenderbufferDepth = [];
    self.depthPeelRenderbufferColor = [];
}

/**
 * Allocate the depth-peeling layers, or reuse them if they already match.
 *
 * Rebuilt whenever the size or the number of layers changes, which the old version could not
 * do: it returned early whenever any buffers existed at all, so a window resize left the layers
 * at whatever size the window happened to be when transparency was first switched on.
 *
 * @param layers how many peels. One per depth of transparent surface the scene needs resolved;
 *               several contour levels of the same field want more than a single surface does.
 */
export function recreateDepthPeelBuffers(self: MGWebGL, width, height, layers = 4) {
        //Requires depth_texture
        if(self.depth_texture){
            const matches = self.depthPeelFramebuffers.length === layers
                && self.depthPeelFramebuffers[0]?.width === width
                && self.depthPeelFramebuffers[0]?.height === height;
            if(!matches && width>0 && height>0){
                deleteDepthPeelBuffers(self);
                console.log("Make",layers,"depth peel buffers of size",width,height)
                for(let i=0;i<layers;i++){
                    self.depthPeelFramebuffers[i] = self.gl.createFramebuffer();
                    self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.depthPeelFramebuffers[i]);

                    self.depthPeelColorTextures[i] = self.gl.createTexture();
                    self.depthPeelDepthTextures[i] = self.gl.createTexture();

                    // No renderbuffers. There used to be one for colour and one for depth: each
                    // was attached, given storage, and then replaced on the same attachment
                    // point by the texture below, so nothing ever read either of them. The
                    // colour one asked for RGBA32F at MAX_SAMPLES, which is hundreds of
                    // megabytes a layer for storage that was detached before anything drew into
                    // it. The multisampling it was meant for was never finished - the FIXME
                    // above it said as much, and completing it needs a blit, not a renderbuffer
                    // nobody looks at.

                    self.depthPeelFramebuffers[i].width = width;
                    self.depthPeelFramebuffers[i].height = height;

                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.depthPeelColorTextures[i]);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

                    // Eight bits a channel, not RGBA32F. These hold shaded colour on its way to
                    // an eight-bit framebuffer, so the extra precision was never visible, while
                    // costing four times the memory and - since peeling is fill-bound - four
                    // times the bandwidth on every write and every read back during compositing.
                    self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, width, height, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, null);
                    self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.depthPeelColorTextures[i], 0);

                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.depthPeelDepthTextures[i]);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
                    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);

                    // Depth stays at full precision: it is compared against between layers, and
                    // that comparison is what decides which fragment belongs to which peel.
                    if (self.WEBGL2) {
                        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.DEPTH_COMPONENT32F, width, height, 0, self.gl.DEPTH_COMPONENT, self.gl.FLOAT, null);
                    } else {
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

/**
 * Whether the off-screen buffers need rebuilding before they can be drawn into at this size.
 *
 * Pure, and separate from the GL work, because the condition is the part that was wrong. The draw
 * path asked only "are they ready", and resize() rebuilt them only when depth blur was already
 * switched on. So resizing the canvas with blur off - which includes opening a side panel, since
 * that narrows the canvas - left buffers at the old size, still flagged ready. Switching blur on
 * then rendered the scene into a framebuffer of the wrong shape and the picture came out squashed.
 *
 * Comparing the dimensions catches that however the size changed, including routes that never
 * reach resize() at all.
 */
export function offScreenBuffersStale(
    ready: boolean,
    framebuffer: { width?: number; height?: number } | null | undefined,
    width: number,
    height: number,
): boolean {
    if (!ready || !framebuffer) return true;
    return framebuffer.width !== width || framebuffer.height !== height;
}

/** Rebuild the off-screen buffers if they are missing, not ready, or the wrong size. */
export function ensureOffScreeenBuffers(self: MGWebGL, width: number, height: number) {
    if (offScreenBuffersStale(self.offScreenReady, self.offScreenFramebuffer, width, height)) {
        recreateOffScreeenBuffers(self, width, height);
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
