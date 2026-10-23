/**
 * Rendering an image bigger than one texture (or than is wise to multisample at once) in tiles,
 * each drawn with the whole image's camera, cut down to the tile in clip space.
 *
 * Pure: no GPU. The renderer draws each tile into a texture of the tile's size and copies it into
 * place.
 */

/** A rectangle of the image, in pixels from its top-left corner. */
export interface SnapshotTile {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Tiles of at most `maxTile` x `maxTile` covering a `width` x `height` image, top row first. */
export function planTiles(width: number, height: number, maxTile: number): SnapshotTile[] {
    if (!(width >= 1 && height >= 1 && maxTile >= 1)) throw new Error(`Cannot tile ${width}x${height} by ${maxTile}`);
    const tiles: SnapshotTile[] = [];
    for (let y = 0; y < height; y += maxTile) {
        for (let x = 0; x < width; x += maxTile) {
            tiles.push({ x, y, width: Math.min(maxTile, width - x), height: Math.min(maxTile, height - y) });
        }
    }
    return tiles;
}

/**
 * Narrow `projection` (column-major, as gl-matrix and WGSL keep it), made for the whole
 * `width` x `height` image, to `tile`: what fell in the tile now fills clip space.
 *
 * It scales and shifts clip x and y by multiples of w, so it is exact for perspective as well as
 * orthographic projections, and each pixel of the tile lands on the same point as the matching
 * pixel of the whole image: the tiles join without seams.
 */
export function narrowToTile(projection: Float32Array | number[], tile: SnapshotTile, width: number, height: number): void {
    const sx = width / tile.width;
    const sy = height / tile.height;
    // The tile's centre in normalised device coordinates; y runs up, rows run down.
    const cx = -1 + (2 * tile.x + tile.width) / width;
    const cy = 1 - (2 * tile.y + tile.height) / height;
    for (let column = 0; column < 4; column++) {
        const i = column * 4;
        const w = projection[i + 3];
        projection[i] = sx * (projection[i] - cx * w);
        projection[i + 1] = sy * (projection[i + 1] - cy * w);
    }
}
