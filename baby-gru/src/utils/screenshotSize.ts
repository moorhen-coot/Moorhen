/**
 * The size of a screenshot of a canvas `canvasWidth` x `canvasHeight`: the band of the canvas's
 * shape that takeScreenShot crops from WebGL's square render-to-texture buffer, `side` on a side
 * (4096 where the hardware allows, initTextureFramebuffer). The long side is the whole square; the
 * short one follows the canvas, rounded down. A WebGPU screenshot is rendered at this size
 * directly, so a picture comes out the same size whichever renderer drew it.
 */
export function screenshotSize(canvasWidth: number, canvasHeight: number, side: number): { width: number; height: number } {
    const ratio = canvasWidth / canvasHeight;
    if (canvasWidth > canvasHeight) return { width: side, height: Math.floor(side / ratio) };
    return { width: Math.floor(side * ratio), height: side };
}

/** WebGL's render-to-texture square, where the hardware allows it. */
export const SCREENSHOT_SIDE = 4096;
