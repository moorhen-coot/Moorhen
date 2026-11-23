/**
 * The occlusion kernel actually reaches as far as the radius slider claims.
 *
 * The slider is labelled in angstroms, which is only true if the sample lengths are a sensible
 * fraction of it. They were not: each sample was shrunk twice, once by a stratified term and again
 * by a stray Math.random(), so the median sample sat at 0.12 of the radius and 43% of the kernel
 * fell within 0.1 of it. At the 2.0 angstrom default the typical probe reached a quarter of an
 * angstrom - shorter than a bond - and ambient occlusion on a large molecule did visibly nothing.
 *
 * None of that is visible in a screenshot: the picture just looks a bit flat, which reads as the
 * effect being weak rather than the units being wrong. Hence a test on the distribution itself.
 */
import { describe, expect, it } from "@jest/globals";
import { ssaoSampleLength } from "../../src/WebGLgComponents/mgWebGLParts/postProcessUniformBuffers";

const KERNEL_SIZE = 32;

/** Every sample length, shortest first. */
const lengths = (): number[] =>
    Array.from({ length: KERNEL_SIZE }, (_, i) => ssaoSampleLength(i, KERNEL_SIZE)).sort((a, b) => a - b);

const median = (xs: number[]): number => xs[xs.length >> 1];
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("SSAO sample kernel", () => {
    it("keeps every sample inside the radius", () => {
        for (const len of lengths()) {
            expect(len).toBeGreaterThan(0);
            expect(len).toBeLessThanOrEqual(1.0);
        }
    });

    it("reaches close to the full radius at its far end, so the radius is attainable", () => {
        // The old kernel's longest sample was a random fraction of 0.94, so the radius was never
        // actually probed.
        expect(Math.max(...lengths())).toBeGreaterThan(0.9);
    });

    it("puts the typical sample near the middle of the radius, not at a tenth of it", () => {
        const ls = lengths();
        expect(median(ls)).toBeGreaterThan(0.35);
        expect(mean(ls)).toBeGreaterThan(0.35);

        // And not so far out that close contact stops being sampled at all.
        expect(median(ls)).toBeLessThan(0.7);
    });

    it("wastes no samples on distances below the depth buffer's useful precision", () => {
        // At a 2 angstrom radius, 0.1 of it is 0.2 angstroms: below any feature a surface has.
        expect(lengths().filter(len => len < 0.1)).toHaveLength(0);
    });

    it("is monotonic in i, so the kernel is stratified rather than clustered", () => {
        for (let i = 1; i < KERNEL_SIZE; i++) {
            expect(ssaoSampleLength(i, KERNEL_SIZE)).toBeGreaterThan(ssaoSampleLength(i - 1, KERNEL_SIZE));
        }
    });

    it("is deterministic, so the kernel is the same every time it is built", () => {
        for (let i = 0; i < KERNEL_SIZE; i++) {
            expect(ssaoSampleLength(i, KERNEL_SIZE)).toBe(ssaoSampleLength(i, KERNEL_SIZE));
        }
    });

    it("scales with the kernel size rather than assuming 32", () => {
        for (const size of [8, 16, 64]) {
            const ls = Array.from({ length: size }, (_, i) => ssaoSampleLength(i, size));
            expect(Math.min(...ls)).toBeGreaterThan(0.1);
            expect(Math.max(...ls)).toBeLessThanOrEqual(1.0);
        }
    });
});
