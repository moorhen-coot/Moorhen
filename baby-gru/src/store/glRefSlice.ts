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
    requestDrawScene: { switch: boolean };
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
    requestDrawScene: { switch: false },
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
            state.requestDrawScene.switch = !state.requestDrawScene.switch;
        },
    },
});

export const {
    setRequestDrawScene,
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
