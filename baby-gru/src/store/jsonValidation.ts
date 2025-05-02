import { createSlice } from '@reduxjs/toolkit'

const initialState = {
    validationJson: {},
}

export const jsonValidationSlice = createSlice({
  name: 'jsonValidation',
  initialState: initialState,
  reducers: {
    setValidationJson: (state, action: {payload: any, type: string}) => {
        return { ...state, validationJson: action.payload }
    },
}})

export const {
    setValidationJson
} = jsonValidationSlice.actions

export default jsonValidationSlice.reducer
