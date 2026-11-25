/**
 * 3D annotations, and the text/LaTeX consolidation that came with them.
 *
 * - The annotations slice and its factory.
 * - LaTeX 2D overlays now being text with `latex` set, with the old action still accepted.
 * - Vector labels: the LaTeX switch replacing $...$ inference, and the migration of old labels.
 * - The pure parts of the text rasteriser: reading and restyling MathJax's SVG.
 * - That all of it survives a protobuf session round trip.
 */
import { describe, expect, it } from "@jest/globals";
import { configureStore } from "@reduxjs/toolkit";
import { moorhensession } from "../../src/protobuf/MoorhenSession";
import annotationsReducer, {
    addAnnotation,
    addAnnotations,
    emptyAnnotations,
    newAnnotation,
    removeAnnotationById,
    removeAnnotationsByTag,
    updateAnnotation,
} from "../../src/store/annotationsSlice";
import overlaysReducer, { addLatexOverlay, addTextOverlay, latexToTextOverlay, removeLatexOverlay } from "../../src/store/overlaysSlice";
import { migrateVectorLatexLabel } from "../../src/store/vectorsSlice";
import { newVector } from "../../src/utils/vectorFactories";
import {
    contrastingTextColour,
    MATHJAX_EX_PER_EM,
    parseMathJaxSvgMetrics,
    styleMathJaxSvg,
    textStyleKey,
} from "../../src/utils/textStyle";
import { textBatchesOf } from "../../src/WebGPUComponents/textLayer";

const annotationsStore = () => configureStore({ reducer: { annotations: annotationsReducer } });
const overlaysStore = () => configureStore({ reducer: { overlays: overlaysReducer }, middleware: m => m({ serializableCheck: false }) });

describe("annotations slice", () => {
    it("adds, updates in place, and removes by id", () => {
        const store = annotationsStore();
        const a = newAnnotation({ text: "one" });
        const b = newAnnotation({ text: "two" });
        store.dispatch(addAnnotation(a));
        store.dispatch(addAnnotation(b));
        store.dispatch(updateAnnotation({ uniqueId: a.uniqueId, changes: { text: "uno", alwaysOnTop: true } }));
        let list = store.getState().annotations.annotationsList;
        expect(list.map(x => x.text)).toEqual(["uno", "two"]);
        expect(list[0].alwaysOnTop).toBe(true);
        expect(list[0].uniqueId).toBe(a.uniqueId);

        store.dispatch(removeAnnotationById(a.uniqueId));
        list = store.getState().annotations.annotationsList;
        expect(list.map(x => x.uniqueId)).toEqual([b.uniqueId]);
    });

    it("cannot change an annotation's id through an update", () => {
        const store = annotationsStore();
        const a = newAnnotation();
        store.dispatch(addAnnotation(a));
        store.dispatch(updateAnnotation({ uniqueId: a.uniqueId, changes: { uniqueId: "other", text: "x" } as never }));
        expect(store.getState().annotations.annotationsList[0].uniqueId).toBe(a.uniqueId);
    });

    it("removes by tag, and an empty tag query removes nothing", () => {
        const store = annotationsStore();
        store.dispatch(
            addAnnotations([
                newAnnotation({ tags: { source: "app" } }),
                newAnnotation({ tags: { source: "app", molecule: "m1" } }),
                newAnnotation({ tags: { source: "other" } }),
            ])
        );
        store.dispatch(removeAnnotationsByTag({}));
        expect(store.getState().annotations.annotationsList).toHaveLength(3);
        store.dispatch(removeAnnotationsByTag({ source: "app" }));
        expect(store.getState().annotations.annotationsList.map(x => x.tags)).toEqual([{ source: "other" }]);
        store.dispatch(emptyAnnotations());
        expect(store.getState().annotations.annotationsList).toEqual([]);
    });

    it("defaults to plain, filled text at a point, without a colour of its own", () => {
        const a = newAnnotation();
        expect(a.latex).toBe(false);
        expect(a.drawStyle).toBe("fill");
        expect(a.positionMode).toBe("point");
        expect(a.alwaysOnTop).toBe(false);
        expect(a.colour).toBeUndefined();
        expect(newAnnotation().uniqueId).not.toBe(a.uniqueId);
    });
});

