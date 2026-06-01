import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MoorhenStack } from "@/components/interface-base";
import { clampValue, toFixedNoZero } from "../../misc/helpers";
import { MoorhenNumberInput } from "../MoorhenNumberInput/NumberInput";
import "./MoorhenSlider.css";
import { PlusMinusButton } from "./PlusMinusButton";

type MoorhenSliderPropsBase = {
    value: number; // value passed from parent
    setValue: ((value: number) => void) | React.Dispatch<React.SetStateAction<number>>;
    scale?: "linear" | "log" | "asinh";
    sliderTitle?: string;
    sliderPrecision?: number;
    decimalPlaces?: number;
    showLabels?: boolean;
    showButtons?: boolean;
    stepButtons?: number;
    isDisabled?: boolean;
    usePreciseInput?: boolean;
    piWidth?: string | number;
    piWaitReturn?: boolean;
    piMinMax?: [number, number];
    labels?: { value: number; label: string; tick?: boolean; colour?: string }[];
    showTicks?: boolean;
    tickSpacing?: number;
    majorTickSpacing?: number;
    logMinorTickStep?: number;
    logMajorTickBase?: number;
    autoLabelMajorTicks?: boolean;
    tickInside?: boolean;
    step?: number;
};

type MoorhenSliderRange = {
    type: "range";
    value2: number; // optional second value for range sliders
    setValue2: ((value: number) => void) | React.Dispatch<React.SetStateAction<number>>;
    minVal?: number;
    maxVal?: number;
} & MoorhenSliderPropsBase;

type MoorhenSliderDefault = {
    type?: "default";
    minVal?: number;
    maxVal?: number;
    steps?: never;
    value2?: never;
} & MoorhenSliderPropsBase;

type MoorhenSliderProps = MoorhenSliderDefault | MoorhenSliderRange;

function log10ofT<T extends number | [number, number]>(val: T, resolveScaling: (v: number) => number): T {
    if (Array.isArray(val)) {
        return [resolveScaling(val[0]), resolveScaling(val[1])] as T;
    } else {
        return resolveScaling(val) as T;
    }
}

function pow10ofT<T extends number | [number, number]>(val: T, resolveInverseScaling: (v: number) => number): T {
    // pow 10 for value of type T
    if (Array.isArray(val)) {
        return [resolveInverseScaling(val[0]), resolveInverseScaling(val[1])] as T;
    } else {
        return resolveInverseScaling(val) as T;
    }
}

/**
 * MoorhenSlider component - A customizable slider control with support for logarithmic scaling,
 * precise input, and increment/decrement buttons.
 *
 * @prop {number} value
 *   The current value of the slider, controlled by the parent component.
 *
 * @prop {function} setvalue
 *   Callback function to update the value in the parent component. Receives the new value as argument.
 *
 * @prop {boolean} [logScale=false]
 *   If true, the slider operates on a logarithmic scale internally while displaying linear values.
 *
 * @prop {number} [minVal=0]
 *   The minimum value of the slider range.
 *
 * @prop {number} [maxVal=100]
 *   The maximum value of the slider range.
 *
 * @prop {string} [sliderTitle=""]
 *   The label/title displayed above the slider. If empty, no title is shown.
 *
 * @prop {number} [decimalPlaces=0]
 *   Number of decimal places to display for the value and use for precision.
 *
 * @prop {boolean} [showLabels=true]
 *   Whether to display the min and max values below the slider track.
 *
 * @prop {boolean} [showButtons=true]
 *   Whether to show increment/decrement buttons on the left and right sides of the slider.
 *
 * @prop {number} [stepButtons]
 *   Step size for the increment/decrement buttons. If not provided, defaults to 1/100th of the range.
 *   For logarithmic sliders, this represents the step in log space.
 *
 * @prop {boolean} [isDisabled=false]
 *   If true, disables the slider and all its interactive controls.
 *
 * @prop {boolean} [usePreciseInput=false]
 *   If true, replaces the value display with an editable precise numeric input field.
 *
 * @prop {string | number} [piWidth]
 *   Width of the precise input field (when usePreciseInput is true).
 *   If not provided, width is calculated based on decimal places.
 *
 * @prop {boolean} [piWaitReturn=false]
 *   If true, the precise input only updates the value when Enter is pressed.
 *
 * @prop {[number, number]} [piMinMax]
 *   Min and max value constraints for the precise input field. Defaults to [minVal, maxVal].
 *
 * @prop {number} [tickSpacing=5]
 *   Linear-scale spacing between minor ticks.
 *
 * @prop {number} [majorTickSpacing]
 *   Linear-scale spacing between major ticks.
 *
 * @prop {number} [logMinorTickStep]
 *   Log-scale mantissa increment within each decade. For example, `1` gives 2..9, 20..90, 200..900.
 *
 * @prop {number} [logMajorTickBase]
 *   Log-scale base mantissa for major ticks. For example, `1` gives 1, 10, 100, 1000.
 */

