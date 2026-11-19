/*
 * CootCommandWrapper: the future typed API for every coot command.
 *
 * The goal is for all code to call coot through this wrapper instead of
 * `commandCentre.cootCommand(...)` directly, so that every command has typed
 * arguments, a typed return value, and consistent error reporting.
 *
 * What the layers below already guarantee:
 *  - The worker (CootWorker.ts) replies to every message exactly once. If coot
 *    throws, the reply has `result.status === "Exception"`; it never goes silent.
 *  - The command centre rejects with a CootCommandError only when no reply can
 *    arrive (the worker failed to start, or a reply could not be deserialised).
 *  - CootCommandError and throwIfCootFailed (CootCommandError.ts) are the shared
 *    way to turn an Exception reply into a thrown error.
 *
 * What should be added here:
 *  1. A private helper that every method goes through, e.g.
 *
 *       private async run<T>(kwargs: cootCommandKwargs, doJournal: boolean): Promise<T> {
 *           const reply = await this.cootCommand(kwargs, doJournal);
 *           throwIfCootFailed(reply, kwargs);
 *           return reply.data.result.result as T;
 *       }
 *
 *     so a failed command always throws a CootCommandError naming the command,
 *     and callers never have to inspect a WorkerResponse.
 *  2. Methods return the typed result (e.g. `Promise<number>`), not WorkerResponse.
 *  3. Where coot reports failure through its return value rather than by
 *     throwing (e.g. -1 for a molecule number, 0 for a status), the method
 *     checks for it and throws a CootCommandError too. Only the wrapper knows
 *     what each command's failure value is.
 *  4. Callers that want to tell the user (snackbar, modal) catch
 *     CootCommandError; everything else lets it propagate so the failure at
 *     least reaches the console with the command name.
 *  5. Migrate gradually: wrap commands as they are touched, and move their
 *     call sites off `commandCentre.cootCommand`. Changing a method's return
 *     type from WorkerResponse is a breaking change for its callers.
 */
import { libcootApi } from "@/types/libcoot";
import { CootCommandError, throwIfCootFailed } from "./CootCommandError";
import { WorkerResponse, cootCommandKwargs } from "./MoorhenCommandCentre";

export type CootValidationData = {
    chainId: string;
    seqNum: number;
    restype: string;
    value: number;
}[];

export type ResidueValidationData = {
    seqNum: number;
    insCode?: string;
    resName?: string;
} & Record<string, number | null>;

export type ValidationData = Record<string, ResidueValidationData[]>;

/** An atom as the selection contacts give it (wasm_src/selection-contacts.h). */
export type CootContactAtom = {
    /** Relative to the molecule analysed, e.g. "//A/45/NZ" */
    cid: string;
    chainId: string;
    resNo: number;
    insCode: string;
    resName: string;
    atomName: string;
    altLoc: string;
    xyz: [number, number, number];
};

/** A molecule made by make_merged_molecule, and where each of its chains came from. */
export type MergedMolecule = {
    imol: number;
    chains: { chainId: string; imol: number; sourceChainId: string }[];
};

export type SelectionHBond = {
    /** Null when the bond was found from its hydrogen only (McDonald & Thornton) */
    donor: CootContactAtom | null;
    hydrogen: CootContactAtom | null;
    acceptor: CootContactAtom;
    /** H...A when the bond has its hydrogen, else D...A */
    distance: number;
    /** The selection the donor is in */
    donorSelection: 1 | 2;
};

export type SaltBridge = {
    /** From the first selection */
    atom1: CootContactAtom;
    /** From the second selection */
    atom2: CootContactAtom;
    distance: number;
    /** The charge of atom1; atom2 has the opposite one */
    charge1: -1 | 1;
};

/** One XH-π interaction found by XPID (checkout/xpid_moorhen/interface.h). */
export type XhpiInteraction = {
    pdb: string;
    model: string;
    pi_chain: string;
    pi_res: string;
    pi_id: number;
    pi_seqid: string;
    pi_ring: string;
    X_chain: string;
    X_res: string;
    X_id: number;
    X_seqid: string;
    X_atom: string;
    H_atom: string;
    dist_X_Pi: number;
    is_plevin: number;
    is_hudson: number;
    remark: string;
    pi_center_x: number;
    pi_center_y: number;
    pi_center_z: number;
    X_xyz_x: number;
    X_xyz_y: number;
    X_xyz_z: number;
    method: string;
    theta: number;
    angle_xh_pi: number;
    angle_xpcn: number;
    proj_dist: number;
} & Record<string, string | number | null>;

