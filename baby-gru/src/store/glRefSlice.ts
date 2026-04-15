import { createSlice } from "@reduxjs/toolkit";
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

export const glRefSlice = createSlice({
    name: "glRef",
    initialState: initialState,
    reducers: {
        setElementsIndicesRestrict: (state, action: { payload: boolean; type: string }) => {
            return { ...state, elementsIndicesRestrict: action.payload };
        },
        // API sceneSettings
        /* Set the origin of the scene to the provided coordinates.
        @value [number, number, number] X, Y, Z coordinates */
        setOrigin: (state, action: { payload: [number, number, number]; type: string }) => {
            return { ...state, origin: action.payload };
        },
        setIsWebGL2: (state, action: { payload: boolean; type: string }) => {
            return { ...state, isWebGL2: action.payload };
        },
        setGLCtx: (state, action: { payload: any; type: string }) => {
            return { ...state, glCtx: action.payload };
        },
        setActiveMolecule: (state, action: { payload: moorhen.Molecule; type: string }) => {
            return { ...state, activeMolecule: action.payload };
        },
        setDraggableMolecule: (state, action: { payload: moorhen.Molecule; type: string }) => {
            return { ...state, draggableMolecule: action.payload };
        },
        // API sceneSettings
        setLightPosition: (state, action: { payload: [number, number, number, number]; type: string }) => {
            return { ...state, lightPosition: action.payload };
        },
        // API sceneSettings
        setAmbient: (state, action: { payload: [number, number, number, number]; type: string }) => {
            return { ...state, ambient: action.payload };
        },
        // API sceneSettings
        setSpecular: (state, action: { payload: [number, number, number, number]; type: string }) => {
            return { ...state, specular: action.payload };
        },
        // API sceneSettings
        setDiffuse: (state, action: { payload: [number, number, number, number]; type: string }) => {
            return { ...state, diffuse: action.payload };
        },
        // API sceneSettings
        setSpecularPower: (state, action: { payload: number; type: string }) => {
            return { ...state, specularPower: action.payload };
        },
        // API sceneSettings
        setZoom: (state, action: { payload: number; type: string }) => {
            return { ...state, zoom: action.payload };
        },
        setQuat: (state, action: { payload: any[]; type: string }) => {
            return { ...state, quat: action.payload };
        },
        // API sceneSettings
        setFogClipOffset: (state, action: { payload: number; type: string }) => {
            return { ...state, fogClipOffset: action.payload };
        },
        // API sceneSettings
        setFogStart: (state, action: { payload: number; type: string }) => {
            return { ...state, fogStart: action.payload };
        },
        // API sceneSettings
        setFogEnd: (state, action: { payload: number; type: string }) => {
            return { ...state, fogEnd: action.payload };
        },
        // API sceneSettings
        setClipStart: (state, action: { payload: number; type: string }) => {
            return { ...state, clipStart: action.payload };
        },
        // API sceneSettings
        setClipEnd: (state, action: { payload: number; type: string }) => {
            return { ...state, clipEnd: action.payload };
        },
        // API sceneSettings
        setHoverSize: (state, action: { payload: number; type: string }) => {
            return { ...state, hoverSize: action.payload };
        },
        setCursorPosition: (state, action: { payload: [number, number]; type: string }) => {
            return { ...state, cursorPosition: action.payload };
        },
        setShortCutHelp: (state, action: { payload: string[]; type: string }) => {
            return { ...state, shortCutHelp: action.payload };
        },
        setDisplayBuffers: (state, action: { payload: DisplayBuffer[]; type: string }) => {
            return { ...state, displayBuffers: action.payload };
        },
        setTexturedShapes: (state, action: { payload: any[]; type: string }) => {
            return { ...state, texturedShapes: action.payload };
        },
        setLabelBuffers: (state, action: { payload: any[]; type: string }) => {
            return { ...state, labelBuffers: action.payload };
        },
        setRttFramebufferSize: (state, action: { payload: [number, number]; type: string }) => {
            return { ...state, rttFramebufferSize: action.payload };
        },
        setCanvasSize: (state, action: { payload: [number, number]; type: string }) => {
            return { ...state, canvasSize: action.payload };
        },
        triggerRedrawEnv: (state, action: { payload: boolean; type: string }) => {
            return {
                ...state,
                envUpdate: {
                    switch: !state.envUpdate.switch,
                },
            };
        },
        triggerClearLabels: (state, action: { payload: boolean; type: string }) => {
            return {
                ...state,
                clearLabels: {
                    switch: !state.clearLabels.switch,
                },
            };
        },
        setRequestDrawScene: (state, action: { payload: boolean; type: string }) => {
            return {
                ...state,
                requestDrawScene: {
                    switch: !state.requestDrawScene.switch,
                },
            };
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
