import { Button } from "react-bootstrap";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MoorhenPopover } from "../interface-base";
import { MoorhenMenuItem } from "./MenuItem";

type MoorhenBaseMenuItemProps = {
    popoverContent?: React.JSX.Element;
    popoverPlacement?: "left" | "right";
    onCompleted?: () => void;
    setPopoverIsShown?: React.Dispatch<React.SetStateAction<boolean>>;
    menuItemTitle?: string;
    showOkButton?: boolean;
    buttonVariant?: string;
    buttonText?: string;
    textClassName?: string;
    id?: string;
    menuItemText: string;
    disabled?: boolean;
};
export const MoorhenBaseMenuItem = (props: MoorhenBaseMenuItemProps) => {
    const {
        popoverContent = null,
        popoverPlacement = "right",
        onCompleted = () => {},
        showOkButton = true,
        buttonVariant = "primary",
        buttonText = "OK",
        menuItemText = "...",
        disabled = false,
    } = props;

    const resolveOrRejectRef = useRef({
        resolve: (_arg0?: unknown) => {},
        reject: (_arg0?: unknown) => {},
    });

    const menuItemRef = useRef<HTMLButtonElement>(null);
    const [isShown, setIsShown] = useState(false);
    const handleClick = () => {
        if (!disabled) setIsShown(!isShown);
    };

    useEffect(() => {
        if (isShown) {
            new Promise((resolve, reject) => {
                resolveOrRejectRef.current = { resolve, reject };
            })
                .then(_result => {
                    onCompleted();
                    document.body.click();
                })
                .catch(err => console.log(err));
        }
    }, [isShown]);

    const menuItem = (
        <MoorhenMenuItem onClick={handleClick} ref={menuItemRef} selected={isShown}>
            {menuItemText}
        </MoorhenMenuItem>
    );

    return (
        <MoorhenPopover popoverPlacement={popoverPlacement} isShown={isShown} setIsShown={setIsShown} link={menuItem} linkRef={menuItemRef}>
            {popoverContent}
            {showOkButton ? (
                <Button
                    variant={buttonVariant}
                    onClick={() => {
                        resolveOrRejectRef.current.resolve();
                    }}
                >
                    {buttonText}
                </Button>
            ) : null}
        </MoorhenPopover>
    );
};
