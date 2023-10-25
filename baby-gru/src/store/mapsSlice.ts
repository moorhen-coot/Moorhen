import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from "../types/moorhen"

export const mapsSlice = createSlice({
  name: 'maps',
  initialState: [],
  reducers: {
    addMap: (state: moorhen.Map[], action: {payload: moorhen.Map, type: string}) => {
        state.push(action.payload)
        return state
    },
    removeMap: (state: moorhen.Map[], action: {payload: moorhen.Map, type: string}) => {
      return state.filter(item => item.molNo !== action.payload.molNo)
    },
    emptyMaps: (state: moorhen.Map[]) => {
      return []
    },
    addMapList: (state: moorhen.Map[], action: {payload: moorhen.Map[], type: string}) => {
      state.push(...action.payload)
      return state
  },
},
})

export const { addMap, removeMap, emptyMaps, addMapList } = mapsSlice.actions

export default mapsSlice.reducer