import { useDispatch, useSelector } from "react-redux";
import React, { useState } from "react";
import { RootState, setShownSidePanel } from "@/store";
import { MoorhenSVG } from "../../icons";
import { MoorhenIcon } from "../../icons/MoorhenIcon";
import { MoorhenButton } from "../../inputs";
import { MoorhenStack } from "../../interface-base/Stack/Stack";
import { PanelIDs } from "./SidePanelList";

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
    const iconColor = isShown ? "inherit" : "var(--moorhen-disabled)";

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
                        moorhenSVG={!isShown ? "MatSymArrowLeft" : "MatSymArrowRight"}
                        hover={hovered}
                        style={{ color: iconColor }}
                    />
                    {icon && <MoorhenIcon size="medium" isActive={true} moorhenSVG={icon} hover={hovered} style={{ color: iconColor }} />}
                    {showHintLabel && <div className="moorhen__panel-container-toggle-button-hint-label">{label}</div>}
                </MoorhenStack>
            </button>
            <MoorhenButton
                type="icon-only"
                size="medium"
                icon="MatSymClose"
                onClick={() => props.onDelete(id)}
                variant="danger"
                style={{ color: iconColor }}
            />
        </div>
    );
};
