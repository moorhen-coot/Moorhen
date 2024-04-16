import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  goToResiduePopUp: {
    show: false
  },
  matchingLigandPopUp: {
    show: false,
    refMolNo: null,
    movingMolNo: null,
    refLigandCid: null,
    movingLigandCid: null
  }
}

export const activePopUpsSlice = createSlice({
  name: 'activePopUps',
  initialState: initialState,
  reducers: {
    resetActivePopUps: (state) => {
      return initialState
    },
    setShowGoToResiduePopUp: (state, action: { payload: boolean, type: string }) => {
      return {...state, goToResiduePopUp: {...state.goToResiduePopUp, show: action.payload} }
    },
    showGoToResiduePopUp: (state) => {
      return {...state, goToResiduePopUp: { show: true } }
    },
    hideGoToResiduePopUp: (state) => {
      return {...state, goToResiduePopUp: { show: false } }
    },
    hideAcceptMatchingLigandPopUp: (state) => {
      return {...state, matchingLigandPopUp: {
        show: false,
        refMolNo: null,
        movingMolNo: null,
        refLigandCid: null,
        movingLigandCid: null
      }}
    },
    setMatchinLigandPopUpParams: (state, action: { payload: {show?: boolean; refMolNo?: number; movingMolNo?: number; refLigandCid?: string; movingLigandCid?: string;}, type: string }) => {
      return {...state, matchingLigandPopUp: {...state.matchingLigandPopUp, ...action.payload} }
    },
    setShowAcceptMatchingLigandPopUp: (state, action: { payload: boolean, type: string }) => {
      return {...state, matchingLigandPopUp: {...state.matchingLigandPopUp, show: action.payload} }
    },
  }
})

export const {
    setShowAcceptMatchingLigandPopUp, setMatchinLigandPopUpParams, hideAcceptMatchingLigandPopUp,
    showGoToResiduePopUp, hideGoToResiduePopUp, setShowGoToResiduePopUp, resetActivePopUps
} = activePopUpsSlice.actions

export default activePopUpsSlice.reducer