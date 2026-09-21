import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { moorhen } from "@/types/moorhen";
import { MoorhenMolecule } from "../utils/MoorhenMolecule";

export type HoveredAtom = {
    molecule: MoorhenMolecule | null;
    cid: string | null;
    atomInfo: moorhen.AtomInfo | null;
};

/**
 * A piece of a mesh to light up, named by the buffer it belongs to and its index within that
 * buffer's sections.
 *
 * Already resolved to indices rather than left as a label to match: the match is done once when
 * the hover changes, not per buffer per frame in the draw loop.
 */
export type HoveredSection = {
    bufferId: string;
    section: number;
};

const initialState: {
    enableAtomHovering: boolean;
    hoveredAtom: HoveredAtom;
    hoveredSection: HoveredSection | null;
    cursorStyle: string;
} = {
    enableAtomHovering: true,
    hoveredAtom: { molecule: null, cid: null } as HoveredAtom,
    hoveredSection: null,
    cursorStyle: "default",
};

const hoveringStatesSlice = createSlice({
    name: "hoveringStates",
    initialState: initialState,
    reducers: {
        resetHoveringStates: () => {
            return initialState;
        },
        setHoveredSection: (state, action: PayloadAction<HoveredSection | null>) => {
            state.hoveredSection = action.payload;
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

export const { setCursorStyle, setEnableAtomHovering, setHoveredAtom, setHoveredSection, resetHoveringStates } = hoveringStatesSlice.actions;

export default hoveringStatesSlice.reducer;
