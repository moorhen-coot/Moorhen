/**
 * The camera's slab echoed into the store, and the store's slab written back to the camera
 * (slab.ts: storeSlabFromCamera, slabDifference, isEchoOf; MGWebGL.echoSlabToStore and
 * MoorhenWebMG's slab effects).
 *
 * The pair used to chase each other: while the camera eased its zoom with auto clip / fog on, the
 * store's copy was always a step behind, the effects wrote it back to the camera as a manual slab,
 * the camera re-derived and echoed again inside the same dispatch, and React stopped it at its
 * update limit (a scene switch just after taking a snapshot). The effects now leave the camera
 * alone when the store holds the camera's own echo; tests/e2e/session-scenes.spec.ts ("save and
 * reload") is the case in a browser.
 */
import { describe, expect, it } from "@jest/globals";
import { isEchoOf, slabDifference, slabFromCamera, storeSlabFromCamera } from "../../src/WebGLgComponents/slab";

const camera = { eyeDistance: 250, clipFront: 2.13, clipBack: 5.59, fogFront: 2.13, fogBack: 5.59 };

describe("the camera's slab, as the store keeps it", () => {
    it("is clip as offsets and fog as distances from the eye", () => {
        const slab = slabFromCamera(camera);
        expect(storeSlabFromCamera(camera)).toEqual({ clipStart: 2.13, clipEnd: 5.59, fogStart: slab.fogStart, fogEnd: slab.fogEnd });
        expect(storeSlabFromCamera(camera).fogStart).toBeCloseTo(247.87, 10);
    });

    it("is told to the store only where the store differs, all of it at once", () => {
        const echoed = storeSlabFromCamera(camera);
        expect(slabDifference(echoed, echoed)).toEqual({});
        // A last-bit difference from converting fog back and forth is not a change
        expect(slabDifference(echoed, { ...echoed, fogStart: echoed.fogStart + 1e-12 })).toEqual({});
        // A scene switch changes all four: one update with all four
        expect(slabDifference(echoed, { clipStart: 4, clipEnd: 10.5, fogStart: 246, fogEnd: 260.5 })).toEqual(echoed);
        expect(slabDifference(echoed, { ...echoed, clipEnd: 10.5 })).toEqual({ clipEnd: 5.59 });
    });
});

describe("the store's slab, written back to the camera", () => {
    const echoed = storeSlabFromCamera(camera);

    it("is not written when it is the camera's own echo", () => {
        expect(isEchoOf({ clipStart: echoed.clipStart, clipEnd: echoed.clipEnd }, echoed)).toBe(true);
        expect(isEchoOf({ fogStart: echoed.fogStart, fogEnd: echoed.fogEnd }, echoed)).toBe(true);
    });

    it("is written when it is a request: anything else, or before the camera has echoed", () => {
        // A scene's slab, the sliders, a session, a script
        expect(isEchoOf({ clipStart: 4, clipEnd: 10.5 }, echoed)).toBe(false);
        expect(isEchoOf({ clipStart: echoed.clipStart, clipEnd: 10.5 }, echoed)).toBe(false);
        expect(isEchoOf({ fogStart: 246, fogEnd: echoed.fogEnd }, echoed)).toBe(false);
        expect(isEchoOf({ clipStart: echoed.clipStart, clipEnd: echoed.clipEnd }, null)).toBe(false);
    });

    it("eased with auto clip: each echo a step behind the camera is left alone, so the pair settles", () => {
        // The camera's slab follows its zoom (auto clip / fog, 8 and 21 per unit of zoom) while it eases
        const atZoom = (zoom: number) => ({ eyeDistance: 250, clipFront: 8 * zoom, clipBack: 21 * zoom, fogFront: 8 * zoom, fogBack: 21 * zoom });
        let store = { clipStart: 4, clipEnd: 10.5, fogStart: 246, fogEnd: 260.5 };
        let lastEchoed = null;
        let writesBack = 0;
        for (let step = 0; step < 100; step++) {
            const now = atZoom(0.266 + step * 0.001);
            // The camera echoes...
            lastEchoed = storeSlabFromCamera(now);
            store = { ...store, ...slabDifference(lastEchoed, store) };
            // ...the camera has moved on by the time the effects run; they write back only a request
            const moved = atZoom(0.266 + (step + 1) * 0.001);
            const cameraClip = storeSlabFromCamera(moved);
            const agrees = Math.abs(cameraClip.clipStart - store.clipStart) < 1e-9 && Math.abs(cameraClip.clipEnd - store.clipEnd) < 1e-9;
            if (!agrees && !isEchoOf({ clipStart: store.clipStart, clipEnd: store.clipEnd }, lastEchoed)) writesBack++;
        }
        expect(writesBack).toBe(0);
    });
});
