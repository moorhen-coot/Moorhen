import { createSlice } from "@reduxjs/toolkit";

const initialState: { validationJson: { sections: any; title: string } } = {
    validationJson: { sections: {}, title: "" },
};

export const jsonValidationSlice = createSlice({
    name: "jsonValidation",
    initialState: initialState,
    reducers: {
        setValidationJson: (state, action: { payload: any; type: string }) => {
            return { ...state, validationJson: action.payload };
        },
    },
});

export const { setValidationJson } = jsonValidationSlice.actions;

export default jsonValidationSlice.reducer;
