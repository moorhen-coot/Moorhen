import { PayloadAction, createSlice } from "@reduxjs/toolkit";

export type ModalKey =
    | "models"
    | "maps"
    | "acedrg"
    | "query-seq"
    | "scripting"
    | "show-controls"
    | "fit-ligand"
    | "rama-plot"
    | "diff-map-peaks"
    | "validation-plot"
    | "mmrrcc"
    | "water-validation"
    | "lig-validation"
    | "fill-partial-residues"
    | "pepflips"
    | "unmodelled-blobs"
    | "carb-validation"
    | "slice-n-dice"
    | "superpose"
    | "scene-settings"
    | "lhasa"
    | "qscore"
    | "json-validation"
    | "mrbump"
    | "mrparse"
    | "colour-map-by-map"
    | "vectors"
    | "overlays-2d"
    | "pae-plot";

const initialState: {
    activeModals: ModalKey[];
    focusHierarchy: ModalKey[];
    modalsAttachedToSideBar: { key: string; isCollapsed: boolean }[];
} = {
    activeModals: [],
    focusHierarchy: [],
    modalsAttachedToSideBar: [],
};

export const modalsSlice = createSlice({
    name: "modals",
    initialState: initialState,
    reducers: {
        resetActiveModals: () => {
            return initialState;
        },
        attachModalToSideBar: (state, action: PayloadAction<string>) => {
            return {
                ...state,
                modalsAttachedToSideBar: [
                    { key: action.payload, isCollapsed: false },
                    ...state.modalsAttachedToSideBar
                        .filter(item => item.key !== action.payload)
                        .map(item => {
                            return { ...item, isCollapsed: true };
                        }),
                ],
            };
        },
        detachModalFromSideBar: (state, action: PayloadAction<string>) => {
            return {
                ...state,
                modalsAttachedToSideBar: [...state.modalsAttachedToSideBar.filter(item => item.key !== action.payload)],
            };
        },
        collapseSideBarModal: (state, action: PayloadAction<string>) => {
            return {
                ...state,
                modalsAttachedToSideBar: [
                    ...state.modalsAttachedToSideBar.filter(item => item.key !== action.payload),
                    { key: action.payload, isCollapsed: true },
                ],
            };
        },
        expandSideBarModal: (state, action: PayloadAction<string>) => {
            return {
                ...state,
                modalsAttachedToSideBar: [
                    ...state.modalsAttachedToSideBar.filter(item => item.key !== action.payload),
                    { key: action.payload, isCollapsed: false },
                ],
            };
        },
        showModal: (state, action: PayloadAction<ModalKey>) => {
            return {
                ...state,
                activeModals: [action.payload, ...state.activeModals.filter(item => item !== action.payload)],
            };
        },
        hideModal: (state, action: PayloadAction<string>) => {
            return { ...state, activeModals: [...state.activeModals.filter(item => item !== action.payload)] };
        },
        focusOnModal: (state, action: PayloadAction<ModalKey>) => {
            return {
                ...state,
                focusHierarchy: [action.payload, ...state.focusHierarchy.filter(item => item !== action.payload)],
            };
        },
        unFocusModal: (state, action: PayloadAction<string>) => {
            return { ...state, focusHierarchy: [...state.focusHierarchy.filter(item => item !== action.payload)] };
        },
    },
});

export const {
    attachModalToSideBar,
    showModal,
    hideModal,
    detachModalFromSideBar,
    focusOnModal,
    unFocusModal,
    resetActiveModals,
    collapseSideBarModal,
    expandSideBarModal,
} = modalsSlice.actions;

export default modalsSlice.reducer;
