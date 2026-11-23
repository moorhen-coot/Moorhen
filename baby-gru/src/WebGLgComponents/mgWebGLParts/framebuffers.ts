import { setRttFramebufferSize } from "../../store/glRefSlice"
import type { MGWebGL } from '../mgWebGL';
import type { webGL } from "../../types/mgWebGL";
import { SHADOW_MAP_TEXELS, type ShadowMapQuality } from '../shadowMapQuality';

/**
 * Framebuffer / offscreen-buffer setup. These methods create and resize the
 * WebGL framebuffer objects used by the render pipeline (edge
 * detect, gbuffers, SSAO, simple blur, depth peel, generic offscreen, texture).
 * They are self-contained: no cross-calls, no shader-init dependencies. The
 * buffer/framebuffer fields stay on the MGWebGL instance (the draw pipeline
 * reads them); only the setup logic moves here. `self` is the live instance.
 */

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
    deleteDepthPeelResolveBuffer(self);
}

/**
 * Multisampling for the opaque peel layer.
 *
 * As soon as anything in the scene is transparent, the whole scene is drawn through the depth-peel
 * layers instead of straight to the canvas, and those layers are ordinary single-sample textures.
 * So making one object transparent switched antialiasing off for everything else - most visibly
 * on map mesh, which is a mass of one-pixel lines. The FXAA in the compositing shader could not
 * make up for it: it only runs where the layer drew something, so it can never add coverage to
 * the pixels beside a line, which is the whole of what antialiasing a thin line means.
 *
 * Only the opaque layer is multisampled. It holds nearly everything on screen, and is drawn exactly
 * once, so it costs about what the canvas's own multisampling costs when nothing is transparent.
 * The transparent layers stay single-sample: they are composited at partial opacity, where aliasing
 * shows far less, and multisampling them too would multiply the cost by the layer count.
 */

/** Memory allowed for the multisampled opaque layer, colour and depth over all samples. */
export const PEEL_MSAA_BUDGET_BYTES = 256 * 1024 * 1024;

/** What browsers give the canvas by default. More costs fill rate without being visible. */
export const PEEL_MSAA_MAX_SAMPLES = 4;

/** RGBA8 colour plus DEPTH_COMPONENT32F depth, per sample per pixel. */
const PEEL_MSAA_BYTES_PER_SAMPLE = 8;

/**
 * How many samples to give the opaque peel layer at this size, or 0 for none.
 *
 * Bounded by memory as well as by the hardware, because the layers follow the render target: on
 * screen that is the canvas, around 90 MB at 4 samples on a large Retina window, but a 4096x4096
 * capture would want over 500 MB at 4 samples on top of the capture buffers themselves, so it gets
 * 2. Past the budget the count drops, and below 2 there is no point multisampling at all.
 *
 * @param supported sample counts the implementation supports for both formats, in any order.
 */
export function peelResolveSamples(width: number, height: number, supported: readonly number[]): number {
    if (!(width > 0 && height > 0)) return 0;
    const affordable = Math.floor(PEEL_MSAA_BUDGET_BYTES / (width * height * PEEL_MSAA_BYTES_PER_SAMPLE));
    const wanted = Math.min(PEEL_MSAA_MAX_SAMPLES, affordable);
    const usable = supported.filter(n => n >= 2 && n <= wanted);
    return usable.length > 0 ? Math.max(...usable) : 0;
}

/** Sample counts both RGBA8 and DEPTH_COMPONENT32F renderbuffers support here. Asked once. */
function peelSupportedSamples(self: MGWebGL): number[] {
    if (!self.depthPeelMSAASupported) {
        const gl = self.gl as WebGL2RenderingContext;
        const colour = Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA8, gl.SAMPLES) ?? []) as number[];
        const depth = Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER, gl.DEPTH_COMPONENT32F, gl.SAMPLES) ?? []) as number[];
        self.depthPeelMSAASupported = colour.filter(n => depth.includes(n));
    }
    return self.depthPeelMSAASupported;
}

