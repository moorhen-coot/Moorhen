import React from "react";
import type { MoorhenSVG } from "@/components/icons";
import { MoorhenButton } from "@/components/inputs/MoorhenButton/MoorhenButton";
import { booleanAttribute, MoorhenUIElement } from "./MoorhenUIElement";

type ButtonProps = React.ComponentProps<typeof MoorhenButton>;

/**
 * `<moorhen-button>`: Moorhen's button for content placed inside `<moorhen-web-component>`.
 *
 * Attributes: `label`, `icon`, `type` ("default" | "icon-only" | "toggle"), `size`, `variant`,
 * `tooltip`, `tooltip-placement`, `disabled-tooltip`, `aria-label`, and the boolean `disabled` and
 * `checked` (for `type="toggle"`). Child content is shown inside the button, after the label.
 * Listen to the native `click` event; a disabled button does not fire it.
 *
 * @example
 * <moorhen-button icon="MatSymAdd" tooltip="Add a thing">Add</moorhen-button>
 */
export class MoorhenButtonElement extends MoorhenUIElement {
    static observedAttributes = [
        "label",
        "icon",
        "type",
        "size",
        "variant",
        "tooltip",
        "tooltip-placement",
        "disabled-tooltip",
        "aria-label",
        "disabled",
        "checked",
    ];

    protected renderComponent() {
        const attribute = (name: string) => this.getAttribute(name) ?? undefined;
        const props = {
            type: attribute("type") ?? "default",
            label: attribute("label"),
            icon: attribute("icon") as MoorhenSVG | undefined,
            size: attribute("size"),
            variant: attribute("variant"),
            tooltip: attribute("tooltip"),
            tooltipPlacement: attribute("tooltip-placement"),
            disabledTooltip: attribute("disabled-tooltip"),
            ariaLabel: attribute("aria-label"),
            disabled: booleanAttribute(this, "disabled"),
            checked: booleanAttribute(this, "checked"),
        } as ButtonProps;
        return (
            <MoorhenButton {...props}>
                <slot />
            </MoorhenButton>
        );
    }
}

/** Attributes of `<moorhen-button>`, for declaring it in JSX. */
export interface MoorhenButtonElementAttributes extends React.HTMLAttributes<HTMLElement> {
    label?: string;
    icon?: MoorhenSVG;
    type?: "default" | "icon-only" | "toggle";
    size?: "small" | "medium" | "large";
    variant?: "primary" | "secondary" | "danger" | "white" | "outlined" | "light" | "default";
    tooltip?: string;
    "tooltip-placement"?: "top" | "bottom" | "left" | "right";
    "disabled-tooltip"?: string;
    disabled?: boolean;
    checked?: boolean;
}
