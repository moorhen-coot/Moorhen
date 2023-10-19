import { configureStore } from '@reduxjs/toolkit'
import moleculesReducer from './moleculesSlice'
import mapsReducer from './mapSlice'
import canvasReducer from './canvasSettingsSlice'

export default configureStore({
    reducer: {
        molecules: moleculesReducer,
        maps: mapsReducer,
        canvasSettings: canvasReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
})