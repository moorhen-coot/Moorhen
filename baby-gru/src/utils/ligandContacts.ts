import type { CootContactAtom } from "@/InstanceManager/CommandCentre/CootCommandWrapper";
import type { LigandInfo, MoorhenMolecule } from "./MoorhenMolecule";

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

/** Where the ligand is in the molecule analysed, and how that molecule's chains map back. */
type AnalysedMolecule = {
    imol: number;
    /** The ligand's atoms in it */
    ligandSelection: string;
    /** Where its partners are (the ligand's own atoms left out): one model, so that a multi-model
     * molecule does not give each contact once per model */
    partnerSelection: string;
    /** Whether a residue of it (chain, gemmi-style seqid such as "301A") is the ligand */
    isLigand: (chainId: string, seqid: string) => boolean;
    /** The chain id in the molecule it came from */
    sourceChain: (chainId: string) => string;
    /** The ligand residue, for FLEV; null if it cannot be named */
    flevCid: string | null;
};

/**
 * A residue number as gemmi writes it (seqid.str(): "301", "301A" with an insertion code) as an mmdb cid
 * wants it ("301", "301.A").
 */
export const mmdbResidueNumber = (seqid: string): string => {
    const match = /^(-?\d+)([A-Za-z]?)$/.exec(seqid.trim());
    return match ? `${match[1]}${match[2] ? `.${match[2]}` : ""}` : seqid;
};

/**
 * A ligand's cid as mmdb (Coot's selections) reads it. Its own `cid` is as gemmi writes it, which is
 * the same thing unless the residue has an insertion code: /1/A/301A(ATP) is then /1/A/301(ATP).A for
 * mmdb, which selects nothing with gemmi's.
 */
export const mmdbLigandCid = (ligand: Pick<LigandInfo, "cid" | "modelName" | "chainName" | "resNum" | "resName">): string => {
    const match = /^(-?\d+)([A-Za-z])$/.exec(ligand.resNum.trim());
    return match ? `/${ligand.modelName}/${ligand.chainName}/${match[1]}(${ligand.resName}).${match[2]}` : ligand.cid;
};

/**
 * The contacts of a ligand with another molecule, or with the rest of its own: H-bonds, salt bridges
 * and, optionally, XH-π (XPID adds hydrogens from the monomer library, so the ligand's dictionaries
 * are passed to it) and the FLEV diagram.
 * @param ligand - The molecule the ligand is in.
 * @param partner - The other molecule; `ligand` itself for the rest of the ligand's own molecule.
 * @param ligandInfo - Which ligand of `ligand`: by default its first (a ligand-only molecule's).
 */
export const getLigandContacts = async (
    ligand: MoorhenMolecule,
    partner: MoorhenMolecule,
    options: { xhpi?: boolean; flev?: boolean } = {},
    ligandInfo: LigandInfo | undefined = ligand.ligands?.[0]
): Promise<LigandContactsResult> => {
    if (!ligandInfo) throw new Error("No ligand found in this molecule");
    const coot = ligand.moorhenInstance.cootCommand;
    const ligandDicts = ligand.ligandDicts ?? {};

    // In its own molecule: no merge, the ligand is one of its residues
    if (partner === ligand) {
        return analyse(
            ligand,
            {
                imol: ligand.molNo,
                ligandSelection: mmdbLigandCid(ligandInfo),
                partnerSelection: `/${ligandInfo.modelName}`,
                isLigand: (chainId, seqid) => chainId === ligandInfo.chainName && seqid === ligandInfo.resNum,
                sourceChain: chainId => chainId,
                flevCid: `//${ligandInfo.chainName}/${mmdbResidueNumber(ligandInfo.resNum)}`,
            },
            ligandDicts,
            options
        );
    }

    // The partner first: it keeps its chain ids, the ligand's chain is renamed if they clash
    const merged = await coot.make_merged_molecule(partner.molNo, "/*", ligand.molNo, mmdbLigandCid(ligandInfo));
    try {
        const ligandChains = merged.chains.filter(chain => chain.imol === ligand.molNo);
        const sourceChain = new Map(merged.chains.map(chain => [chain.chainId, chain.sourceChainId]));
        const flevChain = ligandChains.find(chain => chain.sourceChainId === ligandInfo.chainName);
        return await analyse(
            ligand,
            {
                imol: merged.imol,
                ligandSelection: ligandChains.map(chain => `//${chain.chainId}`).join("||"),
                // A merged molecule has one model (the partner's first)
                partnerSelection: "/*",
                isLigand: chainId => ligandChains.some(chain => chain.chainId === chainId),
                sourceChain: chainId => sourceChain.get(chainId) ?? chainId,
                flevCid: flevChain ? `//${flevChain.chainId}/${mmdbResidueNumber(ligandInfo.resNum)}` : null,
            },
            ligandDicts,
            options
        );
    } finally {
        await coot.delete_merged_molecule(merged.imol);
    }
};

/** The analyses, on the one molecule holding both the ligand and its partner. */
const analyse = async (
    ligand: MoorhenMolecule,
    target: AnalysedMolecule,
    ligandDicts: Record<string, string>,
    options: { xhpi?: boolean; flev?: boolean }
): Promise<LigandContactsResult> => {
    const coot = ligand.moorhenInstance.cootCommand;
    const { imol, ligandSelection, partnerSelection, isLigand, sourceChain } = target;
    const side = (atom: CootContactAtom): ContactSide => ({
        chainId: sourceChain(atom.chainId),
        resNo: atom.resNo,
        insCode: atom.insCode,
        resName: atom.resName,
        atomName: atom.atomName,
        xyz: atom.xyz,
    });

    const contacts: LigandContact[] = [];

    // The second selection never includes the first: everything but the ligand
    const hBonds = await coot.get_h_bonds_between(imol, ligandSelection, partnerSelection);
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

    const saltBridges = await coot.get_salt_bridges(imol, ligandSelection, partnerSelection, SALT_BRIDGE_MAX_DISTANCE);
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
        const rows = await coot.detect_xhpi_interactions(imol, ligandDicts);
        for (const row of rows) {
            const ligandDonates = isLigand(row.X_chain, row.X_seqid);
            if (ligandDonates === isLigand(row.pi_chain, row.pi_seqid)) continue;
            const donor: ContactSide = {
                chainId: sourceChain(row.X_chain),
                resNo: row.X_id,
                insCode: row.X_seqid.replace(/^-?\d+/, ""),
                resName: row.X_res,
                atomName: row.X_atom,
                xyz: [row.X_xyz_x, row.X_xyz_y, row.X_xyz_z],
            };
            const ring: ContactSide = {
                chainId: sourceChain(row.pi_chain),
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
        flev = target.flevCid ? await coot.get_svg_for_2d_ligand_environment_view(imol, target.flevCid) : "";
    }
    return { contacts, flev };
};
