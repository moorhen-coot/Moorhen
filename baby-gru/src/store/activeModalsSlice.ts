import { createSlice } from '@reduxjs/toolkit'

export const activeModalsSlice = createSlice({
  name: 'activeModals',
  initialState: {
    showModelsModal: false,
    showMapsModal: false,
    showCreateAcedrgLinkModal: false,
    showValidationModal: false,
    showQuerySequenceModal: false,
    showScriptingModal: false,
    showControlsModal: false,
    showFitLigandModal: false,
    focusHierarchy: [],
  },
  reducers: {
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
    setShowValidationModal: (state, action: { payload: boolean, type: string }) => {
      return { ...state, showValidationModal: action.payload }
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
  }
})

export const {
  setShowModelsModal, setShowMapsModal, setShowCreateAcedrgLinkModal, 
  setShowQuerySequenceModal, setShowScriptingModal, setShowControlsModal,
  focusOnModal, unFocusModal, setShowValidationModal, setShowFitLigandModal
} = activeModalsSlice.actions

export default activeModalsSlice.reducer