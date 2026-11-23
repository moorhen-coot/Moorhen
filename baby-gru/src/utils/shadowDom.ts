/*
 * Helpers for code that must also work inside the Moorhen web component, where the app is rendered in a shadow
 * root. There, document-level lookups do not see Moorhen's elements: document.getElementById returns null, and
 * document.activeElement / event.target at document level are retargeted to the <moorhen-web-component> host.
 * Prefer React refs for elements a component renders itself.
 */

/** The element that really has focus, looking through open shadow roots (document.activeElement stops at the host) */
export const getDeepActiveElement = (): Element | null => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) {
        active = active.shadowRoot.activeElement;
    }
    return active;
};

/** The element an event really started on, through shadow roots (event.target is retargeted at document level) */
export const getEventOrigin = (event: Event): EventTarget | null => {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    return path.length > 0 ? path[0] : event.target;
};
