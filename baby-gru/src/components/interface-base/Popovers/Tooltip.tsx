import { JSX, useRef, useState } from "react";
import { MoorhenPopover } from "./Popover";

type ToolTipProps = {
    tooltip: string | JSX.Element;
    children: React.ReactNode;
};

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

    const popoverLink = (
        <div style={{ all: "inherit" }} ref={linkRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {children}
        </div>
    );
    return (
        <MoorhenPopover
            link={popoverLink}
            linkRef={linkRef as React.RefObject<HTMLDivElement>}
            popoverContent={tooltip}
            isShown={isShown}
            setIsShown={setIsShown}
            type="tooltip"
        >
            {tooltip}
        </MoorhenPopover>
    );
};
