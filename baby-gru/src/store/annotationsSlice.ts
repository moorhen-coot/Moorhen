import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { matchesTags, Tags } from "../utils/tags";
import type { MoorhenTextStyle } from "../utils/textStyle";

/** Where an annotation is: a fixed point, or the centre of the atoms a selection picks out. */
export type AnnotationPositionMode = "point" | "atom";

/**
 * A text label placed in the 3D scene, as CCP4MG's annotations.
 *
 * The text keeps a constant size on screen (fontPixelSize, in CSS pixels) whatever the zoom; only
 * its position is in the scene. The style fields are the ones 2D text overlays use, and are set
 * with the same editor.
 */
export interface MoorhenAnnotation extends MoorhenTextStyle {
    uniqueId: string;
    positionMode: AnnotationPositionMode;
    /** The position for positionMode "point", in Angstroms. */
    x: number;
    y: number;
    z: number;
    /** The molecule and selection for positionMode "atom". Several atoms give their centroid. */
    molUniqueId?: string;
    cid?: string;
    /** Draw over everything rather than hidden by what is in front of it, and without fog. */
    alwaysOnTop?: boolean;
    /** Who made this annotation, and how it should group. See utils/tags. */
    tags?: Tags;
    /** Set by an owner to mean "do not edit in place"; the API's edit leaves a locked one alone. */
    locked?: boolean;
}

/**
 * A default annotation, with any fields given in place of the defaults.
 *
 * The colour is left out, so that until one is chosen the text is white or black, whichever
 * stands out from the background.
 */
export const newAnnotation = (overrides: Partial<MoorhenAnnotation> = {}): MoorhenAnnotation => ({
    text: "Annotation",
    latex: false,
    fontFamily: "sans-serif",
    fontPixelSize: 24,
    drawStyle: "fill",
    lineWidth: 1,
    positionMode: "point",
    x: 0,
    y: 0,
    z: 0,
    molUniqueId: "",
    cid: "",
    alwaysOnTop: false,
    uniqueId: uuidv4(),
    ...overrides,
});

const initialState: { annotationsList: MoorhenAnnotation[] } = {
    annotationsList: [],
};

const annotationsSlice = createSlice({
    name: "annotations",
    initialState: initialState,
    reducers: {
        addAnnotation: (state, action: PayloadAction<MoorhenAnnotation>) => {
            state.annotationsList.push(action.payload);
        },
        addAnnotations: (state, action: PayloadAction<MoorhenAnnotation[]>) => {
            state.annotationsList.push(...action.payload);
        },
        /**
         * Change some fields of an annotation, keeping its place in the list. Locking is the
         * caller's business (the instance API refuses to edit a locked one); this applies what
         * it is given.
         */
        updateAnnotation: (state, action: PayloadAction<{ uniqueId: string; changes: Partial<Omit<MoorhenAnnotation, "uniqueId">> }>) => {
            const index = state.annotationsList.findIndex(item => item.uniqueId === action.payload.uniqueId);
            if (index < 0) return;
            const { uniqueId: _ignored, ...changes } = action.payload.changes as Partial<MoorhenAnnotation>;
            state.annotationsList[index] = { ...state.annotationsList[index], ...changes };
        },
        removeAnnotationById: (state, action: PayloadAction<string>) => {
            state.annotationsList = state.annotationsList.filter(item => item.uniqueId !== action.payload);
        },
        /** Remove every annotation carrying all of the given tags. An empty query removes nothing. */
        removeAnnotationsByTag: (state, action: PayloadAction<Tags>) => {
            const query = action.payload;
            if (!query || Object.keys(query).length === 0) return;
            state.annotationsList = state.annotationsList.filter(item => !matchesTags(item, query));
        },
        emptyAnnotations: () => {
            return initialState;
        },
    },
});

export const { addAnnotation, addAnnotations, updateAnnotation, removeAnnotationById, removeAnnotationsByTag, emptyAnnotations } =
    annotationsSlice.actions;

export default annotationsSlice.reducer;
