import { useDispatch } from "react-redux";
import { setMapAlpha, setMapStyle } from "../../store/mapContourSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenSlider, MoorhenToggle } from "../inputs";

export const MapSettings = (props: {
    map: moorhen.Map;
    mapStyle: "solid" | "lit-lines" | "lines";
    mapOpacity: number;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    disabled: boolean;
}) => {
    const dispatch = useDispatch();

    const menuItemText = "Draw settings";

    return (
        <>
            {props.mapStyle !== "lit-lines" && (
                <MoorhenToggle
                    type="switch"
                    checked={props.mapStyle === "solid"}
                    onChange={() => {
                        dispatch(setMapStyle({ molNo: props.map.molNo, style: props.mapStyle === "solid" ? "lines" : "solid" }));
                    }}
                    label="Draw as a surface"
                />
            )}
            {props.mapStyle !== "solid" && (
                <MoorhenToggle
                    type="switch"
                    checked={props.mapStyle === "lit-lines"}
                    onChange={() => {
                        dispatch(setMapStyle({ molNo: props.map.molNo, style: props.mapStyle === "lit-lines" ? "lines" : "lit-lines" }));
                    }}
                    label="Activate lit lines"
                />
            )}
            <MoorhenSlider
                minVal={0.0}
                maxVal={1.0}
                decimalPlaces={2}
                logScale={false}
                sliderTitle="Opacity"
                externalValue={props.mapOpacity}
                setExternalValue={(newVal: number) => dispatch(setMapAlpha({ molNo: props.map.molNo, alpha: newVal }))}
            />
        </>
    );
};