export const MoorhenSlider = (props: MoorhenSliderProps) => {
    const {
        scale = "linear",
        decimalPlaces = 0,
        sliderTitle,
        sliderPrecision = null,
        showLabels = true,
        isDisabled = false,
        usePreciseInput = false,
        showButtons = true,
        piWidth,
        piWaitReturn = true,
        showTicks = false,
        minVal = 0,
        maxVal = 100,
        tickSpacing = 5,
        majorTickSpacing,
        logMinorTickStep,
        logMajorTickBase,
        autoLabelMajorTicks,
        tickInside = false,
        step,
    } = props;
    const logScale = scale === "log" || scale === "asinh";

    const resolveScaling = (value: number) => {
        if (scale === "log") {
            return Math.log10(value);
        } else if (scale === "asinh") {
            return Math.asinh(value);
        } else {
            return value;
        }
    }
    const resolveInverseScaling = (value: number) => {
        if (scale === "log") {
            return Math.pow(10, value);
        } else if (scale === "asinh") {
            return Math.sinh(value);
        } else {
            return value;
        }
    }   

    const resolvedTickSpacing = logScale ? (logMinorTickStep ?? tickSpacing) : tickSpacing;
    const resolvedMajorTickSpacing = logScale ? (logMajorTickBase ?? majorTickSpacing) : majorTickSpacing;

    const piMinMax: [number, number] = [minVal, maxVal];
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);

    const precision = sliderPrecision ?? Math.pow(10, -decimalPlaces);
    const [thumbPosition, setThumbPosition] = useState(0);
    const [thumb2Position, setThumb2Position] = useState(0);
    const thumb2Ref = useRef<HTMLDivElement>(null);

    const blurActiveTextInput = () => {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLInputElement && activeElement.type !== "range") {
            activeElement.blur();
        }
    };



    function handleSetValue(newVal: number) {
        let appliedVal = newVal;
        if (props.type === "range") {
            if (newVal > props.value2) {
                appliedVal = props.value2;
            }
        }
        if (step) {
            const stepsFromMin = Math.round((appliedVal - minVal) / step);
            appliedVal = minVal + stepsFromMin * step;
        }
        props.setValue(+appliedVal);
    }

    function handleSetValue2(newVal: number) {
        let appliedVal = newVal;
        if (props.type === "range") {
            if (newVal < props.value) {
                appliedVal = props.value;
            }
            if (step) {
                const stepsFromMin = Math.round((appliedVal - minVal) / step);
                appliedVal = minVal + stepsFromMin * step;
            }
            props.setValue2(+appliedVal);
        }
    }

    function calculatePositionOnSlider(value: number) {
        if (maxVal === minVal) return 0;

        const percent = logScale
            ? ((resolveScaling(value) - resolveScaling(minVal)) / (resolveScaling(maxVal) - resolveScaling(minVal))) * 100
            : ((value - minVal) / (maxVal - minVal)) * 100;

        if (!Number.isFinite(percent)) {
            return 0;
        }

        return Math.max(0, Math.min(100, percent));
    }

    useEffect(() => {
        setThumbPosition(calculatePositionOnSlider(props.value));
    }, [props.value, minVal, maxVal, logScale]);

    useEffect(() => {
        if (props.type !== "range") return;
        setThumb2Position(calculatePositionOnSlider(props.value2));
    }, [props.value2, minVal, maxVal, logScale]);

    useLayoutEffect(() => {
        setThumbPosition(calculatePositionOnSlider(props.value));
        if (props.type === "range") {
            setThumb2Position(calculatePositionOnSlider(props.value2));
        }
    }, []);

    const handleTrackClick = (evt: React.MouseEvent<HTMLDivElement>) => {
        if (isDisabled) return;
        blurActiveTextInput();
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const clickPosition = evt.clientX - rect.left;
        const sliderSize = trackRef.current.clientWidth > 0 ? trackRef.current.clientWidth : 1;
        let newValue;
        if (logScale) {
            const logMin = resolveScaling(minVal);
            const logMax = resolveScaling(maxVal);
            const logValue = (clickPosition / sliderSize) * (logMax - logMin) + logMin;
            newValue = resolveInverseScaling(logValue);      
        } else {
            newValue = (clickPosition / sliderSize) * (maxVal - minVal) + minVal;
        }
        if (props.type === "range") {
            if (Math.abs(newValue - props.value) < Math.abs(newValue - props.value2)) {
                handleSetValue(clampValue(newValue, minVal, props.value2));
            } else {
                handleSetValue2(clampValue(newValue, props.value, maxVal));
            }
        } else {
            handleSetValue(parseFloat(newValue.toFixed(decimalPlaces)));
        }
    };

    function getStepButtons() {
        if (props.stepButtons) {
            if (logScale) {
                return (resolveScaling(maxVal) - resolveScaling(minVal)) / props.stepButtons;
            } else {
                return props.stepButtons;
            }
        } else if (step) {
            return step;
        } else {
            if (logScale) {
                return (resolveScaling(maxVal) - resolveScaling(minVal)) / 100;
            } else {
                const hundredStep = (maxVal - minVal) / 100;
                return hundredStep < precision ? precision : hundredStep;
            }
        }
    }

    const stepButtons = getStepButtons();

    const handleChange = (newValue: number, thumbIndex: number) => {
        if (thumbIndex === 2 && props.type === "range") {
            handleSetValue2(clampValue(logScale ? pow10ofT(newValue, resolveInverseScaling) : newValue, minVal, maxVal));
        } else {
            handleSetValue(clampValue(logScale ? pow10ofT(newValue, resolveInverseScaling) : newValue, minVal, maxVal));
        }
    };

    const abortControllerRef = useRef<AbortController | null>(null);

    const beginPointerTracking = (evt: React.MouseEvent | MouseEvent, onMove: (e: PointerEvent) => void, thumbIndex: number) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        window.addEventListener("pointermove", onMove, {
            signal: abortControllerRef.current.signal,
            passive: false,
        });
        window.addEventListener(
            "pointerup",
            () => {
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                    abortControllerRef.current = null;
                }
            },
            { once: true }
        );
    };

    const handleStartDragging = (evt: React.MouseEvent<HTMLElement, MouseEvent>, thumbIndex: number) => {
        if (isDisabled) return;
        blurActiveTextInput();
        evt.preventDefault();
        evt.stopPropagation();
        beginPointerTracking(evt, e => handleThumbDrag(e, thumbIndex), thumbIndex);
    };

    const handleThumbDrag = (evt: PointerEvent, thumbIndex: number) => {
        evt.preventDefault();
        evt.stopPropagation();
        if (!trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const sliderSize = trackRef.current.clientWidth > 0 ? trackRef.current.clientWidth : 1;
        const pointerX = clampValue(evt.clientX - rect.left, 0, sliderSize);
        const ratio = pointerX / sliderSize;

        const nextValue = logScale
            ? ratio * (resolveScaling(maxVal) - resolveScaling(minVal)) + resolveScaling(minVal)
            : ratio * (maxVal - minVal) + minVal;

        handleChange(logScale ? nextValue : parseFloat(nextValue.toFixed(decimalPlaces)), thumbIndex);
    };

    const drawTitle = () => {
        const drawPreciseInput = () => {
            const maxDigits = maxVal.toFixed(decimalPlaces).length;
            const finalPiWidth = piWidth ? piWidth : 0.5 + 0.7 * maxDigits + "rem";
            return (
                <label className={"moorhen__slider__label"} htmlFor="slider">
                    <MoorhenNumberInput
                        allowNegativeValues={minVal < 0}
                        label={sliderTitle}
                        value={props.value as number}
                        setValue={handleSetValue}
                        waitReturn={piWaitReturn}
                        decimalDigits={decimalPlaces}
                        width={finalPiWidth}
                        disabled={isDisabled}
                        minMax={piMinMax}
                    />
                    {props.type === "range" && (
                        <>
                            &nbsp;&nbsp;-&nbsp;&nbsp;
                            <MoorhenNumberInput
                                allowNegativeValues={minVal < 0}
                                value={props.value2 as number}
                                setValue={handleSetValue2}
                                waitReturn={piWaitReturn}
                                decimalDigits={decimalPlaces}
                                width={finalPiWidth}
                                disabled={isDisabled}
                                minMax={piMinMax}
                            />
                        </>
                    )}
                </label>
            );
        };

        if (sliderTitle === undefined) return null;

        if (!usePreciseInput) {
            return (
                <label className={"moorhen__slider__label"} htmlFor="slider">
                    {sliderTitle}: {props.value.toFixed(decimalPlaces)}{" "}
                    {props.type === "range" ? ` - ${props.value2.toFixed(decimalPlaces)}` : ""}
                </label>
            );
        } else return drawPreciseInput();
    };

    const [buttonIsDown, setButtonIsDown] = useState(false);

    function drawSidePanels(side: string) {
        if (!showButtons) {
            return <></>;
        }
        return props.type === "range" ? (
            <MoorhenStack>
                {" "}
                <PlusMinusButton
                    step={+stepButtons}
                    setButtonIsDown={setButtonIsDown}
                    value={side === "L" ? props.value : props.value2}
                    setValue={side === "L" ? handleSetValue : handleSetValue2}
                    minVal={minVal}
                    maxVal={maxVal}
                    isDisabled={isDisabled}
                    logScale={logScale}
                />{" "}
                <PlusMinusButton
                    step={-stepButtons}
                    setButtonIsDown={setButtonIsDown}
                    value={side === "L" ? props.value : props.value2}
                    setValue={side === "L" ? handleSetValue : handleSetValue2}
                    minVal={minVal}
                    maxVal={maxVal}
                    isDisabled={isDisabled}
                    logScale={logScale}
                />
            </MoorhenStack>
        ) : (
            <PlusMinusButton
                step={side === "L" ? -stepButtons : +stepButtons}
                setButtonIsDown={setButtonIsDown}
                value={props.value as number}
                setValue={handleSetValue}
                minVal={minVal}
                maxVal={maxVal}
                isDisabled={isDisabled}
                logScale={logScale}
            />
        );
    }

    const majorTickValues = useMemo(() => {
        if (!resolvedMajorTickSpacing) return [];

        if (!logScale) {
            // Linear scale
            return Array.from({ length: Math.floor((maxVal - minVal) / resolvedMajorTickSpacing) + 1 }, (_, index) =>
                Math.ceil(minVal / resolvedMajorTickSpacing) * resolvedMajorTickSpacing + index * resolvedMajorTickSpacing
            );
        }

        const ticks: number[] = [];

        if (scale === "log") {
            // Log scale - use powers of 10
            const firstExponent = Math.ceil(Math.log10(minVal / resolvedMajorTickSpacing));
            const lastExponent = Math.floor(Math.log10(maxVal / resolvedMajorTickSpacing));

            for (let exponent = firstExponent; exponent <= lastExponent; exponent++) {
                const tickValue = resolvedMajorTickSpacing * Math.pow(10, exponent);
                if (tickValue >= minVal && tickValue <= maxVal) {
                    ticks.push(tickValue);
                }
            }
        } else if (scale === "asinh") {
            // Asinh scale - use linear spacing in asinh space
            const scaledMin = Math.asinh(minVal);
            const scaledMax = Math.asinh(maxVal);
            const numTicks = Math.floor((scaledMax - scaledMin) / resolvedMajorTickSpacing) + 1;

            for (let i = 0; i < numTicks; i++) {
                const scaledValue = scaledMin + i * resolvedMajorTickSpacing;
                const tickValue = Math.sinh(scaledValue);
                if (tickValue >= minVal && tickValue <= maxVal) {
                    ticks.push(tickValue);
                }
            }
        }

        return ticks;
    }, [minVal, maxVal, resolvedMajorTickSpacing, scale]);

    const minorTickValues = useMemo(() => {
        if (!resolvedTickSpacing) return [];

        if (!logScale) {
            // Linear scale
            return Array.from({ length: Math.floor((maxVal - minVal) / resolvedTickSpacing) + 1 }, (_, index) =>
                Math.ceil(minVal / resolvedTickSpacing) * resolvedTickSpacing + index * resolvedTickSpacing
            );
        }

        const ticks: number[] = [];
        const majorTickValueSet = new Set(majorTickValues.map(value => value.toPrecision(12)));

        if (scale === "log") {
            // Log scale - mantissa-based ticks
            const decadeStart = Math.floor(Math.log10(minVal));
            const decadeEnd = Math.ceil(Math.log10(maxVal));
            const minMultiplier = resolvedMajorTickSpacing ?? 1;
            const maxMultiplier = minMultiplier * 10;

            for (let exponent = decadeStart; exponent <= decadeEnd; exponent++) {
                const scaleMult = Math.pow(10, exponent);
                const firstMultiplier = Math.max(
                    minMultiplier,
                    Math.ceil(minVal / scaleMult / resolvedTickSpacing) * resolvedTickSpacing
                );
                const lastMultiplier = Math.min(
                    maxMultiplier - resolvedTickSpacing,
                    Math.floor(maxVal / scaleMult / resolvedTickSpacing) * resolvedTickSpacing
                );

                for (let multiplier = firstMultiplier; multiplier <= lastMultiplier; multiplier += resolvedTickSpacing) {
                    const tickValue = multiplier * scaleMult;

                    if (tickValue >= minVal && tickValue <= maxVal && !majorTickValueSet.has(tickValue.toPrecision(12))) {
                        ticks.push(tickValue);
                    }
                }
            }
        } else if (scale === "asinh") {
            // Asinh scale - use linear spacing in asinh space
            const scaledMin = Math.asinh(minVal);
            const scaledMax = Math.asinh(maxVal);
            const numTicks = Math.floor((scaledMax - scaledMin) / resolvedTickSpacing) + 1;

            for (let i = 0; i < numTicks; i++) {
                const scaledValue = scaledMin + i * resolvedTickSpacing;
                const tickValue = Math.sinh(scaledValue);

                if (tickValue >= minVal && tickValue <= maxVal && !majorTickValueSet.has(tickValue.toPrecision(12))) {
                    ticks.push(tickValue);
                }
            }
        }

        return ticks;
    }, [minVal, maxVal, resolvedTickSpacing, resolvedMajorTickSpacing, majorTickValues, scale]);

    let labels = props.labels ? [...props.labels] : undefined;
    if (!labels && showLabels) {
        labels = [
            // { value: minVal, label: toFixedNoZero(minVal, decimalPlaces) },
            // { value: maxVal, label: toFixedNoZero(maxVal, decimalPlaces) },
        ];
    }
    if (showLabels && autoLabelMajorTicks) {
        console.log("majorTickValues", majorTickValues);
        for (const tick of majorTickValues) {
            console.log("tick", tick);
            labels?.push({ value: tick, label: tick.toString() });
        }

    }

    return (
        <>
            <MoorhenStack>
                {drawTitle()}
                <MoorhenStack direction="row">
                    <div className={"moorhen__slider__leftPanel"}>{drawSidePanels("L")}</div>
                    <div className={`moorhen__slider-track-container ${buttonIsDown ? "moorhen__slider-track-container-active" : ""}`}>
                        <input
                            type="range"
                            className={"moorhen__slider-builtin"}
                            disabled={isDisabled}
                            value={logScale ? log10ofT(props.value, resolveScaling) : props.value}
                            onChange={props.setValue ? evt => handleChange(+evt.target.value, 1) : undefined}
                            min={logScale ? resolveScaling(minVal) : minVal}
                            max={logScale ? resolveScaling(maxVal) : maxVal}
                            step={precision}
                        />
                        {props.type === "range" && (
                            <input
                                type="range"
                                className={"moorhen__slider-builtin"}
                                disabled={isDisabled}
                                value={logScale ? log10ofT(props.value2, resolveScaling) : props.value2}
                                onChange={props.setValue2 ? evt => handleChange(+evt.target.value, 2) : undefined}
                                min={logScale ? resolveScaling(minVal) : minVal}
                                max={logScale ? resolveScaling(maxVal) : maxVal}
                                step={precision}
                            />
                        )}

                        <div
                            className={`moorhen__slider-track ${isDisabled ? "disabled" : ""}`}
                            ref={trackRef}
                            onClick={handleTrackClick}
                        />
                        {props.type === "range" && (
                            <div
                                className={`moorhen__slider-track-fill ${isDisabled ? "disabled" : ""}`}
                                style={{ left: `${thumbPosition}%`, width: `${thumb2Position - thumbPosition}%` }}
                            />
                        )}
                        <div
                            className={`moorhen__slider-thumb ${isDisabled ? "disabled" : ""}`}
                            ref={thumbRef}
                            style={{ left: `${thumbPosition}%` }}
                            onMouseDown={evt => handleStartDragging(evt, 1)}
                        />
                        {props.type === "range" && (
                            <div
                                className={`moorhen__slider-thumb ${isDisabled ? "disabled" : ""}`}
                                ref={thumb2Ref}
                                style={{ left: `${thumb2Position}%` }}
                                onMouseDown={evt => handleStartDragging(evt, 2)}
                            />
                        )}
                        <div className={"moorhen__slider__labels-container"}>
                            {showTicks &&
                                minorTickValues.map((tickValue, index) => (
                                    <span
                                        key={index}
                                        className={"moorhen__slider__tick " + (tickInside ? "inside" : "")}
                                        style={{
                                            left: `${calculatePositionOnSlider(tickValue)}%`,
                                        }}
                                    />
                                ))}
                            {showTicks &&
                                resolvedMajorTickSpacing &&
                                majorTickValues.map((tickValue, index) => (
                                    <span
                                        key={index}
                                        className={"moorhen__slider__major-tick " + (tickInside ? "inside" : "")}
                                        style={{
                                            left: `${calculatePositionOnSlider(tickValue)}%`,
                                        }}
                                    />
                                ))}
                            {showLabels &&
                                labels.map((label, index) => (
                                    <span
                                        key={index}
                                        className={"moorhen__slider__label-bottom " + (label.tick ? "tick" : "")}
                                        style={{
                                            left: `${calculatePositionOnSlider(label.value)}%`,
                                            color: label.colour ? label.colour : "inherit",
                                        }}
                                    >
                                        {label.label !== "" ? label.label : label.value.toFixed(decimalPlaces)}
                                    </span>
                                ))}
                        </div>
                    </div>
                    <div className={"moorhen__slider__rightPanel"}>{drawSidePanels("R")}</div>
                </MoorhenStack>
            </MoorhenStack>
        </>
    );
};
