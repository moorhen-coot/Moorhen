import { createSlice } from "@reduxjs/toolkit";

export interface Overlay2DFracPath {
    path: [number, number][];
    fillStyle?: string;
    strokeStyle?: string;
    drawStyle?: string;
    gradientBoundary?: [number, number, number, number];
    gradientStops?: { stop: number; colour: string }[];
    lineWidth?: number;
    uniqueId: string;
    zIndex?: number;
}
export interface Overlay2DSvgPath {
    path: string;
    fillStyle?: string;
    strokeStyle?: string;
    drawStyle?: string;
    gradientBoundary?: [number, number, number, number];
    gradientStops?: { stop: number; colour: string }[];
    lineWidth?: number;
    uniqueId: string;
    zIndex?: number;
}

export interface Overlay2DTextFrac {
    x: number;
    y: number;
    text: string;
    fontFamily: string;
    fontPixelSize: number;
    fillStyle?: string;
    strokeStyle?: string;
    drawStyle?: string;
    lineWidth?: number;
    uniqueId: string;
    zIndex?: number;
}

export interface Overlay2DImageSrcFrac {
    x: number;
    y: number;
    width: number;
    height: number;
    src: string;
    uniqueId: string;
    zIndex?: number;
}

export interface Overlay2DLatexSrcFrac {
    x: number;
    y: number;
    height: number;
    text: string;
    uniqueId: string;
    zIndex?: number;
}

const initialState: {
    imageOverlayList: Overlay2DImageSrcFrac[];
    latexOverlayList: Overlay2DLatexSrcFrac[];
    textOverlayList: Overlay2DTextFrac[];
    svgPathOverlayList: Overlay2DSvgPath[];
    fracPathOverlayList: Overlay2DFracPath[];
    callBacks: Function[];
} = {
    imageOverlayList: [],
    latexOverlayList: [],
    textOverlayList: [],
    svgPathOverlayList: [],
    fracPathOverlayList: [],
    callBacks: [],
};

export const overlaysSlice = createSlice({
    name: "overlays",
    initialState: initialState,
    reducers: {
        addImageOverlay: (state, action: { payload: Overlay2DImageSrcFrac; type: string }) => {
            state = { ...state, imageOverlayList: [...state.imageOverlayList, action.payload] };
            return state;
        },
        removeImageOverlay: (state, action: { payload: Overlay2DImageSrcFrac; type: string }) => {
            state = {
                ...state,
                imageOverlayList: state.imageOverlayList.filter((item) => item.uniqueId !== action.payload.uniqueId),
            };
            return state;
        },
        addLatexOverlay: (state, action: { payload: Overlay2DLatexSrcFrac; type: string }) => {
            state = { ...state, latexOverlayList: [...state.latexOverlayList, action.payload] };
            return state;
        },
        removeLatexOverlay: (state, action: { payload: Overlay2DLatexSrcFrac; type: string }) => {
            state = {
                ...state,
                latexOverlayList: state.latexOverlayList.filter((item) => item.uniqueId !== action.payload.uniqueId),
            };
            return state;
        },
        addTextOverlay: (state, action: { payload: Overlay2DTextFrac; type: string }) => {
            state = { ...state, textOverlayList: [...state.textOverlayList, action.payload] };
            return state;
        },
        removeTextOverlay: (state, action: { payload: Overlay2DTextFrac; type: string }) => {
            state = {
                ...state,
                textOverlayList: state.textOverlayList.filter((item) => item.uniqueId !== action.payload.uniqueId),
            };
            return state;
        },
        addSvgPathOverlay: (state, action: { payload: Overlay2DSvgPath; type: string }) => {
            state = { ...state, svgPathOverlayList: [...state.svgPathOverlayList, action.payload] };
            return state;
        },
        removeSvgPathOverlay: (state, action: { payload: Overlay2DSvgPath; type: string }) => {
            state = {
                ...state,
                svgPathOverlayList: state.svgPathOverlayList.filter(
                    (item) => item.uniqueId !== action.payload.uniqueId
                ),
            };
            return state;
        },
        addFracPathOverlay: (state, action: { payload: Overlay2DFracPath; type: string }) => {
            state = { ...state, fracPathOverlayList: [...state.fracPathOverlayList, action.payload] };
            return state;
        },
        removeFracPathOverlay: (state, action: { payload: Overlay2DFracPath; type: string }) => {
            state = {
                ...state,
                fracPathOverlayList: state.fracPathOverlayList.filter(
                    (item) => item.uniqueId !== action.payload.uniqueId
                ),
            };
            return state;
        },
        addCallback: (state, action: { payload: Function; type: string }) => {
            state = { ...state, callBacks: [...state.callBacks, action.payload] };
            return state;
        },
        emptyOverlays: () => {
            return initialState;
        },
    },
});

export const {
    addImageOverlay,
    addTextOverlay,
    addSvgPathOverlay,
    addFracPathOverlay,
    emptyOverlays,
    addCallback,
    addLatexOverlay,
    removeImageOverlay,
    removeLatexOverlay,
    removeTextOverlay,
    removeSvgPathOverlay,
    removeFracPathOverlay,
} = overlaysSlice.actions;

export default overlaysSlice.reducer;
