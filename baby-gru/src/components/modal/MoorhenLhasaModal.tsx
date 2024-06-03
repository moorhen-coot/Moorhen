import { useRef } from "react";
import { useSelector } from "react-redux";
import { convertRemToPx, convertViewtoPx } from "../../utils/MoorhenUtils";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";
import { moorhen } from "../../types/moorhen";
import { LhasaWrapper } from "../../utils/LhasaGlue";

export const MoorhenLhasaModal = (props) => {
    const resizeNodeRef = useRef<HTMLDivElement>();
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    let your_rdkit_mol_pickle: Uint8Array | undefined = undefined;

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
                    
                    <LhasaWrapper rdkit_molecule_pickle={your_rdkit_mol_pickle} />
                }
            />
}