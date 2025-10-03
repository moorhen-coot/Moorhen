import { MoorhenIcon } from '../../icons/MoorhenIcon';
import './moorhen-button.css';

type MoorhenButtonPropsType = {
    type?: 'icon-only';
    label?: string;
    onClick?: () => void;
    onMouseDown?: () => void;
    onMouseUp?: () => void;
    onMouseLeave?: () => void;
    disabled?: boolean;
    size?: 'small' | 'medium' | 'large';
    icon?: string; // Optional icon name
    ref?: React.Ref<HTMLButtonElement>;
};
export const MoorhenButton = (props: MoorhenButtonPropsType) => {
    const {
        type = 'icon-only',
        label,
        onClick,
        onMouseDown,
        onMouseUp,
        onMouseLeave,
        disabled = false,
        size = 'medium',
        icon,
        ref,
    } = props;

    return (
        <button
            className={`moorhen__button__${type}`}
            onClick={onClick}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            disabled={disabled}
            ref={ref}
        >
            {icon && <MoorhenIcon name={icon} size={size} isActive={!disabled} />}
            {label}
        </button>
    );
};
