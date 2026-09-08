import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MoorhenMolecule } from "../utils/MoorhenMolecule";

const initialState: {
    mrParseModels: MoorhenMolecule[];
    targetSequence: string;
    afJson: any[];
    esmJson: any[];
    homologsJson: any[];
    afSortField: string;
    homologsSortField: string;
    afSortReversed: boolean;
    homologsSortReversed: boolean;
    AFDisplaySettings: any;
    HomologsDisplaySettings: any;
} = {
    mrParseModels: [],
    targetSequence: "",
    afJson: [],
    esmJson: [],
    homologsJson: [],
    afSortField: "seq_ident",
    homologsSortField: "seq_ident",
    afSortReversed: false,
    homologsSortReversed: false,
    AFDisplaySettings: {
        rulerStart: 0,
        start: 0,
        end: 1,
        seqLength: 1,
        displaySequence: "A",
    },
    HomologsDisplaySettings: {
        rulerStart: 0,
        start: 0,
        end: 1,
        seqLength: 1,
        displaySequence: "A",
    },
};

const mrParseSlice = createSlice({
    name: "mrParse",
    initialState: initialState,
    reducers: {
        setMrParseModels: (state, action: PayloadAction<MoorhenMolecule[]>) => {
            state.mrParseModels = action.payload as unknown as typeof state.mrParseModels;
        },
        setTargetSequence: (state, action: PayloadAction<string>) => {
            state.targetSequence = action.payload;
        },
        setAfJson: (state, action: PayloadAction<any[]>) => {
            state.afJson = action.payload;
        },
        setEsmJson: (state, action: PayloadAction<any[]>) => {
            state.esmJson = action.payload;
        },
        setHomologsJson: (state, action: PayloadAction<any[]>) => {
            state.homologsJson = action.payload;
        },
        setAfSortField: (state, action: PayloadAction<string>) => {
            state.afSortField = action.payload;
        },
        setHomologsSortField: (state, action: PayloadAction<string>) => {
            state.homologsSortField = action.payload;
        },
        setAfSortReversed: (state, action: PayloadAction<boolean>) => {
            state.afSortReversed = action.payload;
        },
        setHomologsSortReversed: (state, action: PayloadAction<boolean>) => {
            state.homologsSortReversed = action.payload;
        },
        setAFDisplaySettings: (state, action: PayloadAction<any>) => {
            state.AFDisplaySettings = action.payload;
        },
        setHomologsDisplaySettings: (state, action: PayloadAction<any>) => {
            state.HomologsDisplaySettings = action.payload;
        },
    },
});

export const {
    setMrParseModels,
    setTargetSequence,
    setAfJson,
    setEsmJson,
    setHomologsJson,
    setAfSortField,
    setHomologsSortField,
    setAfSortReversed,
    setHomologsSortReversed,
    setAFDisplaySettings,
    setHomologsDisplaySettings,
} = mrParseSlice.actions;

export default mrParseSlice.reducer;
