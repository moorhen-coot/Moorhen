import { configureStore } from "@reduxjs/toolkit";
import atomInfoCardsReducer from "./atomInfoCardsSlice";
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
    atomInfoCards: atomInfoCardsReducer,
    globalUI: globalUISliceReducer,
    vectors: vectorsReducer,
};

const _MoorhenReduxStore = configureStore({
    reducer: reducers,
    middleware: getDefaultMiddleware =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

// Get the type of our store variable
export type MoorhenReduxStoreType = typeof _MoorhenReduxStore;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<MoorhenReduxStoreType["getState"]>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = MoorhenReduxStoreType["dispatch"];
