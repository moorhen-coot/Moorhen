/**
 * How big each golden hover ball is. The hover highlight (getResidueHighlightBuffers) is one
 * PERFECT_SPHERES instance per hovered atom, all made at HOVER_BALL_SIZE. That is right over
 * thin sticks, but an atom drawn as a big sphere - a VdW ball, an ion in bonds mode - swallows
 * it. So each ball is grown to the biggest sphere drawn at its atom, plus a margin.
 *
 * A sphere is any instance whose three sizes are equal: PERFECT_SPHERES (VdW balls), and the
 * instanced triangle spheres Coot's bonds meshes draw atoms with (its "atoms" geometry, which
 * CootWorker leaves as TRIANGLES - only "spherical-atoms" become PERFECT_SPHERES). Bond
 * cylinders also start at atoms, but their length makes their sizes unequal.
 *
 * This used to be one size for the whole highlight, taken from the first sphere of a buffer
 * that held all the hovered atoms: in VdW spheres one atom's radius did for all (a carbon's
 * ball came out the size of a hydrogen's, inside the carbon), and an ion among small spheres
 * was missed because the buffer's first sphere was small.
 */
import type { DisplayBuffer } from './displayBuffer';

/** The size the hover highlight is made at: a ball over a stick-sized atom. */
export const HOVER_BALL_SIZE = 0.3;
/** Spheres up to this size are bond-mode atoms, which HOVER_BALL_SIZE already covers. */
export const STICK_ATOM_SIZE = 0.27;
/** How far a ball reaches past a bigger sphere. */
export const HOVER_BALL_MARGIN = 0.4;
/** How close a sphere's centre must be to the atom to be its sphere. */
const SAME_PLACE = 1e-3;
/** How nearly equal an instance's three sizes must be for it to be a sphere. */
const ROUND = 1e-3;

type SphereSource = Pick<DisplayBuffer, "bufferTypes" | "triangleInstanceOrigins" | "triangleInstanceSizes"> &
    Partial<Pick<DisplayBuffer, "visible" | "isHoverBuffer">>;

/**
 * The size of the ball for each atom at `origins` (x, y, z per atom), as instance sizes (three
 * per atom): HOVER_BALL_SIZE, or - where a visible buffer draws a sphere there bigger than a
 * stick atom - that sphere's size plus HOVER_BALL_MARGIN.
 */
export function hoverBallSizes(origins: ArrayLike<number>, displayBuffers: readonly SphereSource[]): Float32Array {
    const count = Math.floor(origins.length / 3);
    const drawn = new Float32Array(count);
    if (count === 0) return new Float32Array(0);

    // Only spheres in the hovered atoms' box can be theirs.
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < count; i++) {
        for (let k = 0; k < 3; k++) {
            lo[k] = Math.min(lo[k], origins[3 * i + k] - SAME_PLACE);
            hi[k] = Math.max(hi[k], origins[3 * i + k] + SAME_PLACE);
        }
    }

    for (const buffer of displayBuffers) {
        if (!buffer || buffer.isHoverBuffer || buffer.visible === false) continue;
        buffer.bufferTypes?.forEach((type, j) => {
            if (type !== "PERFECT_SPHERES" && type !== "TRIANGLES") return;
            const centres = buffer.triangleInstanceOrigins?.[j];
            const sizes = buffer.triangleInstanceSizes?.[j];
            if (!centres || !sizes) return;
            const spheres = Math.min(Math.floor(centres.length / 3), Math.floor(sizes.length / 3));
            for (let s = 0; s < spheres; s++) {
                const x = centres[3 * s], y = centres[3 * s + 1], z = centres[3 * s + 2];
                if (x < lo[0] || x > hi[0] || y < lo[1] || y > hi[1] || z < lo[2] || z > hi[2]) continue;
                const sx = Math.abs(sizes[3 * s]), sy = Math.abs(sizes[3 * s + 1]), sz = Math.abs(sizes[3 * s + 2]);
                if (Math.abs(sx - sy) > ROUND || Math.abs(sx - sz) > ROUND) continue;
                const size = sx;
                for (let i = 0; i < count; i++) {
                    if (Math.abs(origins[3 * i] - x) < SAME_PLACE && Math.abs(origins[3 * i + 1] - y) < SAME_PLACE
                        && Math.abs(origins[3 * i + 2] - z) < SAME_PLACE) {
                        drawn[i] = Math.max(drawn[i], size);
                    }
                }
            }
        });
    }

    // Sizes come as float32: a 0.27 sphere is a hair over 0.27.
    const stick = Math.fround(STICK_ATOM_SIZE);
    const result = new Float32Array(3 * count);
    for (let i = 0; i < count; i++) {
        result.fill(drawn[i] > stick ? drawn[i] + HOVER_BALL_MARGIN : HOVER_BALL_SIZE, 3 * i, 3 * i + 3);
    }
    return result;
}
