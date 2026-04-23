import { useDispatch, useSelector, useStore } from "react-redux";
import { useRef, useState } from "react";
import { RootState } from "@/store";
import { useCommandCentre } from "../../InstanceManager";
import { hideMap, setContourLevel, setMapAlpha, setMapRadius, setMapStyle } from "../../store/mapContourSettingsSlice";
import { addMap } from "../../store/mapsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenButton, MoorhenNumberInput, MoorhenToggle } from "../inputs";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";
import { MoorhenStack } from "../interface-base";

export const SharpenBlurMap = () => {
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const maps = useSelector((state: moorhen.State) => state.maps);

    const factorRef = useRef<HTMLInputElement>(null);
    const resampleFactorRef = useRef<HTMLInputElement>(null);
    const selectRef = useRef<HTMLSelectElement>(null);
    const useResampleSwitchRef = useRef<HTMLInputElement>(null);
    const commandCentre = useCommandCentre();

    const [useResample, setUseResample] = useState<boolean>(false);

    const menuItemText = "Sharpen/Blur map...";

    const onCompleted = async () => {
        if (!selectRef.current.value || !factorRef.current || (useResampleSwitchRef.current.checked && !resampleFactorRef.current)) {
            console.warn("Unable to sharpen/blur map, invalid input...");
            return;
        }

        const mapNo = parseInt(selectRef.current.value);
        const bFactor = parseFloat(factorRef.current.value);
        const newMap = new MoorhenMap(commandCentre, store);
        const selectedMap = maps.find(map => map.molNo === mapNo);

        if (!selectedMap) {
            return;
        }

        let result: moorhen.WorkerResponse<number>;
        if (!useResampleSwitchRef.current.checked) {
            result = (await commandCentre.current.cootCommand(
                {
                    returnType: "int",
                    command: "sharpen_blur_map",
                    commandArgs: [mapNo, bFactor, false],
                },
                false
            )) as moorhen.WorkerResponse<number>;
        } else {
            const resampleFactor = parseFloat(resampleFactorRef.current.value);
            result = (await commandCentre.current.cootCommand(
                {
                    returnType: "int",
                    command: "sharpen_blur_map_with_resample",
                    commandArgs: [mapNo, bFactor, resampleFactor, false],
                },
                false
            )) as moorhen.WorkerResponse<number>;
        }

        if (result.data.result.result !== -1) {
            newMap.molNo = result.data.result.result;
            newMap.name = `Map ${mapNo} ${bFactor < 0 ? "sharpened" : "blurred"} by ${bFactor}`;
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

        return result;
    };

    return (
        <>
        <MoorhenStack inputGrid>
            <MoorhenMapSelect maps={maps} ref={selectRef} />
            <MoorhenNumberInput ref={factorRef} label="B-factor to apply" value={50} allowNegativeValues={true} />
            <MoorhenToggle
                ref={useResampleSwitchRef}
                type="switch"
                checked={useResample}
                onChange={() => {
                    setUseResample(prev => !prev);
                }}
                label="Use resample"
            />
            {useResample && <MoorhenNumberInput ref={resampleFactorRef} label="Resampling factor" value={1.4} />}
        </MoorhenStack>
        <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
