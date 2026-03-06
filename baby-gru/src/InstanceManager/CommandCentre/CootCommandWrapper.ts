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

export class CootCommandWrapper {
    private cootCommand: (kwargs: cootCommandKwargs, doJournal: boolean) => Promise<WorkerResponse>;
    constructor(cootCommand: (kwargs: cootCommandKwargs, doJournal: boolean) => Promise<WorkerResponse>) {
        this.cootCommand = cootCommand;
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
}
