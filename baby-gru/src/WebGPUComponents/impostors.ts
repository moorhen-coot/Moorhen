/**
 * Spheres and cylinders drawn per pixel (WebGPU only): Coot's instanced meshes of unit spheres
 * (bonds-mode atoms, "atoms" / "hemispherical-atoms" / "vdW Balls") and unit cylinders (bonds,
 * "cylinder-00" ... "-11") drawn as one box per instance, each pixel of which casts a ray at the
 * exact sphere or cylinder (IMPOSTOR_WGSL in previewShaders.ts) - instead of every instance's
 * hundreds of triangles, in every pass (the picture, the shadow map, the effects' g-buffer).
 *
 * Which instanced meshes qualify is read off the mesh itself, not its name (which the worker does
 * not keep): every vertex on the unit sphere with its normal along it, or every vertex on the unit
 * cylinder from z = 0 to z = 1 (its side's normals radial, its flat caps' along z). So nothing
 * changes in Coot or the worker, and WebGL goes on drawing the meshes.
 *
 * Lit as the meshes are (lit() in previewShaders.ts), not as perfect spheres are. Cut by the front
 * clip plane as a mesh is - hollow, its inside showing flat - so that switching this on changes as
 * little as possible but the speed and the facets.
 */

/**
 * How the picture's impostors are drawn: in one pass (each fragment found, lit and given its depth at
 * once), or two - their depth, then their shading against it, so that what is hidden is not lit
 * (previewRenderer's drawImpostorsFirst). Two cost a fixed amount (a second pass over the boxes, and
 * the picture's buffers kept between passes) and save the lighting of every hidden layer: worth it
 * only where they overlap deeply. "auto": two where impostorOverlap is TWO_PASS_OVERLAP or more.
 */
export type ImpostorPasses = "auto" | "two" | "one";

/**
 * Dev switches (Dev menu). `enabled`: draw qualifying instanced spheres and cylinders per pixel in
 * WebGPU. `passes`: in one pass or two (ImpostorPasses).
 */
export const impostorSetting: { enabled: boolean; passes: ImpostorPasses } = { enabled: false, passes: "auto" };

/**
 * The overlap from which "auto" takes two passes. From Stuart's timings of 1ibm on an M1 (24 Nov, GPU
 * ms a frame, one pass against two): ordinary bonds zoomed out, overlap 0.27, 40.7 against 48.7;
 * zoomed in, 2.1, 55 against 56; big spheres (width 0.33, ratio 3.5) zoomed out, 3.2, 90 against 53;
 * zoomed in, 28, 215 against 136. Even at about 2.
 */
export const TWO_PASS_OVERLAP = 2.5;

/** What impostorOverlap reads of a draw (a PreviewDraw). */
interface OverlapDraw {
    buffer: { triangleInstanceOrigins?: ArrayLike<number>[]; triangleInstanceSizes?: ArrayLike<number>[]; triangleInstanceOrientations?: ArrayLike<number>[] };
    index: number;
    instanceCount: number;
    copies: ArrayLike<number>[];
    transparent: boolean;
    impostor?: ImpostorShape | null;
}

/**
 * Instances looked at in all, at most: the rest by sampling evenly. The estimate runs every frame, so
 * it must stay well under a millisecond (all of 1ibm's 180,000 took 5 ms).
 */
const OVERLAP_SAMPLES = 4096;

/**
 * Roughly how many impostor layers deep the picture is: their boxes' areas on screen, of those in
 * the slab and in view, added up, over the picture's area. 1: as much as would cover it once (if
 * spread evenly; a molecule in a corner is deeper where it is). `projection` and `view`: the frame's
 * (column-major, the projection's depth 0 to 1). Symmetry copies count as the original does, where
 * it is.
 */
