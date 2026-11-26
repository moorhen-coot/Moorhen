import { useMapDisplay } from "../../../hooks/useMapDisplay";
import { moorhen } from "../../../types/moorhen";
import { MoorhenStack } from "../../interface-base";
import { MapColourSelector } from "./MapColourSelector";
import { MapSettingsAccordion } from "./MapSettingsAccordion";

/**
 * A map representation's colour, level and draw settings, in its chip's edit popover (multi-representation mode).
 * Acts on the selected representation: opening the popover selects its chip. The colour picker is the card's
 * (positive / negative for a difference map; picking a colour ends colouring by another map).
 * @param level - The card's level controls (MapLevelControls, OrbitalLevelControls).
 */
export const MapRepresentationEditor = (props: {
    map: moorhen.Map;
    level: React.ReactNode;
    hideRadiusControls?: boolean;
    offerSlice?: boolean;
}) => {
    const display = useMapDisplay(props.map);
    return (
        <>
            <MoorhenStack direction="row" align="center" gap="0.5rem">
                <span>Colour</span>
                <MapColourSelector map={props.map} mapIsVisible={display.visible} />
            </MoorhenStack>
            {props.level}
            <MapSettingsAccordion
                bare
                map={props.map}
                mapIsVisible={display.visible}
                mapStyle={display.style}
                mapRadius={display.radius}
                mapOpacity={display.alpha}
                hideRadiusControls={props.hideRadiusControls}
                offerSlice={props.offerSlice}
            />
        </>
    );
};
