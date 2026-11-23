/**
 * Whether a store's WebGL uploads wait: while another renderer draws the main view
 * (externalRenderer.ts), nothing would draw what WebGL is given, so the work waits until WebGL
 * next draws. Its own module so that the pieces that upload - buildBuffers, the text atlases -
 * can ask without importing each other.
 */

/** The stores whose WebGL uploads wait while another renderer draws the main view. */
const deferredUploads = new WeakSet<object>();

/**
 * While another renderer draws the main view, building buffers for the store's WebGL context
 * waits: nothing would draw them. They stay dirty, and are built when WebGL next draws
 * (MGWebGL.buildBuffers, which passes its context outright). A context passed to buildBuffers is
 * always built for: it belongs to someone who is about to draw with it. The text atlases
 * (TextCanvasTexture) wait the same way, and catch up when WebGL draws them.
 */
export function deferWebGLUploads(store: object, defer: boolean): void {
    if (defer) deferredUploads.add(store);
    else deferredUploads.delete(store);
}

/** Whether `store`'s WebGL uploads are waiting (deferWebGLUploads). */
export function webGLUploadsDeferred(store: object | null | undefined): boolean {
    return !!store && deferredUploads.has(store);
}
