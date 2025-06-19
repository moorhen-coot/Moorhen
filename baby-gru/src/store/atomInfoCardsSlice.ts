import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from "../types/moorhen"
import { DisplayBuffer } from '../WebGLgComponents/displayBuffer'

const initialState = {
    atomInfoIds: [],
}

export const atomInfoCardsSlice = createSlice({
  name: 'atomInfoCards',
  initialState: initialState,
  reducers: {
    setAtomInfoIds: (state, action: {payload: any[], type: string}) => {
        return { ...state, atomInfoIds: action.payload }
    },
}})

export const { 
    setAtomInfoIds
} = atomInfoCardsSlice.actions

export default atomInfoCardsSlice.reducer
