import { useDropzone } from "react-dropzone";
import { useSelector} from "react-redux";
import { useMoorhenInstance } from "../../InstanceManager";
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
    const moorhenInstance =useMoorhenInstance()


    const { getRootProps } = useDropzone({
        onDrop: async files => {
            autoOpenFiles(
                files,
                moorhenInstance,
                backgroundColor,
                defaultBondSmoothness
            );
        },
    });

    return <div {...getRootProps({ className: "dropzone" })}>{props.children}</div>;
};
