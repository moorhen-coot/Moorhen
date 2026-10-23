/**
 * What the textured-mesh cases share: quads to draw, the normal maps they are drawn with and the
 * normals those should come to, and the lighting a metallic-roughness map should give, worked out
 * on the CPU as triangle-fragment-shader.js and fs_textured (previewShaders.ts) work it out.
 */

/** A mesh in the arrays DisplayBuffer and the WebGL attributes take. */
export interface Quad {
    positions: number[];
    normals: number[];
    colours: number[];
    uvs: number[];
    indices: number[];
}

export const emptyQuad = (): Quad => ({ positions: [], normals: [], colours: [], uvs: [], indices: [] });

/**
 * A rectangle from (x0, y0) to (x1, y1) in the z = 0 plane, with one normal and colour, and
 * texture coordinates u0..u1 left to right and v0..v1 top to bottom.
 */
export function rectangle(into: Quad, x0: number, y0: number, x1: number, y1: number, normal: number[], colour: number[],
                          u0 = 0, u1 = 1, v0 = 0, v1 = 1): void {
    const base = into.positions.length / 3;
    // top-left, top-right, bottom-right, bottom-left
    into.positions.push(x0, y1, 0, x1, y1, 0, x1, y0, 0, x0, y0, 0);
    into.uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
    for (let i = 0; i < 4; i++) {
        into.normals.push(...normal);
        into.colours.push(...colour);
    }
    // Counter-clockwise seen from +z, as front faces.
    into.indices.push(base, base + 3, base + 2, base, base + 2, base + 1);
}

export const unit = (v: number[]): number[] => {
    const l = Math.hypot(...v);
    return v.map(c => c / l);
};

export const dot = (a: number[], b: number[]): number => a.reduce((sum, c, i) => sum + c * b[i], 0);

/** Bytes of a constant normal map texel, as glTF encodes a normal: (n + 1) / 2. */
export const encodeNormal = (n: number[]): number[] => [...n.map(c => Math.round((c * 0.5 + 0.5) * 255)), 255];

/** The normal a byte-encoded texel really holds, scaled as normalTexture.scale scales it. */
export const decodedNormal = (bytes: number[], scale = 1): number[] => {
    const m = bytes.slice(0, 3).map(b => b / 255 * 2 - 1);
    return unit([m[0] * scale, m[1] * scale, m[2]]);
};

/**
 * Normal maps tilting a quad one way everywhere, and the normal each should give, for a quad
 * mapped u left to right and v top to bottom - or, mirrored, u right to left - in the xy plane
 * with y up.
 */
export const NORMAL_MAP_CASES: { name: string; tangent: number[]; scale?: number; mirrored?: boolean; world: (n: number[]) => number[] }[] = (() => {
    const s = Math.sin(0.5), c = Math.cos(0.5);
    return [
        // +X is +u, which is +x here.
        { name: "along u", tangent: [s, 0, c], world: n => n },
        // +Y is up the image, which is +y here: v runs down the image and down the quad.
        { name: "up the image", tangent: [0, s, c], world: n => n },
        { name: "scaled", tangent: [s, -s * 0.5, c], scale: 1.6, world: n => n },
        // u running right to left: +u, and so +X, is -x.
        { name: "mirrored", tangent: [s, 0, c], mirrored: true, world: n => [-n[0], n[1], n[2]] },
    ];
})();

/** Metallic-roughness texels (G roughness, B metallic, as bytes) and factors to try. */
export const METALLIC_ROUGHNESS_CASES: { name: string; g: number; b: number; metallicFactor: number; roughnessFactor: number }[] = [
    { name: "rough dielectric", g: 230, b: 0, metallicFactor: 1, roughnessFactor: 1 },
    { name: "fairly smooth dielectric", g: 90, b: 0, metallicFactor: 1, roughnessFactor: 1 },
    { name: "smooth dielectric", g: 40, b: 0, metallicFactor: 1, roughnessFactor: 1 },
    { name: "smooth metal", g: 40, b: 255, metallicFactor: 1, roughnessFactor: 1 },
    { name: "factors", g: 200, b: 200, metallicFactor: 0.5, roughnessFactor: 0.3 },
];

