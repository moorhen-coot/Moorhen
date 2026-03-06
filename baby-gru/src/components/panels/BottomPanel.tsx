import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { SequenceViewerPanel } from "./SequenceViewerPanel/SequenceViewerPanel";
import "./bottom-panel.css";

export const BottomPanelContainer = () => {
    const sidePanelWidth = useSelector((state: RootState) => state.globalUI.sidePanelWidth);
    const sidePanelIsOpen = useSelector((state: RootState) => state.globalUI.shownSidePanel);
    const width = window.innerWidth - (sidePanelIsOpen ? sidePanelWidth : 0);
    return (
        <div className="moorhen__bottom-panel-container" style={{ width: width }}>
            <SequenceViewerPanel />
        </div>
    );
};
