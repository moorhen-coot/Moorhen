import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { SequenceViewerPanel } from "./SequenceViewerPanel/SequenceViewerPanel";
import { ValidationPanel } from "./SequenceViewerPanel/ValidationPanel";
import "./bottom-panel.css";

export const BottomPanelContainer = () => {
    const sidePanelWidth = useSelector((state: RootState) => state.globalUI.sidePanelWidth);
    const sidePanelIsOpen = useSelector((state: RootState) => state.globalUI.shownSidePanel);
    const width = window.innerWidth - (sidePanelIsOpen ? sidePanelWidth : 0);
    const showValidationPanel = useSelector((state: RootState) => state.globalUI.showValidationPanel);
    return (
        <div className="moorhen__bottom-panel-container" style={{ width: "100%" }}>
            {/* <SequenceViewerPanel /> */}
            <ValidationPanel />
        </div>
    );
};
