import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  zoomWheelSensitivityFactor: null,
  mouseSensitivity: null,
  contourWheelSensitivityFactor: null
}

export const defaultMouseSettingsSlice = createSlice({
  name: 'mouseSettings',
  initialState: initialState,
  reducers: {
    resetDefaultMouseSettings: (state) => {
      return initialState
    },
    setZoomWheelSensitivityFactor: (state, action: {payload: number, type: string}) => {
      return {...state, zoomWheelSensitivityFactor: action.payload}
    },
    setMouseSensitivity: (state, action: {payload: number, type: string}) => {
      return {...state, mouseSensitivity: action.payload}
    },
    setContourWheelSensitivityFactor: (state, action: {payload: number, type: string}) => {
        return {...state, contourWheelSensitivityFactor: action.payload}
    }
}})

export const { setContourWheelSensitivityFactor, setZoomWheelSensitivityFactor, setMouseSensitivity, resetDefaultMouseSettings } = defaultMouseSettingsSlice.actions

export default defaultMouseSettingsSlice.reducer