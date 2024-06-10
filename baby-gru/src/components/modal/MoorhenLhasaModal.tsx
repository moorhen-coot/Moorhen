import { useEffect, useReducer, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { convertRemToPx, convertViewtoPx } from "../../utils/MoorhenUtils";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";
import { moorhen } from "../../types/moorhen";
import { LhasaWrapper } from "../../utils/LhasaGlue";

const item_reducer = (old_map: Map<string,Uint8Array>, action: any) => {
    if(action.type === 'add') {
        old_map[action.id] = action.value;
    }
    return new  Map<string,Uint8Array>(old_map);
};

const initial_value = new Map<string,Uint8Array>();

export const MoorhenLhasaModal = (props) => {
    const resizeNodeRef = useRef<HTMLDivElement>();
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const [my_map,setMyMap] = useReducer(item_reducer, initial_value);
    useEffect(() => {
        props.commandCentre.current.cootCommand({
            returnType: 'Uint8Array',
            command: "get_rdkit_mol_pickle_base64",
            commandArgs: [
                "LZA",
                -999999
            ]
        },false).then((response) => {
            const pickle = response.data.result.result;
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
                show={props.show}
                setShow={props.setShow}
                defaultHeight={convertViewtoPx(70, height)}
                defaultWidth={convertViewtoPx(37, width)}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(90, height)}
                maxWidth={convertViewtoPx(80, width)}
                enforceMaxBodyDimensions={false}
                overflowY='hidden'
                overflowX='auto'
                headerTitle='Lhasa'
                // footer={null}
                resizeNodeRef={resizeNodeRef}
                body={
                    
                    <LhasaWrapper rdkit_molecule_pickle_map={my_map} />
                }
            />
}