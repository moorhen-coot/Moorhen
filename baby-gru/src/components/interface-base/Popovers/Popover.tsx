import { ClickAwayListener } from "@mui/material";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MoorhenButton } from "@/components/inputs/MoorhenButton/MoorhenButton";
import { useMoorhenInstance } from "../../../InstanceManager/useMoorhenInstance";
import { RootState } from "../../../store/MoorhenReduxStore";
import "./popover.css";

type PlacementType = "left" | "right" | "top" | "bottom";
type MoorhenPopoverType = {
    popoverContent?: React.JSX.Element | React.ReactNode;
    children?: React.JSX.Element | React.ReactNode;
    disabled?: boolean;
    popoverPlacement?: PlacementType;
    link: React.JSX.Element;
    linkRef: React.RefObject<HTMLDivElement | HTMLButtonElement>;
    isShown: boolean;
    type?: "default" | "tooltip";
    setIsShown: (arg0: boolean) => void;
    overridePopoverSize?: { width: number; height: number };
    allowAutoFlip?: boolean;
    closeButton?: boolean;
    style?: React.CSSProperties;
    dynamicPosition?: boolean;
};
export const MoorhenPopover = (props: MoorhenPopoverType) => {
    const {
        popoverContent = null,
        isShown,
        type = "default",
        overridePopoverSize = null,
        allowAutoFlip = true,
        closeButton,
        dynamicPosition = true,
    } = props;

    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);

    const [popoverPlacement, setPopoverPlacement] = useState<PlacementType>(props.popoverPlacement ?? "top");

    const containerRef = useMoorhenInstance().getContainerRef();
    const positionRef = useRef<{ left: number; top: number } | null>(null);
    const isFlippingRef = useRef(false);

    const calculatePosition = (overridePosition: PlacementType = null) => {
        if (!isShown || !props.linkRef.current || !popoverRef.current) {
            return;
        }
        if (isFlippingRef.current) {
            return;
        }

        const buttonRect = props.linkRef.current.getBoundingClientRect();
        const popoverRect = !overridePopoverSize ? popoverRef.current.getBoundingClientRect() : overridePopoverSize;
        const extraSpace = type === "default" ? 10 : 0;

        const placement = overridePosition ? overridePosition : popoverPlacement;

        let left: number;
        if (placement === "left") {
            left = buttonRect.left + window.scrollX - popoverRect.width - extraSpace;
        } else if (placement === "right") {
            left = buttonRect.right + window.scrollX + extraSpace;
        } else {
            left = buttonRect.right - buttonRect.width / 2 + window.scrollX - popoverRect.width / 2;
        }

        let top: number;
        if (placement === "bottom") {
            top = buttonRect.bottom + window.scrollY + extraSpace;
        } else if (placement === "top") {
            top = buttonRect.top + window.scrollY - popoverRect.height - extraSpace;
        } else {
            top = buttonRect.top + window.scrollY + buttonRect.height / 2 - popoverRect.height / 2;
        }

        // Flip the popover to the other side if it's out of screen
        if (overridePosition === null && allowAutoFlip && !isFlippingRef.current) {
            let newPlacement: PlacementType | null = null;

            if (placement === "top" && top < 0) {
                newPlacement = "bottom";
            } else if (placement === "bottom" && top + popoverRect.height > window.innerHeight) {
                newPlacement = "top";
            } else if (placement === "right" && left + popoverRect.width > window.innerWidth) {
                newPlacement = "left";
            } else if (placement === "left" && left < 0) {
                newPlacement = "right";
            }

            if (newPlacement !== null) {
                isFlippingRef.current = true;
                setPopoverPlacement(newPlacement);
                requestAnimationFrame(() => {
                    isFlippingRef.current = false;
                    calculatePosition(newPlacement);
                });
                return;
            }
        }

        const clampedTop = Math.min(Math.max(0, top), window.innerHeight - popoverRect.height);
        const clampedLeft = Math.min(Math.max(0, left), window.innerWidth - popoverRect.width);

        if (positionRef.current !== null) {
            if (Math.abs(clampedLeft - positionRef.current.left) <= 25 && Math.abs(clampedTop - positionRef.current.top) <= 25) {
                console.log("didn't move");
                return;
            }
        }

        positionRef.current = { left: clampedLeft, top: clampedTop };

        const arrowTopPos = `calc(50% + ${top - clampedTop}px)`;
        const arrowLeftPos = `calc(50% + ${left - clampedLeft}px`;
        console.log("do move");
        setPopoverStyle({
            position: "absolute",
            top: clampedTop,
            left: clampedLeft,
            zIndex: 10999,
            "--popover-arrow-top": arrowTopPos,
            "--popover-arrow-left": arrowLeftPos,
        } as React.CSSProperties);
    };

    useLayoutEffect(() => {
        calculatePosition();
    }, [isShown]);

    useEffect(() => {
        if (!dynamicPosition || !isShown) {
            return;
        }

        const interval = setInterval(() => {
            calculatePosition();
        }, 100);

        return () => clearInterval(interval);
    }, [dynamicPosition, isShown]);

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

    const container = (
        <div
            className={type === "tooltip" ? "moorhen__tooltip" : `moorhen__menu-item-popover ${arrow}`}
            style={{ ...popoverStyle, ...props.style }}
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
