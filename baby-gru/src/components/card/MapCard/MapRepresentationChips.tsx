import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { MoorhenButton, MoorhenToggle } from "@/components/inputs";
import { MoorhenStack } from "@/components/interface-base";
import { MoorhenPopoverButton } from "@/components/interface-base/Popovers/PopoverButton";
import { MoorhenMenuItem } from "@/components/interface-base/MenuItems/MenuItem";
import { MoorhenTooltip } from "@/components/interface-base/Popovers/Tooltip";
import { setMapMultiRepresentation } from "../../../store/generalStatesSlice";
import {
    addMapRepresentation,
    removeMapRepresentation,
    replaceMapRepresentationsOfMaps,
    selectMapRepresentationsOfMap,
    selectPrimaryMapRepresentation,
    setMapRepresentation,
} from "../../../store/mapRepresentationsSlice";
import type { RootState } from "../../../store/MoorhenReduxStore";
import type { MoorhenMap } from "../../../utils/MoorhenMap";
import type { MapStyle } from "../../../utils/Representation/mapRepresentationData";
import { guid } from "../../../utils/utils";
import { defaultContourLevel } from "../../../utils/Representation/mapRepresentationData";
import { useIsMultiRepresentation } from "../../../hooks/useMapDisplay";
import { mapChipTint } from "./mapChipTint";
import { MAP_REPRESENTATION_PRESETS, type MapRepresentationPreset, presetRecords } from "../../../utils/Representation/mapRepresentationPresets";
import "../MoleculeCard/representation.css";

const STYLE_LABELS: Record<MapStyle, string> = { lines: "Mesh", "lit-lines": "Lit lines", solid: "Surface", slice: "2D slice" };

/** The level as a multiple of the map's rms where it has one (crystallographic maps), else as it is */
const levelLabel = (map: MoorhenMap, level: number) =>
    map.mapRmsd ? `${(level / map.mapRmsd).toFixed(2)}σ` : Number(level.toPrecision(3)).toString();

/**
 * A map's representations (.roadmaps/map-display.md), as chips: each with its eye, an edit popover (`editor(id)`: its
 * colour, level and draw settings) and a delete (not the last one). Everything on a chip acts on its own
 * representation; the map card's own controls act on the map (all shown representations).
 */
