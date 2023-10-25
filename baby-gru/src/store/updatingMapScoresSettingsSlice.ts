import { createSlice } from '@reduxjs/toolkit'

export const updatingMapScoresSettingsSlice = createSlice({
  name: 'updatingMapScoresSettings',
  initialState: {
    defaultUpdatingScores: null,
    showScoresToast: null,
  },
  reducers: {
    setShowScoresToast: (state, action: {payload: boolean, type: string}) => {
      return {...state, showScoresToast: action.payload}
    },
    addMapUpdatingScore: (state, action: {payload: string, type: string}) => {
        return {...state, defaultUpdatingScores: [...state.defaultUpdatingScores, action.payload]}
    },
    removeMapUpdatingScore: (state, action: {payload: string, type: string}) => {
        return {...state, defaultUpdatingScores: state.defaultUpdatingScores.filter(item => item !== action.payload)}
    },
    overwriteMapUpdatingScores: (state, action: {payload: string[], type: string}) => {
        return {...state, defaultUpdatingScores: action.payload}
    }
}})

export const { setShowScoresToast, addMapUpdatingScore, removeMapUpdatingScore, overwriteMapUpdatingScores } = updatingMapScoresSettingsSlice.actions

export default updatingMapScoresSettingsSlice.reducer