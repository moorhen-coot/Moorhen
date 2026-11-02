import { MoorhenButtonElement } from "./MoorhenButtonElement";
import { MoorhenChainSelectElement } from "./MoorhenChainSelectElement";
import { MoorhenColourPickerElement } from "./MoorhenColourPickerElement";
import { MoorhenInfoCardElement } from "./MoorhenInfoCardElement";
import { MoorhenMapSelectElement } from "./MoorhenMapSelectElement";
import { MoorhenMoleculeSelectElement } from "./MoorhenMoleculeSelectElement";
import { MoorhenSliderElement } from "./MoorhenSliderElement";
import { MoorhenToggleElement } from "./MoorhenToggleElement";

export { MoorhenUIElement } from "./MoorhenUIElement";
export { MoorhenButtonElement } from "./MoorhenButtonElement";
export type { MoorhenButtonElementAttributes } from "./MoorhenButtonElement";
export { MoorhenToggleElement } from "./MoorhenToggleElement";
export type { MoorhenToggleElementAttributes } from "./MoorhenToggleElement";
export { MoorhenMoleculeSelectElement } from "./MoorhenMoleculeSelectElement";
export type { MoorhenMoleculeSelectElementAttributes } from "./MoorhenMoleculeSelectElement";
export { MoorhenMapSelectElement } from "./MoorhenMapSelectElement";
export type { MoorhenMapSelectElementAttributes } from "./MoorhenMapSelectElement";
export { MoorhenChainSelectElement } from "./MoorhenChainSelectElement";
export type { MoorhenChainSelectElementAttributes } from "./MoorhenChainSelectElement";
export { MoorhenSliderElement } from "./MoorhenSliderElement";
export type { MoorhenSliderElementAttributes } from "./MoorhenSliderElement";
export { MoorhenColourPickerElement } from "./MoorhenColourPickerElement";
export type { MoorhenColourPickerElementAttributes } from "./MoorhenColourPickerElement";
export { MoorhenInfoCardElement } from "./MoorhenInfoCardElement";
export type { MoorhenInfoCardElementAttributes } from "./MoorhenInfoCardElement";

const elements: Record<string, CustomElementConstructor> = {
    "moorhen-button": MoorhenButtonElement,
    "moorhen-toggle": MoorhenToggleElement,
    "moorhen-molecule-select": MoorhenMoleculeSelectElement,
    "moorhen-map-select": MoorhenMapSelectElement,
    "moorhen-chain-select": MoorhenChainSelectElement,
    "moorhen-slider": MoorhenSliderElement,
    "moorhen-colour-picker": MoorhenColourPickerElement,
    "moorhen-info-card": MoorhenInfoCardElement,
};

/** Defines the Moorhen UI elements (`<moorhen-button>`, …). Called by `registerMoorhenWebComponent`. */
export const registerMoorhenUIElements = () => {
    Object.entries(elements).forEach(([tag, element]) => {
        if (!customElements.get(tag)) customElements.define(tag, element);
    });
};
