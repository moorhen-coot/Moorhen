import React from "react";
import { MoorhenColourPicker, type RGBAColour } from "@/components/inputs/MoorhenColourPicker/MoorhenColourPicker";
import { booleanAttribute, MoorhenUIElement } from "./MoorhenUIElement";

const DEFAULT_COLOUR = "#ffffff";

const toHexByte = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
        .toString(16)
        .padStart(2, "0");

/** "#rgb", "#rrggbb" or "#rrggbbaa" → [r, g, b, alpha 0–1]; null when not a hex colour. */
const parseHex = (hex: string): [number, number, number, number] | null => {
    let digits = hex.trim().replace(/^#/, "");
    if (/^[0-9a-f]{3,4}$/i.test(digits)) digits = [...digits].map(d => d + d).join("");
    if (!/^([0-9a-f]{6}|[0-9a-f]{8})$/i.test(digits)) return null;
    const byte = (i: number) => parseInt(digits.slice(i, i + 2), 16);
    return [byte(0), byte(2), byte(4), digits.length === 8 ? byte(6) / 255 : 1];
};

/** [r, g, b] or [r, g, b, alpha] (alpha 0–1, or 0–255 as the component also accepts) → hex. */
const toHex = (colour: RGBAColour, useAlpha: boolean) => {
    const rgb = `#${toHexByte(colour[0])}${toHexByte(colour[1])}${toHexByte(colour[2])}`;
    if (!useAlpha) return rgb;
    const alpha = colour.length === 4 ? (colour[3] > 1 ? colour[3] / 255 : colour[3]) : 1;
    return rgb + toHexByte(alpha * 255);
};

/**
 * `<moorhen-colour-picker>`: Moorhen's colour picker for content placed inside `<moorhen-web-component>`.
 * By default a swatch that opens the picker in a popover; `inline` shows the picker itself.
 *
 * The value is a hex colour: `#rrggbb`, or `#rrggbbaa` with `use-alpha`.
 *
 * Attributes: `value` (starting colour, `#rgb`, `#rrggbb` or `#rrggbbaa`), `label`, `tooltip`,
 * `position` ("top" | "bottom" | "left" | "right", where the popover opens), and the booleans
 * `use-alpha`, `inline` and `hide-swatches`.
 *
 * Events, as for a native colour input: `input` (bubbling) on every change while the user picks,
 * `change` (bubbling) once done — when the popover closes, or, `inline`, when the pointer or key is
 * released or focus leaves. Setting `value` from a script fires neither.
 *
 * @example
 * <moorhen-colour-picker value="#ff8800" tooltip="Ligand colour"></moorhen-colour-picker>
 */
export class MoorhenColourPickerElement extends MoorhenUIElement {
    static observedAttributes = ["value", "label", "tooltip", "position", "use-alpha", "inline", "hide-swatches", "aria-label"];
    static upgradedProperties = ["value"];

    /** The current colour as the component uses it; unset until picked or set. */
    private _colour: RGBAColour | undefined = undefined;
    /** The value last reported with `change`. */
    private _committed = "";

    constructor() {
        super();
        // Inline, the picker is in this element's shadow root: its release events reach the element.
        // (In a popover it is rendered in Moorhen's popup layer; closing the popover commits instead.)
        this.onUserRelease(() => {
            if (booleanAttribute(this, "inline")) this.commitIfChanged();
        });
    }

    private get useAlpha() {
        return booleanAttribute(this, "use-alpha");
    }

    private get colour(): RGBAColour {
        if (this._colour) return this._colour;
        const parsed = parseHex(this.getAttribute("value") ?? DEFAULT_COLOUR) ?? parseHex(DEFAULT_COLOUR)!;
        return this.useAlpha ? parsed : [parsed[0], parsed[1], parsed[2]];
    }

    get value(): string {
        return toHex(this.colour, this.useAlpha);
    }

    set value(hex: string) {
        const parsed = parseHex(String(hex));
        if (!parsed) {
            console.warn(`<moorhen-colour-picker>: "${hex}" is not a hex colour`);
            return;
        }
        this._colour = this.useAlpha ? parsed : [parsed[0], parsed[1], parsed[2]];
        this._committed = this.value;
        this.requestRender();
    }

    public connectedCallback() {
        this._committed = this.value;
        return super.connectedCallback();
    }

    public attributeChangedCallback() {
        // A value changed by the page (attribute) is not a user change
        this._committed = this.value;
        super.attributeChangedCallback();
    }

    private commitIfChanged() {
        const current = this.value;
        if (current === this._committed) return;
        this._committed = current;
        this.dispatchEvent(new Event("change", { bubbles: true }));
    }

    protected renderComponent() {
        return (
            <MoorhenColourPicker
                colour={this.colour}
                setColour={colour => {
                    this._colour = colour;
                    this.requestRender();
                    this.dispatchEvent(new Event("input", { bubbles: true }));
                }}
                onClose={() => this.commitIfChanged()}
                useAlpha={this.useAlpha}
                label={this.getAttribute("label") ?? undefined}
                tooltip={this.getAttribute("tooltip") ?? undefined}
                position={(this.getAttribute("position") ?? "top") as "top" | "bottom" | "left" | "right"}
                asPopoverButton={!booleanAttribute(this, "inline")}
                showColourSwatches={!booleanAttribute(this, "hide-swatches")}
                ariaLabel={this.getAttribute("aria-label") ?? this.getAttribute("label") ?? undefined}
            />
        );
    }
}

/** Attributes of `<moorhen-colour-picker>`, for declaring it in JSX. */
export interface MoorhenColourPickerElementAttributes extends React.HTMLAttributes<HTMLElement> {
    /** Starting colour: `#rgb`, `#rrggbb` or `#rrggbbaa`. */
    value?: string;
    label?: string;
    tooltip?: string;
    position?: "top" | "bottom" | "left" | "right";
    "use-alpha"?: boolean;
    inline?: boolean;
    "hide-swatches"?: boolean;
}
