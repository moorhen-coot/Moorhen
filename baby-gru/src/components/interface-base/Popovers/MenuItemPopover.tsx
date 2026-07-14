import { useRef, useState } from "react";
import { MoorhenPopover } from "..";
import { MoorhenMenuItem } from "../MenuItems/MenuItem";

type MoorhenMenuItemPopoverProps = {
    popoverContent?: React.JSX.Element;
    children?: React.JSX.Element;
    popoverPlacement?: "left" | "right";
    setPopoverIsShown?: React.Dispatch<React.SetStateAction<boolean>>;
    menuItemTitle?: string;
    // showOkButton?: boolean;
    buttonVariant?: string;
    buttonText?: string;
    textClassName?: string;
    id?: string;
    menuItemText: string;
    disabled?: boolean;
    style?: React.CSSProperties;
    popoverStyle?: React.CSSProperties;
};

export const MoorhenMenuItemPopover = (props: MoorhenMenuItemPopoverProps) => {
    const { popoverContent = null, popoverPlacement = "right", menuItemText = "...", disabled = false, children, style = {}, popoverStyle = {} } = props;

    const menuItemRef = useRef<HTMLButtonElement>(null);
    const [isShown, setIsShown] = useState(false);
    const handleClick = () => {
        if (!disabled) setIsShown(!isShown);
    };

    const menuItem = (
        <MoorhenMenuItem onClick={handleClick} ref={menuItemRef} selected={isShown} style={{ ...style }}>
            {menuItemText}
        </MoorhenMenuItem>
    );

    return (
        <MoorhenPopover popoverPlacement={popoverPlacement} isShown={isShown} setIsShown={setIsShown} link={menuItem} linkRef={menuItemRef} style={popoverStyle}>
            {children ? children : popoverContent}
        </MoorhenPopover>
    );
};
