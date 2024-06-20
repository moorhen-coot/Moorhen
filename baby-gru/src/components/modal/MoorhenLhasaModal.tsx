import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";
import { moorhen } from "../../types/moorhen";
import { LhasaComponent } from '../../LhasaReact/src/Lhasa';
import { modalKeys } from "../../utils/enums";

type rdkitMoleculesChange = {
    type: "add";
    id: string;
    value: string;
}

const rdkitMoleculeReducer = (oldMap: Map<string, string>, action: rdkitMoleculesChange) => {
    const newMap = new Map<string, string>()
    
    if (action.type === 'add') {
        newMap.set(action.id, action.value)
        oldMap.forEach((value, key) => {
            newMap.set(key, value);
        })
    } else {
        console.error(`Unknown rdkitMoleculeReducer action type '${action.type}'... Doing nothing.`)
    }

    return newMap
}

const initialRdkitMolecules = new Map<string, string>();

const LhasaWrapper = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {

    const [isCootAttached, setCootAttached] = useState(window.cootModule !== undefined)
    
    const [rdkiMoleculePickleMap, setRdkiMoleculePickleMap] = useReducer(rdkitMoleculeReducer, initialRdkitMolecules)


    useEffect(() => {

        props.commandCentre.current.cootCommand({
            returnType: 'string',
            command: "get_rdkit_mol_pickle_base64",
            commandArgs: [
                "LZA",
                -999999
            ]
        },false).then((response) => {
            const pickle = response.data.result.result;
            setRdkiMoleculePickleMap({
                type: "add",
                id: "LZA"+(-999999),
                value: pickle
            });
        });

    }, []);

    const handleCootAttached = useCallback(() => {
        if (window.cootModule !== undefined) {
            setCootAttached(true)
        } else {
            console.warn("Unable to locate coot module... Cannot start Lhasa.")
        }
    }, [])

    useEffect(() => {
        document.addEventListener('cootModuleAttached', handleCootAttached)
        return () => {
            document.removeEventListener('cootModuleAttached', handleCootAttached)
        };
    }, [handleCootAttached])

    const smilesCallback = useCallback((id: string, smiles: string) => {
        console.log(`>> Received SMILES back from Lhasa: ID=${id} SMILES=${smiles}`)
    }, [])

    return  isCootAttached ?
                <LhasaComponent 
                    Lhasa={window.cootModule}
                    show_footer={false}
                    show_top_panel={false}
                    rdkit_molecule_pickle_map={rdkiMoleculePickleMap}
                    icons_path_prefix='/pixmaps/lhasa_icons'
                    name_of_host_program='Moorhen'
                    smiles_callback={smilesCallback}
                /> : null
}

export const MoorhenLhasaModal = (props: moorhen.CollectedProps) => {
    const resizeNodeRef = useRef<HTMLDivElement>();
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    return <MoorhenDraggableModalBase
                modalId={modalKeys.LHASA}
                left={width / 6}
                top={height / 3}
                defaultHeight={convertViewtoPx(70, height)}
                defaultWidth={convertViewtoPx(37, width)}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(90, height)}
                maxWidth={convertViewtoPx(80, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='Lhasa'
                resizeNodeRef={resizeNodeRef}
                body={ <LhasaWrapper commandCentre={props.commandCentre}/> }
            />
}
