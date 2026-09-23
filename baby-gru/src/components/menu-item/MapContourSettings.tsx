import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import {
    setDefaultMapLitLines,
    setDefaultMapSamplingRate,
    setDefaultMapSurface,
    setMapLineWidth,
    setReContourMapOnlyOnMouseUp,
} from "../../store/mapContourSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenSlider, MoorhenToggle } from "../inputs";
import { MoorhenStack } from "../interface-base";

const samplingRateValues = [1.5, 1.8, 2.1, 2.5, 3.0, 3.5, 4.0];

export const MapContourSettings = () => {
    const maps = useSelector((state: moorhen.State) => state.maps);
    const defaultMapSamplingRate = useSelector((state: moorhen.State) => state.mapContourSettings.defaultMapSamplingRate);
    const mapLineWidth = useSelector((state: moorhen.State) => state.mapContourSettings.mapLineWidth);
    const visibleMaps = useSelector((state: moorhen.State) => state.mapContourSettings.visibleMaps);
    const defaultMapLitLines = useSelector((state: moorhen.State) => state.mapContourSettings.defaultMapLitLines);
    const defaultMapSurface = useSelector((state: moorhen.State) => state.mapContourSettings.defaultMapSurface);
    const reContourMapOnlyOnMouseUp = useSelector((state: moorhen.State) => state.mapContourSettings.reContourMapOnlyOnMouseUp);
    const commandCentre = useCommandCentre();

    const [mapSampling, setMapSampling] = useState<number>(defaultMapSamplingRate);

    const dispatch = useDispatch();

    useEffect(() => {
        const setMapSamplingRate = async () => {
            const newSamplingRate = mapSampling;

            if (newSamplingRate !== defaultMapSamplingRate) {
                await commandCentre.current.cootCommand(
                    {
                        command: "set_map_sampling_rate",
                        commandArgs: [newSamplingRate],
                        returnType: "status",
                    },
                    false
                );

                dispatch(setDefaultMapSamplingRate(newSamplingRate));

                if (maps.length > 0) {
                    await Promise.all(
                        maps
                            .filter(map => !map.isEM && map.hasReflectionData)
                            .map(async (map: moorhen.Map) => {
                                const reflectionData = await map.fetchReflectionData();
                                (await commandCentre.current.cootCommand(
                                    {
                                        returnType: "status",
                                        command: "shim_replace_map_by_mtz_from_file",
                                        commandArgs: [map.molNo, reflectionData.data.result.mtzData, map.selectedColumns],
                                    },
                                    true
                                )) as moorhen.WorkerResponse<number>;
                                if (visibleMaps.includes(map.molNo)) {
                                    return map.drawMapContour();
                                } else {
                                    return Promise.resolve();
                                }
                            })
                    );
                }
            }
        };

        setMapSamplingRate();
    }, [mapSampling]);

    return (
        <MoorhenStack>
            <MoorhenToggle
                type="switch"
                checked={defaultMapLitLines}
                onChange={() => {
                    if (!defaultMapLitLines) {
                        dispatch(setDefaultMapSurface(false));
                    }
                    dispatch(setDefaultMapLitLines(!defaultMapLitLines));
                }}
                label="Show maps as lit lines by default"
            />
            <MoorhenToggle
                type="switch"
                checked={defaultMapSurface}
                onChange={() => {
                    if (!defaultMapSurface) {
                        dispatch(setDefaultMapLitLines(false));
                    }
                    dispatch(setDefaultMapSurface(!defaultMapSurface));
                }}
                label="Show maps as surface by default"
            />
            <MoorhenToggle
                type="switch"
                checked={reContourMapOnlyOnMouseUp}
                onChange={() => {
                    dispatch(setReContourMapOnlyOnMouseUp(!reContourMapOnlyOnMouseUp));
                }}
                label="Recontour maps only on mouse up"
            />

            <hr></hr>

            <MoorhenSlider
                minVal={0.1}
                maxVal={1.5}
                sliderTitle="Map lines thickness"
                value={mapLineWidth}
                setValue={(val: number) => dispatch(setMapLineWidth(val))}
                decimalPlaces={2}
            />
            <div style={{ padding: "0.5rem" }}>
                <MoorhenSlider
                    sliderTitle="Map sampling rate"
                    minVal={1.5}
                    maxVal={4.0}
                    scale="asinh"
                    showTitleValue={false}
                    aria-label="Map sampling rate"
                    value={mapSampling}
                    setValue={(value: number) => setMapSampling(value)}
                    allowedValues={samplingRateValues}
                    labels={samplingRateValues.map(mark => {
                        return { value: mark, label: mark.toFixed(1).toString(), tick: true };
                    })}
                />
            </div>
        </MoorhenStack>
    );
};
("Map contour settings...");
