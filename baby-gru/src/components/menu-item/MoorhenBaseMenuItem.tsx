import { ClickAwayListener } from "@mui/material";
import { Button } from "react-bootstrap";
import { createPortal } from "react-dom";
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
    const popoverRef = useRef<HTMLDivElement>(null);
    const [isShown, setIsShown] = useState(false);
    const [popoverStyle, setPopoverStyle] = useState({});
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

    useLayoutEffect(() => {
        if (isShown && menuItemRef.current) {
            const menuRect = menuItemRef.current.getBoundingClientRect();
            const popoverRect = popoverRef.current.getBoundingClientRect();
            const leftRight =
                popoverPlacement === "left"
                    ? menuRect.left + window.scrollX - popoverRect.width + 10
                    : menuRect.right + window.scrollX - 15;
            setPopoverStyle({
                position: "absolute",
                top: menuRect.top + window.scrollY + menuRect.height / 2 - popoverRect.height / 2,
                left: leftRight, // or rect.left for left alignment
                zIndex: 9999,
            });
        }
    }, [isShown]);

    const popover = useMemo(() => {
        return (
            <MoorhenPopover
                popoverPlacement={popoverPlacement}
                isShown={isShown}
                setIsShown={setIsShown}
                link={<div ref={popoverRef}>{menuItemText}</div>}
                linkRef={menuItemRef}
            >
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
    }, [props.popoverContent, popoverStyle]);

    return (
        <>
            {isShown && popover}
            <MoorhenMenuItem onClick={handleClick} ref={menuItemRef} selected={isShown}>
                {menuItemText}
            </MoorhenMenuItem>
        </>
    );
};
