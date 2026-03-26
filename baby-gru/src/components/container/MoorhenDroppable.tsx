import { useDropzone } from "react-dropzone";
import { useDispatch, useSelector, useStore } from "react-redux";
import { RootState } from "@/store";
import { useCommandCentre } from "../../InstanceManager";
import { moorhen } from "../../types/moorhen";
import { autoOpenFiles } from "../../utils/MoorhenFileLoading";

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
    const store = useStore<RootState>();
    const commandCentre = useCommandCentre();

    const { getRootProps } = useDropzone({
        onDrop: async files => {
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
