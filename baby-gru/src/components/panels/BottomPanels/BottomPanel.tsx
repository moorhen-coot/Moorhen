import { useSelector } from "react-redux";
import { useState } from "react";
import { ActivityCompat } from "@/components/interface-base/Compatibility";
import { RootState } from "@/store";
import { BottomPanelIDs, BottomPanelsList } from "./BottomPanelsList";
import "./bottom-panel.css";

export const BottomPanelContainer = () => {
    const sidePanelWidth = useSelector((state: RootState) => state.globalUI.sidePanelWidth);
    const sidePanelIsOpen = useSelector((state: RootState) => state.globalUI.shownSidePanel);
    const [activePanels, setActivePanels] = useState<BottomPanelIDs[]>(["sequences-viewer", "validation"]);
    const width = window.innerWidth - (sidePanelIsOpen ? sidePanelWidth : 0);
    const shownPanel = useSelector((state: RootState) => state.globalUI.shownBottomPanel);

    const panels: React.JSX.Element[] = activePanels.map(id => {
        return (
            <ActivityCompat mode={shownPanel === id ? "visible" : "hidden"} key={`${id}-activity-panel`}>
                {BottomPanelsList[id].panelContent}
            </ActivityCompat>
        );
    });

    return (
        <div className="moorhen__bottom-panel-container" style={{ width: "100%" }}>
            <div className="moorhen__bottom-panel-tabs-container" style={{ width: `${width}px` }}></div>
            {panels}
        </div>
    );
};
