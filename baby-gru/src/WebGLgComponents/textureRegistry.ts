/**
 * Image data that a drawable can be textured with.
 *
 * Kept apart from the store deliberately. A 1024x1024 RGBA image is four megabytes; putting that
 * in Redux would be copied on every reducer pass, serialised into every session file, and
 * compared by every selector. So a 3D object holds only an id, and the pixels live here.
 *
 * The consequence to be aware of: an id in a saved session will not resolve when the session is
 * reopened, because this registry does not persist. Drawing treats a missing texture as "no
 * texture" rather than as an error, so such an object comes back in its plain colour. Whether
 * sessions should carry their textures is a later decision, and is why the id is a string rather
 * than an index.
 */

/**
 * One image, as 8-bit RGBA.
 *
 * Row 0 is the TOP row, which is the convention of every image format and of glTF's texture
 * coordinates - UV (0,0) is the top-left of the image. WebGL's `texImage2D` treats the first row
 * it is given as the one at v=0, so uploading this without flipping makes UV (0,0) sample the top
 * row and glTF coordinates work unaltered. Anything generating a texture here writes its first
 * row as the top one and does not think about it again.
 */
export type TextureSource = {
    width: number;
    height: number;
    /** width * height * 4 bytes, row 0 at the top, not premultiplied. */
    rgba: Uint8Array;
};

/** What a sub-buffer is drawn with, beyond its vertex colours. */
export type BufferMaterial = {
    /**
     * A registered texture id. Multiplied into the vertex colour rather than replacing it, which
     * is both what glTF specifies for baseColorTexture against baseColorFactor and what keeps an
     * object's own colour meaningful - a white mesh shows the texture as it is, and a coloured
     * one tints it.
     */
    baseColourTexture?: string;
};

const sources = new Map<string, TextureSource>();

/**
 * Uploaded textures, per context.
 *
 * Per context because Moorhen can have more than one live at a time - the main viewer and the
 * scene-sliders preview each create their own - and a WebGLTexture belongs to exactly one. Weak,
 * so that a context going away takes its textures' handles with it rather than pinning them.
 */
const uploaded = new WeakMap<WebGLRenderingContext, Map<string, WebGLTexture>>();

let counter = 0;

/**
 * Register image data and return the id to refer to it by.
 *
 * @param source - The image. Not copied, so the caller should not then modify it.
 * @param id - An id to use instead of a generated one, for a texture that is being replaced.
 */
export const registerTexture = (source: TextureSource, id?: string): string => {
    const key = id ?? `texture-${++counter}`;
    sources.set(key, source);
    // A re-registration under the same id has to invalidate what the GPU already holds, or the
    // old image would go on being drawn.
    forgetUploaded(key);
    return key;
};

export const getTextureSource = (id: string): TextureSource | undefined => sources.get(id);

/** Drop every uploaded copy of one texture, leaving its source registered. */
const forgetUploaded = (id: string) => {
    // There is no way to enumerate a WeakMap, so the handles for contexts other than those seen
    // again later are left to be collected with the context itself. Contexts still in use will
    // re-upload on their next draw because the entry is gone from their map when they look.
    for (const map of liveContexts) {
        const texture = map.textures.get(id);
        if (!texture) continue;
        map.gl.deleteTexture(texture);
        map.textures.delete(id);
    }
};

/**
 * Contexts that have uploaded something, so that a re-registered or forgotten texture can be
 * deleted from them. Holds the context strongly, which is why only contexts that have actually
 * been used for a texture are listed.
 */
const liveContexts: { gl: WebGLRenderingContext; textures: Map<string, WebGLTexture> }[] = [];

/** Forget a texture entirely, including its pixels. */
export const forgetTexture = (id: string) => {
    forgetUploaded(id);
    sources.delete(id);
};

/**
 * The GL texture for an id, uploaded if this context has not seen it before.
 *
 * @returns The texture, or null if the id is not registered - which callers treat as "draw it
 *     untextured" rather than as a failure.
 */
