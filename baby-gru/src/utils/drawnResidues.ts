/**
 * Whether a residue is drawn as atoms, for the hover balls (components/webMG/HoverAtom.tsx).
 *
 * A hover ball sits on an atom, so it belongs only where that atom is on screen. HoverAtom used to
 * ask whether the molecule had any visible atom-level representation at all, so one showing just
 * the ligands put balls on every protein residue hovered on its ribbon or surface. This asks of
 * the residue instead: is it among the atoms a visible atom-level representation draws?
 *
 * Those representations already hold the atoms they draw (their first buffer's `atoms`, for
 * picking), so the answer comes from an index of their residues, made once per atom list and
 * kept with it - a new draw makes a new list, and with it a new index - and each hover is a set
 * lookup. The model is left out of the key: the sequence viewer writes the molecule number there,
 * and which models are on screen is MoleculeRepresentation.getDisplayedModels's to decide.
 */

/**
 * A residue as chain and number with insertion code, from any of the residue fields in use: an
 * atom's res_no from gemmi ("23", "23A"), or a CID's fourth field as Moorhen writes it ("23(ALA)")
 * or as Coot writes mesh owners ("23(ALA).B").
 */
export const residueKeyOf = (chain: string, residueField: string): string => {
    const [main, dotted = ""] = residueField.replace(/\([^)]*\)/, "").split(".");
    const match = /^(-?\d+)(.*)$/.exec(main.trim());
    const number = match ? match[1] : main.trim();
    const insertion = (match ? match[2] : "") + dotted;
    return `${chain}/${number}${insertion.trim()}`;
};

/** The residue key of a hovered CID, "/1/A/23(ALA)/CA" or "/1/A/23(ALA).B"; null if it names no residue. */
export const residueKeyOfCid = (cid: string | null | undefined): string | null => {
    const parts = (cid ?? "").split("/");
    return parts.length >= 4 && parts[3] ? residueKeyOf(parts[2] ?? "", parts[3]) : null;
};

type ResidueAtom = { chain_id: string; res_no: string };

const indexes = new WeakMap<readonly ResidueAtom[], Set<string>>();

/** The residues among `atoms`, indexed the first time they are asked about. */
export const residuesOf = (atoms: readonly ResidueAtom[]): Set<string> => {
    let index = indexes.get(atoms);
    if (!index) {
        index = new Set(atoms.map(atom => residueKeyOf(atom.chain_id, String(atom.res_no))));
        indexes.set(atoms, index);
    }
    return index;
};

/** The parts of a representation this reads. */
export interface AtomLevelRepresentation {
    visible: boolean;
    style: string;
    buffers?: ({ atoms?: readonly ResidueAtom[] | null } | null)[] | null;
}

/**
 * Whether the residue `cid` names is drawn by one of `representations` that is visible and of
 * one of `atomLevelStyles`. A representation of those whose atoms are not known yet (still being
 * drawn) counts as drawing it, as every one did before.
 */
export function residueDrawnAsAtoms(representations: readonly AtomLevelRepresentation[] | null | undefined,
                                    atomLevelStyles: readonly string[], cid: string | null | undefined): boolean {
    const key = residueKeyOfCid(cid);
    if (!key) return false;
    return (representations ?? []).some(representation => {
        if (!representation.visible || !atomLevelStyles.includes(representation.style)) return false;
        const atoms = representation.buffers?.[0]?.atoms;
        return !atoms || residuesOf(atoms).has(key);
    });
}
