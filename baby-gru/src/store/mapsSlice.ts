import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { MoorhenMap } from "../utils/MoorhenMap";

const initialState: MoorhenMap[] = [];

const mapsSlice = createSlice({
    name: "maps",
    initialState,
    reducers: {
        addMap: (state, action: PayloadAction<MoorhenMap>) => {
            state.push(action.payload);
            return state;
        },
        removeMap: (state, action: PayloadAction<MoorhenMap>) => {
            return state.filter(item => item.molNo !== action.payload.molNo);
        },
        emptyMaps: () => {
            return [] as MoorhenMap[];
        },
        addMapList: (state, action: PayloadAction<MoorhenMap[]>) => {
            state.push(...action.payload);
            return state;
        },
    },
});

export const { addMap, removeMap, emptyMaps, addMapList } = mapsSlice.actions;

export default mapsSlice.reducer;
