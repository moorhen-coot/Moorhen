import { useDispatch, useSelector, useStore } from "react-redux";
import { useRef } from "react";
import { RootState, enqueueSnackbar } from "@/store";
import { useCommandCentre, useMoorhenInstance } from "../../InstanceManager";
import { setMapVisible } from "../../store/mapRepresentationsSlice";
import { displayToCopy } from "../../utils/Representation/mapRepresentationData";
import { addMap } from "../../store/mapsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";
import { MoorhenStack } from "../interface-base";

export const MakeMaskedMapsSplitByChain = () => {
    const moleculeSelectRef = useRef<HTMLSelectElement>(null);
    const mapSelectRef = useRef<HTMLSelectElement>(null);

    const dispatch = useDispatch();
    const maps = useSelector((state: moorhen.State) => state.maps);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const commandCentre = useCommandCentre();
    const moorhenInstance = useMoorhenInstance();

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
                    const newMap = new MoorhenMap(moorhenInstance);
                    newMap.molNo = iNewMap;
                    selectedMap.copyMapParametersTo(newMap);
                    newMap.name = `Chain ${listIndex} of ${selectedMap.name}`;
                    
                    await newMap.initialise();
                    // It shows what the map it was made from showed (an EM map keeps its own radius), which is hidden (display records, map-display.md)
                    newMap.initialDisplay = displayToCopy(selectedMap.primaryRepresentation);
                    if (newMap.isEM) delete newMap.initialDisplay.radius;
                    dispatch(setMapVisible({ mapUid: selectedMap.uniqueId, visible: false }));
                    dispatch(addMap(newMap));
                })
            );
        } else {
            dispatch(enqueueSnackbar({ message: "Unable to create mask", variant: "error" }));
        }
        return result;
    };

    return (
        <>
            <MoorhenStack inputGrid>
                <MoorhenMapSelect maps={maps} ref={mapSelectRef} />
                <MoorhenMoleculeSelect molecules={molecules} ref={moleculeSelectRef} />
            </MoorhenStack>
            <MoorhenButton onClick={onCompleted}>Ok</MoorhenButton>
        </>
    );
};
