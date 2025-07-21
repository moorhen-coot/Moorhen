import { guid } from './utils';
import { moorhen } from '../types/moorhen';
import { webGL } from '../types/mgWebGL';

const formatCommandString = (command: string) => {
    if(command === 'fill_partial_residue') {
        return 'Auto-fit Rotamer'
    } else if (command === 'flipPeptide_cid') {
        return 'Flip Peptide CID'
    }
    const stringWithSpaces = command.replaceAll('_', ' ').replaceAll('shim', '')
    const words = stringWithSpaces.split(' ')
    const formattedWords = words.map(word => {
        if (word.length > 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return ''
    })
    const formattedString = formattedWords.join(' ');
    return formattedString
}

const formatCommandArgsString = (command: string, commandArgs: (number | string)[]) => {
    let formattedString: string = ''

    // TODO: Maybe do this in such way that we simply show all command args as list by default
    switch(command) {
        case 'add_hydrogen_atoms':
        case 'delete_hydrogen_atoms':
        case 'get_monomer_and_position_at':
        case 'add_waters':
        case 'flip_hand':
        case 'set_imol_refinement_map':
        case 'redo':
        case 'undo':
        case 'shim_replace_map_by_mtz_from_file':
        case 'replace_molecule_by_model_from_string':
        case 'close_molecule':
            formattedString = `${commandArgs[0]}`
            break
        case 'fill_partial_residue':
        case 'auto_fit_rotamer':
            formattedString = `/1/${commandArgs[1]}/${commandArgs[2]}/*`
            break
        case 'replace_fragment':
        case 'fit_ligand_right_here':
        case 'fit_ligand':
            formattedString = `${commandArgs[0]},  ${commandArgs[1]},  ${commandArgs[2]}`
            break
        case 'mutate':
        case 'refine_residues_using_atom_cid':
        case 'rename_chain':
            formattedString = `${commandArgs[1]},  ${commandArgs[2]}`
            break
        case 'shim_new_positions_for_residue_atoms':
        case 'shim_auto_read_mtz':
        case 'pop_back':
            formattedString = ''
            break
        case 'refine_residue_range':
            formattedString = `/1/${commandArgs[1]}/${commandArgs[2]}-${commandArgs[3]}/*`
            break
        case 'SSM_superpose':
            formattedString = `${commandArgs[0]},  ${commandArgs[1]},  ${commandArgs[2]},  ${commandArgs[3]}`
            break
        case 'sharpen_blur_map':
        case 'merge_molecules_return':
            formattedString = `${commandArgs[0]},  ${commandArgs[1]}`
            break
        default:
            formattedString = `${commandArgs[1]}`
            break
    }

    return formattedString
}

const getCommandLabel = (command: string, commandArgs: (string | number)[]) => {
    try {
        const formattedCommand = formatCommandString(command)
        const formattedCommandArgs = formatCommandArgsString(command, commandArgs)
        return `${formattedCommand} [ ${formattedCommandArgs} ]`
    } catch(err) {
        console.log(err)
    }
}

export class MoorhenHistory implements moorhen.History {
    
    commandCentre: moorhen.CommandCentre;
    glRef: React.RefObject<webGL.MGWebGL>;
    timeCapsule: React.RefObject<moorhen.TimeCapsule>;
    entries: moorhen.HistoryEntry[];
    headId: string;
    headIsDetached: boolean;
    skipTracking: boolean;

    constructor(glRef: React.RefObject<webGL.MGWebGL>, timeCapsule: React.RefObject<moorhen.TimeCapsule>) {
        this.glRef = glRef
        this.timeCapsule = timeCapsule
        this.reset()
    }

    /**
     * Clear current history and start recording from the begining
     */
    reset() {
        this.entries = []
        this.headId = null
        this.headIsDetached = false
        this.skipTracking = false
    }

    /**
     * If set to true then new entries will be ignored
     * @param {boolean} newVal - The new value
     */
    setSkipTracking(newVal: boolean) {
        this.skipTracking = newVal
    }

    /**
     * Toggle the skipTracking attribute
     */
    toggleSkipTracking() {
        this.skipTracking = !this.skipTracking
    }

    /**
     * A setter for the commandCentre attribute
     * @param {moorhen.CommandCentre} commandCentre 
     */
    setCommandCentre(commandCentre: moorhen.CommandCentre) {
        this.commandCentre = commandCentre
    }

    /**
     * Set the current head to a given history entry
     * @param {string} id - The ID of the history entry to be used as current head
     * @param {string} detach - Wether the history should enter a detached state
     */
    setCurrentHead(id: string, detach: boolean = true) {
        this.headIsDetached = detach
        this.headId = id
    }

    /**
     * Add an entry to the history
     * @param {moorhen.cootCommandKwargs} newEntry - The new entry that will be added
     */
    async addEntry(newEntry: moorhen.cootCommandKwargs) {
        if(this.skipTracking) {
            return
        }

        if(this.headIsDetached) {
            this.rebase(this.headId)
            this.headIsDetached = false
        }

        newEntry.associatedBackupKey = null
        newEntry.uniqueId = guid()
        newEntry.label = getCommandLabel(newEntry.command, newEntry.commandArgs)

        if (newEntry.changesMolecules?.length > 0) {
            const backupKey = await this.timeCapsule.current.addModification()
            if (backupKey) {
                newEntry.associatedBackupKey = backupKey
            }
        }

        this.entries.push(newEntry as moorhen.HistoryEntry)
        this.headId = newEntry.uniqueId
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

    /**
     * Returns the imol that was last modified
     * @returns {number} - The imol of the molecule that was last modified
     */
    lastModifiedMolNo(): number {
        const modifications = this.entries.filter(item => item.changesMolecules?.length > 0)
        if (modifications.length > 0) {
            const lastAction = modifications[modifications.length - 1]
            return lastAction.changesMolecules[0]
        } else {
            console.warn('Could not find the last modified imol in moorhen history')
            return -1
        }
    }

    /**
     * Rebase the history to a given entry
     * @param {string} id - Unique ID for the entry used to rebase history
     */
    rebase(id: string) {
        const newBaseIndex = this.entries.findIndex(entry => entry.uniqueId === id)
        if (newBaseIndex !== -1) {
            const newHead = this.entries[newBaseIndex]
            this.headId = newHead.uniqueId
            this.entries = this.entries.slice(0, newBaseIndex + 1)
        } else {
            console.warn('Could not find the new base index to rebase moorhen history')
        }
    }
}
