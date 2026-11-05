import type { MoorhenWebComponent } from "./MoorhenWebComponent";

/**
 * The `<moorhen-web-component>` an element of the page works with:
 *  1. the one whose id is given (the `moorhen` attribute of Moorhen's UI elements),
 *  2. else the one the element is in (slotted content), also across shadow roots,
 *  3. else the only one in the page.
 * `null` when there is none, or several and nothing says which.
 */
export const findMoorhenHost = (element: Element, id?: string | null): MoorhenWebComponent | null => {
    if (id) {
        const root = element.getRootNode() as Document | ShadowRoot;
        return ((root.getElementById?.(id) ?? document.getElementById(id)) as MoorhenWebComponent | null) ?? null;
    }
    let node: Element | null = element;
    while (node) {
        const host = node.closest("moorhen-web-component");
        if (host) return host as MoorhenWebComponent;
        const root = node.getRootNode();
        node = root instanceof ShadowRoot ? root.host : null;
    }
    const all = document.querySelectorAll("moorhen-web-component");
    return all.length === 1 ? (all[0] as MoorhenWebComponent) : null;
};

/**
 * As {@link findMoorhenHost}, waiting for the page to be parsed when needed (an element placed before
 * its web component in the HTML), and for `<moorhen-web-component>` to be defined.
 */
export const waitForMoorhenHost = async (element: Element, id?: string | null): Promise<MoorhenWebComponent | null> => {
    let host = findMoorhenHost(element, id);
    if (!host && document.readyState === "loading") {
        await new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
        host = findMoorhenHost(element, id);
    }
    if (host) await customElements.whenDefined("moorhen-web-component");
    return host;
};
