import { MoorhenButtonElement } from "./MoorhenButtonElement";

export { MoorhenButtonElement } from "./MoorhenButtonElement";
export type { MoorhenButtonElementAttributes } from "./MoorhenButtonElement";

/** Defines the Moorhen UI elements (`<moorhen-button>`, …). Called by `registerMoorhenWebComponent`. */
export const registerMoorhenUIElements = () => {
    if (!customElements.get("moorhen-button")) {
        customElements.define("moorhen-button", MoorhenButtonElement);
    }
};
