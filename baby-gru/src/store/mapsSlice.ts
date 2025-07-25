import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { moorhen } from "../types/moorhen"

export const mapsSlice = createSlice({
  name: 'maps',
  initialState: [] as moorhen.Map[],
  reducers: {
    addMap: (state, action: PayloadAction<moorhen.Map>) => {
        state.push(action.payload)
        return state
    },
    removeMap: (state, action: PayloadAction<moorhen.Map>) => {
      return state.filter(item => item.molNo !== action.payload.molNo)
    },
    emptyMaps: () => {
      return [] as moorhen.Map[]
    },
    addMapList: (state, action: PayloadAction<moorhen.Map[]>) => {
      state.push(...action.payload)
      return state
  },
},
})

export const { addMap, removeMap, emptyMaps, addMapList } = mapsSlice.actions

export default mapsSlice.reducer