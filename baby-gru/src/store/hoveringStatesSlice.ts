import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from '../types/moorhen'

const initialState = {
  enableAtomHovering: true,
  hoveredAtom: { molecule: null, cid: null } as moorhen.HoveredAtom,
  cursorStyle: 'default'
}

export const hoveringStatesSlice = createSlice({
  name: 'hoveringStates',
  initialState: initialState,
  reducers: {
    resetHoveringStates: (state) => {
      return initialState
    },
    setHoveredAtom: (state, action: {payload: moorhen.HoveredAtom, type: string}) => {
        return {...state, hoveredAtom: action.payload}
    },
    setEnableAtomHovering: (state, action: {payload: boolean, type: string}) => {
        return {...state, enableAtomHovering: action.payload}
    },
    setCursorStyle: (state, action: {payload: string, type: string}) => {
        return {...state, cursorStyle: action.payload}
    },
}})

export const { setCursorStyle, setEnableAtomHovering, setHoveredAtom, resetHoveringStates } = hoveringStatesSlice.actions

export default hoveringStatesSlice.reducer