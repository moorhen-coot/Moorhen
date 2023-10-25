import { createSlice } from '@reduxjs/toolkit'

export const defaultMouseSettings = createSlice({
  name: 'mouseSettings',
  initialState: {
    zoomWheelSensitivityFactor: null,
    mouseSensitivity: null,
    contourWheelSensitivityFactor: null
  },
  reducers: {
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

export const { setContourWheelSensitivityFactor, setZoomWheelSensitivityFactor, setMouseSensitivity } = defaultMouseSettings.actions

export default defaultMouseSettings.reducer