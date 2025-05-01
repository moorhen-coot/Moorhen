import { moorhen } from '../types/moorhen';
import { readTextFile } from "./utils"
import { MoorhenMolecule } from "./MoorhenMolecule"
import { useSnackbar } from "notistack"
import { hideMolecule, showMolecule, removeMolecule, addMoleculeList } from "../store/moleculesSlice"

const readCoordsString = async (fileString: string, fileName: string, commandCentre, glRef, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness, visibleMolecules): Promise<moorhen.Molecule> => {
    const newMolecule = new MoorhenMolecule(commandCentre, glRef, store, monomerLibraryPath)
    newMolecule.setBackgroundColour(backgroundColor)
    newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
    await newMolecule.loadToCootFromString(fileString, fileName)
    return newMolecule
}

export const drawModels = async (newMolecules: moorhen.Molecule[]) => {
    let drawPromises: Promise<void>[] = []
    if (newMolecules.length === 0) {
        return
    }

    for (const newMolecule of newMolecules) {
        drawPromises.push(newMolecule.fetchIfDirtyAndDraw('CRs'))
    }
    await Promise.all(drawPromises)

}

export  const loadFiles = async(files, commandCentre, glRef, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness, visibleMolecules): Promise<Promise<moorhen.Molecule>[]> => {
    const loadPromises: Promise<moorhen.Molecule>[] = []
    for(const file of files) {
        const contents = await readTextFile(file) as string
        loadPromises.push(readCoordsString(contents,file.name, commandCentre, glRef, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness, visibleMolecules))
    }
    return loadPromises

}
