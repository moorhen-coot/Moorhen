import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { SequenceViewerOption } from "@/components/panels/BottomPanels/SequenceViewerPanel/SequenceViewerTab";

const initialState: {
    shownBottomPanel: "sequences-viewer" | "validation",
    seqviewerOption: SequenceViewerOption;
} = {
    shownBottomPanel: "sequences-viewer",
    seqviewerOption: {
        showExpandButton: true,
        nOfLines: 4,
        expanded: false,
        selectedMolecule: -999,
    },
};

const bottomPanelsSlice = createSlice({
    name: "bottomPanels",
    initialState,
    reducers: {
        setSeqViewerOption: (state, action: PayloadAction<SequenceViewerOption>) => {
            state.seqviewerOption = action.payload;
        },
        setShownBottomPanel: (state, action: PayloadAction<"sequences-viewer" | "validation">) => {
            state.shownBottomPanel = action.payload;
        },
    },
});

export const { setSeqViewerOption, setShownBottomPanel } = bottomPanelsSlice.actions;
export default bottomPanelsSlice.reducer;
