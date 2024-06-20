import { createSlice } from '@reduxjs/toolkit'

const initialState = {
    inputLigandInfo: null
}
    
export const lhasaSlice = createSlice({
  name: 'lhasa',
  initialState: initialState,
  reducers: {
    resetLhasaSettings: (state) => {
        return initialState
    },
    setLhasaInputLigandInfo: (state, action: {payload: { cid: string; moleculeMolNo: number; ligandName: string }, type: string}) => {
        return { ...state, inputLigandInfo: action.payload}
    },
  },
})

export const { resetLhasaSettings, setLhasaInputLigandInfo } = lhasaSlice.actions

export default lhasaSlice.reducer