import React, { ReactNode } from "react";
import "./menu-item.css";

interface MoorhenMenuItemProps {
    children: ReactNode;
    selected?: boolean;
    onClick?: () => void;
    ref?: React.Ref<HTMLButtonElement>;
    id?: string;
    disabled?: boolean;
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
export const MoorhenMenuItem: React.FC<MoorhenMenuItemProps> = (props) => {
    const className = !props.disabled
        ? `moorhen__menu-item ${props.selected ? `moorhen__menu-item-selected` : ``}`
        : `moorhen__menu-item-disabled`;
    return (
        <button className={className} onClick={props.onClick} ref={props.ref} disabled={props.disabled}>
            {props.children}
        </button>
    );
};
