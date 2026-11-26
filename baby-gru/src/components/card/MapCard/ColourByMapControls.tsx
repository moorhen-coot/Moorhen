import { useDispatch, useSelector, useStore } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { selectMapRepresentation, selectMapRepresentationsOfMap, selectPrimaryMapRepresentation, setMapRepresentation } from "../../../store/mapRepresentationsSlice";
import type { RootState } from "../../../store/MoorhenReduxStore";
import type { MoorhenMap } from "../../../utils/MoorhenMap";
import {
    LOCAL_RESOLUTION_VALUES,
    colourByMapChanges,
    guessColourByMapRange,
    plainColourChanges,
} from "../../../utils/colourByMap";
import { type MapRepresentationChanges, defaultColourByMapGradient } from "../../../utils/Representation/mapRepresentationData";
import { MoorhenButton, MoorhenGradientPicker, MoorhenSelect } from "../../inputs";
import { type GradientColourTable, colourTableToCssGradient } from "../../inputs/MoorhenGradientPicker/gradientPresets";
import { MoorhenStack } from "../../interface-base";

type ColourByMapProps = {
    map: MoorhenMap;
    /** The representation it colours (a chip's edit panel). Without, every representation of the map (the card's title) */
    recordId?: string;
};

/** The record shown: `recordId`'s, else the map's first */
const useTargetRecord = (props: ColourByMapProps) =>
    useSelector((state: RootState) =>
        (props.recordId ? selectMapRepresentation(state, props.recordId) : undefined) ?? selectPrimaryMapRepresentation(state, props.map.uniqueId)
    );

/**
 * Colour a map representation by another map: which map, the gradient with its range (guessed from the other map's
 * values on the contour), apply, or back to a plain colour. In the popover of the button beside a map's colour swatch.
 */
export const ColourByMapControls = (props: ColourByMapProps) => {
    const { map } = props;
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const record = useTargetRecord(props);
    const otherMaps = useSelector((state: RootState) => state.maps.filter(item => item.uniqueId !== map.uniqueId));
    const current = record?.colourByMap ?? null;

    // Coloured already: as it is; else by a local resolution map if there is one, from a guess
    const [otherUid, setOtherUid] = useState<string>(
        () => current?.mapUid ?? (otherMaps.find(item => LOCAL_RESOLUTION_VALUES.test(item.name)) ?? otherMaps[0])?.uniqueId ?? ""
    );
    const [gradient, setGradient] = useState<GradientColourTable>(() => current?.gradient ?? defaultColourByMapGradient());
    const [minValue, setMinValue] = useState<number>(current?.min ?? 0);
    const [maxValue, setMaxValue] = useState<number>(current?.max ?? 1);
    const [isGuessing, setIsGuessing] = useState(false);
    const otherMap = otherMaps.find(item => item.uniqueId === otherUid);

    // The latest guess wins: switching map while one runs drops the earlier
    const guessRef = useRef(0);
    const guess = async (by = otherMap) => {
        if (!by) return;
        const ticket = ++guessRef.current;
        setIsGuessing(true);
        try {
            const range = await guessColourByMapRange(map, by, record);
            if (range && ticket === guessRef.current) {
                setMinValue(range.min);
                setMaxValue(range.max);
            }
        } finally {
            if (ticket === guessRef.current) setIsGuessing(false);
        }
    };

    // A range to start from when it is not coloured by that map yet: on opening, and on choosing another map
    const guessUnlessColouredBy = (by: MoorhenMap | undefined) => {
        if (by && current?.mapUid !== by.uniqueId) void guess(by);
    };
    useEffect(() => {
        // After mounting, not during the effect (no state set synchronously in it)
        const timeout = setTimeout(() => guessUnlessColouredBy(otherMap), 0);
        return () => clearTimeout(timeout);
    }, []);
    const chooseOtherMap = (uid: string) => {
        setOtherUid(uid);
        guessUnlessColouredBy(otherMaps.find(item => item.uniqueId === uid));
    };

    const change = (changes: MapRepresentationChanges) => {
        const ids = props.recordId ? [props.recordId] : selectMapRepresentationsOfMap(store.getState(), map.uniqueId).map(item => item.id);
        ids.forEach(id => dispatch(setMapRepresentation({ id, changes })));
    };

    if (otherMaps.length === 0) {
        return <span>Load another map to colour this one by its values.</span>;
    }

    return (
        <MoorhenStack direction="vertical" gap="0.5rem" style={{ minWidth: "20rem" }}>
            <MoorhenSelect label="By this map" value={otherUid} setValue={chooseOtherMap}>
                {otherMaps.map(item => (
                    <option key={item.uniqueId} value={item.uniqueId}>
                        {item.molNo}: {item.name}
                    </option>
                ))}
            </MoorhenSelect>
            <MoorhenGradientPicker
                colourTable={gradient}
                setColourTable={setGradient}
                menu="colour-by-map-button"
                minValue={minValue}
                setMinValue={setMinValue}
                maxValue={maxValue}
                setMaxValue={setMaxValue}
                modifyValues
            />
            <MoorhenStack direction="row" gap="0.5rem" justify="flex-end" style={{ flexWrap: "wrap" }}>
                <MoorhenButton variant="secondary" disabled={!otherMap || isGuessing} onClick={() => void guess()}>
                    {isGuessing ? "Guessing..." : "Guess range"}
                </MoorhenButton>
                {current && (
                    <MoorhenButton variant="secondary" onClick={() => change(plainColourChanges)}>
                        Plain colour
                    </MoorhenButton>
                )}
                <MoorhenButton
                    disabled={!otherMap || !(minValue < maxValue)}
                    onClick={() => otherMap && change(colourByMapChanges(otherMap, { min: minValue, max: maxValue }, gradient))}
                >
                    Apply
                </MoorhenButton>
            </MoorhenStack>
        </MoorhenStack>
    );
};

/**
 * "Colour by another map" in a map's colour picker: a button (a gradient: the one it is coloured with, if it is) that
 * shows ColourByMapControls below it, in the same popover
 */
export const ColourByMapSection = (props: ColourByMapProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const record = useTargetRecord(props);
    const gradient = record?.colourByMap?.gradient ?? defaultColourByMapGradient();
    return (
        <MoorhenStack direction="vertical" gap="0.5rem" style={{ marginTop: "0.5rem" }}>
            <MoorhenStack direction="row" align="center" gap="0.5rem">
                <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        flexGrow: 1,
                        height: "25px",
                        padding: "0 0.5rem",
                        borderRadius: "8px",
                        border: "2px solid rgb(255, 255, 255)",
                        boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(0, 0, 0, 0.15)",
                        cursor: "pointer",
                        backgroundImage: colourTableToCssGradient(gradient),
                        color: "white",
                        fontWeight: 600,
                        textShadow: "0 0 3px black",
                    }}
                >
                    {record?.colourByMap ? "Coloured by another map" : "Colour by another map"} {isOpen ? "▴" : "▾"}
                </button>
            </MoorhenStack>
            {isOpen && <ColourByMapControls map={props.map} recordId={props.recordId} />}
        </MoorhenStack>
    );
};
