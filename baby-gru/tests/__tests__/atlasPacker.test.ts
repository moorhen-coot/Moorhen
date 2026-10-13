/**
 * The glyph atlas packer: where strings land, when it is full, and what changed.
 *
 * The layout arithmetic is copied from the inline version in TextCanvasTexture, because existing
 * labels must keep landing exactly where they did - a different packing order gives different
 * texture coordinates, and every label would show its neighbour's glyphs. So the first few tests
 * pin the old behaviour rather than describe an ideal.
 *
 * What is new is the full check. The inline version let the cursor run past the right edge, the
 * normalised coordinates exceeded 1.0, and CLAMP_TO_EDGE smeared the last column across whatever
 * asked for them. It was unreachable only because the atlas was wiped whenever anything changed.
 */
import { describe, expect, it } from "@jest/globals";
import { AtlasPacker } from "../../src/WebGLgComponents/atlasPacker";

const WIDTH = 1024;
const HEIGHT = 2048;

/** A typical label: about 120 px of text, 20 px tall. */
const label = (packer: AtlasPacker, w = 120, h = 20, topInset = 1) =>
    packer.place(w, h, w, topInset);

describe("placing items", () => {
    it("puts the first item at the origin", () => {
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        const placed = label(packer);
        expect(placed).not.toBeNull();
        expect(placed.x).toBe(0);
        expect(placed.baseline).toBe(20);
    });

    it("returns the baseline after the advance, which is what the callers draw from", () => {
        // Text draws at baseline - descent, an image at baseline - height. Both need the advanced
        // value, so returning the pre-advance baseline would move every label.
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        expect(label(packer, 100, 30).baseline).toBe(30);
        expect(label(packer, 100, 25).baseline).toBe(55);
    });

    it("stacks downwards in one column", () => {
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        const first = label(packer);
        const second = label(packer);
        expect(second.x).toBe(first.x);
        expect(second.baseline).toBeGreaterThan(first.baseline);
    });

    it("insets the top by one pixel for text and not for images", () => {
        // Preserved from the original: the text path used (baseline + 1) / height and the image
        // path baseline / height.
        const forText = new AtlasPacker(WIDTH, HEIGHT).place(120, 20, 120, 1);
        const forImage = new AtlasPacker(WIDTH, HEIGHT).place(120, 20, 120, 0);
        expect(forText.texCoords[1]).toBeCloseTo(1 / HEIGHT, 10);
        expect(forImage.texCoords[1]).toBe(0);
    });

    it("starts a new column when the next item will not fit below", () => {
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        let last = label(packer, 120, 500);
        for (let i = 0; i < 3; i++) last = label(packer, 120, 500);
        const wrapped = label(packer, 120, 500);
        expect(wrapped.x).toBeGreaterThan(0);
        expect(wrapped.baseline).toBe(500);
    });

    it("places the new column past the widest item in the old one", () => {
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        packer.place(100, 1000, 100);
        packer.place(300, 1000, 300);
        const wrapped = packer.place(100, 1000, 100);
        expect(wrapped.x).toBe(300);
    });
});

describe("texture coordinates", () => {
    it("never leaves the unit square, however many items are placed", () => {
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        for (let i = 0; i < 2000; i++) {
            const placed = packer.place(60 + (i % 40), 18 + (i % 7), 60 + (i % 40), 1);
            if (placed === null) break;
            for (const c of placed.texCoords) {
                expect(c).toBeGreaterThanOrEqual(0);
                expect(c).toBeLessThanOrEqual(1);
            }
        }
    });

    it("keeps an overhanging glyph inside the atlas", () => {
        // boundingBoxRight can exceed the advance width - an italic tail. Deciding the fit on the
        // advance alone would let x2 pass 1.0.
        const packer = new AtlasPacker(200, 200);
        const placed = packer.place(190, 20, 199, 1);
        expect(placed).not.toBeNull();
        expect(placed.texCoords[2]).toBeLessThanOrEqual(1);
        // And a tail that genuinely does not fit is refused rather than wrapped.
        expect(packer.place(190, 20, 260, 1)).toBeNull();
    });
});

describe("running out of room", () => {
    it("reports full instead of running past the right edge", () => {
        const packer = new AtlasPacker(400, 100);
        let placements = 0;
        while (packer.place(150, 100, 150) !== null) {
            placements++;
            expect(placements).toBeLessThan(100);
        }
        // Two columns of 150 fit in 400; a third would reach 450.
        expect(placements).toBe(2);
    });

    it("refuses an item larger than the atlas rather than returning something undrawable", () => {
        const packer = new AtlasPacker(100, 100);
        expect(packer.place(200, 20, 200)).toBeNull();
        expect(packer.place(20, 200, 20)).toBeNull();
    });

    it("refuses an empty item", () => {
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        expect(packer.place(0, 20, 0)).toBeNull();
        expect(packer.place(120, 0, 120)).toBeNull();
    });

    it("is usable again after a reset, which is what compaction will do", () => {
        const packer = new AtlasPacker(400, 100);
        while (packer.place(150, 100, 150) !== null) { /* fill it */ }
        packer.reset();
        const placed = packer.place(150, 100, 150);
        expect(placed).not.toBeNull();
        expect(placed.x).toBe(0);
    });
});