export function impostorOverlap(draws: readonly OverlapDraw[], projection: ArrayLike<number>, view: ArrayLike<number>,
                                width: number, height: number): number {
    if (!(width > 0 && height > 0)) return 0;
    let total = 0;
    for (const draw of draws) if (draw.impostor && !draw.transparent) total += draw.instanceCount;
    if (total === 0) return 0;
    const stride = Math.max(1, Math.ceil(total / OVERLAP_SAMPLES));
    const halfHeight = height / 2, halfWidth = width / 2;
    const v0 = view[0], v1 = view[1], v2 = view[2], v4 = view[4], v5 = view[5], v6 = view[6];
    const v8 = view[8], v9 = view[9], v10 = view[10], v12 = view[12], v13 = view[13], v14 = view[14];
    const p0 = projection[0], p1 = projection[1], p2 = projection[2], p3 = projection[3];
    const p4 = projection[4], p5 = projection[5], p6 = projection[6], p7 = projection[7];
    const p8 = projection[8], p9 = projection[9], p10 = projection[10], p11 = projection[11];
    const p12 = projection[12], p13 = projection[13], p14 = projection[14], p15 = projection[15];
    const yScale = Math.abs(p5) * halfHeight;
    let area = 0;
    // Where the sampling is up to across the draws, so that a run of small draws is sampled too.
    let next = 0, seen = 0;
    for (const draw of draws) {
        const shape = draw.impostor;
        if (!shape || draw.transparent) continue;
        const n = draw.instanceCount;
        const origins = draw.buffer.triangleInstanceOrigins?.[draw.index];
        const sizes = draw.buffer.triangleInstanceSizes?.[draw.index];
        const turns = draw.buffer.triangleInstanceOrientations?.[draw.index];
        if (!origins || !sizes || !turns) { seen += n; continue; }
        const cylinder = shape.kind === "cylinder";
        const end = cylinder ? 0.5 * shape.end : 0;
        let drawArea = 0;
        for (let i = next - seen; i < n; i += stride) {
            const o = 3 * i, m = 16 * i;
            const t0 = turns[m], t1 = turns[m + 1], t2 = turns[m + 2];
            const radius = Math.abs(sizes[o]) * Math.sqrt(t0 * t0 + t1 * t1 + t2 * t2);
            // A cylinder's half axis: along the template's z, its length; its middle stands for it.
            let ax = 0, ay = 0, az = 0;
            if (cylinder) {
                const along = end * sizes[o + 2];
                ax = turns[m + 8] * along; ay = turns[m + 9] * along; az = turns[m + 10] * along;
            }
            const x = origins[o] + ax, y = origins[o + 1] + ay, z = origins[o + 2] + az;
            const ex = v0 * x + v4 * y + v8 * z + v12, ey = v1 * x + v5 * y + v9 * z + v13, ez = v2 * x + v6 * y + v10 * z + v14;
            const cw = p3 * ex + p7 * ey + p11 * ez + p15;
            if (cw <= 0) continue;
            const depth = (p2 * ex + p6 * ey + p10 * ez + p14) / cw;
            if (depth < 0 || depth > 1) continue;
            // Pixels an Angstrom, there.
            const scale = yScale / cw;
            const hx = v0 * ax + v4 * ay + v8 * az, hy = v1 * ax + v5 * ay + v9 * az;
            const half = Math.sqrt(hx * hx + hy * hy);
            // Out of view, all of it.
            const reach = (radius + half) * scale;
            if (Math.abs((p0 * ex + p4 * ey + p8 * ez + p12) / cw) > 1 + reach / halfWidth
                || Math.abs((p1 * ex + p5 * ey + p9 * ez + p13) / cw) > 1 + reach / halfHeight) continue;
            const r = radius * scale;
            drawArea += Math.PI * r * r + 4 * r * half * scale;
        }
        // The next sample, counted from the first draw's first instance.
        const last = next - seen + Math.max(0, Math.ceil((n - (next - seen)) / stride)) * stride;
        next = seen + last;
        seen += n;
        area += drawArea * stride * (1 + draw.copies.length);
    }
    return area / (width * height);
}

