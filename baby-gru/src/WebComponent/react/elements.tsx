import { createElement, forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import type React from "react";
import type { MoorhenSVG } from "../../components/icons";
import type { MoorhenMap } from "../../utils/MoorhenMap";
import type { MoorhenMolecule } from "../../utils/MoorhenMolecule";
// Types only: the elements themselves are defined by the web component's bundle
import type {
    MoorhenButtonElement,
    MoorhenChainSelectElement,
    MoorhenColourPickerElement,
    MoorhenInfoCardElement,
    MoorhenMapSelectElement,
    MoorhenMoleculeSelectElement,
    MoorhenNumberInputElement,
    MoorhenSliderElement,
    MoorhenToggleElement,
} from "../elements";

/** What every wrapper accepts besides its own props, passed to the element as for a `<div>`. */
type CommonProps = {
    /** The id of the `<moorhen-web-component>` to work with, when the component is not inside it. */
    moorhen?: string;
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    slot?: string;
    title?: string;
    children?: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLElement>;
} & { [ariaOrData: `aria-${string}` | `data-${string}`]: string | number | boolean | undefined };

type EventSpec<E> = Record<string, { event: "change" | "input"; read: (element: E) => unknown }>;

const PASS_THROUGH = new Set(["id", "className", "style", "slot", "title", "onClick", "children"]);

/** `decimalPlaces` → `decimal-places`, the elements' attribute names. */
const toAttributeName = (prop: string) => prop.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

/**
 * A React component rendering a Moorhen UI element: properties set as element properties (only when
 * they change, so the user's own changes are not overwritten on each render), events turned into
 * callbacks receiving the new value, everything else as attributes. Works the same in React 18 and 19.
 */
function wrap<E extends HTMLElement, P extends object>(tag: string, displayName: string, spec: { properties?: string[]; events?: EventSpec<E> }) {
    const properties = spec.properties ?? [];
    const events = spec.events ?? {};

    const Component = forwardRef<E, P & CommonProps>((props, forwardedRef) => {
        const ref = useRef<E>(null);
        useImperativeHandle(forwardedRef, () => ref.current as E, []);

        const attributes: Record<string, unknown> = { ref };
        const propertyValues: Record<string, unknown> = {};
        const handlers: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(props)) {
            if (key in events) handlers[key] = value;
            else if (properties.includes(key)) propertyValues[key] = value;
            else if (PASS_THROUGH.has(key) || key.startsWith("aria-") || key.startsWith("data-")) attributes[key] = value;
            else if (typeof value === "boolean") attributes[toAttributeName(key)] = value ? "" : undefined;
            else if (value !== undefined && value !== null) attributes[toAttributeName(key)] = String(value);
        }

        // Properties: set those that changed since last applied
        const applied = useRef<Record<string, unknown>>({});
        useLayoutEffect(() => {
            const element = ref.current as unknown as Record<string, unknown> | null;
            if (!element) return;
            for (const key of properties) {
                const value = propertyValues[key];
                if (value !== undefined && !Object.is(value, applied.current[key])) {
                    element[key] = value;
                    applied.current[key] = value;
                }
            }
        });

        // Events: listen once, always calling the latest callback
        const latest = useRef(handlers);
        useLayoutEffect(() => {
            latest.current = handlers;
        });
        useEffect(() => {
            const element = ref.current;
            if (!element) return;
            const listeners = Object.entries(events).map(([prop, { event, read }]) => {
                const listener = () => (latest.current[prop] as ((value: unknown, element: E) => void) | undefined)?.(read(element), element);
                element.addEventListener(event, listener);
                return () => element.removeEventListener(event, listener);
            });
            return () => listeners.forEach(remove => remove());
        }, []);

        return createElement(tag, attributes, props.children);
    });
    Component.displayName = displayName;
    return Component;
}

// ---------------------------------------------------------------------------------------------

/** Callback of a wrapper's `onChange` / `onInput`: the new value, and the element. */
export type MoorhenValueHandler<T, E> = (value: T, element: E) => void;

