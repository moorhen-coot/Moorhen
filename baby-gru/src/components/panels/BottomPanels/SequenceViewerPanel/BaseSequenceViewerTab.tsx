import { MoorhenButton, MoorhenPopoverButton } from "@/components/inputs";
import { ReactNode } from "react";

export interface BaseSequenceViewerTabProps {
    isActiveTab: boolean;
    onTitleClick: () => void;
    titleText: string;
    configPanel?: ReactNode;
    showExpandButton?: boolean;
    expandedState?: boolean;
    onExpandClick?: () => void;
    infoCard?: ReactNode;
}

/**
 * Generic base tab component for sequence viewer panels
 * Eliminates duplication between SequenceViewerTab and ValidationTab
 */
export const BaseSequenceViewerTab = ({
    isActiveTab,
    onTitleClick,
    titleText,
    configPanel,
    showExpandButton = false,
    expandedState = false,
    onExpandClick,
    infoCard,
}: BaseSequenceViewerTabProps) => {
    return (
        <div className={`moorhen__bottom-panel-tab ${isActiveTab ? "" : "background"}`}>
            {isActiveTab && configPanel && (
                <MoorhenPopoverButton size="small">{configPanel}</MoorhenPopoverButton>
            )}
            <button className="moorhen__bottom-panel-button" onClick={onTitleClick}>
                &nbsp;&nbsp;{titleText}&nbsp;&nbsp;
            </button>
            {isActiveTab && showExpandButton && onExpandClick && (
                <MoorhenButton
                    type="icon-only"
                    icon={expandedState ? "MatSymDoubleArrowDown" : "MatSymDoubleArrowUp"}
                    size="small"
                    onClick={onExpandClick}
                />
            )}
            {isActiveTab && !showExpandButton && showExpandButton !== undefined && (
                <span>&nbsp;&nbsp;</span>
            )}
            {isActiveTab && infoCard}
        </div>
    );
};
