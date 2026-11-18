/**
 * Turning a parsed cube grid into a CCP4/MRC map, in memory.
 *
 * WHY GO THROUGH A MAP AT ALL
 *
 * Moorhen already contours maps: Coot meshes them, the draw settings and colours already exist,
 * sessions already save them, and a difference map already draws a plus and a minus surface as one
 * object. A cube is the same thing - a scalar on a regular grid - so writing one out as a map buys
 * all of that instead of growing a second contouring path that would have to be kept in step.
 *
 * THREE THINGS THAT HAVE TO BE RIGHT, AND LOOK FINE WHEN THEY ARE NOT
 *
 * **The transpose.** A cube runs its last axis fastest; an MRC runs its *column* axis fastest. The
 * header can describe either, by permuting MAPC/MAPR/MAPS - which would let the data be copied
 * untouched. That is not done here. Plenty of code reads NX/NY/NZ as if they were x, y and z and
 * ignores the permutation, so a file that needs it is a file that half the world misreads. The
 * data is physically reordered into x-fastest and the mapping left at the identity, which is the
 * arrangement nothing can get wrong.
 *
 * **The cell.** MRC states a unit cell and a sampling, and the spacing is cell/sampling. With the
 * sampling set to the voxel counts, the cell is counts x step, so the two divide back to the step
 * the cube asked for. The angles come from the step vectors, so a skewed cube stays skewed.
 *
 * **The origin.** MRC can say where the grid sits in two ways - NXSTART/NYSTART/NZSTART in whole
 * voxels, or the ORIGIN words in angstrom - and readers disagree about which wins. Writing both
 * with different answers is the usual way a map ends up half a cell from its molecule. So the
 * origin is snapped to a whole number of voxels and *both* are written from that one snapped
 * value: whichever a reader honours, it gets the same answer. The snap moves the map by at most
 * half a voxel, which for these grids is a few hundredths of an angstrom, and `originShift`
 * reports it so a caller can check rather than trust.
 *
 * AND ONE THING THE MAP CANNOT SAY AT ALL
 *
 * A map is a crystal. Coot contours a sphere about a point and fills it, taking the cell to repeat
 * for ever - which for a 4 angstrom orbital box means asking for anything past 2 angstrom returns
 * the orbital *and its periodic images*, interleaved into a mess of surfaces that looks like a
 * badly positioned map rather than like a repeat. Nothing in the format can turn that off; the
 * only defence is to never ask for more than one cell's worth.
 *
 * So the conversion reports `safeRadius`, half the narrowest width of the cell less a voxel, and
 * that is the radius the map must be contoured at. A cube box is mostly empty - the writer pads it
 * around the molecule - so this is usually plenty. When it is not, the grid is padded with zeros
 * until it is: `padding` says by how much. Padding costs memory, so it is bounded, and
 * `clipsSignificantDensity` admits it when the bound bites.
 */

import type { CubeGrid } from "./cubeFile";

/** Bytes before the data in an MRC file. */
export const MRC_HEADER_BYTES = 1024;

/** MODE 2: 32-bit float, which is what a cube's values are. */
const MRC_MODE_FLOAT32 = 2;

/** MRC2014. */
const MRC_VERSION = 20140;

/**
 * How far a cell angle is moved off 90 degrees to stop Coot calling the map an EM map.
 *
 * Coot classifies a map as EM when its spacegroup is 0 or 1 *and* all three cell angles are 90,
 * and it will not let an EM map be a difference map - `read_ccp4_map` takes the flag and drops it
 * on the floor. A difference map is how an orbital gets its two lobes in two colours, so a cube
 * written honestly as P1 with right angles can only ever draw half of itself.
 *
 * Bisecting the header showed the tolerance sits between 1e-4 and 1e-3 degrees, so this is a
 * little past it with room to spare. Over a 6 angstrom cell it displaces the far corner by about
 * 5e-4 angstrom: a hundredth of the voxel spacing, and three orders below the half-voxel the
 * origin is already snapped by. The alternative was to claim a spacegroup the grid does not have,
 * which would hand Coot symmetry operators to go with it.
 *
 * It is a lie in the header, and a fragile one - if Coot ever tightens the test we quietly go back
 * to drawing one lobe. That failure is visible and harmless, which is why this is the lie chosen.
 */
const EM_ANGLE_NUDGE = 0.005;

/** Within this of 90 degrees, Coot will call the cell orthogonal. */
const RIGHT_ANGLE_TOLERANCE = 0.001;

