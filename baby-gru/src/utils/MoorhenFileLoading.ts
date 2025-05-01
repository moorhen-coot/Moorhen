import { moorhen } from '../types/moorhen';
import { readTextFile, readDataFile } from "./utils"
import { MoorhenMolecule } from "./MoorhenMolecule"
import { useSnackbar } from "notistack"
import { hideMolecule, showMolecule, removeMolecule, addMoleculeList } from "../store/moleculesSlice"
import { webGL } from "../types/mgWebGL"
import { ToolkitStore } from '@reduxjs/toolkit/dist/configureStore';
import { moorhensession } from "../protobuf/MoorhenSession";
import { MoorhenTimeCapsule } from "../utils/MoorhenTimeCapsule"
import { AnyAction, Dispatch } from "@reduxjs/toolkit";

const readCoordsString = async (fileString: string, fileName: string, commandCentre: React.RefObject<moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, store: ToolkitStore, monomerLibraryPath: string, backgroundColor: [number,number,number,number], defaultBondSmoothness: number|null): Promise<moorhen.Molecule> => {
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

export  const loadCoordFiles = async(files: File[], commandCentre: React.RefObject<moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, store: ToolkitStore, monomerLibraryPath: string, backgroundColor: [number,number,number,number], defaultBondSmoothness: number|null): Promise<Promise<moorhen.Molecule>[]> => {
    const loadPromises: Promise<moorhen.Molecule>[] = []
    for(const file of files) {
        if(file.name.endsWith(".pdb")||file.name.endsWith(".ent")||file.name.endsWith(".cif")||file.name.endsWith(".mmcif")){
            const contents = await readTextFile(file) as string
            loadPromises.push(readCoordsString(contents,file.name, commandCentre, glRef, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness))
        }
    }
    return loadPromises

}

const loadSession = async (session: string | object, commandCentre: React.RefObject<moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, store: ToolkitStore, monomerLibraryPath: string, molecules: moorhen.Molecule[], maps: moorhen.Map[], timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>, dispatch: Dispatch<AnyAction>) => {
    commandCentre.current.history.reset()
    let status = -1
    if (typeof session === 'string') {
        status = await MoorhenTimeCapsule.loadSessionFromJsonString(
            session as string,
            monomerLibraryPath,
            molecules,
            maps,
            commandCentre,
            timeCapsuleRef,
            glRef,
            store,
            dispatch
        )
    } else {
        status = await MoorhenTimeCapsule.loadSessionFromProtoMessage(
            session,
            monomerLibraryPath,
            molecules,
            maps,
            commandCentre,
            timeCapsuleRef,
            glRef,
            store,
            dispatch
        )
    }
    if (status === -1) {
        throw new Error("Failed to read backup (deprecated format)")
    }
}

export const handleSessionUpload = async (file: File, commandCentre: React.RefObject<moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, store: ToolkitStore, monomerLibraryPath: string, molecules: moorhen.Molecule[], maps: moorhen.Map[], timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>, dispatch: Dispatch<AnyAction>) => {
        const arrayBuffer = await readDataFile(file)
        const bytes = new Uint8Array(arrayBuffer)
        const sessionMessage = moorhensession.Session.decode(bytes,undefined,undefined)
        await loadSession(sessionMessage, commandCentre, glRef, store, monomerLibraryPath, molecules, maps, timeCapsuleRef, dispatch)
}
