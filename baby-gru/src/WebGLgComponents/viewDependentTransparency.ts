/**
 * Transparent surfaces that thicken where you see them edge-on.
 *
 * A translucent map surface drawn at a flat opacity reads as a sheet of coloured glass. The same
 * surface with this on reads as a solid you are looking *into*, because the density follows the
 * angle: face-on you see through it, at the silhouette you are looking along the shell and it
 * closes up.
 *
 * THE SHELL
 *
 * It is tempting to treat this as a Fresnel term and fit a power curve to it. It is simpler than
 * that, and physical. A shell of thickness t seen at angle θ from its normal is t/cos θ of
 * material to look through, and Beer-Lambert turns a path into a transmittance. Writing the
 * face-on opacity as `base`, the absorption that produces it is fixed by `1 - base = exp(-σt)`,
 * so at any other angle:
 *
 *     a = 1 - (1 - base) ^ (1 / |N·V|)
 *
 * AND THEN THE FIFTH POWER, WHICH IS THE WHOLE TRICK
 *
 * Used as it stands, that is disappointing at any ordinary opacity. The silhouette closes up
 * perfectly well - the trouble is that the middle closes up too. At 0.3 opacity the surface is
 * already 0.59 at |N·V|=0.4, and through both walls of a closed shell 0.83; there is nothing left
 * to see into, so the rim has nothing to stand against. Only around 0.1 does the bulk stay glassy
 * enough for the effect to read, which is a setting nobody would find without being told.
 *
 * Raising the result to the fifth power fixes it, and does so in the one way that costs nothing at
 * the rim: where `a` is already near 1 the power leaves it alone, and everywhere else it collapses
 * towards zero. The bulk becomes glass and the silhouette stays solid.
 *
 *     opacity   |N·V|=1    0.7     0.4     0.2    0.05
 *        0.3      0.002   0.010   0.072   0.399   0.996
 *        0.5      0.031   0.098   0.378   0.853   1.000
 *        0.7      0.168   0.373   0.777   0.988   1.000
 *
 * This is Coot's, from meshes.shader - `do_view_dependent_transparancy`, misspelling and all -
 * and Moorhen matches it deliberately rather than by coincidence. The same figure made in either
 * program at the same opacity should come out the same, which for a Coot-family program is worth
 * more than a curve of our own that is arguably gentler.
 *
 * IT IS A SWITCH, NOT A STRENGTH
 *
 * There is nothing to interpolate towards. The effect has exactly one free parameter - the optical
 * depth - and the opacity slider is already it: the whole curve depends on base only through
 * `-ln(1-base)`. A second control would be the same number wearing a different hat, which is why
 * Coot ships a plain on/off switch and why this does too. Below about 0.3 opacity nothing much
 * happens, which is honest: a surface that is barely there has no shell to look along.
 *
 * This module is the maths only; the shader is where it runs. They are
 * written to match line for line, and the test file is what says they still do.
 */

/**
 * Away from zero by this much, because 1/|N·V| is unbounded at the silhouette.
 *
 * Not a fudge against infinity - the alpha is perfectly well behaved there, going to 1 - but
 * against the normals. Exactly where this term is strongest is where an interpolated normal is
 * least trustworthy, so on a coarse contour the silhouette is a ragged band of nearly-zero
 * values. Coot's number, for the same reason the curve is Coot's.
 */
export const MINIMUM_FACING = 0.01;

/**
 * How hard the bulk is pushed down relative to the rim.
 *
 * Five. Not derived from anything - it is the shaping constant that makes the effect usable at
 * the opacities people actually set, and it is Coot's, so that the two programs agree.
 */
export const BULK_FALLOFF = 5;

/**
 * The opacity of a shell of the given face-on opacity, seen at this angle.
 *
 * @param base the opacity the surface would have face-on with this off, 0 to 1.
 * @param facing |N·V|: 1 looking straight at the surface, 0 along it.
 */
export const viewDependentAlpha = (base: number, facing: number): number => {
    const transmitted = 1 - Math.min(Math.max(base, 0), 1);
    // Both ends are already right: opaque stays opaque however long the path, and a surface with
    // no opacity at all has nothing to absorb with. Returned early so neither depends on pow's
    // behaviour at its limits.
    if (transmitted <= 0) return 1;
    if (transmitted >= 1) return 0;
    // Clamping alone does not catch a value that is not a number: Math.min and Math.max both
    // carry NaN through, and so the path, and so the alpha. A degenerate normal can produce one,
    // and an alpha of NaN is a fragment that draws as whatever the hardware feels like.
    const towards = Number.isFinite(facing)
        ? Math.max(Math.abs(facing), MINIMUM_FACING)
        : MINIMUM_FACING;
    const shell = 1 - Math.pow(transmitted, 1 / towards);
    return Math.pow(shell, BULK_FALLOFF);
};
