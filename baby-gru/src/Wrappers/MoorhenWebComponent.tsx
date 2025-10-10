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
    MoorhenReduxStore,
    //MoorhenMap,
    addMolecule,
} from "../moorhen";
import { reducers } from "../store/MoorhenReduxStore";

function loadScript(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve(src);
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
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

        const memory64 = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 5, 3, 1, 4, 1]));
        const isChromeLinux = navigator.appVersion.indexOf("Linux") != -1 && navigator.appVersion.indexOf("Chrome") != -1;

        if (memory64 && !isChromeLinux) {
            loadScript("/moorhen64.js")
                .then(src => {
                    console.log(src + " loaded 64-bit successfully.");
                    /* eslint-disable no-undef */
                    createCoot64Module({
                        /* eslint-enable no-undef */
                        print(t) {
                            console.log(["output", t]);
                        },
                        printErr(t) {
                            console.error(["output", t]);
                        },
                    })
                        .then(returnedModule => {
                            /* @ts-expect-error */
                            window.cootModule = returnedModule;
                            /* @ts-expect-error */
                            window.CCP4Module = returnedModule;
                            const cootModuleAttachedEvent = new CustomEvent("cootModuleAttached", {});
                            document.dispatchEvent(cootModuleAttachedEvent);
                        })
                        .catch(e => {
                            console.log(e);
                            console.log("There was a problem creating Coot64Module...");
                        });
                })
                .catch(error => {
                    console.error(error.message);
                    console.log("Trying 32-bit fallback");
                    loadScript("/moorhen.js").then(src => {
                        console.log(src + " loaded 32-bit successfully (fallback).");
                        /* eslint-disable no-undef */
                        createCootModule({
                            /* eslint-enable no-undef */
                            print(t) {
                                console.log(["output", t]);
                            },
                            printErr(t) {
                                console.log(["output", t]);
                            },
                        })
                            .then(returnedModule => {
                                /* @ts-expect-error */
                                window.cootModule = returnedModule;
                                /* @ts-expect-error */
                                window.CCP4Module = returnedModule;
                                const cootModuleAttachedEvent = new CustomEvent("cootModuleAttached", {});
                                document.dispatchEvent(cootModuleAttachedEvent);
                            })
                            .catch(e => {
                                console.log(e);
                            });
                    });
                });
        } else {
            loadScript("/moorhen.js").then(src => {
                console.log(src + " loaded 32-bit successfully.");
                /* eslint-disable no-undef */
                createCootModule({
                    print(t) {
                        console.log(["output", t]);
                    },
                    printErr(t) {
                        console.log(["output", t]);
                    },
                })
                    .then(returnedModule => {
                        /* @ts-expect-error */
                        window.cootModule = returnedModule;
                        /* @ts-expect-error */
                        window.CCP4Module = returnedModule;
                        const cootModuleAttachedEvent = new CustomEvent("cootModuleAttached", {});
                        document.dispatchEvent(cootModuleAttachedEvent);
                    })
                    .catch(e => {
                        console.log(e);
                    });
            });
        }

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
                <React.StrictMode>
                    <Provider store={MoorhenReduxStore}>
                        <MoorhenContainer moorhenInstanceRef={this.moorhenInstanceRef} setMoorhenDimensions={this.setMoorhenDimensions} />
                    </Provider>
                </React.StrictMode>
            </div>
        );
    }
}

customElements.define("moorhen-web-component", MoorhenWebComponent);
