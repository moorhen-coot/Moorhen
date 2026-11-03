import React from "react";
import { MoorhenToggle } from "@/components/inputs/MoorhenToggle/Toggle";
import { booleanAttribute, MoorhenUIElement } from "./MoorhenUIElement";

/**
 * `<moorhen-toggle>`: Moorhen's switch / checkbox / radio for content placed inside `<moorhen-web-component>`.
 *
 * Attributes: `label` (otherwise the child content is the label), `type` ("switch" | "checkbox" | "radio"),
 * and the boolean `disabled` and `checked`. As for a native checkbox, the `checked` attribute is the
 * starting state and the `checked` property the current one: once the user or a script has changed
 * it, the attribute no longer applies.
 *
 * Fires `change` (bubbling) when the user flips it; not when a script sets `checked`.
 *
 * @example
 * <moorhen-toggle checked>Show hydrogens</moorhen-toggle>
 * toggle.addEventListener("change", () => console.log(toggle.checked));
 */
export class MoorhenToggleElement extends MoorhenUIElement {
    static observedAttributes = ["label", "type", "disabled", "checked"];
    static upgradedProperties = ["checked"];

    /** Set once the user or a script changed it; until then the attribute decides. */
    private _checked: boolean | null = null;

    protected attributeValueChanged(name: string) {
        if (name === "checked") this._checked = null;
    }

    get checked(): boolean {
        return this._checked ?? booleanAttribute(this, "checked");
    }

    set checked(value: boolean) {
        this._checked = !!value;
        this.requestRender();
    }

    protected renderComponent() {
        const type = (this.getAttribute("type") ?? "switch") as "switch" | "checkbox" | "radio";
        return (
            <MoorhenToggle
                type={type}
                label={this.getAttribute("label") ?? <slot />}
                checked={this.checked}
                disabled={booleanAttribute(this, "disabled")}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    this._checked = event.target.checked;
                    this.requestRender();
                    this.dispatchEvent(new Event("change", { bubbles: true }));
                }}
            />
        );
    }
}

/** Attributes of `<moorhen-toggle>`, for declaring it in JSX. */
export interface MoorhenToggleElementAttributes extends React.HTMLAttributes<MoorhenToggleElement> {
    /** The id of the `<moorhen-web-component>` to work with, when the element is not inside it. */
    moorhen?: string;
    label?: string;
    type?: "switch" | "checkbox" | "radio";
    disabled?: boolean;
    checked?: boolean;
}
