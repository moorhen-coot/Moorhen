/**
 * Reading a Gaussian Cube file.
 *
 * A cube holds a scalar sampled on a regular 3D grid, plus the atoms it was computed around. It is
 * not basis functions and not coefficients - there is nothing to evaluate, the numbers are the
 * field. That is why one of these can go straight to a contouring engine.
 *
 * THE FORMAT, AND THE THREE THINGS THAT CATCH PEOPLE
 *
 *     line 1, 2   free text
 *     line 3      natoms  ox oy oz
 *     lines 4-6   ni  vix viy viz          one per axis: voxel count, then the step vector
 *     natoms x    Z  charge  x y z
 *     [line]      only when natoms < 0: how many fields, then their indices
 *     rest        the values
 *
 * **Units are in the sign of the voxel counts.** Positive means the origin, the step vectors and
 * the atom coordinates are all in Bohr; negative means Angstrom. Nothing else in the file says so.
 * Psi4 writes positive, so its numbers are atomic units and must be converted before they mean
 * anything to a renderer working in Angstrom.
 *
 * **The step vectors are vectors, not spacings.** A point is `origin + i*v1 + j*v2 + k*v3`. They
 * are usually axis-aligned and equal, and code that assumes that works until it meets a file where
 * they are not.
 *
 * **The fastest index is the last one.** Values run `for i in ni: for j in nj: for k in nk`, so z
 * varies fastest and x slowest - the opposite of most map formats. Reading it the other way round
 * gives a field that looks plausible and is transposed.
 *
 * **A negative atom count means several fields share the grid.** An extra line after the atoms
 * says how many and gives their indices - orbital numbers, for a file of MOs - and the values are
 * then interleaved per grid point: all N of them for one point, then all N for the next. So field
 * m is at stride N, offset m. Gaussian's cubegen writes these when asked for several orbitals at
 * once; Psi4 writes one file per orbital. Every cube is read as a list of fields here, of length
 * one in the ordinary case, so the two forms take the same path.
 */

/** Bohr to Angstrom. The cube's own unit when its voxel counts are positive. */
export const BOHR_TO_ANGSTROM = 0.5291772109;

export interface CubeAtom {
    /** Atomic number. */
    element: number;
    /** The charge column, which most writers set to zero or to the nuclear charge. */
    charge: number;
    /** Position, in Angstrom. */
    position: [number, number, number];
}

/** One scalar field sampled on the grid. A file of molecular orbitals has several. */
export interface CubeField {
    /**
     * The index the file gives this field - an orbital number, for a file of MOs.
     *
     * Undefined for a single-field cube, which carries no index line and so names nothing.
     */
    index?: number;
    /** The field, in the file's own order: `(i * nj + j) * nk + k`, so the last axis is fastest. */
    values: Float32Array;
    /** True when the values are signed, which is what makes an orbital want two surfaces. */
    signed: boolean;
}

export interface CubeGrid {
    /** Voxel counts along each of the three axes. */
    counts: [number, number, number];
    /** The corner of the grid, in Angstrom. */
    origin: [number, number, number];
    /**
     * The three step vectors, in Angstrom. A point is `origin + i*axes[0] + j*axes[1] + k*axes[2]`.
     * Kept as vectors rather than reduced to three spacings so a skewed grid survives.
     */
    axes: [[number, number, number], [number, number, number], [number, number, number]];
    /** The atoms the field was computed around, in Angstrom. */
    atoms: CubeAtom[];
    /**
     * Every field in the file, de-interleaved. One entry for an ordinary cube; one per orbital
     * for the multi-field form.
     */
    fields: CubeField[];
    /** Both comment lines, kept because writers put useful things there. */
    comments: [string, string];
    /**
     * A contour level suggested by the file itself, when it offers one.
     *
     * Psi4 writes "Isocontour range for 85% of the density: (0.0790691,-0.0790455)" into the second
     * comment line. Taking it beats guessing: the right level for an orbital depends on how diffuse
     * it is, so a fixed default is wrong for every orbital but one.
     */
    suggestedLevel?: number;
}

