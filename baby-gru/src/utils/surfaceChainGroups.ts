/**
 * Which atoms are surfaced together when a smooth surface is made chain by chain ("Surface each chain
 * separately"): each polymer chain is its own group, and a chain with no polymer residues - glycans,
 * ligands, which many files put in chains of their own (5fjj: NAG/BMA/MAN chains E-Z, a-i) - goes
 * with the polymer chain it touches, the one with an atom nearest any of its atoms. A chain touching
 * no polymer chain, or a model with no polymer at all, keeps a group of its own.
 */

/** Residues that make a chain a polymer: the amino acids and the nucleotides. */
const POLYMER_RESIDUES = new Set([
    "ALA", "CYS", "ASP", "GLU", "PHE", "GLY", "HIS", "ILE", "LYS", "LEU", "MET", "MSE", "ASN", "PRO", "GLN", "ARG",
    "SER", "THR", "VAL", "TRP", "TYR", "SEC", "PYL",
    "DA", "DC", "DG", "DT", "DU", "DI", "A", "C", "G", "U", "I",
]);

/** How near (A) an atom of a chain must be to a polymer chain's atom for the chain to go with it. */
export const SURFACE_GROUP_CONTACT = 5;

type GroupAtom = { x: number; y: number; z: number; chain_id: string; res_name: string };

/** The group of each atom: its own chain, or the polymer chain its chain goes with. */
export function surfaceChainGroups(atoms: GroupAtom[], contact = SURFACE_GROUP_CONTACT): string[] {
    const polymerChains = new Set<string>();
    for (const atom of atoms) if (POLYMER_RESIDUES.has(atom.res_name.trim())) polymerChains.add(atom.chain_id);
    const groupOf = new Map<string, string>();
    if (polymerChains.size > 0) {
        // Polymer atoms binned in cells of `contact`: a satellite atom looks in the 27 cells around it.
        const cell = (v: number) => Math.floor(v / contact);
        const key = (i: number, j: number, k: number) => `${i},${j},${k}`;
        const bins = new Map<string, number[]>();
        atoms.forEach((atom, n) => {
            if (!polymerChains.has(atom.chain_id)) return;
            const k = key(cell(atom.x), cell(atom.y), cell(atom.z));
            const bin = bins.get(k);
            if (bin) bin.push(n); else bins.set(k, [n]);
        });
        const nearest = new Map<string, { chain: string; d2: number }>();
        for (const atom of atoms) {
            if (polymerChains.has(atom.chain_id)) continue;
            const ci = cell(atom.x), cj = cell(atom.y), ck = cell(atom.z);
            let best = nearest.get(atom.chain_id) ?? { chain: "", d2: contact * contact };
            for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (let k = ck - 1; k <= ck + 1; k++) {
                for (const n of bins.get(key(i, j, k)) ?? []) {
                    const p = atoms[n];
                    const d2 = (p.x - atom.x) ** 2 + (p.y - atom.y) ** 2 + (p.z - atom.z) ** 2;
                    if (d2 < best.d2) best = { chain: p.chain_id, d2 };
                }
            }
            nearest.set(atom.chain_id, best);
        }
        for (const [chain, { chain: polymer }] of nearest) if (polymer) groupOf.set(chain, polymer);
    }
    return atoms.map(atom => groupOf.get(atom.chain_id) ?? atom.chain_id);
}
