import { useDispatch } from "react-redux";
import React, { useId } from "react";
import { setShortCutsBlocked } from "../../store/globalUISlice";
import { MoorhenSVG } from "../icons";
import { MoorhenStack } from "../interface-base/Stack/Stack";
import { MoorhenButton } from "./MoorhenButton/MoorhenButton";

type MoorhenTextInputBase = {
    id?: string;
    text?: string;
    setText?: (text: string) => void;
    label?: string;
    inline?: boolean;
    style?: React.CSSProperties;
    ref?: React.RefObject<HTMLInputElement>;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isInvalid?: boolean;
    disabled?: boolean;
    placeholder?: string;
    uppercase?: boolean;
    readOnly?: boolean;
    onSubmit?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
    className?: string;
    maxLength?: number;
};
export type MoorhenTextInputProps = MoorhenTextInputBase & {
    button?: false;
};

export type MoorhenTextInputButtonProps = MoorhenTextInputBase & {
    button: true;
    onClick: () => void;
    icon?: MoorhenSVG;
    buttonLabel?: string;
};

export const MoorhenTextInput = (props: MoorhenTextInputProps | MoorhenTextInputButtonProps) => {
    const { inline = true, ref, isInvalid, disabled = false, placeholder, readOnly = false } = props;
    const id = useId();
    const dispatch = useDispatch();
    
    const handleBlur = () => {
        dispatch(setShortCutsBlocked(false));
        props.onBlur?.()
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        props.onChange?.(event);
        props.setText?.(event.target.value);
    };

    const handleFocus = () => {
        dispatch(setShortCutsBlocked(true));
        props.onFocus?.();
    }


    return (
        <MoorhenStack direction={inline ? "line" : "column"} align="center" style={{ ...props.style }}>
            <label htmlFor={props.id ? props.id : id}>{props.label}</label>
            <MoorhenStack direction="line" align="center">
                <input
                    id={props.id ? props.id : id}
                    type="text"
                    onChange={handleChange}
                    value={props.text}
                    className={`${props.className ? props.className : "moorhen__input moorhen__input-text-box"}  ${props.button ? "moorhen__input-text-box-wbutton" : null} ${isInvalid ? " invalid" : null}`}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    ref={ref}
                    disabled={disabled}
                    placeholder={placeholder}
                    maxLength={props.maxLength}
                    style={props.uppercase ? { textTransform: "uppercase" } : null}
                    readOnly={readOnly}
                    onKeyDown={event => {
                        if (event.key === "Enter" && props.onSubmit) {
                            props.onSubmit();
                        }
                    }}
                />
                {props.button ? (
                    <MoorhenButton icon={props.icon} onClick={props.onClick} className="moorhen__input-text-box-button" />
                ) : null}
            </MoorhenStack>
        </MoorhenStack>
    );
};
