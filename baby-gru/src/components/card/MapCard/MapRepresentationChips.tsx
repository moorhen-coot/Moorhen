import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { MoorhenButton, MoorhenToggle } from "@/components/inputs";
import { MoorhenStack } from "@/components/interface-base";
import { MoorhenPopoverButton } from "@/components/interface-base/Popovers/PopoverButton";
import { MoorhenMenuItem } from "@/components/interface-base/MenuItems/MenuItem";
import { setMapMultiRepresentation, setSelectedMapRepresentation } from "../../../store/generalStatesSlice";
import {
    addMapRepresentation,
    removeMapRepresentation,
    replaceMapRepresentationsOfMaps,
    selectMapRepresentationsOfMap,
    selectSelectedMapRepresentation,
    setMapRepresentation,
} from "../../../store/mapRepresentationsSlice";
import type { RootState } from "../../../store/MoorhenReduxStore";
import type { MoorhenMap } from "../../../utils/MoorhenMap";
import type { MapRepresentationData, MapStyle } from "../../../utils/Representation/mapRepresentationData";
import { guid } from "../../../utils/utils";
import { useIsMultiRepresentation } from "../../../hooks/useMapDisplay";
import { MAP_REPRESENTATION_PRESETS, type MapRepresentationPreset, presetRecords } from "../../../utils/Representation/mapRepresentationPresets";
import "../MoleculeCard/representation.css";

const STYLE_LABELS: Record<MapStyle, string> = { lines: "Mesh", "lit-lines": "Lit lines", solid: "Surface", slice: "2D slice" };

/** The level as a multiple of the map's rms where it has one (crystallographic maps), else as it is */
const levelLabel = (map: MoorhenMap, level: number) =>
    map.mapRmsd ? `${(level / map.mapRmsd).toFixed(2)}σ` : Number(level.toPrecision(3)).toString();

/**
 * A map's representations (.roadmaps/map-display.md), as chips: each with its eye, an edit popover (`editor`: its
 * level and draw settings, opened on it: the chip is selected first, and the editor acts on the selected one) and a
 * delete (not the last one). Clicking a chip selects it.
 */
