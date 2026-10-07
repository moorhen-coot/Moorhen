/**
 * The side-on clip/fog handles stay reachable and stay movable.
 *
 * Both faults this covers were reported as "they work for a while then just stop": handles that
 * could not be picked up, and handles that could be picked up but would not move. Both came from
 * using the clamped drawing position as logic, so the cases below are written in terms of the
 * states that used to trigger them - fog switched off, clip set to 1000 by the colour-by-map
 * modal, a scene span that moved when a map loaded.
 */
import { describe, expect, it } from "@jest/globals";
import {
    GRAB_TOLERANCE_PX,
    Handle,
    HandleId,
    constrainOffset,
    handleAtPixel,
    offsetOfPixel,
    pixelOfHandle,
    pixelOfOffset,
    plotHalfRange,
} from "../../src/utils/sceneSliderGeometry";

const WIDTH = 500;

const handle = (id: HandleId, offset: number, visible = true): Handle => ({ id, offset, visible });

/** The four clip and fog handles, from their stored values. */
const handlesFrom = (
    clipStart: number, clipEnd: number, fogStart: number, fogEnd: number,
    useClip = true, useFog = true,
): Handle[] => [
    handle("clipStart", -clipStart, useClip),
    handle("clipEnd", clipEnd, useClip),
    handle("fogStart", -fogStart, useFog),
    handle("fogEnd", fogEnd, useFog),
];

describe("plot range", () => {
    it("covers the scene when the handles sit inside it", () => {
        const range = plotHalfRange(30, handlesFrom(10, 10, 5, 20));
        expect(range).toBeGreaterThanOrEqual(30);
    });

    it("grows to contain a handle the scene span cannot show", () => {
        // The colour-by-map modal sets clip to 1000 regardless of what is loaded.
        const range = plotHalfRange(30, handlesFrom(1000, 1000, 0, 100));
        expect(range).toBeGreaterThanOrEqual(1000);
    });

    it("every visible handle lands inside the plot, which is the whole point", () => {
        const handles = handlesFrom(1000, 1000, -748, 749);
        const range = plotHalfRange(30, handles);
        for (const h of handles) {
            const pixel = pixelOfHandle(h, range, WIDTH);
            expect(pixel).toBeGreaterThan(0);
            expect(pixel).toBeLessThan(WIDTH);
        }
    });

    it("ignores handles that are switched off, so turning fog off does not crush the scale", () => {
        // Switching fog off writes 998/999, which as offsets are hundreds of angstroms out.
        const withFogOff = plotHalfRange(30, handlesFrom(10, 10, -748, 749, true, false));
        expect(withFogOff).toBeLessThan(100);
    });

    it("never returns zero, so an empty scene still divides safely", () => {
        expect(plotHalfRange(0, [])).toBeGreaterThan(0);
    });
});

describe("the pixel mapping", () => {
    it("puts the view centre in the middle", () => {
        expect(pixelOfOffset(0, 50, WIDTH)).toBeCloseTo(WIDTH / 2);
    });

    it("round-trips", () => {
        for (const offset of [-50, -12.5, 0, 7, 49.9]) {
            expect(offsetOfPixel(pixelOfOffset(offset, 50, WIDTH), 50, WIDTH)).toBeCloseTo(offset);
        }
    });

    it("puts nearer-the-viewer on the left", () => {
        expect(pixelOfOffset(-10, 50, WIDTH)).toBeLessThan(pixelOfOffset(10, 50, WIDTH));
    });
});

