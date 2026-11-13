import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useRef, useState } from "react";
import { setMapAlpha, setMapRadius, setMapSliceContourSpacing, setMapSliceNodalLines, setMapStyle } from "../../../store/mapContourSettingsSlice";
import type { MapStyle } from "../../../store/mapContourSettingsSlice";
import { setMovingMapSlice } from "../../../store/generalStatesSlice";
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
}

export const MapSettingsAccordion = (props: MoorhenMapCardSettings) => {
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const dispatch = useDispatch();
    const isOriginLocked = useSelector((state: moorhen.State) => {
        const mapItem = state.maps.find(item => item.molNo === props.map.molNo);
        return mapItem?.isOriginLocked || false;
    });

    const handleOriginLockClick = () => {
        const isOriginLocked = props.map.isOriginLocked;
        if (isOriginLocked) {
            lockedRadius.current = props.mapRadius;
        } else {
            unLockedRadius.current = props.mapRadius;
        }
        dispatch(
            setMapRadius({
                molNo: props.map.molNo,
                radius: isOriginLocked ? unLockedRadius.current : lockedRadius.current,
            })
        );
        props.map.toggleOriginLock(!isOriginLocked);
        props.map.drawMapContour();
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

    const [meshAlpha, setMeshAlpha] = useState<number>(props.mapOpacity);
    const [surfaceAlpha, setSurfaceAlpha] = useState<number>(props.mapOpacity);
    const [litAlpha, setLitAlpha] = useState<number>(props.mapOpacity);
    const [sliceAlpha, setSliceAlpha] = useState<number>(props.mapOpacity);

    /** Whether this map's slice is showing its handles. */
    const isMovingSlice = useSelector((state: moorhen.State) => state.generalStates.movingMapSlice === props.map.molNo);
    /** Whether this map's slice shows its nodal lines (only a difference map, with two signs, has any). */
    const showsNodalLines = useSelector((state: moorhen.State) => state.mapContourSettings.mapSliceNodalLines.includes(props.map.molNo));
    const sliceContourSpacing = useSelector((state: moorhen.State) =>
        state.mapContourSettings.mapSliceContourSpacings.find(item => item.molNo === props.map.molNo)?.spacing ?? DEFAULT_SLICE_CONTOUR_SPACING);

    const chooseStyle = (style: MapStyle) => {
        // Handles belong to the slice: none once the map is drawn another way.
        if (style !== "slice" && isMovingSlice) dispatch(setMovingMapSlice(null));
        dispatch(setMapStyle({ molNo: props.map.molNo, style }));
    };
    const unLockedRadius = useRef<number>(20);
    const lockedRadius = useRef<number>(20);

    const opacitySlider = (
        <MoorhenSlider
            minVal={0.01}
            maxVal={1.0}
            scale="linear"
            sliderTitle="Opacity"
            isDisabled={!props.mapIsVisible}
            usePreciseInput={true}
            showLabels={false}
            value={
                props.mapStyle === "solid" ? surfaceAlpha
                : props.mapStyle === "lines" ? meshAlpha
                : props.mapStyle === "slice" ? sliceAlpha
                : litAlpha
            }
            setValue={
                props.mapStyle === "solid"
                    ? value => setSurfaceAlpha(value)
                    : props.mapStyle === "lines"
                      ? value => setMeshAlpha(value)
                      : props.mapStyle === "slice"
                        ? value => setSliceAlpha(value)
                        : value => setLitAlpha(value)
            }
            decimalPlaces={2}
        />
    );
    useEffect(() => {
        let newValue: number;
        if (props.mapStyle === "lines") {
            newValue = meshAlpha;
        } else if (props.mapStyle === "solid") {
            newValue = surfaceAlpha;
        } else if (props.mapStyle === "lit-lines") {
            newValue = litAlpha;
        } else if (props.mapStyle === "slice") {
            newValue = sliceAlpha;
        }
        dispatch(setMapAlpha({ molNo: props.map.molNo, alpha: newValue }));
    }, [meshAlpha, surfaceAlpha, litAlpha, sliceAlpha, props.mapStyle]);

    return (
        <MoorhenAccordion title="Draw Settings">
            <MoorhenStack direction="line">
                <MoorhenStack direction="vertical" gap={"0.5rem"}>
                    {props.map.isEM && !props.hideRadiusControls &&
                    <MoorhenStack card  style={{ margin: "0rem", padding: "0rem" }} gap={0} justify="center">
                    <MoorhenToggle
                        id={`lock-origin-toggle-${props.map.molNo}`}
                        type="radio"
                        checked={isOriginLocked}
                        onChange={() => {
                            handleOriginLockClick();
                        }}
                        disabled={!props.mapIsVisible}
                        // icon={isOriginLocked ? "MatSymLockClose" : "MatSymLockOpen"}
                        label={" Draw Full Map"}
                    />
                    <MoorhenToggle
                        id={`lock-origin-toggle-${props.map.molNo}`}
                        type="radio"
                        checked={!isOriginLocked}
                        onChange={() => {
                            handleOriginLockClick();
                        }}
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
                            onChange={() => chooseStyle("slice")}
                            label="Draw as 2D slice"
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
                        setValue={newVal => {
                            dispatch(
                                setMapRadius({
                                    molNo: props.map.molNo,
                                    radius: newVal,
                                })
                            );
                        }}
                        usePreciseInput={true}
                        piWidth={"3rem"}
                    />}
                    {opacitySlider}
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
                        onChange={() => dispatch(setMovingMapSlice(isMovingSlice ? null : props.map.molNo))}
                        label="Move & turn"
                    />
                    <MoorhenSelect
                        label="Contours"
                        value={sliceContourSpacing}
                        disabled={!props.mapIsVisible}
                        onChange={evt =>
                            dispatch(setMapSliceContourSpacing({ molNo: props.map.molNo, spacing: evt.target.value as SliceContourSpacing }))
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
                            onChange={() => dispatch(setMapSliceNodalLines({ molNo: props.map.molNo, show: !showsNodalLines }))}
                            label="Nodal lines"
                        />
                    )}
                </MoorhenStack>
            )}
        </MoorhenAccordion>
    );
};
