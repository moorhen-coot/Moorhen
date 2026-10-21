/*
 * WorkerWrapper: the future typed API for every worker command (coot and the
 * other libraries the worker runs).
 *
 * The goal is for all code to call the worker through this wrapper instead of
 * `commandCentre.cootCommand(...)` directly, so that every command has typed
 * arguments, a typed return value, consistent error reporting, and goes
 * through the command queue.
 *
 * The queue: commands are not posted to the worker when called. They wait in
 * a list here and are sent one at a time, the next one when the worker has
 * replied (the worker runs one command at a time anyway). While a command
 * waits it can still be squashed: a command sent with a `squashKey` removes
 * the commands with the same key still waiting, whose promises reject with a
 * CommandSquashedError. Used for commands where only the latest matters, e.g.
 * map contours while the view moves. Commands sent through
 * `commandCentre.cootCommand` directly bypass the queue.
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
 *  1. Every method goes through the private `run` helper (queues the command,
 *     throws a CootCommandError naming it if it failed, returns its result),
 *     so callers never have to inspect a WorkerResponse. Older methods still
 *     call `enqueue` and return the WorkerResponse.
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
import { CommandSquashedError, commandName, throwIfCootFailed } from "./CootCommandError";
import { WorkerResponse, cootCommandKwargs } from "./MoorhenCommandCentre";

export type WorkerCommandOptions = {
    /**
     * Commands sharing a key squash each other: queuing one removes the older ones with the same key that are
     * still waiting (their promises reject with a CommandSquashedError). Use one key per caller and purpose,
     * e.g. `map-contour:<representation id>`.
     */
    squashKey?: string;
};

type QueuedCommand = {
    kwargs: cootCommandKwargs;
    doJournal: boolean;
    squashKey?: string;
    resolve: (reply: WorkerResponse) => void;
    reject: (reason: unknown) => void;
};

/** How the worker returns a map contour: lines, lit lines or a solid surface */
export type MapContourMeshType = "lines_mesh" | "lit_lines_mesh" | "mesh_perm";

/** A map contour as returned by the worker, ready for `appendOtherData` */
export type MapContourMesh = {
    prim_types: string[][];
    vert_tri: number[][][];
    norm_tri: number[][][];
    col_tri: number[][][];
    idx_tri: number[][][];
    [key: string]: unknown;
};

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

/**
 * Wrapper allowing the execution of web worker commands.
 *
 * It is not destined to be constructed directly, but attached to the
 * `moorhenInstance` as `moorhenInstance.workerCommand` and used as
 * `moorhenInstance.workerCommand.command(params)`.
 *
 * Its goal is to provide fully typed methods for each command, with proper argument and return types.
 * It queues the commands and sends them to the worker one at a time (see the file header); it *will* also manage the
 * journal of commands executed.
 * It is very incomplete, and slowly growing, you can open a github issue or PR for any commands you need to be wrapped.
 * @remarks
 * Each method corresponds to a web worker command; it queues its arguments for the internal `send` handler.
 */
export class WorkerWrapper {
    private send: (kwargs: cootCommandKwargs, doJournal: boolean) => Promise<WorkerResponse>;
    private queue: QueuedCommand[] = [];
    private sending = false;

    constructor(send: (kwargs: cootCommandKwargs, doJournal: boolean) => Promise<WorkerResponse>) {
        this.send = send;
    }

    /** Number of commands waiting to be sent (not counting the one the worker is running) */
    get queueLength(): number {
        return this.queue.length;
    }

    /** Queue a command; resolves with the worker's reply once it has been sent and run */
    private enqueue(kwargs: cootCommandKwargs, doJournal: boolean, options: WorkerCommandOptions = {}): Promise<WorkerResponse> {
        const { squashKey } = options;
        return new Promise<WorkerResponse>((resolve, reject) => {
            if (squashKey !== undefined) {
                const squashed = this.queue.filter(command => command.squashKey === squashKey);
                if (squashed.length > 0) {
                    this.queue = this.queue.filter(command => command.squashKey !== squashKey);
                    squashed.forEach(command => command.reject(new CommandSquashedError(commandName(command.kwargs), squashKey)));
                }
            }
            this.queue.push({ kwargs, doJournal, squashKey, resolve, reject });
            void this.sendQueued();
        });
    }

