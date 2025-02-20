import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from '../types/moorhen'

const initialState = {
  devMode: null,
  useGemmi: null,
  userPreferencesMounted: false,
  appTitle: 'Moorhen',
  cootInitialized: false,
  activeMap: null,
  theme: 'flatly',
  viewOnly: false,
  residueSelection: { molecule: null, first: null, second: null, cid: null, isMultiCid: false, label: null } as moorhen.ResidueSelection,
  showResidueSelection: false,
  defaultExpandDisplayCards: null,
  transparentModalsOnMouseOut: null,
  isShowingTomograms: false,
  isAnimatingTrajectory: false,
  isChangingRotamers: false,
  isDraggingAtoms: false,
  isRotatingAtoms: false,
  newCootCommandExit: false,
  newCootCommandStart: false,
  useRamaRefinementRestraints: false,
  useTorsionRefinementRestraints: false,
}

export const generalStatesSlice = createSlice({
  name: 'generalStates',
  initialState: initialState,
  reducers: {
    resetGeneralStates: (state) => {
      return initialState
    },
    setIsShowingTomograms: (state, action: {payload: boolean, type: string}) => {
      return {...state, isShowingTomograms: action.payload}
    },
    setIsAnimatingTrajectory: (state, action: {payload: boolean, type: string}) => {
      return {...state, isAnimatingTrajectory: action.payload}
    },
    setShowResidueSelection: (state, action: {payload: boolean, type: string}) => {
      return {...state, showResidueSelection: action.payload}
    },
    toggleCootCommandStart: (state) => {
      return {...state, newCootCommandStart: !state.newCootCommandStart}
    },
    toggleCootCommandExit: (state) => {
      return {...state, newCootCommandExit: !state.newCootCommandExit}
    },
    setIsChangingRotamers: (state, action: {payload: boolean, type: string}) => {
      return {...state, isChangingRotamers: action.payload}
    },
    setIsDraggingAtoms: (state, action: {payload: boolean, type: string}) => {
      return {...state, isDraggingAtoms: action.payload}
    },
    setIsRotatingAtoms: (state, action: {payload: boolean, type: string}) => {
      return {...state, isRotatingAtoms: action.payload}
    },
    setTheme: (state, action: {payload: string, type: string}) => {
      return {...state, theme: action.payload}
    },
    setViewOnly: (state, action: {payload: boolean, type: string}) => {
      return {...state, viewOnly: action.payload}
    },
    setActiveMap: (state, action: {payload: moorhen.Map, type: string}) => {
      return {...state, activeMap: action.payload}
    },
    setCootInitialized: (state, action: {payload: boolean, type: string}) => {
      return {...state, cootInitialized: action.payload}
    },
    setAppTittle: (state, action: {payload: string, type: string}) => {
      return {...state, appTitle: action.payload}
    },
    setUserPreferencesMounted: (state, action: {payload: boolean, type: string}) => {
      return {...state, userPreferencesMounted: action.payload}
    },
    setDevMode: (state, action: {payload: boolean, type: string}) => {
        return {...state, devMode: action.payload}
    },
    setUseGemmi: (state, action: {payload: boolean, type: string}) => {
        return {...state, useGemmi: action.payload}
    },
    clearResidueSelection: (state) => {
      return {...state, residueSelection: { molecule: null, first: null, second: null, cid: null, isMultiCid: false, label: null }}
    },
    setResidueSelection: (state, action: {payload: moorhen.ResidueSelection, type: string}) => {
      return {...state, residueSelection: action.payload}
    },
    setMoleculeResidueSelection: (state, action: {payload: moorhen.Molecule, type: string}) => {
      const newResidueSelection = {...state.residueSelection, molecule: action.payload}
      return {...state, residueSelection: newResidueSelection}
    },
    setStopResidueSelection: (state, action: {payload: string, type: string}) => {
      const newResidueSelection = {...state.residueSelection, stop: action.payload}
      return {...state, residueSelection: newResidueSelection}
    },
    setStartResidueSelection: (state, action: {payload: string, type: string}) => {
      const newResidueSelection = {...state.residueSelection, start: action.payload}
      return {...state, residueSelection: newResidueSelection}
    },
    setCidResidueSelection: (state, action: {payload: string, type: string}) => {
      const newResidueSelection = {...state.residueSelection, cid: action.payload}
      return {...state, residueSelection: newResidueSelection}
    },
    setDefaultExpandDisplayCards: (state, action: {payload: boolean, type: string}) => {
      return {...state, defaultExpandDisplayCards: action.payload}
    },
    setTransparentModalsOnMouseOut: (state, action: {payload: boolean, type: string}) => {
      return {...state, transparentModalsOnMouseOut: action.payload}
    },
}})

export const {
  setActiveMap, setViewOnly, setTheme, setIsDraggingAtoms,
  setAppTittle, setUserPreferencesMounted, setDevMode, setCootInitialized, 
  setStopResidueSelection, setStartResidueSelection, clearResidueSelection,
  setMoleculeResidueSelection, setResidueSelection, setCidResidueSelection,
  setIsRotatingAtoms, setIsChangingRotamers, setShowResidueSelection,
  toggleCootCommandExit, toggleCootCommandStart, setIsAnimatingTrajectory,
  resetGeneralStates, setIsShowingTomograms, setDefaultExpandDisplayCards,
  setTransparentModalsOnMouseOut, setUseGemmi
} = generalStatesSlice.actions

export default generalStatesSlice.reducer
