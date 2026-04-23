import { JSX, useRef } from "react";
import { MoorhenSVG } from "../../icons";
import { MoorhenIcon } from "../../icons/MoorhenIcon";
import { MoorhenTooltip } from "../../interface-base/Popovers/Tooltip";
import { MoorhenStack } from "../../interface-base/Stack/Stack";
import "./moorhen-button.css";

type MoorhenButtonPropsTypeBase = {
    label?: string;
    onClick?: (() => void) | ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void);
    onMouseDown?: (() => void) | ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void);
    onMouseUp?: () => void;
    onMouseLeave?: () => void;
    onMouseEnter?: () => void;
    disabled?: boolean;
    ref?: React.Ref<HTMLButtonElement>;
    style?: React.CSSProperties;
    className?: string;
    children?: React.ReactNode;
    value?: string | number;
    id?: string;
    tooltip?: string | JSX.Element | false;
    tooltipPlacement?: "top" | "bottom" | "left" | "right";
    iconStyle?: React.CSSProperties;
};

type MoorhenButtonIconProps = MoorhenButtonPropsTypeBase & {
    type: "icon-only";
    size?: "small" | "medium" | "large" | "accordion";
    icon: MoorhenSVG;
    variant?: "default" | "danger";
};

type MoorhenButtonDefaultProps = MoorhenButtonPropsTypeBase & {
    type?: "default";
    size?: "small" | "medium" | "large" | "sm" | "lg" | "md" | "accordion";
    variant?: "primary" | "secondary" | "danger" | "white" | "outlined" | "light";
    icon?: MoorhenSVG;
};

type MoorhenButtonToggleProps = MoorhenButtonPropsTypeBase & {
    type: "toggle";
    checked: boolean;
    size?: "small" | "medium" | "large";
    icon?: MoorhenSVG;
};

export const MoorhenButton = (props: MoorhenButtonIconProps | MoorhenButtonDefaultProps | MoorhenButtonToggleProps) => {
    const {
        type = "default",
        label,
        onClick,
        onMouseDown,
        onMouseUp,
        onMouseLeave,
        onMouseEnter,
        disabled = false,
        icon,
        ref,
        className = "",
        style = {},
        children,
        tooltip = null,
        iconStyle = null,
        tooltipPlacement,
    } = props;

    const internalButtonRef = useRef<HTMLButtonElement>(null);

    let size = props.size ? props.size : "medium";
    if (size === "lg" || size === "large") {
        size = "large";
    } else if (size === "md" || size === "medium") {
        size = "medium";
    } else if (size === "sm" || size === "small") {
        size = "small";
    }

    let variant: string | null = null;
    if ("variant" in props) {
        if (type === "default") {
            variant = props.variant as string;
        } else if (type === "icon-only") {
            if (props.variant !== "danger") {
                variant = "";
            } else {
                variant = props.variant;
            }
        }
    }

    const isChecked = type === "toggle" && "checked" in props ? props.checked : undefined;
    const iconSize = type === "toggle" ? "medium" : size;
    const resultClassName = `moorhen__button__${type}${isChecked !== undefined ? (isChecked ? "-checked" : "-unchecked") : ""} ${variant ? `${variant}` : ""} ${className}`;

    const setButtonRef = (buttonElement: HTMLButtonElement | null) => {
        internalButtonRef.current = buttonElement;
        if (!ref) {
            return;
        }
        if (typeof ref === "function") {
            ref(buttonElement);
        } else {
            (ref as React.MutableRefObject<HTMLButtonElement | null>).current = buttonElement;
        }
    };

    const button = (
        <button
            id={props.id}
            className={resultClassName}
            onClick={onClick}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onMouseEnter={onMouseEnter}
            disabled={disabled}
            ref={setButtonRef}
            style={{ ...props.style }}
            value={props.value}
        >
            <MoorhenStack direction="row" align="center" justify="center" gap="0.2rem" style={{ ...style }}>
                {icon && (
                    <MoorhenIcon
                        moorhenSVG={icon}
                        size={iconSize}
                        isActive={!disabled}
                        style={{ ...iconStyle }}
                        variant={variant as "" | "danger"}
                    />
                )}
                {label}
                {children}
            </MoorhenStack>
        </button>
    );

    if (tooltip) {
        return <MoorhenTooltip tooltip={tooltip} placement={tooltipPlacement} link={button} linkRef={internalButtonRef} />;
    } else {
        return button;
    }
};