export interface CubeMapResult {
    /** The file, ready for Coot's read_ccp4_map. */
    buffer: ArrayBuffer;
    /** How far the grid moved when its origin was snapped to whole voxels, in angstrom. */
    originShift: [number, number, number];
    /** Field statistics, as written into the header. */
    statistics: { min: number; max: number; mean: number; rms: number };
    /** The centre of the map, in angstrom - where the contouring sphere belongs. */
    centre: [number, number, number];
    /**
     * The largest radius that can be contoured about `centre` without periodic images appearing.
     *
     * Contour past this and the cell repeats. There is no setting that prevents it, so this is a
     * limit rather than a suggestion.
     */
    safeRadius: number;
    /** Voxels of zero added at each end of each axis to make `safeRadius` reach the density. */
    padding: [number, number, number];
    /** True when the padding budget ran out and `safeRadius` still does not reach all of it. */
    clipsSignificantDensity: boolean;
}

/**
 * How much padding may be added, as a multiple of the original point count.
 *
 * An orbital box is mostly empty, so the padding needed is usually none at all. The bound is here
 * for the file that is the other way round - a tight box around a diffuse orbital - where padding
 * to reach every last voxel could multiply a large grid into something a browser cannot hold. Past
 * this, the outermost density is clipped instead, which is at least visibly a clip.
 */
const PADDING_BUDGET = 3;

/**
 * How much further than the density at the suggested level the sphere should reach.
 *
 * The surface grows as the level comes down, so a sphere sized exactly to the suggested level
 * would start clipping the moment anyone turned the level down. A quarter again is room for a
 * good deal of that without padding every grid out of proportion.
 */
const RADIUS_HEADROOM = 1.25;

const length = (v: readonly number[]) => Math.hypot(v[0], v[1], v[2]);

const cross = (a: readonly number[], b: readonly number[]): [number, number, number] => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
];

const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * The perpendicular distance between each pair of opposite faces of the cell.
 *
 * Not the edge lengths: for a skewed cell those overstate how far you can go before leaving the
 * box, and it is leaving the box that brings the periodic images in. Half the smallest of these is
 * the radius of the largest sphere the cell contains.
 */
const cellWidths = (
    a: readonly number[], b: readonly number[], c: readonly number[],
): [number, number, number] => {
    const volume = Math.abs(dot(a, cross(b, c)));
    if (volume === 0) return [0, 0, 0];
    return [
        volume / length(cross(b, c)),
        volume / length(cross(c, a)),
        volume / length(cross(a, b)),
    ];
};

/** The angle between two vectors, in degrees, as MRC wants its cell angles. */
const angleBetween = (a: readonly number[], b: readonly number[]): number => {
    const la = length(a), lb = length(b);
    if (la === 0 || lb === 0) return 90;
    const cosine = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb);
    return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
};

/**
 * Write one field of a cube grid as an MRC map.
 *
 * @param grid the parsed cube.
 * @param values the field to write - one of `grid.fields[n].values`, so a multi-orbital cube can
 *     be written once per orbital without re-parsing.
 * @param options.label a line of provenance, stored in the header where a person will see it.
 * @param options.padding zero padding to add at each end of each axis, overriding what the field
 *     would choose for itself. Mostly for tests, which want the grid they wrote and not one grown
 *     underneath them.
 * @param options.asDifferenceMap the map will be loaded as a difference map, to draw its positive
 *     and negative lobes as one object. Coot will only allow that for a cell it does not read as
 *     orthogonal, so this nudges a cell angle - see EM_ANGLE_NUDGE.
 */
