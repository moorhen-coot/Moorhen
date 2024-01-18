import { createSlice } from '@reduxjs/toolkit'

export const activeModalsSlice = createSlice({
  name: 'activeModals',
  initialState: {
    showModelsModal: false,
    showMapsModal: false,
    showCreateAcedrgLinkModal: false,
    showQuerySequenceModal: false,
    showScriptingModal: false,
    showControlsModal: false,
    showFitLigandModal: false,
    showRamaPlotModal: false,
    showDiffMapPeaksModal: false,
    showValidationPlotModal: false,
    showLigandValidationModal: false,
    showPepFlipsValidationModal: false,
    showFillPartialResValidationModal: false,
    showUnmodelledBlobsModal: false,
    showMmrrccModal: false,
    showWaterValidationModal: false,
    showSceneSettingsModal: false,
    focusHierarchy: [],
  },
  reducers: {
    setShowSceneSettingsModal: (state, action: { payload: boolean, type: string }) => {
      return {...state, showSceneSettingsModal: action.payload }
    },
    setShowWaterValidationModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showWaterValidationModal: action.payload }
    },
    setShowMmrrccModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showMmrrccModal: action.payload }
    },
    setShowUnmodelledBlobsModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showUnmodelledBlobsModal: action.payload }
    },
    setShowValidationPlotModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showValidationPlotModal: action.payload }
    },
    setShowLigandValidationModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showLigandValidationModal: action.payload }
    },
    setShowPepFlipsValidationModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showPepFlipsValidationModal: action.payload }
    },
    setShowFillPartialResValidationModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showFillPartialResValidationModal: action.payload }
    },
    focusOnModal: (state, action: { payload: string, type: string }) => {
      return { ...state, focusHierarchy: [action.payload, ...state.focusHierarchy.filter(item => item !== action.payload)] }
    },
    unFocusModal: (state, action: { payload: string, type: string }) => {
      return { ...state, focusHierarchy: [...state.focusHierarchy.filter(item => item !== action.payload)] }
    },
    setShowModelsModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showModelsModal: action.payload }
    },
    setShowFitLigandModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showFitLigandModal: action.payload }
    },
    setShowMapsModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showMapsModal: action.payload }
    },
    setShowCreateAcedrgLinkModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showCreateAcedrgLinkModal: action.payload }
    },
    setShowQuerySequenceModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showQuerySequenceModal: action.payload }
    },
    setShowScriptingModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showScriptingModal: action.payload }
    },
    setShowControlsModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showControlsModal: action.payload }
    },
    setShowRamaPlotModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showRamaPlotModal: action.payload }
    },
    setShowDiffMapPeaksModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showDiffMapPeaksModal: action.payload }
    },
  }
})

export const {
  setShowModelsModal, setShowMapsModal, setShowCreateAcedrgLinkModal, 
  setShowQuerySequenceModal, setShowScriptingModal, setShowControlsModal,
  focusOnModal, unFocusModal, setShowFitLigandModal, setShowRamaPlotModal, 
  setShowLigandValidationModal, setShowPepFlipsValidationModal, setShowMmrrccModal,
  setShowWaterValidationModal, setShowValidationPlotModal, setShowUnmodelledBlobsModal,
  setShowDiffMapPeaksModal, setShowFillPartialResValidationModal, setShowSceneSettingsModal
} = activeModalsSlice.actions

export default activeModalsSlice.reducer