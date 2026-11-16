import type { CootContactAtom } from "@/InstanceManager/CommandCentre/CootCommandWrapper";
import type { MoorhenMolecule } from "./MoorhenMolecule";

/**
 * The contacts of a ligand with another molecule, from Coot's single-molecule analyses run on a
 * temporary merge of the two (moorhenInstance.cootCommand: make_merged_molecule, then
 * get_h_bonds_between, get_salt_bridges, detect_xhpi_interactions and the FLEV SVG on the merged
 * molecule, then delete_merged_molecule). The merged molecule's chains are mapped back, so every atom is named in
 * its own molecule.
 */

/** One side of a contact, named in its own molecule. */
export type ContactSide = {
    chainId: string;
    resNo: number;
    insCode: string;
    resName: string;
    atomName?: string; // absent on the ring side of an XH-π contact
    ring?: string;
    xyz: [number, number, number];
};

export type ContactType = "hbond" | "salt-bridge" | "xh-pi";

export type LigandContact = {
    type: ContactType;
    ligand: ContactSide;
    partner: ContactSide;
    distance: number;
    /** H-bond: which side gives the hydrogen; XH-π: whether the ligand gives the X-H or the ring */
    ligandRole?: "donor" | "acceptor" | "ring";
    /** Salt bridge: the ligand's charge */
    ligandCharge?: number;
};

export type LigandContactsResult = {
    contacts: LigandContact[];
    /** The FLEV SVG, empty when Coot could not draw it; absent when not asked for */
    flev?: string;
};

const SALT_BRIDGE_MAX_DISTANCE = 4.0;

/**
 * The contacts of the first ligand of `ligand` with all of `partner`: H-bonds, salt bridges and,
 * optionally, XH-π (XPID adds hydrogens from the monomer library, so the ligand's dictionaries are
 * passed to it) and the FLEV diagram.
 */
export const getLigandContacts = async (
    ligand: MoorhenMolecule,
    partner: MoorhenMolecule,
    options: { xhpi?: boolean; flev?: boolean } = {}
): Promise<LigandContactsResult> => {
    const ligandInfo = ligand.ligands?.[0];
    if (!ligandInfo) throw new Error("No ligand found in this molecule");
    const coot = ligand.moorhenInstance.cootCommand;

    // The partner first: it keeps its chain ids, the ligand's chain is renamed if they clash
    const merged = await coot.make_merged_molecule(partner.molNo, "/*", ligand.molNo, ligandInfo.cid);
    try {
        const ligandChains = new Map(merged.chains.filter(chain => chain.imol === ligand.molNo).map(chain => [chain.chainId, chain]));
        const sourceChain = new Map(merged.chains.map(chain => [chain.chainId, chain.sourceChainId]));
        const isLigand = (chainId: string) => ligandChains.has(chainId);
        const ligandSelection = [...ligandChains.keys()].map(chainId => `//${chainId}`).join("||");
        const side = (atom: CootContactAtom): ContactSide => ({
            chainId: sourceChain.get(atom.chainId) ?? atom.chainId,
            resNo: atom.resNo,
            insCode: atom.insCode,
            resName: atom.resName,
            atomName: atom.atomName,
            xyz: atom.xyz,
        });

        const contacts: LigandContact[] = [];

        const hBonds = await coot.get_h_bonds_between(merged.imol, ligandSelection, "/*");
        for (const bond of hBonds) {
            const donor = bond.donor ?? bond.hydrogen;
            const ligandDonates = bond.donorSelection === 1;
            contacts.push({
                type: "hbond",
                ligand: side(ligandDonates ? donor : bond.acceptor),
                partner: side(ligandDonates ? bond.acceptor : donor),
                distance: bond.distance,
                ligandRole: ligandDonates ? "donor" : "acceptor",
            });
        }

        const saltBridges = await coot.get_salt_bridges(merged.imol, ligandSelection, "/*", SALT_BRIDGE_MAX_DISTANCE);
        for (const bridge of saltBridges) {
            contacts.push({
                type: "salt-bridge",
                ligand: side(bridge.atom1),
                partner: side(bridge.atom2),
                distance: bridge.distance,
                ligandCharge: bridge.charge1,
            });
        }

        if (options.xhpi) {
            const rows = await coot.detect_xhpi_interactions(merged.imol, ligand.ligandDicts ?? {});
            for (const row of rows) {
                const ligandDonates = isLigand(row.X_chain);
                if (ligandDonates === isLigand(row.pi_chain)) continue;
                const donor: ContactSide = {
                    chainId: sourceChain.get(row.X_chain) ?? row.X_chain,
                    resNo: row.X_id,
                    insCode: row.X_seqid.replace(/^-?\d+/, ""),
                    resName: row.X_res,
                    atomName: row.X_atom,
                    xyz: [row.X_xyz_x, row.X_xyz_y, row.X_xyz_z],
                };
                const ring: ContactSide = {
                    chainId: sourceChain.get(row.pi_chain) ?? row.pi_chain,
                    resNo: row.pi_id,
                    insCode: row.pi_seqid.replace(/^-?\d+/, ""),
                    resName: row.pi_res,
                    ring: row.pi_ring,
                    xyz: [row.pi_center_x, row.pi_center_y, row.pi_center_z],
                };
                contacts.push({
                    type: "xh-pi",
                    ligand: ligandDonates ? donor : ring,
                    partner: ligandDonates ? ring : donor,
                    distance: row.dist_X_Pi,
                    ligandRole: ligandDonates ? "donor" : "ring",
                });
            }
        }

        let flev: string | undefined;
        if (options.flev) {
            const mergedChain = [...ligandChains.values()].find(chain => chain.sourceChainId === ligandInfo.chainName);
            flev = mergedChain
                ? await coot.get_svg_for_2d_ligand_environment_view(merged.imol, `//${mergedChain.chainId}/${ligandInfo.resNum}`)
                : "";
        }
        return { contacts, flev };
    } finally {
        await coot.delete_merged_molecule(merged.imol);
    }
};
