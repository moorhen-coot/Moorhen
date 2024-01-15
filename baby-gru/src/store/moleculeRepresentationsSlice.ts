import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from "../types/moorhen"

export const moleculeRepresentationsSlice = createSlice({
  name: 'moleculeRepresentations',
  initialState: {
    visibleMolecules: [],
  },
  reducers: {
    showMolecule: (state, action: {payload: moorhen.Molecule, type: string}) => {
        if (!state.visibleMolecules.includes(action.payload.molNo)) {
          state = { ...state, visibleMolecules: [...state.visibleMolecules, action.payload.molNo] }
        }
        return state
    },
    hideMolecule: (state, action: {payload: moorhen.Molecule, type: string}) => {
      state = { ...state, visibleMolecules: state.visibleMolecules.filter(item => item !== action.payload.molNo) }
      return state
    },
},
})

export const {
  showMolecule, hideMolecule
} = moleculeRepresentationsSlice.actions

export default moleculeRepresentationsSlice.reducer