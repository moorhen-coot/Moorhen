import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { SequenceViewerOption } from "@/components/panels/BottomPanels/SequenceViewerPanel/SequenceViewerPanel";
import { ValidationOption } from "@/components/panels/BottomPanels/SequenceViewerPanel/ValidationPanel";

const initialState: {
    shownBottomPanel: "sequences-viewer" | "validation",
    seqviewerOption: SequenceViewerOption;
    validationOption: ValidationOption;
} = {
    shownBottomPanel: "sequences-viewer",
    seqviewerOption: {
        showExpandButton: true,
        nOfLines: 4,
        expanded: false,
        selectedMolecule: "",
    },
    validationOption: {
        selectedMolecule: "",
        selectedMap: "",
        availableData: [],
        shownData: ["Overall RMSZ", "Density Correlation"],
    },
};

const bottomPanelsSlice = createSlice({
    name: "bottomPanels",
    initialState,
    reducers: {
        setSeqViewerOption: (state, action: PayloadAction<SequenceViewerOption>) => {
            state.seqviewerOption = action.payload;
        },
        setValidationOption: (state, action: PayloadAction<ValidationOption>) => {
            state.validationOption = action.payload;
        },
        setShownBottomPanel: (state, action: PayloadAction<"sequences-viewer" | "validation">) => {
            state.shownBottomPanel = action.payload;
        },
    },
});

export const { setSeqViewerOption, setValidationOption, setShownBottomPanel } = bottomPanelsSlice.actions;
export default bottomPanelsSlice.reducer;
