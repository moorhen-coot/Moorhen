/**
 * The movie being authored.
 *
 * In the store rather than in the panel, for one reason: a movie outlives the panel. Side panels
 * are unmounted when they are closed, so a document held in component state would be thrown away
 * by closing the panel to look at something - which, since authoring a movie consists largely of
 * looking at things, would happen constantly.
 *
 * All the editing lives in utils/movieEditing as plain functions. The reducers here only say which
 * one to call, so the rules that matter - a deleted keyframe merging its segments, an object
 * introduced to every keyframe rather than one - are tested without a store.
 *
 * ON FROZEN STATE
 *
 * Redux Toolkit freezes state in development. Two consequences worth stating, because both have
 * bitten this codebase already:
 *
 *  - every editing function returns a new document and mutates nothing, which is what makes them
 *    safe here;
 *  - a keyframe taken *out* of here and handed to the camera must be copied first. captureKeyframe
 *    stores plain arrays and cameraTargetFrom copies them element by element, so the live path is
 *    safe; anything new that reaches into a keyframe's quat should do the same rather than hand
 *    the array to a renderer that mutates in place.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Keyframe, Motion, Segment } from "../utils/cameraPath";
import { type MovieDocument, type MovieOutputSettings, type MovieSceneSettings, emptyMovie } from "../utils/movieDocument";
import {
    addKeyframe, applySceneToAll, cloneKeyframe, deleteKeyframe, introduceObject, moveKeyframe,
    releaseObject, removeTrailingSegment, replaceKeyframe, setObjectOpacity, setSceneSettings,
    setSegment,
} from "../utils/movieEditing";

export interface MovieState {
    document: MovieDocument;
    /**
     * Which keyframe the panel is working on, or null for none.
     *
     * Kept beside the document rather than in the panel because deleting a keyframe has to move
     * it, and a selection that outlived the thing it pointed at would read as an empty editor
     * over a movie that plainly has keyframes in it.
     */
    selected: number | null;
    /** Where the document came from, for the title bar and for deciding what Save means. */
    fileName: string | null;
    /**
     * A movie is playing or being rendered. The scene must not change under it: switching scene
     * deletes the representations it fades, and a snapshot moves the camera it holds.
     */
    isPlaying: boolean;
}

const initialState: MovieState = {
    document: emptyMovie(),
    selected: null,
    fileName: null,
    isPlaying: false,
};

/** Keep the selection pointing at something, after the list it indexes has changed length. */
const clampSelection = (state: MovieState) => {
    const count = state.document.path.keyframes.length;
    if (count === 0) state.selected = null;
    else if (state.selected === null) state.selected = 0;
    else state.selected = Math.max(0, Math.min(state.selected, count - 1));
};

export const movieSlice = createSlice({
    name: "movie",
    initialState,
    reducers: {
        setMovieDocument: (state, action: PayloadAction<MovieDocument>) => {
            state.document = action.payload;
            clampSelection(state);
        },
        setMovieName: (state, action: PayloadAction<string>) => {
            state.document = { ...state.document, name: action.payload };
        },
        setMovieFileName: (state, action: PayloadAction<string | null>) => {
            state.fileName = action.payload;
        },
        newMovie: state => {
            state.document = emptyMovie();
            state.selected = null;
            state.fileName = null;
        },

        setMoviePlaying: (state, action: PayloadAction<boolean>) => {
            state.isPlaying = action.payload;
        },

        selectKeyframe: (state, action: PayloadAction<number | null>) => {
            state.selected = action.payload;
        },

        appendKeyframe: (state, action: PayloadAction<Keyframe>) => {
            state.document = addKeyframe(state.document, action.payload);
            // Select what was just added. The next thing an author does is almost always to it.
            state.selected = state.document.path.keyframes.length - 1;
        },
        insertKeyframe: (state, action: PayloadAction<{ keyframe: Keyframe; at: number }>) => {
            state.document = addKeyframe(state.document, action.payload.keyframe, action.payload.at);
            state.selected = action.payload.at;
        },
        updateKeyframe: (state, action: PayloadAction<{ index: number; keyframe: Keyframe }>) => {
            state.document = replaceKeyframe(state.document, action.payload.index, action.payload.keyframe);
        },
        removeKeyframe: (state, action: PayloadAction<number>) => {
            state.document = deleteKeyframe(state.document, action.payload);
            clampSelection(state);
        },
        duplicateKeyframe: (state, action: PayloadAction<number>) => {
            state.document = cloneKeyframe(state.document, action.payload);
            // Select the copy, not the original. The reason to clone is to carry on from here, so
            // the new one is what the next edit is meant for - and with two identical cards in the
            // list, a selection left on the first is simply misleading about which is which.
            state.selected = Math.min(
                action.payload + 1, state.document.path.keyframes.length - 1);
        },
        reorderKeyframe: (state, action: PayloadAction<{ from: number; to: number }>) => {
            state.document = moveKeyframe(state.document, action.payload.from, action.payload.to);
            state.selected = action.payload.to;
        },

        updateSegment: (state, action: PayloadAction<{ index: number; change: Partial<Segment> }>) => {
            state.document = setSegment(state.document, action.payload.index, action.payload.change);
        },
        updateMotion: (state, action: PayloadAction<{ index: number; motion: Motion }>) => {
            state.document = setSegment(state.document, action.payload.index, { motion: action.payload.motion });
        },
        /** End on the last keyframe rather than on a motion. See removeTrailingSegment. */
        clearTrailingMotion: state => {
            state.document = removeTrailingSegment(state.document);
        },

        spreadSceneFromKeyframe: (state, action: PayloadAction<number>) => {
            state.document = applySceneToAll(state.document, action.payload);
        },
        updateMovieScene: (state, action: PayloadAction<Partial<MovieSceneSettings>>) => {
            state.document = setSceneSettings(state.document, action.payload);
        },
        updateMovieOutput: (state, action: PayloadAction<Partial<MovieOutputSettings>>) => {
            state.document = { ...state.document, output: { ...state.document.output, ...action.payload } };
        },

        updateObjectOpacity: (
            state, action: PayloadAction<{ index: number; id: string; value: number }>,
        ) => {
            state.document = setObjectOpacity(
                state.document, action.payload.index, action.payload.id, action.payload.value);
        },
        addObjectToMovie: (state, action: PayloadAction<{ id: string; value?: number }>) => {
            state.document = introduceObject(state.document, action.payload.id, action.payload.value ?? 0);
        },
        removeObjectFromMovie: (state, action: PayloadAction<string>) => {
            state.document = releaseObject(state.document, action.payload);
        },
    },
});

export const {
    setMovieDocument, setMovieName, setMovieFileName, newMovie,
    setMoviePlaying, selectKeyframe,
    appendKeyframe, insertKeyframe, updateKeyframe, removeKeyframe, reorderKeyframe,
    duplicateKeyframe,
    updateSegment, updateMotion, clearTrailingMotion,
    spreadSceneFromKeyframe, updateMovieScene, updateMovieOutput,
    updateObjectOpacity, addObjectToMovie, removeObjectFromMovie,
} = movieSlice.actions;

export default movieSlice.reducer;
