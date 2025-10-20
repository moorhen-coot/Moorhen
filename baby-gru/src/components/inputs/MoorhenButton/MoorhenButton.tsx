import { MoorhenIcon } from "../../icons/MoorhenIcon";
import "./moorhen-button.css";

type MoorhenButtonPropsType = {
    type?: "icon-only";
    label?: string;
    onClick?: () => void;
    onMouseDown?: () => void | ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void);
    onMouseUp?: () => void;
    onMouseLeave?: () => void;
    disabled?: boolean;
    size?: "small" | "medium" | "large" | "accordion";
    icon?: string; // Optional icon name
    ref?: React.Ref<HTMLButtonElement>;
    style?: React.CSSProperties;
    className?: string;
};
export const MoorhenButton = (props: MoorhenButtonPropsType) => {
    const {
        type = "icon-only",
        label,
        onClick,
        onMouseDown,
        onMouseUp,
        onMouseLeave,
        disabled = false,
        size = "medium",
        icon,
        ref,
        className = "",
        style = {},
    } = props;

    return (
        <button
            className={`moorhen__button__${type} ${className}`}
            onClick={onClick}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            disabled={disabled}
            ref={ref}
            style={{ ...props.style }}
        >
            {icon && <MoorhenIcon name={icon} size={size} isActive={!disabled} style={{ ...style }} />}
            {label}
        </button>
    );
};
