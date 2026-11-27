import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MoorhenMolecule } from "@/utils";
import { DisplayBuffer } from "../WebGLgComponents/displayBuffer";
import { moorhen } from "../types/moorhen";

const initialState: {
    isWebGL2: boolean;
    glCtx: any;
    displayBuffers: DisplayBuffer[];
    activeMolecule: MoorhenMolecule;
    draggableMolecule: MoorhenMolecule;
    quat: any[];
    cursorPosition: [number, number];
    shortCutHelp: string[];
    /**
     * Bumped by setRequestDrawScene. A counter, not a toggle: two requests in the same tick would
     * flip a switch back to the value React last rendered and the redraw would be lost.
     */
    requestDrawScene: { count: number };
    /**
     * Bumped to say the next view the store asks for is to be taken up at once, not eased into.
     *
     * A counter for the same reason as the one above, and for one more: the reconciling effect in
     * MoorhenWebMG cannot tell "the user asked to centre here" from "the store and the camera have
     * drifted apart", so it eases everything. A restored session is neither. Nobody wants to watch
     * the camera fly across the molecule on opening a file, and the quarter second it takes is a
     * window in which the move can be interrupted - which is how a restore came to strand the view
     * a fraction of the way to where it was saved.
     */
    cameraSnap: { count: number };
    /**
     * How many tasks ask for store-triggered redraws to be throttled (see MGWebGL.requestDrawScene),
     * e.g. a batch of ligands loading, which would otherwise redraw a growing scene every frame.
     */
    drawsThrottled: number;
    envUpdate: { switch: boolean };
    clearLabels: { switch: boolean };
    hoverSize: number;
    labelBuffers: any[];
    texturedShapes: any[];
    canvasSize: [number, number];
    rttFramebufferSize: [number, number];
    elementsIndicesRestrict: boolean;
} = {
    isWebGL2: false,
    glCtx: null,
    activeMolecule: null,
    draggableMolecule: null,
    envUpdate: { switch: false },
    clearLabels: { switch: false },
    requestDrawScene: { count: 0 },
    cameraSnap: { count: 0 },
    drawsThrottled: 0,
    displayBuffers: [],
    texturedShapes: [],
    labelBuffers: [],
    hoverSize: 0.27,
    quat: [0.0, 0.0, 0.0, -1.0],
    cursorPosition: [0, 0],
    shortCutHelp: [],
    canvasSize: [0, 0],
    rttFramebufferSize: [0, 0],
    elementsIndicesRestrict: false,
};

const glRefSlice = createSlice({
    name: "glRef",
    initialState: initialState,
    reducers: {
        setElementsIndicesRestrict: (state, action: PayloadAction<boolean>) => {
            state.elementsIndicesRestrict = action.payload;
        },
        setIsWebGL2: (state, action: PayloadAction<boolean>) => {
            state.isWebGL2 = action.payload;
        },
        setGLCtx: (state, action: PayloadAction<any>) => {
            state.glCtx = action.payload;
        },
        setActiveMolecule: (state, action: PayloadAction<MoorhenMolecule>) => {
            state.activeMolecule = action.payload as unknown as typeof state.activeMolecule; // FIXME this is a hack to get typscript to stop complaining about the type of the payload.
        },
        setDraggableMolecule: (state, action: PayloadAction<MoorhenMolecule>) => {
            state.draggableMolecule = action.payload as unknown as typeof state.draggableMolecule; // FIXME this is a hack to get typscript to stop complaining about the type of the payload.
        },
        setQuat: (state, action: PayloadAction<any[]>) => {
            state.quat = action.payload;
        },
        // API sceneSettings
        setHoverSize: (state, action: PayloadAction<number>) => {
            state.hoverSize = action.payload;
        },
        setCursorPosition: (state, action: PayloadAction<[number, number]>) => {
            state.cursorPosition = action.payload;
        },
        setShortCutHelp: (state, action: PayloadAction<string[]>) => {
            state.shortCutHelp = action.payload;
        },
        setDisplayBuffers: (state, action: PayloadAction<DisplayBuffer[]>) => {
            state.displayBuffers = action.payload;
        },
        setTexturedShapes: (state, action: PayloadAction<any[]>) => {
            state.texturedShapes = action.payload;
        },
        setLabelBuffers: (state, action: PayloadAction<any[]>) => {
            state.labelBuffers = action.payload;
        },
        setRttFramebufferSize: (state, action: PayloadAction<[number, number]>) => {
            state.rttFramebufferSize = action.payload;
        },
        setCanvasSize: (state, action: PayloadAction<[number, number]>) => {
            state.canvasSize = action.payload;
        },
        triggerRedrawEnv: (state, action: PayloadAction<boolean>) => {
            state.envUpdate.switch = !state.envUpdate.switch;
        },
        triggerClearLabels: (state, action: PayloadAction<boolean>) => {
            state.clearLabels.switch = !state.clearLabels.switch;
        },
        setRequestDrawScene: (state, action: PayloadAction<boolean>) => {
            state.requestDrawScene.count += 1;
        },
        /**
         * Take up the view the store is asking for at once, without easing to it.
         *
         * Dispatch it *after* the origin, quat and zoom it applies to, so that one render carries
         * both the destination and the instruction not to animate to it.
         */
        setCameraSnap: (state, action: PayloadAction<boolean>) => {
            state.cameraSnap.count += 1;
        },
        /** true: one more task asks for throttled redraws; false: one fewer. Pair them (try / finally). */
        setDrawsThrottled: (state, action: PayloadAction<boolean>) => {
            state.drawsThrottled = Math.max(0, state.drawsThrottled + (action.payload ? 1 : -1));
            // The last frame drawn may be up to a throttle interval old: draw what is there now
            if (state.drawsThrottled === 0) state.requestDrawScene.count += 1;
        },
    },
});

export const {
    setRequestDrawScene,
    setCameraSnap,
    setDrawsThrottled,
    setIsWebGL2,
    setActiveMolecule,
    setQuat,
    setCursorPosition,
    setShortCutHelp,
    setDraggableMolecule,
    triggerRedrawEnv,
    triggerClearLabels,
    setGLCtx,
    setDisplayBuffers,
    setHoverSize,
    setLabelBuffers,
    setTexturedShapes,
    setRttFramebufferSize,
    setCanvasSize,
    setElementsIndicesRestrict,
} = glRefSlice.actions;

export default glRefSlice.reducer;
