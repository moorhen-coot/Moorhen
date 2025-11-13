import { Button } from "react-bootstrap";
import { useRef, useState } from "react";
import { MoorhenPopover } from ".";
import { MoorhenMenuItem } from "./MenuItem";

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
};

export const MoorhenMenuItemPopover = (props: MoorhenMenuItemPopoverProps) => {
    const {
        popoverContent = null,
        popoverPlacement = "right",
        //showOkButton = true,
        buttonVariant = "primary",
        buttonText = "OK",
        menuItemText = "...",
        disabled = false,
        children,
    } = props;

    const menuItemRef = useRef<HTMLButtonElement>(null);
    const [isShown, setIsShown] = useState(false);
    const handleClick = () => {
        if (!disabled) setIsShown(!isShown);
    };

    const menuItem = (
        <MoorhenMenuItem onClick={handleClick} ref={menuItemRef} selected={isShown}>
            {menuItemText}
        </MoorhenMenuItem>
    );

    return (
        <MoorhenPopover popoverPlacement={popoverPlacement} isShown={isShown} setIsShown={setIsShown} link={menuItem} linkRef={menuItemRef}>
            {children ? children : popoverContent}
            {/* {showOkButton ? (
                <Button variant={buttonVariant} onClick={() => {}}>
                    {buttonText}
                </Button>
            ) : null} */}
        </MoorhenPopover>
    );
};
