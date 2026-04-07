import { createRoot } from "react-dom/client";
import React from "react";
import type { MoorhenInstance } from "@/InstanceManager";
import { MoorhenProvider } from "@/components/MoorhenProvider";
import { MoorhenContainer } from "@/components/container";

export class MoorhenWebComponent extends HTMLElement {
    public moorhenInstanceRef: React.RefObject<MoorhenInstance | null>;
    public moorhenInstance!: MoorhenInstance;
    // public setMoorhenDimensions: null | (() => [number, number]);
    private _width: number | string | null = null;
    private _height: number | string | null = null;
    private _size: [number, number] | null = null;
    private _urlPrefix: string = "MoorhenAssets";
    public onInit: (() => void) | null = null;
    public setMoorhenDimensions: (() => [number, number]) | null = null;
    private _root: ReturnType<typeof createRoot> | null = null;
    private _resizeTrigger: number = 0;

    // Property getters and setters to handle React property updates
    get width(): number | string | null {
        return this._width;
    }

    set width(value: number | string | null) {
        const oldValue = this._width;
        this._width = value;
        if (value) {
            this._size = [+value, this._height ? +this._height : +value];
        } else {
            this._size = this._height ? [+this._height, +this._height] : null;
        }
        this._triggerUpdate("width", String(value), String(oldValue));
    }

    get height(): number | string | null {
        return this._height;
    }

    set height(value: number | string | null) {
        const oldValue = this._height;
        this._height = value;
        if (value) {
            this._size = [this._width ? +this._width : 1, value ? +value : this._width ? +this._width : 1];
        } else {
            this._size = this._width ? [+this._width, +this._width] : null;
        }
        this._triggerUpdate("height", String(value), String(oldValue));
    }

    get urlPrefix(): string {
        return this._urlPrefix;
    }

    set urlPrefix(value: string) {
        const oldValue = this._urlPrefix;
        this._urlPrefix = value;
        this._triggerUpdate("url-prefix", value, oldValue);
    }

    get size(): [number, number] | null {
        return this._size;
    }

    static get observedAttributes() {
        return ["width", "height", "url-prefix"];
    }

    public attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (name === "width") this.width = newValue;
        if (name === "height") this.height = newValue;
        if (name === "url-prefix") this.urlPrefix = newValue ?? "MoorhenAssets";
    }

    private _triggerUpdate(name: string, newValue: string, oldValue: string) {
        if (this._root) {
            this._renderReactTree();
        }
    }

    constructor() {
        super();
        this.moorhenInstanceRef = React.createRef<null | MoorhenInstance>();
    }

    public connectedCallback() {
        // shadow context
        const rootElement = document.createElement("div");

        console.log("setDimension fct:", this.setMoorhenDimensions);
        if (
            this.setMoorhenDimensions === null &&
            (this.getAttribute("width") || this.getAttribute("height") || this._width || this._height)
        ) {
            this.setMoorhenDimensions = () => {
                const width = this.getAttribute("width") ?? this._width;
                const height = this.getAttribute("height") ?? this._height;
                return [width ? +width : 1, height ? +height : 1];
            };
        }

        this.appendChild(rootElement); // comment this out  and uncomment the following to use shadow DOM instead of light DOM
        // also set webComponentMode to true in MoorhenContainer props

        // const shadow = this.attachShadow({ mode: "open" });
        // shadow.appendChild(rootElement);

        // const loadStylesheets = async () => {
        //     const moorhenRes = await fetch(new URL(`${this.urlPrefix}/moorhen.css`, window.location.href).href);
        //     const moorhenCss = await moorhenRes.text();

        //     if ("adoptedStyleSheets" in shadow) {
        //         const moorhenSheet = new CSSStyleSheet();
        //         moorhenSheet.replaceSync(moorhenCss);
        //         shadow.adoptedStyleSheets = [moorhenSheet];
        //     } else {
        //         const moorhenStyle = document.createElement("style");
        //         moorhenStyle.textContent = moorhenCss;
        //         (shadow as ShadowRoot).appendChild(moorhenStyle);
        //     }
        // };
        // loadStylesheets();

        this._root = createRoot(rootElement);
        this._renderReactTree();

        const checkRefsReady = () => {
            if (this.moorhenInstanceRef?.current?.isReady()) {
                clearInterval(refCheckInterval);
                this.moorhenInstance = this.moorhenInstanceRef.current;
                this.onInit?.();
            }
        };
        const refCheckInterval = setInterval(checkRefsReady, 50);
    }

    private _renderReactTree() {
        if (!this._root) return;
        this._root.render(
            <MoorhenProvider>
                <MoorhenContainer
                    moorhenInstanceRef={this.moorhenInstanceRef}
                    size={this.size ?? undefined}
                    urlPrefix={this.urlPrefix}
                    webComponentMode={false}
                    resizeTrigger={this._resizeTrigger}
                />
            </MoorhenProvider>
        );
    }
}

if (!customElements.get("moorhen-web-component")) {
    customElements.define("moorhen-web-component", MoorhenWebComponent);
}

export interface MoorhenWebComponentAttributes extends React.HTMLAttributes<HTMLElement> {
    width?: number | string;
    height?: number | string;
    "url-prefix"?: string;
}

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            "moorhen-web-component": MoorhenWebComponentAttributes;
        }
    }
}
