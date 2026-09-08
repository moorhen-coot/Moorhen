import { useDispatch, useSelector, useStore } from "react-redux";
import { useState } from "react";
import { RootState } from "@/store";
import { useCommandCentre, useMoorhenInstance } from "../../InstanceManager";
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

    const commandCentre = useCommandCentre();
    const moorhenInstance = useMoorhenInstance();

    const [useResample, setUseResample] = useState<boolean>(false);
    const [selectedMapNo, setSelectedMapNo] = useState<number | null>(null);
    const [resampleFactor, setResampleFactor] = useState<number>(1.4);
    const [bFactor, setBFactor] = useState<number>(50);

    const onCompleted = async () => {
        if (selectedMapNo === null || bFactor === null || (useResample && resampleFactor === null)) {
            console.warn("Unable to sharpen/blur map, invalid input...");
            console.warn(`selectedMapNo: ${selectedMapNo}, bFactor: ${bFactor}, resampleFactor: ${resampleFactor}`);
            return;
        }
        const newMap = new MoorhenMap(moorhenInstance);
        const selectedMap = maps.find(map => map.molNo === selectedMapNo);

        if (!selectedMap) {
            console.warn(`Unable to sharpen/blur map, could not find map with molNo ${selectedMapNo}...`);
            return;
        }

        let result: moorhen.WorkerResponse<number>;
        if (!useResample) {
            result = (await commandCentre.current.cootCommand(
                {
                    returnType: "int",
                    command: "sharpen_blur_map",
                    commandArgs: [selectedMapNo, bFactor, false],
                },
                false
            )) as moorhen.WorkerResponse<number>;
        } else {
            result = (await commandCentre.current.cootCommand(
                {
                    returnType: "int",
                    command: "sharpen_blur_map_with_resample",
                    commandArgs: [selectedMapNo, bFactor, resampleFactor, false],
                },
                false
            )) as moorhen.WorkerResponse<number>;
        }

        if (result.data.result.result !== -1) {
            newMap.molNo = result.data.result.result;
            selectedMap.copyMapParametersTo(newMap);
            newMap.name = `Map ${selectedMapNo} ${bFactor < 0 ? "sharpened" : "blurred"} by ${bFactor}`;
            await newMap.initialise();
            const { mapRadius, contourLevel, mapAlpha, mapStyle } = selectedMap.getMapContourParams();
            dispatch(setMapRadius({ molNo: newMap.molNo, radius: mapRadius }));
            dispatch(setContourLevel({ molNo: newMap.molNo, contourLevel: contourLevel }));
            dispatch(setMapAlpha({ molNo: newMap.molNo, alpha: mapAlpha }));
            dispatch(setMapStyle({ molNo: newMap.molNo, style: mapStyle }));
            dispatch(hideMap(selectedMap));
            dispatch(addMap(newMap));
        }
        console.log(`Sharpen/blur map result: ${result.data.result.result}`);

        return result;
    };

    return (
        <>
            <MoorhenStack inputGrid>
                <MoorhenMapSelect maps={maps} selectedMap={selectedMapNo} setSelectedMap={setSelectedMapNo} />
                <MoorhenNumberInput label="B-factor to apply" value={bFactor} setValue={setBFactor} allowNegativeValues={true} />
                <MoorhenToggle
                    type="switch"
                    checked={useResample}
                    onChange={() => {
                        setUseResample(prev => !prev);
                    }}
                    label="Use resample"
                />
                {useResample && (
                    <>
                        <MoorhenNumberInput label="Resampling factor" value={resampleFactor} setValue={setResampleFactor} /> <div />
                    </>
                )}
            </MoorhenStack>
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
