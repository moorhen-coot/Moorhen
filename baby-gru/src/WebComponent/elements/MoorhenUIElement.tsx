import { createRoot, type Root } from "react-dom/client";
import { Provider, useSelector } from "react-redux";
import React from "react";
import type { MoorhenInstance } from "@/InstanceManager/MoorhenInstance";
import { MoorhenInstanceContext } from "@/InstanceManager/MoorhenInstanceContext";
import type { RootState } from "@/store";
import type { MoorhenWebComponent } from "../MoorhenWebComponent";

/** Makes the element sit inline like a native control; global.css gives `:host` `display: block`. */
const ELEMENT_CSS = ":host { display: inline-block; vertical-align: middle; }";
let elementSheet: CSSStyleSheet | null = null;
const getElementSheet = () => {
    if (!elementSheet) {
        elementSheet = new CSSStyleSheet();
        elementSheet.replaceSync(ELEMENT_CSS);
    }
    return elementSheet;
};

/** The `<moorhen-web-component>` this element is in: an ancestor, also across shadow roots. */
const findMoorhenHost = (element: Element): MoorhenWebComponent | null => {
    let node: Element | null = element;
    while (node) {
        const host = node.closest("moorhen-web-component");
        if (host) return host as MoorhenWebComponent;
        const root = node.getRootNode();
        node = root instanceof ShadowRoot ? root.host : null;
    }
    return null;
};

/** Follows the app's theme from the store, so the element's own shadow root gets the same colours. */
const Themed = (props: { children: React.ReactNode }) => {
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    return (
        <div data-theme={isDark ? "dark" : "light"} style={{ display: "contents" }}>
            {props.children}
        </div>
    );
};

/**
 * Base class of the Moorhen UI elements (`<moorhen-button>`, …), which render Moorhen React
 * components for content placed inside a `<moorhen-web-component>` (typically slotted plugin content).
 *
 * Each element is its own React root, compiled into the same bundle as the web component. It finds
 * the enclosing `<moorhen-web-component>`, waits for its instance, and provides that instance's
 * store and `MoorhenInstanceContext`, so the component reads and changes the app's live state exactly
 * as it would inside the app. It renders in its own shadow root with the host's Moorhen stylesheet.
 *
 * Subclasses list their attributes in `static observedAttributes`, their JavaScript properties in
 * `static upgradedProperties`, and implement `renderComponent`. Controls with a value keep it on the
 * element (the component is rendered controlled), call `requestRender` when it changes, and fire
 * `change` for user changes, like native inputs.
 */
export abstract class MoorhenUIElement extends HTMLElement {
    private _root: Root | null = null;
    private _instance: MoorhenInstance | null = null;
    private _connection = 0;

    /**
     * Properties with accessors on the subclass. A value assigned before the element was defined (a
     * framework rendering ahead of `registerMoorhenWebComponent`) sits on the instance and would hide
     * the accessor, so it is moved onto it on connection.
     */
    static upgradedProperties: readonly string[] = [];

    /** Renders the component from the element's current attributes and state. */
    protected abstract renderComponent(): React.ReactNode;

    /**
     * Calls `callback` when the user is done with an interaction that started on this element: the
     * pointer released (anywhere, as drags end outside the element), a key released, or focus leaving.
     * It runs on the next tick, after the `click` that follows a pointer release.
     */
    protected onUserRelease(callback: () => void) {
        const later = () => setTimeout(callback, 0);
        this.addEventListener("pointerdown", () => window.addEventListener("pointerup", later, { once: true, capture: true }));
        this.addEventListener("keyup", later);
        this.addEventListener("focusout", later);
    }

    private upgradeProperties() {
        const properties = (this.constructor as typeof MoorhenUIElement).upgradedProperties;
        for (const property of properties) {
            if (Object.prototype.hasOwnProperty.call(this, property)) {
                const value = (this as Record<string, unknown>)[property];
                delete (this as Record<string, unknown>)[property];
                (this as Record<string, unknown>)[property] = value;
            }
        }
    }

    public async connectedCallback() {
        this.upgradeProperties();
        const connection = ++this._connection;
        const host = findMoorhenHost(this);
        if (!host) {
            console.error(`<${this.localName}> must be placed inside a <moorhen-web-component>.`);
            return;
        }
        const instance = await host.getMoorhenInstance();
        // Removed (or moved and reconnected) while waiting
        if (connection !== this._connection || !this.isConnected) return;

        const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" });
        const sheet = host.moorhenStyleSheet;
        if (sheet instanceof CSSStyleSheet) {
            shadow.adoptedStyleSheets = [sheet, getElementSheet()];
        } else if (typeof sheet === "string" && !shadow.querySelector("style")) {
            const style = document.createElement("style");
            style.textContent = sheet + "\n" + ELEMENT_CSS;
            shadow.appendChild(style);
        }

        const container = document.createElement("div");
        container.style.display = "contents";
        shadow.appendChild(container);

        this._instance = instance;
        this._root = createRoot(container);
        this.requestRender();
    }

    public disconnectedCallback() {
        this._connection++;
        const root = this._root;
        this._root = null;
        this._instance = null;
        if (root) {
            // Unmounting synchronously inside a React commit warns; defer it
            queueMicrotask(() => root.unmount());
            this.shadowRoot?.querySelectorAll(":scope > div").forEach(div => div.remove());
        }
    }

    public attributeChangedCallback() {
        this.requestRender();
    }

    /** Re-renders the component; does nothing until the element is connected to a ready Moorhen. */
    protected requestRender() {
        if (!this._root || !this._instance) return;
        this._root.render(
            <Provider store={this._instance.store}>
                <MoorhenInstanceContext.Provider value={{ instance: this._instance }}>
                    <Themed>{this.renderComponent()}</Themed>
                </MoorhenInstanceContext.Provider>
            </Provider>
        );
    }
}

/** Reads a boolean attribute the HTML way: present means true, except an explicit "false". */
export const booleanAttribute = (element: HTMLElement, name: string): boolean => {
    const value = element.getAttribute(name);
    return value !== null && value !== "false";
};

/** Reads a number attribute; `undefined` when absent or not a number. */
export const numberAttribute = (element: HTMLElement, name: string): number | undefined => {
    const value = element.getAttribute(name);
    if (value === null || value.trim() === "") return undefined;
    const number = Number(value);
    return Number.isNaN(number) ? undefined : number;
};
