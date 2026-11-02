import React from "react";
import { MoorhenSlider } from "@/components/inputs/MoorhenSlider/MoorhenSlider";
import { booleanAttribute, MoorhenUIElement, numberAttribute } from "./MoorhenUIElement";

type SliderLabel = { value: number; label: string; tick?: boolean; colour?: string };

/**
 * `<moorhen-slider>`: Moorhen's slider for content placed inside `<moorhen-web-component>`.
 *
 * Attributes: `min` (default 0), `max` (default 100), `step`, `value` (starting value), `scale`
 * ("linear" | "log" | "asinh"), `label` (title above the slider), `unit`, `decimal-places`, `colour`,
 * and the booleans `disabled`, `show-ticks`, `precise-input` (adds a number field), `hide-buttons`,
 * `hide-labels`, `hide-value` (in the title). `type="range"` gives two thumbs, with `value2`.
 *
 * Properties: `value` (and `value2` for a range), `labels` (`{ value, label, tick?, colour? }[]`) and
 * `allowedValues` (`number[]`, the slider snaps to them).
 *
 * Events, as for a native range input: `input` (bubbling) on every change while the user drags or
 * steps, `change` (bubbling) once the user lets go (pointer released — also outside the element at the
 * end of a drag —, key released, or focus leaving).
 * Setting `value` from a script fires neither.
 *
 * @example
 * <moorhen-slider label="Radius" min="1" max="30" value="12" unit="Å"></moorhen-slider>
 */
export class MoorhenSliderElement extends MoorhenUIElement {
    static observedAttributes = [
        "min",
        "max",
        "step",
        "value",
        "value2",
        "type",
        "scale",
        "label",
        "unit",
        "decimal-places",
        "colour",
        "disabled",
        "show-ticks",
        "precise-input",
        "hide-buttons",
        "hide-labels",
        "hide-value",
    ];
    static upgradedProperties = ["value", "value2", "labels", "allowedValues"];

    private _value: number | undefined = undefined;
    private _value2: number | undefined = undefined;
    private _labels: SliderLabel[] | undefined = undefined;
    private _allowedValues: number[] | undefined = undefined;
    /** The value last reported with `change`, to fire it only when the user really changed something. */
    private _committed = "";

    constructor() {
        super();
        this.onUserRelease(() => this.commitIfChanged());
    }

    private get min() {
        return numberAttribute(this, "min") ?? 0;
    }

    private get max() {
        return numberAttribute(this, "max") ?? 100;
    }

    private get isRange() {
        return this.getAttribute("type") === "range";
    }

    get value(): number {
        return this._value ?? numberAttribute(this, "value") ?? this.min;
    }

    set value(value: number) {
        this._value = Number(value);
        this._committed = this.snapshot();
        this.requestRender();
    }

    /** The second thumb of a `type="range"` slider. */
    get value2(): number {
        return this._value2 ?? numberAttribute(this, "value2") ?? this.max;
    }

    set value2(value: number) {
        this._value2 = Number(value);
        this._committed = this.snapshot();
        this.requestRender();
    }

    get labels(): SliderLabel[] | undefined {
        return this._labels;
    }

    set labels(labels: SliderLabel[] | undefined) {
        this._labels = labels;
        this.requestRender();
    }

    get allowedValues(): number[] | undefined {
        return this._allowedValues;
    }

    set allowedValues(values: number[] | undefined) {
        this._allowedValues = values;
        this.requestRender();
    }

    public connectedCallback() {
        this._committed = this.snapshot();
        return super.connectedCallback();
    }

    public attributeChangedCallback() {
        // A value changed by the page (attribute) is not a user change
        this._committed = this.snapshot();
        super.attributeChangedCallback();
    }

    private snapshot() {
        return this.isRange ? `${this.value},${this.value2}` : `${this.value}`;
    }

    private commitIfChanged() {
        const current = this.snapshot();
        if (current === this._committed) return;
        this._committed = current;
        this.dispatchEvent(new Event("change", { bubbles: true }));
    }

    private userChanged(update: () => void) {
        update();
        this.requestRender();
        this.dispatchEvent(new Event("input", { bubbles: true }));
    }

    protected renderComponent() {
        const common = {
            minVal: this.min,
            maxVal: this.max,
            value: this.value,
            setValue: (value: number) => this.userChanged(() => (this._value = value)),
            step: numberAttribute(this, "step"),
            scale: (this.getAttribute("scale") ?? "linear") as "linear" | "log" | "asinh",
            sliderTitle: this.getAttribute("label") ?? undefined,
            sliderTitleUnit: this.getAttribute("unit") ?? undefined,
            decimalPlaces: numberAttribute(this, "decimal-places"),
            colour: this.getAttribute("colour") ?? undefined,
            isDisabled: booleanAttribute(this, "disabled"),
            showTicks: booleanAttribute(this, "show-ticks"),
            usePreciseInput: booleanAttribute(this, "precise-input"),
            showButtons: !booleanAttribute(this, "hide-buttons"),
            showLabels: !booleanAttribute(this, "hide-labels"),
            showTitleValue: !booleanAttribute(this, "hide-value"),
            labels: this._labels,
            allowedValues: this._allowedValues,
            ariaLabel: this.getAttribute("aria-label") ?? this.getAttribute("label") ?? undefined,
        };
        return this.isRange ? (
            <MoorhenSlider
                {...common}
                type="range"
                value2={this.value2}
                setValue2={(value: number) => this.userChanged(() => (this._value2 = value))}
            />
        ) : (
            <MoorhenSlider {...common} type="default" />
        );
    }
}

/** Attributes of `<moorhen-slider>`, for declaring it in JSX. */
export interface MoorhenSliderElementAttributes extends React.HTMLAttributes<HTMLElement> {
    min?: number;
    max?: number;
    step?: number;
    value?: number;
    value2?: number;
    type?: "default" | "range";
    scale?: "linear" | "log" | "asinh";
    label?: string;
    unit?: string;
    "decimal-places"?: number;
    colour?: string;
    disabled?: boolean;
    "show-ticks"?: boolean;
    "precise-input"?: boolean;
    "hide-buttons"?: boolean;
    "hide-labels"?: boolean;
    "hide-value"?: boolean;
}
