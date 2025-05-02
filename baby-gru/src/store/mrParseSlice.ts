import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from '../types/moorhen'

const initialState = {
    mrParseModels: [],
    targetSequence: "",
    afJson: [],
    esmJson: [],
    homologsJson: [],
    afSortField: "seq_ident",
    homologsSortField: "seq_ident",
    afSortReversed: false,
    homologsSortReversed: false,
    AFDisplaySettings: {
        rulerStart: 0,
        start: 0,
        end: 1,
        seqLength: 1,
        displaySequence: "A"
        },
    HomologsDisplaySettings: {
        rulerStart: 0,
        start: 0,
        end: 1,
        seqLength: 1,
        displaySequence: "A"
        }
}

export const mrParseSlice = createSlice({
  name: 'mrParse',
  initialState: initialState,
  reducers: {
    setMrParseModels: (state, action: {payload: moorhen.Molecule[], type: string}) => {
        return { ...state, mrParseModels: action.payload }
    },
    setTargetSequence: (state, action: {payload: string, type: string}) => {
        return { ...state, targetSequence: action.payload }
    },
    setAfJson: (state, action: {payload: any[], type: string}) => {
        return { ...state, afJson: action.payload }
    },
    setEsmJson: (state, action: {payload: any[], type: string}) => {
        return { ...state, esmJson: action.payload }
    },
    setHomologsJson: (state, action: {payload: any[], type: string}) => {
        return { ...state, homologsJson: action.payload }
    },
    setAfSortField: (state, action: {payload: string, type: string}) => {
        return { ...state, afSortField: action.payload }
    },
    setHomologsSortField: (state, action: {payload: string, type: string}) => {
        return { ...state, homologsSortField: action.payload }
    },
    setAfSortReversed: (state, action: {payload: boolean, type: string}) => {
        return { ...state, afSortReversed: action.payload }
    },
    setHomologsSortReversed: (state, action: {payload: boolean, type: string}) => {
        return { ...state, homologsSortReversed: action.payload }
    },
    setAFDisplaySettings: (state, action: {payload: any, type: string}) => {
        return { ...state, AFDisplaySettings: action.payload }
    },
    setHomologsDisplaySettings: (state, action: {payload: any, type: string}) => {
        return { ...state, HomologsDisplaySettings: action.payload }
    },
}})

export const {
    setMrParseModels, setTargetSequence, setAfJson, setEsmJson, setHomologsJson,
    setAfSortField, setHomologsSortField, setAfSortReversed, setHomologsSortReversed,
    setAFDisplaySettings, setHomologsDisplaySettings
} = mrParseSlice.actions

export default mrParseSlice.reducer
