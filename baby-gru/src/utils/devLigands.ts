import type { MoorhenInstance } from "@/InstanceManager/MoorhenInstance";
import { fetchMonomerDictionary } from "./monomerLibrary";

/**
 * Dev tool: load a handful of ligands from the monomer library, to try the ligand list and its
 * hover, sites and 2D views without preparing files. The library cannot be listed from the
 * browser, so the codes are drawn from a fixed pool of common ones.
 */
const POOL = [
    "ATP", "ADP", "AMP", "GTP", "NAD", "NAP", "FAD", "FMN", "SAM", "SAH", "COA", "HEM", "NAG", "BGC",
    "GLC", "MAN", "GAL", "FUC", "SIA", "GOL", "EDO", "PEG", "MPD", "CIT", "ACT", "TRS", "MES", "EPE",
    "PLP", "TPP", "BTN", "RET", "STU", "IMN", "TMP", "UDP",
];

// Split a CIF data line into tokens, keeping quoted atom names such as "C1'" whole
const cifTokens = (line: string) => [...line.matchAll(/'([^']*)'(?=\s|$)|"([^"]*)"(?=\s|$)|(\S+)/g)].map(m => m[1] ?? m[2] ?? m[3]);

/** A dictionary's _chem_comp_atom ideal coordinates as a one-residue PDB centred on `centre`; null without coordinates. */
const dictionaryToPdb = (text: string, centre: number[]): string | null => {
    const lines = text.split("\n");
    const start = lines.findIndex(line => line.startsWith("_chem_comp_atom."));
    if (start < 0) return null;
    const columns: string[] = [];
    let i = start;
    for (; i < lines.length && lines[i].startsWith("_chem_comp_atom."); i++) columns.push(lines[i].trim().slice(16));
    const col = (name: string) => columns.indexOf(name);
    const atoms: { comp: string; name: string; el: string; xyz: number[] }[] = [];
    for (; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("loop_") || line.startsWith("_") || line.startsWith("data_") || line.startsWith("#")) break;
        const t = cifTokens(line);
        atoms.push({ comp: t[col("comp_id")], name: t[col("atom_id")], el: t[col("type_symbol")], xyz: [+t[col("x")], +t[col("y")], +t[col("z")]] });
    }
    if (atoms.length === 0 || atoms.some(atom => atom.xyz.some(Number.isNaN))) return null;
    const mean = [0, 1, 2].map(k => atoms.reduce((sum, atom) => sum + atom.xyz[k], 0) / atoms.length);
    const coord = (atom: (typeof atoms)[number], k: number) => (atom.xyz[k] - mean[k] + centre[k]).toFixed(3).padStart(8);
    const name4 = (name: string) => (name.length < 4 ? " " + name : name).padEnd(4).slice(0, 4);
    const records = atoms.map(
        (atom, k) =>
            `HETATM${String(k + 1).padStart(5)} ${name4(atom.name)} ${atom.comp.padStart(3).slice(-3)} A   1    ` +
            `${coord(atom, 0)}${coord(atom, 1)}${coord(atom, 2)}  1.00 20.00          ${atom.el.padStart(2).slice(-2)}`
    );
    return records.join("\n") + "\nEND\n";
};

/**
 * Load `count` random ligands from the pool through files.batchLoadLigands, spread over three sites
 * 25 Å apart around the centre of the view (a few Å of jitter within a site), so grouping by
 * position has something to group.
 */
export const devLoadLibraryLigands = async (instance: MoorhenInstance, count = 10) => {
    const codes = [...POOL].sort(() => Math.random() - 0.5);
    const viewCentre = instance.store.getState().sceneSettings.origin.map(v => -v);
    const sites = [0, 1, 2].map(s => [viewCentre[0] + (s - 1) * 25, viewCentre[1], viewCentre[2]]);

    const sources: File[] = [];
    const dictionaries: File[] = [];
    for (const code of codes) {
        if (sources.length === count) break;
        const text = await fetchMonomerDictionary(code, instance.paths.monomerLibraryPath);
        if (!text) continue;
        const site = sites[sources.length % sites.length];
        const pdb = dictionaryToPdb(text, site.map(v => v + (Math.random() - 0.5) * 4));
        if (!pdb) continue;
        sources.push(new File([pdb], `${code}.pdb`));
        dictionaries.push(new File([text], `${code}.cif`));
    }
    // Placed around the view centre already, so the view is left where it is
    return instance.files.batchLoadLigands(sources, { dictionaries });
};