export type MoorhenButtonProps = {
    label?: string;
    icon?: MoorhenSVG;
    type?: "default" | "icon-only" | "toggle";
    size?: "small" | "medium" | "large";
    variant?: "primary" | "secondary" | "danger" | "white" | "outlined" | "light" | "default";
    tooltip?: string;
    tooltipPlacement?: "top" | "bottom" | "left" | "right";
    disabledTooltip?: string;
    disabled?: boolean;
    checked?: boolean;
};

/** Moorhen's button. Use `onClick`. */
export const MoorhenButton = wrap<MoorhenButtonElement, MoorhenButtonProps>("moorhen-button", "MoorhenButton", {});

export type MoorhenToggleProps = {
    /** The label; otherwise the children. */
    label?: string;
    type?: "switch" | "checkbox" | "radio";
    disabled?: boolean;
    checked?: boolean;
    onChange?: MoorhenValueHandler<boolean, MoorhenToggleElement>;
};

/** Moorhen's switch, checkbox or radio. `onChange` receives `checked`. */
export const MoorhenToggle = wrap<MoorhenToggleElement, MoorhenToggleProps>("moorhen-toggle", "MoorhenToggle", {
    properties: ["checked"],
    events: { onChange: { event: "change", read: element => element.checked } },
});

export type MoorhenNumberInputProps = {
    value?: number | null;
    min?: number;
    max?: number;
    label?: string;
    labelPosition?: "left" | "top";
    decimalDigits?: number;
    width?: string;
    /** Step of the arrow buttons. */
    step?: number;
    tooltip?: string;
    integer?: boolean;
    showButtons?: boolean;
    /** The value only changes on Enter or when leaving the field. */
    waitReturn?: boolean;
    disabled?: boolean;
    /** Once committed: Enter, leaving the field, an arrow button released. */
    onChange?: MoorhenValueHandler<number | null, MoorhenNumberInputElement>;
    /** On each valid value while typing, and each arrow step. */
    onInput?: MoorhenValueHandler<number | null, MoorhenNumberInputElement>;
};

/** Moorhen's number field. */
export const MoorhenNumberInput = wrap<MoorhenNumberInputElement, MoorhenNumberInputProps>("moorhen-number-input", "MoorhenNumberInput", {
    properties: ["value"],
    events: {
        onChange: { event: "change", read: element => element.value },
        onInput: { event: "input", read: element => element.value },
    },
});

export type MoorhenSliderProps = {
    value?: number;
    /** The second thumb, with `type="range"`. */
    value2?: number;
    min?: number;
    max?: number;
    step?: number;
    type?: "default" | "range";
    scale?: "linear" | "log" | "asinh";
    label?: string;
    unit?: string;
    decimalPlaces?: number;
    colour?: string;
    disabled?: boolean;
    showTicks?: boolean;
    preciseInput?: boolean;
    hideButtons?: boolean;
    hideLabels?: boolean;
    hideValue?: boolean;
    labels?: { value: number; label: string; tick?: boolean; colour?: string }[];
    allowedValues?: number[];
    /** Once the user lets go. For a range, read `element.value2` too. */
    onChange?: MoorhenValueHandler<number, MoorhenSliderElement>;
    /** While the user drags or steps. */
    onInput?: MoorhenValueHandler<number, MoorhenSliderElement>;
};

/** Moorhen's slider. */
export const MoorhenSlider = wrap<MoorhenSliderElement, MoorhenSliderProps>("moorhen-slider", "MoorhenSlider", {
    properties: ["value", "value2", "labels", "allowedValues"],
    events: {
        onChange: { event: "change", read: element => element.value },
        onInput: { event: "input", read: element => element.value },
    },
});

export type MoorhenColourPickerProps = {
    /** `#rrggbb`, or `#rrggbbaa` with `useAlpha`. */
    value?: string;
    label?: string;
    tooltip?: string;
    position?: "top" | "bottom" | "left" | "right";
    useAlpha?: boolean;
    /** The picker itself instead of a swatch opening it. */
    inline?: boolean;
    hideSwatches?: boolean;
    /** Once done: the picker closed. */
    onChange?: MoorhenValueHandler<string, MoorhenColourPickerElement>;
    /** While picking. */
    onInput?: MoorhenValueHandler<string, MoorhenColourPickerElement>;
};

