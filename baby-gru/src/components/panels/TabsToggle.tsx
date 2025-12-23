import { useDispatch, useSelector } from "react-redux";
import React, { useState } from "react";
import { RootState, setShownSidePanel } from "@/store";
import { MoorhenSVG } from "../icons";
import { MoorhenIcon } from "../icons/MoorhenIcon";
import { MoorhenButton } from "../inputs";
import { MoorhenStack } from "../interface-base/Stack/Stack";
import { PanelIDs } from "./PanelList";

type TabsToggleProps = {
    label: string;
    icon: MoorhenSVG;
    showHintLabel?: boolean;
    id: PanelIDs;
    onDelete: (id: PanelIDs) => void;
};
export const TabsToggle = (props: TabsToggleProps) => {
    const { label, icon, showHintLabel, id } = props;
    const dispatch = useDispatch();
    const isShown = useSelector((state: RootState) => state.globalUI.shownSidePanel === id);
    const [hovered, setHovered] = useState(false);
    const verticalLabel = label?.split("").map((char, index) => (
        <React.Fragment key={index}>
            {char}
            {index < label.length - 1 && <br />}
        </React.Fragment>
    ));

    return (
        <div className={`moorhen__panel-container-toggle-button ${isShown ? "visible" : ""}`}>
            <button
                style={{ all: "unset" }}
                onClick={() => {
                    dispatch(setShownSidePanel(isShown ? null : id));
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
                </MoorhenStack>
            </button>
            <MoorhenButton type="icon-only" size="medium" icon="MUISymbolClose" onClick={() => props.onDelete(id)} variant="danger" />
        </div>
    );
};
