import { SequenceViewerPanel } from "./SequenceViewerPanel/SequenceViewerPanel";
import { ValidationPanel } from "./SequenceViewerPanel/ValidationPanel";

export type BottomPanelIDs = "sequences-viewer" | "validation" | (string & {});

export const BottomPanelsList: Partial<Record<BottomPanelIDs, { renderPanelContent: (option) => React.JSX.Element }>> = {
    "sequences-viewer": { renderPanelContent: (seqViewerOption) => <SequenceViewerPanel option={seqViewerOption}/> },
    validation: { renderPanelContent: (validationPanelOption) => <ValidationPanel /> },
};