/** Moorhen's colour picker. */
export const MoorhenColourPicker = wrap<MoorhenColourPickerElement, MoorhenColourPickerProps>("moorhen-colour-picker", "MoorhenColourPicker", {
    properties: ["value"],
    events: {
        onChange: { event: "change", read: element => element.value },
        onInput: { event: "input", read: element => element.value },
    },
});

export type MoorhenMoleculeSelectProps = {
    /** A molecule's unique id; `null` for "Any molecule". */
    value?: string | null;
    /** With `multiple`: the selected unique ids. */
    values?: string[];
    label?: string;
    allowAny?: boolean;
    /** Checkboxes for any number of molecules. */
    multiple?: boolean;
    disabled?: boolean;
    filter?: (molecule: MoorhenMolecule) => boolean;
    /** The unique id picked (`null` for "Any molecule"), or the list of them with `multiple`. */
    onChange?: MoorhenValueHandler<string | null | undefined | string[], MoorhenMoleculeSelectElement>;
};

/** Moorhen's molecule dropdown, or checkbox list with `multiple`. */
export const MoorhenMoleculeSelect = wrap<MoorhenMoleculeSelectElement, MoorhenMoleculeSelectProps>("moorhen-molecule-select", "MoorhenMoleculeSelect", {
    properties: ["value", "values", "filter"],
    events: { onChange: { event: "change", read: element => (element.hasAttribute("multiple") ? element.values : element.value) } },
});

export type MoorhenChainSelectProps = {
    /** The id of a molecule select whose molecule is followed. */
    for?: string;
    /** The molecule's unique id (without `for`). */
    molecule?: string | null;
    /** A chain id; `null` for "All". */
    value?: string | null;
    /** With `multiple`: the selected chain ids. */
    values?: string[];
    label?: string;
    allowAll?: boolean;
    /** Checkboxes for any number of chains. */
    multiple?: boolean;
    disabled?: boolean;
    /** gemmi polymer types: 1 PeptideL, 2 PeptideD, 3 DNA, 4 RNA, 5 DNA/RNA hybrid. */
    allowedTypes?: number[];
    /** The chain picked (`null` for "All"), or the list of them with `multiple`. */
    onChange?: MoorhenValueHandler<string | null | undefined | string[], MoorhenChainSelectElement>;
};

/** Moorhen's chain dropdown, or checkbox list with `multiple`. */
export const MoorhenChainSelect = wrap<MoorhenChainSelectElement, MoorhenChainSelectProps>("moorhen-chain-select", "MoorhenChainSelect", {
    properties: ["value", "values", "molecule", "allowedTypes"],
    events: { onChange: { event: "change", read: element => (element.hasAttribute("multiple") ? element.values : element.value) } },
});

export type MoorhenMapSelectProps = {
    /** A map's unique id. */
    value?: string | null;
    label?: string;
    disabled?: boolean;
    filter?: (map: MoorhenMap) => boolean;
    onChange?: MoorhenValueHandler<string | undefined, MoorhenMapSelectElement>;
};

/** Moorhen's map dropdown. */
export const MoorhenMapSelect = wrap<MoorhenMapSelectElement, MoorhenMapSelectProps>("moorhen-map-select", "MoorhenMapSelect", {
    properties: ["value", "filter"],
    events: { onChange: { event: "change", read: element => element.value } },
});

export type MoorhenInfoCardProps = {
    /** Plain text; otherwise the children, which can be rich. */
    info?: string;
    placement?: "top" | "bottom" | "left" | "right";
    width?: string;
    large?: boolean;
};

/** Moorhen's info button, opening a card with help. */
export const MoorhenInfoCard = wrap<MoorhenInfoCardElement, MoorhenInfoCardProps>("moorhen-info-card", "MoorhenInfoCard", {});
