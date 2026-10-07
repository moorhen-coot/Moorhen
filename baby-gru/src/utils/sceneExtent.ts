/**
 * How big the scene is, for the controls that have to span it.
 *
 * The side-on clip/fog/blur widget draws a scale across the whole scene, and the initial clip
 * and fog distances are derived from the same number. Both took it from the bounding box of the
 * atoms, which has two problems: a scene with no molecule in it - meshes, primitives, a map on
 * its own - contributed nothing and fell back to a span of 9999, making the widget useless and
 * the initial clip values absurd; and even with a molecule present, anything else in the scene
 * was ignored however large it was.
 *
 * What a map contributes is the interesting case. A contoured map is drawn within a radius of
 * the view centre, and that radius is a display setting the user changes often. Letting it set
 * the span would make the widget's scale move underfoot every time the radius changed, so the
 * contour radius is deliberately not an input here. A map contributes its unit cell instead:
 * known from the file header, independent of how much of it is currently drawn, and for an EM
 * P1 map the cell is simply the box the map occupies. For a crystallographic map it is a
 * defensible stand-in for an extent that is formally unbounded - the map repeats forever, so
 * there is no true size to find, and a cell is at least predictable.
 *
 * Positions and sizes are kept apart on purpose. Atom coordinates and 3D object centres are in
 * the same space and can be combined into one bounding box, so two molecules far apart give a
 * span covering both. A map's cell centre is stored negated, in a convention this module has no
 * business guessing at, so maps contribute a size only. The result is the larger of the two,
 * which can overstate the span when a large map sits beside a small molecule, and never
 * understates it - the safer direction for a control whose job is to reach everything.
 */

/** The span used when nothing in the scene has a determinable size. Roughly a small protein. */
export const EMPTY_SCENE_SPAN = 50.0;

export interface Bounds {
    min: [number, number, number];
    max: [number, number, number];
}

/** A bounding box over points, or null when there are none. */
export const boundsOfPoints = (points: Iterable<[number, number, number]>): Bounds | null => {
    let found = false;
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (const p of points) {
        if (!Number.isFinite(p[0]) || !Number.isFinite(p[1]) || !Number.isFinite(p[2])) continue;
        found = true;
        for (let i = 0; i < 3; i++) {
            if (p[i] < min[i]) min[i] = p[i];
            if (p[i] > max[i]) max[i] = p[i];
        }
    }
    return found ? { min, max } : null;
};

/** The box a thing of the given radius about a centre occupies. */
export const boundsAround = (centre: readonly number[], radius: number): Bounds => {
    const r = Math.max(0, radius);
    return {
        min: [centre[0] - r, centre[1] - r, centre[2] - r],
        max: [centre[0] + r, centre[1] + r, centre[2] + r],
    };
};

/** The smallest box containing all of them, or null when the list is empty. */
export const unionBounds = (all: (Bounds | null)[]): Bounds | null => {
    let result: Bounds | null = null;
    for (const b of all) {
        if (!b) continue;
        if (!result) {
            result = { min: [...b.min], max: [...b.max] };
            continue;
        }
        for (let i = 0; i < 3; i++) {
            if (b.min[i] < result.min[i]) result.min[i] = b.min[i];
            if (b.max[i] > result.max[i]) result.max[i] = b.max[i];
        }
    }
    return result;
};

/** The diagonal of a box, which is the span the old code computed from the atom bounds. */
export const spanOfBounds = (b: Bounds | null): number => {
    if (!b) return 0;
    return Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]);
};

/**
 * The diagonal of a unit cell, which is what a map contributes.
 *
 * Takes the cell edge lengths only. Treating the cell as a box overstates a strongly
 * non-orthogonal cell slightly, which is the harmless direction, and avoids making this depend
 * on the angle convention.
 */
export const spanOfCell = (cell: { a?: number, b?: number, c?: number } | null | undefined): number => {
    if (!cell) return 0;
    const a = Number.isFinite(cell.a) ? cell.a : 0;
    const b = Number.isFinite(cell.b) ? cell.b : 0;
    const c = Number.isFinite(cell.c) ? cell.c : 0;
    return Math.hypot(a, b, c);
};

/**
 * What a map contributes to the scene span: its cell, and nothing else.
 *
 * Written as a function taking the whole map rather than as a bare call to spanOfCell, so that
 * the rule "the contour radius is not an input" is something a test can hold the code to. The
 * radius is on the object this receives and is deliberately never read.
 */
export const mapSpan = (map: {
    cell?: { a?: number, b?: number, c?: number } | null,
    suggestedRadius?: number | null,
    mapRadius?: number | null,
} | null | undefined): number => spanOfCell(map?.cell);

export interface SceneExtentInput {
    /** Atom positions and 3D object boxes, all in one coordinate space. */
    positioned?: (Bounds | null)[];
    /** Standalone sizes, for things whose position is not safely comparable. Map cells. */
    sizes?: number[];
}

/**
 * The span of the whole scene.
 *
 * Never returns zero or less: a single atom, or a scene holding only degenerate geometry, would
 * otherwise give a widget with no range at all and initial clip distances of nothing, which is
 * the same class of unusable as the 9999 this replaces.
 */
export const sceneSpan = ({ positioned = [], sizes = [] }: SceneExtentInput): number => {
    const fromPositions = spanOfBounds(unionBounds(positioned));
    const largestSize = sizes.reduce((best, s) => (Number.isFinite(s) && s > best ? s : best), 0);
    const span = Math.max(fromPositions, largestSize);
    return span > 0 ? span : EMPTY_SCENE_SPAN;
};
