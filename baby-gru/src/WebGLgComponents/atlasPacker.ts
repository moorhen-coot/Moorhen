/**
 * Where each rasterised string sits in the glyph atlas.
 *
 * Pulled out of TextCanvasTexture so the arithmetic can be tested without a GL context or a canvas.
 * The packing is a simple column filler: items stack downwards until one will not fit, then a new
 * column starts to the right of the widest item in the previous one.
 *
 * It replaces an inline version that had no notion of being full. When a column ran off the right
 * edge the cursor simply kept going, the normalised coordinates passed 1.0, and CLAMP_TO_EDGE
 * turned the overflow into a smear of the atlas's last column. That was unreachable in practice
 * only because the atlas was cleared whenever anything changed - which is the very thing worth
 * stopping, since a clear throws away every glyph and re-uploads several megabytes.
 */

/** A rectangle in atlas pixels. */
export type AtlasRect = { x: number; y: number; w: number; h: number };

export interface PlacedItem {
    /** Left edge in atlas pixels: where the caller draws. */
    x: number;
    /**
     * The baseline *after* this item was placed.
     *
     * Both callers draw relative to it rather than to the top - text subtracts the font's descent,
     * an image subtracts its height - so this is the number they need.
     */
    baseline: number;
    /** [x1, y1, x2, y2], normalised, for the texture coordinates. */
    texCoords: [number, number, number, number];
}

export class AtlasPacker {

    readonly width: number;
    readonly height: number;

    private baseline = 0;
    private columnX = 0;
    private columnWidth = 0;
    private dirty: AtlasRect | null = null;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    /**
     * Find room for an item, or report that the atlas is full.
     *
     * @param advanceWidth     the text metric's width, which is how far the pen moves
     * @param boxHeight        ascent + descent, plus whatever padding the caller wants
     * @param boundingBoxRight how far the ink actually reaches right, which for an overhanging
     *                         glyph can be more than advanceWidth - so both are considered when
     *                         deciding what the item occupies, otherwise an italic tail would be
     *                         allowed to run past the right edge and wrap as a smear
     * @param topInset         pixels to leave above the ink when computing y1; the text path uses
     *                         1 and the image path 0, a difference preserved from the original
     *
     * @returns null when the item cannot be placed, which means the caller should compact and
     *          retry rather than draw something wrong
     */
    place(advanceWidth: number, boxHeight: number, boundingBoxRight: number, topInset = 0): PlacedItem | null {

        const occupies = Math.max(advanceWidth, boundingBoxRight);

        // Nothing can be done with an item larger than the atlas; compaction will not help, so say
        // so plainly rather than returning coordinates that cannot be drawn.
        if (!(occupies > 0) || !(boxHeight > 0)) return null;
        if (occupies > this.width || boxHeight > this.height) return null;

        if (this.baseline + boxHeight > this.height) {
            this.baseline = 0;
            this.columnX += this.columnWidth;
            this.columnWidth = 0;
        }

        // The check the inline version never had.
        if (this.columnX + occupies > this.width) return null;

        const x = this.columnX;
        const x1 = x / this.width;
        const y1 = (this.baseline + topInset) / this.height;

        this.baseline += boxHeight;

        const x2 = x1 + boundingBoxRight / this.width;
        const y2 = this.baseline / this.height;

        if (occupies > this.columnWidth) this.columnWidth = occupies;

        this.markDirty({ x, y: this.baseline - boxHeight, w: occupies, h: boxHeight });

        return { x, baseline: this.baseline, texCoords: [x1, y1, x2, y2] };
    }

    /** Start again from an empty atlas. */
    reset(): void {
        this.baseline = 0;
        this.columnX = 0;
        this.columnWidth = 0;
        this.dirty = null;
    }

    /**
     * The region written to since the last clearDirty, or null if nothing was.
     *
     * This is what makes an incremental upload possible: only this rectangle has changed, so only
     * it needs to reach the texture, rather than the whole atlas going up again because one label
     * out of fifty was different.
     */
    get dirtyRegion(): AtlasRect | null {
        return this.dirty;
    }

    /** Forget the dirty region, after the caller has uploaded it. */
    clearDirty(): void {
        this.dirty = null;
    }

    /** Whether anything has been placed since the last reset. */
    get isEmpty(): boolean {
        return this.columnX === 0 && this.baseline === 0;
    }

    private markDirty(rect: AtlasRect): void {
        if (this.dirty === null) {
            this.dirty = { ...rect };
            return;
        }
        const left = Math.min(this.dirty.x, rect.x);
        const top = Math.min(this.dirty.y, rect.y);
        const right = Math.max(this.dirty.x + this.dirty.w, rect.x + rect.w);
        const bottom = Math.max(this.dirty.y + this.dirty.h, rect.y + rect.h);
        this.dirty = { x: left, y: top, w: right - left, h: bottom - top };
    }
}
