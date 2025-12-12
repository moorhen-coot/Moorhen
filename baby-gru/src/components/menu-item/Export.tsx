import { useSelector } from "react-redux";
import { RootState } from "../../store/MoorhenReduxStore";
import { doDownload, guid, make3MFZipFile, readDataFile } from "../../utils/utils";
import { MoorhenMenuItem, MoorhenStack } from "../interface-base";

export const ExportMenuItem = () => {
    const maps = useSelector((state: RootState) => state.maps);
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);

    const handleExportObj = async (fileType: string) => {
        let suffix;
        if (fileType === "obj") suffix = "obj";
        else if (fileType === "gltf") suffix = "glb";
        else if (fileType === "3mf") suffix = "3mf";
        else return;
        for (const map of maps) {
            const gltfData = await map.exportAsMeshFile(fileType);
            if (gltfData) {
                if (fileType === "3mf") {
                    console.log("Now some jiggery pokery ...");
                }
                doDownload([gltfData], `${map.name}.${suffix}`);
            }
        }
        for (const molecule of molecules) {
            let index = 0;
            for (const representation of molecule.representations) {
                if (representation.visible) {
                    const gltfData = await representation.exportAsMeshFile(fileType);
                    if (gltfData) {
                        index += 1;
                        if (fileType === "3mf") {
                            console.log("Now some jiggery pokery ...");
                            const zipData = await make3MFZipFile(gltfData);
                            doDownload([zipData], `${molecule.name}-${index}.${suffix}`);
                        } else {
                            doDownload([gltfData], `${molecule.name}-${index}.${suffix}`);
                        }
                    }
                }
            }
        }
    };

    return (
        <MoorhenStack>
            <MoorhenMenuItem id="export-gltf-menu-item" onClick={() => handleExportObj("gltf")}>
                gltf
            </MoorhenMenuItem>
            <MoorhenMenuItem id="export-obj-menu-item" onClick={() => handleExportObj("obj")}>
                obj
            </MoorhenMenuItem>
            <MoorhenMenuItem id="export-3mf-menu-item" onClick={() => handleExportObj("3mf")}>
                3mf
            </MoorhenMenuItem>{" "}
        </MoorhenStack>
    );
};
