import { useDispatch, useSelector } from "react-redux";
import { selectSelectedMapRepresentation, setMapRepresentation, setMapRepresentationAlpha } from "../../store/mapRepresentationsSlice";
import type { MapStyle } from "../../store/mapContourSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenSlider, MoorhenToggle } from "../inputs";

export const MapSettings = (props: {
    map: moorhen.Map;
    mapStyle: MapStyle;
    mapOpacity: number;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    disabled: boolean;
}) => {
    const dispatch = useDispatch();
    // The representation the map's card acts on (the selected one, else its first)
    const selectedId = useSelector((state: moorhen.State) => selectSelectedMapRepresentation(state, props.map.uniqueId)?.id);

    const menuItemText = "Draw settings";

    return (
        <>
            {props.mapStyle !== "lit-lines" && (
                <MoorhenToggle
                    type="switch"
                    checked={props.mapStyle === "solid"}
                    onChange={() => {
                        if (selectedId) dispatch(setMapRepresentation({ id: selectedId, changes: { style: props.mapStyle === "solid" ? "lines" : "solid" } }));
                    }}
                    label="Draw as a surface"
                />
            )}
            {props.mapStyle !== "solid" && (
                <MoorhenToggle
                    type="switch"
                    checked={props.mapStyle === "lit-lines"}
                    onChange={() => {
                        if (selectedId) dispatch(setMapRepresentation({ id: selectedId, changes: { style: props.mapStyle === "lit-lines" ? "lines" : "lit-lines" } }));
                    }}
                    label="Activate lit lines"
                />
            )}
            <MoorhenSlider
                minVal={0.0}
                maxVal={1.0}
                decimalPlaces={2}
                scale="linear"
                sliderTitle="Opacity"
                value={props.mapOpacity}
                // The opacity of the style in use (each style keeps its own)
                setValue={(newVal: number) => selectedId && dispatch(setMapRepresentationAlpha({ id: selectedId, alpha: newVal }))}
            />
        </>
    );
};
