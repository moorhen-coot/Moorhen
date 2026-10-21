/**
 * The WebGL objects behind a DisplayBuffer, created when the buffer is first uploaded rather than
 * when its data arrives.
 *
 * A DisplayBuffer used to be born holding WebGL handles: createWebGLBuffers called
 * gl.createBuffer() for every sub-buffer as it copied the data in, and appendOtherData refused to
 * produce anything at all without a context. So the scene data could not exist without WebGL,
 * which rules out drawing it any other way - a WebGPU canvas, say - and ties every buffer to the
 * one context that happened to be current when it was made.
 *
 * Now ingestion leaves a placeholder in each handle slot, carrying the numItems and itemSize that
 * the draw code reads, and buildBuffers swaps each placeholder for a real buffer just before its
 * first upload. Everything that draws goes through buildBuffers first (drawScene builds whatever
 * is dirty, and every buffer starts dirty), so a placeholder never reaches gl.bindBuffer.
 *
 * The slot arrays keep their lengths, which matters: several loops count sub-buffers by
 * triangleVertexIndexBuffer.length.
 *
 * The influence textures used for hover highlighting are deferred in the same way. Their source
 * arrays wait in pick_info.pending_influence until there is a context to make textures in.
 *
 * Renderer-owned buffers that never pass through ingestion (the text and click-line buffers, the
 * image disc in mgWebGL) still create their handles directly. They belong to the WebGL renderer
 * and nothing else needs to read them.
 */

export interface MGWebGLBuffer {
    itemSize: number;
    numItems: number;
}

/** A handle slot whose WebGL buffer has not been created yet. */
export interface PendingGLBuffer extends MGWebGLBuffer {
    pendingGL: true;
}

export const pendingGLBuffer = (numItems = 0, itemSize = 0): PendingGLBuffer =>
    ({ itemSize, numItems, pendingGL: true });

export const isPendingGLBuffer = (slot: unknown): slot is PendingGLBuffer =>
    typeof slot === "object" && slot !== null && (slot as PendingGLBuffer).pendingGL === true;

/**
 * Every per-sub-buffer handle array that ingestion fills.
 *
 * Kept in one list so that realising, cloning and testing cannot disagree about which they are.
 */
export const GL_SLOT_ARRAYS = [
    "triangleVertexRealNormalBuffer",
    "triangleVertexNormalBuffer",
    "triangleVertexPositionBuffer",
    "triangleVertexIndexBuffer",
    "triangleVertexTextureBuffer",
    "triangleInstanceOriginBuffer",
    "triangleInstanceOrientationBuffer",
    "triangleInstanceSizeBuffer",
    "triangleColourBuffer",
] as const;

export type GLSlotArrayName = typeof GL_SLOT_ARRAYS[number];

/** The source arrays for the three influence textures, held until a context exists. */
export interface PendingInfluence {
    weights: ArrayLike<number>;
    point_indexes: ArrayLike<number>;
    index_offsets: ArrayLike<number>;
}

type SlotHolder = { [K in GLSlotArrayName]: MGWebGLBuffer[] } & {
    pick_info?: {
        pending_influence?: PendingInfluence;
        influence_weights_texture?: unknown;
        influence_weights_width?: number;
        influence_point_indexes_texture?: unknown;
        influence_point_indexes_width?: number;
        influence_index_offsets_texture?: unknown;
        influence_index_offsets_width?: number;
    };
};

/** The few calls this module makes. A real WebGL2RenderingContext satisfies it. */
export interface GLForResources {
    createBuffer(): unknown;
    createTexture?(): unknown;
    bindTexture?(target: number, texture: unknown): void;
    texParameteri?(target: number, pname: number, param: number): void;
    texImage2D?(...args: unknown[]): void;
    getParameter?(pname: number): unknown;
    [constant: string]: unknown;
}

