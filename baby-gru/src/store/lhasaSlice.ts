import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  rdkitMoleculePickleList: [],
}

export const lhasaSlice = createSlice({
  name: 'lhasa',
  initialState: initialState,
  reducers: {
    resetLhasaSettings: (state) => {
        return initialState
    },
    addRdkitMoleculePickle: (state, action: {payload: { cid: string; moleculeMolNo: number; ligandName: string; pickle: string; id: string }, type: string}) => {
      return { 
        ...state,
        rdkitMoleculePickleList: [ ...state.rdkitMoleculePickleList, action.payload],
      }
    },
    removeRdkitMoleculePickle: (state, action: {payload: string, type: string}) => {
      return { 
        ...state,
        rdkitMoleculePickleList: [ ...state.rdkitMoleculePickleList.filter(item => item.id !== action.payload)],
      }
    },
},
})

export const { resetLhasaSettings, addRdkitMoleculePickle, removeRdkitMoleculePickle } = lhasaSlice.actions

export default lhasaSlice.reducer