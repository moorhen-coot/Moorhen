import { useMemo, useState } from "react";
import { MoorhenPreciseInput } from "../MoorhenPreciseInput/MoorhenPreciseInput";
import { toFixedNoZero } from "../../misc/helpers";
import { PlusMinusButton } from "./PlusMinusButton";
import "./MoorhenSlider.css";

type MoorhenSliderProps = {
    externalValue: number; // value passed from parent
    setExternalValue: (value: number) => void;
    logScale?: boolean;
    minVal?: number;
    maxVal?: number;
    sliderTitle?: string;
    decimalPlaces?: number;
    showMinMaxVal?: boolean;
    showButtons?: boolean;
    stepButtons?: number;
    isDisabled?: boolean;
    usePreciseInput?: boolean;
    piWidth?: string | number;
    piWaitReturn?: boolean;
    piMinMax?: [number, number];
};

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
 * @prop {number} externalValue
 *   The current value of the slider, controlled by the parent component.
 *
 * @prop {function} setExternalValue
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
 * @prop {boolean} [showMinMaxVal=true]
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
        minVal = 0,
        maxVal = 100,
        logScale = false,
        decimalPlaces = 0,
        sliderTitle = "",
        showMinMaxVal = true,
        isDisabled = false,
        usePreciseInput = false,
        showButtons = true,
        piWidth,
        piWaitReturn = false,
        piMinMax = [minVal, maxVal],
    } = props;

    const precision = Math.pow(10, -decimalPlaces);

    const stepButtons = useMemo(
        function getStepButtons() {
            if (props.stepButtons) {
                if (logScale) {
                    return (Math.log10(maxVal) - Math.log10(minVal)) / props.stepButtons;
                } else {
                    return props.stepButtons;
                }
            } else {
                if (logScale) {
                    return (Math.log10(maxVal) - Math.log10(minVal)) / 100;
                } else {
                    const hundredStep = (maxVal - minVal) / 100;
                    return hundredStep < precision ? precision : hundredStep;
                }
            }
        },
        [props.stepButtons, logScale, maxVal, minVal, precision]
    );

    const displayValue = logScale ? log10ofT(props.externalValue) : props.externalValue;

    const handleChange = (newValue: number) => {
        props.setExternalValue(logScale ? pow10ofT(newValue) : newValue); // external value is changed by logscale
    };

    const handleSliderChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        const newSliderValue = +evt.target.value;
        handleChange(newSliderValue);
    };

    const handleSetValue = (newVal: string) => {
        props.setExternalValue(+newVal);
    };

    const drawTitle = () => {
        const drawPreciseInput = () => {
            return (
                <label className={"moorhen__slider__label"} htmlFor="slider">
                    <MoorhenPreciseInput
                        allowNegativeValues={minVal < 0}
                        label={sliderTitle}
                        value={props.externalValue as number}
                        setValue={handleSetValue}
                        waitReturn={piWaitReturn}
                        decimalDigits={decimalPlaces}
                        width={piWidth ? piWidth : 2.5 + 0.6 * decimalPlaces + "rem"}
                        disabled={isDisabled}
                        minMax={piMinMax}
                    />
                </label>
            );
        };

        if (sliderTitle === "") return null;

        if (!usePreciseInput) {
            return (
                <label className={"moorhen__slider__label"} htmlFor="slider">
                    {sliderTitle}: {props.externalValue.toFixed(decimalPlaces)}
                </label>
            );
        } else return drawPreciseInput();
    };

    const [buttonIsDown, setButtonIsDown] = useState(false);

    function drawSidePanels(side: string) {
        if (!showButtons) {
            return <></>;
        }
        return (
            <PlusMinusButton
                step={side === "L" ? -stepButtons : +stepButtons}
                setButtonIsDown={setButtonIsDown}
                externalValue={props.externalValue as number}
                setExternalValue={props.setExternalValue}
                minVal={minVal}
                maxVal={maxVal}
                isDisabled={isDisabled}
                logScale={logScale}
            />
        );
    }

    return (
        <>
            <div className={"moorhen__slider__container"}>
                {drawTitle()}
                <div className={"moorhen__slider__leftPanel"}>{drawSidePanels("L")}</div>
                <div className={"moorhen__slider__sliderCont"}>
                    <input
                        type="range"
                        className={`${"moorhen__slider slider"} ${isDisabled ? "moorhen__slider disabled" : ""} ${
                            buttonIsDown ? "moorhen__slider buttonIsDown" : ""
                        }`}
                        disabled={isDisabled}
                        value={Array.isArray(displayValue) ? displayValue[0] : displayValue}
                        onChange={handleSliderChange}
                        min={logScale ? Math.log10(minVal) : minVal}
                        max={logScale ? Math.log10(maxVal) : maxVal}
                        step={precision}
                    />
                    {showMinMaxVal ? (
                        <div className={"moorhen__slider__minMaxVal"}>
                            <span>{toFixedNoZero(minVal, decimalPlaces)}</span>
                            <span>{toFixedNoZero(maxVal, decimalPlaces)}</span>
                        </div>
                    ) : (
                        <></>
                    )}
                </div>
                <div className={"moorhen__slider__rightPanel"}>{drawSidePanels("R")}</div>
            </div>
        </>
    );
};
