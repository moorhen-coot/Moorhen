/**
 * How many bits a second of video gets.
 *
 * One table now serves both ways of making a video, so what matters here is that the rate tracks
 * the frame rather than sitting still - which is the bug this replaced - and that both ends are
 * clamped, since a preview window and a 4K render are three orders of magnitude apart in pixels.
 */
import { describe, expect, it } from "@jest/globals";
import {
    BITS_PER_PIXEL_PER_FRAME, DEFAULT_QUALITY, MAX_BITRATE, MIN_BITRATE, bitrateFor,
} from "../../src/utils/videoBitrate";

/** What a rate works out as per pixel per frame, which is the number the presets are written in. */
const perPixel = (bitrate: number, width: number, height: number, fps: number) =>
    bitrate / (width * height * fps);

describe("choosing a bitrate", () => {
    it("spends what the preset asks, at a size where nothing is clamped", () => {
        expect(perPixel(bitrateFor("medium", 1920, 1080, 30), 1920, 1080, 30)).toBeCloseTo(0.4, 6);
        expect(perPixel(bitrateFor("low", 1920, 1080, 30), 1920, 1080, 30)).toBeCloseTo(0.15, 6);
    });

    it("grows with the frame, which is the whole point", () => {
        // The bug: a flat 12 Mbps whatever the output size. At 1080p that is 0.19 bits per pixel
        // per frame - about half of medium - and at 4K it is 0.048, a third of what low spends.
        const hd = bitrateFor("medium", 1920, 1080, 30);
        const uhd = bitrateFor("medium", 3840, 2160, 30);

        expect(uhd).toBeGreaterThan(hd);
        expect(perPixel(hd, 1920, 1080, 30)).toBeCloseTo(perPixel(uhd, 3840, 2160, 30), 6);
        expect(hd).toBeGreaterThan(12_000_000);
    });

    it("grows with the frame rate too", () => {
        expect(bitrateFor("medium", 1920, 1080, 60)).toBe(2 * bitrateFor("medium", 1920, 1080, 30));
    });

    it("orders the presets", () => {
        const at = (quality: keyof typeof BITS_PER_PIXEL_PER_FRAME) =>
            bitrateFor(quality, 1280, 720, 30);
        expect(at("low")).toBeLessThan(at("medium"));
        expect(at("medium")).toBeLessThan(at("high"));
    });

    it("keeps a small window watchable", () => {
        // A 320x240 preview at low would come to 345 kbps, which looks like wet paper.
        expect(bitrateFor("low", 320, 240, 30)).toBe(MIN_BITRATE);
    });

    it("keeps a 4K high from producing a file nobody can send", () => {
        // ~250 Mbps uncapped.
        expect(bitrateFor("high", 3840, 2160, 30)).toBe(MAX_BITRATE);
    });

    it("never returns zero for a frame that has no size yet", () => {
        // A canvas before layout, or a torn-down one. Some encoders reject a bitrate of 0 outright,
        // so this has to be a number they will accept rather than an honest nothing.
        expect(bitrateFor("medium", 0, 0, 30)).toBe(MIN_BITRATE);
        expect(bitrateFor("medium", 1920, 1080, 0)).toBe(MIN_BITRATE);
    });

    it("falls back to the default preset when handed something that is not one", () => {
        // Straight out of a .mhm written by hand, or by a later version.
        const odd = bitrateFor("ultra" as never, 1920, 1080, 30);
        expect(odd).toBe(bitrateFor(DEFAULT_QUALITY, 1920, 1080, 30));
    });

    it("returns whole numbers, because an encoder is given an integer", () => {
        expect(Number.isInteger(bitrateFor("medium", 1917, 1077, 29))).toBe(true);
    });
});
