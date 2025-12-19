import { useDispatch, useSelector, useStore } from "react-redux";
import { useState } from "react";
import { useCommandCentre, useMoorhenInstance, useTimeCapsule } from "../../InstanceManager";
import { RootState } from "../../store/MoorhenReduxStore";
import { autoOpenFiles } from "../../utils/MoorhenFileLoading";
import { MoorhenFileInput } from "../inputs";

export const AutoLoadFiles = () => {
    const commandCentre = useCommandCentre();
    const store = useStore();
    const defaultBondSmoothness = useSelector((state: RootState) => state.sceneSettings.defaultBondSmoothness);
    const monomerLibraryPath = useMoorhenInstance().paths.monomerLibraryPath;
    const dispatch = useDispatch();
    const timeCapsule = useTimeCapsule();
    const backgroundColor = useSelector((state: RootState) => state.sceneSettings.backgroundColor);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const autoLoadHandler = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsLoading(true);
        const files: File[] = [];
        if (e.target.files) {
            for (let ifile = 0; ifile < e.target.files.length; ifile++) {
                files.push(e.target.files[ifile]);
            }
            await autoOpenFiles(
                files,
                commandCentre,
                store,
                monomerLibraryPath,
                backgroundColor,
                defaultBondSmoothness,
                timeCapsule,
                dispatch
            );
        }
        setIsLoading(false);
    };

    return (
        <>
            <span className="moorhen__input__label-menu">Open Files</span>
            <MoorhenFileInput
                accept=".pdb, .mmcif, .cif, .ent, .mol, .mtz, .map, .pb,.mrc"
                multiple={true}
                isLoading={isLoading}
                className="moorhen_menu-custom-left-margin"
                onChange={e => {
                    autoLoadHandler(e);
                }}
            />
        </>
    );
};

// const LoadPDB = () => {
//     const loadPdbFiles = async (files: FileList) => {
//         const readPromises: Promise<moorhen.Molecule>[] = [];
//         Array.from(files).forEach(file => {
//             readPromises.push(readPdbFile(file));
//         });

//         let newMolecules: moorhen.Molecule[] = await Promise.all(readPromises);
//         if (!newMolecules.every(molecule => molecule.molNo !== -1)) {
//             enqueueSnackbar("Failed to read molecule", { variant: "warning" });
//             newMolecules = newMolecules.filter(molecule => molecule.molNo !== -1);
//             if (newMolecules.length === 0) {
//                 return;
//             }
//         }

//         const drawPromises: Promise<void>[] = [];
//         for (const newMolecule of newMolecules) {
//             drawPromises.push(newMolecule.fetchIfDirtyAndDraw(newMolecule.atomCount >= 50000 ? "CRs" : "CBs"));
//         }
//         await Promise.all(drawPromises);

//         dispatch(addMoleculeList(newMolecules));
//         newMolecules.at(-1).centreOn("/*/*/*/*", true);
//     };
//     return (
//         <>
//             <label htmlFor="coordinates-file-input" className="moorhen__input__label-menu">
//                 Coordinates
//             </label>
//             <input
//                 id="coordinates-file-input"
//                 className="moorhen__input-files-upload"
//                 type="file"
//                 accept=".pdb, .mmcif, .cif, .ent, .mol"
//                 multiple={true}
//                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
//                     loadPdbFiles(e.target.files);
//                 }}
//             />
//         </>
//     );
// };
