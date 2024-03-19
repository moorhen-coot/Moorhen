import { createSlice } from '@reduxjs/toolkit'

export const sharedSessionSlice = createSlice({
  name: 'sharedSession',
  initialState: {
    isInSharedSession: false,
    sharedSessionToken: null,
    showSharedSessionManager: false,
  },
  reducers: {
    setIsInSharedSession: (state, action: { payload: boolean, type: string }) => {
        return {...state, isInSharedSession: action.payload }
    },
    setSharedSessionToken: (state, action: { payload: string, type: string }) => {
        return {...state, sharedSessionToken: action.payload }
    },
    setShowSharedSessionManager: (state, action: { payload: boolean, type: string }) => {
        return {...state, showSharedSessionManager: action.payload }
    },  
  }
})

export const {
  setIsInSharedSession, setSharedSessionToken, setShowSharedSessionManager
} = sharedSessionSlice.actions

export default sharedSessionSlice.reducer