import { useSelector, } from "react-redux";
import { useState } from "react";
import { ActivityCompat } from "@/components/interface-base/Compatibility";
import { RootState } from "@/store";
import { BottomPanelIDs, BottomPanelsList } from "./BottomPanelsList";
import {  SequenceViewerTab } from "./SequenceViewerPanel/SequenceViewerTab";
import { ValidationTab } from "./SequenceViewerPanel/ValidationTab";
import "./bottom-panel.css";

export const BottomPanelContainer = () => {
    const sidePanelWidth = useSelector((state: RootState) => state.globalUI.sidePanelWidth);
    const sidePanelIsOpen = useSelector((state: RootState) => state.globalUI.shownSidePanel);
    const [activePanels] = useState<BottomPanelIDs[]>(["sequences-viewer", "validation"]);
    const width = window.innerWidth - (sidePanelIsOpen ? sidePanelWidth : 0);
    const shownPanel = useSelector((state: RootState) => state.bottomPanels.shownBottomPanel);
    const seqviewerOption = useSelector((state: RootState) => state.bottomPanels.seqviewerOption);

    const panels: React.JSX.Element[] = activePanels.map(id => {
        return (
            <ActivityCompat mode={shownPanel === id ? "visible" : "hidden"} key={`${id}-activity-panel`}>
                {BottomPanelsList[id].renderPanelContent(seqviewerOption)}
            </ActivityCompat>
        );
    });

    return (
        <div className="moorhen__bottom-panel-container" style={{ width: width }}>
            <div className="moorhen__bottom-panel-tabs-container">
                <SequenceViewerTab/>
                <ValidationTab/>
            </div>
            {panels}
        </div>
    );
};
