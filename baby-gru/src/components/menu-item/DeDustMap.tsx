import { batch, useDispatch, useSelector, useStore } from "react-redux";
import { useRef } from "react";
import { RootState } from "@/store";
import { useCommandCentre, useMoorhenInstance } from "../../InstanceManager";
import { setPrimaryMapRepresentation } from "../../store/mapRepresentationsSlice";
import { displayToCopy } from "../../utils/Representation/mapRepresentationData";
import { addMap } from "../../store/mapsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenButton } from "../inputs";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";
import { MoorhenStack } from "../interface-base";

export const DedustMap = () => {
    const dispatch = useDispatch();

    const maps = useSelector((state: moorhen.State) => state.maps);
    const selectRef = useRef<HTMLSelectElement>(null);
    const moorhenInstance = useMoorhenInstance();

    const onCompleted = async () => {
        if (!selectRef.current?.value) {
            return;
        }

        const mapNo = parseInt(selectRef.current.value);
        const newMap = new MoorhenMap(moorhenInstance);
        const selectedMap = maps.find(map => map.molNo === mapNo);

        if (!selectedMap) {
            return;
        }

        const result = await moorhenInstance.workerCommand.dedust_map(mapNo);

        if (result.data.result.result !== -1) {
            newMap.molNo = result.data.result.result;
            selectedMap.copyMapParametersTo(newMap);
            newMap.name = `Dusted ${mapNo}`;
            
            await newMap.initialise();
            // It shows what the map it was made from showed, which is hidden (display records, map-display.md)
            newMap.initialDisplay = displayToCopy(selectedMap.primaryRepresentation);
            dispatch(setPrimaryMapRepresentation({ mapUid: selectedMap.uniqueId, changes: { visible: false } }));
            dispatch(addMap(newMap));
        }
    };

    return (
        <>
            <MoorhenStack inputGrid>
            <MoorhenMapSelect maps={maps} ref={selectRef} />
            </MoorhenStack>
            <MoorhenButton onClick={onCompleted}>Apply</MoorhenButton>
        </>
    );
};
