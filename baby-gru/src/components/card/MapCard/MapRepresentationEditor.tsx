import { useMapDisplay } from "../../../hooks/useMapDisplay";
import { moorhen } from "../../../types/moorhen";
import { MoorhenStack } from "../../interface-base";
import { MapColourSelector } from "./MapColourSelector";
import { MapSettingsAccordion } from "./MapSettingsAccordion";

/**
 * A map representation's colour, level and draw settings, in its chip's edit popover (multi-representation mode),
 * for that representation (`recordId`). The colour picker is the card's (positive / negative for a difference map;
 * picking a colour ends colouring by another map).
 * @param level - The card's level controls (MapLevelControls, OrbitalLevelControls) for that representation.
 */
export const MapRepresentationEditor = (props: {
    map: moorhen.Map;
    recordId: string;
    level: React.ReactNode;
    hideRadiusControls?: boolean;
    offerSlice?: boolean;
}) => {
    const display = useMapDisplay(props.map, props.recordId);
    return (
        <>
            <MoorhenStack direction="row" align="center" gap="0.5rem">
                <span>Colour</span>
                <MapColourSelector map={props.map} mapIsVisible={display.visible} recordId={props.recordId} />
            </MoorhenStack>
            {props.level}
            <MapSettingsAccordion
                bare
                map={props.map}
                recordId={props.recordId}
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
