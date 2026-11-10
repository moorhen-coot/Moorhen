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

import { useDispatch, useSelector } from "react-redux";
import { useMemo, useState } from "react";
import { useFastContourMode } from "../../../hooks/useFastContourMode";
import { setRequestDrawScene } from "../../../store/glRefSlice";
import { hideMap, setContourLevel, showMap } from "../../../store/mapContourSettingsSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenButton, MoorhenNumberInput, MoorhenPopoverButton, MoorhenSlider } from "../../inputs";
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

    const mapContourLevel = useSelector((state: moorhen.State) => {
        const entry = state.mapContourSettings.contourLevels.find(item => item.molNo === props.map.molNo);
        return entry ? entry.contourLevel : initialContour;
    });

    const mapRadius = useSelector((state: moorhen.State) => {
        const entry = state.mapContourSettings.mapRadii.find(item => item.molNo === props.map.molNo);
        return entry ? entry.radius : (props.map.suggestedRadius ?? 15);
    });

    const mapStyle = useSelector((state: moorhen.State) => {
        const entry = state.mapContourSettings.mapStyles.find(item => item.molNo === props.map.molNo);
        if (entry) return entry.style;
        return state.mapContourSettings.defaultMapSurface
            ? "solid"
            : state.mapContourSettings.defaultMapLitLines
              ? "lit-lines"
              : "lines";
    });

    const mapOpacity = useSelector((state: moorhen.State) => {
        const entry = state.mapContourSettings.mapAlpha.find(item => item.molNo === props.map.molNo);
        return entry ? entry.alpha : 1.0;
    });

    const mapIsVisible = useSelector((state: moorhen.State) =>
        state.mapContourSettings.visibleMaps.includes(props.map.molNo));

    const [lastCall, setLastCall] = useState<number>(0);

    const { fastMapContourLevel } = useFastContourMode({
        map: props.map,
        mapRadius,
        radiusThreshold: 25,
        fastRadius: "auto",
        timeoutDelay: 1000,
    });

    const handleContourLevelChange = (newContourLevel: number) => {
        if (!props.map) return;
        if (Date.now() - lastCall < 500) {
            fastMapContourLevel(newContourLevel);
        } else {
            dispatch(setContourLevel({ molNo: props.map.molNo, contourLevel: newContourLevel }));
        }
        setLastCall(Date.now());
    };

    const handleVisibility = () => {
        dispatch(mapIsVisible ? hideMap(props.map) : showMap(props.map));
        dispatch(setRequestDrawScene());
    };

    /**
     * How many decimals the level is worth showing.
     *
     * Orbital amplitudes are small - a few hundredths - and vary by orders of magnitude between
     * basis sets, so a fixed two decimals would show 0.00 for most of them. Taken from the level
     * itself, with enough digits to see a change.
     */
    const levelDecimals = useMemo(() => {
        const magnitude = Math.abs(mapContourLevel || props.map.suggestedContourLevel || 0.02);
        if (!Number.isFinite(magnitude) || magnitude <= 0) return 4;
        return Math.min(8, Math.max(2, 2 - Math.floor(Math.log10(magnitude))));
    }, [mapContourLevel, props.map.suggestedContourLevel]);

    const cardTitle = useMemo(() => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
            <span style={{ flexShrink: 0 }}>#{props.map.molNo}</span>
            <MapColourSelector map={props.map} mapIsVisible={mapIsVisible} />
            <div style={{ minWidth: 0, flex: "1 1 0" }}>
                <ItemName item={props.map} />
            </div>
        </div>
    ), [props.map, mapIsVisible]);

    const dropDownMenu: React.JSX.Element = (
        <div style={{ display: "flex", flexDirection: "column", width: "150px" }}>
            <MoorhenMapInfoCard key="info-map" disabled={!mapIsVisible} map={props.map} />
            <MoorhenMenuItemPopover menuItemText="Delete Orbital">
                <DeleteDisplayObject key="delete-map" item={props.map} />
            </MoorhenMenuItemPopover>
        </div>
    );

    const extraControls: React.JSX.Element[] = [
        <MoorhenButton
            key="visibility"
            icon={mapIsVisible ? "MatSymVisibility" : "MatSymVisibilityOff"}
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
                <MoorhenStack direction="vertical" gap={"0.5rem"} style={{ justifyContent: "center" }}>
                    <MoorhenStack direction="row" justify="center" align="center">
                        <MoorhenNumberInput
                            style={{ justifyContent: "center" }}
                            value={mapContourLevel}
                            setValue={newVal => handleContourLevelChange(+newVal)}
                            label={"Level: ±"}
                            decimalDigits={levelDecimals}
                            allowNegativeValues={false}
                            disabled={!mapIsVisible}
                            waitReturn={true}
                        />
                    </MoorhenStack>
                    <MoorhenSlider
                        minVal={props.map.levelRange ? props.map.levelRange[0] : 0.001}
                        maxVal={props.map.levelRange ? props.map.levelRange[1] : 1}
                        decimalPlaces={levelDecimals}
                        showButtons={true}
                        scale="log"
                        isDisabled={!mapIsVisible}
                        value={mapContourLevel}
                        setValue={newVal => handleContourLevelChange(newVal)}
                        piWaitReturn={true}
                        showTicks
                        logMajorTickBase={1}
                        autoLabelMajorTicks
                        logMinorTickStep={1}
                    />
                </MoorhenStack>
                <MapSettingsAccordion
                    map={props.map}
                    mapIsVisible={mapIsVisible}
                    mapStyle={mapStyle}
                    mapRadius={mapRadius}
                    mapOpacity={mapOpacity}
                    hideRadiusControls={true}
                />
            </MoorhenStack>
        </MoorhenAccordion>
    );
};
