import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { moorhen } from "@/types/moorhen";
import { MoorhenMolecule } from "../utils/MoorhenMolecule";

export type HoveredAtom = {
    molecule: MoorhenMolecule | null;
    cid: string | null;
    atomInfo: moorhen.AtomInfo | null;
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

const hoveringStatesSlice = createSlice({
    name: "hoveringStates",
    initialState: initialState,
    reducers: {
        resetHoveringStates: () => {
            return initialState;
        },
        setHoveredAtom: (state, action: PayloadAction<HoveredAtom>) => {
            state.hoveredAtom = action.payload as unknown as typeof state.hoveredAtom; // FIXME this is a hack to get typscript to stop complaining about the type of the payload.
        },
        // API
        setEnableAtomHovering: (state, action: PayloadAction<boolean>) => {
            state.enableAtomHovering = action.payload;
        },
        setCursorStyle: (state, action: PayloadAction<string>) => {
            state.cursorStyle = action.payload;
        },
    },
});

export const { setCursorStyle, setEnableAtomHovering, setHoveredAtom, resetHoveringStates } = hoveringStatesSlice.actions;

export default hoveringStatesSlice.reducer;
