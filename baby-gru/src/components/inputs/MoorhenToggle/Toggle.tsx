import { Dispatch, JSX, SetStateAction, useRef } from "react";
import { MoorhenTooltip } from "../../interface-base/Popovers/Tooltip";
import "./moorhen-toggle.css";

type MoorhenToggleProps = {
    checked?: boolean;
    toggle?: Dispatch<SetStateAction<boolean>>;
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
    /** Shown on hover or focus: the place for a long explanation, keeping the label short. */
    tooltip?: string | JSX.Element;
    tooltipPlacement?: "top" | "bottom" | "left" | "right";
};

export const MoorhenToggle = (props: MoorhenToggleProps) => {
    const type = props.type ? props.type : "switch";
    const { id, checked, onChange = () => {}, toggle = null, ref, name, disabled } = props;
    // Controlled when the caller passes `checked`; otherwise uncontrolled so a
    // caller that only reads the input through `ref` (e.g. `ref.current.checked`)
    // still gets a toggle that actually flips. Passing `checked={false}` with no
    // state update would make React revert every click.
    const isControlled = checked !== undefined;
    const labelRef = useRef<HTMLLabelElement>(null);
    const element = (
        <label
            ref={labelRef}
            className={`moorhen__toggle-container ${props.className ? props.className : ""} ${props.disabled ? "disabled" : ""}`}
            style={{ ...props.style }}
            htmlFor={id}
        >
            <span className={`moorhen__toggle-switch moorhen__toggle-switch--${type}`}>
                <input
                    id={id}
                    className="moorhen__toggle-input"
                    type="checkbox"
                    {...(isControlled ? { checked } : { defaultChecked: false })}
                    onChange={e => {
                        if (onChange) {
                            onChange(e);
                        }
                        if (toggle) {
                            toggle(e.target.checked);
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
            </span>
            <span className="moorhen__toggle-label-text">{props.label}</span>
        </label>
    );
    if (props.tooltip) {
        return <MoorhenTooltip tooltip={props.tooltip} placement={props.tooltipPlacement ?? "top"} link={element} linkRef={labelRef} />;
    }
    return element;
};
