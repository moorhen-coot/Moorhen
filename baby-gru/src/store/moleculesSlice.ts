import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from "../types/moorhen"

export const moleculesSlice = createSlice({
  name: 'molecules',
  initialState: [],
  reducers: {
    addMolecule: (state: moorhen.Molecule[], action: {payload: moorhen.Molecule, type: string}) => {
        state.push(action.payload)
        return state
    },
    removeMolecule: (state: moorhen.Molecule[], action: {payload: moorhen.Molecule, type: string}) => {
      return state.filter(item => item.molNo !== action.payload.molNo)
    },
    emptyMolecules: (state: moorhen.Molecule[]) => {
      return []
    },
    addMoleculeList: (state: moorhen.Molecule[], action: {payload: moorhen.Molecule[], type: string}) => {
      state.push(...action.payload)
      return state
  },
},
})

export const { addMolecule, removeMolecule, emptyMolecules, addMoleculeList } = moleculesSlice.actions

export default moleculesSlice.reducer