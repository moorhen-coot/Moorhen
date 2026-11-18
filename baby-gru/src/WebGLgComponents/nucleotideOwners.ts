/**
 * Which nucleotide each vertex of a nucleic acid ribbon belongs to, put right.
 *
 * Coot's ribbon (MoleculesToTriangles) threads a nucleic acid through each residue's C3' with a
 * natural cubic spline, the residues' C3' atoms at parameters 0, 1, 2 ... along each stretch of
 * chain, and gives residue i the ribbon over parameters [i - 0.5, i + 0.5): the stretch centred
 * on its C3'. For a protein the same rule, centred on CA, puts the boundaries on the peptide
 * bonds, which is right. For a nucleic acid C3' sits near the 3' end of the backbone, so the
 * boundaries come about a quarter of a residue too late - around O5' rather than at the O3'-P
 * link - and every residue's phosphate was lit, and labelled, as the residue before it.
 * Measured on the DNA of 3L1P: P, OP1 and OP2 fell in the previous residue's stretch every time.
 *
 * Here the same spline is rebuilt from the C3' atoms, each residue's stretch made to start where
 * the spline passes its O3'-P link (the point of the spline nearest the middle of the bond from
 * the previous residue's O3' to its P), and each vertex given to the stretch its point on the
 * spline falls in. A ribbon's cross-sections are perpendicular to the spline, so every vertex of
 * one finds the same point and goes to the same residue: the boundary is a clean cut across the
 * ribbon, as Coot's own boundaries are. (Asking instead which residue has the nearest atom gave
 * each vertex its own answer, and the highlight's edge a staircase.) On 3L1P: P owned by its own
 * residue 100%, OP1 93%, OP2 91%, the rest of the backbone 100%.
 *
 * Vertices only move between their owner and its neighbours along the chain; proteins, and
 * anything not a nucleotide, are left alone.
 *
 * A stop-gap: the right place for this is the ownership rule in MoleculesToTriangles itself
 * (MolecularRepresentation.cpp, the atom each ribbon point is given), after which this goes.
 */
import type { moorhen } from "../types/moorhen";

type Atom = Pick<moorhen.AtomInfo, "x" | "y" | "z" | "name" | "mol_name" | "chain_id" | "res_no">;
type Vec = [number, number, number];

/** Spline samples per residue: well within the spacing of the ribbon's own cross-sections. */
const SAMPLES_PER_RESIDUE = 24;
/** A new stretch of chain, as Coot's identifySegments starts one for nucleic acids. */
const BREAK_DISTANCE = 8.0;

