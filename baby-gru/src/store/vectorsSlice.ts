import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from '../types/moorhen'

const initialState = {
    vectorsList: [],
}

export const vectorsSlice = createSlice({
  name: 'mrParse',
  initialState: initialState,
  reducers: {
    addVector: (state, action: {payload: moorhen.MoorhenVector, type: string}) => {
      state = { ...state, vectorsList: [...state.vectorsList, action.payload] }
      return state
    },
    removeVector: (state, action: {payload: moorhen.MoorhenVector, type: string}) => {
      state = {
        ...state,
        vectorsList: state.vectorsList.filter(item => item.uniqueId !== action.payload.uniqueId) 
      }
      return state
    },
    emptyVectors: (state) => {
      return initialState
    },
    
}})

export const {
    addVector, removeVector, emptyVectors
} = vectorsSlice.actions

export default vectorsSlice.reducer
