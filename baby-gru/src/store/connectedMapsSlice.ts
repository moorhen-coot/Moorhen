import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from '../types/moorhen'

export const connectedMapsSlice = createSlice({
  name: 'hoveringStates',
  initialState: {
    updatingMapsIsEnabled: false,
    connectedMolecule: null,
    reflectionMap: null,
    twoFoFcMap: null,
    foFcMap: null,
    uniqueMaps: [],
  },
  reducers: {
    enableUpdatingMaps: (state) => {
        return {...state, updatingMapsIsEnabled: true }
    },
    disableUpdatingMaps: (state) => {
        return {
            updatingMapsIsEnabled: false,
            connectedMolecule: null,
            reflectionMap: null,
            twoFoFcMap: null,
            foFcMap: null,
            uniqueMaps: [],
        }
    },
    setReflectionMap: (state, action: {payload: moorhen.Map, type: string}) => {
        return {
            ...state,
            reflectionMap: action.payload.molNo
        }
    },
    setReflectionMapMolNo: (state, action: {payload: number, type: string}) => {
        return {
            ...state,
            reflectionMap: action.payload
        }
    },
    setFoFcMap: (state, action: {payload: moorhen.Map, type: string}) => {
        return {
            ...state,
            foFcMap: action.payload.molNo,
            uniqueMaps: [...new Set([state.twoFoFcMap, action.payload.molNo])]
        }
    },
    setFoFcMapMolNo: (state, action: {payload: number, type: string}) => {
        return {
           ...state,
            foFcMap: action.payload,
            uniqueMaps: [...new Set([state.twoFoFcMap, action.payload])]
        }
    },
    setTwoFoFcMap: (state, action: {payload: moorhen.Map, type: string}) => {
        return {
            ...state, 
            twoFoFcMap: action.payload.molNo,
            uniqueMaps: [...new Set([action.payload.molNo, state.foFcMap])]
        }
    },
    setTwoFoFcMapMolNo: (state, action: {payload: number, type: string}) => {
        return {
            ...state,
            twoFoFcMap: action.payload,
            uniqueMaps: [...new Set([action.payload, state.foFcMap])]
        }
    },
    setConnectedMolecule: (state, action: {payload: moorhen.Molecule, type: string}) => {
        return {...state, connectedMolecule: action.payload.molNo}
    },
    setConnectedMoleculeMolNo: (state, action: {payload: number, type: string}) => {
        return {...state, connectedMolecule: action.payload}
    }
}})

export const {
    setConnectedMolecule, enableUpdatingMaps, disableUpdatingMaps,
    setReflectionMap, setFoFcMap, setTwoFoFcMap, setReflectionMapMolNo,
    setConnectedMoleculeMolNo, setFoFcMapMolNo, setTwoFoFcMapMolNo
} = connectedMapsSlice.actions

export default connectedMapsSlice.reducer