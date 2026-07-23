// store/chemShiftSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";


interface ChemShift {
    atom: string;
    chain: string;
    element: string;
    isotope: number;
    resname: string;
    seq: number;
    chemshift: number;
    uncertainty?: number;
}

export interface ChemShiftState {
    data: ChemShift[];
}

const initialState: ChemShiftState = {
    data: []
};

const chemShiftSlice = createSlice({
    name: "chemShifts",
    initialState,
    reducers: {
        setChemShifts: (state, action: PayloadAction<ChemShift[]>) => {
            state = {data: action.payload}
            // state.data = action.payload;
            // state = {...state, action.payload};
            return state
        },
        clearChemShifts: (state) => {
            return initialState
        }
    }
});

export const { setChemShifts, clearChemShifts } = chemShiftSlice.actions;
export default chemShiftSlice.reducer;  