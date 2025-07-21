import { MoorhenIcon } from "./MoorhenIcon";
import "./moorhen-button.css";

type MoorhenButtonPropsType = {
    type?: "icon-only";
    label?: string;
    onClick?: () => void;
    onMouseDown?: () => void;
    onMouseUp?: () => void;
    onMouseLeave?: () => void;
    disabled?: boolean;
    size?: "small" | "medium" | "large";
    icon?: string; // Optional icon name
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
    } = props;

    return (
        <button
            className={`moorhen__button__${type}`}
            onClick={onClick}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            disabled={disabled}
        >
            {icon && <MoorhenIcon name={icon} size={size} isActive={!disabled} />}
            {label}
        </button>
    );
};