export const MapRepresentationChips = (props: { map: MoorhenMap; editor?: React.ReactNode }) => {
    const { map } = props;
    const dispatch = useDispatch();
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    const records = useSelector((state: RootState) => selectMapRepresentationsOfMap(state, map.uniqueId));
    const selected = useSelector((state: RootState) => selectSelectedMapRepresentation(state, map.uniqueId));

    const select = (record: MapRepresentationData) => dispatch(setSelectedMapRepresentation({ mapUid: map.uniqueId, id: record.id }));

    const remove = (record: MapRepresentationData) => {
        // The card goes on with another one
        if (record.id === selected?.id) {
            dispatch(setSelectedMapRepresentation({ mapUid: map.uniqueId, id: records.find(other => other.id !== record.id).id }));
        }
        dispatch(removeMapRepresentation(record.id));
    };

    return (
        <div className="moorhen__molecule_card_representation-chip-container">
            {records.map(record => {
                const colour = (map.isDifference ? record.positiveColour : record.colour) ?? map.defaultMapColour;
                const isSelected = record.id === selected?.id;
                return (
                    <div
                        key={record.id}
                        className="moorhen__representation-chip"
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => select(record)}
                        onKeyDown={evt => {
                            if (evt.key === "Enter" || evt.key === " ") select(record);
                        }}
                        style={{
                            cursor: "pointer",
                            maxWidth: "11rem",
                            color: isDark ? "white" : undefined,
                            backgroundColor: `rgba(${colour.r * 255}, ${colour.g * 255}, ${colour.b * 255}, ${record.visible ? 0.5 : 0.1})`,
                            borderColor: `rgb(${colour.r * 255}, ${colour.g * 255}, ${colour.b * 255})`,
                            borderWidth: isSelected ? "3px" : "1px",
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
                                onClick={evt => {
                                    evt?.stopPropagation?.();
                                    dispatch(setMapRepresentation({ id: record.id, changes: { visible: !record.visible } }));
                                }}
                            />
                            {props.editor && (
                                <MoorhenPopoverButton
                                    type="icon-only"
                                    size="accordion"
                                    icon="MatSymEdit"
                                    tooltip="Edit this representation"
                                    ariaLabel="Edit this representation"
                                    popoverPlacement="left"
                                    extraOnClick={() => select(record)}
                                >
                                    <MoorhenStack direction="vertical" gap="0.5rem" style={{ minWidth: "22rem" }}>
                                        {props.editor}
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
                                onClick={evt => {
                                    evt?.stopPropagation?.();
                                    remove(record);
                                }}
                            />
                        </MoorhenStack>
                    </div>
                );
            })}
        </div>
    );
};

/**
 * "+": add a copy of the selected representation, then select it. A copy of a 2D slice is drawn as a mesh: one slice
 * per map for now (its buffers are the map's).
 */
export const AddMapRepresentationButton = (props: { map: MoorhenMap; disabled?: boolean }) => {
    const { map } = props;
    const dispatch = useDispatch();
    const selected = useSelector((state: RootState) => selectSelectedMapRepresentation(state, map.uniqueId));
    const addCopy = () => {
        if (!selected) return;
        // A shallow copy: records are immutable data, the new one only replaces fields
        const { hiddenWithMap: _hiddenWithMap, ...source } = selected;
        const id = guid();
        dispatch(addMapRepresentation({ ...source, id, visible: true, style: source.style === "slice" ? "lines" : source.style }));
        dispatch(setSelectedMapRepresentation({ mapUid: map.uniqueId, id }));
    };
    return (
        <MoorhenButton
            type="icon-only"
            size="accordion"
            icon="MatSymAdd"
            disabled={props.disabled || !selected}
            tooltip="Add a copy of the selected representation"
            ariaLabel="Add a copy of the selected representation"
            onClick={addCopy}
        />
    );
};

/** Presets that replace the map's representations (mapRepresentationPresets.ts), then select the first */
export const MapRepresentationPresetsMenu = (props: { map: MoorhenMap; disabled?: boolean }) => {
    const { map } = props;
    const dispatch = useDispatch();
    const [isShown, setIsShown] = useState(false);
    const selected = useSelector((state: RootState) => selectSelectedMapRepresentation(state, map.uniqueId));
    const applyPreset = (preset: MapRepresentationPreset) => {
        if (!selected) return;
        const records = presetRecords(preset, selected, map);
        dispatch(replaceMapRepresentationsOfMaps({ mapUids: [map.uniqueId], records }));
        dispatch(setSelectedMapRepresentation({ mapUid: map.uniqueId, id: records[0].id }));
        setIsShown(false);
    };
    return (
        <MoorhenPopoverButton
            type="icon-only"
            size="accordion"
            icon="MatSymAutoAwesome"
            disabled={props.disabled || !selected}
            tooltip="Presets: replace this map's representations"
            ariaLabel="Representation presets"
            popoverPlacement="left"
            isShown={isShown}
            setIsShown={setIsShown}
        >
            <MoorhenStack direction="vertical" gap="0.1rem" style={{ minWidth: "14rem" }}>
                <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>Replace this map&apos;s representations with</span>
                {MAP_REPRESENTATION_PRESETS.map(preset => (
                    <MoorhenMenuItem key={preset.id} onClick={() => applyPreset(preset)} ariaLabel={`Preset: ${preset.name}`}>
                        <b>{preset.name}</b>
                        <br />
                        <span style={{ fontSize: "0.8rem" }}>{preset.description}</span>
                    </MoorhenMenuItem>
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

/**
 * The representations card at the top of a map's card, in multi-representation mode: chips (each with its `editor`),
 * "+" and presets.
 */
export const MapRepresentationsCard = (props: { map: MoorhenMap; editor: React.ReactNode }) => {
    const { map } = props;
    if (!useIsMultiRepresentation(map)) {
        return null;
    }
    return (
        <MoorhenStack card direction="row" align="center" justify="flex-end" gap="0.25rem">
            <MapRepresentationChips map={map} editor={props.editor} />
            <AddMapRepresentationButton map={map} />
            <MapRepresentationPresetsMenu map={map} />
        </MoorhenStack>
    );
};
