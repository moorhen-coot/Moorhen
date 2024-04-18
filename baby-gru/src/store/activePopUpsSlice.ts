import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  goToResiduePopUp: {
    show: false
  },
  modelTrajectoryPopUp: {
    show: false,
    representationStyle: null,
    moleculeMolNo: null
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
    setShowModelTrajectoryPopUp: (state, action: { payload: boolean, type: string }) => {
      return {...state, modelTrajectoryPopUp: {...state.modelTrajectoryPopUp, show: action.payload} }
    },
    setModelTrajectoryPopUpParams: (state, action: { payload: {show?: boolean; representationStyle?: string; moleculeMolNo?: number;}, type: string }) => {
      return {...state, modelTrajectoryPopUp: {...state.modelTrajectoryPopUp, ...action.payload} }
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
    showGoToResiduePopUp, hideGoToResiduePopUp, setShowGoToResiduePopUp, resetActivePopUps,
    setShowModelTrajectoryPopUp, setModelTrajectoryPopUpParams
} = activePopUpsSlice.actions

export default activePopUpsSlice.reducer