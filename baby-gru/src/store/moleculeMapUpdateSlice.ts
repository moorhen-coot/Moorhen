import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from '../types/moorhen'

export const moleculeMapUpdateSlice = createSlice({
  name: 'moleculeMapUpdateSlice',
  initialState: {
    updatingMapsIsEnabled: false,
    connectedMolecule: null,
    reflectionMap: null,
    twoFoFcMap: null,
    foFcMap: null,
    uniqueMaps: [],
    defaultUpdatingScores: null,
    showScoresToast: null,
    moleculeUpdate: { switch: false, molNo: null },
  },
  reducers: {
    triggerUpdate: (state, action: {payload: number, type: string}) => {
        return {
            ...state, 
            moleculeUpdate: {
                molNo: action.payload,
                switch: !state.moleculeUpdate.switch
            }
        }
    },  
    setShowScoresToast: (state, action: {payload: boolean, type: string}) => {
        return {...state, showScoresToast: action.payload}
    },
    addMapUpdatingScore: (state, action: {payload: string, type: string}) => {
        return {...state, defaultUpdatingScores: [...state.defaultUpdatingScores, action.payload]}
    },
    removeMapUpdatingScore: (state, action: {payload: string, type: string}) => {
      return {...state, defaultUpdatingScores: state.defaultUpdatingScores.filter(item => item !== action.payload)}
    },
    overwriteMapUpdatingScores: (state, action: {payload: string[], type: string}) => {
      return {...state, defaultUpdatingScores: action.payload}
    },  
    enableUpdatingMaps: (state) => {
        return {...state, updatingMapsIsEnabled: true }
    },
    disableUpdatingMaps: (state) => {
        return {
            ...state,
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
    setConnectedMolecule, enableUpdatingMaps, disableUpdatingMaps, setReflectionMap,
    setFoFcMap, setTwoFoFcMap, setReflectionMapMolNo, overwriteMapUpdatingScores,
    setConnectedMoleculeMolNo, setFoFcMapMolNo, setTwoFoFcMapMolNo, removeMapUpdatingScore,
    setShowScoresToast, addMapUpdatingScore, triggerUpdate
} = moleculeMapUpdateSlice.actions

export default moleculeMapUpdateSlice.reducer