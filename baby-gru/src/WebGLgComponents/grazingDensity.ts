/**
 * Transparent surfaces that thicken where you see them edge-on.
 *
 * A translucent map surface drawn at a flat opacity reads as a sheet of coloured glass. The same
 * surface in Coot reads as a solid you are looking *into*, because the density follows the angle:
 * face-on you see through it, at the silhouette you are looking along the shell and it closes up.
 *
 * THE SHELL, NOT A RIM LIGHT
 *
 * It is tempting to treat this as a Fresnel term and fit a power curve to it. It is simpler than
 * that, and physical. A shell of thickness t seen at angle θ from its normal is t/cos θ of
 * material to look through, and Beer-Lambert turns a path into a transmittance. Writing the
 * face-on opacity the user set as `base`, the absorption that produces it is fixed by
 * `1 - base = exp(-σt)`, so at any other angle:
 *
 *     alpha = 1 - (1 - base) ^ (1 / |N·V|)
 *
 * No new parameter, and two properties that a fitted curve would not have given: face-on the
 * result is *exactly* the opacity that was asked for, so nothing about an existing scene changes
 * where it is being looked at straight on; and at the silhouette it goes to 1 of its own accord
 * rather than to whatever the curve happened to reach.
 *
 * STRENGTH IS A DIAL BETWEEN TWO HONEST THINGS
 *
 * The effect is not always wanted, and a scene already set up has not asked for it. So the path
 * length is interpolated rather than the alpha:
 *
 *     path = mix(1, anchor/|N·V|, strength)
 *
 * At 0 the path is 1 everywhere and the expression collapses to `base` - not approximately, but
 * identically, which is what lets this default to off and cost nothing. At 1 it is the shell
 * above. In between it is a thinner shell, which is still a shell.
 *
 * WHICH ANGLE THE OPACITY DESCRIBES
 *
 * `anchor` is the |N·V| at which the surface has exactly the opacity that was asked for. With it
 * at 1 that is face-on, which is the obvious reading and the wrong one.
 *
 * Anchored face-on, the effect only works on a surface that is already very thin. Measured, at
 * strength 1:
 *
 *     base   |N·V|=1   0.7     0.4     0.2     0.03
 *     0.10     0.100   0.140   0.232   0.410   0.970
 *     0.30     0.300   0.399   0.590   0.832   1.000
 *     0.50     0.500   0.629   0.823   0.969   1.000
 *
 * The silhouette closes up at every opacity - that is not the problem. The problem is that the
 * middle closes up too: at 0.30 the surface is already 0.59 at |N·V|=0.4, and through both walls
 * of a closed shell that is 0.83. There is nothing left to see into, so the rim has nothing to
 * stand against, and the face-to-edge span actually *narrows* as the opacity rises. Only around
 * 0.10 does the bulk stay glassy enough for the rim to read, which is a setting a user has to
 * discover by hand before the effect does anything for them.
 *
 * Anchoring part-way round fixes that by making the slider describe a glancing view rather than a
 * head-on one: the same shell, thinner where you look straight through it. At anchor 0.5 an
 * opacity of 0.30 behaves as 0.10 does face-on-anchored, and the whole useful range moves to where
 * people actually set opacity. The cost is real and worth stating: turning the strength up thins
 * the surface head-on, so the opacity control no longer reads as "how solid this looks when I
 * stare at it".
 *
 * Interpolated by strength along with the path, so strength 0 remains exactly the identity
 * whatever the anchor is.
 *
 * This module is the maths and the dev-time setting only; the shader is where it runs. They are
 * written to match line for line, and grazingDensity.test.ts is what says they still do.
 */

/**
 * Away from zero by this much, because 1/|N·V| is unbounded at the silhouette.
 *
 * Not a fudge against infinity - the alpha is perfectly well behaved there, going to 1 - but
 * against the normals. Exactly where this term is strongest is where an interpolated normal is
 * least trustworthy, so on a coarse contour the silhouette is a ragged band of nearly-zero
 * values. Clamping bounds how far a bad normal can take the alpha in one pixel.
 */
export const MINIMUM_FACING = 0.03;

/**
 * The |N·V| at which the surface shows exactly the opacity that was asked for.
 *
 * Half: a view about sixty degrees off face-on, which is nearer the average over a curved surface
 * than looking straight at it is. See the note above for why face-on is the wrong anchor.
 */
export const REFERENCE_FACING = 0.5;

/**
 * The opacity of a shell of the given opacity, seen at this angle.
 *
 * @param base the opacity the surface shows at `anchor`, 0 to 1.
 * @param facing |N·V|: 1 looking straight at the surface, 0 along it.
 * @param strength 0 leaves `base` untouched, 1 is the full shell.
 * @param anchor the |N·V| at which the surface shows `base`. 1 is face-on.
 */
export const grazingAlpha = (
    base: number, facing: number, strength: number, anchor: number = REFERENCE_FACING,
): number => {
    if (strength <= 0) return base;
    const transmitted = 1 - Math.min(Math.max(base, 0), 1);
    // Both ends are already right: opaque stays opaque however long the path, and a surface with
    // no opacity at all has nothing to absorb with. Returned early so neither depends on pow's
    // behaviour at its limits.
    if (transmitted <= 0) return 1;
    if (transmitted >= 1) return 0;
    // Clamping alone does not catch a value that is not a number: Math.min and Math.max both
    // carry NaN through, and so the path, and so the alpha. A degenerate normal can produce one,
    // and an alpha of NaN is a fragment that draws as whatever the hardware feels like.
    const reference = Number.isFinite(anchor)
        ? Math.min(Math.max(anchor, MINIMUM_FACING), 1)
        : REFERENCE_FACING;
    const towards = Number.isFinite(facing)
        ? Math.max(Math.abs(facing), MINIMUM_FACING)
        : MINIMUM_FACING;
    const path = 1 + strength * (reference / towards - 1);
    return 1 - Math.pow(transmitted, path);
};

/**
 * How strongly this runs while there is nothing in the interface to say.
 *
 * A single compiled-in number cannot be judged - the question is what it looks like as it moves,
 * on a real map, at a real sampling rate - so the prototype reads it from here, where the dev menu
 * or the console can reach it. Zero, so that until something sets it nothing anywhere is changed.
 *
 * Per-representation control replaces this; it is not meant to survive that.
 */
export const grazingDensitySetting = { strength: 0, anchor: REFERENCE_FACING };
