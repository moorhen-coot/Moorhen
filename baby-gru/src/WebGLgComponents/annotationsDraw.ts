import { Store } from "@reduxjs/toolkit";
import type { RootState } from "../store/MoorhenReduxStore";
import type { MoorhenAnnotation } from "../store/annotationsSlice";
import { contrastingTextColour, rasteriseTextStyle, textStyleKey } from "../utils/textStyle";
import { selectionCentroid } from "./vectorsDraw";

/** One annotation, ready for a TextCanvasTexture's addBigTextureTextImage. */
export interface AnnotationLabel {
    label: { imgData: ImageData; font: string; text: string; x: number; y: number; z: number };
    uuid: string;
}

/**
 * Where an annotation is, or null if it is on atoms that cannot be found (a molecule since
 * closed, or a selection that no longer picks anything out).
 */
export const annotationPosition = (
    annotation: MoorhenAnnotation,
    molecules: { uniqueId: string; gemmiStructure: unknown }[]
): [number, number, number] | null => {
    if (annotation.positionMode === "atom") {
        const molecule = molecules.find(mol => mol.uniqueId === annotation.molUniqueId);
        return molecule && annotation.cid ? selectionCentroid(molecule, annotation.cid) : null;
    }
    return [annotation.x, annotation.y, annotation.z];
};

/**
 * Rasterise the annotations, split by how they are drawn: depth-tested and fogged with the
 * scene, or over everything.
 *
 * Each is drawn into pixels here rather than handed to the atlas as text, because the atlas only
 * fills glyphs, in one colour picked from the background, and annotations have their own colour,
 * may be outlined, and may be LaTeX.
 *
 * @param atlasWidth - The atlases' width in pixels; nothing wider can be placed in one.
 */
export const getAnnotationLabels = async (
    store: Store<RootState>,
    atlasWidth = 1024
): Promise<{ inScene: AnnotationLabel[]; onTop: AnnotationLabel[] }> => {
    const state = store.getState();
    const annotations = state.annotations.annotationsList;
    const molecules = state.molecules.moleculeList;
    const fallbackColour = contrastingTextColour(state.sceneSettings.backgroundColor);
    const pixelRatio = window.devicePixelRatio || 1;

    const inScene: AnnotationLabel[] = [];
    const onTop: AnnotationLabel[] = [];
    for (const annotation of annotations) {
        const position = annotationPosition(annotation, molecules);
        if (!position) continue;
        const pixels = await rasteriseTextStyle(annotation, pixelRatio, fallbackColour, atlasWidth);
        if (!pixels) continue;
        const label: AnnotationLabel = {
            label: {
                imgData: pixels.imgData,
                // Unused for pixels, beyond being part of the atlas's cache key.
                font: "10px sans-serif",
                // The atlas caches by text, so this has to change whenever the pixels would.
                text: textStyleKey(annotation, pixelRatio, fallbackColour),
                x: position[0],
                y: position[1],
                z: position[2],
            },
            uuid: annotation.uniqueId,
        };
        (annotation.alwaysOnTop ? onTop : inScene).push(label);
    }
    return { inScene, onTop };
};
