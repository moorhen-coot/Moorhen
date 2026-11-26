import { useDispatch, useSelector, useStore } from "react-redux";
import { useMemo, useRef } from "react";
import { useFastContourMode } from "../../../hooks/useFastContourMode";
import { useMapDisplay } from "../../../hooks/useMapDisplay";
import { selectShownLevelsBase, setMapRepresentation, shiftMapRepresentationLevels } from "../../../store/mapRepresentationsSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenNumberInput, MoorhenSlider } from "../../inputs";
import { MoorhenStack } from "../../interface-base";

/**
 * The level the controls show and set: `recordId`'s representation (a chip's), else the map's first
 * (map-display.md), or with `allShown` the lowest of the shown ones, all shown ones moving by the same amount
 * (multi-representation mode: the card's level). Set at once, or in fast contour mode (smaller radius) while it changes quickly.
 */
const useLevel = (map: moorhen.Map, allShown: boolean, initialContour: number, recordId?: string) => {
    const dispatch = useDispatch();
    const display = useMapDisplay(map, recordId);
    const store = useStore<moorhen.State>();
    const base = useSelector((state: moorhen.State) => selectShownLevelsBase(state, map.uniqueId));
    // A ref, not state: a slider drag calls this many times between renders
    const lastCallRef = useRef<number>(0);
    const { fastMapContourLevel } = useFastContourMode({
        map,
        mapRadius: display.radius,
        radiusThreshold: 25,
        fastRadius: "auto",
        timeoutDelay: 1000,
        allShown,
        recordId: display.record?.id,
    });
    const level = allShown ? base ?? display.contourLevel : display.record ? display.contourLevel : initialContour;
    const changeLevel = (newContourLevel: number) => {
        // A log slider has no zero or below: nothing to move all shown levels to
        if (!Number.isFinite(newContourLevel) || (allShown && newContourLevel <= 0)) return;
        const now = Date.now();
        const quick = now - lastCallRef.current < 500;
        lastCallRef.current = now;
        if (quick) {
            fastMapContourLevel(newContourLevel);
        } else if (allShown) {
            // From the levels as they are now, not as last rendered: several moves can come between two renders
            const current = selectShownLevelsBase(store.getState(), map.uniqueId);
            if (current !== undefined && newContourLevel !== current) {
                dispatch(shiftMapRepresentationLevels({ mapUid: map.uniqueId, by: newContourLevel - current }));
            }
        } else if (display.record) {
            dispatch(setMapRepresentation({ id: display.record.id, changes: { contourLevel: newContourLevel } }));
        }
    };
    // Usable while what it moves is shown
    const enabled = allShown ? base !== undefined : display.visible;
    return { level, changeLevel, enabled };
};

/**
 * A map's level: in map units and in rms (where it has one), and a slider.
 * @param allShown - Move all shown representations together, showing the lowest level (multi-representation mode).
 * @param recordId - The representation it sets (a chip's), else the map's first.
 */
export const MapLevelControls = (props: { map: moorhen.Map; initialContour?: number; allShown?: boolean; recordId?: string }) => {
    const { map, initialContour = 0.8, allShown = false } = props;
    const { level, changeLevel, enabled } = useLevel(map, allShown, initialContour, props.recordId);
    const decimals = map.isEM ? Math.abs(Math.floor(Math.log10(map.levelRange[0]))) : 2;
    return (
        <MoorhenStack direction="vertical" gap={"0.5rem"} style={{ justifyContent: "center" }}>
            <MoorhenStack direction="row" justify="center" align="center">
                <MoorhenNumberInput
                    style={{ justifyContent: "center" }}
                    value={level}
                    setValue={newVal => changeLevel(+newVal)}
                    label={"Level:"}
                    decimalDigits={decimals}
                    allowNegativeValues={true}
                    disabled={!enabled}
                    waitReturn={true}
                />
                &nbsp;
                {map.mapRmsd && (
                    <MoorhenNumberInput
                        style={{ justifyContent: "center" }}
                        allowNegativeValues={true}
                        value={level / map.mapRmsd}
                        setValue={newVal => changeLevel(+newVal * map.mapRmsd)}
                        label={"RMSD:"}
                        decimalDigits={2}
                        disabled={!enabled}
                        waitReturn={true}
                    />
                )}
            </MoorhenStack>
            <MoorhenSlider
                minVal={map.isEM ? map.levelRange[0] * 10 : 0.01}
                maxVal={map.levelRange[1]}
                decimalPlaces={decimals}
                showButtons={true}
                scale="log"
                isDisabled={!enabled}
                value={level}
                setValue={newVal => changeLevel(newVal)}
                piWaitReturn={true}
                showTicks
                logMajorTickBase={1}
                autoLabelMajorTicks
                logMinorTickStep={1}
            />
        </MoorhenStack>
    );
};

/**
 * An orbital's level (±, both lobes), with as many decimals as its small amplitudes need.
 * @param allShown - Move all shown representations together, showing the lowest level (multi-representation mode).
 * @param recordId - The representation it sets (a chip's), else the map's first.
 */
export const OrbitalLevelControls = (props: { map: moorhen.Map; initialContour?: number; allShown?: boolean; recordId?: string }) => {
    const { map, initialContour = 0.02, allShown = false } = props;
    const { level, changeLevel, enabled } = useLevel(map, allShown, initialContour, props.recordId);

    /**
     * How many decimals the level is worth showing.
     *
     * Orbital amplitudes are small - a few hundredths - and vary by orders of magnitude between
     * basis sets, so a fixed two decimals would show 0.00 for most of them. Taken from the level
     * itself, with enough digits to see a change.
     */
    const levelDecimals = useMemo(() => {
        const magnitude = Math.abs(level || map.suggestedContourLevel || 0.02);
        if (!Number.isFinite(magnitude) || magnitude <= 0) return 4;
        return Math.min(8, Math.max(2, 2 - Math.floor(Math.log10(magnitude))));
    }, [level, map.suggestedContourLevel]);

    return (
        <MoorhenStack direction="vertical" gap={"0.5rem"} style={{ justifyContent: "center" }}>
            <MoorhenStack direction="row" justify="center" align="center">
                <MoorhenNumberInput
                    style={{ justifyContent: "center" }}
                    value={level}
                    setValue={newVal => changeLevel(+newVal)}
                    label={"Level: ±"}
                    decimalDigits={levelDecimals}
                    allowNegativeValues={false}
                    disabled={!enabled}
                    waitReturn={true}
                />
            </MoorhenStack>
            <MoorhenSlider
                minVal={map.levelRange ? map.levelRange[0] : 0.001}
                maxVal={map.levelRange ? map.levelRange[1] : 1}
                decimalPlaces={levelDecimals}
                showButtons={true}
                scale="log"
                isDisabled={!enabled}
                value={level}
                setValue={newVal => changeLevel(newVal)}
                piWaitReturn={true}
                showTicks
                logMajorTickBase={1}
                autoLabelMajorTicks
                logMinorTickStep={1}
            />
        </MoorhenStack>
    );
};
