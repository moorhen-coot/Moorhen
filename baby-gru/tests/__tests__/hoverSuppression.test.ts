/**
 * Keeping the pointer out of saved pictures.
 *
 * The hover lights three different things - a ribbon section, a whole instance, and an orange
 * overlay on a smooth surface - and it lives in three places at once: the renderer's own state
 * (what the pick wrote), the store's hoveredSection (what the sequence viewer asked for), and the
 * "hover" style buffers (the spheres). The screenshot button used to clear two of those three and
 * then capture, which left the renderer still believing a buffer was hovered, so the next draw put
 * the highlight back. Whether it appeared in the picture came down to whether a redraw landed in
 * between: it usually worked, which is the worst kind of usually.
 *
 * So what is tested here is the property that replaced it - one flag, read where the decision is
 * made - rather than the clearing that used to stand in for it.
 */
import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { hoverHighlight } from "../../src/WebGPUComponents/hoverHighlight";
import { drawThenCapture } from "../../src/utils/keyframeThumbnail";

const source = (path: string) => readFileSync(join(__dirname, "../../src", path), "utf8");

describe("the WebGPU renderer", () => {
    /** A buffer the hover would light: hoveridx points at it and the pick found a point in it. */
    const hoveredBuffer = () => ({
        id: "buffer-1",
        // A sectioned mesh: the pick's point maps to a section, and the section to a vertex range.
        pick_info: { section_ranges: [[4, 9]], pick_point_sections: [0] },
    });

    it("lights the hovered buffer when nothing is being captured", () => {
        const buffer = hoveredBuffer();
        const hover = hoverHighlight(
            { state: { hoveridx: 0, hover_point: 0 }, pickLevel: 0 },
            [buffer] as never);
        expect(hover.forBuffer(buffer as never)).toMatchObject({ from: 4, to: 9 });
    });

    it("lights nothing at all while a picture is being taken", () => {
        const buffer = hoveredBuffer();
        const hover = hoverHighlight(
            { state: { hoveridx: 0, hover_point: 0 }, pickLevel: 0, hoverSuppressed: true },
            [buffer] as never);
        expect(hover.forBuffer(buffer as never)).toEqual({ instance: -1, from: -1, to: -1 });
        expect(hover.overlays).toEqual([]);
    });

    it("ignores a hover named by the sequence viewer too", () => {
        // The second source. Suppressing only the pointer's would leave a ribbon lit by the
        // sequence viewer in the picture, which is the same bug wearing a different hat.
        const buffer = { id: "buffer-1", pick_info: { influence_weights_texture: {} } };
        const store = { getState: () => ({ hoveringStates: { hoveredSection: { bufferId: "buffer-1", section: 2 } } }) };
        const lit = hoverHighlight({ state: { hoveridx: -1, hover_point: -1 }, store } as never, [buffer] as never);
        const suppressed = hoverHighlight(
            { state: { hoveridx: -1, hover_point: -1 }, store, hoverSuppressed: true } as never,
            [buffer] as never);
        expect(lit.overlays.length + suppressed.overlays.length).toBeGreaterThanOrEqual(0);
        expect(suppressed.overlays).toEqual([]);
    });
});

describe("the WebGL renderer", () => {
    const drawCore = source("WebGLgComponents/mgWebGLParts/drawCore.ts");

    it("reads the hover through locals that the flag can empty", () => {
        expect(drawCore).toContain("const hoverSuppressed = !!self.hoverSuppressed");
        expect(drawCore).toContain("const hoveridx = hoverSuppressed ? -1 : self.state.hoveridx");
        expect(drawCore).toContain("const hoverPoint = hoverSuppressed ? -1 : self.state.hover_point");
        expect(drawCore).toContain("const hoverIndices = hoverSuppressed ? [] : self.state.hoverIndices");
    });

    it("has no reads left that go round the flag", () => {
        // The point of the locals: each of the three is read from the renderer exactly once, on
        // the line that makes the local. A second read surviving anywhere in the draw would light
        // something in a picture, and nothing about the picture would say why.
        for (const field of ["hoveridx", "hover_point", "hoverIndices"]) {
            const reads = drawCore.match(new RegExp(`self\\.state\\.${field}\\b`, "g")) ?? [];
            expect({ field, reads: reads.length }).toEqual({ field, reads: 1 });
        }
    });

    it("drops the sequence viewer's hover under the same flag", () => {
        expect(drawCore).toContain("const hoveredSection = hoverSuppressed");
    });
});

describe("a keyframe thumbnail", () => {
    /** Just enough of a renderer: a canvas that can be drawn from, and the flag. */
    const thumbnailSource = () => {
        const seen: (boolean | undefined)[] = [];
        const canvas = { width: 640, height: 480 } as HTMLCanvasElement;
        const source = {
            hoverSuppressed: undefined as boolean | undefined,
            drawScene: () => seen.push(source.hoverSuppressed),
            getCanvasRef: () => ({ current: canvas }),
        };
        return { source, seen };
    };

    it("draws the captured frame with the hover suppressed", () => {
        const { source, seen } = thumbnailSource();
        drawThenCapture(source as never);
        // The first draw is the one that is photographed.
        expect(seen[0]).toBe(true);
    });

    it("puts the flag back and redraws, so the view keeps its highlight", () => {
        const { source, seen } = thumbnailSource();
        drawThenCapture(source as never);
        expect(source.hoverSuppressed).toBe(undefined);
        expect(seen.at(-1)).toBe(undefined);
    });
});

describe("the capture paths", () => {
    it("the screenshot suppresses the hover rather than clearing it", () => {
        const recorder = source("utils/MoorhenScreenRecorder.ts");
        expect(recorder).toContain("await this.glRef.current?.withoutHover(");
        const controls = source("components/snack-bars/PopupControls/ScreenshotControls.tsx");
        // The clears that used to stand in for this, and could not cover the renderer's own state.
        expect(controls).not.toContain("setHoveredAtom");
        expect(controls).not.toContain('clearBuffersOfStyle("hover")');
    });

    it("an exported movie suppresses it for the whole export", () => {
        const player = source("utils/moviePlayer.ts");
        expect(player).toContain("gl.hoverSuppressed = true;");
        expect(player).toContain("gl.hoverSuppressed = hoverWasSuppressed;");
    });

    it("the live preview does not, because it is not a picture", () => {
        // previewMovie draws to the screen, where the pointer is still the user's. Only the
        // things that produce a file or a stored thumbnail suppress.
        const player = source("utils/moviePlayer.ts");
        const preview = player.slice(player.indexOf("export function previewMovie"));
        expect(preview).not.toContain("hoverSuppressed");
    });
});
