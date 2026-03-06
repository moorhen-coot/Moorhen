import { useSelector } from "react-redux";
import { RootState } from "../../store/MoorhenReduxStore";
import { doDownload } from "../../utils/utils";
import { MoorhenMenuItem } from "../interface-base";

export const ExportGltf = () => {
    const maps = useSelector((state: RootState) => state.maps);
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const handleExportGltf = async () => {
        // for (const map of maps) {
        //     const gltfData = await map.exportAsGltf();
        //     if (gltfData) {
        //         doDownload([gltfData], `${map.name}.glb`);
        //     }
        // }
        // for (const molecule of molecules) {
        //     let index = 0;
        //     for (const representation of molecule.representations) {
        //         if (representation.visible) {
        //             const gltfData = await representation.exportAsGltf();
        //             if (gltfData) {
        //                 index += 1;
        //                 doDownload([gltfData], `${molecule.name}-${index}.glb`);
        //             }
        //         }
        //     }
        // }
    };

    return (
        <MoorhenMenuItem id="export-gltf-menu-item" onClick={handleExportGltf}>
            Export scene as gltf
        </MoorhenMenuItem>
    );
};
