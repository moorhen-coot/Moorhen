import { configureStore } from '@reduxjs/toolkit'
import moleculesReducer from './moleculesSlice'
import mapsReducer from './mapsSlice'
import mouseSettingsReducer from './mouseSettings'
import backupSettingsReducer from './backupSettingsSlice'
import shortcutSettingsReducer from './shortCutsSlice'
import labelSettingsReducer from './labelSettingsSlice'
import sceneSettingsReducer from './sceneSettingsSlice'
import miscAppSettingsReducer from './miscAppSettingsSlice'
import generalStatesReducer from './generalStatesSlice'
import hoveringStatesReducer from './hoveringStatesSlice'
import activeModalsReducer from './activeModalsSlice'
import activePopUpsReducer from './activePopUpsSlice'
import mapContourSettingsReducer from './mapContourSettingsSlice'
import moleculeMapUpdateReducer from './moleculeMapUpdateSlice'
import sharedSessionReducer from './sharedSessionSlice'

export default configureStore({
    reducer: {
        molecules: moleculesReducer,
        maps: mapsReducer,
        mouseSettings: mouseSettingsReducer,
        backupSettings: backupSettingsReducer,
        shortcutSettings: shortcutSettingsReducer,
        labelSettings: labelSettingsReducer,
        sceneSettings: sceneSettingsReducer,
        miscAppSettings: miscAppSettingsReducer,
        generalStates: generalStatesReducer,
        hoveringStates: hoveringStatesReducer,
        activeModals: activeModalsReducer,
        activePopUps: activePopUpsReducer,
        mapContourSettings: mapContourSettingsReducer,
        moleculeMapUpdate: moleculeMapUpdateReducer,
        sharedSession: sharedSessionReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
})