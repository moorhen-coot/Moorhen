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
import { useSelector, useDispatch } from "react-redux"
import {
    setMrParseModels, setTargetSequence, setAfJson, setEsmJson,
    setHomologsJson, setAfSortField, setHomologsSortField, setAfSortReversed,
    setHomologsSortReversed, setAFDisplaySettings, setHomologsDisplaySettings
} from "../store/mrParseSlice"
import Fasta from "biojs-io-fasta"

interface MrParsePDBModelJson  {
    chain_id : string;
    ellg : number;
    frac_scat : null|number;
    length : number;
    molecular_weight : number;
    name : string;
    ncopies : null|number;
    pdb_file : null|string;
    pdb_id : string;
    pdb_url : string;
    query_start : number;
    query_stop : number;
    range : string;
    region_id : number;
    region_index : number;
    resolution : number;
    rmsd : null|number;
    score : number;
    seq_ident : number;
    total_frac_scat : null|number;
    total_frac_scat_known : null|number;
}

interface MrParseAFModelJson  {
    chain_id : string;
    ellg : number;
    frac_scat : null|number;
    length : number;
    molecular_weight : number;
    name : string;
    ncopies : any;
    pdb_file : null|string;
    pdb_id : string;
    pdb_url : string;
    query_start : number;
    query_stop : number;
    range : string;
    region_id : number;
    region_index : number;
    resolution : number;
    rmsd : null|number;
    score : number;
    seq_ident : number;
    total_frac_scat : null|number;
    total_frac_scat_known : null|number;
}

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


const parseJSONAndGetModelFiles = (json_contents, dispatch) => {

    console.log(dispatch)

    const fastaContents = json_contents.fastaContents
    const afModelContents = json_contents.afModelContents
    const esmModelContents = json_contents.esmModelContents
    const homologsContents = json_contents.homologsContents

    const modelFiles: string[] = []
    if(fastaContents){
        try {
            const seqs = Fasta.parse(fastaContents)
            dispatch(setTargetSequence(seqs[0].seq))
        } catch(e) {
            console.log("Failed to extract sequence from input.fasta")
        }
    }
    if(afModelContents){
        const json = JSON.parse(afModelContents)
        dispatch(setAfJson(json))
        for(const iter of Object.entries(json)){
            const key: string = iter[0]
            const value: MrParseAFModelJson = iter[1] as MrParseAFModelJson
            const fullName = value["pdb_file"]
            if(fullName){
                const relName = fullName.substring(fullName.lastIndexOf("models/")+"models/".length)
                modelFiles.push(fullName)
            }
        }
    }
    if(esmModelContents){
        const json = JSON.parse(esmModelContents)
        dispatch(setEsmJson(json))
        for(const iter of Object.entries(json)){
            const key: string = iter[0]
            const value: any = iter[1]
            //console.log(value)
        }
    }
    if(homologsContents){
        const json = JSON.parse(homologsContents)
        dispatch(setHomologsJson(json))
        for(const iter of Object.entries(json)){
            const key: string = iter[0]
            const value: MrParsePDBModelJson = iter[1] as MrParsePDBModelJson
            const fullName = value["pdb_file"]
            if(fullName){
                const relName = fullName.substring(fullName.lastIndexOf("homologs/")+"homologs/".length)
                modelFiles.push(fullName)
            }
        }
    }
    return modelFiles
}

const loadMrParseJson = async (files: FileList) => {

    if(files.length===0) return

    let fastaContents = ""
    let afModelContents = ""
    let esmModelContents = ""
    let homologsContents = ""

    for (const file of files) {
        if(file.name.endsWith("input.fasta")){
            fastaContents = await readTextFile(file) as string
        }
        if(file.name.endsWith("af_models.json")){
            afModelContents = await readTextFile(file) as string
        }
        if(file.name.endsWith("esm_models.json")){
            esmModelContents = await readTextFile(file) as string
        }
        if(file.name.endsWith("homologs.json")){
            homologsContents = await readTextFile(file) as string
        }
    }

    return {fastaContents,afModelContents,esmModelContents,homologsContents}
}

