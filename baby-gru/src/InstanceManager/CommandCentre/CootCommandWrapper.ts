import { WorkerResponse, cootCommandKwargs } from './MoorhenCommandCentre';

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
                command: 'set_max_number_of_simple_mesh_vertices',
                commandArgs: [maxVertices],
                returnType: 'void',
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
                command: 'add_waters',
                commandArgs: [moleculeMolNo, mapMolNo],
                returnType: 'status',
                changesMolecules: [moleculeMolNo],
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
                command: 'dedust_map',
                commandArgs: [imol],
                returnType: 'number',
            },
            true
        );
    }
}
