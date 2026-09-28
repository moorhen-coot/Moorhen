import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: {
    contourWheelSensitivityFactor: number;
    zoomWheelSensitivityFactor: number;
    mouseSensitivity: number;
} = {
    zoomWheelSensitivityFactor: null,
    mouseSensitivity: null,
    contourWheelSensitivityFactor: null,
};

const defaultMouseSettingsSlice = createSlice({
    name: "mouseSettings",
    initialState: initialState,
    reducers: {
        // API
        resetDefaultMouseSettings: () => {
            return initialState;
        },
        // API
        setZoomWheelSensitivityFactor: (state, action: PayloadAction<number>) => {
            return { ...state, zoomWheelSensitivityFactor: action.payload };
        },
        // API
        setMouseSensitivity: (state, action: PayloadAction<number>) => {
            return { ...state, mouseSensitivity: action.payload };
        },
        // API
        setContourWheelSensitivityFactor: (state, action: PayloadAction<number>) => {
            return { ...state, contourWheelSensitivityFactor: action.payload };
        },
    },
});

export const { setContourWheelSensitivityFactor, setZoomWheelSensitivityFactor, setMouseSensitivity, resetDefaultMouseSettings } =
    defaultMouseSettingsSlice.actions;

export default defaultMouseSettingsSlice.reducer;
