import { useSelector } from "react-redux";
import React, { useEffect } from "react";
import { MoorhenChainCheckList } from "@/components/inputs/CheckList/MoorhenChainCheckList";
import { MoorhenChainSelect } from "@/components/inputs/Selector/MoorhenChainSelect";
import type { RootState } from "@/store";
import { booleanAttribute, MoorhenUIElement } from "./MoorhenUIElement";

// What MoorhenChainSelect uses for its "All" option
const ALL = "*";
const ALL_TYPES = [1, 2, 3, 4, 5];

/** Keeps the selection on one of the molecule's chains, choosing the first one when it is not. */
const ChainSelectWithDefault = (props: {
    moleculeUniqueId: string | null;
    value: string | undefined;
    setDefault: (chain: string | undefined) => void;
    select: React.ComponentProps<typeof MoorhenChainSelect>;
}) => {
    const molecule = useSelector((state: RootState) =>
        state.molecules.moleculeList.find(molecule => molecule.uniqueId === props.moleculeUniqueId)
    );
    const allowedTypes = props.select.allowedTypes ?? ALL_TYPES;
    const chains = (molecule?.sequences ?? []).filter(sequence => allowedTypes.includes(sequence.type)).map(sequence => sequence.chain);
    const options = props.select.allowAll && chains.length > 0 ? [ALL, ...chains] : chains;

    useEffect(() => {
        if (props.value === undefined || !options.includes(props.value)) {
            const next = options[0];
            if (next !== props.value) props.setDefault(next);
        }
    }, [options.join(","), props.value]);

    return <MoorhenChainSelect {...props.select} disabled={props.select.disabled || options.length === 0} />;
};

/**
 * `<moorhen-chain-select>`: a dropdown of the chains of one loaded molecule, chosen by unique id.
 * For content placed inside `<moorhen-web-component>`.
 *
 * Attributes: `molecule` (the molecule's unique id, e.g. the value of a `<moorhen-molecule-select>`),
 * `label` (default "Chain"), `value` (starting chain id), the boolean `allow-all` (adds "All") and
 * `disabled` (without it, the dropdown is disabled only while the molecule has no chain).
 *
 * Properties: `value` — the selected chain id, `null` for "All", `undefined` when there is no chain;
 * `molecule` — same as the attribute; `allowedTypes` — gemmi polymer types to list (1 PeptideL,
 * 2 PeptideD, 3 DNA, 4 RNA, 5 DNA/RNA hybrid; all by default).
 *
 * Fires `change` (bubbling) when the user picks a chain. With no valid selection — at first, or after
 * the molecule changed — the dropdown picks the first chain by itself, without an event.
 *
 * With the boolean `multiple`, a list of checkboxes with "Check all" / "Uncheck all" replaces the
 * dropdown, like a native `<select multiple>`: `values` holds the selected chain ids (all at first,
 * and all again when the molecule changes) and `value` the first of them. `change` fires for each
 * tick and for the buttons. `allow-all` does not apply.
 *
 * @example
 * moleculeSelect.addEventListener("change", () => chainSelect.molecule = moleculeSelect.value);
 * <moorhen-chain-select molecule="…" multiple></moorhen-chain-select>
 * chainSelect.addEventListener("change", () => console.log(chainSelect.values));
 */
export class MoorhenChainSelectElement extends MoorhenUIElement {
    static observedAttributes = ["molecule", "label", "value", "allow-all", "disabled", "multiple"];
    static upgradedProperties = ["value", "values", "molecule", "allowedTypes"];

    private _value: string | undefined = undefined;
    private _molecule: string | null | undefined = undefined;
    private _allowedTypes: number[] | undefined = undefined;
    /** With `multiple`: the ticked chain ids; unset until the list (all) or a script set them. */
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
        return value === ALL ? null : value;
    }

    set value(value: string | null | undefined) {
        if (this.multiple) {
            this.values = value ? [value] : [];
            return;
        }
        this._value = value === null ? ALL : (value ?? undefined);
        this.requestRender();
    }

    /** With `multiple`: the selected chain ids, in the molecule's order (in the given order when a script set them). Otherwise `[value]`. */
    get values(): string[] {
        if (this.multiple) return [...(this._values ?? [])];
        return this.value ? [this.value] : [];
    }

    set values(values: string[]) {
        this._values = [...(values ?? [])];
        this.requestRender();
    }

    /** The unique id of the molecule whose chains are listed. */
    get molecule(): string | null {
        return this._molecule !== undefined ? this._molecule : this.getAttribute("molecule");
    }

    set molecule(uniqueId: string | null) {
        this._molecule = uniqueId ?? null;
        this.requestRender();
    }

    get allowedTypes(): number[] | undefined {
        return this._allowedTypes;
    }

    set allowedTypes(types: number[] | undefined) {
        this._allowedTypes = types;
        this.requestRender();
    }

    protected renderComponent() {
        if (this.multiple) {
            return (
                <MoorhenChainCheckList
                    moleculeUniqueId={this.molecule}
                    allowedTypes={this._allowedTypes}
                    label={this.getAttribute("label") ?? undefined}
                    disabled={booleanAttribute(this, "disabled")}
                    selected={this._values}
                    // The list's own changes (all at first, all again for another molecule): no event
                    setSelected={values => {
                        this._values = values;
                        this.requestRender();
                    }}
                    // The user's: setSelected has run already
                    onChange={() => this.dispatchEvent(new Event("change", { bubbles: true }))}
                />
            );
        }
        const setValue = (chain: string | undefined) => {
            this._value = chain;
            this.requestRender();
        };
        return (
            <ChainSelectWithDefault
                moleculeUniqueId={this.molecule}
                value={this.componentValue}
                setDefault={setValue}
                select={{
                    moleculeUniqueId: this.molecule,
                    label: this.getAttribute("label") ?? undefined,
                    allowAll: booleanAttribute(this, "allow-all"),
                    allowedTypes: this._allowedTypes,
                    disabled: booleanAttribute(this, "disabled"),
                    value: this.componentValue ?? "",
                    setValue,
                    // Only the user's own choice comes through onChange, before setValue: take the value from it
                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                        setValue(event.target.value);
                        this.dispatchEvent(new Event("change", { bubbles: true }));
                    },
                }}
            />
        );
    }
}

/** Attributes of `<moorhen-chain-select>`, for declaring it in JSX. */
export interface MoorhenChainSelectElementAttributes extends React.HTMLAttributes<HTMLElement> {
    /** The molecule's unique id. */
    molecule?: string;
    label?: string;
    /** Starting chain id. */
    value?: string;
    "allow-all"?: boolean;
    disabled?: boolean;
    /** Checkboxes for any number of chains instead of a dropdown. */
    multiple?: boolean;
}
