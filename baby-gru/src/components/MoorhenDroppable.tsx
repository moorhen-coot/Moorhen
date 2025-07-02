import { forwardRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Store } from 'redux';
import { Container } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import { MoorhenMolecule } from "../utils/MoorhenMolecule"
import { MoorhenMap} from "../utils/MoorhenMap"
import { useSnackbar } from "notistack"
import { addMoleculeList } from "../store/moleculesSlice"
import { drawModels,loadCoordFiles,handleSessionUpload,loadMrParseFiles } from "../utils/MoorhenFileLoading"
import { setActiveMap } from "../store/generalStatesSlice"
import { addMapList } from "../store/mapsSlice"
import { moorhen } from '../types/moorhen';
import { webGL } from "../types/mgWebGL";
import { readTextFile } from "../utils/utils"
import { setValidationJson } from "../store/jsonValidation"
import { modalKeys } from "../utils/enums";
import { showModal } from "../store/modalsSlice";

interface MoorhenDroppablePropsInterface {
    glRef: React.RefObject<webGL.MGWebGL>;
    monomerLibraryPath: string;
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    store: Store;
    children?: React.ReactNode;
}

export const MoorhenDroppable = (props: MoorhenDroppablePropsInterface) => {

    const { enqueueSnackbar } = useSnackbar()

    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const maps = useSelector((state: moorhen.State) => state.maps)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const dispatch = useDispatch()

    const {getRootProps} = useDropzone({
        onDrop: async files => {
            let isMrParse = false
            for(const file of files) {
               if(file.name.endsWith("input.fasta")){
                   isMrParse = true
                   break
               }
            }
            if(isMrParse){
                console.log("I think this is an MrParse directory....")
                dispatch(showModal(modalKeys.MRPARSE))
                loadMrParseFiles(files, props.commandCentre, props.glRef, props.store, props.monomerLibraryPath, backgroundColor, defaultBondSmoothness, dispatch)
                return
            }
            const loadPromises: Promise<moorhen.Molecule>[] = await loadCoordFiles(files, props.commandCentre, props.glRef, props.store, props.monomerLibraryPath, backgroundColor, defaultBondSmoothness)
            let newMolecules: moorhen.Molecule[]
            newMolecules = await Promise.all(loadPromises)

            if(newMolecules.length>0){
                if (!newMolecules.every(molecule => molecule.molNo !== -1)) {
                    enqueueSnackbar("Failed to read molecule", { variant: "warning" })
                    newMolecules = newMolecules.filter(molecule =>molecule.molNo !== -1)
                }
                await drawModels(newMolecules)
                dispatch(addMoleculeList(newMolecules))
                newMolecules.at(-1).centreOn('/*/*/*/*', true)
            }
            for(const file of files) {
                if(file.name.endsWith(".mtz")){
                    const newMaps = await MoorhenMap.autoReadMtz(file, props.commandCentre, props.glRef, props.store)
                    if (newMaps.length === 0) {
                        enqueueSnackbar('Error reading mtz file', { variant: "warning" })
                    } else {
                        dispatch( addMapList(newMaps) )
                        dispatch( setActiveMap(newMaps[0]) )
                    }
                }
            }
            for(const file of files) {
                if(file.name.endsWith(".pb")){
                    try {
                         await handleSessionUpload(file, props.commandCentre, props.glRef, props.store, props.monomerLibraryPath, molecules, maps, props.timeCapsuleRef,dispatch)
                    } catch(e) {
                        enqueueSnackbar("Error loading the session", { variant: "warning" })
                    }
                    break //We only load the first session.
                }
            }
            for(const file of files) {
                if(file.name.endsWith(".json")){
                    try {
                        const fileContents = await readTextFile(file) as string
                        const json = JSON.parse(fileContents)
                        dispatch(setValidationJson(json))
                        dispatch(showModal(modalKeys.JSON_VALIDATION))
                    } catch(e) {
                        enqueueSnackbar("Error loading json validation", { variant: "warning" })
                    }
                }
            }
        }
    });

    return  <div {...getRootProps({className: 'dropzone'})}> 
            {props.children}
            </div>
}
