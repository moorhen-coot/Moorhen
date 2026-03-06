import { createSlice } from "@reduxjs/toolkit";

const initialState: {
    rdkitMoleculePickleList: { cid: string; moleculeMolNo: number; ligandName: string; pickle: string; id: string }[];
} = {
    rdkitMoleculePickleList: [],
};

export const lhasaSlice = createSlice({
    name: "lhasa",
    initialState: initialState,
    reducers: {
        resetLhasaSettings: () => {
            return initialState;
        },
        addRdkitMoleculePickle: (
            state,
            action: {
                payload: { cid: string; moleculeMolNo: number; ligandName: string; pickle: string; id: string };
                type: string;
            }
        ) => {
            return {
                ...state,
                rdkitMoleculePickleList: [...state.rdkitMoleculePickleList, action.payload],
            };
        },
        removeRdkitMoleculePickle: (state, action: { payload: string; type: string }) => {
            return {
                ...state,
                rdkitMoleculePickleList: [
                    ...state.rdkitMoleculePickleList.filter((item) => item.id !== action.payload),
                ],
            };
        },
        emptyRdkitMoleculePickleList: (state) => {
            return {
                ...state,
                rdkitMoleculePickleList: [],
            };
        },
    },
});

export const { resetLhasaSettings, addRdkitMoleculePickle, removeRdkitMoleculePickle, emptyRdkitMoleculePickleList } =
    lhasaSlice.actions;

export default lhasaSlice.reducer;