/**
 * CootCommand wrapper allowing the execution of web worker commands.
 *
 * It is not destined to be used directly, but attached to the
 * `moorhenInstance` as `moorhenInstance.cootCommand` and used as
 * `moorhenInstance.cootCommandWrapper.command(params)`.
 *
 * Its goal is to provide fully typed methods for each command, with proper argument and return types.
 * It *will* also manage the queue of commands and their execution, as well as the journal of commands executed.
 * It is very incomplete, and slowly growing, you can open a github issue or PR for any commands you need to be wrapped.
 * @remarks
 * Each method corresponds to a Coot web worker command and forwards its
 * arguments to the internal `cootCommand` handler, returning the
 * resulting {@link WorkerResponse}.
 */
export class CootCommandWrapper {
    private cootCommand: (kwargs: cootCommandKwargs, doJournal: boolean) => Promise<WorkerResponse>;
    constructor(cootCommand: (kwargs: cootCommandKwargs, doJournal: boolean) => Promise<WorkerResponse>) {
        this.cootCommand = cootCommand;
    }

    /** Run a command and return its result; throw a CootCommandError if coot threw. */
    private async run<T>(kwargs: cootCommandKwargs, doJournal: boolean = false): Promise<T> {
        const reply = await this.cootCommand(kwargs, doJournal);
        throwIfCootFailed(reply, kwargs);
        return reply.data.result.result as T;
    }

    /** Run a command that returns JSON and parse it; throw a CootCommandError on {"error": ...}. */
    private async runJson<T>(command: string, commandArgs: unknown[]): Promise<T> {
        const parsed = JSON.parse(await this.run<string>({ command, commandArgs, returnType: "string" }));
        if (parsed && !Array.isArray(parsed) && typeof parsed.error === "string") {
            throw new CootCommandError(command, parsed.error);
        }
        return parsed as T;
    }

    /**
     * The residue types of a molecule for which Coot has no dictionary (no restraints in its
     * geometry store): such residues are drawn from guessed bonds and cannot be refined.
     */
    async get_residue_names_with_no_dictionary(imol: number): Promise<string[]> {
        return this.run<string[]>({ command: "get_residue_names_with_no_dictionary", commandArgs: [imol], returnType: "string_array" });
    }

    /**
     * Make a temporary molecule holding the atoms of `cid1` in molecule `imol1` and of `cid2` in
     * `imol2`, so that analyses of one molecule (H-bonds, salt bridges, XH-π, FLEV...) can look
     * across two. The first selection keeps its chain ids; a chain of the second gets a new id if
     * the first already uses its own (`chains` says where each came from). Residue numbers are
     * kept. Delete it with {@link delete_merged_molecule} when done.
     *
     * @param imol1 - The molecule of the first selection.
     * @param cid1 - The first selection; several CIDs can be joined with "||".
     * @param imol2 - The molecule of the second selection.
     * @param cid2 - The second selection.
     */
    async make_merged_molecule(imol1: number, cid1: string, imol2: number, cid2: string): Promise<MergedMolecule> {
        return this.runJson<MergedMolecule>("make_merged_molecule_json", [imol1, cid1, imol2, cid2]);
    }

    /**
     * Delete a molecule made by {@link make_merged_molecule}, and any closed molecules after it,
     * so that their indices are reused.
     */
    async delete_merged_molecule(imol: number): Promise<void> {
        await this.run<number>({ command: "delete_merged_molecule", commandArgs: [imol], returnType: "status" });
    }

    /**
     * Hydrogen bonds between two selections of a molecule. The second selection never includes
     * atoms of the first, so "/*" as the second means "everything else".
     *
     * @param mcdonaldAndThornton - Use explicit hydrogens (McDonald & Thornton). Otherwise donors and
     * acceptors come from the dictionaries and no hydrogens are needed.
     */
    async get_h_bonds_between(imol: number, cid1: string, cid2: string, mcdonaldAndThornton: boolean = false): Promise<SelectionHBond[]> {
        return this.runJson<SelectionHBond[]>("get_h_bonds_between_json", [imol, cid1, cid2, mcdonaldAndThornton]);
    }

