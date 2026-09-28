import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Overlay2DFracPath {
    type: "FracPath";
    path: number[];
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

const overlaysSlice = createSlice({
    name: "overlays",
    initialState: initialState,
    reducers: {
        addImageOverlay: (state, action: PayloadAction<Omit<Overlay2DImageSrcFrac, "type">>) => {
            const imageOverlay: Overlay2DImageSrcFrac = {
                ...action.payload,
                type: "Image",
            };
            state.imageOverlayList.push(imageOverlay);
        },
        removeImageOverlay: (state, action: PayloadAction<Overlay2DImageSrcFrac>) => {
            state.imageOverlayList = state.imageOverlayList.filter(item => item.uniqueId !== action.payload.uniqueId);
        },
        addLatexOverlay: (state, action: PayloadAction<Omit<Overlay2DLatexSrcFrac, "type">>) => {
            const latexOverlay: Overlay2DLatexSrcFrac = {
                ...action.payload,
                type: "Latex",
            };
            state.latexOverlayList.push(latexOverlay);
        },
        removeLatexOverlay: (state, action: PayloadAction<Overlay2DLatexSrcFrac>) => {
            state.latexOverlayList = state.latexOverlayList.filter(item => item.uniqueId !== action.payload.uniqueId);
        },
        addTextOverlay: (state, action: PayloadAction<Omit<Overlay2DTextFrac, "type">>) => {
            const textOverlay: Overlay2DTextFrac = {
                ...action.payload,
                type: "Text",
            };
            state.textOverlayList.push(textOverlay);
        },
        removeTextOverlay: (state, action: PayloadAction<Overlay2DTextFrac>) => {
            state.textOverlayList = state.textOverlayList.filter(item => item.uniqueId !== action.payload.uniqueId);
        },
        addSvgPathOverlay: (state, action: PayloadAction<Omit<Overlay2DSvgPath, "type">>) => {
            const svgPathOverlay: Overlay2DSvgPath = {
                ...action.payload,
                type: "SvgPath",
            };
            state.svgPathOverlayList.push(svgPathOverlay);
        },
        removeSvgPathOverlay: (state, action: PayloadAction<Overlay2DSvgPath>) => {
            state.svgPathOverlayList = state.svgPathOverlayList.filter(item => item.uniqueId !== action.payload.uniqueId);
        },
        addFracPathOverlay: (state, action: PayloadAction<Omit<Overlay2DFracPath, "type">>) => {
            const fracPathOverlay: Overlay2DFracPath = {
                ...action.payload,
                type: "FracPath",
            };
            state.fracPathOverlayList.push(fracPathOverlay);
        },
        removeFracPathOverlay: (state, action: PayloadAction<Overlay2DFracPath>) => {
            state.fracPathOverlayList = state.fracPathOverlayList.filter(item => item.uniqueId !== action.payload.uniqueId);
        },
        addCallback: (state, action: PayloadAction<Function>) => {
            state.callBacks.push(action.payload);
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
