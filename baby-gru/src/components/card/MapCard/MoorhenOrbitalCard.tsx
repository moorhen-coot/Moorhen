/**
 * The card for a map that came from a Gaussian Cube.
 *
 * A cut-down map card, and cut down on purpose rather than for want of time. Three of the map
 * card's controls mean nothing here:
 *
 * - **Active.** The active map is the one refinement and the scroll wheel act on. An orbital is
 *   not something to refine against, so there is no choice to offer - and leaving the toggle in
 *   would invite someone to take the active map away from the map they are actually working on.
 * - **The histogram.** It is there to find a level in a map whose values have no absolute meaning.
 *   A cube states the level that covers most of the orbital, and that is a better answer than one
 *   read off a plot.
 * - **The radius.** The grid is a few angstrom across and is drawn whole. A radius control here
 *   would be a slider where every setting large enough looks the same.
 *
 * What is left is what an orbital actually needs: a colour (two of them, for the two lobes), a
 * visibility toggle, somewhere to put the view, a level, and the draw settings.
 */

import { useDispatch } from "react-redux";
import { setMapVisible } from "@/store/mapRepresentationsSlice";
import { MapRepresentationsToolbar, MapRepresentationsCard } from "./MapRepresentationChips";
import { useIsMultiRepresentation } from "../../../hooks/useMapDisplay";
import { OrbitalLevelControls } from "./MapLevelControls";
import { MapRepresentationEditor } from "./MapRepresentationEditor";
import { useMemo } from "react";
import { useMapDisplay } from "../../../hooks/useMapDisplay";
import { setRequestDrawScene } from "../../../store/glRefSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenButton, MoorhenPopoverButton } from "../../inputs";
import { MoorhenAccordion, MoorhenMenuItemPopover, MoorhenStack } from "../../interface-base";
import { DeleteDisplayObject } from "../../menu-item";
import { ItemName } from "../utils/ItemName";
import { MapColourSelector } from "./MapColourSelector";
import { MapSettingsAccordion } from "./MapSettingsAccordion";
import { MoorhenMapInfoCard } from "./MoorhenMapInfoCard";

type MoorhenOrbitalCardPropsInterface = {
    map: moorhen.Map;
    initialContour?: number;
    isOpen?: boolean;
    onCollapseToggle?: (key: number, isOpen: boolean) => void;
};

export const MoorhenOrbitalCard = (props: MoorhenOrbitalCardPropsInterface) => {
    const { initialContour = 0.02 } = props;
    const dispatch = useDispatch();

    // From the map's display record (map-display.md): the radius of the draw mode and the opacity of the style in use
    const display = useMapDisplay(props.map);
    const mapRadius = display.radius;
    const mapStyle = display.style;
    const mapOpacity = display.alpha;
    // Draw Settings act on the first representation: usable while it is shown. The map's own actions while any is
    const mapIsVisible = display.visible;
    const mapShown = display.mapVisible;

    // Multi-representation mode: each representation's level and draw settings are in its chip's edit popover
    const isMultiRepresentation = useIsMultiRepresentation(props.map);

    const handleVisibility = () => {
        // The map as a whole (each representation keeps its own visibility)
        dispatch(setMapVisible({ mapUid: props.map.uniqueId, visible: !display.mapVisible }));
        dispatch(setRequestDrawScene());
    };

    const cardTitle = useMemo(() => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
            <span style={{ flexShrink: 0 }}>#{props.map.molNo}</span>
            <MapColourSelector map={props.map} mapIsVisible={mapShown} />
            <div style={{ minWidth: 0, flex: "1 1 0" }}>
                <ItemName item={props.map} />
            </div>
        </div>
    ), [props.map, mapShown]);

    const dropDownMenu: React.JSX.Element = (
        <div style={{ display: "flex", flexDirection: "column", width: "150px" }}>
            <MoorhenMapInfoCard key="info-map" disabled={!mapShown} map={props.map} />
            <MoorhenMenuItemPopover menuItemText="Delete Orbital">
                <DeleteDisplayObject key="delete-map" item={props.map} />
            </MoorhenMenuItemPopover>
        </div>
    );

    const extraControls: React.JSX.Element[] = [
        <MoorhenButton
            key="visibility"
            icon={display.mapVisible ? "MatSymVisibility" : "MatSymVisibilityOff"}
            onClick={handleVisibility}
            type="icon-only"
            size="accordion"
            tooltip="Toggle visibility"
        />,
        <MoorhenButton
            key="centre on orbital"
            type="icon-only"
            icon="MatSymTiltShiftFilter"
            onClick={() => { props.map.centreOnMap(); }}
            size="accordion"
            tooltip="Centre on orbital"
        />,
        <MoorhenPopoverButton key="more" size="accordion" popoverPlacement="left" tooltip="More">
            {dropDownMenu}
        </MoorhenPopoverButton>,
    ];

    return (
        <MoorhenAccordion
            title={cardTitle}
            type="card"
            defaultOpen={true}
            extraControls={extraControls}
            onChange={isOpen => props.onCollapseToggle?.(props.map.molNo, isOpen)}
            open={props.isOpen}
        >
            <MoorhenStack direction="vertical">
                <MapRepresentationsToolbar map={props.map} />
                <MapRepresentationsCard
                    map={props.map}
                    editor={recordId => (
                        <MapRepresentationEditor
                            map={props.map}
                            recordId={recordId}
                            level={<OrbitalLevelControls map={props.map} initialContour={initialContour} recordId={recordId} />}
                            hideRadiusControls={true}
                            offerSlice={true}
                        />
                    )}
                />
                {/* In multi-representation mode: all shown representations together, by the same amount */}
                <OrbitalLevelControls map={props.map} initialContour={initialContour} allShown={isMultiRepresentation} />
                {!isMultiRepresentation && (
                    <>
                        <MapSettingsAccordion
                            map={props.map}
                            mapIsVisible={mapIsVisible}
                            mapStyle={mapStyle}
                            mapRadius={mapRadius}
                            mapOpacity={mapOpacity}
                            hideRadiusControls={true}
                            offerSlice={true}
                        />
                    </>
                )}
            </MoorhenStack>
        </MoorhenAccordion>
    );
};
