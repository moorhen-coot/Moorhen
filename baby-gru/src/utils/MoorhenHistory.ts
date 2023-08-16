import { moorhen } from '../types/moorhen';
import { webGL } from '../types/mgWebGL';

export class MoorhenHistory implements moorhen.History {
    
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>
    entries: moorhen.cootCommandKwargs[]

    constructor() {
        this.entries = []
    }

    /**
     * Add an entry to the history
     * @param {moorhen.cootCommandKwargs} newEntry - The new entry that will be added
     */
    addEntry(newEntry: moorhen.cootCommandKwargs) {
        this.entries.push(newEntry)
    }

    /**
     * Get the history entries for a given molecule number
     * @param {number} molNo - The molecule number of interest
     * @returns {moorhen.cootCommandKwargs[]} - A list of history entries related to the molecule
     */
    getEntriesForMolNo(molNo: number): moorhen.cootCommandKwargs[] {
        return this.entries.filter(entry => entry.changesMolecules?.includes(molNo))
    }

    /**
     * Get a list of modifed molecules
     * @returns {number[]} - A list of molecule numbers that had at least one modification
     */
    getModifiedMolNo(): number[] {
        const modifiedMolNo = []

        this.entries.forEach(entry => {
            if (entry.changesMolecules?.length > 0) {
                entry.changesMolecules.forEach(molNo => modifiedMolNo.push(molNo))
            }
        })

        const uniqueModifiedMolNo: number[] = [...new Set(modifiedMolNo)]
        return uniqueModifiedMolNo
    }

}
