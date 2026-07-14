import React, { ReactNode } from "react";
import "./menu-item.css";

interface MoorhenMenuItemProps {
    children: ReactNode;
    selected?: boolean;
    onClick?: (e) => void |((e) => Promise<void>) | ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void);
    ref?: React.Ref<HTMLButtonElement>;
    id?: string;
    disabled?: boolean;
    style?: React.CSSProperties;
}
/**
 * A thin wrapper around a standard HTML `<button>` element, applying Moorhen-specific styling.
 *
 * @remarks
 * This component is primarily used to provide consistent styling for menu items within the application.
 *
 * @param props - The props for the MoorhenMenuItem component.
 * @param props.children - The content to be displayed inside the button.
 * @param props.onClick - Optional click handler for the button.
 */
export const MoorhenMenuItem: React.FC<MoorhenMenuItemProps> = props => {
    const { ref = null } = props;
    const [animation, setAnimation] = React.useState<boolean>(false);
    const onClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        props.onClick?.(event);
        setAnimation(true);
        setTimeout(() => setAnimation(false), 1000);
    }
    
    
    const className = !props.disabled
        ? `moorhen__menu-item ${props.selected ? `moorhen__menu-item-selected` : ``}`
        : `moorhen__menu-item-disabled`;
    return (
        <button className={className} onClick={onClick} ref={ref} disabled={props.disabled} style={{ ...props.style }}>
            {animation && <span className={`moorhen__menu-item-animation`} />}
            {props.children}
        </button>
    );
};
