import type { MoorhenReduxStoreType } from "@/store/MoorhenReduxStore";
import { setOrigin, setZoom } from "@/store";
import type { MoorhenMolecule } from "./MoorhenMolecule";
import { centroidOf, moleculeDiameter, ZOOM_DIVISOR, type Point3 } from "./moleculeExtent";

/** Ligands at the same position: they overlap one another, directly or through other ligands of the site. */
export type LigandSite = {
    molecules: MoorhenMolecule[];
    /** Mean position of the site's heavy atoms */
    centre: [number, number, number];
    /** Extent of the site's heavy atoms, as moleculeDiameter measures it */
    diameter: number;
};

/** Two ligands overlap when a heavy atom of one is this close (Å) to a heavy atom of the other. */
export const SITE_CONTACT_DISTANCE = 2.0;

const isHydrogen = (element: string) => {
    const e = element.trim().toUpperCase();
    return e === "H" || e === "D";
};

/**
 * Group ligand molecules by position: ligands that overlap (any heavy atoms closer than
 * `contactDistance`) are in the same site, and so are ligands that overlap through others, e.g. all
 * the docking poses in one pocket. Sites are returned largest first.
 *
 * Linear in the number of atoms: heavy atoms go in a grid of `contactDistance` cells, and each atom
 * is only compared with the atoms of its own and neighbouring cells.
 */
export const groupLigandsBySite = async (molecules: MoorhenMolecule[], contactDistance: number = SITE_CONTACT_DISTANCE): Promise<LigandSite[]> => {
    const atomsOf: Point3[][] = [];
    for (const molecule of molecules) {
        const atoms = await molecule.gemmiAtomsForCid("/*/*/*/*");
        const heavyAtoms = atoms.filter(atom => !isHydrogen(atom.element));
        // A ligand of hydrogens only (e.g. a proton) still has a position
        atomsOf.push(heavyAtoms.length > 0 ? heavyAtoms : atoms);
    }

    // Union-find over molecules
    const parent = molecules.map((_, i) => i);
    const find = (i: number): number => {
        while (parent[i] !== i) {
            parent[i] = parent[parent[i]];
            i = parent[i];
        }
        return i;
    };
    const union = (a: number, b: number) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent[ra] = rb;
    };

    const cell = (v: number) => Math.floor(v / contactDistance);
    const grid = new Map<string, { atom: Point3; molecule: number }[]>();
    const limit2 = contactDistance * contactDistance;
    atomsOf.forEach((atoms, molecule) => {
        for (const atom of atoms) {
            const [cx, cy, cz] = [cell(atom.x), cell(atom.y), cell(atom.z)];
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        for (const other of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
                            if (other.molecule === molecule) continue;
                            const ex = atom.x - other.atom.x;
                            const ey = atom.y - other.atom.y;
                            const ez = atom.z - other.atom.z;
                            if (ex * ex + ey * ey + ez * ez <= limit2) union(molecule, other.molecule);
                        }
                    }
                }
            }
            const key = `${cx},${cy},${cz}`;
            const list = grid.get(key);
            if (list) list.push({ atom, molecule });
            else grid.set(key, [{ atom, molecule }]);
        }
    });

    const byRoot = new Map<number, number[]>();
    molecules.forEach((_, i) => {
        const root = find(i);
        const members = byRoot.get(root);
        if (members) members.push(i);
        else byRoot.set(root, [i]);
    });

    return [...byRoot.values()]
        .map(members => {
            const atoms = members.flatMap(i => atomsOf[i]);
            const centre = centroidOf(atoms);
            return { molecules: members.map(i => molecules[i]), centre, diameter: moleculeDiameter(atoms, centre) };
        })
        .sort((a, b) => b.molecules.length - a.molecules.length);
};

/** Centre and zoom the view on a site, as MoorhenMolecule.centreOn does for a molecule. */
export const centreOnSite = (site: LigandSite, store: MoorhenReduxStoreType): void => {
    store.dispatch(setOrigin([-site.centre[0], -site.centre[1], -site.centre[2]]));
    store.dispatch(setZoom(site.diameter > 0 ? site.diameter / ZOOM_DIVISOR : 0.4));
};
