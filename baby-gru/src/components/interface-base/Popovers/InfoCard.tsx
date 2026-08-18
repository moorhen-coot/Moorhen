import { JSX, useRef, useState } from "react";
import { MoorhenPopover } from "./Popover";
import { MoorhenButton } from "@/components/inputs/MoorhenButton/MoorhenButton";

type InfoCardProps = { infoText: string | JSX.Element; popoverPlacement?: "left" | "right" | "top" | "bottom"; width?: string };

export const MoorhenInfoCard = (props: InfoCardProps) => {
    const { popoverPlacement = "top" } = props;
    const [popoverIsShown, setPopOverIsShown] = useState<boolean>(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popOverLink = <MoorhenButton type="icon-only" icon="MatSymInfo" size="small" onClick={() => setPopOverIsShown(true)} ref={buttonRef} style={{ cursor: "default" }} />;
    const content = (
        <div className="moorhen__info-card" style={props.width ? { maxWidth: props.width } : {}}>
            {props.infoText}
        </div>
    );
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    
    const handleMouseLeave = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            setPopOverIsShown(false);
        }, 500);
    };

    const handleMouseEnter = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        // timerRef.current = setTimeout(() => {
        //     setPopOverIsShown(true);
        // }, 500);
    };
    
    return (
        <div
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
        >
            <MoorhenPopover
                link={popOverLink}
                linkRef={buttonRef}
                isShown={popoverIsShown}
                popoverContent={content}
                popoverPlacement={popoverPlacement}
                setIsShown={setPopOverIsShown}
            />
        </div>
    );
};
