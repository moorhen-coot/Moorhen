import { ClickAwayListener } from "@mui/material";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { MoorhenButton } from "@/components/inputs";
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
    allowAutoFlip?: boolean;
    closeButton?: boolean;
};
export const MoorhenPopover = (props: MoorhenPopoverType) => {
    const { popoverContent = null, isShown, type = "default", overridePopoverSize = null, allowAutoFlip = true, closeButton } = props;

    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverStyle, setPopoverStyle] = useState({});
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    const [popoverPlacement, setPopoverPlacement] = useState<"top" | "bottom" | "left" | "right">(
        props.popoverPlacement ? props.popoverPlacement : "top"
    );

    const calculatePosition = (overridePosition: "top" | "bottom" | "left" | "right" = null) => {
        if (isShown && props.linkRef.current && popoverRef.current) {
            const buttonRect = props.linkRef.current.getBoundingClientRect();
            const popoverRect = !overridePopoverSize ? popoverRef.current.getBoundingClientRect() : overridePopoverSize;
            const extraSpace = type === "default" ? 10 : 0;

            const placement = overridePosition ? overridePosition : popoverPlacement;

            let left;
            if (placement === "left") {
                left = buttonRect.left + window.scrollX - popoverRect.width - extraSpace;
            } else if (placement === "right") {
                left = buttonRect.right + window.scrollX + extraSpace;
            } else {
                left = buttonRect.right - buttonRect.width / 2 + window.scrollX - popoverRect.width / 2;
            }

            let top;
            if (placement === "bottom") {
                top = buttonRect.bottom + window.scrollY + extraSpace;
            } else if (placement === "top") {
                top = buttonRect.top + window.scrollY - popoverRect.height - extraSpace;
            } else {
                top = buttonRect.top + window.scrollY + buttonRect.height / 2 - popoverRect.height / 2;
            }

            // Flip the popover to the other side if it's out of screen
            if (!overridePosition && allowAutoFlip) {
                if (placement === "top" && top < 0) {
                    calculatePosition("bottom");
                    setPopoverPlacement("bottom");
                    return;
                } else if (placement === "bottom" && top + popoverRect.height > window.innerHeight) {
                    calculatePosition("top");
                    setPopoverPlacement("top");
                    return;
                } else if (placement === "right" && left + popoverRect.width > window.innerWidth) {
                    calculatePosition("left");
                    setPopoverPlacement("left");
                    return;
                }
            }

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

    const container = (
        <div
            className={type === "tooltip" ? "moorhen__tooltip" : `moorhen__menu-item-popover ${arrow}`}
            style={popoverStyle}
            ref={popoverRef}
            data-theme={isDark ? "dark" : "light"}
        >
            {closeButton && <MoorhenButton type="icon-only" onClick={() => props.setIsShown(false)} icon="MatSymClose" variant="danger" />}
            {popoverContent || props.children}
        </div>
    );
    const popover = closeButton ? (
        createPortal(container, containerRef.current)
    ) : (
        <>
            {createPortal(
                <ClickAwayListener onClickAway={() => props.setIsShown(false)}>{container}</ClickAwayListener>,
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
