import { forwardRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Store } from 'redux';
import { Container } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import { useSnackbar } from "notistack"
import { MoorhenMolecule } from "../utils/MoorhenMolecule"
import { MoorhenMap} from "../utils/MoorhenMap"
import { addMoleculeList } from "../store/moleculesSlice"
import { drawModels,loadCoordFiles,handleSessionUpload,loadMrParseFiles, autoOpenFiles } from "../utils/MoorhenFileLoading"
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
            autoOpenFiles(files, props.commandCentre, props.glRef, props.store, props.monomerLibraryPath, backgroundColor, defaultBondSmoothness, props.timeCapsuleRef, dispatch)
        }
    });

    return  <div {...getRootProps({className: 'dropzone'})}> 
            {props.children}
            </div>
}
