import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from '../types/moorhen'

export const hoveringStatesSlice = createSlice({
  name: 'hoveringStates',
  initialState: {
    enableAtomHovering: true,
    hoveredAtom: { molecule: null, cid: null } as { molecule: null | moorhen.Molecule, cid: null | string },
    cursorStyle: 'default'
  },
  reducers: {
    setHoveredAtom: (state, action: {payload: { molecule: null | moorhen.Molecule, cid: null | string }, type: string}) => {
        return {...state, hoveredAtom: action.payload}
    },
    setEnableAtomHovering: (state, action: {payload: boolean, type: string}) => {
        return {...state, enableAtomHovering: action.payload}
    },
    setCursorStyle: (state, action: {payload: string, type: string}) => {
        return {...state, cursorStyle: action.payload}
    },
}})

export const { setCursorStyle, setEnableAtomHovering, setHoveredAtom } = hoveringStatesSlice.actions

export default hoveringStatesSlice.reducer