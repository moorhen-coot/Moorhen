import { useEffect, useReducer, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";
import { moorhen } from "../../types/moorhen";
import { LhasaWrapper } from "../../utils/LhasaGlue";

const item_reducer = (old_map: Map<string, string>, action: any) => {
    if(action.type === 'add') {
        old_map.set(action.id, action.value);
    }
    let ret = new Map<string, string>();
    // JS can't copy a damn map
    old_map.forEach((value,key) => {
        ret.set(key, value);
    })
    return ret;
};

const initial_value = new Map<string, string>();

export const MoorhenLhasaModal = (props) => {
    const resizeNodeRef = useRef<HTMLDivElement>();
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const [my_map,setMyMap] = useReducer(item_reducer, initial_value);
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
            // console.log("Got pickle: ", pickle);
            setMyMap({
                type: "add",
                id: "LZA"+(-999999),
                value: pickle
            });
        });

    }, []);

    // let your_rdkit_mol_pickle_map: Map<string,Uint8Array> | undefined = undefined;

    return <MoorhenDraggableModalBase
                modalId="lhasa-modal"
                left={width / 6}
                top={height / 3}
                // defaultHeight={convertViewtoPx(70, height)}
                // defaultWidth={convertViewtoPx(37, width)}
                // minHeight={convertViewtoPx(30, height)}
                // minWidth={convertRemToPx(37)}
                // maxHeight={convertViewtoPx(90, height)}
                // maxWidth={convertViewtoPx(80, width)}
                enforceMaxBodyDimensions={false}
                overflowY='auto'
                overflowX='auto'
                headerTitle='Lhasa'
                // footer={null}
                resizeNodeRef={resizeNodeRef}
                body={
                    
                    <LhasaWrapper 
                        rdkit_molecule_pickle_map={my_map}
                        smiles_callback={(id, smiles) => console.info("ID=", id, " SMILES=", smiles)}
                    />
                }
            />
}
