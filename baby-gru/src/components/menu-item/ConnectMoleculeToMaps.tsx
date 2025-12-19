import { useSnackbar } from "notistack";
import { batch, useDispatch, useSelector } from "react-redux";
import { useRef } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { setContourLevel } from "../../store/mapContourSettingsSlice";
import {
    enableUpdatingMaps,
    setConnectedMoleculeMolNo,
    setFoFcMapMolNo,
    setReflectionMapMolNo,
    setTwoFoFcMapMolNo,
} from "../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";
import { MoorhenStack } from "../interface-base";

export const ConnectMoleculeToMaps = () => {
    const commandCentre = useCommandCentre();
    const mapSelectRef = useRef<null | HTMLSelectElement>(null);
    const twoFoFcSelectRef = useRef<null | HTMLSelectElement>(null);
    const foFcSelectRef = useRef<null | HTMLSelectElement>(null);
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const connectedMoleculeMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.connectedMolecule);

    const dispatch = useDispatch();

    const { enqueueSnackbar } = useSnackbar();

    const menuItemText = "Connect mol. and map for updating...";

    const connectMap = async () => {
        const [molecule, reflectionMap, twoFoFcMap, foFcMap] = [
            // props.selectedMolNo !== undefined ? props.selectedMolNo : parseInt(moleculeSelectRef.current.value),
            parseInt(moleculeSelectRef.current.value),
            parseInt(mapSelectRef.current.value),
            parseInt(twoFoFcSelectRef.current.value),
            parseInt(foFcSelectRef.current.value),
        ];
        const uniqueMaps = [...new Set([reflectionMap, twoFoFcMap, foFcMap].slice(1))];
        const connectMapsArgs = [molecule, reflectionMap, twoFoFcMap, foFcMap];
        const sFcalcArgs = [molecule, twoFoFcMap, foFcMap, reflectionMap];

        if (connectMapsArgs.every(arg => !isNaN(arg))) {
            //Calculate rmsd before connecting
            const prevRmsd = await Promise.all(
                uniqueMaps.map(imol => {
                    const currentMap = maps.find(map => map.molNo === imol);
                    return currentMap.fetchMapRmsd();
                })
            );

            // Connect maps
            await commandCentre.current.cootCommand(
                {
                    command: "connect_updating_maps",
                    commandArgs: connectMapsArgs,
                    returnType: "status",
                },
                false
            );

            await commandCentre.current.cootCommand(
                {
                    command: "sfcalc_genmaps_using_bulk_solvent",
                    commandArgs: sFcalcArgs,
                    returnType: "status",
                },
                false
            );

            // If there was a previous connected molecule, disconnect it
            if (connectedMoleculeMolNo) {
                const previousConnectedMolecule = molecules.find(molecule => molecule.molNo === connectedMoleculeMolNo);
                previousConnectedMolecule.connectedToMaps = null;
            }

            // Dispatch redux
            batch(() => {
                dispatch(setFoFcMapMolNo(foFcMap));
                dispatch(setTwoFoFcMapMolNo(twoFoFcMap));
                dispatch(setReflectionMapMolNo(reflectionMap));
                dispatch(setConnectedMoleculeMolNo(molecule));
                dispatch(enableUpdatingMaps());
            });

            //Adjust contour to match previous rmsd
            await Promise.all(
                uniqueMaps.map(async (imol, index) => {
                    const currentMap = maps.find(map => map.molNo === imol);
                    const postRmsd = await currentMap.fetchMapRmsd();
                    const { contourLevel } = currentMap.getMapContourParams();
                    let newContourLevel = (contourLevel * postRmsd) / prevRmsd[index];
                    if (currentMap.isDifference) {
                        newContourLevel -= newContourLevel * 0.3;
                    }
                    dispatch(setContourLevel({ molNo: currentMap.molNo, contourLevel: newContourLevel }));
                })
            );
        } else {
            enqueueSnackbar("Missing input data", { variant: "warning" });
        }
    };

    const onCompleted = async () => {
        return await connectMap();
    };

    return (
        <MoorhenStack inputGrid>
            <MoorhenMapSelect
                maps={maps}
                ref={mapSelectRef}
                filterFunction={map => map.hasReflectionData}
                width="100%"
                label="Reflection data"
            />

            <MoorhenMapSelect maps={maps} ref={twoFoFcSelectRef} label="2foFc" width="100%" />

            <MoorhenMapSelect maps={maps} ref={foFcSelectRef} label="FoFc" filterFunction={map => map.isDifference} width="100%" />

            <MoorhenMoleculeSelect
                molecules={molecules}
                ref={moleculeSelectRef}
                label="Molecule"
                allowAny={false}
                style={{ width: "100%" }}
            />
            <MoorhenButton onClick={onCompleted}>Ok</MoorhenButton>
        </MoorhenStack>
    );
};
