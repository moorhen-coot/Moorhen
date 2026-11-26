import { useDispatch, useSelector, useStore } from "react-redux";
import { useMemo } from "react";
import type { MapStyle } from "../../../store/mapContourSettingsSlice";
import {
    selectMapRepresentationsOfMap,
    selectMapRepresentation,
    selectPrimaryMapRepresentation,
    setMapRepresentation,
    setMapRepresentationAlpha,
    setMapRepresentationRadius,
    setMapRepresentationSlice,
} from "../../../store/mapRepresentationsSlice";
import { currentAlpha } from "../../../utils/Representation/mapRepresentationData";
import { setMovingMapSlice } from "../../../store/generalStatesSlice";
import { setQuat } from "../../../store/glRefSlice";
import { setOrigin } from "../../../store/sceneSettingsSlice";
import { quatFacingSlice } from "../../../utils/mapSlice/sliceView";
import { moorhen } from "../../../types/moorhen";
import { MoorhenSelect, MoorhenSlider, MoorhenToggle } from "../../inputs";
import { DEFAULT_SLICE_CONTOUR_SPACING, type SliceContourSpacing } from "../../../utils/mapSlice/mapSlice";
import { MoorhenButton } from "../../inputs";
import { MoorhenStack } from "../../interface-base";
import { MoorhenAccordion } from "../../interface-base/Accordion/Accordion";

interface MoorhenMapCardSettings {
    map: moorhen.Map;
    mapIsVisible: boolean;
    mapStyle: string;
    mapRadius: number;
    mapOpacity: number;
    /**
     * Leave out the radius slider and the full-map/local-map pair.
     *
     * Both only make sense for something larger than the view. An orbital's grid is a few angstrom
     * across and is always drawn whole, so a radius here would be a control with nothing to do -
     * every setting large enough to show the orbital looks the same.
     */
    hideRadiusControls?: boolean;
    /**
     * Offer drawing the map as a 2D contour slice (mapSlice.ts). Only orbitals offer it for now;
     * nothing about the slice itself is particular to them.
     */
    offerSlice?: boolean;
    /** The settings alone, without the "Draw Settings" accordion (in a representation's edit popover) */
    bare?: boolean;
    /** The representation they act on (a chip's), else the map's first */
    recordId?: string;
}

