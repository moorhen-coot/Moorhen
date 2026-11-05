import React, { useLayoutEffect, useRef } from "react";
import { MoorhenInfoCard } from "@/components/interface-base/Popovers/InfoCard";
import { booleanAttribute, MoorhenUIElement } from "./MoorhenUIElement";

/** Copies of `source`'s children (a `<template>`'s content for a template child), for static content. */
const CopiedContent = (props: { source: HTMLElement; version: number }) => {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const copies = [...props.source.childNodes].map(node =>
            node instanceof HTMLTemplateElement ? node.content.cloneNode(true) : node.cloneNode(true)
        );
        ref.current?.replaceChildren(...copies);
    }, [props.source, props.version]);
    return <div ref={ref} className="moorhen__info-card-copy" />;
};

/**
 * `<moorhen-info-card>`: Moorhen's info button, opening a popover with help text. For content placed
 * inside `<moorhen-web-component>`.
 *
 * The text is the `info` attribute, or else the element's own content, which can be rich
 * (`<h1>`–`<h3>`, paragraphs, lists… styled as Moorhen's info cards; a `<template>` works too). The
 * popover is drawn in Moorhen's popup layer, outside the page, so it shows a copy of that content —
 * kept up to date when it changes — and the content itself is not shown in the page. Being a copy,
 * it is for static content: event listeners and form state are not carried over.
 *
 * Attributes: `info`, `placement` ("top" | "bottom" | "left" | "right"; default "top"), `width`
 * (maximum width, a CSS length), and the boolean `large` (a wide card in the middle of the view,
 * for longer help).
 *
 * @example
 * <moorhen-info-card info="Keeps only the residues within the radius."></moorhen-info-card>
 * <moorhen-info-card large>
 *     <h1>My plugin</h1>
 *     <p>What it does, step by step…</p>
 * </moorhen-info-card>
 */
export class MoorhenInfoCardElement extends MoorhenUIElement {
    static observedAttributes = ["info", "placement", "width", "large"];

    private _contentVersion = 0;
    private _observer: MutationObserver | null = null;

    public connectedCallback() {
        // The copy follows the content as the page changes it
        this._observer ??= new MutationObserver(records => {
            // The element's own attributes re-render through attributeChangedCallback already
            if (records.every(record => record.type === "attributes" && record.target === this)) return;
            this._contentVersion++;
            this.requestRender();
        });
        this._observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true });
        return super.connectedCallback();
    }

    public disconnectedCallback() {
        this._observer?.disconnect();
        super.disconnectedCallback();
    }

    protected renderComponent() {
        const info = this.getAttribute("info");
        return (
            <MoorhenInfoCard
                infoText={info ?? <CopiedContent source={this} version={this._contentVersion} />}
                popoverPlacement={(this.getAttribute("placement") ?? "top") as "top" | "bottom" | "left" | "right"}
                width={this.getAttribute("width") ?? undefined}
                large={booleanAttribute(this, "large")}
            />
        );
    }
}

/** Attributes of `<moorhen-info-card>`, for declaring it in JSX. */
export interface MoorhenInfoCardElementAttributes extends React.HTMLAttributes<MoorhenInfoCardElement> {
    /** The id of the `<moorhen-web-component>` to work with, when the element is not inside it. */
    moorhen?: string;
    /** Plain text; without it, the element's content is shown. */
    info?: string;
    placement?: "top" | "bottom" | "left" | "right";
    /** Maximum width of the card, a CSS length. */
    width?: string;
    /** A wide card in the middle of the view, for longer help. */
    large?: boolean;
}
