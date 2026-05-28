import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MoorhenStack } from "@/components/interface-base";
import { clampValue, toFixedNoZero } from "../../misc/helpers";
import { MoorhenNumberInput } from "../MoorhenNumberInput/NumberInput";
import "./MoorhenSlider.css";
import { PlusMinusButton } from "./PlusMinusButton";

type MoorhenSliderPropsBase = {
    value: number; // value passed from parent
    setValue: ((value: number) => void) | React.Dispatch<React.SetStateAction<number>>;
    logScale?: boolean;
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

function log10ofT<T extends number | [number, number]>(val: T): T {
    if (Array.isArray(val)) {
        return [Math.log10(val[0]), Math.log10(val[1])] as T;
    } else {
        return Math.log10(val) as T;
    }
}

function pow10ofT<T extends number | [number, number]>(val: T): T {
    // pow 10 for value of type T
    if (Array.isArray(val)) {
        return [Math.pow(10, val[0]), Math.pow(10, val[1])] as T;
    } else {
        return Math.pow(10, val) as T;
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
 */

export const MoorhenSlider = (props: MoorhenSliderProps) => {
    const {
        logScale = false,
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
        step,
    } = props;

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

    let labels = props.labels;
    if (!labels && showLabels) {
        labels = [
            { value: minVal, label: toFixedNoZero(minVal, decimalPlaces) },
            { value: maxVal, label: toFixedNoZero(maxVal, decimalPlaces) },
        ];
    }

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
            ? ((Math.log10(value) - Math.log10(minVal)) / (Math.log10(maxVal) - Math.log10(minVal))) * 100
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
            const logMin = Math.log10(minVal);
            const logMax = Math.log10(maxVal);
            const logValue = (clickPosition / sliderSize) * (logMax - logMin) + logMin;
            newValue = Math.pow(10, logValue);
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
                return (Math.log10(maxVal) - Math.log10(minVal)) / props.stepButtons;
            } else {
                return props.stepButtons;
            }
        } else if (step) {
            return step;
        } else {
            if (logScale) {
                return (Math.log10(maxVal) - Math.log10(minVal)) / 100;
            } else {
                const hundredStep = (maxVal - minVal) / 100;
                return hundredStep < precision ? precision : hundredStep;
            }
        }
    }

    const stepButtons = getStepButtons();

    const handleChange = (newValue: number, thumbIndex: number) => {
        if (thumbIndex === 2 && props.type === "range") {
            handleSetValue2(clampValue(logScale ? pow10ofT(newValue) : newValue, minVal, maxVal));
        } else {
            handleSetValue(clampValue(logScale ? pow10ofT(newValue) : newValue, minVal, maxVal));
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
            ? ratio * (Math.log10(maxVal) - Math.log10(minVal)) + Math.log10(minVal)
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

    const numOfMajorTicks = logScale
        ? Math.floor((Math.log10(maxVal) - Math.log10(minVal)) / majorTickSpacing) + 1
        : Math.floor((maxVal - minVal) / majorTickSpacing) + 1;
    console.log("numOfMajorTicks", numOfMajorTicks);
    function getTickValue(index: number, spacing: number, isMajor = false) {
        let val: number;
        if (!logScale) {
            return (val = Math.ceil(minVal / spacing) * spacing + index * spacing);
        } else if (isMajor) {
            return (val = Math.ceil(minVal / spacing) * spacing + index * spacing * Math.pow(10, index));
        }
    }

    return (
        <>
            <MoorhenStack>
                {drawTitle()}
                <MoorhenStack direction="row" align="center" justify="center" gap={20}>
                    <div className={"moorhen__slider__leftPanel"}>{drawSidePanels("L")}</div>
                    <div className={`moorhen__slider-track-container ${buttonIsDown ? "moorhen__slider-track-container-active" : ""}`}>
                        <input
                            type="range"
                            className={"moorhen__slider-builtin"}
                            disabled={isDisabled}
                            value={logScale ? log10ofT(props.value) : props.value}
                            onChange={props.setValue ? evt => handleChange(+evt.target.value, 1) : undefined}
                            min={logScale ? Math.log10(minVal) : minVal}
                            max={logScale ? Math.log10(maxVal) : maxVal}
                            step={precision}
                        />
                        {props.type === "range" && (
                            <input
                                type="range"
                                className={"moorhen__slider-builtin"}
                                disabled={isDisabled}
                                value={logScale ? log10ofT(props.value2) : props.value2}
                                onChange={props.setValue2 ? evt => handleChange(+evt.target.value, 2) : undefined}
                                min={logScale ? Math.log10(minVal) : minVal}
                                max={logScale ? Math.log10(maxVal) : maxVal}
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
                        <div className={"moorhen__slider__labels-bottom"}>
                            {showTicks &&
                                Array.from({ length: Math.floor((maxVal - minVal) / tickSpacing) + 1 }, (_, i) => (
                                    <span
                                        key={i}
                                        className="moorhen__slider__tick"
                                        style={{
                                            left: `${calculatePositionOnSlider(getTickValue(i, tickSpacing))}%`,
                                        }}
                                    />
                                ))}
                            {showTicks &&
                                majorTickSpacing &&
                                Array.from({ length: numOfMajorTicks }, (_, i) => (
                                    <span
                                        key={i}
                                        className="moorhen__slider__major-tick"
                                        style={{
                                            left: `${calculatePositionOnSlider(getTickValue(i, majorTickSpacing, true))}%`,
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