describe("the dirty region", () => {
    it("is empty before anything is placed", () => {
        expect(new AtlasPacker(WIDTH, HEIGHT).dirtyRegion).toBeNull();
    });

    it("covers a single placement", () => {
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        packer.place(120, 20, 120, 1);
        expect(packer.dirtyRegion).toEqual({ x: 0, y: 0, w: 120, h: 20 });
    });

    it("grows to contain every placement since the last upload", () => {
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        packer.place(120, 20, 120, 1);
        packer.place(200, 30, 200, 1);
        expect(packer.dirtyRegion).toEqual({ x: 0, y: 0, w: 200, h: 50 });
    });

    it("spans columns when a placement wraps", () => {
        const packer = new AtlasPacker(400, 100);
        packer.place(150, 100, 150);
        packer.place(150, 100, 150);
        const region = packer.dirtyRegion;
        expect(region.x).toBe(0);
        expect(region.w).toBe(300);
    });

    it("is forgotten once uploaded, so an unchanged frame uploads nothing", () => {
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        packer.place(120, 20, 120, 1);
        packer.clearDirty();
        expect(packer.dirtyRegion).toBeNull();
    });

    it("reappears when something new is placed after an upload", () => {
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        packer.place(120, 20, 120, 1);
        packer.clearDirty();
        packer.place(80, 16, 80, 1);
        expect(packer.dirtyRegion).toEqual({ x: 0, y: 20, w: 80, h: 16 });
    });

    it("stays inside the atlas", () => {
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        for (let i = 0; i < 500; i++) if (packer.place(90, 24, 90, 1) === null) break;
        const region = packer.dirtyRegion;
        expect(region.x).toBeGreaterThanOrEqual(0);
        expect(region.y).toBeGreaterThanOrEqual(0);
        expect(region.x + region.w).toBeLessThanOrEqual(WIDTH);
        expect(region.y + region.h).toBeLessThanOrEqual(HEIGHT);
    });
});

describe("how much this saves", () => {
    it("uploads a fraction of the atlas for one new label", () => {
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        for (let i = 0; i < 40; i++) packer.place(120, 20, 120, 1);
        packer.clearDirty();

        packer.place(140, 20, 140, 1);
        const region = packer.dirtyRegion;
        const fraction = (region.w * region.h) / (WIDTH * HEIGHT);
        expect(fraction).toBeLessThan(0.002);
    });
});

describe("agreement with the inline version it replaces", () => {

    /**
     * The arithmetic exactly as it was written inside addTextToBigTexture, transcribed.
     *
     * The extraction is only safe if it lays items out identically: the texture coordinates are
     * cached against strings and baked into draw calls, so a packing that differs by a pixel means
     * every label renders a slice of its neighbour. This is the test that says the move was a move.
     */
    const inlinePacker = (width: number, height: number) => {
        let baseLine = 0;
        let currentWidth = 0;
        let maxColumnWidth = 0;
        return (advance: number, boxHeight: number, boundingBoxRight: number, topInset: number) => {
            if (baseLine + boxHeight > height) {
                baseLine = 0;
                currentWidth += maxColumnWidth;
                maxColumnWidth = 0;
            }
            const x1 = currentWidth / width;
            const y1 = (baseLine + topInset) / height;
            baseLine += boxHeight;
            const x2 = x1 + boundingBoxRight / width;
            const y2 = baseLine / height;
            if (advance > maxColumnWidth) maxColumnWidth = advance;
            return { x: currentWidth, baseline: baseLine, texCoords: [x1, y1, x2, y2] };
        };
    };

    it("matches item for item until the atlas is full", () => {
        const packer = new AtlasPacker(WIDTH, HEIGHT);
        const inline = inlinePacker(WIDTH, HEIGHT);

        let compared = 0;
        const columns: number[] = [];
        for (let i = 0; i < 4000; i++) {
            // Varied but deterministic: widths and heights that exercise wrapping.
            const advance = 40 + ((i * 37) % 260);
            const boxHeight = 12 + ((i * 11) % 40);
            const placed = packer.place(advance, boxHeight, advance, 1);
            if (placed === null) break;

            const expected = inline(advance, boxHeight, advance, 1);
            expect(placed.x).toBe(expected.x);
            expect(placed.baseline).toBe(expected.baseline);
            expect(placed.texCoords).toEqual(expected.texCoords);
            columns.push(placed.x);
            compared++;
        }

        // A meaningful run rather than two items and a shrug. The atlas fills after 193 of these,
        // having wrapped columns several times on the way.
        expect(compared).toBeGreaterThan(150);
        expect(new Set(columns).size).toBe(3);
    });

    it("matches the image path too, which insets the top differently", () => {
        const packer = new AtlasPacker(768, 2048);
        const inline = inlinePacker(768, 2048);
        for (let i = 0; i < 300; i++) {
            const advance = 30 + ((i * 53) % 180);
            const boxHeight = 20 + ((i * 7) % 60);
            const placed = packer.place(advance, boxHeight, advance, 0);
            if (placed === null) break;
            expect(placed.texCoords).toEqual(inline(advance, boxHeight, advance, 0).texCoords);
        }
    });

    it("diverges only by refusing what the inline version drew out of bounds", () => {
        // The one intended behavioural difference. Fill a small atlas and check the inline version
        // would have gone past the right edge at the point the packer says full.
        const packer = new AtlasPacker(300, 100);
        const inline = inlinePacker(300, 100);
        let placements = 0;
        while (packer.place(120, 100, 120) !== null) { inline(120, 100, 120, 0); placements++; }

        // x1 is still on the atlas at 0.8; it is x2, the right edge of the ink, that reaches 1.2.
        // That is the coordinate CLAMP_TO_EDGE turns into a smear of the atlas's last column.
        const overflowed = inline(120, 100, 120, 0);
        expect(overflowed.texCoords[0]).toBeLessThan(1);
        expect(overflowed.texCoords[2]).toBeGreaterThan(1);
        expect(placements).toBe(2);
    });
});
