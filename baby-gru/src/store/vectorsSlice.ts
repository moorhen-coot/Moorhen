import { createSlice } from "@reduxjs/toolkit";
import { moorhen } from "../types/moorhen";

export type VectorsCoordMode = "atoms" | "points" | "atompoint";
export type VectorsLabelMode = "none" | "start" | "end" | "middle";
export type VectorsDrawMode = "cylinder" | "dashedcylinder";
export type VectorsArrowMode = "none" | "start" | "end" | "both";

export interface MoorhenVector {
    coordsMode: VectorsCoordMode;
    labelMode: VectorsLabelMode;
    labelText: string;
    drawMode: VectorsDrawMode;
    arrowMode: VectorsArrowMode;
    xFrom: number;
    yFrom: number;
    zFrom: number;
    xTo: number;
    yTo: number;
    zTo: number;
    cidFrom: string;
    cidTo: string;
    molNoFrom: number;
    molNoTo: number;
    uniqueId: string;
    vectorColour: { r: number; g: number; b: number };
    textColour: { r: number; g: number; b: number };
}

const initialState: { vectorsList: MoorhenVector[] } = {
    vectorsList: [],
};

export const vectorsSlice = createSlice({
    name: "mrParse",
    initialState: initialState,
    reducers: {
        addVectors: (state, action: { payload: MoorhenVector[]; type: string }) => {
            state = { ...state, vectorsList: [...state.vectorsList, ...action.payload] };
            return state;
        },
        addVector: (state, action: { payload: MoorhenVector; type: string }) => {
            state = { ...state, vectorsList: [...state.vectorsList, action.payload] };
            return state;
        },
        removeVectors: (state, action: { payload: MoorhenVector[]; type: string }) => {
        const ids = action.payload.map((x) => x.uniqueId)
            state = {
                ...state,
                vectorsList: state.vectorsList.filter((item) => !(ids.includes(item.uniqueId))),
            };
            return state;
        },
        removeVectorsMatchingIDString: (state, action: { payload: string; type: string }) => {
            state = {
                ...state,
                vectorsList: state.vectorsList.filter((item) => !(item.uniqueId.includes(action.payload))),
            };
            return state;
        },
        removeVector: (state, action: { payload: MoorhenVector; type: string }) => {
            state = {
                ...state,
                vectorsList: state.vectorsList.filter((item) => item.uniqueId !== action.payload.uniqueId),
            };
            return state;
        },
        emptyVectors: (state) => {
            return initialState;
        },
    },
});

export const { addVector, removeVector, emptyVectors, addVectors, removeVectors, removeVectorsMatchingIDString } = vectorsSlice.actions;

export default vectorsSlice.reducer;