/** Thrown for a file this reader will not guess at. */
export class CubeFormatError extends Error {}

/**
 * The level Psi4 names in its second comment line, if it is there.
 *
 * It writes a pair - "(0.0790691,-0.0790455)" - one level for each lobe. Moorhen contours at a
 * single magnitude, taken as +level and -level, so one of the two has to go.
 *
 * The *smaller* magnitude is the one to keep. The pair is not quite symmetric, and taking the
 * larger puts the negative level past the field's own minimum: the negative lobe then has no
 * surface at all and the orbital is drawn as though it had only one half. Taking the smaller
 * draws both, very slightly further out on one side than Psi4 intended.
 */
export const suggestedLevelFromComment = (comment: string): number | undefined => {
    const match = comment.match(/\(\s*(-?[\d.eE+-]+)\s*,\s*(-?[\d.eE+-]+)\s*\)/);
    if (!match) return undefined;
    const magnitudes = [Number(match[1]), Number(match[2])]
        .filter(Number.isFinite)
        .map(Math.abs)
        .filter(value => value > 0);
    if (magnitudes.length === 0) return undefined;
    return Math.min(...magnitudes);
};

/**
 * What to call the map made from one field of a cube.
 *
 * A single-field file has one thing in it and the file's own name is the best name for it - that
 * is what the person called it, and for Psi4 it already carries the orbital's label
 * ("Psi_a_5_1-B1"). Nothing is appended, because there is nothing to distinguish it from.
 *
 * A multi-field file names its own fields: the index line that the format requires after the atoms
 * gives an orbital number for each. Those are the real names and are used in preference to
 * anything invented here - a file of orbitals 5 and 6 should say 5 and 6, not 1 and 2. Counting
 * from one is only the fallback for a file that somehow numbers nothing.
 *
 * The file's name stays as a prefix either way, because bare orbital numbers would collide the
 * moment a second cube is opened.
 */
export const cubeFieldName = (
    fileName: string, fieldCount: number, position: number, index?: number,
): string => {
    const base = fileName.replace(/\.(cube|cub)$/i, "");
    if (fieldCount <= 1) return base;
    return `${base} ${Number.isFinite(index) ? index : position + 1}`;
};

/**
 * Parse a cube file.
 *
 * @param text the whole file.
 * @throws CubeFormatError for a file that is truncated or not a cube at all.
 */