export function deleteDepthPeelResolveBuffer(self: MGWebGL) {
    if (self.depthPeelMSAAFramebuffer) self.gl.deleteFramebuffer(self.depthPeelMSAAFramebuffer);
    if (self.depthPeelMSAAColor) self.gl.deleteRenderbuffer(self.depthPeelMSAAColor);
    if (self.depthPeelMSAADepth) self.gl.deleteRenderbuffer(self.depthPeelMSAADepth);
    self.depthPeelMSAAFramebuffer = null;
    self.depthPeelMSAAColor = null;
    self.depthPeelMSAADepth = null;
    self.depthPeelMSAASamples = 0;
}

/**
 * Make sure the multisampled opaque-layer buffer exists at this size, and say whether it can be
 * used. False means draw layer 0 single-sample as before: WebGL1, too large for the budget, or an
 * implementation that will not build it. A failed build is remembered for that size so it is not
 * retried every frame.
 */
export function ensureDepthPeelResolveBuffer(self: MGWebGL, width: number, height: number): boolean {
    if (!self.WEBGL2) return false;
    const gl = self.gl as WebGL2RenderingContext;
    const samples = peelResolveSamples(width, height, peelSupportedSamples(self));
    const key = `${width}x${height}x${samples}`;

    const fb = self.depthPeelMSAAFramebuffer;
    if (fb && fb.width === width && fb.height === height && self.depthPeelMSAASamples === samples) return true;
    deleteDepthPeelResolveBuffer(self);
    if (samples === 0 || self.depthPeelMSAAFailed === key) return false;

    const framebuffer = gl.createFramebuffer() as webGL.MGWebGLFrameBuffer;
    framebuffer.width = width;
    framebuffer.height = height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    const colour = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, colour);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colour);

    // 32F to match the layer depth textures it resolves into; a depth blit needs identical formats.
    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT32F, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);

    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    self.depthPeelMSAAFramebuffer = framebuffer;
    self.depthPeelMSAAColor = colour;
    self.depthPeelMSAADepth = depth;
    self.depthPeelMSAASamples = samples;
    if (!complete) {
        console.warn(`Multisampled opaque peel layer incomplete at ${key}; transparency will be drawn without antialiasing.`);
        deleteDepthPeelResolveBuffer(self);
        self.depthPeelMSAAFailed = key;
        return false;
    }
    return true;
}

/**
 * Resolve the multisampled opaque layer into a peel layer's colour and depth textures.
 *
 * The depth resolve keeps one sample per pixel, chosen by the implementation. That only matters at
 * silhouette edges, where it decides by a pixel whether transparent geometry counts as behind the
 * opaque surface - the same choice a single-sample layer would have made anyway.
 */
export function resolveDepthPeelResolveBuffer(self: MGWebGL, target: webGL.MGWebGLFrameBuffer) {
    const gl = self.gl as WebGL2RenderingContext;
    const source = self.depthPeelMSAAFramebuffer;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, source);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, target);
    gl.blitFramebuffer(0, 0, source.width, source.height, 0, 0, target.width, target.height,
                       gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
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
                    //
                    // Sized RGBA8 on WebGL2 rather than unsized RGBA: layer 0 is filled by resolving
                    // a multisampled RGBA8 renderbuffer into it (see ensureDepthPeelResolveBuffer),
                    // and a multisample resolve requires the two formats to be identical.
                    self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.WEBGL2 ? (self.gl as WebGL2RenderingContext).RGBA8 : self.gl.RGBA,
                                       width, height, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, null);
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

/**
 * Free everything initTextureFramebuffer made.
 *
 * Nothing used to, and initTextureFramebuffer runs more than once: resize() clears
 * screenshotBuffersReady, and the next render that wants the texture rebuilds the lot. So every
 * window resize stranded two framebuffers, three textures and the renderbuffers - at 4096x4096
 * that is around 100 MB of GPU memory per resize, held until the context died.
 *
 * The renderbuffers used to be local consts, so they could not have been freed even by a caller
 * that wanted to. They are kept on the instance now for that reason alone.
 */