    /**
     * Salt bridges between two selections of a molecule: oppositely charged N / O / S atoms within
     * `maxDistance`, once per pair of charged groups. Standard residues use a fixed table, other
     * residues the formal charges of their dictionaries. "/*" as the second selection means
     * "everything else".
     */
    async get_salt_bridges(imol: number, cid1: string, cid2: string, maxDistance: number = 4.0): Promise<SaltBridge[]> {
        return this.runJson<SaltBridge[]>("get_salt_bridges_json", [imol, cid1, cid2, maxDistance]);
    }

    /**
     * XH-π interactions in a molecule, by XPID. XPID adds hydrogens from the monomer library, so
     * dictionaries it would not find there (ligands) are passed by comp id.
     */
    async detect_xhpi_interactions(imol: number, ligandDictionaries: Record<string, string> = {}): Promise<XhpiInteraction[]> {
        return this.runJson<XhpiInteraction[]>("shim_detect_xhpi_interactions", [imol, ligandDictionaries]);
    }

    /**
     * Coot's 2D ligand environment diagram (FLEV) as SVG; empty when Coot cannot draw it. The
     * ligand's dictionary must be loaded.
     *
     * @param residueCid - The ligand residue, e.g. "//B/1".
     */
    async get_svg_for_2d_ligand_environment_view(imol: number, residueCid: string, addKey: boolean = false): Promise<string> {
        return this.run<string>({
            command: "get_svg_for_2d_ligand_environment_view",
            commandArgs: [imol, residueCid, addKey],
            returnType: "string",
        });
    }
    /**
     * Sets the maximum number of vertices allowed for simple mesh rendering in Coot.
     * This parameter controls the complexity of meshes that can be displayed, affecting
     * both rendering performance and visual quality.
     *
     * @param maxVertices - The maximum number of vertices allowed for simple meshes.
     *                     Default is 1,000,000,000. Higher values allow more detailed
     *                     meshes but may impact performance.
     */
    async set_max_number_of_simple_mesh_vertices(maxVertices: number = 1000000000): Promise<WorkerResponse> {
        return await this.cootCommand(
            {
                command: "set_max_number_of_simple_mesh_vertices",
                commandArgs: [maxVertices],
                returnType: "void",
            },
            false
        );
    }

    /**
     * Adds water molecules to the specified molecule using the provided map.
     *
     * @param moleculeMolNo - The molecule number to which water molecules will be added.
     * @param mapMolNo - The map molecule number used for water placement.
     * @returns A promise that resolves to a {@link WorkerResponse} indicating the status of the operation.
     */
    async add_water(moleculeMolNo, mapMolNo): Promise<WorkerResponse> {
        return await this.cootCommand(
            {
                command: "add_waters",
                commandArgs: [moleculeMolNo, mapMolNo],
                returnType: "number",
                changesMolecules: [moleculeMolNo],
            },
            true
        );
    }

    /**
     * Sets the sigma cutoff value for adding water molecules.
     *
     * @param sigma - The sigma cutoff threshold used to determine water placement criteria.
     * @returns A promise that resolves to a {@link WorkerResponse} indicating the status of the operation.
     */
    async set_add_waters_sigma_cutoff(sigma: number): Promise<WorkerResponse> {
        return await this.cootCommand(
            {
                command: "set_add_waters_sigma_cutoff",
                commandArgs: [sigma],
                returnType: "void",
            },
            true
        );
    }

    /**
     * Removes dust artifacts from the specified map.
     *
     * This method sends a 'dedust_map' command to the Coot backend, which processes the map
     * identified by the given `imol` parameter to eliminate dust or noise artifacts.
     *
     * @param imol - The identifier of the map to be dedusted.
     */
    async dedust_map(imol): Promise<WorkerResponse> {
        return await this.cootCommand(
            {
                command: "dedust_map",
                commandArgs: [imol],
                returnType: "number",
            },
            true
        );
    }

    /**
     * Retrieves density fit analysis data for a molecule against a selected map.
     * Density fit values represent the average map value at atomic centres and can be
     * converted to Z-scores by dividing by the map RMS.
     *
     * @param imol - The molecule identifier for which to analyze density fit.
     * @param selectedMap - The map to use for density fit analysis.
     * @param mapRMS - Optional map RMS value to convert density fit values to Z-scores.
     * @returns A promise that resolves to {@link CootValidationData} containing the density fit analysis results.
     */
    async getDensityFitAnalysis(imol, selectedMap, mapRMS?: number): Promise<CootValidationData> {
        const DensityData = this.cootCommand(
            {
                command: "density_fit_analysis",
                returnType: "validation_data",
                commandArgs: [imol, selectedMap],
                needsMapData: true,
            },
            false
        );
        const data = (await DensityData).data.result.result as CootValidationData;
        if (mapRMS !== undefined) {
            data.forEach(item => {
                if (item.value !== null) {
                    item.value = item.value * mapRMS;
                }
            });
        }
        return data;
    }

