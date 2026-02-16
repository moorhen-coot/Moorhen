import { JSX, useRef, useState } from "react";
import { MoorhenPopover } from "./Popover";

type ToolTipProps = {
    tooltip: string | JSX.Element;
    children?: React.ReactNode;
} & ({ linkRef: React.RefObject<HTMLElement>; link: JSX.Element } | { linkRef?: never; link?: never });

export const MoorhenTooltip = (props: ToolTipProps) => {
    const { tooltip, children } = props;
    const [isShown, setIsShown] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const linkRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setIsShown(true);
        }, 250);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsShown(false);
    };

    const popoverLink = props.link ?? <div ref={linkRef}>{children}</div>;
    const ref = props.linkRef ?? linkRef;

    // Attach event handlers to the ref element
    if (ref?.current) {
        ref.current.onmouseenter = handleMouseEnter;
        ref.current.onmouseleave = handleMouseLeave;
    }

    return (
        <MoorhenPopover
            link={popoverLink}
            linkRef={ref as React.RefObject<HTMLDivElement>}
            popoverContent={tooltip}
            isShown={isShown}
            setIsShown={setIsShown}
            type="tooltip"
        >
            {tooltip}
        </MoorhenPopover>
    );
};
