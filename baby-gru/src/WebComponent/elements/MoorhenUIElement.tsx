import { createRoot, type Root } from "react-dom/client";
import { Provider, useSelector } from "react-redux";
import React from "react";
import type { MoorhenInstance } from "@/InstanceManager/MoorhenInstance";
import { MoorhenInstanceContext } from "@/InstanceManager/MoorhenInstanceContext";
import type { RootState } from "@/store";
import { waitForMoorhenHost } from "../findMoorhenHost";

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

/**
 * Follows the app's theme from the store, so the element's own shadow root gets the same colours.
 * Also gives text the app's font and colour, as Moorhen's main container does: the base stylesheet
 * resets the element (`:host { all: initial }`), which would leave the browser's default font.
 */
const Themed = (props: { children: React.ReactNode }) => {
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    return (
        <div
            data-theme={isDark ? "dark" : "light"}
            style={{ display: "contents", fontFamily: "var(--moorhen-font-family)", color: "var(--moorhen-primary)" }}
        >
            {props.children}
        </div>
    );
};

/**
 * Base class of the Moorhen UI elements (`<moorhen-button>`, …), which render Moorhen React
 * components for content placed inside a `<moorhen-web-component>` (typically slotted plugin content).
 *
 * Each element is its own React root, compiled into the same bundle as the web component. It finds
 * its `<moorhen-web-component>` — the one whose id is in its `moorhen` attribute, else the one it is
 * in (slotted content), else the only one in the page — waits for its instance, and provides that instance's
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
        const host = await waitForMoorhenHost(this, this.getAttribute("moorhen"));
        if (connection !== this._connection || !this.isConnected) return;
        if (!host) {
            console.error(
                `<${this.localName}>: no <moorhen-web-component> found. Place it inside one, give the id of one in its ` +
                    `\`moorhen\` attribute, or have a single one in the page.`
            );
            return;
        }
        const instance = await host.getMoorhenInstance();
        // Removed (or moved and reconnected) while waiting
        if (connection !== this._connection || !this.isConnected) return;

        let shadow = this.shadowRoot;
        if (!shadow) {
            shadow = this.attachShadow({ mode: "open" });
            // Native `input` events cross the shadow boundary: keep the inner fields' own events in,
            // so the page only hears the element's `input` (with its value). React's handlers, below
            // the shadow root, still get them.
            shadow.addEventListener("input", event => event.stopPropagation());
        }
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

    public attributeChangedCallback(name?: string, oldValue?: string | null, newValue?: string | null) {
        if (name !== undefined && oldValue !== newValue) this.attributeValueChanged(name);
        this.requestRender();
    }

    /**
     * An attribute changed. Elements with a value use it so that a changed `value` / `checked`
     * attribute becomes the current value: a framework rendering `<moorhen-toggle checked={on}>` drives
     * the element. An attribute that does not change (a re-render with the same value) does nothing,
     * so the user's own changes are kept until then.
     */
    protected attributeValueChanged(_name: string) {}

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
