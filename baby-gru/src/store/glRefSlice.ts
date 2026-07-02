import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MoorhenMolecule } from "@/utils";
import { DisplayBuffer } from "../WebGLgComponents/displayBuffer";
import { moorhen } from "../types/moorhen";

const initialState: {
    origin: [number, number, number];
    isWebGL2: boolean;
    glCtx: any;
    displayBuffers: DisplayBuffer[];
    activeMolecule: MoorhenMolecule;
    draggableMolecule: MoorhenMolecule;
    lightPosition: [number, number, number, number];
    ambient: [number, number, number, number];
    specular: [number, number, number, number];
    diffuse: [number, number, number, number];
    specularPower: number;
    zoom: number;
    quat: any[];
    fogClipOffset: number;
    fogStart: number;
    fogEnd: number;
    clipStart: number;
    clipEnd: number;
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
    origin: [0, 0, 0],
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
    // These should probably be in sceneSettings slice.
    // We'll move them in due course.
    lightPosition: [25.0, 25.0, 50.0, 1.0],
    ambient: [0.2, 0.2, 0.2, 1.0],
    specular: [0.6, 0.6, 0.6, 1.0],
    diffuse: [1.0, 1.0, 1.0, 1.0],
    specularPower: 64.0,
    zoom: 1.0,
    quat: [0.0, 0.0, 0.0, -1.0],
    fogClipOffset: 250,
    fogStart: 250,
    fogEnd: 1250,
    clipStart: 0,
    clipEnd: 1000,
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
        // API sceneSettings
        /* Set the origin of the scene to the provided coordinates.
        @value [number, number, number] X, Y, Z coordinates */
        setOrigin: (state, action: PayloadAction<[number, number, number]>) => {
            state.origin = action.payload;
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
        // API sceneSettings
        setLightPosition: (state, action: PayloadAction<[number, number, number, number]>) => {
            state.lightPosition = action.payload;
        },
        // API sceneSettings
        setAmbient: (state, action: PayloadAction<[number, number, number, number]>) => {
            state.ambient = action.payload;
        },
        // API sceneSettings
        setSpecular: (state, action: PayloadAction<[number, number, number, number]>) => {
            state.specular = action.payload;
        },
        // API sceneSettings
        setDiffuse: (state, action: PayloadAction<[number, number, number, number]>) => {
            state.diffuse = action.payload;
        },
        // API sceneSettings
        setSpecularPower: (state, action: PayloadAction<number>) => {
            state.specularPower = action.payload;
        },
        // API sceneSettings
        setZoom: (state, action: PayloadAction<number>) => {
            state.zoom = action.payload;
        },
        setQuat: (state, action: PayloadAction<any[]>) => {
            state.quat = action.payload;
        },
        // API sceneSettings
        setFogClipOffset: (state, action: PayloadAction<number>) => {
            state.fogClipOffset = action.payload;
        },
        // API sceneSettings
        setFogStart: (state, action: PayloadAction<number>) => {
            state.fogStart = action.payload;
        },
        // API sceneSettings
        setFogEnd: (state, action: PayloadAction<number>) => {
            state.fogEnd = action.payload;
        },
        // API sceneSettings
        setClipStart: (state, action: PayloadAction<number>) => {
            state.clipStart = action.payload;
        },
        // API sceneSettings
        setClipEnd: (state, action: PayloadAction<number>) => {
            state.clipEnd = action.payload;
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
    setOrigin,
    setRequestDrawScene,
    setIsWebGL2,
    setActiveMolecule,
    setLightPosition,
    setAmbient,
    setSpecular,
    setDiffuse,
    setSpecularPower,
    setZoom,
    setQuat,
    setFogClipOffset,
    setFogStart,
    setFogEnd,
    setClipStart,
    setClipEnd,
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