const loadCoordinateFilesFromFileList = async (files: FileList, modelFiles: string[], commandCentre, glRef, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness) => {

    let newMolecules: moorhen.Molecule[]

    const loadPromises: Promise<moorhen.Molecule>[] = []
    for (const file of files) {
        for (const modelFile of modelFiles) {
            if(file.webkitRelativePath.includes(modelFile)){
                const contents = await readTextFile(file) as string
                loadPromises.push(readCoordsString(contents, file.name, commandCentre, glRef, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness))
            }
        }
    }

    if(loadPromises.length===0) return newMolecules

    newMolecules = await Promise.all(loadPromises)
    if (!newMolecules.every(molecule => molecule.molNo !== -1)) {
        //enqueueSnackbar("Failed to read molecule", { variant: "warning" })
        newMolecules = newMolecules.filter(molecule =>molecule.molNo !== -1)
    }

    return newMolecules

}

export const loadMrParseFiles = async (files: FileList, commandCentre, glRef, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness, dispatch) => {

    const json_contents = await loadMrParseJson(files)
    const modelFiles: string[] = parseJSONAndGetModelFiles(json_contents, dispatch)
    let newMolecules: moorhen.Molecule[] = await loadCoordinateFilesFromFileList(files, modelFiles, commandCentre, glRef, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness)

    await drawModels(newMolecules)
    dispatch(addMoleculeList(newMolecules))
    newMolecules.at(-1).centreOn('/*/*/*/*', true)

    dispatch(setMrParseModels(newMolecules))

}

const loadMrParseJsonUrl = async (urlBase) => {

    let fastaContents = ""
    let afModelContents = ""
    let esmModelContents = ""
    let homologsContents = ""

    let response = await fetch(urlBase+"/input.fasta")
    if(response.ok) {
        fastaContents = await response.text();
    }
    response = await fetch(urlBase+"/af_models.json")
    if(response.ok) {
        afModelContents = await response.text();
    }
    response = await fetch(urlBase+"/esm_models.json")
    if(response.ok) {
        esmModelContents = await response.text();
    }
    response = await fetch(urlBase+"/homologs.json")
    if(response.ok) {
        homologsContents = await response.text();
    }

    return {fastaContents,afModelContents,esmModelContents,homologsContents}
}

const loadCoordinateFilesFromURL = async (url: string, modelFiles: string[], commandCentre, glRef, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness) => {

    let newMolecules: moorhen.Molecule[]

    const loadPromises: Promise<moorhen.Molecule>[] = []
    for (const modelFile of modelFiles) {
        const response = await fetch(url+"/"+modelFile)
        if(response.ok) {
            const contents = await response.text();
            loadPromises.push(readCoordsString(contents,modelFile.split('/').reverse()[0], commandCentre, glRef, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness))
        }
    }

    if(loadPromises.length===0) return newMolecules

    newMolecules = await Promise.all(loadPromises)
    if (!newMolecules.every(molecule => molecule.molNo !== -1)) {
        //enqueueSnackbar("Failed to read molecule", { variant: "warning" })
        newMolecules = newMolecules.filter(molecule =>molecule.molNo !== -1)
    }

    return newMolecules

}

export const loadMrParseUrl = async (urlBase, commandCentre, glRef, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness, dispatch) => {

    const json_contents = await loadMrParseJsonUrl(urlBase)
    const modelFiles: string[] = parseJSONAndGetModelFiles(json_contents, dispatch)
    let newMolecules: moorhen.Molecule[] = await loadCoordinateFilesFromURL(urlBase,modelFiles, commandCentre, glRef, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness)

    await drawModels(newMolecules)
    dispatch(addMoleculeList(newMolecules))
    newMolecules.at(-1).centreOn('/*/*/*/*', true)

    dispatch(setMrParseModels(newMolecules))

}
