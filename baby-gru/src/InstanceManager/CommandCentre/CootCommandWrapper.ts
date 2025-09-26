import { CommandCentre as CommandCentreCore, WorkerResponse } from './MoorhenCommandCentre';

export class CootCommandWrapper extends CommandCentreCore {
    /**
     * Sets the maximum number of vertices allowed for simple mesh rendering in Coot.
     * This parameter controls the complexity of meshes that can be displayed, affecting
     * both rendering performance and visual quality.
     *
     * @param maxVertices - The maximum number of vertices allowed for simple meshes.
     *                     Default is 1,000,000,000. Higher values allow more detailed
     *                     meshes but may impact performance.
     * @returns Promise that resolves to a WorkerResponse containing the command result
     *
     * @example
     * ```typescript
     * // Set a lower vertex limit for better performance
     * await commandCentre.set_max_number_of_simple_mesh_vertices(500000);
     *
     * // Use default value (1 billion vertices)
     * await commandCentre.set_max_number_of_simple_mesh_vertices();
     * ```
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
}
