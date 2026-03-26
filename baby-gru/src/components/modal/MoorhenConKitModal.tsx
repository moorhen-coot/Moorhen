import { LastPageOutlined } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { Button, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { usePaths } from "@/InstanceManager";
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

    const [modalSize, setModalSize] = usePersistentState<{ width: number; height: number }>(
        menu,
        "modalSize",
        {
            width: undefined,
            height: undefined,
        },
        false
    );

    const path = usePaths().urlPrefix;

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
            <h2>Image Test</h2>
            <img src={`${path}/pixmaps/docs/ConKit.jpg`} alt="ConKit image" />
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
            lockAspectRatio={true}
            initialHeight={modalSize.height}
            initialWidth={modalSize.width}
            onResize={(evt, ref, direction, delta, size) => {
                setModalSize(size);
            }}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle={tittleBar}
            footer={null}
            onResizeStop={() => dispatchPersistentStates(dispatch, menu, [{ key: "modalSize", value: modalSize }])}
            body={<MoorhenConKit size={modalSize} resizeTrigger={false} />}
        />
    );
};
