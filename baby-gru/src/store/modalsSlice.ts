import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  activeModals: [],
  focusHierarchy: [],
  modalsAttachedToSideBar: [],
}

export const modalsSlice = createSlice({
  name: 'modals',
  initialState: initialState,
  reducers: {
    resetActiveModals: (state) => {
      return initialState
    },
    attachModalToSideBar: (state, action: { payload: string, type: string }) => {
      return { 
        ...state,
        modalsAttachedToSideBar: [ 
          { key: action.payload, isCollapsed: false },
          ...state.modalsAttachedToSideBar.filter(item => item.key !== action.payload).map(item => {
            return { ...item, isCollapsed: true }
          })
         ]
       }
    },
    detachModalFromSideBar: (state, action: { payload: string, type: string }) => {
      return { ...state, modalsAttachedToSideBar: [ ...state.modalsAttachedToSideBar.filter(item => item.key !== action.payload) ] }
    },
    collapseSideBarModal: (state, action: { payload: string, type: string }) => {
      return { ...state, modalsAttachedToSideBar: [ ...state.modalsAttachedToSideBar.filter(item => item.key !== action.payload), { key: action.payload, isCollapsed: true } ] }
    },
    expandSideBarModal: (state, action: { payload: string, type: string }) => {
      return { ...state, modalsAttachedToSideBar: [ ...state.modalsAttachedToSideBar.filter(item => item.key !== action.payload), { key: action.payload, isCollapsed: false } ] }
    },
    showModal: (state, action: { payload: string, type: string }) => {
      return { ...state, activeModals: [action.payload, ...state.activeModals.filter(item => item !== action.payload)] }
    },
    hideModal: (state, action: { payload: string, type: string }) => {
      return { ...state, activeModals: [...state.activeModals.filter(item => item !== action.payload)] }
    },
    focusOnModal: (state, action: { payload: string, type: string }) => {
      return { ...state, focusHierarchy: [action.payload, ...state.focusHierarchy.filter(item => item !== action.payload)] }
    },
    unFocusModal: (state, action: { payload: string, type: string }) => {
      return { ...state, focusHierarchy: [...state.focusHierarchy.filter(item => item !== action.payload)] }
    },
  }
})

export const {
  attachModalToSideBar, showModal, hideModal, detachModalFromSideBar,
  focusOnModal, unFocusModal, resetActiveModals, collapseSideBarModal, 
  expandSideBarModal
} = modalsSlice.actions

export default modalsSlice.reducer