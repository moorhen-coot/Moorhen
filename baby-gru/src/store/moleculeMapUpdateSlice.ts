import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { moorhen } from "../types/moorhen";

const initialState: {
    updatingMapsIsEnabled: boolean;
    connectedMolecule: number;
    reflectionMap: number;
    twoFoFcMap: number;
    foFcMap: number;
    uniqueMaps: number[];
    defaultUpdatingScores: string[];
    showScoresToast: boolean;
    moleculeUpdate: { switch: boolean; molNo: number };
    currentScores: { rFactor: number; rFree: number; moorhenPoints: number };
    currentScoreDiffs: { rFactor: number; rFree: number; moorhenPoints: number };
} = {
    updatingMapsIsEnabled: false,
    connectedMolecule: null,
    reflectionMap: null,
    twoFoFcMap: null,
    foFcMap: null,
    uniqueMaps: [],
    defaultUpdatingScores: null,
    showScoresToast: null,
    moleculeUpdate: { switch: false, molNo: null },
    currentScores: { rFactor: null, rFree: null, moorhenPoints: null },
    currentScoreDiffs: { rFactor: null, rFree: null, moorhenPoints: null },
};

const moleculeMapUpdateSlice = createSlice({
    name: "moleculeMapUpdateSlice",
    initialState: initialState,
    reducers: {
        // API
        setCurrentScores: (state, action: PayloadAction<{ rFactor: number; rFree: number; moorhenPoints: number }>) => {
            state.currentScoreDiffs = {
                rFactor:
                    state.currentScores.rFactor === null
                        ? action.payload.rFactor
                        : action.payload.rFactor - state.currentScores.rFactor,
                rFree: state.currentScores.rFree === null ? action.payload.rFree : action.payload.rFree - state.currentScores.rFree,
                moorhenPoints:
                    state.currentScores.moorhenPoints === null
                        ? action.payload.moorhenPoints
                        : action.payload.moorhenPoints - state.currentScores.moorhenPoints,
            };
            state.currentScores = { ...action.payload };
        },
        // API
        resetMoleculeMapUpdates: () => {
            return initialState;
        },
        // API
        triggerUpdate: (state, action: PayloadAction<number>) => {
            state.moleculeUpdate = {
                molNo: action.payload,
                switch: !state.moleculeUpdate.switch,
            };
        },
        // API
        setShowScoresToast: (state, action: PayloadAction<boolean>) => {
            state.showScoresToast = action.payload;
        },

        addMapUpdatingScore: (state, action: PayloadAction<string>) => {
            state.defaultUpdatingScores.push(action.payload);
        },
        removeMapUpdatingScore: (state, action: PayloadAction<string>) => {
            state.defaultUpdatingScores = state.defaultUpdatingScores.filter(item => item !== action.payload);
        },
        overwriteMapUpdatingScores: (state, action: PayloadAction<string[]>) => {
            state.defaultUpdatingScores = action.payload;
        },
        // API
        enableUpdatingMaps: state => {
            state.updatingMapsIsEnabled = true;
        },
        // API
        disableUpdatingMaps: state => {
            state.updatingMapsIsEnabled = false;
            state.connectedMolecule = null;
            state.reflectionMap = null;
            state.twoFoFcMap = null;
            state.foFcMap = null;
            state.uniqueMaps = [];
        },

        setReflectionMap: (state, action: PayloadAction<moorhen.Map>) => {
            state.reflectionMap = action.payload.molNo;
        },
        setReflectionMapMolNo: (state, action: PayloadAction<number>) => {
            state.reflectionMap = action.payload;
        },
        setFoFcMap: (state, action: PayloadAction<moorhen.Map>) => {
            state.foFcMap = action.payload.molNo;
            state.uniqueMaps = [...new Set([state.twoFoFcMap, action.payload.molNo])];
        },
        setFoFcMapMolNo: (state, action: PayloadAction<number>) => {
            state.foFcMap = action.payload;
            state.uniqueMaps = [...new Set([state.twoFoFcMap, action.payload])];
        },
        setTwoFoFcMap: (state, action: PayloadAction<moorhen.Map>) => {
            state.twoFoFcMap = action.payload.molNo;
            state.uniqueMaps = [...new Set([action.payload.molNo, state.foFcMap])];
        },
        setTwoFoFcMapMolNo: (state, action: PayloadAction<number>) => {
            state.twoFoFcMap = action.payload;
            state.uniqueMaps = [...new Set([action.payload, state.foFcMap])];
        },
        setConnectedMolecule: (state, action: PayloadAction<moorhen.Molecule>) => {
            state.connectedMolecule = action.payload.molNo;
        },
        // API
        setConnectedMoleculeMolNo: (state, action: PayloadAction<number>) => {
            state.connectedMolecule = action.payload;
        },
    },
});

export const {
    setConnectedMolecule,
    enableUpdatingMaps,
    disableUpdatingMaps,
    setReflectionMap,
    setFoFcMap,
    setTwoFoFcMap,
    setReflectionMapMolNo,
    overwriteMapUpdatingScores,
    setCurrentScores,
    setConnectedMoleculeMolNo,
    setFoFcMapMolNo,
    setTwoFoFcMapMolNo,
    removeMapUpdatingScore,
    setShowScoresToast,
    addMapUpdatingScore,
    triggerUpdate,
    resetMoleculeMapUpdates,
} = moleculeMapUpdateSlice.actions;

export default moleculeMapUpdateSlice.reducer;
