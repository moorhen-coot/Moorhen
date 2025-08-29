import React, { ReactNode } from "react";
import "./menu-item.css";

interface MoorhenMenuItemProps {
    children: ReactNode;
    onClick?: () => void;
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
    return (
        <button className="moorhen__menu-item" onClick={props.onClick}>
            {props.children}
        </button>
    );
};
