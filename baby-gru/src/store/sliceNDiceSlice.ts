import { createSlice } from "@reduxjs/toolkit";
import { MoorhenMolecule } from "../moorhen";

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

export const sliceNDiceSlice = createSlice({
    name: "sliceNDice",
    initialState: initialState,
    reducers: {
        resetSliceNDiceSlice: () => {
            return initialState;
        },
        setPaeFileIsUploaded: (state, action: { payload: boolean; type: string }) => {
            return { ...state, paeFileIsUploaded: action.payload };
        },
        setThresholdType: (state, action: { payload: "b-factor-norm" | "af2-plddt"; type: string }) => {
            return { ...state, thresholdType: action.payload };
        },
        setMoleculeBfactors: (
            state,
            action: { payload: { cid: string; bFactor: number; normalised_bFactor: number }[]; type: string }
        ) => {
            return { ...state, moleculeBfactors: action.payload };
        },
        setMoleculeMinBfactor: (state, action: { payload: number; type: string }) => {
            return { ...state, moleculeMinBfactor: action.payload };
        },
        setMoleculeMaxBfactor: (state, action: { payload: number; type: string }) => {
            return { ...state, moleculeMaxBfactor: action.payload };
        },
        setBFactorThreshold: (state, action: { payload: number; type: string }) => {
            return { ...state, bFactorThreshold: action.payload };
        },
        setNClusters: (state, action: { payload: number; type: string }) => {
            return { ...state, nClusters: action.payload };
        },
        setSlicingResults: (state, action: { payload: MoorhenMolecule[]; type: string }) => {
            return { ...state, slicingResults: action.payload };
        },
        setClusteringType: (state, action: { payload: string; type: string }) => {
            return { ...state, clusteringType: action.payload };
        },
        setPAEFileContents: (
            state,
            action: { payload: { fileContents: string; fileName: string }[]; type: string }
        ) => {
            return { ...state, paeFileContents: action.payload };
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
