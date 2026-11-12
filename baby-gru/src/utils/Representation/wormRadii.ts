/**
 * The radii of Coot's worm (the "Worm" representation style).
 *
 * Coot draws a worm as its Ribbon with no secondary structure, so every residue is coil, and
 * thickens the coil residue by residue from the molecule's residue properties
 * (molecules_container_t::set_residue_properties): "worm-radius", or "worm-radius-aniso" [x, y, z]
 * along the x, y and z axes, each a multiple of the coil thickness (the M2T parameter
 * ribbonStyleCoilThickness). Here radii are in angstroms, and are turned into those multiples when
 * they are handed to Coot.
 *
 * Where the radii come from:
 *  - "b-factor": bFactorScale x the residue's mean B-factor, CCP4MG's "Worm scaled by B-factor"
 *    (its FatWorms plugin uses 0.05 A per A^2: B = 20 gives a 1 A radius);
 *  - "uniform": uniformRadius everywhere, Coot's "Worms" (worm_tube_radius, 1 A);
 *  - "custom": residueRadii, as given (through the API: Moorhen does not make them).
 *
 * Nothing here knows about Moorhen's classes, so that it can be tested on its own.
 */

/** One residue's worm radius, in angstroms: isotropic, or along x, y and z. */
export type WormResidueRadius = {
    chainId: string;
    resNo: number;
    insCode?: string;
    radius?: number;
    radiusAniso?: [number, number, number];
};

export type WormRadiusSource = "b-factor" | "uniform" | "custom";

export type wormOptions = {
    radiusSource: WormRadiusSource;
    /** Angstroms of radius per A^2 of B-factor ("b-factor"). */
    bFactorScale: number;
    /** Angstroms ("uniform"). */
    uniformRadius: number;
    /** The radii of "custom"; residues not listed are drawn at the coil thickness. */
    residueRadii: WormResidueRadius[] | null;
    /**
     * Steps along the worm per residue (M2T's ribbonStyleAxialSampling for this worm): how smooth
     * its bends, and its changes of radius, are.
     */
    axialSampling: number;
    /**
     * Sides around the worm (M2T's cylindersStyleAngularSampling for this worm). More than a
     * ribbon's coil (6): a worm is thicker, so its facets show more.
     */
    angularSampling: number;
};

export const defaultWormOptions = (): wormOptions => ({
    radiusSource: "b-factor",
    bFactorScale: 0.05,
    uniformRadius: 1.0,
    residueRadii: null,
    axialSampling: 6,
    angularSampling: 12,
});

/**
 * The M2T integer parameters a worm is drawn with, in place of the representation's or molecule's
 * (a value that is not a positive whole number, as from a session written before the option was,
 * keeps the default).
 */
export function wormM2tIntParameters(options: wormOptions): { ribbonStyleAxialSampling: number; cylindersStyleAngularSampling: number } {
    const defaults = defaultWormOptions();
    const positive = (value: number, fallback: number) => (Number.isFinite(value) && value >= 1 ? Math.round(value) : fallback);
    return {
        ribbonStyleAxialSampling: positive(options.axialSampling, defaults.axialSampling),
        cylindersStyleAngularSampling: positive(options.angularSampling, defaults.angularSampling),
    };
}

/**
 * No residue thinner than this (A). Coot ignores a radius of zero, which would leave a residue with
 * a B-factor of zero at the coil thickness instead of thinnest of all.
 */
export const MIN_WORM_RADIUS = 0.05;

/** A residue as MoorhenMolecule.getResidueBFactors names it: "/model/chain/seqid(NAME)/*". */
export function parseResidueCid(cid: string): { model: string; chainId: string; resNo: number; insCode: string } | null {
    const match = /^\/([^/]*)\/([^/]*)\/(-?\d+)([A-Za-z]?)(?:\([^)]*\))?\//.exec(cid);
    if (!match) return null;
    return { model: match[1], chainId: match[2], resNo: parseInt(match[3]), insCode: match[4] };
}

/**
 * The worm's radius for each residue (A). `residueBFactors` is MoorhenMolecule.getResidueBFactors():
 * the residues of a "b-factor" or "uniform" worm, and their B-factors. Coot keys residue
 * properties on chain, number and insertion code, not model, so only the first model's residues
 * are used.
 */
export function wormResidueRadii(options: wormOptions, residueBFactors: { cid: string; bFactor: number }[]): WormResidueRadius[] {
    if (options.radiusSource === "custom" && options.residueRadii?.length) {
        return options.residueRadii;
    }
    const radii: WormResidueRadius[] = [];
    let firstModel: string = null;
    for (const { cid, bFactor } of residueBFactors) {
        const residue = parseResidueCid(cid);
        if (!residue) continue;
        if (firstModel === null) firstModel = residue.model;
        if (residue.model !== firstModel) continue;
        const radius = options.radiusSource === "uniform" ? options.uniformRadius : options.bFactorScale * bFactor;
        radii.push({
            chainId: residue.chainId,
            resNo: residue.resNo,
            insCode: residue.insCode,
            radius: Math.max(MIN_WORM_RADIUS, Number.isFinite(radius) ? radius : 0),
        });
    }
    return radii;
}

/**
 * The radii as the JSON set_residue_properties takes: radii divided by `coilThickness`, since
 * Coot's are multiples of it. Radii that are not positive are left out (Coot would ignore them).
 */
export function wormResidueProperties(radii: WormResidueRadius[], coilThickness: number): string {
    const thickness = coilThickness > 0 ? coilThickness : 1;
    const properties = [];
    for (const r of radii) {
        const residue = { "chain-id": r.chainId, "res-no": r.resNo, "ins-code": r.insCode ?? "" };
        if (r.radiusAniso?.length === 3 && r.radiusAniso.every(v => v > 0)) {
            properties.push({ ...residue, "worm-radius-aniso": r.radiusAniso.map(v => v / thickness) });
        } else if (r.radius > 0) {
            properties.push({ ...residue, "worm-radius": r.radius / thickness });
        }
    }
    return JSON.stringify(properties);
}
