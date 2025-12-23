import { useDispatch } from "react-redux";
import React, { useState } from "react";
import { setSidePanelIsOpen } from "@/store";
import { MoorhenSVG } from "../icons";
import { MoorhenIcon } from "../icons/MoorhenIcon";
import { MoorhenStack } from "../interface-base/Stack/Stack";

type TabsToggleProps = {
    isShown: boolean;
    label: string;
    icon: MoorhenSVG;
    showHintLabel?: boolean;
    setIsShown: (value: boolean, id: string) => void;
    id: string;
};
export const TabsToggle = (props: TabsToggleProps) => {
    const { isShown = false, setIsShown, label, icon, showHintLabel, id } = props;
    const [hovered, setHovered] = useState(false);
    const verticalLabel = label?.split("").map((char, index) => (
        <React.Fragment key={index}>
            {char}
            {index < label.length - 1 && <br />}
        </React.Fragment>
    ));

    return (
        <button
            className={`moorhen__panel-container-toggle-button ${isShown ? "visible" : ""}`}
            onClick={() => {
                setIsShown(!isShown, id);
            }}
            onMouseEnter={() => {
                setHovered(true);
            }}
            onMouseLeave={() => {
                setHovered(false);
            }}
        >
            <MoorhenStack direction="column" justify="center" align="center">
                <MoorhenIcon
                    size="medium"
                    isActive={true}
                    moorhenSVG={!isShown ? "MUISymbolArrowLeft" : "MUISymbolArrowRight"}
                    hover={hovered}
                />
                {icon && <MoorhenIcon size="medium" isActive={true} moorhenSVG={icon} hover={hovered} />}
                {showHintLabel && <div className="moorhen__panel-container-toggle-button-hint-label">{label}</div>}
                <MoorhenIcon
                    size="medium"
                    isActive={true}
                    moorhenSVG={!isShown ? "MUISymbolArrowLeft" : "MUISymbolArrowRight"}
                    hover={hovered}
                />
            </MoorhenStack>
        </button>
    );
};
