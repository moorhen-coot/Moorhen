import { type AnyAction, type Store, configureStore } from "@reduxjs/toolkit";
import type { ThunkDispatch } from "redux-thunk";
import backupSettingsReducer from "./backupSettingsSlice";
import generalStatesReducer from "./generalStatesSlice";
import glRefSliceReducer from "./glRefSlice";
import globalUISliceReducer from "./globalUISlice";
import hoveringStatesReducer from "./hoveringStatesSlice";
import jsonValidationReducer from "./jsonValidation";
import labelSettingsReducer from "./labelSettingsSlice";
import lhasaReducer from "./lhasaSlice";
import mapContourSettingsReducer from "./mapContourSettingsSlice";
import mapsReducer from "./mapsSlice";
import menusReducer from "./menusSlice";
import modalsReducer from "./modalsSlice";
import moleculeMapUpdateReducer from "./moleculeMapUpdateSlice";
import moleculesReducer from "./moleculesSlice";
import mouseSettingsReducer from "./mouseSettings";
import mrParseSliceReducer from "./mrParseSlice";
import overlaysSliceReducer from "./overlaysSlice";
import refinementSettingsReducer from "./refinementSettingsSlice";
import sceneSettingsReducer from "./sceneSettingsSlice";
import sharedSessionReducer from "./sharedSessionSlice";
import shortcutSettingsReducer from "./shortCutsSlice";
import sliceNDiceReducer from "./sliceNDiceSlice";
import snackBarsReducer from "./snackbarSlice";
import vectorsReducer from "./vectorsSlice";

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
    globalUI: globalUISliceReducer,
    vectors: vectorsReducer,
    snackBars: snackBarsReducer,
};

// Infer RootState directly from reducers object structure (no runtime dependency)
export type RootState = {
    [K in keyof typeof reducers]: ReturnType<(typeof reducers)[K]>;
};

// Define store type explicitly for proper library exports
export type MoorhenReduxStoreType = Store<RootState, AnyAction>;
export type AppDispatch = ThunkDispatch<RootState, undefined, AnyAction>;

// Create store configuration factory for better library usage
export const createMoorhenStore = () =>
    configureStore({
        reducer: reducers,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware({
                serializableCheck: false,
            }),
    });

// Create singleton instance for internal use (used by tests and default export)
export const _MoorhenReduxStore = createMoorhenStore();
