import { JSX, useRef, useState } from "react";
import { MoorhenPopover } from "..";
import { MoorhenIcon } from "../../icons";

type InfoCardProps = { infoText: string | JSX.Element; popoverPlacement?: "left" | "right" | "top" | "bottom"; width?: string };

export const MoorhenInfoCard = (props: InfoCardProps) => {
    const { popoverPlacement = "top" } = props;
    const [popoverIsShown, setPopOverIsShown] = useState<boolean>(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popOverLink = <MoorhenIcon moorhenSVG="MatSymInfo" size="small" ref={buttonRef} onMouseEnter={() => setPopOverIsShown(true)} />;
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
        }, 600);
    };

    return (
        <div
            onMouseLeave={handleMouseLeave}
            onMouseEnter={() => {
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                }
            }}
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
