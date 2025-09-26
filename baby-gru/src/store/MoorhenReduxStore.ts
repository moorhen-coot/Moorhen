import { configureStore } from '@reduxjs/toolkit';
import atomInfoCardsReducer, * as atomInfoCardsSlice from './atomInfoCardsSlice';
import backupSettingsReducer, * as backupSettingsSlice from './backupSettingsSlice';
import generalStatesReducer, * as generalStatesSlice from './generalStatesSlice';
import glRefSliceReducer, * as glRefSlice from './glRefSlice';
import globalUISliceReducer, * as globalUISlice from './globalUISlice';
import hoveringStatesReducer, * as hoveringStatesSlice from './hoveringStatesSlice';
import jsonValidationReducer, * as jsonValidationSlice from './jsonValidation';
import labelSettingsReducer, * as labelSettingsSlice from './labelSettingsSlice';
import lhasaReducer, * as lhasaSlice from './lhasaSlice';
import mapContourSettingsReducer, * as mapContourSettingsSlice from './mapContourSettingsSlice';
import mapsReducer, * as mapsSlice from './mapsSlice';
import menusReducer, * as menusSlice from './menusSlice';
import modalsReducer, * as modalsSlice from './modalsSlice';
import moleculeMapUpdateReducer, * as moleculeMapUpdateSlice from './moleculeMapUpdateSlice';
import moleculesReducer, * as moleculesSlice from './moleculesSlice';
import mouseSettingsReducer, * as mouseSettingsSlice from './mouseSettings';
import mrParseSliceReducer, * as mrParseSlice from './mrParseSlice';
import overlaysSliceReducer, * as overlaysSlice from './overlaysSlice';
import refinementSettingsReducer, * as refinementSettingsSlice from './refinementSettingsSlice';
import sceneSettingsReducer, * as sceneSettingsSlice from './sceneSettingsSlice';
import sharedSessionReducer, * as sharedSessionSlice from './sharedSessionSlice';
import shortcutSettingsReducer, * as shortcutSettingsSlice from './shortCutsSlice';
import sliceNDiceReducer, * as sliceNDiceSlice from './sliceNDiceSlice';
import vectorsReducer, * as vectorsSlice from './vectorsSlice';

export const reducers = {
    molecules: moleculesReducer,
    maps: mapsReducer,
    mouseSettings: mouseSettingsReducer,
    backupSettings: backupSettingsReducer,
    shortcutSettings: shortcutSettingsReducer,
    labelSettings: labelSettingsReducer,
    sceneSettings: sceneSettingsReducer,
    generalStates: generalStatesReducer,
    hoveringStates: hoveringStatesReducer,
    modals: modalsReducer,
    mapContourSettings: mapContourSettingsReducer,
    moleculeMapUpdate: moleculeMapUpdateReducer,
    sharedSession: sharedSessionReducer,
    refinementSettings: refinementSettingsReducer,
    lhasa: lhasaReducer,
    sliceNDice: sliceNDiceReducer,
    jsonValidation: jsonValidationReducer,
    mrParse: mrParseSliceReducer,
    glRef: glRefSliceReducer,
    overlays: overlaysSliceReducer,
    menus: menusReducer,
    atomInfoCards: atomInfoCardsReducer,
    globalUI: globalUISliceReducer,
    vectors: vectorsReducer,
};

// Export slice modules for dynamic access to action creators
export const sliceModules = [
    atomInfoCardsSlice,
    backupSettingsSlice,
    generalStatesSlice,
    glRefSlice,
    globalUISlice,
    hoveringStatesSlice,
    jsonValidationSlice,
    labelSettingsSlice,
    lhasaSlice,
    mapContourSettingsSlice,
    mapsSlice,
    menusSlice,
    modalsSlice,
    moleculeMapUpdateSlice,
    moleculesSlice,
    mouseSettingsSlice,
    mrParseSlice,
    overlaysSlice,
    refinementSettingsSlice,
    sceneSettingsSlice,
    sharedSessionSlice,
    shortcutSettingsSlice,
    sliceNDiceSlice,
    vectorsSlice,
];

export const MoorhenReduxStore = configureStore({
    reducer: reducers,
    middleware: getDefaultMiddleware =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

// Get the type of our store variable
export type MoorhenReduxStoreType = typeof MoorhenReduxStore;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<MoorhenReduxStoreType['getState']>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = MoorhenReduxStoreType['dispatch'];
