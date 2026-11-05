import React, { useEffect, useRef, useState } from "react";
import { MoorhenButton } from "../MoorhenButton/MoorhenButton";
import { MoorhenToggle } from "../MoorhenToggle/Toggle";
import type { SelectorOption } from "../Selector/useSelectorOptions";
import "./check-list.css";

export type MoorhenCheckListProps = {
    /** What can be ticked. */
    options: SelectorOption[];
    /** The ticked values. Leave undefined to let the list keep its own selection (all at first). */
    selected?: string[];
    /** Called with the new selection, whether the user or the list itself changed it. */
    setSelected?: (selected: string[]) => void;
    /** Called with the new selection when the user changed it (a tick, check all, uncheck all). */
    onChange?: (selected: string[]) => void;
    /** When it changes (e.g. another molecule), everything is ticked again. */
    resetKey?: string | null;
    label?: string;
    disabled?: boolean;
    /** Shown when there is nothing to tick. */
    emptyText?: string;
    /** Height above which the list scrolls. */
    maxHeight?: string | number;
    style?: React.CSSProperties;
};

const sameSelection = (a: string[] | undefined, b: string[]) => a !== undefined && a.length === b.length && a.every((value, i) => value === b[i]);

/**
 * A list of checkboxes, one per option, with "Check all" and "Uncheck all".
 *
 * Everything is ticked at first, and again when `resetKey` changes. When the options change
 * otherwise, values no longer offered are dropped and new ones are ticked only if everything was
 * ticked before — so a list left on "all" stays on all as items are added.
 *
 * The selection is kept in option order. Pass `selected` / `setSelected` to keep it in the caller.
 */
export const MoorhenCheckList = (props: MoorhenCheckListProps) => {
    const { options, label, disabled = false, emptyText = "Nothing to select", maxHeight = "12rem" } = props;
    const [internalSelected, setInternalSelected] = useState<string[] | undefined>(props.selected);
    const selected = props.selected ?? internalSelected;

    const allValues = options.map(option => option.value);
    const previousValues = useRef<string[] | null>(null);
    const previousResetKey = useRef(props.resetKey);

    const update = (next: string[], byUser: boolean) => {
        setInternalSelected(next);
        props.setSelected?.(next);
        if (byUser) props.onChange?.(next);
    };

    // In option order, whatever order the values were ticked in
    const ordered = (values: Set<string>) => allValues.filter(value => values.has(value));

    useEffect(() => {
        const reset = previousResetKey.current !== props.resetKey;
        previousResetKey.current = props.resetKey;
        const before = previousValues.current;
        previousValues.current = allValues;

        let next: string[];
        if (selected === undefined || reset) {
            next = allValues;
        } else {
            const wasAll = before !== null && before.every(value => selected.includes(value));
            const kept = new Set(selected.filter(value => allValues.includes(value)));
            if (wasAll) allValues.forEach(value => kept.add(value));
            next = ordered(kept);
        }
        if (!sameSelection(selected, next)) update(next, false);
    }, [allValues.join("\u0000"), props.resetKey]);

    const current = new Set(selected ?? allValues);
    const toggle = (value: string, checked: boolean) => {
        const next = new Set(current);
        if (checked) next.add(value);
        else next.delete(value);
        update(ordered(next), true);
    };

    const isEmpty = options.length === 0;
    // With nothing to tick, both are true: neither button has anything to do
    const allChecked = allValues.every(value => current.has(value));
    const noneChecked = allValues.every(value => !current.has(value));

    return (
        <div className={`moorhen__check-list ${disabled ? "disabled" : ""}`} style={props.style}>
            <div className="moorhen__check-list-header">
                {label ? <span className="moorhen__input__label">{label}</span> : null}
                <span className="moorhen__check-list-count">
                    {isEmpty ? "" : `${allValues.filter(value => current.has(value)).length} / ${allValues.length}`}
                </span>
                <MoorhenButton size="xsmall" variant="secondary" disabled={disabled || allChecked} onClick={() => update(allValues, true)}>
                    Check all
                </MoorhenButton>
                <MoorhenButton size="xsmall" variant="secondary" disabled={disabled || noneChecked} onClick={() => update([], true)}>
                    Uncheck all
                </MoorhenButton>
            </div>
            <div className="moorhen__check-list-items" style={{ maxHeight }}>
                {isEmpty ? (
                    <span className="moorhen__check-list-empty">{emptyText}</span>
                ) : (
                    options.map(option => (
                        <MoorhenToggle
                            key={option.value}
                            type="checkbox"
                            label={option.label}
                            checked={current.has(option.value)}
                            disabled={disabled}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => toggle(option.value, event.target.checked)}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