export function parseCubeFile(text: string): CubeGrid {
    const lines = text.split(/\r?\n/);
    if (lines.length < 7) {
        throw new CubeFormatError("Not a cube file: fewer than seven lines.");
    }

    const comments: [string, string] = [lines[0] ?? "", lines[1] ?? ""];

    const countsLine = lines[2].trim().split(/\s+/);
    const declaredAtoms = Number(countsLine[0]);
    if (!Number.isFinite(declaredAtoms)) {
        throw new CubeFormatError("Not a cube file: no atom count on line 3.");
    }
    const atomCount = Math.abs(declaredAtoms);

    const rawOrigin = countsLine.slice(1, 4).map(Number) as [number, number, number];
    if (rawOrigin.length !== 3 || !rawOrigin.every(Number.isFinite)) {
        throw new CubeFormatError("Not a cube file: no origin on line 3.");
    }

    const rawCounts: number[] = [];
    const rawAxes: [number, number, number][] = [];
    for (let axis = 0; axis < 3; axis++) {
        const parts = lines[3 + axis].trim().split(/\s+/).map(Number);
        if (parts.length < 4 || !parts.slice(0, 4).every(Number.isFinite)) {
            throw new CubeFormatError(`Not a cube file: axis line ${axis + 1} is malformed.`);
        }
        rawCounts.push(parts[0]);
        rawAxes.push([parts[1], parts[2], parts[3]]);
    }

    // The one place the units are stated. A negative count means the file is already in Angstrom;
    // the count itself is used as its magnitude either way.
    const inBohr = rawCounts[0] > 0;
    const toAngstrom = inBohr ? BOHR_TO_ANGSTROM : 1;
    const counts = rawCounts.map(Math.abs) as [number, number, number];
    if (counts.some(count => !Number.isInteger(count) || count < 1)) {
        throw new CubeFormatError("Not a cube file: a voxel count is not a positive integer.");
    }

    const atoms: CubeAtom[] = [];
    for (let i = 0; i < atomCount; i++) {
        const parts = lines[6 + i]?.trim().split(/\s+/).map(Number);
        if (!parts || parts.length < 5 || !parts.slice(0, 5).every(Number.isFinite)) {
            throw new CubeFormatError(`Not a cube file: atom line ${i + 1} is malformed.`);
        }
        atoms.push({
            element: parts[0],
            charge: parts[1],
            position: [parts[2] * toAngstrom, parts[3] * toAngstrom, parts[4] * toAngstrom],
        });
    }

    let firstValueLine = 6 + atomCount;

    // A negative atom count is the file saying it carries several fields. The line that follows
    // the atoms gives the count and then one index per field - orbital numbers, for MOs.
    let fieldIndices: (number | undefined)[] = [undefined];
    if (declaredAtoms < 0) {
        const parts = lines[firstValueLine]?.trim().split(/\s+/).map(Number) ?? [];
        const fieldCount = parts[0];
        if (!Number.isInteger(fieldCount) || fieldCount < 1) {
            throw new CubeFormatError(
                "Not a cube file: a negative atom count promises a field-index line and there is "
                + "none.");
        }
        // The indices may run on to further lines when there are many of them, so they are taken
        // from the token stream rather than from this one line.
        const indices: number[] = parts.slice(1).filter(Number.isFinite);
        let line = firstValueLine;
        while (indices.length < fieldCount && ++line < lines.length) {
            for (const token of lines[line].trim().split(/\s+/)) {
                if (indices.length >= fieldCount) break;
                const value = Number(token);
                if (Number.isFinite(value) && token !== "") indices.push(value);
            }
        }
        if (indices.length < fieldCount) {
            throw new CubeFormatError(
                `Truncated cube: ${fieldCount} fields promised and ${indices.length} named.`);
        }
        fieldIndices = indices;
        firstValueLine = line + 1;
    }

    const fieldCount = fieldIndices.length;
    const points = counts[0] * counts[1] * counts[2];
    const expected = points * fieldCount;

    // De-interleaved on the way in. The file holds all of a point's fields together, so a single
    // pass fills every field at once and nothing is read twice.
    const fields: CubeField[] = fieldIndices.map(index => ({
        index,
        values: new Float32Array(points),
        signed: false,
    }));

    let written = 0;
    for (let line = firstValueLine; line < lines.length && written < expected; line++) {
        const trimmed = lines[line].trim();
        if (trimmed === "") continue;
        for (const token of trimmed.split(/\s+/)) {
            if (written >= expected) break;
            const value = Number(token);
            if (!Number.isFinite(value)) {
                throw new CubeFormatError(`Not a cube file: "${token}" is not a number.`);
            }
            const field = fields[written % fieldCount];
            field.values[(written / fieldCount) | 0] = value;
            if (value < 0) field.signed = true;
            written++;
        }
    }
    if (written < expected) {
        throw new CubeFormatError(
            `Truncated cube: the header promises ${expected} values`
            + `${fieldCount > 1 ? ` (${points} points x ${fieldCount} fields)` : ""}`
            + ` and the file holds ${written}.`);
    }

    return {
        counts,
        origin: rawOrigin.map(value => value * toAngstrom) as [number, number, number],
        axes: rawAxes.map(axis => axis.map(value => value * toAngstrom)) as CubeGrid["axes"],
        atoms,
        fields,
        comments,
        suggestedLevel: suggestedLevelFromComment(comments[1]),
    };
}