    /**
     * Retrieves density correlation analysis data for a molecule against a selected map.
     *
     * @param imol - The molecule identifier for which to analyze density correlation.
     * @param selectedMap - The map to use for density correlation analysis.
     * @returns A promise that resolves to {@link CootValidationData} containing the density correlation analysis results.
     */
    async getDensityCorrelationAnalysis(imol, selectedMap): Promise<CootValidationData> {
        const DensityData = this.cootCommand(
            {
                command: "density_correlation_analysis",
                returnType: "validation_data",
                commandArgs: [imol, selectedMap],
                needsMapData: true,
            },
            false
        );
        return (await DensityData).data.result.result as CootValidationData;
    }

    /**
     * Retrieves geometric validation data for a molecule.
     *
     * @param imol - The molecule identifier for which to retrieve validation data.
     * @returns A promise that resolves to {@link ValidationData} containing the geometric validation results organized by chain.
     */
    async getGeoValidationData(imol): Promise<ValidationData> {
        const newValidationData = this.cootCommand(
            {
                command: "get_validation",
                commandArgs: [imol as number],
                returnType: "string",
            },
            false
        );
        const newValidationDataResult = await newValidationData;

        // console.log("getGeoValidationData: command result", newValidationDataResult.data.result);
        if (newValidationDataResult.data.result.status !== "Completed" ) {
            console.warn(`getGeoValidationData: command did not complete successfully. Status: ${newValidationDataResult.data.result.status}`);
            return {} as ValidationData;
        }
        return JSON.parse(newValidationDataResult.data.result.result) as ValidationData;

    }

    /**
     * Retrieves per-residue B-factor validation data for a molecule.
     *
     * For each residue it provides the average B-factor of the main chain
     * atoms and the average B-factor of the side chain atoms.
     *
     * @param imol - The molecule identifier for which to retrieve B-factor data.
     * @returns A promise that resolves to {@link ValidationData} containing the
     * per-residue B-factor averages organized by chain.
     */
    async getBValidationData(imol): Promise<ValidationData> {
        const newValidationData = this.cootCommand(
            {
                command: "get_B_validation",
                commandArgs: [imol as number],
                returnType: "string",
            },
            false
        );
        return JSON.parse((await newValidationData).data.result.result) as ValidationData;
    }

    /**
     * Retrieves Q-score validation data for a model against a selected map.
     *
     * @param selectedModel - The model molecule identifier to score.
     * @param selectedMap - The map to use for Q-score calculation.
     * @returns A promise that resolves to {@link CootValidationData} containing the Q-score results.
     */
    async getQScore(selectedModel, selectedMap): Promise<CootValidationData> {
        const result = this.cootCommand(
            {
                command: "get_q_score",
                commandArgs: [selectedModel, selectedMap],
                returnType: "validation_data",
            },
            false
        );
        return (await result).data.result.result as CootValidationData;
    }

    async getPeptideOmegaAnalysis(selectedModel): Promise<CootValidationData> {
        const result = this.cootCommand(
            {
                command: "peptide_omega_analysis",
                returnType: "validation_data",
                commandArgs: [selectedModel],
            },
            false
        );
        return (await result).data.result.result as CootValidationData;
    }

    async get_map_bounding_sphere(imol: number, thresold: number): Promise<{ center: [number, number, number]; radius: number }> {
        const result = this.cootCommand(
            {
                command: "get_map_bounding_sphere",
                commandArgs: [imol, thresold],
            },
            false
        );

        const response = await result;
        const results = response.data.result.result;
        return { center: [results.position[0], results.position[1], results.position[2]], radius: results.value };
    }

    async get_pdb_from_smiles(smiles: string, name: string, conformers: number, iterations: number): Promise<string> {
        const response = (await this.cootCommand(
            {
                command: "smiles_to_pdb",
                commandArgs: [smiles, name, conformers, iterations],
                returnType: "str_str_pair",
            },
            true
        )) as WorkerResponse<libcootApi.PairType<string, string>>;

        const result = response.data.result.result.second;
        console.log("pdb from smile", result);
        return result;
    }
}
