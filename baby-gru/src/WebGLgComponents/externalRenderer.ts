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
}

/** The parts of the view whose being on means WebGL must draw (externalWebGLOnlyReason). */
export interface ViewModes {
    doMultiView?: boolean;
    doThreeWayView?: boolean;
    doSideBySideStereo?: boolean;
    doCrossEyedStereo?: boolean;
    doAnaglyphStereo?: boolean;
    /** Depth blur: drawn through WebGL's offscreen buffers. */
    useOffScreenBuffers?: boolean;
    /** Outlines (doOutline). */
    doStenciling?: boolean;
    /** The shadow map shown in place of the scene, for debugging shadows. */
    doShadowDepthDebug?: boolean;
}

/**
 * Why WebGL must draw this view rather than the WebGPU renderer, or null if WebGPU can. The views
 * WebGPU does not draw yet, and a movie being recorded, which is captured from the WebGL canvas.
 */
export function webGLOnlyReason(view: ViewModes, recording: boolean): string | null {
    if (recording) return "a recording, which is captured from the WebGL canvas";
    if (view.doMultiView || view.doThreeWayView) return "multiple views";
    if (view.doSideBySideStereo || view.doCrossEyedStereo || view.doAnaglyphStereo) return "stereo";
    if (view.useOffScreenBuffers) return "depth blur";
    if (view.doStenciling) return "outlines";
    if (view.doShadowDepthDebug) return "the shadow map debug view";
    return null;
}
