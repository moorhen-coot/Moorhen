/**
 * A 2D contour slice through a map: a square in a plane, with the map's contour lines across it.
 *
 * The slice is placed like a 3D object - an origin (its centre) and an orientation, a column-major
 * 4x4 whose first two columns are the square's sides and third its normal - so the same handles
 * move and turn it (gizmoDraw.ts, DragHandles.tsx). A new one faces down z (identity).
 *
 * Contoured from the map's whole unit cell (get_map_unit_cell_grid) sampled smoothly
 * (mapGridSampler.ts), adaptively (sliceContour.ts). Nothing here is particular to orbitals: a
 * difference map, which is how an orbital is loaded, gets positive and negative contours in its
 * two colours; any other map gets positive ones in its own colour.
 */
import { contourSlice, type SliceContours } from "./sliceContour";
import type { MapGridSampler } from "./mapGridSampler";

export interface MapSlicePlacement {
    /** The centre of the square (angstroms). */
    origin: [number, number, number];
    /** Column-major 4x4: columns 0 and 1 run along the square, column 2 is its normal. */
    orientation: number[];
}

export const IDENTITY_ORIENTATION = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** A new slice: through `origin`, facing down z. */
export const newMapSlice = (origin: [number, number, number]): MapSlicePlacement => ({
    origin: [...origin],
    orientation: [...IDENTITY_ORIENTATION],
});

/** The square's two in-plane directions and its normal, unit length. */
export function sliceAxes(orientation: number[]): { u: number[]; v: number[]; normal: number[] } {
    const column = (c: number) => {
        const vector = [orientation[c * 4], orientation[c * 4 + 1], orientation[c * 4 + 2]];
        const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
        return vector.map(x => x / length);
    };
    return { u: column(0), v: column(1), normal: column(2) };
}

/**
 * Half the slice's width: the map's radius, as the map is contoured in 3D (MoorhenMapManager), so
 * an orbital's slice is as wide as its contours are drawn.
 */
export function sliceHalfSize(
    settings: { mapRadii: readonly { molNo: number; radius: number }[] },
    molNo: number,
    suggestedRadius: number | null | undefined,
): number {
    return settings.mapRadii.find(item => item.molNo === molNo)?.radius || suggestedRadius || 15;
}

/** Each contour `SLICE_CONTOUR_RATIO` times the one outside it, and at most this many each side of zero. */
export const SLICE_CONTOUR_RATIO = 2;
export const SLICE_MAX_CONTOURS = 12;

/**
 * How a slice's contours are spaced from the outermost (the map's level) inwards:
 *  - "linear": equal steps, up to the largest value in the slice. Where the map climbs steeply - an
 *    orbital or density towards a nucleus - the contours close up, so how fast it climbs shows.
 *    The outer, diffuse parts get few.
 *  - "geometric": each double the last. An orbital falls off from a nucleus roughly exponentially,
 *    so these come out roughly evenly spaced across it: the outer structure shows as well as the
 *    inner, but not where the values are high.
 */
export type SliceContourSpacing = "linear" | "geometric";
export const DEFAULT_SLICE_CONTOUR_SPACING: SliceContourSpacing = "linear";

/** The largest values either side of zero in a slice: positive, and the magnitude of the most negative. */
export interface SliceRange {
    maxPositive: number;
    maxNegative: number;
}

/**
 * Linear contour levels: the map's level - the outermost - and equal steps from there, `count` of
 * them up to the slice's largest value (`range`), the innermost a step short of the peak so that
 * it rings it rather than marking a point.
 *
 * For a difference map, one step for both signs, from the larger of their peaks, so that contours
 * as close together mean as steep a climb in either: the weaker sign has fewer, not the same number
 * squeezed into less. Each sign stops at its own peak; one the slice never reaches beyond the level
 * has only its outermost, which draws nothing.
 */
export function sliceLinearLevels(level: number, signed: boolean, range: SliceRange, count = SLICE_MAX_CONTOURS): number[] {
    const magnitude = Math.abs(level);
    if (!(magnitude > 0) || count < 1) return [];
    const peak = signed ? Math.max(range.maxPositive, range.maxNegative) : range.maxPositive;
    const step = (peak - magnitude) / count;
    const stepsTo = (max: number) => {
        if (!(step > 0)) return [magnitude];
        const levels: number[] = [];
        for (let k = 0; k < count && (k === 0 || magnitude + k * step < max); k++) levels.push(magnitude + k * step);
        return levels;
    };
    const positive = stepsTo(range.maxPositive);
    return signed ? [...positive, ...stepsTo(range.maxNegative).map(x => -x)] : positive;
}

/**
 * The contour levels: the map's level - the outermost contour, where its 3D surface at that level
 * would cut the slice - and each `ratio` times the one before, up to the largest value in the map
 * (`maxAbs`), at most `maxCount`; and their negatives for a difference map.
 *
 * A geometric series rather than equal steps, as contour plots of orbitals and densities are
 * usually drawn: their values span orders of magnitude, and equal steps up to the peak would crowd
 * the contours round the nuclei and leave one or two for the rest. And up to the map's largest
 * value, not a fixed number of them, so that a low level gives the whole range and not just the
 * outer part of it. Levels beyond what the slice reaches draw nothing, at little cost.
 */
export function sliceLevels(level: number, signed: boolean, maxAbs: number, maxCount = SLICE_MAX_CONTOURS, ratio = SLICE_CONTOUR_RATIO): number[] {
    const magnitude = Math.abs(level);
    if (!(magnitude > 0) || maxCount < 1 || !(ratio > 1)) return [];
    const positive: number[] = [];
    for (let value = magnitude; positive.length < maxCount && (positive.length === 0 || value <= maxAbs); value *= ratio) {
        positive.push(value);
    }
    return signed ? [...positive, ...positive.map(x => -x)] : positive;
}