export const glTextureFor = (gl: WebGLRenderingContext, id: string): WebGLTexture | null => {
    let forContext = uploaded.get(gl);
    if (!forContext) {
        forContext = new Map<string, WebGLTexture>();
        uploaded.set(gl, forContext);
        liveContexts.push({ gl, textures: forContext });
    }

    const existing = forContext.get(id);
    if (existing) return existing;

    const source = sources.get(id);
    if (!source) return null;
    if (source.rgba.length < source.width * source.height * 4) {
        console.warn(`texture ${id} has less data than its ${source.width}x${source.height} size`);
        return null;
    }

    const texture = gl.createTexture();
    if (!texture) return null;

    // Unit 0 is where the rest of the renderer expects to be left, and this is the unit the
    // upload happens on - so it is set explicitly rather than inherited. drawTriangles leaves
    // activeTexture on unit 9 after a hovered buffer, so inheriting it would upload onto a unit
    // holding the hover-influence texture.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // RGBA8 rather than SRGB8_ALPHA8, deliberately.
    //
    // An sRGB internal format makes the sampler decode to linear, which is right in a renderer
    // that works in linear light and encodes once at the end. Moorhen does not: vertex colours
    // are used as they are, the lighting arithmetic happens in whatever space they are in, and
    // nothing gamma-encodes the output. Decoding the texture alone would make every texture
    // systematically darker than the equivalent vertex colour - correct in isolation, wrong
    // against everything around it. So texture RGB is treated exactly as vertex colour RGB is.
    //
    // If the renderer is ever made linear end to end, this is one of the places to change, and
    // it should change at the same time as the vertex colours, not before.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, source.width, source.height, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, source.rgba);

    // Mipmaps, and trilinear between levels. Without them a textured surface at any distance
    // aliases into a shimmering mess as the camera moves, which is far more objectionable than
    // the blur. Non-power-of-two sizes are fine for this in WebGL2.
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Clamped rather than repeated: a UV outside 0..1 is far more often a mistake than an
    // intention, and clamping makes it look like one instead of tiling plausibly.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, null);

    forContext.set(id, texture);
    return texture;
};

/**
 * A checkerboard with each corner a different colour.
 *
 * For testing the texture path, and deliberately not a plain checkerboard: a checkerboard is
 * symmetric under a horizontal flip, a vertical flip and a transpose, so the commonest texture
 * fault of all - a flipped V axis - would look perfectly correct. The corners make every one of
 * those visible at a glance.
 *
 * Red top-left, green top-right, blue bottom-left, yellow bottom-right.
 *
 * @param size - Pixels along each side.
 * @param squares - Checks across the board.
 */
export const checkerboardTexture = (size = 256, squares = 8): TextureSource => {
    const rgba = new Uint8Array(size * size * 4);
    const step = Math.max(1, Math.floor(size / squares));
    const marker = Math.max(2, Math.floor(size / 5));

    for (let row = 0; row < size; row++) {
        for (let column = 0; column < size; column++) {
            const light = ((Math.floor(row / step) + Math.floor(column / step)) % 2) === 0;
            let r = light ? 220 : 60;
            let g = light ? 220 : 60;
            let b = light ? 220 : 60;

            // row 0 is the top, so these are named as they will appear.
            const top = row < marker;
            const bottom = row >= size - marker;
            const left = column < marker;
            const right = column >= size - marker;
            if (top && left) { r = 220; g = 30; b = 30; }
            else if (top && right) { r = 30; g = 180; b = 30; }
            else if (bottom && left) { r = 40; g = 90; b = 230; }
            else if (bottom && right) { r = 230; g = 210; b = 40; }

            const at = 4 * (row * size + column);
            rgba[at] = r;
            rgba[at + 1] = g;
            rgba[at + 2] = b;
            rgba[at + 3] = 255;
        }
    }

    return { width: size, height: size, rgba };
};
