import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MoorhenMolecule } from "@/utils";

const initialState: {
    paeFileIsUploaded: boolean;
    thresholdType: "b-factor-norm" | "af2-plddt";
    moleculeBfactors: { cid: string; bFactor: number; normalised_bFactor: number }[];
    moleculeMinBfactor: number;
    moleculeMaxBfactor: number;
    bFactorThreshold: number;
    nClusters: number;
    clusteringType: string;
    slicingResults: MoorhenMolecule[];
    paeFileContents: { fileContents: string; fileName: string }[];
} = {
    paeFileIsUploaded: false,
    thresholdType: "af2-plddt",
    moleculeBfactors: [],
    moleculeMinBfactor: null,
    moleculeMaxBfactor: null,
    bFactorThreshold: 70,
    nClusters: 2,
    clusteringType: "birch",
    slicingResults: null,
    paeFileContents: [],
};

const sliceNDiceSlice = createSlice({
    name: "sliceNDice",
    initialState: initialState,
    reducers: {
        resetSliceNDiceSlice: () => {
            return initialState;
        },
        setPaeFileIsUploaded: (state, action: PayloadAction<boolean>) => {
            state.paeFileIsUploaded = action.payload;
        },
        setThresholdType: (state, action: PayloadAction<"b-factor-norm" | "af2-plddt">) => {
            state.thresholdType = action.payload;
        },
        setMoleculeBfactors: (state, action: PayloadAction<{ cid: string; bFactor: number; normalised_bFactor: number }[]>) => {
            state.moleculeBfactors = action.payload;
        },
        setMoleculeMinBfactor: (state, action: PayloadAction<number>) => {
            state.moleculeMinBfactor = action.payload;
        },
        setMoleculeMaxBfactor: (state, action: PayloadAction<number>) => {
            state.moleculeMaxBfactor = action.payload;
        },
        setBFactorThreshold: (state, action: PayloadAction<number>) => {
            state.bFactorThreshold = action.payload;
        },
        setNClusters: (state, action: PayloadAction<number>) => {
            state.nClusters = action.payload;
        },
        setSlicingResults: (state, action: PayloadAction<MoorhenMolecule[]>) => {
            state.slicingResults = action.payload as  unknown as typeof state.slicingResults; // FIXME this is a hack to get typscript to stop complaining about the type of the payload.
        },
        setClusteringType: (state, action: PayloadAction<string>) => {
            state.clusteringType = action.payload;
        },
        setPAEFileContents: (state, action: PayloadAction<{ fileContents: string; fileName: string }[]>) => {
            state.paeFileContents = action.payload;
        },
    },
});

export const {
    resetSliceNDiceSlice,
    setPaeFileIsUploaded,
    setThresholdType,
    setMoleculeBfactors,
    setSlicingResults,
    setMoleculeMaxBfactor,
    setMoleculeMinBfactor,
    setBFactorThreshold,
    setNClusters,
    setClusteringType,
    setPAEFileContents,
} = sliceNDiceSlice.actions;

export default sliceNDiceSlice.reducer;
