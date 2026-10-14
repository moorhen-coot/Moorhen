import { JSX, useRef, useState } from "react";
import { MoorhenButton } from "@/components/inputs/MoorhenButton/MoorhenButton";
import { MoorhenPopover } from "./Popover";

type InfoCardProps = { 
    infoText: string | JSX.Element; 
    popoverPlacement?: "left" | "right" | "top" | "bottom"; 
    width?: string;
    large?: boolean;
};

export const MoorhenInfoCard = (props: InfoCardProps) => {
    const popoverPlacement = props.large ? "center" : props.popoverPlacement ?? "top";
    const [popoverIsShown, setPopOverIsShown] = useState<boolean>(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popOverLink = (
        <MoorhenButton
            type="icon-only"
            icon="MatSymInfo"
            size="small"
            onClick={() => setPopOverIsShown(true)}
            ref={buttonRef}
            style={{ cursor: "default" }}
        />
    );
    
    const content = (
        <div className={`moorhen__info-card ${props.large ? 'moorhen__info-card--large' : ''}`} style={props.width ? { maxWidth: props.width } : {}}>
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
        <div onMouseLeave={handleMouseLeave} onMouseEnter={handleMouseEnter}>
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