// The quality setting and its map sizes live in ../shadowMapQuality, where the WebGPU renderer can
// read them without bringing this file's WebGL and store dependencies along; re-exported here for
// the code that has always found them here.
export { SHADOW_MAP_TEXELS, type ShadowMapQuality } from '../shadowMapQuality';

export function deleteTextureFramebuffer(self: MGWebGL) : void {
        if (!self.gl) return;

        (self.rttRenderbuffers ?? []).forEach(buffer => { if (buffer) self.gl.deleteRenderbuffer(buffer) });
        self.rttRenderbuffers = [];

        [self.rttFramebuffer, self.rttFramebufferColor, self.rttFramebufferDepth]
            .forEach(buffer => { if (buffer) self.gl.deleteFramebuffer(buffer) });
        [self.rttTexture, self.rttDepthTexture, self.rttTextureDepth]
            .forEach(texture => { if (texture) self.gl.deleteTexture(texture) });

        self.rttFramebuffer = null;
        self.rttFramebufferColor = null;
        self.rttFramebufferDepth = null;
        self.rttTexture = null;
        self.rttDepthTexture = null;
        self.rttTextureDepth = null;
        self.screenshotBuffersReady = false;
}

/**
 * Build the render-to-texture buffers: a square as large as the hardware allows, up to 4096.
 *
 * Screenshots render into this and then crop an aspect-correct band out of it, which is why the
 * projection built for this path uses square extents. The two halves only make sense together.
 */
export function initTextureFramebuffer(self: MGWebGL) : void {

        // Whatever is already here is about to be replaced; this runs again after every resize.
        deleteTextureFramebuffer(self);

        self.rttRenderbuffers = [];
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
            self.rttRenderbuffers.push(renderbufferDepth);
            self.gl.bindRenderbuffer(self.gl.RENDERBUFFER, renderbufferDepth);
            self.gl.framebufferRenderbuffer(self.gl.FRAMEBUFFER, self.gl.DEPTH_ATTACHMENT, self.gl.RENDERBUFFER, renderbufferDepth);
            self.gl.renderbufferStorageMultisample(self.gl.RENDERBUFFER,
                                    self.gl.getParameter(self.gl.MAX_SAMPLES),
                                    self.gl.DEPTH_COMPONENT24,
                                    self.rttFramebuffer.width,
                                    self.rttFramebuffer.height);
            const renderbuffer = self.gl.createRenderbuffer();
            self.rttRenderbuffers.push(renderbuffer);
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
            self.rttRenderbuffers.push(renderbuffer);
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
            // Sized by the chosen quality rather than by the canvas, which is what it used to
            // be: nextPow2(max(width, height)) capped at 4096, so an ordinary window got 2048 and
            // a 4K one silently got twice the shadow cost. The size people actually want depends
            // on the structure and on what they are doing with it, not on the window.
            const quality: ShadowMapQuality =
                self.store?.getState?.()?.sceneSettings?.shadowMapQuality ?? "coarse";
            const wanted = SHADOW_MAP_TEXELS[quality] ?? SHADOW_MAP_TEXELS.coarse;
            const shadowSize = Math.max(1024, Math.min(wanted, hwLimit));
            // Silent when it gets what it asked for. Said out loud when the hardware refuses,
            // because then two settings quietly become the same picture and there is nothing on
            // screen to say so - which is the likeliest reading of a browser where raising the
            // quality changes nothing at all.
            if (shadowSize !== wanted) {
                console.warn(`[shadow map] asked for ${wanted}, hardware limit is ${hwLimit},`
                    + ` using ${shadowSize}`);
            }
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
            self.rttRenderbuffers.push(renderbufferCol);
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
