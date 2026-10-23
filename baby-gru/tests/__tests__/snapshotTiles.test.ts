/**
 * The tile maths for WebGPU snapshots bigger than one tile (src/WebGPUComponents/snapshotTiles.ts):
 * tiles cover the image exactly once, and a tile's narrowed projection puts every point at the
 * same pixel as the whole image's projection does, less the tile's corner.
 */
import { describe, expect, it } from "@jest/globals";
import * as mat4 from "gl-matrix/mat4";
import { narrowToTile, planTiles } from "../../src/WebGPUComponents/snapshotTiles";

/** Where a point lands, in pixels from the top-left, under `projection` for a w x h image. */
function pixelOf(projection: ArrayLike<number>, point: number[], w: number, h: number): [number, number] {
    const clip = [0, 1, 2, 3].map(row =>
        projection[row] * point[0] + projection[4 + row] * point[1] + projection[8 + row] * point[2] + projection[12 + row]);
    return [(clip[0] / clip[3] + 1) / 2 * w, (1 - clip[1] / clip[3]) / 2 * h];
}

describe("planTiles", () => {
    it("covers the image exactly once, top row first", () => {
        const tiles = planTiles(300, 200, 64);
        expect(tiles.length).toBe(5 * 4);
        expect(tiles[0]).toEqual({ x: 0, y: 0, width: 64, height: 64 });
        expect(tiles[4]).toEqual({ x: 256, y: 0, width: 44, height: 64 });
        expect(tiles[19]).toEqual({ x: 256, y: 192, width: 44, height: 8 });
        const covered = new Uint8Array(300 * 200);
        for (const t of tiles) for (let y = t.y; y < t.y + t.height; y++) for (let x = t.x; x < t.x + t.width; x++) covered[y * 300 + x]++;
        expect(covered.every(c => c === 1)).toBe(true);
    });

    it("is one tile when the image fits", () => {
        expect(planTiles(2048, 1024, 2048)).toEqual([{ x: 0, y: 0, width: 2048, height: 1024 }]);
    });

    it("refuses nonsense", () => {
        expect(() => planTiles(0, 10, 64)).toThrow();
        expect(() => planTiles(10, 10, 0)).toThrow();
    });
});

describe("narrowToTile", () => {
    const W = 3000, H = 2000;
    const points = [[0, 0, -50], [7, -3, -40], [-12, 9, -60], [20, 15, -45]];
    const cases: [string, mat4.mat4][] = [
        ["orthographic", mat4.ortho(mat4.create(), -36, 36, -24, 24, 1, 100)],
        ["perspective", mat4.perspective(mat4.create(), Math.PI / 4, W / H, 1, 100)],
    ];
    for (const [name, projection] of cases) {
        it(`keeps every point on the same pixel (${name})`, () => {
            for (const tile of planTiles(W, H, 700)) {
                const narrowed: number[] = Array.from(projection as ArrayLike<number>);
                narrowToTile(narrowed, tile, W, H);
                for (const point of points) {
                    const [x, y] = pixelOf(projection, point, W, H);
                    const [tx, ty] = pixelOf(narrowed, point, tile.width, tile.height);
                    expect(tx).toBeCloseTo(x - tile.x, 6);
                    expect(ty).toBeCloseTo(y - tile.y, 6);
                }
            }
        });
    }

    it("leaves z and w alone, so depth and fog are as for the whole image", () => {
        const projection = mat4.perspective(mat4.create(), Math.PI / 4, W / H, 1, 100);
        const narrowed: number[] = Array.from(projection as ArrayLike<number>);
        narrowToTile(narrowed, { x: 700, y: 1400, width: 700, height: 600 }, W, H);
        for (const column of [0, 1, 2, 3]) {
            expect(narrowed[column * 4 + 2]).toBe(projection[column * 4 + 2]);
            expect(narrowed[column * 4 + 3]).toBe(projection[column * 4 + 3]);
        }
    });
});
