/**
 * Another renderer drawing the main view in WebGL's place: the WebGPU main view
 * (components/webMG/MoorhenWebGPUMainView.tsx).
 *
 * MGWebGL stays in charge of everything but the pixels - the camera, input, picking, labels, the
 * frame loop - and drawScene offers each frame to the external renderer first (drawExternalFrame
 * in mgWebGLParts/drawCore.ts). WebGL still draws a frame whenever:
 *   - the frame is read back from the WebGL canvas: a screenshot (renderToTexture) or
 *     save_pixel_data; or
 *   - the external renderer declines it (willDraw), for a view it cannot draw yet.
 * While it draws, WebGL's buffer uploads wait (deferWebGLUploads in buildBuffers.ts): the buffers
 * stay dirty, and WebGL builds them the next time it draws.
 *
 * What is taken from the view follows whoever is showing it: MGWebGL.getCanvasRef gives the external
 * renderer's canvas while it draws, so movie export, screen recording and keyframe thumbnails take
 * its pictures; screenshots ask it for one (snapshot) rather than reading WebGL back.
 */
export interface ExternalRenderer {
    /** Shown in the FPS meter and the instance API. */
    readonly name: string;
    /**
     * Whether it will draw the frame about to be drawn. When it will not, WebGL draws it, and
     * whatever the external renderer shows must be out of the way of the WebGL canvas.
     */
    willDraw(): boolean;
    /** Draw the frame. The camera has been advanced and MGWebGL's matrices set for it. */
    draw(): void;
    /** A line for the FPS meter: what was drawn and how long it took. */
    statsText(): string;
    /** The canvas it draws the view on. */
    readonly canvas: HTMLCanvasElement;
    /** Whether it drew the last frame, and so its canvas is the one showing the view. */
    isShowing(): boolean;
    /**
     * The view drawn offscreen at `width` x `height`, RGBA top row first, as a screenshot wants it:
     * soft shadows, and optionally a transparent background.
     */
    snapshot(width: number, height: number, options?: { transparentBackground?: boolean }): Promise<Uint8ClampedArray>;
}

/** The parts of the view whose being on means WebGL must draw (externalWebGLOnlyReason). */
export interface ViewModes {
    /** The shadow map shown in place of the scene, for debugging shadows. */
    doShadowDepthDebug?: boolean;
}

/**
 * Why WebGL must draw this view rather than the WebGPU renderer, or null if WebGPU can. The views
 * WebGPU does not draw yet, and a recording of the WebGL canvas in progress (one started while
 * WebGL was drawing; a recording started while WebGPU draws records WebGPU's canvas). Divided
 * canvases - three ways, multiple views, side-by-side and cross-eyed stereo - WebGPU draws
 * (previewViews, drawViews), and anaglyph stereo (drawAnaglyph).
 */
export function webGLOnlyReason(view: ViewModes, recordingWebGLCanvas: boolean): string | null {
    if (recordingWebGLCanvas) return "a recording of the WebGL canvas";
    if (view.doShadowDepthDebug) return "the shadow map debug view";
    return null;
}
