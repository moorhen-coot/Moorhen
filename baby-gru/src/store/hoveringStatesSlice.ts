import { createSlice } from "@reduxjs/toolkit";
import { MoorhenMolecule } from "../utils/MoorhenMolecule";

export type HoveredAtom = {
    molecule: MoorhenMolecule | null;
    cid: string | null;
};

const initialState: {
    enableAtomHovering: boolean;
    hoveredAtom: HoveredAtom;
    cursorStyle: string;
} = {
    enableAtomHovering: true,
    hoveredAtom: { molecule: null, cid: null } as HoveredAtom,
    cursorStyle: "default",
};

export const hoveringStatesSlice = createSlice({
    name: "hoveringStates",
    initialState: initialState,
    reducers: {
        resetHoveringStates: () => {
            return initialState;
        },
        setHoveredAtom: (state, action: { payload: HoveredAtom; type: string }) => {
            return { ...state, hoveredAtom: action.payload };
        },
        setEnableAtomHovering: (state, action: { payload: boolean; type: string }) => {
            return { ...state, enableAtomHovering: action.payload };
        },
        setCursorStyle: (state, action: { payload: string; type: string }) => {
            return { ...state, cursorStyle: action.payload };
        },
    },
});

export const { setCursorStyle, setEnableAtomHovering, setHoveredAtom, resetHoveringStates } =
    hoveringStatesSlice.actions;

export default hoveringStatesSlice.reducer;
