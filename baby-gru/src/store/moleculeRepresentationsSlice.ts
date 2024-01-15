import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from "../types/moorhen"

export const moleculeRepresentationsSlice = createSlice({
  name: 'moleculeRepresentations',
  initialState: {
    visibleMolecules: [],
    representations: [],
    visibleRepresentations: [],
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
    addRepresentation: (state, action: {payload: { molNo: number; representationId: string }, type: string}) => {
      state = { 
        ...state,
        representations: [
          ...state.representations.filter(item => item.molNo !== action.payload.molNo && item.representationId !== action.payload.representationId), 
          action.payload 
        ],
        visibleRepresentations: [
          ...state.visibleRepresentations.filter(item => item.molNo !== action.payload.molNo && item.representationId !== action.payload.representationId), 
          action.payload 
        ]
      }
      return state
    },
    removeRepresentation: (state, action: {payload: { molNo: number; representationId: string }, type: string}) => {
      state = { 
        ...state,
        representations: [
          ...state.representations.filter(item => item.molNo !== action.payload.molNo && item.representationId !== action.payload.representationId)
        ],
        visibleRepresentations: [
          ...state.visibleRepresentations.filter(item => item.molNo !== action.payload.molNo && item.representationId !== action.payload.representationId)
        ]
      }
      return state
    },
    hideRepresentation: (state, action: {payload: { molNo: number; representationId: string }, type: string}) => {
      state = { 
        ...state,
        visibleRepresentations: [
          ...state.visibleRepresentations.filter(item => item.molNo !== action.payload.molNo && item.representationId !== action.payload.representationId)
        ] 
      }
      return state
    },
    showRepresentation: (state, action: {payload: { molNo: number; representationId: string }, type: string}) => {
      state = { 
        ...state,
        visibleRepresentations: [
          ...state.visibleRepresentations.filter(item => item.molNo !== action.payload.molNo && item.representationId !== action.payload.representationId), 
          action.payload 
        ] 
      }
      return state
    },
},
})

export const {
  showMolecule, hideMolecule, removeRepresentation, hideRepresentation, showRepresentation, addRepresentation
} = moleculeRepresentationsSlice.actions

export default moleculeRepresentationsSlice.reducer