export function cubeFieldToMrc(
    grid: CubeGrid,
    values: Float32Array,
    options: {
        label?: string;
        padding?: [number, number, number];
        asDifferenceMap?: boolean;
    } = {},
): CubeMapResult {
    const { label = "Converted from a Gaussian Cube by Moorhen" } = options;
    const [ox, oy, oz] = grid.counts;
    const originalPoints = ox * oy * oz;
    if (values.length !== originalPoints) {
        throw new Error(
            `Field has ${values.length} values and the grid has ${originalPoints} points.`);
    }

    const steps = grid.axes.map(length) as [number, number, number];
    const { padding, clipsSignificantDensity } = options.padding
        ? { padding: options.padding, clipsSignificantDensity: false }
        : choosePadding(grid, values, steps);
    const [nx, ny, nz] = [ox + 2 * padding[0], oy + 2 * padding[1], oz + 2 * padding[2]];
    const points = nx * ny * nz;

    // Reordered to x-fastest, and into the middle of the padded grid in the same pass. The cube's
    // index is (x * ny + y) * nz + z; MRC's is ((z * ny) + y) * nx + x. Done as a copy rather than
    // by permuting the axis mapping - see above. Everything the copy does not reach stays zero,
    // which is what the padding is.
    const reordered = new Float32Array(points);
    for (let x = 0; x < ox; x++) {
        for (let y = 0; y < oy; y++) {
            const from = (x * oy + y) * oz;
            for (let z = 0; z < oz; z++) {
                const px = x + padding[0], py = y + padding[1], pz = z + padding[2];
                reordered[(pz * ny + py) * nx + px] = values[from + z];
            }
        }
    }

    // Padding is symmetric, so the corner moves back by that many steps along each axis.
    const origin = [0, 1, 2].map(component =>
        grid.origin[component]
        - padding[0] * grid.axes[0][component]
        - padding[1] * grid.axes[1][component]
        - padding[2] * grid.axes[2][component]) as [number, number, number];

    let min = Infinity, max = -Infinity, sum = 0;
    for (let i = 0; i < points; i++) {
        const value = reordered[i];
        if (value < min) min = value;
        if (value > max) max = value;
        sum += value;
    }
    const mean = points > 0 ? sum / points : 0;
    let squares = 0;
    for (let i = 0; i < points; i++) {
        const d = reordered[i] - mean;
        squares += d * d;
    }
    const rms = points > 0 ? Math.sqrt(squares / points) : 0;
    if (!Number.isFinite(min)) { min = 0; max = 0; }

    // The cell is the sampling times the step, so cell/sampling gives the step back exactly.
    const cell: [number, number, number] = [nx * steps[0], ny * steps[1], nz * steps[2]];
    const angles: [number, number, number] = [
        angleBetween(grid.axes[1], grid.axes[2]),   // alpha, between b and c
        angleBetween(grid.axes[0], grid.axes[2]),   // beta,  between a and c
        angleBetween(grid.axes[0], grid.axes[1]),   // gamma, between a and b
    ];

    // Only when the cell would otherwise read as orthogonal, and only when the two lobes are
    // wanted. A cube that is already skewed needs nothing, and a field that is never negative is
    // not a difference map, so neither is touched.
    if (options.asDifferenceMap
        && angles.every(angle => Math.abs(angle - 90) < RIGHT_ANGLE_TOLERANCE)) {
        angles[0] = 90 - EM_ANGLE_NUDGE;
    }

    // One snapped origin, written into both of the places a reader might look.
    const starts = [0, 1, 2].map(axis =>
        steps[axis] > 0 ? Math.round(origin[axis] / steps[axis]) : 0) as [number, number, number];
    const snapped = [0, 1, 2].map(axis => starts[axis] * steps[axis]) as [number, number, number];
    const originShift = [0, 1, 2].map(axis => snapped[axis] - origin[axis]) as
        [number, number, number];

    // The centre of the sampled points: counts - 1 steps, halved. The sphere goes here.
    const centre = [0, 1, 2].map(component =>
        snapped[component]
        + 0.5 * ((nx - 1) * grid.axes[0][component]
               + (ny - 1) * grid.axes[1][component]
               + (nz - 1) * grid.axes[2][component])) as [number, number, number];

    // Half the narrowest width of the cell, less a voxel so the sphere cannot touch the face.
    const widths = cellWidths(
        grid.axes[0].map(v => v * nx), grid.axes[1].map(v => v * ny), grid.axes[2].map(v => v * nz));
    const safeRadius = Math.max(0, Math.min(...widths) / 2 - Math.max(...steps));

    const buffer = new ArrayBuffer(MRC_HEADER_BYTES + points * 4);
    const view = new DataView(buffer);
    const little = true;

    view.setInt32(0, nx, little);               // NC - columns, the fastest axis
    view.setInt32(4, ny, little);               // NR
    view.setInt32(8, nz, little);               // NS
    view.setInt32(12, MRC_MODE_FLOAT32, little);
    view.setInt32(16, starts[0], little);       // NXSTART
    view.setInt32(20, starts[1], little);
    view.setInt32(24, starts[2], little);
    view.setInt32(28, nx, little);              // MX - sampling, equal to the counts here
    view.setInt32(32, ny, little);
    view.setInt32(36, nz, little);
    view.setFloat32(40, cell[0], little);       // CELLA
    view.setFloat32(44, cell[1], little);
    view.setFloat32(48, cell[2], little);
    view.setFloat32(52, angles[0], little);     // CELLB
    view.setFloat32(56, angles[1], little);
    view.setFloat32(60, angles[2], little);
    view.setInt32(64, 1, little);               // MAPC = x, the identity mapping
    view.setInt32(68, 2, little);               // MAPR = y
    view.setInt32(72, 3, little);               // MAPS = z
    view.setFloat32(76, min, little);
    view.setFloat32(80, max, little);
    view.setFloat32(84, mean, little);
    view.setInt32(88, 1, little);               // ISPG - P1, which is what a molecular grid is
    view.setInt32(92, 0, little);               // NSYMBT - no symmetry records follow
    view.setInt32(108, MRC_VERSION, little);
    view.setFloat32(196, snapped[0], little);   // ORIGIN, agreeing with NXSTART above
    view.setFloat32(200, snapped[1], little);
    view.setFloat32(204, snapped[2], little);
    for (let i = 0; i < 4; i++) {
        view.setUint8(208 + i, "MAP ".charCodeAt(i));
    }
    // Little-endian machine stamp, which is what readMRCHeader keys its byte order off.
    view.setUint8(212, 0x44);
    view.setUint8(213, 0x44);
    view.setUint8(214, 0x00);
    view.setUint8(215, 0x00);
    view.setFloat32(216, rms, little);
    view.setInt32(220, 1, little);              // NLABL
    const text = label.slice(0, 80);
    for (let i = 0; i < text.length; i++) {
        view.setUint8(224 + i, text.charCodeAt(i) & 0x7f);
    }

    new Float32Array(buffer, MRC_HEADER_BYTES).set(reordered);

    return {
        buffer, originShift, centre, safeRadius, padding, clipsSignificantDensity,
        statistics: { min, max, mean, rms },
    };
}

