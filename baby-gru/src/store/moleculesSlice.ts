import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from "../types/moorhen"

export const moleculesSlice = createSlice({
  name: 'molecules',
  initialState: {
    visibleMolecules: [],
    customRepresentations: [],
    moleculeList: [],
  },
  reducers: {
    addMolecule: (state, action: {payload: moorhen.Molecule, type: string}) => {
      state = { ...state, moleculeList: [...state.moleculeList, action.payload] }
      return state
    },
    removeMolecule: (state, action: {payload: moorhen.Molecule, type: string}) => {
      state = {
        ...state,
        customRepresentations: state.customRepresentations.filter(item => item.parentMolecule.molNo !== action.payload.molNo),
        visibleMolecules: state.visibleMolecules.filter(item => item !== action.payload.molNo),
        moleculeList: state.moleculeList.filter(item => item.molNo !== action.payload.molNo) 
      }
      return state
    },
    emptyMolecules: (state) => {
      state = {
        visibleMolecules: [],
        customRepresentations: [],
        moleculeList: [],
      }
      return state
    },
    addMoleculeList: (state, action: {payload: moorhen.Molecule[], type: string}) => {
      state = { ...state, moleculeList: [...state.moleculeList, ...action.payload] }
      return state
    },
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
    addCustomRepresentation: (state, action: {payload: moorhen.MoleculeRepresentation, type: string}) => {
      state = { ...state, customRepresentations: [...state.customRepresentations, action.payload] }
      return state
    },
    removeCustomRepresentation: (state, action: {payload: moorhen.MoleculeRepresentation, type: string}) => {
      state = { ...state, customRepresentations: state.customRepresentations.filter(item => item.uniqueId !== action.payload.uniqueId) }
      return state
    },
  },
})

export const { 
  addMolecule, removeMolecule, emptyMolecules, addMoleculeList,
  showMolecule, hideMolecule, addCustomRepresentation, removeCustomRepresentation
 } = moleculesSlice.actions

export default moleculesSlice.reducer