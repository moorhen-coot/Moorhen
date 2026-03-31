import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ModalComponentProps, ModalKey } from "@/components/interface-base/ModalBase/ModalsContainer";

type ModalCall = { key: ModalKey } & ModalComponentProps;

const initialState: {
    activeModals: ModalCall[];
    focusHierarchy: ModalKey[];
} = {
    activeModals: [],
    focusHierarchy: [],
};

export const modalsSlice = createSlice({
    name: "modals",
    initialState: initialState,
    reducers: {
        resetActiveModals: () => {
            return initialState;
        },
        showModal: (state, action: PayloadAction<ModalCall>) => {
            return {
                ...state,
                activeModals: [
                    { key: action.payload.key, ...action.payload },
                    ...state.activeModals.filter(item => item.key !== action.payload.key),
                ],
            };
        },
        hideModal: (state, action: PayloadAction<ModalKey>) => {
            return { ...state, activeModals: [...state.activeModals.filter(item => item.key !== action.payload)] };
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

export const { showModal, hideModal, focusOnModal, unFocusModal, resetActiveModals } = modalsSlice.actions;

export default modalsSlice.reducer;
