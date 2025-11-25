import { MoorhenIcon } from "../../icons/MoorhenIcon";
import { MoorhenStack } from "../../interface-base";
import "./moorhen-button.css";

type MoorhenButtonPropsTypeBase = {
    label?: string;
    onClick?: (() => void) | ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void);
    onMouseDown?: (() => void) | ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void);
    onMouseUp?: () => void;
    onMouseLeave?: () => void;
    disabled?: boolean;
    icon?: string;
    ref?: React.Ref<HTMLButtonElement>;
    style?: React.CSSProperties;
    className?: string;
    children?: React.ReactNode;
    value?: string | number;
    id?: string;
};

type MoorhenButtonIconProps = MoorhenButtonPropsTypeBase & {
    type: "icon-only";
    size?: "small" | "medium" | "large" | "accordion";
    icon: string;
};

type MoorhenButtonDefaultProps = MoorhenButtonPropsTypeBase & {
    type?: "default";
    size?: "small" | "medium" | "large" | "sm" | "lg" | "md";
    variant?: "primary" | "secondary" | "danger" | "white" | "outlined" | "light";
    icon?: string;
};

type MoorhenButtonToggleProps = MoorhenButtonPropsTypeBase & {
    type: "toggle";
    checked: boolean;
    size?: "small" | "medium" | "large";
    icon?: string;
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
    } = props;

    let size = props.size === "lg" ? "large" : props.size === "sm" ? "small" : props.size === "md" ? "medium" : props.size;

    let variant: string | null = null;
    if (type === "default" && "variant" in props) variant = props.variant as string;

    const isChecked = type === "toggle" && "checked" in props ? props.checked : undefined;
    const resultClassName = `moorhen__button__${type}${isChecked !== undefined ? (isChecked ? "-checked" : "-unchecked") : ""} ${variant ? `moorhen_button-variant-${variant}` : ""} ${className}`;

    return (
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
            <MoorhenStack direction="row" align="center" justify="center">
                {icon && <MoorhenIcon name={icon} size={size} isActive={!disabled} style={{ ...style }} />}
                {label}
                {children}
            </MoorhenStack>
        </button>
    );
};