/** Whether the picture's impostors take two passes, by the setting and how deep they overlap. */
export function twoPasses(overlap: number): boolean {
    return impostorSetting.passes === "two" || (impostorSetting.passes === "auto" && overlap >= TWO_PASS_OVERLAP);
}

export type ImpostorShape =
    | { kind: "sphere" }
    /**
     * A unit cylinder along z from 0 to `end` (1, or -1: Coot's template, made with z turned round -
     * cylinder.cc takes a bond along +z for its "pathological" case and flips y and z); with a flat
     * cap at z = 0 (start) and/or at z = end.
     */
    | { kind: "cylinder"; end: 1 | -1; startCap: boolean; endCap: boolean };

/**
 * A cylinder's ends as the shader takes them (draw.params.y): 1 a cap at the start, 2 at the end,
 * 4 the template running to z = -1.
 */
export const capBits = (shape: ImpostorShape): number =>
    shape.kind === "cylinder" ? (shape.startCap ? 1 : 0) + (shape.endCap ? 2 : 0) + (shape.end < 0 ? 4 : 0) : 0;

const TOLERANCE = 1e-3;
const known = new WeakMap<object, ImpostorShape | null>();

/**
 * What a mesh template (x, y, z per vertex, and a normal per vertex) is, if it is a unit sphere or
 * a unit cylinder; null if it is anything else. Remembered per vertex array.
 */
export function impostorShape(vertices: ArrayLike<number> | null | undefined, normals: ArrayLike<number> | null | undefined): ImpostorShape | null {
    if (!vertices || !normals || vertices.length < 9 || normals.length !== vertices.length) return null;
    const cached = typeof vertices === "object" ? known.get(vertices as object) : undefined;
    if (cached !== undefined) return cached;
    const shape = sphereOrCylinder(vertices, normals);
    known.set(vertices as object, shape);
    return shape;
}

function sphereOrCylinder(v: ArrayLike<number>, n: ArrayLike<number>): ImpostorShape | null {
    const count = v.length / 3;
    // Which way along z a cylinder runs: the sign of its vertices' z, whichever comes first off 0.
    let end: 1 | -1 = 1;
    for (let i = 0; i < count; i++) {
        const z = v[3 * i + 2];
        if (Math.abs(z) > 0.5) { end = z > 0 ? 1 : -1; break; }
    }
    let sphere = true, cylinder = true, startCap = false, endCap = false;
    for (let i = 0; i < count && (sphere || cylinder); i++) {
        const x = v[3 * i], y = v[3 * i + 1], z = v[3 * i + 2];
        const nx = n[3 * i], ny = n[3 * i + 1], nz = n[3 * i + 2];
        const nLength = Math.hypot(nx, ny, nz);
        if (!(nLength > 0)) return null;
        if (sphere) {
            const r = Math.hypot(x, y, z);
            // Normals may point in or out (the worker negates some).
            const along = Math.abs(x * nx + y * ny + z * nz) / (r * nLength);
            sphere = Math.abs(r - 1) < TOLERANCE && along > 1 - TOLERANCE;
        }
        if (cylinder) {
            const radial = Math.hypot(x, y);
            const along = z * end;
            const inLength = along > -TOLERANCE && along < 1 + TOLERANCE;
            const side = Math.abs(radial - 1) < TOLERANCE && Math.abs(nz) / nLength < TOLERANCE;
            const capNormal = Math.abs(nz) / nLength > 1 - TOLERANCE && radial < 1 + TOLERANCE;
            const atStart = Math.abs(along) < TOLERANCE, atEnd = Math.abs(along - 1) < TOLERANCE;
            if (inLength && side) continue;
            if (capNormal && atStart) { startCap = true; continue; }
            if (capNormal && atEnd) { endCap = true; continue; }
            cylinder = false;
        }
    }
    if (sphere) return { kind: "sphere" };
    if (cylinder) return { kind: "cylinder", end, startCap, endCap };
    return null;
}