/**
 * A nodal line (the zero contour) is drawn only where the map, somewhere in the cell it starts
 * from, reaches this fraction of the outermost contour (sliceContour.ts, zeroLevelMinMagnitude):
 * between and round the lobes, and not on through the empty space beyond them.
 */
export const SLICE_NODAL_MIN_FRACTION = 0.25;

/**
 * How finely the slice starts out: twice the map's grid spacing (a cell's samples, at its corners,
 * centre and midpoints, are then a grid spacing apart), or coarser for a very large slice, so that
 * it starts from no more than about 200 cells a side. The contouring refines from there.
 */
export function sliceBaseSpacing(gridSpacing: number, halfSize: number): number {
    return Math.max(2 * gridSpacing, (2 * halfSize) / 200);
}

/**
 * The largest values either side of zero in a slice, from the map sampled at the slice's starting
 * cell size (sliceBaseSpacing): a sharp peak between samples is missed by a little, so the
 * innermost linear contour can sit a little short of where it would - it still rings the peak.
 */
export function sliceRange(sampler: MapGridSampler, slice: MapSlicePlacement, halfSize: number): SliceRange {
    const { u, v } = sliceAxes(slice.orientation);
    const [ox, oy, oz] = slice.origin;
    const n = Math.max(1, Math.ceil((2 * halfSize) / sliceBaseSpacing(sampler.spacing, halfSize)));
    const step = (2 * halfSize) / n;
    let maxPositive = 0, maxNegative = 0;
    for (let i = 0; i <= n; i++) {
        const s = -halfSize + i * step;
        for (let j = 0; j <= n; j++) {
            const t = -halfSize + j * step;
            const value = sampler.value(ox + s * u[0] + t * v[0], oy + s * u[1] + t * v[1], oz + s * u[2] + t * v[2]);
            if (value > maxPositive) maxPositive = value;
            else if (-value > maxNegative) maxNegative = -value;
        }
    }
    return { maxPositive, maxNegative };
}

/**
 * Contour a slice of the map: the lines across the square, in its own (s, t) coordinates. A level
 * of zero, if given, is the nodal line: contoured only where the map reaches `nodalMinMagnitude`.
 */
export function contourMapSlice(
    sampler: MapGridSampler, slice: MapSlicePlacement, halfSize: number, levels: number[], nodalMinMagnitude?: number,
): SliceContours {
    const { u, v } = sliceAxes(slice.orientation);
    const [ox, oy, oz] = slice.origin;
    const field = (s: number, t: number) =>
        sampler.value(ox + s * u[0] + t * v[0], oy + s * u[1] + t * v[1], oz + s * u[2] + t * v[2]);
    return contourSlice(field, {
        halfSize, baseSpacing: sliceBaseSpacing(sampler.spacing, halfSize), levels, zeroLevelMinMagnitude: nodalMinMagnitude,
    });
}

type Rgb = { r: number; g: number; b: number };

/** The frame round the square: grey, so as to belong to neither sign. */
export const SLICE_FRAME_COLOUR: Rgb = { r: 0.55, g: 0.55, b: 0.55 };

/** The nodal line: a darker grey than the frame, also of neither sign. */
export const SLICE_NODAL_COLOUR: Rgb = { r: 0.3, g: 0.3, b: 0.3 };

/**
 * The slice as a lines display object (the form Coot's line meshes take, for appendOtherData):
 * each level's lines in its colour - positive levels `positive`, negative `negative`, zero (the
 * nodal line) grey - and the square's outline, all placed in the scene.
 */
export function sliceLinesObject(
    slice: MapSlicePlacement,
    halfSize: number,
    levels: number[],
    contours: SliceContours,
    colours: { positive: Rgb; negative: Rgb },
    alpha: number,
) {
    const { u, v, normal } = sliceAxes(slice.orientation);
    const [ox, oy, oz] = slice.origin;
    let points = 4 * 2;
    contours.segments.forEach(segments => { points += segments.length / 2; });
    const positions = new Float32Array(points * 3);
    const normals = new Float32Array(points * 3);
    const rgba = new Float32Array(points * 4);
    const indices = new Uint32Array(points);
    let p = 0;
    const add = (s: number, t: number, colour: Rgb) => {
        positions[p * 3] = ox + s * u[0] + t * v[0];
        positions[p * 3 + 1] = oy + s * u[1] + t * v[1];
        positions[p * 3 + 2] = oz + s * u[2] + t * v[2];
        normals.set(normal, p * 3);
        rgba[p * 4] = colour.r;
        rgba[p * 4 + 1] = colour.g;
        rgba[p * 4 + 2] = colour.b;
        rgba[p * 4 + 3] = alpha;
        indices[p] = p;
        p++;
    };
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [a * halfSize, b * halfSize]);
    for (let k = 0; k < 4; k++) {
        const [a, b] = [corners[k], corners[(k + 1) % 4]];
        add(a[0], a[1], SLICE_FRAME_COLOUR);
        add(b[0], b[1], SLICE_FRAME_COLOUR);
    }
    contours.segments.forEach((segments, l) => {
        const colour = levels[l] === 0 ? SLICE_NODAL_COLOUR : levels[l] > 0 ? colours.positive : colours.negative;
        for (let k = 0; k < segments.length; k += 2) add(segments[k], segments[k + 1], colour);
    });
    return {
        prim_types: [["LINES"]],
        useIndices: [[true]],
        idx_tri: [[indices]],
        vert_tri: [[positions]],
        norm_tri: [[normals]],
        col_tri: [[rgba]],
    };
}
