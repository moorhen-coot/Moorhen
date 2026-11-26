import { batch, useDispatch, useSelector, useStore } from "react-redux";
import { useRef } from "react";
import { RootState } from "@/store";
import { useCommandCentre, useMoorhenInstance } from "../../InstanceManager";
import { setMapVisible } from "../../store/mapRepresentationsSlice";
import { displayToCopy } from "../../utils/Representation/mapRepresentationData";
import { addMap } from "../../store/mapsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenButton } from "../inputs";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";
import { MoorhenStack } from "../interface-base";

export const FlipMapHand = () => {
    const dispatch = useDispatch();

    const maps = useSelector((state: moorhen.State) => state.maps);

    const selectRef = useRef<HTMLSelectElement>(null);
    const commandCentre = useCommandCentre();
    const moorhenInstance = useMoorhenInstance();


    const menuItemText = "Flip map...";

    const onCompleted = async () => {
        if (!selectRef.current.value) {
            return;
        }

        const mapNo = parseInt(selectRef.current.value);
        const newMap = new MoorhenMap(moorhenInstance);
        const selectedMap = maps.find(map => map.molNo === mapNo);

        if (!selectedMap) {
            return;
        }

        const result = (await commandCentre.current.cootCommand(
            {
                returnType: "status",
                command: "flip_hand",
                commandArgs: [mapNo],
            },
            true
        )) as moorhen.WorkerResponse<number>;

        if (result.data.result.result !== -1) {
            selectedMap.copyMapParametersTo(newMap);
            newMap.molNo = result.data.result.result;
            newMap.name = `Flipped map ${mapNo}`;
            
            await newMap.initialise();
            // It shows what the map it was made from showed (an EM map keeps its own radius), which is hidden (display records, map-display.md)
            newMap.initialDisplay = displayToCopy(selectedMap.primaryRepresentation);
            if (newMap.isEM) delete newMap.initialDisplay.radius;
            batch(() => {
                dispatch(setMapVisible({ mapUid: selectedMap.uniqueId, visible: false }));
                dispatch(addMap(newMap));
            });
        }
        document.body.click();
    };

    return (
        <>
            <MoorhenStack inputGrid>
                <MoorhenMapSelect maps={maps} ref={selectRef} />
            </MoorhenStack>
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
