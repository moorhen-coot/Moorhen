import { configureStore } from "@reduxjs/toolkit";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import React from "react";
import {
    MoorhenContainer,
    MoorhenInstance,
    MoorhenMolecule,
    //addMap,
    //setActiveMap,
    //MoorhenMap,
    addMolecule,
} from "../moorhen";
import { reducers } from "../store/MoorhenReduxStore";

export class MoorhenWebComponent extends HTMLElement {
    public moorhenInstanceRef: React.RefObject<null | MoorhenInstance>;
    public setMoorhenDimensions: null | (() => [number, number]);
    public width: number | string;
    public height: number | string;

    static get observedAttributes() {
        return ["width", "height", "pdb-id"];
    }
    constructor() {
        super();
        this.moorhenInstanceRef = null;
        this.width = this.getAttribute("width") || 800;
        this.height = this.getAttribute("height") || this.width;
        this.setMoorhenDimensions = () => [+this.width, +this.height];
    }

    public connectedCallback() {
        // shadow context
        const shadow = this.attachShadow({ mode: "open" });
        const rootElement = document.createElement("div");
        shadow.appendChild(rootElement);

        fetch(new URL("baby-gru/moorhen.css", window.location.href).href)
            .then(res => res.text())
            .then(cssText => {
                if ("adoptedStyleSheets" in shadow) {
                    const sheet = new CSSStyleSheet();
                    sheet.replaceSync(cssText);
                    shadow.adoptedStyleSheets = [sheet];
                } else {
                    const style = document.createElement("style");
                    style.textContent = cssText;
                    (shadow as ShadowRoot).appendChild(style);
                }
            });

        const MoorhenReduxStore = configureStore({
            reducer: reducers,
            middleware: getDefaultMiddleware =>
                getDefaultMiddleware({
                    serializableCheck: false,
                }),
        });

        const MyContext = React.createContext(null);
        const root = createRoot(rootElement);
        root.render(
            <div>
                <Provider store={MoorhenReduxStore} context={MyContext}>
                    <MoorhenContainer moorhenInstanceRef={this.moorhenInstanceRef} setMoorhenDimensions={this.setMoorhenDimensions} />
                </Provider>
            </div>
        );
    }
}

customElements.define("moorhen-web-component", MoorhenWebComponent);
