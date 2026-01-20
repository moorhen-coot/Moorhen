import React, { useId } from "react";
import { MoorhenStack } from "../../interface-base";

export type MoorhenSelectProps = {
    children: React.ReactNode;
    ref?: React.Ref<HTMLSelectElement>;
    label?: string | React.JSX.Element;
    inline?: boolean;
    defaultValue?: string | number | readonly string[];
    value?: string | number | readonly string[];
    onChange?: (arg0: React.ChangeEvent<HTMLSelectElement>) => void;
    disabled?: boolean;
    setValue?:
        | ((val: string | number | readonly string[]) => void)
        | React.Dispatch<React.SetStateAction<string | number | readonly string[]>>;
};

export const MoorhenSelect = (props: MoorhenSelectProps) => {
    const { children, ref = null, label = "", inline = true, defaultValue, disabled = false, value } = props;
    const id = useId();

    const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        props.onChange?.(e);
        props.setValue?.(e.target.value);
    };
    return (
        <MoorhenStack direction={inline ? "line" : "column"} align="center" gap="0.5rem">
            {label && (
                <label htmlFor={`Selector-${id}`} className="moorhen__input__label">
                    {label}
                </label>
            )}
            <select
                id={`Selector-${id}`}
                ref={ref}
                className="moorhen__selector"
                defaultValue={defaultValue}
                onChange={onChange}
                disabled={disabled}
                value={value}
            >
                {children}
            </select>
        </MoorhenStack>
    );
};