export interface Lights {
    /** Light and eye directions, unit, in the frame the normals are in. */
    L: number[];
    E: number[];
    ambient: number[];
    diffuse: number[];
    specular: number[];
}

/**
 * A normal turned most of the way to the half vector, so the highlight is near its peak but not at
 * it, where the exponent would make no difference: R.E is about 0.97.
 */
export const nearHighlight = (lights: Lights): number[] => {
    const half = unit(lights.L.map((c, i) => c + lights.E[i]));
    return unit(half.map((c, i) => 0.85 * c + 0.15 * [0, 0, 1][i]));
};

/**
 * The colour, in levels, of an unfogged front face with normal `n` and base colour `base`, lit
 * with a metallic-roughness map's metallic and roughness (texel times factor).
 */
export function litWithMetallicRoughness(lights: Lights, n: number[], base: number[], metallic: number, roughness: number): number[] {
    const { L, E, ambient, diffuse, specular } = lights;
    const nl = Math.max(dot(n, L), 0);
    // R = -reflect(L, n) = 2 (n.L) n - L
    const R = unit(n.map((c, i) => 2 * dot(n, L) * c - L[i]));
    const re = Math.max(dot(R, E), 0);
    const r = Math.min(Math.max(roughness, 0.05), 1), r2 = r * r;
    const shininess = Math.min(Math.max((2 / (r2 * r2) - 2) / 4, 1), 1024);
    return [0, 1, 2].map(c => {
        const tint = (1 + (base[c] - 1) * metallic) * (1 - r);
        const value = 1.5 * base[c] * ambient[c] + 1.2 * base[c] * diffuse[c] * nl * (1 - metallic)
            + tint * specular[c] * Math.pow(re, shininess);
        return Math.round(255 * Math.min(Math.max(value, 0), 1));
    });
}

/** A texture of `size` x `size` texels all `rgba`. */
export const solidImage = (rgba: number[], size = 2) => ({
    width: size, height: size, rgba: new Uint8Array(Array.from({ length: size * size }, () => rgba).flat()),
});

/** A checkerboard of single texels, black and white, `n` across. */
export function fineChecker(n: number): { width: number; height: number; rgba: Uint8Array } {
    const rgba = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const v = (x + y) % 2 ? 255 : 0;
        rgba.set([v, v, v, 255], 4 * (y * n + x));
    }
    return { width: n, height: n, rgba };
}

/** A 4 x 4 image of distinct colours, row 0 at the top. */
export const TEXELS_ACROSS = 4, TEXELS_DOWN = 4;
export const texelColours = (): number[][] => {
    const texels: number[][] = [];
    for (let ty = 0; ty < TEXELS_DOWN; ty++) for (let tx = 0; tx < TEXELS_ACROSS; tx++) {
        texels.push([40 + 60 * tx, 30 + 55 * ty, 230 - 25 * (tx + ty), 255]);
    }
    return texels;
};

/**
 * The quad `x0..x1` by `y0..y1` cut into one cell per texel of texelColours, each coloured `tint`
 * times its texel: what the quad textured with that image and tinted should look like. And the
 * cells' centres.
 */
export function texelCells(x0: number, y0: number, x1: number, y1: number, tint: number[]): { quad: Quad; centres: [number, number][] } {
    const quad = emptyQuad();
    const centres: [number, number][] = [];
    const texels = texelColours();
    const w = (x1 - x0) / TEXELS_ACROSS, h = (y1 - y0) / TEXELS_DOWN;
    for (let ty = 0; ty < TEXELS_DOWN; ty++) for (let tx = 0; tx < TEXELS_ACROSS; tx++) {
        const left = x0 + tx * w, top = y1 - ty * h;
        const texel = texels[ty * TEXELS_ACROSS + tx];
        rectangle(quad, left, top - h, left + w, top, [0, 0, 1], [0, 1, 2].map(c => tint[c] * texel[c] / 255).concat(1));
        centres.push([left + w / 2, top - h / 2]);
    }
    return { quad, centres };
}
