import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MoorhenButton } from "@/components/inputs/MoorhenButton/MoorhenButton";
import { MoorhenClickAwayListener } from "@/components/interface-base/utils/ClickAwayListener";
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
    type?: "default" | "tooltip" | "autocomplete";
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
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({ visibility: "hidden" });
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    const [popoverPlacement, setPopoverPlacement] = useState<PlacementType>(props.popoverPlacement ?? "top");
    const linkPositionRef = useRef<{ left: number; top: number } | null>(null);
    const popoverSizeRef = useRef<{ width: number; height: number } | null>(null);

    const containerRef = useMoorhenInstance().getContainerRef();
    const positionRef = useRef<{ left: number; top: number } | null>(null);

    const getOverflowScore = (left: number, top: number, width: number, height: number): number => {
        const overflowLeft = Math.max(0, -left);
        const overflowTop = Math.max(0, -top);
        const overflowRight = Math.max(0, left + width - window.innerWidth);
        const overflowBottom = Math.max(0, top + height - window.innerHeight);
        return overflowLeft + overflowTop + overflowRight + overflowBottom;
    };

    const calculatePosition = (overridePosition: PlacementType = null) => {
        if (!isShown || !props.linkRef.current || !popoverRef.current) {
            return;
        }

        const buttonRect = props.linkRef.current.getBoundingClientRect();
        const popoverRect = !overridePopoverSize ? popoverRef.current.getBoundingClientRect() : overridePopoverSize;

        if (linkPositionRef.current && popoverSizeRef.current) {
            if (
                Math.abs(buttonRect.left - linkPositionRef.current.left) <= 2 &&
                Math.abs(buttonRect.top - linkPositionRef.current.top) <= 2 &&
                Math.abs(popoverRect.width - popoverSizeRef.current.width) <= 2 &&
                Math.abs(popoverRect.height - popoverSizeRef.current.height) <= 2
            ) {
                return;
            }
        }
        linkPositionRef.current = { left: buttonRect.left, top: buttonRect.top };
        popoverSizeRef.current = { width: popoverRect.width, height: popoverRect.height };
        const extraSpace = type === "default" ? 10 : 0;

        const placement = overridePosition ? overridePosition : popoverPlacement;

        function calculateLeft(placement) {
            let left: number;
            if (type === "autocomplete") {
                left = buttonRect.left;
            } else if (placement === "left") {
                left = buttonRect.left - popoverRect.width - extraSpace;
            } else if (placement === "right") {
                left = buttonRect.right + extraSpace;
            } else {
                left = buttonRect.right - buttonRect.width / 2 - popoverRect.width / 2;
            }
            return left;
        }

        function calculateTop(placement) {
            let top: number;
            if (placement === "bottom") {
                top = buttonRect.bottom + extraSpace;
            } else if (placement === "top") {
                top = buttonRect.top - popoverRect.height - extraSpace;
            } else {
                top = buttonRect.top + buttonRect.height / 2 - popoverRect.height / 2;
            }
            return top;
        }

        const left = calculateLeft(placement);

        const top = calculateTop(placement);

        const currentOverflowScore = getOverflowScore(left, top, popoverRect.width, popoverRect.height);

        // Flip the popover only when the alternative side has less viewport overflow.
        if (overridePosition === null && allowAutoFlip) {
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
                let candidateLeft = calculateLeft(newPlacement);
                let candidateTop = calculateTop(newPlacement);

                const candidateOverflowScore = getOverflowScore(candidateLeft, candidateTop, popoverRect.width, popoverRect.height);

                if (candidateOverflowScore < currentOverflowScore && newPlacement !== popoverPlacement) {
                    setPopoverPlacement(newPlacement);
                    return;
                }
            }
        }

        const clampedTop = Math.min(Math.max(0, top), window.innerHeight - popoverRect.height);
        const clampedLeft = Math.min(Math.max(0, left), window.innerWidth - popoverRect.width);

        // if (positionRef.current !== null) {
        //     if (Math.abs(clampedLeft - positionRef.current.left) <= 2 && Math.abs(clampedTop - positionRef.current.top) <= 2) {
        //         return;
        //     }
        // }

        positionRef.current = { left: clampedLeft, top: clampedTop };
        const arrowTopPos = `calc(50% + ${top - clampedTop}px)`;
        const arrowLeftPos = `calc(50% + ${left - clampedLeft}px)`;
        setPopoverStyle({
            position: "fixed",
            top: clampedTop,
            left: clampedLeft,
            zIndex: 10999,
            visibility: "visible",
            "--popover-arrow-top": arrowTopPos,
            "--popover-arrow-left": arrowLeftPos,
        } as React.CSSProperties);
    };

    useLayoutEffect(() => {
        if (!isShown) {
            setPopoverStyle({ visibility: "hidden" });
            return;
        }

        linkPositionRef.current = null;
        popoverSizeRef.current = null;
        positionRef.current = null;
        calculatePosition();
    }, [isShown, popoverPlacement]);

    useEffect(() => {
        if (!isShown) return;

        const update = (() => {
            let lastTime = 0;
            return () => {
                const now = Date.now();
                if (now - lastTime > 25) {
                    calculatePosition();
                    lastTime = now;
                }
            };
        })();

        // Core positioning events
        window.addEventListener("scroll", update, true);
        window.addEventListener("resize", update);

        // Device/window movement events
        window.addEventListener("orientationchange", update);

        // Pointer events for detecting user interactions (e.g., dragging window)
        window.addEventListener("pointermove", update);
        window.addEventListener("mousemove", update);

        // Visual viewport changes (for mobile, pinch zoom, etc.)
        window.visualViewport?.addEventListener("resize", update);
        window.visualViewport?.addEventListener("scroll", update);

        const resizeObserver = new ResizeObserver(update);
        if (popoverRef.current) {
            resizeObserver.observe(popoverRef.current);
        }
        if (props.linkRef.current) {
            resizeObserver.observe(props.linkRef.current);
        }

        return () => {
            window.removeEventListener("scroll", update, true);
            window.removeEventListener("resize", update);
            window.removeEventListener("orientationchange", update);
            window.removeEventListener("pointermove", update);
            window.removeEventListener("mousemove", update);
            window.visualViewport?.removeEventListener("resize", update);
            window.visualViewport?.removeEventListener("scroll", update);
            resizeObserver.disconnect();
        };
    }, [isShown, props.linkRef]);

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

    let className: string = "";
    if (type === "tooltip") {
        className = "moorhen__tooltip";
    } else if (type === "autocomplete") {
        className = "moorhen__autocomplete-popover";
    } else if (type === "default") {
        className = `moorhen__menu-item-popover ${arrow}`;
    }

    const container = (
        <div className={className} style={{ ...popoverStyle, ...props.style }} ref={popoverRef} data-theme={isDark ? "dark" : "light"}>
            {closeButton && <MoorhenButton type="icon-only" onClick={() => props.setIsShown(false)} icon="MatSymClose" variant="danger" />}
            {popoverContent || props.children}
        </div>
    );
    const popover = closeButton ? (
        createPortal(container, containerRef.current)
    ) : (
        <>
            {createPortal(
                <MoorhenClickAwayListener onClickAway={() => props.setIsShown(false)}>{container}</MoorhenClickAwayListener>,
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