describe("picking a handle up", () => {
    it("finds a handle under the pointer", () => {
        const handles = handlesFrom(20, 20, 10, 30);
        const range = plotHalfRange(40, handles);
        const target = pixelOfHandle(handles[0], range, WIDTH);
        expect(handleAtPixel(target, handles, range, WIDTH)).toBe("clipStart");
    });

    it("returns nothing when the pointer is nowhere near one", () => {
        const handles = handlesFrom(20, 20, 10, 30);
        const range = plotHalfRange(40, handles);
        expect(handleAtPixel(WIDTH / 2, handles, range, WIDTH)).toBeNull();
    });

    it("takes the nearest handle, not the first in the list", () => {
        // clipStart is listed first but fogStart is the one under the pointer.
        const handles = handlesFrom(20, 30, 10, 30);
        const range = plotHalfRange(40, handles);
        const target = pixelOfHandle(handles[2], range, WIDTH);
        expect(handleAtPixel(target, handles, range, WIDTH)).toBe("fogStart");
    });

    it("will not pick up a handle that is switched off", () => {
        const handles = handlesFrom(20, 20, 10, 30, true, false);
        const range = plotHalfRange(40, handles);
        const fogPixel = pixelOfHandle(handles[2], range, WIDTH);
        expect(handleAtPixel(fogPixel, handles, range, WIDTH)).not.toBe("fogStart");
    });

    it("keeps the back fog handle reachable when clip is set far out", () => {
        // The reported lock-up. With the old clamp both of these pinned to the same edge pixel and
        // the first in the list won every click, so back fog could never be grabbed again.
        const handles = handlesFrom(1000, 1000, 0, 100);
        const range = plotHalfRange(30, handles);

        const clipEndPixel = pixelOfHandle(handles[1], range, WIDTH);
        const fogEndPixel = pixelOfHandle(handles[3], range, WIDTH);

        expect(Math.abs(clipEndPixel - fogEndPixel)).toBeGreaterThan(GRAB_TOLERANCE_PX);
        expect(handleAtPixel(fogEndPixel, handles, range, WIDTH)).toBe("fogEnd");
        expect(handleAtPixel(clipEndPixel, handles, range, WIDTH)).toBe("clipEnd");
    });

    it("keeps all four distinguishable across spans that used to push them off the plot", () => {
        for (const span of [5, 30, 200, 5000]) {
            const handles = handlesFrom(50, 60, 20, 80);
            const range = plotHalfRange(span, handles);
            for (const h of handles) {
                const pixel = pixelOfHandle(h, range, WIDTH);
                expect(handleAtPixel(pixel, handles, range, WIDTH)).toBe(h.id);
            }
        }
    });
});

describe("constraining a drag", () => {
    it("lets a handle move when it is nowhere near its partner", () => {
        expect(constrainOffset("clipStart", -30, 40, 50, WIDTH)).toBeCloseTo(-30);
        expect(constrainOffset("clipEnd", 30, -40, 50, WIDTH)).toBeCloseTo(30);
    });

    it("stops a near handle crossing its partner", () => {
        const limited = constrainOffset("clipStart", 60, 40, 50, WIDTH);
        expect(limited).toBeLessThan(40);
    });

    it("stops a far handle crossing its partner", () => {
        const limited = constrainOffset("fogEnd", -60, -40, 50, WIDTH);
        expect(limited).toBeGreaterThan(-40);
    });

    it("always yields a movable result, however the partner is placed", () => {
        // The freeze: the old guard was a test on the pointer, so a partner whose pixel could not
        // be reached made the condition unsatisfiable and the handle stopped responding entirely.
        for (const partner of [-10000, -100, 0, 100, 10000]) {
            for (const id of ["clipStart", "clipEnd", "fogStart", "fogEnd"] as HandleId[]) {
                const result = constrainOffset(id, 0, partner, 50, WIDTH);
                expect(Number.isFinite(result)).toBe(true);
            }
        }
    });

    it("leaves a gap wide enough that both handles stay separately grabbable", () => {
        const range = 50;
        const partnerOffset = 10;
        const squashed = constrainOffset("clipStart", 1000, partnerOffset, range, WIDTH);

        const gapPx = Math.abs(pixelOfOffset(squashed, range, WIDTH) - pixelOfOffset(partnerOffset, range, WIDTH));
        expect(gapPx).toBeGreaterThan(GRAB_TOLERANCE_PX);
    });
});

