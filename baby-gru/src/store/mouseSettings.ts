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
        // API
        resetDefaultMouseSettings: () => {
            return initialState;
        },
        // API
        setZoomWheelSensitivityFactor: (state, action: { payload: number; type: string }) => {
            return { ...state, zoomWheelSensitivityFactor: action.payload };
        },
        // API
        setMouseSensitivity: (state, action: { payload: number; type: string }) => {
            return { ...state, mouseSensitivity: action.payload };
        },
        // API
        setContourWheelSensitivityFactor: (state, action: { payload: number; type: string }) => {
            return { ...state, contourWheelSensitivityFactor: action.payload };
        },
    },
});

export const { setContourWheelSensitivityFactor, setZoomWheelSensitivityFactor, setMouseSensitivity, resetDefaultMouseSettings } =
    defaultMouseSettingsSlice.actions;

export default defaultMouseSettingsSlice.reducer;
