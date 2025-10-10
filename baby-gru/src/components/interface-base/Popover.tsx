import { ClickAwayListener } from "@mui/material";
import { createPortal } from "react-dom";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

type MoorhenPopoverType = {
    popoverContent?: React.JSX.Element | React.ReactNode;
    disabled?: boolean;
    popoverPlacement?: "left" | "right" | "top" | "bottom";
    link: React.JSX.Element;
    linkRef: React.RefObject<HTMLDivElement | HTMLButtonElement>;
    isShown: boolean;
    setIsShown: (arg0: boolean) => void;
};
export const MoorhenPopover = (props: MoorhenPopoverType) => {
    const { popoverContent = null, popoverPlacement = "top", isShown } = props;

    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverStyle, setPopoverStyle] = useState({});
    // const [isShown, setIsShown] = useState(false);
    // const handleClick = () => {
    //     if (!disabled) setIsShown(!isShown);
    // };

    useLayoutEffect(() => {
        if (isShown && props.linkRef.current && popoverRef.current) {
            const buttonRect = props.linkRef.current.getBoundingClientRect();
            const popoverRect = popoverRef.current.getBoundingClientRect();
            let leftRight;
            if (popoverPlacement === "left") {
                leftRight = buttonRect.left + window.scrollX - popoverRect.width - 10;
            } else if (popoverPlacement === "right") {
                leftRight = buttonRect.right + window.scrollX + 10;
            } else {
                leftRight = buttonRect.right + window.scrollX - popoverRect.width / 2 - buttonRect.width / 2;
            }
            let topBottom;
            if (popoverPlacement === "bottom") {
                topBottom = buttonRect.top - window.scrollY + popoverRect.height - buttonRect.width;
            } else if (popoverPlacement === "top") {
                topBottom = buttonRect.top + window.scrollY - popoverRect.height - buttonRect.width / 2;
            } else {
                topBottom = buttonRect.top + window.scrollY + buttonRect.height / 2 - popoverRect.height / 2;
            }
            setPopoverStyle({
                position: "absolute",
                top: topBottom,
                left: leftRight, // or rect.left for left alignment
                zIndex: 10999,
            });
        }
    }, [isShown]);

    let arrow: string;
    if (popoverPlacement === "left") {
        arrow = `right-arrow`;
    } else if (popoverPlacement === "right") {
        arrow = `left-arrow`;
    } else if (popoverPlacement === "top") {
        arrow = `bottom-arrow`;
    } else if (popoverPlacement === "bottom") {
        arrow = `top-arrow`;
    }

    const popover = useMemo(() => {
        return (
            <>
                {createPortal(
                    <ClickAwayListener onClickAway={() => props.setIsShown(false)}>
                        <div className={`moorhen__menu-item-popover ${arrow}`} style={popoverStyle} ref={popoverRef}>
                            {popoverContent}
                        </div>
                    </ClickAwayListener>,
                    document.body
                )}
            </>
        );
    }, [props.popoverContent, popoverStyle]);

    return (
        <>
            {isShown && popover}
            {props.link}
        </>
    );
};
