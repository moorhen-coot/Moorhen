import { batch, useDispatch, useSelector, useStore } from "react-redux";
import { useRef } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { hideMap, setContourLevel, setMapAlpha, setMapRadius, setMapStyle } from "../../store/mapContourSettingsSlice";
import { addMap } from "../../store/mapsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenButton } from "../inputs";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";

export const FlipMapHand = () => {
    const dispatch = useDispatch();

    const maps = useSelector((state: moorhen.State) => state.maps);

    const selectRef = useRef<HTMLSelectElement>(null);
    const commandCentre = useCommandCentre();
    const store = useStore();

    const menuItemText = "Flip map...";

    const onCompleted = async () => {
        if (!selectRef.current.value) {
            return;
        }

        const mapNo = parseInt(selectRef.current.value);
        const newMap = new MoorhenMap(commandCentre, store);
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
            newMap.molNo = result.data.result.result;
            newMap.name = `Flipped map ${mapNo}`;
            await newMap.getSuggestedSettings();
            newMap.isDifference = selectedMap.isDifference;
            const { mapRadius, contourLevel, mapAlpha, mapStyle } = selectedMap.getMapContourParams();
            batch(() => {
                dispatch(setMapRadius({ molNo: newMap.molNo, radius: mapRadius }));
                dispatch(setContourLevel({ molNo: newMap.molNo, contourLevel: contourLevel }));
                dispatch(setMapAlpha({ molNo: newMap.molNo, alpha: mapAlpha }));
                dispatch(setMapStyle({ molNo: newMap.molNo, style: mapStyle }));
                dispatch(hideMap(selectedMap));
                dispatch(addMap(newMap));
            });
        }
        document.body.click();
    };

    return (
        <>
            <MoorhenMapSelect maps={maps} ref={selectRef} />
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