/**
 * How much zero padding this field needs for its density to fit inside the contouring sphere.
 *
 * The sphere can only be as large as the cell's inscribed sphere, so the question is whether that
 * reaches the outermost density worth drawing. Usually it does - a cube writer pads the box around
 * the molecule, and an orbital occupies a small part of what it is given - and then this adds
 * nothing. When it does not, the cell is grown with zeros until it does, up to a budget.
 *
 * Measured from the field rather than from the box so an empty corner costs nothing.
 */
export const choosePadding = (
    grid: CubeGrid, values: Float32Array, steps: [number, number, number],
): { padding: [number, number, number]; clipsSignificantDensity: boolean } => {
    const [nx, ny, nz] = grid.counts;
    const none: [number, number, number] = [0, 0, 0];

    let peak = 0;
    for (let i = 0; i < values.length; i++) {
        const magnitude = Math.abs(values[i]);
        if (magnitude > peak) peak = magnitude;
    }
    // The level the map will actually be drawn at, which is the density that has to fit.
    const threshold = grid.suggestedLevel && grid.suggestedLevel > 0 ? grid.suggestedLevel : peak / 2;
    if (!(threshold > 0) || peak < threshold) return { padding: none, clipsSignificantDensity: false };

    // The farthest any significant voxel sits from the centre of the grid. Done in voxel offsets
    // from the centre, then converted with the axis vectors so a skewed grid is measured properly.
    let needed = 0;
    for (let x = 0; x < nx; x++) {
        for (let y = 0; y < ny; y++) {
            const base = (x * ny + y) * nz;
            for (let z = 0; z < nz; z++) {
                if (Math.abs(values[base + z]) < threshold) continue;
                const [dx, dy, dz] = [x - (nx - 1) / 2, y - (ny - 1) / 2, z - (nz - 1) / 2];
                const offset = [0, 1, 2].map(component =>
                    dx * grid.axes[0][component]
                    + dy * grid.axes[1][component]
                    + dz * grid.axes[2][component]);
                const distance = length(offset);
                if (distance > needed) needed = distance;
            }
        }
    }

    const widthsOf = (counts: readonly number[]) => cellWidths(
        grid.axes[0].map(v => v * counts[0]),
        grid.axes[1].map(v => v * counts[1]),
        grid.axes[2].map(v => v * counts[2]));
    const radiusOf = (counts: readonly number[]) =>
        Math.min(...widthsOf(counts)) / 2 - Math.max(...steps);

    const counts: [number, number, number] = [nx, ny, nz];
    const padding: [number, number, number] = [0, 0, 0];
    const budget = PADDING_BUDGET * nx * ny * nz;
    const target = needed * RADIUS_HEADROOM;

    // Grown one voxel at a time, on the narrowest axis - which is the one holding the radius down.
    // Slower than solving it, but the loop stops the moment the sphere reaches, and it is the same
    // answer whether or not the axes are skewed.
    while (radiusOf(counts) < target) {
        const widths = widthsOf(counts);
        const narrowest = widths.indexOf(Math.min(...widths));
        const grown: [number, number, number] = [...counts] as [number, number, number];
        grown[narrowest] += 2;
        if (grown[0] * grown[1] * grown[2] > budget) break;
        counts[narrowest] = grown[narrowest];
        padding[narrowest] += 1;
    }

    // Reported against the density itself, not against the headroom: running out of budget before
    // the headroom is filled costs nothing visible, and saying so every time would be noise.
    return { padding, clipsSignificantDensity: radiusOf(counts) < needed };
};
