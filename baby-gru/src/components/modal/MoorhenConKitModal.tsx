import { useDispatch, useSelector } from "react-redux";
import { dispatchPersistentStates, usePersistentState } from "../../store/menusSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenInfoCard, MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { MoorhenConKit } from "../validation-tools/MoorhenConKit";

export const MoorhenConKitModal = () => {
    const menu = "moorhenconKitModal";
    const dispatch = useDispatch();

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const [modalSize, setModalSize] = usePersistentState<{ width: number; height: number }>(
        menu,
        "modalSize",
        {
            width: convertRemToPx(50),
            height: convertRemToPx(25),
        },
        false
    );

    const infoText = (
        <>
            <h1>ConKit</h1>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ac dignissim tellus. Proin tempor nisl vel urna varius, ac
            facilisis nibh facilisis. Quisque id tincidunt tortor.
            <h2>Nulla maximus</h2>
            blandit purus vitae tempus. Vivamus et massa eu leo congue placerat eu in magna. Ut eleifend, arcu ut laoreet porttitor, lectus{" "}
            <h2>lectus sollicitudin</h2>
            sem, nec sagittis ante dui in quam. Curabitur maximus ex at scelerisque posuere. Cras iaculis velit sit amet eleifend gravida.
            Pellentesque molestie cursus metus et aliquam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia
            curae; Donec a nunc sed enim efficitur
            <h3>Citation: </h3>
            <ul>
                <li>
                    <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5870551/" target="_blank" rel="noreferrer">
                        ConKit: a python interface to contact predictions
                    </a>
                </li>
            </ul>
        </>
    );
    const tittleBar = (
        <MoorhenStack direction="horizontal" align="center" gap={"1rem"}>
            ConKit <MoorhenInfoCard infoText={infoText} />
        </MoorhenStack>
    );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.CONKIT}
            left={width / 6}
            top={height / 6}
            lockAspectRatio={true}
            initialHeight={convertRemToPx(40)}
            initialWidth={convertRemToPx(40)}
            onResize={(evt, ref, direction, delta, size) => {
                setModalSize(size);
            }}
            minHeight={100}
            minWidth={200}
            maxHeight={convertViewtoPx(65, height)}
            maxWidth={convertViewtoPx(80, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle={tittleBar}
            footer={null}
            onResizeStop={() => dispatchPersistentStates(dispatch, menu, [{ key: "modalSize", value: modalSize }])}
            body={
                <div>
                    <MoorhenConKit size={modalSize} resizeTrigger={false} />
                </div>
            }
        />
    );
};
