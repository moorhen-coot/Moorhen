import { SequenceViewerPanel } from "./SequenceViewerPanel/SequenceViewerPanel";
import { ValidationPanel } from "./SequenceViewerPanel/ValidationPanel";

export type BottomPanelIDs = "sequences-viewer" | "validation";

export const BottomPanelsList: Partial<Record<BottomPanelIDs, { panelContent: React.JSX.Element }>> = {
    "sequences-viewer": { panelContent: <SequenceViewerPanel /> },
    validation: { panelContent: <ValidationPanel /> },
};
