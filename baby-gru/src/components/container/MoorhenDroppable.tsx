import { useSelector, useDispatch, useStore } from "react-redux";
import { useDropzone } from "react-dropzone";
import { autoOpenFiles } from "../../utils/MoorhenFileLoading";
import { moorhen } from "../../types/moorhen";
import { useCommandCentre } from "../../InstanceManager";

interface MoorhenDroppablePropsInterface {
    monomerLibraryPath: string;
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    children?: React.ReactNode;
}

export const MoorhenDroppable = (props: MoorhenDroppablePropsInterface) => {
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);
    const dispatch = useDispatch();
    const store = useStore();
    const commandCentre = useCommandCentre();

    const { getRootProps } = useDropzone({
        onDrop: async (files) => {
            autoOpenFiles(
                files,
                commandCentre,
                store,
                props.monomerLibraryPath,
                backgroundColor,
                defaultBondSmoothness,
                props.timeCapsuleRef,
                dispatch
            );
        },
    });

    return <div {...getRootProps({ className: "dropzone" })}>{props.children}</div>;
};
