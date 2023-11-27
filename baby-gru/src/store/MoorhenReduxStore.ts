import { configureStore } from '@reduxjs/toolkit'
import moleculesReducer from './moleculesSlice'
import mapsReducer from './mapsSlice'
import mapSettingsReducer from './mapSettingsSlice'
import mouseSettingsReducer from './mouseSettings'
import backupSettingsReducer from './backupSettingsSlice'
import updatingMapScoresSettingsReducer from './updatingMapScoresSettingsSlice'
import shortcutSettingsReducer from './shortCutsSlice'
import labelSettingsReducer from './labelSettingsSlice'
import sceneSettingsReducer from './sceneSettingsSlice'
import miscAppSettingsReducer from './miscAppSettingsSlice'
import generalStatesReducer from './generalStatesSlice'
import hoveringStatesReducer from './hoveringStatesSlice'

export default configureStore({
    reducer: {
        molecules: moleculesReducer,
        maps: mapsReducer,
        mapSettings: mapSettingsReducer,
        mouseSettings: mouseSettingsReducer,
        backupSettings: backupSettingsReducer,
        updatingMapScoresSettings: updatingMapScoresSettingsReducer,
        shortcutSettings: shortcutSettingsReducer,
        labelSettings: labelSettingsReducer,
        sceneSettings: sceneSettingsReducer,
        miscAppSettings: miscAppSettingsReducer,
        generalStates: generalStatesReducer,
        hoveringStates: hoveringStatesReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
})