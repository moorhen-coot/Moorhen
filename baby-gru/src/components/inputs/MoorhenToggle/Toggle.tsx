import { JSX, SetStateAction, Dispatch } from "react";
import "./moorhen-toggle.css";

type MoorhenToggleProps = {
    checked?: boolean;
    toggle?:  Dispatch<SetStateAction<boolean>>
    onChange?: ((e: React.ChangeEvent<HTMLInputElement>) => void) | (() => void);
    label: string | JSX.Element;
    className?: string;
    id?: string;
    style?: React.CSSProperties;
    type?: "switch" | "radio" | "checkbox";
    ref?: React.Ref<HTMLInputElement>;
    name?: string;
    inline?: boolean;
    disabled?: boolean;
};

export const MoorhenToggle = (props: MoorhenToggleProps) => {
    const type = props.type ? props.type : "switch";
    const { id, checked = false, onChange = () => {}, toggle = null, ref, name, disabled } = props;
    return (
        <div
            className={`moorhen__toggle-container ${props.className ? props.className : ""} ${props.disabled ? "disabled" : ""}`}
            style={{ ...props.style }}
        >
            <label className={`moorhen__toggle-switch`} htmlFor={id}>
                <input
                    id={id}
                    className="moorhen__toggle-input"
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                        if (onChange) {
                            onChange(e);
                        }
                        if (toggle) {
                            toggle(!checked);
                        }
                    }}
                    ref={ref}
                    name={name}
                    disabled={disabled}
                />
                <span
                    className={
                        type === "switch"
                            ? "moorhen__toggle-slider"
                            : type === "radio"
                              ? "moorhen__toggle-radio"
                              : "moorhen__toggle-checkbox"
                    }
                ></span>
            </label>
            <span className="moorhen__toggle-label-text">{props.label}</span>
        </div>
    );
};
