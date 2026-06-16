import { useDispatch, useSelector, useStore } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { RootState, enqueueSnackbar } from "@/store";
import { useCommandCentre, useMoorhenInstance, usePaths } from "../../InstanceManager";
import { LhasaComponent } from "../../LhasaReact/src/Lhasa";
import { emptyRdkitMoleculePickleList } from "../../store/lhasaSlice";
import { addMolecule } from "../../store/moleculesSlice";
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenSpinner } from "../icons";
import { MoorhenDraggableModalBase, MoorhenStack } from "../interface-base";
import { OverlayModal } from "../interface-base/ModalBase/OverlayModal";

/// Internal wrapper for use in the scope of this file.
const LhasaWrapper = (props: { urlPrefix: string; width?: number; height?: number }) => {
    const rdkitMoleculePickleList = useSelector((state: moorhen.State) => state.lhasa.rdkitMoleculePickleList);
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const originState = useSelector((state: moorhen.State) => state.glRef.origin);

    const [isCootAttached, setCootAttached] = useState(window.cootModule !== undefined);
    const [busy, setBusy] = useState<boolean>(false);

    const store = useStore<RootState>();
    const commandCentre = useCommandCentre();
    const monomerLibraryPath = usePaths().monomerLibraryPath;
    const dispatch = useDispatch();

    const handleCootAttached = useCallback(() => {
        if (window.cootModule !== undefined) {
            setCootAttached(true);
        } else {
            console.warn("Unable to locate coot module... Cannot start Lhasa.");
        }
    }, []);

    useEffect(() => {
        document.addEventListener("cootModuleAttached", handleCootAttached);
        return () => {
            document.removeEventListener("cootModuleAttached", handleCootAttached);
        };
    }, [handleCootAttached]);

    const moorhenInstance = useMoorhenInstance();

    const sendToHostProgramCallback = useCallback(
        async (internalLhasaID: number, id: string, smiles: string, rdkitPickleBase64: string) => {
            moorhenInstance.files.ligandFromSmiles(smiles, id);
        },
        [commandCentre, store, monomerLibraryPath]
    );

    const bansuCallback = useCallback((internalLhasaID: number, id: string, cif_string: string) => {
        moorhenInstance.files.loadCifString(cif_string, id);
    }, []);

    return isCootAttached ? (
        <OverlayModal
            isShown={false}
            overlay={
                <MoorhenStack justify="center" align="center">
                    <MoorhenSpinner colour="white" size="4rem" />
                    <span>Please wait...</span>
                </MoorhenStack>
            }
        >
            <LhasaComponent
                Lhasa={window.cootModule}
                show_footer={false}
                show_top_panel={false}
                rdkit_molecule_pickle_list={rdkitMoleculePickleList}
                icons_path_prefix={`${props.urlPrefix}/pixmaps/lhasa_icons/icons`}
                data_path_prefix={`${props.urlPrefix}/`}
                name_of_host_program="Moorhen"
                bansu_callback={bansuCallback}
                send_to_host_program_callback={sendToHostProgramCallback}
                dark_mode={isDark}
                width={props.width}
                height={props.height}
            />
        </OverlayModal>
    ) : null;
};

export const MoorhenLhasaModal = () => {
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const [lhasaWidth, setLhasaWidth] = useState<number>(convertRemToPx(37));
    const [lhasaHeight, setLhasaHeight] = useState<number>(convertViewtoPx(30, height));

    const urlPrefix = usePaths().urlPrefix;

    const dispatch = useDispatch();

    const handleClose = () => {
        dispatch(emptyRdkitMoleculePickleList());
    };

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.LHASA}
            initialHeight={682}
            initialWidth={551}
            headerTitle="Lhasa"
            onClose={handleClose}
            onResize={(_evt, _direction, _div, _delta, size) => {
                // console.log(`MoorhenLhasaModal::MoorhenDraggableModalBase::onResize() called. Size: ${JSON.stringify(size)}`);
                // Unfortunately it seems that the real amount of space is ever-so-slightly smaller because the surrounding padding
                // is not taken into consideration by this function.
                const pixel_margin = 20;
                setLhasaWidth(size.width);
                setLhasaHeight(size.height - pixel_margin);
            }}
            body={<LhasaWrapper urlPrefix={urlPrefix} height={lhasaHeight} width={lhasaWidth} />}
        />
    );
};
