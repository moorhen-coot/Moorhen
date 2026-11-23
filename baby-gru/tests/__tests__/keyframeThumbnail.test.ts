/**
 * Sizing a keyframe's thumbnail.
 *
 * The drawing itself needs a canvas and a GL context, so what is checked here is the arithmetic
 * around it - which is where the answers that break things live: a zero-sized canvas, a shape that
 * rounds to nothing, and the temptation to upscale.
 */
import { describe, expect, it } from "@jest/globals";
import { THUMBNAIL_WIDTH, thumbnailSize } from "../../src/utils/keyframeThumbnail";

describe("fitting a thumbnail to the canvas", () => {
    it("keeps the shape of what was rendered", () => {
        // A thumbnail that does not match the shot is worse than none: it shows a composition
        // nobody chose.
        expect(thumbnailSize(1600, 900)).toEqual({ width: 320, height: 180 });
        expect(thumbnailSize(900, 1600)).toEqual({ width: 320, height: 569 });
    });

    it("does not upscale a canvas smaller than the thumbnail", () => {
        // Blowing it up produces a blurry picture that costs more to store than the sharp one.
        expect(thumbnailSize(200, 100)).toEqual({ width: 200, height: 100 });
    });

    it("never rounds a dimension down to zero", () => {
        // drawImage into a zero-height canvas throws rather than producing an empty picture, and
        // a wildly letterboxed canvas can round to nothing.
        expect(thumbnailSize(4000, 3)?.height).toBe(1);
    });

    it("declines a canvas that has no size yet", () => {
        // Before layout settles, or in a torn-down component. Returning null lets the caller skip
        // the picture rather than produce a broken one.
        expect(thumbnailSize(0, 0)).toBeNull();
        expect(thumbnailSize(320, 0)).toBeNull();
        expect(thumbnailSize(NaN, NaN)).toBeNull();
    });

    it("takes a width when one is given, and defaults otherwise", () => {
        expect(thumbnailSize(1600, 900, 64)).toEqual({ width: 64, height: 36 });
        expect(thumbnailSize(1600, 900).width).toBe(THUMBNAIL_WIDTH);
    });
});
