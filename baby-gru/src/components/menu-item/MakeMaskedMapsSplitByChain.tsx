import { useSnackbar } from "notistack";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useRef } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { hideMap, setContourLevel, setMapAlpha, setMapRadius, setMapStyle } from "../../store/mapContourSettingsSlice";
import { addMap } from "../../store/mapsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenButton } from "../inputs";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";

export const MakeMaskedMapsSplitByChain = () => {
    const moleculeSelectRef = useRef<HTMLSelectElement>(null);
    const mapSelectRef = useRef<HTMLSelectElement>(null);

    const dispatch = useDispatch();
    const maps = useSelector((state: moorhen.State) => state.maps);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const commandCentre = useCommandCentre();
    const store = useStore();

    const { enqueueSnackbar } = useSnackbar();

    const menuItemText = "Split map by chain...";

    const onCompleted = async () => {
        if (!mapSelectRef.current?.value || !moleculeSelectRef.current?.value) {
            return;
        }

        const mapNo = parseInt(mapSelectRef.current.value);
        const moleculeNo = parseInt(moleculeSelectRef.current.value);
        const selectedMolecule = molecules.find(molecule => molecule.molNo === moleculeNo);
        const selectedMap = maps.find(map => map.molNo === mapNo);

        if (!selectedMap || !selectedMolecule) {
            return;
        }

        const result = (await commandCentre.current.cootCommand(
            {
                returnType: "int_array",
                command: "make_masked_maps_split_by_chain",
                commandArgs: [moleculeNo, mapNo],
            },
            false
        )) as moorhen.WorkerResponse<number[]>;

        if (result.data.result.result.length > 0) {
            await Promise.all(
                result.data.result.result.map(async (iNewMap, listIndex) => {
                    const newMap = new MoorhenMap(commandCentre, store);
                    newMap.molNo = iNewMap;
                    newMap.name = `Chain ${listIndex} of ${selectedMap.name}`;
                    newMap.isDifference = selectedMap.isDifference;
                    await newMap.getSuggestedSettings();
                    const { mapRadius, contourLevel, mapAlpha, mapStyle } = selectedMap.getMapContourParams();
                    dispatch(setMapRadius({ molNo: newMap.molNo, radius: mapRadius }));
                    dispatch(setContourLevel({ molNo: newMap.molNo, contourLevel: contourLevel }));
                    dispatch(setMapAlpha({ molNo: newMap.molNo, alpha: mapAlpha }));
                    dispatch(setMapStyle({ molNo: newMap.molNo, style: mapStyle }));
                    dispatch(hideMap(selectedMap));
                    dispatch(addMap(newMap));
                })
            );
        } else {
            enqueueSnackbar("Unable to create mask", { variant: "error" });
        }
        return result;
    };

    return (
        <>
            <MoorhenMapSelect maps={maps} ref={mapSelectRef} />
            <MoorhenMoleculeSelect molecules={molecules} ref={moleculeSelectRef} />
            <MoorhenButton onClick={onCompleted}>Ok</MoorhenButton>
        </>
    );
};
