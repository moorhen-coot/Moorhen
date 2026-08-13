import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { SequenceViewerOption } from "@/components/panels/BottomPanels/SequenceViewerPanel/SequenceViewerPanel";
import { ValidationOption } from "@/components/panels/BottomPanels/SequenceViewerPanel/ValidationPanel";
import { BottomPanelIDs } from "@/components/panels";


const initialState: {
    shownBottomPanel: BottomPanelIDs;
    seqviewerOption: SequenceViewerOption;
    validationOption: ValidationOption;
} = {
    shownBottomPanel: null,
    seqviewerOption: {
        showExpandButton: true,
        nOfLines: 4,
        expanded: false,
        selectedMolecule: "",
        columnWidth: 0.9,
    },
    validationOption: {
        selectedMolecule: "",
        selectedMap: "",
        availableData: [],
        shownData: ["Overall RMSZ", "Density Correlation"],
        columnWidth: 0.8,
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
        setShownBottomPanel: (state, action: PayloadAction<BottomPanelIDs>) => {
            state.shownBottomPanel = action.payload;
        },
    },
});

export const { setSeqViewerOption, setValidationOption, setShownBottomPanel } = bottomPanelsSlice.actions;
export default bottomPanelsSlice.reducer;
