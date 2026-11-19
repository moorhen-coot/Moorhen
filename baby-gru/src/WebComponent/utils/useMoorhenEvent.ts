import { useEffect, useRef } from "react";

/**
 * For use with Moorhen's UI elements (`<moorhen-toggle>`, `<moorhen-slider>`, …) in React 18.
 *
 * React 18 does not pass `onChange` / `onInput` to custom elements: this listens to the element's
 * `change` or `input` event through a ref, always calling the latest handler. React 19 does not need
 * it: there, `onChange` and `onInput` work on the elements directly.
 *
 * @param ref - A ref to the element.
 * @param type - `"change"` (the user made a change) or `"input"` (while they are changing it).
 * @param handler - Called with the element, to read its `value`, `values` or `checked`.
 * @example
 * const axesRef = useRef<MoorhenToggleElement>(null);
 * useMoorhenEvent(axesRef, "change", toggle => instance?.sceneSettings.setDrawAxes(toggle.checked));
 * return <moorhen-toggle ref={axesRef} checked={drawAxes}>Axes</moorhen-toggle>;
 */
export const useMoorhenEvent = <E extends HTMLElement>(
    ref: React.RefObject<E | null>,
    type: "change" | "input",
    handler: (element: E) => void
) => {
    const latest = useRef(handler);
    useEffect(() => {
        latest.current = handler;
    });
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const listener = () => latest.current(element);
        element.addEventListener(type, listener);
        return () => element.removeEventListener(type, listener);
    }, [ref, type]);
};
