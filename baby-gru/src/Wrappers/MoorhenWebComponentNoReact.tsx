import { configureStore } from "@reduxjs/toolkit";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import React, { createContext } from "react";
import { MoorhenMenuSystem } from "../components/menu-system/MenuSystem";
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

export class MoorhenWebComponentNoReact extends HTMLElement {
    public moorhenInstanceRef: React.RefObject<null | MoorhenInstance>;
    public moorhenMenuSystemRef: React.RefObject<null | MoorhenMenuSystem>;
    public setMoorhenDimensions: null | (() => [number, number]);
    public width: number | string;
    public height: number | string;
    public urlPrefix: string;
    public onInnit: () => void;

    static get observedAttributes() {
        return ["width", "height", "url-prefix"];
    }
    constructor() {
        super();
        this.moorhenInstanceRef = React.createRef<null | MoorhenInstance>();
        this.moorhenMenuSystemRef = React.createRef<null | MoorhenMenuSystem>();
        this.width = this.getAttribute("width") || 800;
        this.height = this.getAttribute("height") || this.width;
        this.setMoorhenDimensions = () => [+this.width, +this.height];
        this.urlPrefix = this.getAttribute("url-prefix") || "";
    }

    public connectedCallback() {
        // shadow context
        const shadow = this.attachShadow({ mode: "open" });
        const rootElement = document.createElement("div");
        shadow.appendChild(rootElement);

        const loadStylesheets = async () => {
            const [moorhenRes, flatlyRes] = await Promise.all([
                fetch(new URL(`${this.urlPrefix}/moorhen.css`, window.location.href).href),
                fetch(new URL(`${this.urlPrefix}/flatly.css`, window.location.href).href),
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

        const MoorhenReduxStore = configureStore({
            reducer: reducers,
            middleware: getDefaultMiddleware =>
                getDefaultMiddleware({
                    serializableCheck: false,
                }),
        });

        const root = createRoot(rootElement);
        root.render(
            <div>
                <Provider store={MoorhenReduxStore}>
                    <MoorhenContainer
                        moorhenInstanceRef={this.moorhenInstanceRef}
                        moorhenMenuSystemRef={this.moorhenMenuSystemRef}
                        setMoorhenDimensions={this.setMoorhenDimensions}
                        urlPrefix={this.urlPrefix}
                    />
                </Provider>
            </div>
        );

        const checkRefsReady = () => {
            if (this.moorhenInstanceRef?.current && this.moorhenMenuSystemRef?.current) {
                clearInterval(refCheckInterval);
                this.onInnit();
            }
        };
        const refCheckInterval = setInterval(checkRefsReady, 50);
    }
}

if (!customElements.get("moorhen-web-component")) {
    customElements.define("moorhen-web-component", MoorhenWebComponentNoReact);
}