describe("2D LaTeX is text with latex set", () => {
    it("addLatexOverlay adds a text overlay, its height becoming the em size", () => {
        const store = overlaysStore();
        store.dispatch(addLatexOverlay({ x: 0.1, y: 0.2, height: 30, text: "\\alpha", uniqueId: "l1", zIndex: 2 }));
        const state = store.getState().overlays;
        expect("latexOverlayList" in state).toBe(false);
        expect(state.textOverlayList).toEqual([
            {
                type: "Text",
                x: 0.1,
                y: 0.2,
                text: "\\alpha",
                fontFamily: "serif",
                fontPixelSize: 30,
                drawStyle: "fill",
                uniqueId: "l1",
                zIndex: 2,
                latex: true,
            },
        ]);
    });

    it("removeLatexOverlay removes it by id, leaving other text", () => {
        const store = overlaysStore();
        store.dispatch(addLatexOverlay({ x: 0, y: 0, height: 20, text: "x^2", uniqueId: "l1" }));
        store.dispatch(addTextOverlay({ x: 0, y: 0, text: "plain", fontFamily: "serif", fontPixelSize: 12, uniqueId: "t1" }));
        store.dispatch(removeLatexOverlay({ uniqueId: "l1" }));
        expect(store.getState().overlays.textOverlayList.map(t => t.uniqueId)).toEqual(["t1"]);
    });

    it("latexToTextOverlay is what the reducer stores", () => {
        expect(latexToTextOverlay({ x: 1, y: 2, height: 9, text: "y", uniqueId: "u" }).latex).toBe(true);
    });
});

describe("vector labels", () => {
    it("migrates an old $...$ label to the switch, dropping the dollars", () => {
        const old = { ...newVector({ labelText: "$\\Delta G$" }), labelIsLatex: undefined };
        const migrated = migrateVectorLatexLabel(old);
        expect(migrated.labelText).toBe("\\Delta G");
        expect(migrated.labelIsLatex).toBe(true);
    });

    it("leaves a label that already says either way alone", () => {
        const plainOnPurpose = newVector({ labelText: "$5$", labelIsLatex: false });
        expect(migrateVectorLatexLabel(plainOnPurpose)).toBe(plainOnPurpose);
        const latex = newVector({ labelText: "x", labelIsLatex: true });
        expect(migrateVectorLatexLabel(latex)).toBe(latex);
    });

    it("leaves an old label without dollars alone", () => {
        const old = { ...newVector({ labelText: "3.4 A" }), labelIsLatex: undefined };
        expect(migrateVectorLatexLabel(old)).toBe(old);
        const lone = { ...newVector({ labelText: "$" }), labelIsLatex: undefined };
        expect(migrateVectorLatexLabel(lone)).toBe(lone);
    });

    it("new vectors state the switch, so they are never migrated", () => {
        expect(newVector().labelIsLatex).toBe(false);
    });
});

// What MathJax 3 writes for "x^2", trimmed.
const MATHJAX_SVG =
    '<svg style="vertical-align: -0.186ex;" xmlns="http://www.w3.org/2000/svg" width="2.009ex" height="2.072ex" role="img" focusable="false" viewBox="0 -833.9 888 915.9">' +
    '<g stroke="currentColor" fill="currentColor"><rect width="1ex" height="3ex"></rect></g></svg>';

describe("MathJax SVG handling", () => {
    it("reads the size and depth from the root element only", () => {
        expect(parseMathJaxSvgMetrics(MATHJAX_SVG)).toEqual({ widthEx: 2.009, heightEx: 2.072, depthEx: 0.186 });
    });

    it("returns null for an SVG without a size in ex", () => {
        expect(parseMathJaxSvgMetrics('<svg width="10" height="10"></svg>')).toBeNull();
        expect(parseMathJaxSvgMetrics("")).toBeNull();
    });

    it("sets the colour and a pixel size on the root, and nowhere else", () => {
        const styled = styleMathJaxSvg(MATHJAX_SVG, "#ff0000ff", 40, 41.5);
        const root = styled.substring(0, styled.indexOf(">"));
        expect(root).toContain('color="#ff0000ff"');
        expect(root).toContain('width="40.00px"');
        expect(root).toContain('height="41.50px"');
        expect(styled).toContain('<rect width="1ex" height="3ex">');
    });

    it("sizes one em as the font size: an ex is MathJax's x-height", () => {
        expect(MATHJAX_EX_PER_EM).toBeCloseTo(0.43, 2);
    });
});

