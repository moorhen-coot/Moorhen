/**
 * `moorhen/web-component/react`: for React apps that embed `<moorhen-web-component>`.
 *
 * - `<Moorhen>`: `<moorhen-web-component>` as a React component.
 * - React components wrapping Moorhen's UI elements (`<MoorhenToggle checked onChange>`…): React
 *   props, and callbacks receiving the new value. They render the custom elements, which
 *   `registerMoorhenWebComponent()` defines, and work the same with React 18 and 19.
 * - Hooks to find Moorhen and follow its state from a React component.
 *
 * This bundle uses the app's own React: its version does not need to match Moorhen's.
 */
export { Moorhen } from "./Moorhen";
export type { MoorhenProps } from "./Moorhen";
export {
    MoorhenButton,
    MoorhenToggle,
    MoorhenNumberInput,
    MoorhenSlider,
    MoorhenColourPicker,
    MoorhenMoleculeSelect,
    MoorhenChainSelect,
    MoorhenMapSelect,
    MoorhenInfoCard,
} from "./elements";
export type {
    MoorhenValueHandler,
    MoorhenButtonProps,
    MoorhenToggleProps,
    MoorhenNumberInputProps,
    MoorhenSliderProps,
    MoorhenColourPickerProps,
    MoorhenMoleculeSelectProps,
    MoorhenChainSelectProps,
    MoorhenMapSelectProps,
    MoorhenInfoCardProps,
} from "./elements";

export { useMoorhenInstance } from "../utils/useMoorhenInstance";
export type { MoorhenTarget } from "../utils/useMoorhenInstance";
export { useMoorhenSelector } from "../utils/webComponentSelector";
export { useMoorhenEvent } from "../utils/useMoorhenEvent";
export { useWebComponentInstanceRef } from "../utils/useWebComponentInstanceRef";