export const MapRepresentationChips = (props: { map: MoorhenMap; editor?: (recordId: string) => React.ReactNode }) => {
    const { map } = props;
    const dispatch = useDispatch();
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    const records = useSelector((state: RootState) => selectMapRepresentationsOfMap(state, map.uniqueId));

    return (
        <div className="moorhen__molecule_card_representation-chip-container">
            {records.map(record => {
                return (
                    <div
                        key={record.id}
                        className="moorhen__representation-chip"
                        data-testid="map-representation-chip"
                        style={{
                            maxWidth: "13rem",
                            width: '11rem',
                            color: isDark ? "white" : undefined,
                            ...mapChipTint(map, record),
                        }}
                    >
                        <MoorhenStack direction="row" align="center" gap="0.2rem">
                            <div style={{ flexGrow: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                <b>{STYLE_LABELS[record.style]}</b>
                                <br />
                                {levelLabel(map, record.contourLevel)}
                            </div>
                            <MoorhenButton
                                type="icon-only"
                                size="accordion"
                                icon={record.visible ? "MatSymVisibility" : "MatSymVisibilityOff"}
                                tooltip={record.visible ? "Hide this representation" : "Show this representation"}
                                ariaLabel={record.visible ? "Hide this representation" : "Show this representation"}
                                onClick={() => dispatch(setMapRepresentation({ id: record.id, changes: { visible: !record.visible } }))}
                            />
                            {props.editor && (
                                <MoorhenPopoverButton
                                    type="icon-only"
                                    size="accordion"
                                    icon="MatSymEdit"
                                    tooltip="Edit this representation"
                                    ariaLabel="Edit this representation"
                                    popoverPlacement="left"
                                >
                                    <MoorhenStack direction="vertical" gap="0.5rem" style={{ minWidth: "22rem" }}>
                                        {props.editor(record.id)}
                                    </MoorhenStack>
                                </MoorhenPopoverButton>
                            )}
                            <MoorhenButton
                                type="icon-only"
                                size="accordion"
                                icon="MatSymDelete"
                                disabled={records.length < 2}
                                tooltip="Delete this representation"
                                ariaLabel="Delete this representation"
                                onClick={() => dispatch(removeMapRepresentation(record.id))}
                            />
                        </MoorhenStack>
                    </div>
                );
            })}
        </div>
    );
};

/**
 * "+": a copy of the map's last representation (the last made, or last in the list), shown. A copy of a 2D slice is
 * drawn as a mesh: one slice per map for now (its buffers are the map's).
 */
export const AddMapRepresentationButton = (props: { map: MoorhenMap }) => {
    const dispatch = useDispatch();
    const last = useSelector((state: RootState) => selectMapRepresentationsOfMap(state, props.map.uniqueId).at(-1));
    const add = () => {
        if (!last) return;
        // A shallow copy: records are immutable data, the new one only replaces fields
        const { hiddenWithMap: _hiddenWithMap, ...source } = last;
        dispatch(addMapRepresentation({ ...source, id: guid(), visible: true, style: source.style === "slice" ? "lines" : source.style }));
    };
    return (
        <MoorhenButton
            type="default"
            icon="MatSymAdd"
            disabled={!last}
            tooltip="Add a representation: a copy of the last one"
            ariaLabel="Add a representation"
            style={{ width: "5rem" }}
            onClick={add}
        />
    );
};

/**
 * The map wizard, as the molecule card's picture wizard: presets that replace the map's representations
 * (mapRepresentationPresets.ts), at multiples of the map's load level (defaultContourLevel), with its first
 * representation's radius, draw mode and colours.
 */
export const MapRepresentationWizard = (props: { map: MoorhenMap; disabled?: boolean }) => {
    const { map } = props;
    const dispatch = useDispatch();
    const [isShown, setIsShown] = useState(false);
    const first = useSelector((state: RootState) => selectPrimaryMapRepresentation(state, map.uniqueId));
    const applyPreset = (preset: MapRepresentationPreset) => {
        if (!first) return;
        // The map's load level, or its first representation's for a map that has none (a level not yet worked out)
        const unit = defaultContourLevel(map) || first.contourLevel;
        const records = presetRecords(preset, first, map, unit);
        dispatch(replaceMapRepresentationsOfMaps({ mapUids: [map.uniqueId], records }));
        setIsShown(false);
    };
    return (
        <MoorhenPopoverButton
            type="default"
            icon="MatSymAutoAwesome"
            disabled={props.disabled || !first}
            tooltip="Map Wizard - draw this map several ways at once (replaces its representations)"
            ariaLabel="Map wizard"
            style={{ width: "5rem" }}
            popoverPlacement="left"
            isShown={isShown}
            setIsShown={setIsShown}
        >
            <MoorhenStack direction="vertical" gap="0.1rem" style={{ minWidth: "10rem" }}>
                <MoorhenTooltip tooltip="Levels are multiples of the map's default level: the one it was loaded at" placement="top">
                    <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>Replace this map&apos;s representations with</span>
                </MoorhenTooltip>
                {MAP_REPRESENTATION_PRESETS.map(preset => (
                    <MoorhenTooltip key={preset.id} tooltip={preset.description} placement="top">
                        <MoorhenMenuItem onClick={() => applyPreset(preset)} ariaLabel={`Wizard: ${preset.name}`}>
                            {preset.name}
                        </MoorhenMenuItem>
                    </MoorhenTooltip>
                ))}
            </MoorhenStack>
        </MoorhenPopoverButton>
    );
};

/** "Multiple representations": the map card's switch to multi-representation mode, locked on with more than one */
export const MapMultiRepresentationToggle = (props: { map: MoorhenMap }) => {
    const { map } = props;
    const dispatch = useDispatch();
    const toggledOn = useSelector((state: RootState) => state.generalStates.multiRepresentationMaps.includes(map.uniqueId));
    const count = useSelector((state: RootState) => selectMapRepresentationsOfMap(state, map.uniqueId).length);
    return (
        <MoorhenToggle
            id={`map-multi-representation-${map.molNo}`}
            type="switch"
            checked={toggledOn || count > 1}
            disabled={count > 1}
            onChange={() => dispatch(setMapMultiRepresentation({ mapUid: map.uniqueId, on: !toggledOn }))}
            label="Multiple representations"
            tooltip={
                count > 1
                    ? "This map has several representations: delete all but one to turn this off"
                    : "Draw this map several ways at once (e.g. a mesh and a surface), each edited from its chip"
            }
        />
    );
};

/** The top row of a map's card: the "Multiple representations" switch */
export const MapRepresentationsToolbar = (props: { map: MoorhenMap }) => (
    <MoorhenStack direction="row" align="center" gap="0.5rem">
        <MapMultiRepresentationToggle map={props.map} />
    </MoorhenStack>
);

/**
 * Below it, in multi-representation mode (hidden otherwise), as the molecule card: "+" and the map wizard, then the
 * representations card with the chips, each with its `editor(id)`
 */
export const MapRepresentationsCard = (props: { map: MoorhenMap; editor: (recordId: string) => React.ReactNode }) => {
    const { map } = props;
    if (!useIsMultiRepresentation(map)) {
        return null;
    }
    return (
        <MoorhenStack direction="vertical">
            <MoorhenStack direction="row" justify="center">
                <AddMapRepresentationButton map={map} />
                <MapRepresentationWizard map={map} />
            </MoorhenStack>
            <MoorhenStack direction="vertical" card>
                <MapRepresentationChips map={map} editor={props.editor} />
            </MoorhenStack>
        </MoorhenStack>
    );
};
