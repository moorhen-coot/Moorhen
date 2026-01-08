import { configureStore } from "@reduxjs/toolkit";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import React, { createContext } from "react";
import type { MoorhenInstance } from "@/InstanceManager";
import { MoorhenProvider } from "@/components/MoorhenProvider";
import { MoorhenContainer } from "@/components/container";
import { MoorhenMenuSystem } from "../components/menu-system/MenuSystem";
import { reducers } from "../store/MoorhenReduxStore";

export class MoorhenWebComponent extends HTMLElement {
    public moorhenInstanceRef: React.RefObject<MoorhenInstance>;
    public moorhenInstance: MoorhenInstance;
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
        this.width = this.getAttribute("width") || 1;
        this.height = this.getAttribute("height") || this.width;
        this.setMoorhenDimensions = this.width !== 1 ? () => [+this.width, +this.height] : null;
        this.urlPrefix = this.getAttribute("url-prefix") || "MoorhenAssets";
    }

    public connectedCallback() {
        // shadow context
        const shadow = this.attachShadow({ mode: "open" });
        const rootElement = document.createElement("div");
        //this.appendChild(rootElement);
        shadow.appendChild(rootElement);

        const loadStylesheets = async () => {
            const moorhenRes = await fetch(new URL(`${this.urlPrefix}/moorhen.css`, window.location.href).href);

            const moorhenCss = await moorhenRes.text();

            if ("adoptedStyleSheets" in shadow) {
                const moorhenSheet = new CSSStyleSheet();
                moorhenSheet.replaceSync(moorhenCss);
                shadow.adoptedStyleSheets = [moorhenSheet];
            } else {
                const moorhenStyle = document.createElement("style");
                moorhenStyle.textContent = moorhenCss;
                (shadow as ShadowRoot).appendChild(moorhenStyle);
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
                    <MoorhenProvider>
                        <MoorhenContainer
                            moorhenInstanceRef={this.moorhenInstanceRef}
                            setMoorhenDimensions={this.setMoorhenDimensions}
                            urlPrefix={this.urlPrefix}
                        />
                    </MoorhenProvider>
                </Provider>
            </div>
        );

        const checkRefsReady = () => {
            if (this.moorhenInstanceRef?.current && this.moorhenInstanceRef?.current.getMenuSystem()) {
                clearInterval(refCheckInterval);
                this.moorhenInstance = this.moorhenInstanceRef.current;
                this.onInnit();
            }
        };
        const refCheckInterval = setInterval(checkRefsReady, 50);
    }
}

if (!customElements.get("moorhen-web-component")) {
    customElements.define("moorhen-web-component", MoorhenWebComponent);
}
