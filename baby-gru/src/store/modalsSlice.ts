import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ModalComponentProps, ModalKey } from "@/components/interface-base/ModalBase/ModalsContainer";


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
    | "NOE"
    | "conkit"
    | "pae-plot";
export type ModalCall = { key: ModalKey } & ModalComponentProps;

const initialState: {
    activeModals: ModalCall[];
    focusHierarchy: ModalKey[];
} = {
    activeModals: [],
    focusHierarchy: [],
};

const modalsSlice = createSlice({
    name: "modals",
    initialState: initialState,
    reducers: {
        resetActiveModals: () => {
            return initialState;
        },
        // API
        showModal: (state, action: PayloadAction<ModalCall>) => {
            return {
                ...state,
                activeModals: [
                    { key: action.payload.key, ...action.payload },
                    ...state.activeModals.filter(item => item.key !== action.payload.key),
                ],
            };
        },
        // API
        hideModal: (state, action: PayloadAction<ModalKey>) => {
            return { ...state, activeModals: [...state.activeModals.filter(item => item.key !== action.payload)] };
        },
        // API
        focusOnModal: (state, action: PayloadAction<ModalKey>) => {
            return {
                ...state,
                focusHierarchy: [action.payload, ...state.focusHierarchy.filter(item => item !== action.payload)],
            };
        },
        // API
        unFocusModal: (state, action: PayloadAction<string>) => {
            return { ...state, focusHierarchy: [...state.focusHierarchy.filter(item => item !== action.payload)] };
        },
    },
});

export const { showModal, hideModal, focusOnModal, unFocusModal, resetActiveModals } = modalsSlice.actions;

export default modalsSlice.reducer;
