import { JSX, useRef, useState } from "react";
import { MoorhenPopover } from "..";
import { MoorhenIcon } from "../../icons";

type InfoCardProps = { infoText: string | JSX.Element; popoverPlacement?: "left" | "right" | "top" | "bottom" };

export const MoorhenInfoCard = (props: InfoCardProps) => {
    const { popoverPlacement = "top" } = props;
    const [popoverIsShown, setPopOverIsShown] = useState<boolean>(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popOverLink = <MoorhenIcon moorhenSVG="MatSymInfo" size="small" ref={buttonRef} onMouseEnter={() => setPopOverIsShown(true)} />;
    const content = (
        <div style={{ width: "26rem" }} className="moorhen__info-card">
            {props.infoText}
        </div>
    );

    return (
        <div onMouseLeave={() => setPopOverIsShown(false)}>
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
