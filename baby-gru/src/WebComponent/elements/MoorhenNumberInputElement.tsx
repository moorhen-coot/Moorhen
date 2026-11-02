import React from "react";
import { MoorhenNumberInput } from "@/components/inputs/MoorhenNumberInput/NumberInput";
import { booleanAttribute, MoorhenUIElement, numberAttribute } from "./MoorhenUIElement";

/**
 * `<moorhen-number-input>`: Moorhen's number field for content placed inside `<moorhen-web-component>`.
 * While it has focus, Moorhen's keyboard shortcuts are paused, so typing does not drive the viewer.
 *
 * Attributes: `value` (starting value), `min`, `max`, `label`, `label-position` ("left" | "top"),
 * `decimal-digits` (default 2), `width` (a CSS length), `step` (of the arrow buttons; by default one
 * unit of the last decimal), `tooltip`, and the booleans `integer`, `show-buttons`, `wait-return`
 * (the value only changes on Enter or when leaving the field) and `disabled`.
 *
 * Property: `value` — a number, or `null` when empty.
 *
 * Events, as for a native number input: `input` (bubbling) on each valid value while typing (on
 * Enter only with `wait-return`) and for each step of the arrow buttons; `change` (bubbling) once the
 * value is committed — Enter, focus leaving the field, or an arrow button released. Setting `value`
 * from a script fires neither.
 *
 * @example
 * <moorhen-number-input label="Radius" value="8" min="1" max="30" decimal-digits="1" show-buttons></moorhen-number-input>
 */
export class MoorhenNumberInputElement extends MoorhenUIElement {
    static observedAttributes = [
        "value",
        "min",
        "max",
        "label",
        "label-position",
        "decimal-digits",
        "width",
        "step",
        "tooltip",
        "integer",
        "show-buttons",
        "wait-return",
        "disabled",
    ];
    static upgradedProperties = ["value"];

    /** Set once the user or a script changed it; until then the attribute decides. */
    private _value: number | null | undefined = undefined;
    /** The value last reported with `change`. */
    private _committed: number | null = null;

    constructor() {
        super();
        // Committed when focus leaves the field, or when an arrow button is released (anywhere, as
        // a held button repeats). Enter commits through onReturn. Next tick: after the component's own commit.
        const commitLater = () => setTimeout(() => this.commitIfChanged(), 0);
        this.addEventListener("focusout", commitLater);
        this.addEventListener("pointerdown", () => window.addEventListener("pointerup", commitLater, { once: true, capture: true }));
    }

    get value(): number | null {
        if (this._value !== undefined) return this._value;
        return numberAttribute(this, "value") ?? null;
    }

    set value(value: number | null) {
        this._value = value === null || value === undefined || Number.isNaN(Number(value)) ? null : Number(value);
        this._committed = this.value;
        this.requestRender();
    }

    public connectedCallback() {
        this._committed = this.value;
        return super.connectedCallback();
    }

    public attributeChangedCallback() {
        // A value changed by the page (attribute) is not a user change
        if (this._value === undefined) this._committed = this.value;
        super.attributeChangedCallback();
    }

    private commitIfChanged() {
        if (this.value === this._committed) return;
        this._committed = this.value;
        this.dispatchEvent(new Event("change", { bubbles: true }));
    }

    protected renderComponent() {
        const min = numberAttribute(this, "min");
        const max = numberAttribute(this, "max");
        const minMax: [number, number] | undefined =
            min !== undefined || max !== undefined ? [min ?? -Infinity, max ?? Infinity] : undefined;
        return (
            <MoorhenNumberInput
                value={this.value}
                setValue={(value: number) => {
                    if (value === this.value) return;
                    this._value = value;
                    this.requestRender();
                    this.dispatchEvent(new Event("input", { bubbles: true }));
                }}
                onReturn={() => setTimeout(() => this.commitIfChanged(), 0)}
                minMax={minMax}
                allowNegativeValues={min === undefined || min < 0}
                label={this.getAttribute("label") ?? undefined}
                labelPosition={(this.getAttribute("label-position") ?? "left") as "left" | "top"}
                decimalDigits={numberAttribute(this, "decimal-digits")}
                width={this.getAttribute("width") ?? undefined}
                buttonSteps={numberAttribute(this, "step")}
                tooltip={this.getAttribute("tooltip") ?? undefined}
                integer={booleanAttribute(this, "integer")}
                showButtons={booleanAttribute(this, "show-buttons")}
                waitReturn={booleanAttribute(this, "wait-return")}
                disabled={booleanAttribute(this, "disabled")}
            />
        );
    }
}

/** Attributes of `<moorhen-number-input>`, for declaring it in JSX. */
export interface MoorhenNumberInputElementAttributes extends React.HTMLAttributes<HTMLElement> {
    value?: number;
    min?: number;
    max?: number;
    label?: string;
    "label-position"?: "left" | "top";
    "decimal-digits"?: number;
    width?: string;
    /** Step of the arrow buttons. */
    step?: number;
    tooltip?: string;
    integer?: boolean;
    "show-buttons"?: boolean;
    "wait-return"?: boolean;
    disabled?: boolean;
}
