import { Tooltip } from "@mui/material";
import { JSX } from "react";
import { MoorhenSVG } from "../../icons";
import { MoorhenIcon } from "../../icons/MoorhenIcon";
import { MoorhenStack } from "../../interface-base";
import { MoorhenTooltip } from "../../interface-base/Popovers/Tooltip";
import "./moorhen-button.css";

type MoorhenButtonPropsTypeBase = {
    label?: string;
    onClick?: (() => void) | ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void);
    onMouseDown?: (() => void) | ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void);
    onMouseUp?: () => void;
    onMouseLeave?: () => void;
    disabled?: boolean;
    ref?: React.Ref<HTMLButtonElement>;
    style?: React.CSSProperties;
    className?: string;
    children?: React.ReactNode;
    value?: string | number;
    id?: string;
    tooltip?: string | JSX.Element;
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
    size?: "small" | "medium" | "large" | "sm" | "lg" | "md";
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
        disabled = false,
        icon,
        ref,
        className = "",
        style = {},
        children,
        tooltip = null,
        iconStyle = null,
    } = props;

    let size = props.size
        ? props.size === "lg"
            ? "large"
            : props.size === "sm"
              ? "small"
              : props.size === "md"
                ? "medium"
                : props.size
        : "medium";

    let variant: string | null = null;
    if (type === "default" && "variant" in props) variant = props.variant as string;

    const isChecked = type === "toggle" && "checked" in props ? props.checked : undefined;
    const iconSize = type === "toggle" ? "medium" : size;
    const resultClassName = `moorhen__button__${type}${isChecked !== undefined ? (isChecked ? "-checked" : "-unchecked") : ""} ${variant ? `${variant}` : ""} ${className}`;

    const button = (
        <button
            id={props.id}
            className={resultClassName}
            onClick={onClick}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            disabled={disabled}
            ref={ref}
            style={{ ...props.style }}
            value={props.value}
        >
            <MoorhenStack direction="row" align="center" justify="center" style={{ ...style }}>
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
        return <MoorhenTooltip tooltip={tooltip}>{button}</MoorhenTooltip>;
    } else {
        return button;
    }
};
