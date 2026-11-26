import { useDispatch, useSelector } from "react-redux";
import { setMapVisible } from "@/store/mapRepresentationsSlice";
import { MapMultiRepresentationToggle, MapRepresentationsCard } from "./MapRepresentationChips";
import { useIsMultiRepresentation } from "../../../hooks/useMapDisplay";
import { MapLevelControls } from "./MapLevelControls";
import { MapRepresentationEditor } from "./MapRepresentationEditor";
import { useMemo } from "react";
import { useMapDisplay } from "../../../hooks/useMapDisplay";
import { setActiveMap } from "../../../store/generalStatesSlice";
import { setRequestDrawScene } from "../../../store/glRefSlice";
import { addMap } from "../../../store/mapsSlice";
import { moorhen } from "../../../types/moorhen";
import { doDownload } from "../../../utils/utils";
import { MoorhenPopoverButton } from "../../inputs";
import { MoorhenButton } from "../../inputs";
import { MoorhenAccordion, MoorhenMenuItemPopover } from "../../interface-base";
import { MoorhenStack } from "../../interface-base";
import { MoorhenMenuItem } from "../../interface-base/MenuItems/MenuItem";
import { DeleteDisplayObject, SetMapWeight } from "../../menu-item";
import { ItemName } from "../utils/ItemName";
import { MapColourSelector } from "./MapColourSelector";
import { MapHistogramAccordion } from "./MapHistogramAccordion";
import { MapSettingsAccordion } from "./MapSettingsAccordion";
import { MoorhenMapInfoCard } from "./MoorhenMapInfoCard";

type MoorhenMapCardPropsInterface = {
    map: moorhen.Map;
    initialContour?: number;
    initialRadius?: number;
    modalWidth?: number;
    isOpen?: boolean;
    onCollapseToggle?: (key: number, isOpen: boolean) => void;
};

export const MoorhenMapCard = (props: MoorhenMapCardPropsInterface) => {
    const { initialContour = 0.8, initialRadius = 13 } = props;

    // From the representation the card acts on (the selected one, else the map's first; map-display.md): the radius of
    // the draw mode and the opacity of the style in use
    const display = useMapDisplay(props.map);
    const mapRadius = display.record ? display.radius : initialRadius;
    const mapContourLevel = display.record ? display.contourLevel : initialContour;
    const mapStyle = display.style;
    const mapOpacity = display.alpha;

    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);
    // The controls act on the selected representation: usable while it is shown. The eye shows / hides the map.
    const mapIsVisible = display.visible;
    const dispatch = useDispatch();

    // Multi-representation mode: each representation's level and draw settings are in its chip's edit popover
    const isMultiRepresentation = useIsMultiRepresentation(props.map);

    const cardTitle = useMemo(() => {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                <span style={{ flexShrink: 0 }}>#{props.map.molNo}</span>
                <MapColourSelector map={props.map} mapIsVisible={mapIsVisible} />
                <div style={{ minWidth: 0, flex: "1 1 0" }}>
                    <ItemName item={props.map} />
                </div>
            </div>
        );
    }, [props.map]);

    const handleDownload = async () => {
        const response = await props.map.getMap();
        doDownload([response.data.result.mapData], `${props.map.name.replace(".mtz", "")}.map`);
    };

    const handleVisibility = () => {
        dispatch(setMapVisible({ mapUid: props.map.uniqueId, visible: !display.mapVisible }));
        dispatch(setRequestDrawScene()); //this is annoying idk why the map manager doesn't redraw here
    };

    const handleCopyMap = async () => {
        const newMap = await props.map.copyMap();
        dispatch(addMap(newMap));
    };
    const dropDownMenu: React.JSX.Element = (
        <div style={{ display: "flex", flexDirection: "column", width: "150px" }}>
            <MoorhenMenuItem onClick={() => {handleCopyMap()}}>Copy Map</MoorhenMenuItem>
            <MoorhenMapInfoCard key="info-map" disabled={!mapIsVisible} map={props.map} />
            <MoorhenMenuItemPopover disabled={!mapIsVisible} menuItemText="Set Map Weight">
                <SetMapWeight key="set-map-weight" map={props.map} />
            </MoorhenMenuItemPopover>
            <MoorhenMenuItemPopover menuItemText="Delete Map">
                <DeleteDisplayObject key="delete-map" item={props.map} />
            </MoorhenMenuItemPopover>
        </div>
    );

    const extraControls: React.JSX.Element[] = [
        <MoorhenButton
            key="visibility"
            icon={`${display.mapVisible ? "MatSymVisibility" : "MatSymVisibilityOff"}`}
            onClick={handleVisibility}
            type="icon-only"
            size="accordion"
            tooltip="Toggle visibility"
        />,
        <MoorhenButton
            key="centre on map"
            type="icon-only"
            icon={`MatSymTiltShiftFilter`}
            onClick={() => {
                props.map.centreOnMap();
            }}
            size="accordion"
            tooltip="Centre on map"
        />,
        <MoorhenButton
            key="download"
            type="icon-only"
            icon={`MatSymDownload`}
            onClick={handleDownload}
            size="accordion"
            tooltip="Save model file"
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
            onChange={isOpen => (props.onCollapseToggle ? props.onCollapseToggle(props.map.molNo, isOpen) : () => {})}
            open={props.isOpen}
        >
            <MoorhenStack direction="vertical">
                <MapMultiRepresentationToggle map={props.map} />
                <MapRepresentationsCard
                    map={props.map}
                    editor={<MapRepresentationEditor map={props.map} level={<MapLevelControls map={props.map} initialContour={initialContour} />} />}
                />
                <MoorhenStack direction="horizontal" gap="1rem" align="center">
                    <MoorhenButton
                        id={`active-map-toggle-${props.map.molNo}`}
                        style={{ minWidth: "6rem" }}
                        type="toggle"
                        checked={props.map.molNo === activeMap?.molNo}
                        onClick={() => dispatch(setActiveMap(props.map))}
                        icon={props.map.molNo === activeMap?.molNo ? "MatSymRadioButtonChecked" : "MatSymRadioButtonUnchecked"}
                    >
                        {props.map.molNo === activeMap?.molNo ? "Active\u00A0\u00A0" : "Inactive"}
                    </MoorhenButton>
                    {/* In multi-representation mode: all shown representations together, by the same amount */}
                    <MapLevelControls map={props.map} initialContour={initialContour} allShown={isMultiRepresentation} />
                </MoorhenStack>
                <MapHistogramAccordion map={props.map} currentContourLevel={mapContourLevel} />
                {!isMultiRepresentation && (
                    <MapSettingsAccordion
                        map={props.map}
                        mapIsVisible={mapIsVisible}
                        mapStyle={mapStyle}
                        mapRadius={mapRadius}
                        mapOpacity={mapOpacity}
                    />
                )}
            </MoorhenStack>
        </MoorhenAccordion>
    );
};
