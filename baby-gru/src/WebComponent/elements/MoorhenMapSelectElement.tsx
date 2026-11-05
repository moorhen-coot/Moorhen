import React from "react";
import { MoorhenMapSelect } from "@/components/inputs/Selector/MoorhenMapSelect";
import type { MoorhenMap } from "@/utils/MoorhenMap";
import { booleanAttribute, MoorhenUIElement } from "./MoorhenUIElement";

/**
 * `<moorhen-map-select>`: a dropdown of the maps loaded in Moorhen, kept up to date as maps are
 * loaded and deleted. For content placed inside `<moorhen-web-component>`.
 *
 * Values are map unique ids (`map.uniqueId`), as in the rest of the API.
 *
 * Attributes: `label` (default "Map"), `value` (starting selection, a unique id) and `disabled`
 * (without it, the dropdown is disabled only while there is no map).
 *
 * Properties: `value` — the selected map's unique id, `undefined` when no map is loaded;
 * `filter` — `(map) => boolean` to list only some maps (e.g. `map => map.isDifference`).
 *
 * Fires `change` (bubbling) when the user picks a map. With nothing selected the dropdown picks the
 * first map by itself; that updates `value` without an event, as a native `<select>` does.
 *
 * @example
 * <moorhen-map-select label="Map:"></moorhen-map-select>
 * select.addEventListener("change", () => console.log(select.value));
 */
export class MoorhenMapSelectElement extends MoorhenUIElement {
    static observedAttributes = ["label", "value", "disabled"];
    static upgradedProperties = ["value", "filter"];

    /** The selection made by the user, the component or a script; unset until then. */
    private _value: string | undefined = undefined;
    private _filter: ((map: MoorhenMap) => boolean) | undefined = undefined;

    protected attributeValueChanged(name: string) {
        if (name === "value") this._value = undefined;
    }

    get value(): string | undefined {
        return this._value ?? this.getAttribute("value") ?? undefined;
    }

    set value(value: string | null | undefined) {
        this._value = value ?? undefined;
        this.requestRender();
    }

    get filter(): ((map: MoorhenMap) => boolean) | undefined {
        return this._filter;
    }

    set filter(filter: ((map: MoorhenMap) => boolean) | undefined) {
        this._filter = filter;
        this.requestRender();
    }

    protected renderComponent() {
        return (
            <MoorhenMapSelect
                useUniqueId={true}
                label={this.getAttribute("label") ?? undefined}
                // Only when asked: otherwise the component disables itself while there is no map
                disabled={booleanAttribute(this, "disabled") ? true : undefined}
                filterFunction={this._filter}
                selectedMap={this.value ?? null}
                // Selection made by the component itself (its default) or by the user: keep it, no event yet
                setSelectedMap={(value: React.SetStateAction<string | null>) => {
                    const next = typeof value === "function" ? value(this.value ?? null) : value;
                    this._value = next ?? undefined;
                    this.requestRender();
                }}
                // Only the user's own choice comes through onChange; it runs after setSelectedMap
                onChange={() => this.dispatchEvent(new Event("change", { bubbles: true }))}
            />
        );
    }
}

/** Attributes of `<moorhen-map-select>`, for declaring it in JSX. */
export interface MoorhenMapSelectElementAttributes extends React.HTMLAttributes<MoorhenMapSelectElement> {
    /** The id of the `<moorhen-web-component>` to work with, when the element is not inside it. */
    moorhen?: string;
    label?: string;
    /** Starting selection: a map unique id. */
    value?: string;
    disabled?: boolean;
}