describe("text style helpers", () => {
    it("picks white on dark backgrounds and black on light ones", () => {
        expect(contrastingTextColour([0, 0, 0, 1])).toBe("#ffffff");
        expect(contrastingTextColour([1, 1, 1, 1])).toBe("#000000");
    });

    it("keys pixels by everything that changes them", () => {
        const base = { text: "a", fontFamily: "serif", fontPixelSize: 20 };
        const key = (s: object, ratio = 2, fallback = "white") => textStyleKey({ ...base, ...s }, ratio, fallback);
        const keys = [
            key({}),
            key({ latex: true }),
            key({ fontPixelSize: 21 }),
            key({ colour: "#ff0000ff" }),
            key({ drawStyle: "stroke" }),
            key({ drawStyle: "stroke", lineWidth: 3 }),
            key({}, 1),
            key({}, 2, "black"),
        ];
        expect(new Set(keys).size).toBe(keys.length);
        // A line width only matters for an outline.
        expect(key({ lineWidth: 3 })).toBe(key({}));
    });
});

describe("annotation atlases in the WebGPU text batches", () => {
    it("draw in the scene and on top as each annotation chose, before the 2D overlays", () => {
        const atlas = () => ({ canvasBig: null, nBigTextures: 0, bigTextureTexOrigins: [], bigTextureTexOffsets: [], bigTextureScalings: [], bigTextureScreenOffsets: [], revision: 0 }) as never;
        const [labels, inScene, onTop, overlay] = [atlas(), atlas(), atlas(), atlas()];
        const batches = textBatchesOf({
            labelsTextCanvasTexture: labels,
            annotationsInSceneTextCanvasTexture: inScene,
            annotationsOnTopTextCanvasTexture: onTop,
            measureText2DCanvasTexture: overlay,
        });
        expect(batches.map(b => [b.atlas, b.onTop])).toEqual([
            [labels, true],
            [inScene, false],
            [onTop, true],
            [overlay, true],
        ]);
    });
});

describe("session round trip", () => {
    const roundTrip = (session: object) => {
        const bytes = moorhensession.Session.encode(moorhensession.Session.fromObject(session as never)).finish();
        return moorhensession.Session.toObject(moorhensession.Session.decode(bytes)) as Record<string, any>;
    };

    it("keeps annotations, including tags and a coordinate of 0 once through the factory", () => {
        const annotation = newAnnotation({
            text: "\\beta",
            latex: true,
            colour: "#00ff00ff",
            positionMode: "atom",
            molUniqueId: "mol-1",
            cid: "//A/10/CA",
            x: 0,
            y: 1.5,
            z: -2,
            alwaysOnTop: true,
            tags: { source: "test" },
        });
        const back = roundTrip({ version: "1", annotationData: [annotation] }).annotationData[0];
        const restored = newAnnotation(back);
        expect(restored).toEqual(annotation);
    });

    it("keeps a text overlay's LaTeX switch, line width and depth", () => {
        const text = { x: 0.5, y: 0.5, text: "x", fontFamily: "serif", fontPixelSize: 20, uniqueId: "t", latex: true, lineWidth: 2, zIndex: 3 };
        const back = roundTrip({ version: "1", overlay2dData: { textFracPath2D: [text] } }).overlay2dData.textFracPath2D[0];
        expect(back).toMatchObject({ latex: true, lineWidth: 2, zIndex: 3 });
    });

    it("keeps a vector's LaTeX switch, so a plain $...$ label is not migrated on load", () => {
        const vector = newVector({ labelText: "$5$", labelIsLatex: false, labelFontSize: 30 });
        const back = roundTrip({ version: "1", vectorData: [vector] }).vectorData[0];
        expect(back.labelIsLatex).toBe(false);
        expect(back.labelFontSize).toBe(30);
        expect(migrateVectorLatexLabel(back).labelText).toBe("$5$");
    });
});