export const MapSettingsAccordion = (props: MoorhenMapCardSettings) => {
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const dispatch = useDispatch();
    const store = useStore<moorhen.State>();
    /**
     * The representation these settings act on (`recordId`'s: a chip's, else the map's first; map-display.md), which
     * holds its 2D slice
     */
    const recordOf = (state: moorhen.State) => {
        const own = props.recordId ? selectMapRepresentation(state, props.recordId) : undefined;
        return own?.mapUid === props.map.uniqueId ? own : selectPrimaryMapRepresentation(state, props.map.uniqueId);
    };
    const record = useSelector(recordOf);
    const isOriginLocked = !!record?.originLock;
    /** Another representation of this map is a 2D slice: one per map for now (its buffers are the map's) */
    const otherIsSlice = useSelector((state: moorhen.State) =>
        selectMapRepresentationsOfMap(state, props.map.uniqueId).some(other => other.id !== record?.id && other.style === "slice")
    );
    const change = (changes: Parameters<typeof setMapRepresentation>[0]["changes"]) => {
        if (record) dispatch(setMapRepresentation({ id: record.id, changes }));
    };

    /**
     * Draw the full map (origin locked) or the map around the view. Each draw mode keeps its own radius in the record
     * (map-display.md), so switching only flips the lock; the record change redraws the map. Locked around the map's
     * drawing centre (its first representation's, kept while unlocked), else the view.
     */
    const setOriginLocked = (locked: boolean) => {
        if (!record || locked === isOriginLocked) return;
        const sceneOrigin = props.map.drawOrigin ?? store.getState().sceneSettings.origin;
        change({ originLock: locked ? { centre: sceneOrigin.map(coord => -coord) as [number, number, number] } : null });
    };

    const maxRadius = useMemo(() => {
        if (props.map.isEM) {
            if (props.map.headerInfo === null) {
                return 100;
            }
            const side = props.map.headerInfo.cell.a ? props.map.headerInfo.cell.a : 500;
            return Math.ceil((side * 1.732) / 2);
            //return Math.ceil(side / 2);
        } else {
            return 100;
        }
    }, [props.map.headerInfo, props.map.isEM]);

    /** The opacity of the style in use: the record keeps one per style (map-display.md) */
    const opacity = record ? currentAlpha(record) : props.mapOpacity;
    /** Whether this map's slice is showing its handles. */
    const isMovingSlice = useSelector((state: moorhen.State) => !!record && state.generalStates.movingMapSlice === record.id);
    /** Whether this map's slice shows its nodal lines (only a difference map, with two signs, has any). */
    const showsNodalLines = record?.slice?.nodalLines ?? false;
    const sliceContourSpacing = record?.slice?.contourSpacing ?? DEFAULT_SLICE_CONTOUR_SPACING;
    const changeSlice = (changes: Parameters<typeof setMapRepresentationSlice>[0]["changes"]) => {
        if (record) dispatch(setMapRepresentationSlice({ id: record.id, changes }));
    };

    /**
     * Look straight at the slice, centred on it: along its normal from the side the view is on,
     * the side of it nearest the screen's x made the screen's x (sliceView.ts). Read from the store
     * when clicked, as the view and the slice are then.
     */
    const alignViewToSlice = () => {
        const state = store.getState();
        const slice = recordOf(state)?.slice;
        if (!slice) return;
        dispatch(setQuat(quatFacingSlice(state.glRef.quat, slice.orientation)));
        // Moorhen's origin is the point that puts a centre in view: its negative.
        dispatch(setOrigin(slice.origin.map(coord => -coord) as [number, number, number]));
    };

    const chooseStyle = (style: MapStyle) => {
        // Handles belong to the slice: none once the map is drawn another way.
        if (style !== "slice" && isMovingSlice) dispatch(setMovingMapSlice(null));
        change({ style });
    };

    const opacitySlider = (
        <MoorhenSlider
            minVal={0.01}
            maxVal={1.0}
            scale="linear"
            sliderTitle="Opacity"
            isDisabled={!props.mapIsVisible}
            usePreciseInput={true}
            showLabels={false}
            value={opacity}
            // Sets the opacity of the style in use
            setValue={value => record && dispatch(setMapRepresentationAlpha({ id: record.id, alpha: value }))}
            decimalPlaces={2}
        />
    );

    /**
     * Whether the representation thickens where it is seen edge-on (main's #794, now in its record).
     *
     * Offered beside the opacity because it is the opacity's companion and does nothing without
     * it: the effect is absorption through a shell, so a solid surface has no shell to look
     * along. Disabled rather than hidden while it is opaque, so that it is discoverable -
     * somebody who has not met the effect can see that it exists and what it waits for.
     */
    const viewDependentTransparency = record?.viewDependentTransparency ?? false;
    const isTransparent = opacity < 0.99;
    const viewDependentToggle = (
        <MoorhenToggle
            type="switch"
            checked={viewDependentTransparency && isTransparent}
            disabled={!props.mapIsVisible || !isTransparent}
            label="Denser at edges"
            tooltip={isTransparent
                ? "Thicken the surface where it is seen edge-on, as looking along a shell would."
                : "Lower the opacity to use this: a solid surface has no shell to look along."}
            // The record change repaints the representation (a uniform: no recontouring)
            onChange={() => change({ viewDependentTransparency: !viewDependentTransparency })}
        />
    );

    const Wrapper = props.bare ? BareSettings : DrawSettingsAccordion;
    return (
        <Wrapper>
            <MoorhenStack direction="line">
                <MoorhenStack direction="vertical" gap={"0.5rem"}>
                    {props.map.isEM && !props.hideRadiusControls &&
                    <MoorhenStack card  style={{ margin: "0rem", padding: "0rem" }} gap={0} justify="center">
                    <MoorhenToggle
                        id={`lock-origin-toggle-${props.map.molNo}`}
                        type="radio"
                        checked={isOriginLocked}
                        onChange={() => setOriginLocked(true)}
                        disabled={!props.mapIsVisible}
                        // icon={isOriginLocked ? "MatSymLockClose" : "MatSymLockOpen"}
                        label={" Draw Full Map"}
                    />
                    <MoorhenToggle
                        id={`unlock-origin-toggle-${props.map.molNo}`}
                        type="radio"
                        checked={!isOriginLocked}
                        onChange={() => setOriginLocked(false)}
                        disabled={!props.mapIsVisible}
                        // icon={isOriginLocked ? "MatSymLockClose" : "MatSymLockOpen"}
                        label={" Draw Local Map"}
                    />
                    </MoorhenStack>}
                    <MoorhenStack card style={{ margin: "0rem", padding: "0rem" }} gap={0} justify="center">
                    <MoorhenToggle
                        checked={props.mapStyle === "lines"}
                        type="radio"
                        onChange={() => chooseStyle("lines")}
                        label="Draw as mesh"
                    />
                    <MoorhenToggle
                        checked={props.mapStyle === "solid"}
                        type="radio"
                        onChange={() => chooseStyle("solid")}
                        label="Draw as a surface"
                    />
                    <MoorhenToggle
                        checked={props.mapStyle === "lit-lines"}
                        type="radio"
                        onChange={() => chooseStyle("lit-lines")}
                        label="Draw as lit lines"
                    />
                    {props.offerSlice && (
                        <MoorhenToggle
                            checked={props.mapStyle === "slice"}
                            type="radio"
                            disabled={otherIsSlice}
                            onChange={() => chooseStyle("slice")}
                            label="Draw as 2D slice"
                            tooltip={otherIsSlice ? "Another representation of this map is already a 2D slice" : undefined}
                        />
                    )}
                    </MoorhenStack>
                </MoorhenStack>
                <MoorhenStack direction="vertical" style={{ width: "100%" }}>
                    {!props.hideRadiusControls && <MoorhenSlider
                        minVal={2}
                        maxVal={maxRadius}
                        showLabels={false}
                        showButtons={true}
                        scale="linear"
                        stepButtons={1}
                        sliderTitle="Radius:"
                        isDisabled={!props.mapIsVisible}
                        value={props.mapRadius}
                        // The radius of the draw mode in use (each keeps its own)
                        setValue={newVal => record && dispatch(setMapRepresentationRadius({ id: record.id, radius: newVal }))}
                        usePreciseInput={true}
                        piWidth={"3rem"}
                    />}
                    {opacitySlider}
                    {viewDependentToggle}
                </MoorhenStack>
            </MoorhenStack>
            {props.offerSlice && props.mapStyle === "slice" && (
                // The slice's own controls, on one line under the ways to draw the map (wrapping
                // if the card is too narrow for them).
                <MoorhenStack direction="line" gap="1rem" align="center" style={{ flexWrap: "wrap", marginTop: "0.5rem" }}>
                    <MoorhenToggle
                        id={`move-map-slice-${props.map.molNo}`}
                        type="switch"
                        checked={isMovingSlice}
                        disabled={!props.mapIsVisible}
                        onChange={() => dispatch(setMovingMapSlice(isMovingSlice || !record ? null : record.id))}
                        label="Move & turn"
                    />
                    <MoorhenButton size="small" disabled={!props.mapIsVisible} onClick={alignViewToSlice} tooltip="Look straight at the slice, centred on it; the side nearest the screen's x made horizontal">
                        Align view
                    </MoorhenButton>
                    <MoorhenSelect
                        label="Contours"
                        value={sliceContourSpacing}
                        disabled={!props.mapIsVisible}
                        onChange={evt =>
                            changeSlice({ contourSpacing: evt.target.value as SliceContourSpacing })
                        }
                    >
                        <option value="linear">Equal steps</option>
                        <option value="geometric">Doubling</option>
                    </MoorhenSelect>
                    {props.map.isDifference && (
                        <MoorhenToggle
                            id={`map-slice-nodal-lines-${props.map.molNo}`}
                            type="switch"
                            checked={showsNodalLines}
                            disabled={!props.mapIsVisible}
                            onChange={() => changeSlice({ nodalLines: !showsNodalLines })}
                            label="Nodal lines"
                        />
                    )}
                </MoorhenStack>
            )}
        </Wrapper>
    );
};

const DrawSettingsAccordion = (props: { children?: React.ReactNode }) => <MoorhenAccordion title="Draw Settings">{props.children}</MoorhenAccordion>;
const BareSettings = (props: { children?: React.ReactNode }) => <>{props.children}</>;
