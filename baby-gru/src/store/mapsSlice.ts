import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { MoorhenMap } from "../utils/MoorhenMap";

const mapsSlice = createSlice({
    name: "maps",
    initialState: [] as MoorhenMap[],
    reducers: {
        addMap: (state, action: PayloadAction<MoorhenMap>) => {
            state.push(action.payload as unknown as typeof state[number]); // FIXME this is a hack to get typscript to stop complaining about the type of the payload.
            return state;
        },
        removeMap: (state, action: PayloadAction<MoorhenMap>) => {
            return state.filter(item => item.molNo !== action.payload.molNo);
        },
        emptyMaps: () => {
            return [] as MoorhenMap[];
        },
        addMapList: (state, action: PayloadAction<MoorhenMap[]>) => {
            state.push(...(action.payload as unknown as typeof state)); // FIXME this is a hack to get typscript to stop complaining about the type of the payload.
            return state;
        },
    },
});

export const { addMap, removeMap, emptyMaps, addMapList } = mapsSlice.actions;

export default mapsSlice.reducer;
