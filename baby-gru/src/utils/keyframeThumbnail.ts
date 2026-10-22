/**
 * A small picture of what a keyframe looks like.
 *
 * A keyframe used to describe itself in numbers - "zoom 0.617 · centre 127.0, 51.5, -3.7" - which
 * is the renderer's internal state rather than anything a person authoring a movie can use. Nobody
 * recognises a shot by its zoom factor. A picture is what the keyframe *is*.
 *
 * WHY THE CANVAS RATHER THAN getPixelData
 *
 * takeScreenShot renders into the off-screen framebuffer at rttFramebufferSize and reads it back,
 * which gives a large, correct, composited image - the axes and scale bar included - and costs a
 * full render at screenshot resolution. For a thumbnail that is the wrong trade twice over: it is
 * slow enough to notice on a big structure, and the 2D chrome is not wanted in a 320-pixel
 * picture anyway.
 *
 * Copying the canvas is a scale-and-encode of pixels that have just been drawn. The catch is that
 * a WebGL drawing buffer is cleared once the browser composites it, so the copy has to happen in
 * the same task as the draw - hence `drawThenCapture`, which puts the two together and makes that
 * impossible to get wrong by separating them.
 */

/** How wide a stored thumbnail is. Height follows the canvas, so the shape is the shot's own. */
export const THUMBNAIL_WIDTH = 320;

/**
 * JPEG, and fairly hard.
 *
 * These are saved inside the movie file, one per keyframe, so a twenty-keyframe movie carries
 * twenty of them. At this quality each is a few kilobytes against a session measured in megabytes.
 * PNG would be several times larger for a photographic image of a rendered scene, and the
 * artefacts are invisible at this size.
 */
export const THUMBNAIL_QUALITY = 0.6;

/** What a thumbnail is: a data URL, ready to put in an `img` src. */
export type Thumbnail = string;

/**
 * The size to draw into, preserving the shape of what was rendered.
 *
 * Separated from the drawing so the arithmetic can be checked without a canvas - and it has two
 * corners worth checking, a canvas that has not been sized yet and one taller than it is wide.
 */
export function thumbnailSize(
    canvasWidth: number, canvasHeight: number, width: number = THUMBNAIL_WIDTH,
): { width: number; height: number } | null {
    if (!(canvasWidth > 0) || !(canvasHeight > 0)) return null;

    // Never upscale: a canvas smaller than the thumbnail is already its own best picture, and
    // blowing it up would only make a blurry one that costs more to store.
    const scaled = Math.min(width, canvasWidth);
    return {
        width: Math.round(scaled),
        // At least one pixel. A wildly letterboxed canvas can round its height to zero, and
        // drawImage into a zero-height canvas throws rather than producing an empty picture.
        height: Math.max(1, Math.round(scaled * canvasHeight / canvasWidth)),
    };
}

/** Only what this needs of a renderer, so the caller's type does not leak in here. */
export interface ThumbnailSource {
    drawScene: () => void;
    getCanvasRef: () => { current: HTMLCanvasElement | null } | null | undefined;
}

/**
 * Draw the scene and take a picture of it, in that order and in one go.
 *
 * The two steps are one function because splitting them is a bug: between a draw and a copy the
 * browser may composite the frame, after which the drawing buffer is blank and the thumbnail
 * comes out empty. Nothing about the resulting picture would say why.
 *
 * Returns undefined rather than throwing when there is nothing to photograph. A keyframe without
 * a thumbnail is perfectly usable - it is a camera position, and the picture is a convenience -
 * so a failure here should cost the caller a picture, not an operation.
 */
export function drawThenCapture(
    source: ThumbnailSource, width: number = THUMBNAIL_WIDTH,
): Thumbnail | undefined {
    const canvas = source.getCanvasRef?.()?.current;
    if (!canvas) return undefined;

    const size = thumbnailSize(canvas.width, canvas.height, width);
    if (!size) return undefined;

    try {
        source.drawScene();

        const target = document.createElement("canvas");
        target.width = size.width;
        target.height = size.height;
        const context = target.getContext("2d");
        if (!context) return undefined;

        context.drawImage(canvas, 0, 0, size.width, size.height);
        return target.toDataURL("image/jpeg", THUMBNAIL_QUALITY);
    } catch {
        // A tainted canvas, a lost context, a browser that declines the encode. None of them are
        // worth failing an "add keyframe" over.
        return undefined;
    }
}
