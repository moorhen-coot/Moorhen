import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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
    molFromUniqueId: string;
    molToUniqueId: string;
    uniqueId: string;
    vectorColour: { r: number; g: number; b: number };
    textColour: { r: number; g: number; b: number };
    radius?: number;
    dashSpacing?: number;
    arrowHeadLength?: number;
    arrowHeadRadiusScale?: number;
    labelFontSize?: number;
    labelScreenOffsetDistance?: number;
    visible?: boolean;
    ambiguous?: boolean
}

const initialState: { vectorsList: MoorhenVector[] } = {
    vectorsList: [],
};

const vectorsSlice = createSlice({
    name: "vectors",
    initialState: initialState,
    reducers: {
        // API
        addVectors: (state, action: PayloadAction<MoorhenVector[]>) => {
            state.vectorsList.push(...action.payload);
        },
        // API
        addVector: (state, action: PayloadAction<MoorhenVector>) => {
            state.vectorsList.push(action.payload);
        },
        // API
        removeVectors: (state, action: PayloadAction<MoorhenVector[]>) => {
            const ids = action.payload.map(x => x.uniqueId);
            state.vectorsList = state.vectorsList.filter(item => !ids.includes(item.uniqueId));
        },
        // API
        removeVectorsMatchingIDString: (state, action: PayloadAction<string>) => {
            state.vectorsList = state.vectorsList.filter(item => !item.uniqueId.includes(action.payload));
        },
        // API
        removeVector: (state, action: PayloadAction<MoorhenVector>) => {
            state.vectorsList = state.vectorsList.filter(item => item.uniqueId !== action.payload.uniqueId);
        },
        // API
        emptyVectors: state => {
            return initialState;
        },
    },
});

export const { addVector, removeVector, emptyVectors, addVectors, removeVectors, removeVectorsMatchingIDString } = vectorsSlice.actions;

export default vectorsSlice.reducer;
