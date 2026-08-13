import { SequenceViewerPanel } from "./SequenceViewerPanel/SequenceViewerPanel";
import { ValidationPanel } from "./SequenceViewerPanel/ValidationPanel";

export type BottomPanelIDs = "sequences-viewer" | "validation" | (string & {}) | null;

export const BottomPanelsList: Partial<Record<BottomPanelIDs, React.JSX.Element>> = {
    "sequences-viewer": <SequenceViewerPanel />,
    validation: <ValidationPanel />,
};
