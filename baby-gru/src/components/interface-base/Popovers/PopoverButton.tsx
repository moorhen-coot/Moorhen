import { useRef, useState } from "react";
import { MoorhenSVG } from "../../icons";
import { MoorhenButton } from "../../inputs";
import { MoorhenPopover } from "./Popover";

type MoorhenPopoverButtonType = {
    popoverContent?: React.JSX.Element;
    disabled?: boolean;
    size?: "small" | "medium" | "large" | "accordion";
    icon?: MoorhenSVG;
    popoverPlacement?: "left" | "right" | "top" | "bottom";
    children?: React.ReactNode;
    tooltip?: string;
    type?: "icon-only" | "default";
    style?: React.CSSProperties;
    closeButton?: boolean;
};

export const MoorhenPopoverButton = (props: MoorhenPopoverButtonType) => {
    const [popoverIsShown, setPopOverIsShown] = useState<boolean>(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { tooltip = null, type = "icon-only", style, popoverPlacement = "top", closeButton = false } = props;

    const popOverLink = (
        <MoorhenButton
            type={type}
            icon={props.icon ? props.icon : "MUISymbolSettings"}
            size={props.size}
            ref={buttonRef}
            onClick={() => setPopOverIsShown(!popoverIsShown)}
            tooltip={tooltip}
            style={style}
        />
    );

    return (
        <MoorhenPopover
            link={popOverLink}
            linkRef={buttonRef}
            isShown={popoverIsShown}
            popoverContent={props.children}
            popoverPlacement={popoverPlacement}
            setIsShown={setPopOverIsShown}
            closeButton={closeButton}
        />
    );
};
