import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { matchesTags, Tags } from "../utils/tags";

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
    /**
     * Who made this vector, and how it should group. See utils/tags.
     *
     * Replaces both customTags below and the older habit of writing a tag into uniqueId.
     */
    tags?: Tags;
    /**
     * @deprecated Superseded by `tags`. Kept so a session saved earlier round-trips unchanged;
     * nothing reads it.
     */
    customTags?: string[]
    dashSpacing?: number;
    arrowHeadLength?: number;
    arrowHeadRadiusScale?: number;
    labelFontSize?: number;
    labelScreenOffsetDistance?: number;
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
        /**
         * @deprecated Matches a substring of uniqueId, from when a tag was written into the
         * identifier. Use removeVectorsByTag. Kept because it is public and takes an arbitrary
         * string, so identifiers in the wild carry tags that cannot be migrated.
         */
        removeVectorsMatchingIDString: (state, action: PayloadAction<string>) => {
            state.vectorsList = state.vectorsList.filter(item => !item.uniqueId.includes(action.payload));
        },
        // API
        /**
         * Remove every vector carrying all of the given tags. One pair removes a whole group,
         * several narrow it: { source: "xpid" } takes every XPID vector, and adding
         * { molecule: uid } restricts it to one molecule's. An empty query removes nothing, so
         * that a tag object which came out empty by accident cannot clear the scene; use
         * emptyVectors to mean all of them.
         */
        removeVectorsByTag: (state, action: PayloadAction<Tags>) => {
            const query = action.payload;
            if (!query || Object.keys(query).length === 0) {
                return;
            }
            state.vectorsList = state.vectorsList.filter(item => !matchesTags(item, query));
        },
        // API
        /** Remove one vector by its uniqueId, without needing the vector itself. */
        removeVectorById: (state, action: PayloadAction<string>) => {
            state.vectorsList = state.vectorsList.filter(item => item.uniqueId !== action.payload);
        },
        // API
        /** Remove several vectors by their uniqueIds, without needing the vectors themselves. */
        removeVectorsByIds: (state, action: PayloadAction<string[]>) => {
            const ids = new Set(action.payload);
            state.vectorsList = state.vectorsList.filter(item => !ids.has(item.uniqueId));
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

export const {
    addVector,
    removeVector,
    emptyVectors,
    addVectors,
    removeVectors,
    removeVectorsMatchingIDString,
    removeVectorsByTag,
    removeVectorById,
    removeVectorsByIds
} = vectorsSlice.actions;

export default vectorsSlice.reducer;