/** A residue key from a CID as Coot writes owners: "/1/A/23(G)" or, with an insertion code, "/1/A/23(G).B". */
export const ownerResidueKey = (cid: string): string => {
    const parts = cid.split("/");
    const residue = parts[3] ?? "";
    const insertion = residue.includes(").") ? residue.slice(residue.lastIndexOf(").") + 2) : "";
    const number = residue.replace(/\(.*$/, "");
    return `${parts[1] ?? ""}/${parts[2] ?? ""}/${number}${insertion}`;
};

/** The same key from an atom: its model, chain and residue number with insertion code (gemmi's "23B"). */
const atomResidueKey = (atom: Pick<Atom, "mol_name" | "chain_id" | "res_no">): string =>
    `${atom.mol_name}/${atom.chain_id}/${atom.res_no}`;

const distance2 = (a: ArrayLike<number>, ai: number, b: ArrayLike<number>, bi: number): number => {
    const dx = a[ai] - b[bi], dy = a[ai + 1] - b[bi + 1], dz = a[ai + 2] - b[bi + 2];
    return dx * dx + dy * dy + dz * dz;
};

/**
 * Samples of the natural cubic spline through `points` at parameters 0 .. n - 1, as Coot's
 * coordSpline (second derivatives zero at both ends), `SAMPLES_PER_RESIDUE` to a unit, flat x,y,z.
 */
export function naturalSplineSamples(points: readonly Vec[]): Float64Array {
    const n = points.length;
    const steps = (n - 1) * SAMPLES_PER_RESIDUE;
    const out = new Float64Array(3 * (steps + 1));
    for (let c = 0; c < 3; c++) {
        const y = points.map(p => p[c]);
        // Second derivatives: M0 = Mn-1 = 0, M[i-1] + 4 M[i] + M[i+1] = 6 (y[i+1] - 2 y[i] + y[i-1]).
        const m = new Float64Array(n);
        if (n > 2) {
            const diag = new Float64Array(n), rhs = new Float64Array(n);
            for (let i = 1; i < n - 1; i++) { diag[i] = 4; rhs[i] = 6 * (y[i + 1] - 2 * y[i] + y[i - 1]); }
            for (let i = 2; i < n - 1; i++) { const w = 1 / diag[i - 1]; diag[i] -= w; rhs[i] -= w * rhs[i - 1]; }
            for (let i = n - 2; i >= 1; i--) m[i] = (rhs[i] - (i + 1 < n - 1 ? m[i + 1] : 0)) / diag[i];
        }
        for (let s = 0; s <= steps; s++) {
            const x = s / SAMPLES_PER_RESIDUE;
            const i = Math.min(Math.floor(x), n - 2), t = x - i;
            out[3 * s + c] = (1 - t) * y[i] + t * y[i + 1]
                + (((1 - t) ** 3 - (1 - t)) * m[i] + (t ** 3 - t) * m[i + 1]) / 6;
        }
    }
    return out;
}

/** The sample nearest `p` among samples [from, to], as a parameter. */
function nearestParameter(samples: Float64Array, p: ArrayLike<number>, pi: number, from: number, to: number): number {
    let best = from, bestDistance = Infinity;
    for (let s = from; s <= to; s++) {
        const d = distance2(samples, 3 * s, p, pi);
        if (d < bestDistance) { bestDistance = d; best = s; }
    }
    return best / SAMPLES_PER_RESIDUE;
}

/**
 * `vertexOwners` (indices into `owners`, the residue CIDs) with each nucleotide vertex given to
 * the residue whose stretch of the C3' spline, started at its O3'-P link, holds the vertex's
 * nearest point on the spline. The owner table is in the order the ribbon met its residues, so
 * consecutive nucleotides of one model and chain in it, C3' atoms within 8 A, are consecutive
 * along the ribbon, as Coot strings them. Returns the input unchanged (the same array) when there
 * is nothing to do.
 */
export function reassignNucleotideOwners(
    vertices: ArrayLike<number>,
    vertexOwners: ArrayLike<number>,
    owners: readonly string[],
    atoms: readonly Atom[]
): ArrayLike<number> {
    const ownerOf = new Map<string, number>();
    owners.forEach((cid, o) => ownerOf.set(ownerResidueKey(cid), o));
    // The first of each atom only: an alternative location is not another residue.
    const named = owners.map(() => new Map<string, Vec>());
    for (const atom of atoms) {
        const name = atom.name.trim();
        if (name !== "C3'" && name !== "O3'" && name !== "P") continue;
        const o = ownerOf.get(atomResidueKey(atom));
        if (o !== undefined && !named[o].has(name)) named[o].set(name, [atom.x, atom.y, atom.z]);
    }

    // Stretches of chain: consecutive owners of one model and chain with C3' atoms, as Coot breaks them.
    const chainOf = owners.map(cid => cid.split("/").slice(1, 3).join("/"));
    const stretches: number[][] = [];
    let current: number[] = [];
    for (let o = 0; o < owners.length; o++) {
        const c3 = named[o].get("C3'");
        const previous = current.length ? current[current.length - 1] : -1;
        const joins = c3 && previous === o - 1 && chainOf[previous] === chainOf[o]
            && distance2(named[previous].get("C3'")!, 0, c3, 0) <= BREAK_DISTANCE * BREAK_DISTANCE;
        if (!joins) {
            if (current.length >= 2) stretches.push(current);
            current = [];
        }
        if (c3) current.push(o);
    }
    if (current.length >= 2) stretches.push(current);
    if (stretches.length === 0) return vertexOwners;

    // Per owner: its stretch's samples, its index in the stretch, and where each residue starts.
    const place = new Map<number, { samples: Float64Array; index: number; starts: number[]; stretch: number[] }>();
    for (const stretch of stretches) {
        const samples = naturalSplineSamples(stretch.map(o => named[o].get("C3'")!));
        const last = samples.length / 3 - 1;
        const starts = stretch.map((o, k) => {
            const p = named[o].get("P"), o3 = k > 0 ? named[stretch[k - 1]].get("O3'") : undefined;
            if (!p || !o3) return k - 0.5;
            const middle = [(p[0] + o3[0]) / 2, (p[1] + o3[1]) / 2, (p[2] + o3[2]) / 2];
            return nearestParameter(samples, middle, 0, (k - 1) * SAMPLES_PER_RESIDUE, Math.min(last, k * SAMPLES_PER_RESIDUE));
        });
        stretch.forEach((o, index) => place.set(o, { samples, index, starts, stretch }));
    }

    const out = Uint32Array.from(vertexOwners);
    for (let v = 0; v < out.length; v++) {
        const at = out[v] < owners.length ? place.get(out[v]) : undefined;
        if (!at) continue;
        const { samples, index, starts, stretch } = at;
        const last = samples.length / 3 - 1;
        // Coot gave this vertex to a point within half a residue of the owner's C3'.
        const x = nearestParameter(samples, vertices, 3 * v,
            Math.max(0, Math.floor((index - 1) * SAMPLES_PER_RESIDUE)), Math.min(last, Math.ceil((index + 1) * SAMPLES_PER_RESIDUE)));
        let k = index;
        if (k + 1 < stretch.length && x >= starts[k + 1]) k++;
        else if (k > 0 && x < starts[k]) k--;
        out[v] = stretch[k];
    }
    return out;
}
