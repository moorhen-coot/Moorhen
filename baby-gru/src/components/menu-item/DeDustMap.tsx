import { batch, useDispatch, useSelector, useStore } from "react-redux";
import { useRef } from "react";
import { useCommandCentre, useMoorhenInstance } from "../../InstanceManager";
import { hideMap, setContourLevel, setMapAlpha, setMapRadius, setMapStyle } from "../../store/mapContourSettingsSlice";
import { addMap } from "../../store/mapsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenButton } from "../inputs";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";

export const DedustMap = () => {
    const dispatch = useDispatch();

    const maps = useSelector((state: moorhen.State) => state.maps);
    const selectRef = useRef<HTMLSelectElement>(null);
    const moorhenInstance = useMoorhenInstance();
    const commandCentre = useCommandCentre();
    const store = useStore();

    const onCompleted = async () => {
        if (!selectRef.current?.value) {
            return;
        }

        const mapNo = parseInt(selectRef.current.value);
        const newMap = new MoorhenMap(commandCentre, store);
        const selectedMap = maps.find(map => map.molNo === mapNo);

        if (!selectedMap) {
            return;
        }

        const result = await moorhenInstance.cootCommand.dedust_map(mapNo);

        if (result.data.result.result !== -1) {
            newMap.molNo = result.data.result.result;
            newMap.name = `Dusted ${mapNo}`;
            await newMap.getSuggestedSettings();
            newMap.isDifference = selectedMap.isDifference;
            const { mapRadius, contourLevel, mapAlpha, mapStyle } = selectedMap.getMapContourParams();
            dispatch(setMapRadius({ molNo: newMap.molNo, radius: mapRadius }));
            dispatch(setContourLevel({ molNo: newMap.molNo, contourLevel: contourLevel }));
            dispatch(setMapAlpha({ molNo: newMap.molNo, alpha: mapAlpha }));
            dispatch(setMapStyle({ molNo: newMap.molNo, style: mapStyle }));
            dispatch(hideMap(selectedMap));
            dispatch(addMap(newMap));
        }
    };

    return (
        <>
            <MoorhenMapSelect maps={maps} ref={selectRef} />
            <MoorhenButton onClick={onCompleted}>Apply</MoorhenButton>
        </>
    );
};
