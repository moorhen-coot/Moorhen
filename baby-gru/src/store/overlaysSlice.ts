import { createSlice } from "@reduxjs/toolkit";

export interface Overlay2DFracPath {
    type: "FracPath";
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
    type: "SvgPath";
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
    type: "Text";
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
    type: "Image";
    x: number;
    y: number;
    width: number;
    height: number;
    src: string;
    uniqueId: string;
    zIndex?: number;
}

export interface Overlay2DLatexSrcFrac {
    type: "Latex";
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
        addImageOverlay: (state, action: { payload: Omit<Overlay2DImageSrcFrac, "type">; type: string }) => {
            const imageOverlay: Overlay2DImageSrcFrac = {
                ...action.payload,
                type: "Image",
            };
            state = { ...state, imageOverlayList: [...state.imageOverlayList, imageOverlay] };
            return state;
        },
        removeImageOverlay: (state, action: { payload: Overlay2DImageSrcFrac; type: string }) => {
            state = {
                ...state,
                imageOverlayList: state.imageOverlayList.filter((item) => item.uniqueId !== action.payload.uniqueId),
            };
            return state;
        },
        addLatexOverlay: (state, action: { payload: Omit<Overlay2DLatexSrcFrac, "type">; type: string }) => {
            const latexOverlay: Overlay2DLatexSrcFrac = {
                ...action.payload,
                type: "Latex",
            };
            state = { ...state, latexOverlayList: [...state.latexOverlayList, latexOverlay] };
            return state;
        },
        removeLatexOverlay: (state, action: { payload: Overlay2DLatexSrcFrac; type: string }) => {
            state = {
                ...state,
                latexOverlayList: state.latexOverlayList.filter((item) => item.uniqueId !== action.payload.uniqueId),
            };
            return state;
        },
        addTextOverlay: (state, action: { payload: Omit<Overlay2DTextFrac, "type">; type: string }) => {
            const textOverlay: Overlay2DTextFrac = {
                ...action.payload,
                type: "Text",
            };
            state = { ...state, textOverlayList: [...state.textOverlayList, textOverlay] };
            return state;
        },
        removeTextOverlay: (state, action: { payload: Overlay2DTextFrac; type: string }) => {
            state = {
                ...state,
                textOverlayList: state.textOverlayList.filter((item) => item.uniqueId !== action.payload.uniqueId),
            };
            return state;
        },
        addSvgPathOverlay: (state, action: { payload: Omit<Overlay2DSvgPath, "type">; type: string }) => {
            const svgPathOverlay: Overlay2DSvgPath = {
                ...action.payload,
                type: "SvgPath",
            };
            state = { ...state, svgPathOverlayList: [...state.svgPathOverlayList, svgPathOverlay] };
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
        addFracPathOverlay: (state, action: { payload: Omit<Overlay2DFracPath, "type">; type: string }) => {
            const fracPathOverlay: Overlay2DFracPath = {
                ...action.payload,
                type: "FracPath",
            };
            state = { ...state, fracPathOverlayList: [...state.fracPathOverlayList, fracPathOverlay] };
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
