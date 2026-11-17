import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { MoorhenPopover } from "./Popover";

type ToolTipProps = {
    tooltip: string | JSX.Element;
    placement?: "top" | "bottom" | "left" | "right";
    children?: React.ReactNode;
} & ({ linkRef: React.RefObject<HTMLElement>; link: JSX.Element } | { linkRef?: never; link?: never });

export const MoorhenTooltip = (props: ToolTipProps) => {
    const { tooltip, placement = "top", children } = props;
    const [isShown, setIsShown] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const linkRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setIsShown(true);
        }, 250);
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsShown(false);
    }, []);

    const popoverLink = props.link ?? <div ref={linkRef}>{children}</div>;
    const ref = props.linkRef ?? linkRef;

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        // focusin / focusout bubble: a link that does not take focus itself (a label around an input)
        // shows the tooltip when what it holds is focused from the keyboard
        element.addEventListener("mouseenter", handleMouseEnter);
        element.addEventListener("mouseleave", handleMouseLeave);
        element.addEventListener("focusin", handleMouseEnter);
        element.addEventListener("focusout", handleMouseLeave);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            element.removeEventListener("mouseenter", handleMouseEnter);
            element.removeEventListener("mouseleave", handleMouseLeave);
            element.removeEventListener("focusin", handleMouseEnter);
            element.removeEventListener("focusout", handleMouseLeave);
        };
    }, [ref, handleMouseEnter, handleMouseLeave]);

    return (
        <MoorhenPopover
            link={popoverLink}
            linkRef={ref as React.RefObject<HTMLDivElement | HTMLButtonElement>}
            popoverContent={tooltip}
            popoverPlacement={placement}
            isShown={isShown}
            setIsShown={setIsShown}
            type="tooltip"
        >
            {tooltip}
        </MoorhenPopover>
    );
};
