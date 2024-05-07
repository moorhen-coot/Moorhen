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
  tomogramPopUp: {
    show: false,
    mapMolNo: null
  },
}

export const activePopUpsSlice = createSlice({
  name: 'activePopUps',
  initialState: initialState,
  reducers: {
    resetActivePopUps: (state) => {
      return initialState
    },
    setShowTomogramPopUp: (state, action: { payload: boolean, type: string }) => {
      return {...state, tomogramPopUp: {...state.tomogramPopUp, show: action.payload} }
    },
    setTomogramPopUpParams: (state, action: { payload: {show?: boolean; mapMolNo?: number;}, type: string }) => {
      return {...state, tomogramPopUp: {...state.tomogramPopUp, ...action.payload} }
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
  }
})

export const {
    showGoToResiduePopUp, hideGoToResiduePopUp, setShowGoToResiduePopUp, resetActivePopUps,
    setShowModelTrajectoryPopUp, setModelTrajectoryPopUpParams, setShowTomogramPopUp,
    setTomogramPopUpParams
} = activePopUpsSlice.actions

export default activePopUpsSlice.reducer