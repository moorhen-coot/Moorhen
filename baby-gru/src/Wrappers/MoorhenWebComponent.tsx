import { createRoot } from "react-dom/client";
import React from "react";
import type { MoorhenInstance } from "@/InstanceManager";
import { MoorhenProvider } from "@/components/MoorhenProvider";
import { MoorhenContainer } from "@/components/container";

export class MoorhenWebComponent extends HTMLElement {
    private _moorhenInstanceRef: React.RefObject<MoorhenInstance | null>;
    private _moorhenInstance: MoorhenInstance | null = null;
    private _ready: boolean = false;

    public onInit: (() => void) | null = null;
    public setMoorhenDimensions: (() => [number, number]) | null = null;
    private _root: ReturnType<typeof createRoot> | null = null;

    constructor() {
        super();
        this._moorhenInstanceRef = React.createRef<null | MoorhenInstance>();
    }

    get moorhenInstance(): MoorhenInstance | null {
        return this._moorhenInstance;
    }

    get ready(): boolean {
        return this._ready;
    }
    //---------------------------------------
    // setter and getter for attributes with side effects to trigger re-render of the react tree when they change
    private _width: number | string | null = null;
    private _height: number | string | null = null;
    private _size: [number, number] | null = null;

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

    private _urlPrefix: string = "MoorhenAssets";
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
        return ["width", "height", "url-prefix", "disable-file-uploads", "view-only"];
    }

    private _disableFileUploads: boolean = false;
    get disableFileUploads(): boolean {
        return this._disableFileUploads;
    }

    set disableFileUploads(value: boolean) {
        const oldValue = this._disableFileUploads;
        this._disableFileUploads = value;
        this._triggerUpdate("disable-file-uploads", String(value), String(oldValue));
    }

    private _viewOnly: boolean = false;
    get viewOnly(): boolean {
        return this._viewOnly;
    }

    set viewOnly(value: boolean) {
        const oldValue = this._viewOnly;
        this._viewOnly = value;
        this._triggerUpdate("view-only", String(value), String(oldValue));
    }

    public attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (name === "width") this.width = newValue;
        if (name === "height") this.height = newValue;
        if (name === "url-prefix") this.urlPrefix = newValue ?? "MoorhenAssets";
        if (name === "disable-file-uploads") this.disableFileUploads = newValue === "true";
        if (name === "view-only") this.viewOnly = newValue === "true";
    }
    // --------------------------------
    private _triggerUpdate(name: string, newValue: string, oldValue: string) {
        if (this._root) {
            this._renderReactTree();
        }
    }

    private _renderReactTree() {
        if (!this._root) return;
        this._root.render(
            <MoorhenProvider>
                <MoorhenContainer
                    moorhenInstanceRef={this._moorhenInstanceRef}
                    size={this.size ?? undefined}
                    urlPrefix={this.urlPrefix}
                    webComponentMode={false}
                    disableFileUploads={this.disableFileUploads}
                    viewOnly={this.viewOnly}
                />
            </MoorhenProvider>
        );
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
            if (this._moorhenInstanceRef?.current?.isReady()) {
                clearInterval(refCheckInterval);
                this._moorhenInstance = this._moorhenInstanceRef.current;
                this.onInit?.();
                this._moorhenInstance.webComponent = this;
                this._ready = true;
                const event = new CustomEvent("moorhenReady", { detail: { id: this.id } });
                window.dispatchEvent(event);
            }
        };
        const refCheckInterval = setInterval(checkRefsReady, 50);
    }
}

export const registerMoorhenWebComponent = () => {
    if (!customElements.get("moorhen-web-component")) {
        customElements.define("moorhen-web-component", MoorhenWebComponent);
    }
};

export interface MoorhenWebComponentAttributes extends React.HTMLAttributes<HTMLElement> {
    width?: number | string;
    height?: number | string;
    "url-prefix"?: string;
    "disable-file-uploads"?: boolean;
    "view-only"?: boolean;
}

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            "moorhen-web-component": MoorhenWebComponentAttributes;
        }
    }
}
