import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { SequenceViewerOption } from "@/components/panels/BottomPanels/SequenceViewerPanel/SequenceViewerPanel";
import { ValidationOption } from "@/components/panels/BottomPanels/SequenceViewerPanel/ValidationPanel";
import { BottomPanelIDs } from "@/components/panels";
import { type GradientColourTable, gradientPresets } from "@/components/inputs/MoorhenGradientPicker/gradientPresets";

/** The default colour gradient of the validation tracks (a copy: the store freezes its state) */
export const defaultValidationGradient: GradientColourTable = JSON.parse(JSON.stringify(gradientPresets["Pool Party"]));

const initialState: {
    shownBottomPanel: BottomPanelIDs;
    seqviewerOption: SequenceViewerOption;
    validationOption: ValidationOption;
    /** The colour gradient of the validation tracks, from good to poor (a user preference) */
    validationGradient: GradientColourTable;
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
    validationGradient: defaultValidationGradient,
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
        setValidationGradient: (state, action: PayloadAction<GradientColourTable>) => {
            state.validationGradient = action.payload;
        },
        setShownBottomPanel: (state, action: PayloadAction<BottomPanelIDs>) => {
            state.shownBottomPanel = action.payload;
        },
    },
});

export const { setSeqViewerOption, setValidationOption, setValidationGradient, setShownBottomPanel } = bottomPanelsSlice.actions;
export default bottomPanelsSlice.reducer;
