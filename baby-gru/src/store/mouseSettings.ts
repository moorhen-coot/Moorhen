import { createSlice } from "@reduxjs/toolkit";

const initialState: {
    contourWheelSensitivityFactor: number;
    zoomWheelSensitivityFactor: number;
    mouseSensitivity: number;
} = {
    zoomWheelSensitivityFactor: null,
    mouseSensitivity: null,
    contourWheelSensitivityFactor: null,
};

export const defaultMouseSettingsSlice = createSlice({
    name: "mouseSettings",
    initialState: initialState,
    reducers: {
        resetDefaultMouseSettings: () => {
            return initialState;
        },
        setZoomWheelSensitivityFactor: (state, action: { payload: number; type: string }) => {
            return { ...state, zoomWheelSensitivityFactor: action.payload };
        },
        setMouseSensitivity: (state, action: { payload: number; type: string }) => {
            return { ...state, mouseSensitivity: action.payload };
        },
        setContourWheelSensitivityFactor: (state, action: { payload: number; type: string }) => {
            return { ...state, contourWheelSensitivityFactor: action.payload };
        },
    },
});

export const {
    setContourWheelSensitivityFactor,
    setZoomWheelSensitivityFactor,
    setMouseSensitivity,
    resetDefaultMouseSettings,
} = defaultMouseSettingsSlice.actions;

export default defaultMouseSettingsSlice.reducer;
