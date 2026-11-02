import React from "react";
import { MoorhenMoleculeCheckList } from "@/components/inputs/CheckList/MoorhenMoleculeCheckList";
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
 * With the boolean `multiple`, a list of checkboxes with "Check all" / "Uncheck all" replaces the
 * dropdown, like a native `<select multiple>`: `values` holds the selected unique ids (all at
 * first; molecules loaded later are added while all are selected) and `value` the first of them.
 * `change` fires for each tick and for the buttons. `allow-any` does not apply.
 *
 * @example
 * <moorhen-molecule-select allow-any></moorhen-molecule-select>
 * select.addEventListener("change", () => console.log(select.value));
 * <moorhen-molecule-select multiple></moorhen-molecule-select>
 * select.addEventListener("change", () => console.log(select.values));
 */
export class MoorhenMoleculeSelectElement extends MoorhenUIElement {
    static observedAttributes = ["label", "value", "allow-any", "disabled", "multiple"];
    static upgradedProperties = ["value", "values", "filter"];

    /** The component's own value (unique id, or "" for any); unset until chosen or set. */
    private _value: string | undefined = undefined;
    private _filter: ((molecule: MoorhenMolecule) => boolean) | undefined = undefined;
    /** With `multiple`: the ticked unique ids; unset until the list (all) or a script set them. */
    private _values: string[] | undefined = undefined;

    private get multiple() {
        return booleanAttribute(this, "multiple");
    }

    private get componentValue(): string | undefined {
        return this._value ?? this.getAttribute("value") ?? undefined;
    }

    get value(): string | null | undefined {
        if (this.multiple) return this._values?.[0];
        const value = this.componentValue;
        return value === ANY ? null : value;
    }

    set value(value: string | null | undefined) {
        if (this.multiple) {
            this.values = value ? [value] : [];
            return;
        }
        this._value = value === null ? ANY : (value ?? undefined);
        this.requestRender();
    }

    /** With `multiple`: the selected molecules' unique ids, in list order (in the given order when a script set them). Otherwise `[value]`. */
    get values(): string[] {
        if (this.multiple) return [...(this._values ?? [])];
        return this.value ? [this.value] : [];
    }

    set values(values: string[]) {
        this._values = [...(values ?? [])];
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
        if (this.multiple) {
            return (
                <MoorhenMoleculeCheckList
                    label={this.getAttribute("label") ?? undefined}
                    disabled={booleanAttribute(this, "disabled")}
                    filter={this._filter}
                    selected={this._values}
                    // The list's own changes (all at first, molecules added or removed): no event
                    setSelected={values => {
                        this._values = values;
                        this.requestRender();
                    }}
                    // The user's: setSelected has run already
                    onChange={() => this.dispatchEvent(new Event("change", { bubbles: true }))}
                />
            );
        }
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
    /** Checkboxes for any number of molecules instead of a dropdown. */
    multiple?: boolean;
}