    /** Send the queued commands one at a time, each once the previous one has been replied to */
    private async sendQueued(): Promise<void> {
        if (this.sending) {
            return;
        }
        this.sending = true;
        while (this.queue.length > 0) {
            const command = this.queue.shift();
            try {
                command.resolve(await this.send(command.kwargs, command.doJournal));
            } catch (err) {
                command.reject(err);
            }
        }
        this.sending = false;
    }

    /** Queue a command, throw a CootCommandError naming it if it failed, return its result */
    private async run<T>(kwargs: cootCommandKwargs, doJournal: boolean, options?: WorkerCommandOptions): Promise<T> {
        const reply = await this.enqueue(kwargs, doJournal, options);
        throwIfCootFailed(reply, kwargs);
        return reply.data.result.result as T;
    }

    /**
     * Contour a map in a sphere.
     *
     * @param imol - The map molecule number.
     * @param centre - Centre of the sphere, world coordinates.
     * @param radius - Radius of the sphere, in Å.
     * @param contourLevel - Contour level, in map units (difference maps are contoured at ±level).
     * @param meshType - Lines, lit lines or solid surface.
     * @param options - `squashKey`: only the latest contour with this key is drawn (see {@link WorkerCommandOptions}).
     */
    async get_map_contours_mesh(
        imol: number,
        centre: [number, number, number],
        radius: number,
        contourLevel: number,
        meshType: MapContourMeshType,
        options?: WorkerCommandOptions
    ): Promise<MapContourMesh> {
        return this.run<MapContourMesh>(
            {
                command: "get_map_contours_mesh",
                commandArgs: [imol, ...centre, radius, contourLevel],
                returnType: meshType,
            },
            false,
            options
        );
    }

    /**
     * Contour a map in a sphere, coloured by the values of another map.
     *
     * @param imol - The map molecule number.
     * @param imolForColours - The map whose values colour the contour.
     * @param centre - Centre of the sphere, world coordinates.
     * @param radius - Radius of the sphere, in Å.
     * @param contourLevel - Contour level, in map units.
     * @param otherMapMin - Value of the colouring map at the start of the colour ramp.
     * @param otherMapMax - Value of the colouring map at the end of the colour ramp.
     * @param meshType - Lines, lit lines or solid surface.
     * @param invertColourRamp - Reverse the colour ramp.
     * @param options - `squashKey`: only the latest contour with this key is drawn (see {@link WorkerCommandOptions}).
     */
    async get_map_contours_mesh_using_other_map_for_colours(
        imol: number,
        imolForColours: number,
        centre: [number, number, number],
        radius: number,
        contourLevel: number,
        otherMapMin: number,
        otherMapMax: number,
        meshType: MapContourMeshType,
        invertColourRamp: boolean = false,
        options?: WorkerCommandOptions
    ): Promise<MapContourMesh> {
        return this.run<MapContourMesh>(
            {
                command: "get_map_contours_mesh_using_other_map_for_colours",
                commandArgs: [imol, imolForColours, ...centre, radius, contourLevel, otherMapMin, otherMapMax, invertColourRamp],
                returnType: meshType,
            },
            false,
            options
        );
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
        return await this.enqueue(
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
        return await this.enqueue(
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
        return await this.enqueue(
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
        return await this.enqueue(
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
        const DensityData = this.enqueue(
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
        const DensityData = this.enqueue(
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
        const newValidationData = this.enqueue(
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
        const newValidationData = this.enqueue(
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
        const result = this.enqueue(
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
        const result = this.enqueue(
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
        const result = this.enqueue(
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
        const response = (await this.enqueue(
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

/** @deprecated Renamed {@link WorkerWrapper}: the worker runs more than coot. */
export const CootCommandWrapper = WorkerWrapper;
/** @deprecated Renamed {@link WorkerWrapper}: the worker runs more than coot. */
export type CootCommandWrapper = WorkerWrapper;
