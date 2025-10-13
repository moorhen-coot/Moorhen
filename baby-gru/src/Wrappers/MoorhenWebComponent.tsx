import { configureStore } from "@reduxjs/toolkit";
// import { createRoot } from "react-dom/client";
//import { Provider } from "react-redux";
// import React, { createContext } from "react";
import {
    MoorhenContainer,
    MoorhenInstance,
    MoorhenMolecule,
    //addMap,
    //setActiveMap,
    //MoorhenMap,
    addMolecule,
} from "../moorhen";
import { MoorhenReduxStoreType, reducers } from "../store/MoorhenReduxStore";

declare global {
    interface Window {
        React: any;
        ReactDOM: any;
        ReactRedux: any;
    }
}

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
        const React = window.React;
        const ReactDOM = window.ReactDOM;
        const { Provider } = window.ReactRedux;

        if (!React || !ReactDOM) {
            console.error("React and ReactDOM must be available globally");
            return;
        }

        // shadow context
        const shadow = this.attachShadow({ mode: "open" });
        const rootElement = document.createElement("div");
        shadow.appendChild(rootElement);

        const loadStylesheets = async () => {
            const [moorhenRes, flatlyRes] = await Promise.all([
                fetch(new URL("baby-gru/moorhen.css", window.location.href).href),
                fetch(new URL("baby-gru/flatly.css", window.location.href).href),
            ]);

            const [moorhenCss, flatlyCss] = await Promise.all([moorhenRes.text(), flatlyRes.text()]);

            if ("adoptedStyleSheets" in shadow) {
                const moorhenSheet = new CSSStyleSheet();
                const flatlySheet = new CSSStyleSheet();
                moorhenSheet.replaceSync(moorhenCss);
                flatlySheet.replaceSync(flatlyCss);
                shadow.adoptedStyleSheets = [moorhenSheet, flatlySheet];
            } else {
                const moorhenStyle = document.createElement("style");
                const flatlyStyle = document.createElement("style");
                moorhenStyle.textContent = moorhenCss;
                flatlyStyle.textContent = flatlyCss;
                (shadow as ShadowRoot).appendChild(moorhenStyle);
                (shadow as ShadowRoot).appendChild(flatlyStyle);
            }
        };
        loadStylesheets();

        // Load both stylesheets concurrently and ensure they coexist
        const MoorhenReduxStore = configureStore({
            reducer: reducers,
            middleware: getDefaultMiddleware =>
                getDefaultMiddleware({
                    serializableCheck: false,
                }),
        });

        const root = ReactDOM.createRoot(rootElement);
        root.render(
            React.createElement(
                "div",
                {},
                React.createElement(
                    Provider,
                    { store: MoorhenReduxStore },
                    React.createElement(MoorhenContainer, {
                        moorhenInstanceRef: this.moorhenInstanceRef,
                        setMoorhenDimensions: this.setMoorhenDimensions,
                    })
                )
            )
        );
    }
}

customElements.define("moorhen-web-component", MoorhenWebComponent);
