import React from "react";
import { MoorhenMoleculeSelect } from "@/components/inputs/Selector/MoleculeSelector";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { booleanAttribute, MoorhenUIElement } from "./MoorhenUIElement";

// What MoorhenMoleculeSelect uses for its "Any molecule" option in unique id mode
const ANY = "";

/**
 * `<moorhen-molecule-select>`: a dropdown of the molecules loaded in Moorhen, kept up to date as
 * molecules are loaded and deleted. For content placed inside `<moorhen-web-component>`.
 *
 * Values are molecule unique ids (`molecule.uniqueId`), as in the rest of the API.
 *
 * Attributes: `label` (default "Select Molecule:"), `value` (starting selection, a unique id), the
 * boolean `allow-any` (adds "Any molecule") and `disabled`.
 *
 * Properties: `value` — the selected molecule's unique id, `null` for "Any molecule", `undefined`
 * when nothing is loaded; `filter` — `(molecule) => boolean` to list only some molecules.
 *
 * Fires `change` (bubbling) when the user picks a molecule. With nothing selected the dropdown picks
 * the first molecule by itself; that updates `value` without an event, as a native `<select>` does.
 *
 * @example
 * <moorhen-molecule-select allow-any></moorhen-molecule-select>
 * select.addEventListener("change", () => console.log(select.value));
 */
export class MoorhenMoleculeSelectElement extends MoorhenUIElement {
    static observedAttributes = ["label", "value", "allow-any", "disabled"];
    static upgradedProperties = ["value", "filter"];

    /** The component's own value (unique id, or "" for any); unset until chosen or set. */
    private _value: string | undefined = undefined;
    private _filter: ((molecule: MoorhenMolecule) => boolean) | undefined = undefined;

    private get componentValue(): string | undefined {
        return this._value ?? this.getAttribute("value") ?? undefined;
    }

    get value(): string | null | undefined {
        const value = this.componentValue;
        return value === ANY ? null : value;
    }

    set value(value: string | null | undefined) {
        this._value = value === null ? ANY : (value ?? undefined);
        this.requestRender();
    }

    get filter(): ((molecule: MoorhenMolecule) => boolean) | undefined {
        return this._filter;
    }

    set filter(filter: ((molecule: MoorhenMolecule) => boolean) | undefined) {
        this._filter = filter;
        this.requestRender();
    }

    protected renderComponent() {
        return (
            <MoorhenMoleculeSelect
                useUniqueId={true}
                label={this.getAttribute("label") ?? undefined}
                allowAny={booleanAttribute(this, "allow-any")}
                disabled={booleanAttribute(this, "disabled")}
                filterFunction={this._filter}
                selectedMolecule={this.componentValue}
                // Selection made by the component itself (its default) or by the user: keep it, no event yet
                setSelectedMolecule={(value: React.SetStateAction<string | undefined>) => {
                    this._value = typeof value === "function" ? value(this._value) : value;
                    this.requestRender();
                }}
                // Only the user's own choice comes through onChange; it runs after setSelectedMolecule
                onChange={() => this.dispatchEvent(new Event("change", { bubbles: true }))}
            />
        );
    }
}

/** Attributes of `<moorhen-molecule-select>`, for declaring it in JSX. */
export interface MoorhenMoleculeSelectElementAttributes extends React.HTMLAttributes<HTMLElement> {
    label?: string;
    /** Starting selection: a molecule unique id. */
    value?: string;
    "allow-any"?: boolean;
    disabled?: boolean;
}
