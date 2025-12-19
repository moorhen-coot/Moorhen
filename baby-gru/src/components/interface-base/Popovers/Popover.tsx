import { ClickAwayListener } from "@mui/material";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMoorhenInstance } from "../../../InstanceManager";
import { RootState } from "../../../store/MoorhenReduxStore";
import "./popover.css";

type MoorhenPopoverType = {
    popoverContent?: React.JSX.Element | React.ReactNode;
    children?: React.JSX.Element | React.ReactNode;
    disabled?: boolean;
    popoverPlacement?: "left" | "right" | "top" | "bottom";
    link: React.JSX.Element;
    linkRef: React.RefObject<HTMLDivElement | HTMLButtonElement>;
    isShown: boolean;
    type?: "default" | "tooltip";
    setIsShown: (arg0: boolean) => void;
    overridePopoverSize?: { width: number; height: number };
};
export const MoorhenPopover = (props: MoorhenPopoverType) => {
    const { popoverContent = null, popoverPlacement = "top", isShown, type = "default", overridePopoverSize = null } = props;

    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverStyle, setPopoverStyle] = useState({});
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);

    const calculatePosition = () => {
        if (isShown && props.linkRef.current && popoverRef.current) {
            const buttonRect = props.linkRef.current.getBoundingClientRect();

            const popoverRect = !overridePopoverSize ? popoverRef.current.getBoundingClientRect() : overridePopoverSize;

            const extraSpace = type === "default" ? 10 : 0;

            let left;
            if (popoverPlacement === "left") {
                left = buttonRect.left + window.scrollX - popoverRect.width - extraSpace;
            } else if (popoverPlacement === "right") {
                left = buttonRect.right + window.scrollX + extraSpace;
            } else {
                left = buttonRect.right - buttonRect.width / 2 + window.scrollX - popoverRect.width / 2;
            }
            let top;
            if (popoverPlacement === "bottom") {
                top = buttonRect.top - window.scrollY + buttonRect.width + extraSpace;
            } else if (popoverPlacement === "top") {
                top = buttonRect.top + window.scrollY - popoverRect.height - extraSpace;
            } else {
                top = buttonRect.top + window.scrollY + buttonRect.height / 2 - popoverRect.height / 2;
            }
            // Prevent the popover from going above the viewport
            const clampedTop = Math.max(0, top);
            const arrowPos = top < 0 ? `calc(50% + ${top}px)` : `50%`;
            setPopoverStyle({
                position: "absolute",
                top: clampedTop,
                left: left,
                zIndex: 10999,
                "--popover-arrow-top": arrowPos,
            });
        }
    };

    useLayoutEffect(() => {
        calculatePosition();
    }, [isShown, popoverPlacement]);

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

    const containerRef = useMoorhenInstance().getContainerRef();

    const popover = (
        <>
            {createPortal(
                <ClickAwayListener onClickAway={() => props.setIsShown(false)}>
                    <div
                        className={type === "tooltip" ? "moorhen__tooltip" : `moorhen__menu-item-popover ${arrow}`}
                        style={popoverStyle}
                        ref={popoverRef}
                        data-theme={isDark ? "dark" : "light"}
                    >
                        {popoverContent || props.children}
                    </div>
                </ClickAwayListener>,
                containerRef.current
            )}
        </>
    );

    return (
        <>
            {isShown && popover}
            {props.link}
        </>
    );
};