export const hasPendingGLResources = (buffer: SlotHolder): boolean =>
    GL_SLOT_ARRAYS.some(name => buffer[name]?.some(isPendingGLBuffer)) ||
    !!buffer.pick_info?.pending_influence;

/**
 * Swap every placeholder in `buffer` for a real WebGL buffer, and make any deferred textures.
 *
 * Idempotent: slots that already hold a buffer are left alone, so calling it on a buffer that is
 * already realised costs a scan and nothing else. Returns how many buffers it created.
 *
 * If the context cannot create a buffer (createBuffer returns null after a context loss) the
 * placeholder stays where it is and will be tried again next time.
 */
export function realiseGLResources(gl: GLForResources, buffer: SlotHolder): number {
    let created = 0;
    for (const name of GL_SLOT_ARRAYS) {
        const slots = buffer[name];
        if (!slots) continue;
        for (let j = 0; j < slots.length; j++) {
            const slot = slots[j];
            if (!isPendingGLBuffer(slot)) continue;
            const real = gl.createBuffer() as MGWebGLBuffer | null;
            if (!real) continue;
            real.itemSize = slot.itemSize;
            real.numItems = slot.numItems;
            slots[j] = real;
            created++;
        }
    }
    if (buffer.pick_info?.pending_influence && gl.createTexture) {
        realiseInfluenceTextures(gl, buffer.pick_info);
    }
    return created;
}

/**
 * Pack one array into a square-ish single-channel texture, or return null if it will not fit.
 *
 * Moved unchanged from createWebGLBuffers, apart from the test now being "fits" rather than
 * "fits, else silently leave the texture unset".
 */
function influenceTexture(
    gl: GLForResources, data: ArrayLike<number>, maxTexSize: number, isFloat: boolean
): { texture: unknown, width: number } | null {
    const width = Math.ceil(Math.sqrt(data.length));
    const height = Math.ceil(data.length / width);
    if (!(width * height < maxTexSize * maxTexSize)) return null;
    const padded = isFloat ? new Float32Array(width * height) : new Uint32Array(width * height);
    padded.set(data as ArrayLike<number>);
    const g = gl as unknown as Record<string, number>;
    const texture = gl.createTexture!();
    gl.bindTexture!(g.TEXTURE_2D, texture);
    gl.texParameteri!(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
    gl.texParameteri!(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
    gl.texParameteri!(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    gl.texParameteri!(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    if (isFloat) {
        gl.texImage2D!(g.TEXTURE_2D, 0, g.R32F, width, height, 0, g.RED, g.FLOAT, padded);
    } else {
        gl.texImage2D!(g.TEXTURE_2D, 0, g.R32UI, width, height, 0, g.RED_INTEGER, g.UNSIGNED_INT, padded);
    }
    return { texture, width };
}

function realiseInfluenceTextures(gl: GLForResources, pickInfo: NonNullable<SlotHolder["pick_info"]>): void {
    const pending = pickInfo.pending_influence;
    delete pickInfo.pending_influence;
    try {
        const maxTexSize = gl.getParameter!((gl as unknown as Record<string, number>).MAX_TEXTURE_SIZE) as number;
        const weights = influenceTexture(gl, pending.weights, maxTexSize, true);
        if (weights) {
            pickInfo.influence_weights_texture = weights.texture;
            pickInfo.influence_weights_width = weights.width;
        }
        const pointIndexes = influenceTexture(gl, pending.point_indexes, maxTexSize, false);
        if (pointIndexes) {
            pickInfo.influence_point_indexes_texture = pointIndexes.texture;
            pickInfo.influence_point_indexes_width = pointIndexes.width;
        }
        const indexOffsets = influenceTexture(gl, pending.index_offsets, maxTexSize, false);
        if (indexOffsets) {
            pickInfo.influence_index_offsets_texture = indexOffsets.texture;
            pickInfo.influence_index_offsets_width = indexOffsets.width;
        }
    } catch (e) {
        console.log(e);
    }
}
