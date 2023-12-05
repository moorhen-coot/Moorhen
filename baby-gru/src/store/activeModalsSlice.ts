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
  },
  reducers: {
    setShowModelsModal: (state, action: {payload: boolean, type: string}) => {
        return {...state, showModelsModal: action.payload}
      },
      setShowMapsModal: (state, action: {payload: boolean, type: string}) => {
        return {...state, showMapsModal: action.payload}
      },
      setShowCreateAcedrgLinkModal: (state, action: {payload: boolean, type: string}) => {
        return {...state, showCreateAcedrgLinkModal: action.payload}
      },
      setShowValidationModal: (state, action: {payload: boolean, type: string}) => {
        return {...state, showValidationModal: action.payload}
      },
      setShowQuerySequenceModal: (state, action: {payload: boolean, type: string}) => {
        return {...state, showQuerySequenceModal: action.payload}
      },
      setShowScriptingModal: (state, action: {payload: boolean, type: string}) => {
        return {...state, showScriptingModal: action.payload}
      },
      setShowControlsModal: (state, action: {payload: boolean, type: string}) => {
        return {...state, showControlsModal: action.payload}
      },
  }})

export const {
    setShowModelsModal, setShowMapsModal, setShowCreateAcedrgLinkModal, setShowValidationModal, 
    setShowQuerySequenceModal, setShowScriptingModal, setShowControlsModal
} = activeModalsSlice.actions

export default activeModalsSlice.reducer