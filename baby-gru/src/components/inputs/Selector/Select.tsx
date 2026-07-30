import React, {  useEffect, useId, useRef } from "react";
import { MoorhenStack } from "../../interface-base/Stack/Stack";
import { useDispatch, useStore } from "react-redux";
import { RootState, setClickAwayListenerActive } from "@/store";

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
    style?: React.CSSProperties;
    onFocus?: () => void;
    onBlur?: () => void;
};

export const MoorhenSelect = (props: MoorhenSelectProps) => {
    const { children, ref = undefined, label = "", inline = true, defaultValue, disabled = false, value } = props;
    const id = useId();
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const clickAwayListenerActiveRef = useRef(store.getState().globalUI.isClickAwayListenerActive); 

    const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        props.onChange?.(e);
        props.setValue?.(e.target.value);
    };

    const onFocus = () => {
        clickAwayListenerActiveRef.current = store.getState().globalUI.isClickAwayListenerActive;
        dispatch(setClickAwayListenerActive(false));
        props.onFocus?.();
    }

    const onBlur = () => {
        dispatch(setClickAwayListenerActive(clickAwayListenerActiveRef.current));  
        props.onBlur?.();
    }

    useEffect(() => {
        return () => {
            dispatch(setClickAwayListenerActive(clickAwayListenerActiveRef.current));
        }
    }, [dispatch]);

    return (
        <MoorhenStack direction={inline ? "line" : "column"} align="center" gap="0.5rem" style={{ ...props.style }}>
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
                onFocus={onFocus}
                onBlur={onBlur}

            >
                {children}
            </select>
        </MoorhenStack>
    );
};
