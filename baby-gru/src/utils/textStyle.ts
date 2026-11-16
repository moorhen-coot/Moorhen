import { getMathJaxSVG } from "./mathJaxUtils";

/**
 * How a piece of text looks, wherever it is drawn: 2D overlay text, 3D annotations, and the
 * shared editor that sets both.
 *
 * Plain text and LaTeX are one thing with a switch rather than two object types. The fields a
 * LaTeX string does not use (fontFamily, drawStyle, lineWidth) are kept, not cleared, so that
 * toggling the switch back restores what was there.
 */
export interface MoorhenTextStyle {
    text: string;
    /** Typeset `text` as LaTeX (MathJax) rather than drawing it with fillText/strokeText. */
    latex?: boolean;
    fontFamily: string;
    /** Size in screen (CSS) pixels. For LaTeX this is the em size the formula is set at. */
    fontPixelSize: number;
    /**
     * A CSS colour, usually `#rrggbbaa`. Left out, the text takes white or black, whichever
     * stands out from the background.
     */
    colour?: string;
    /** Filled or outlined glyphs. Ignored for LaTeX, which is always filled. */
    drawStyle?: "fill" | "stroke";
    /** Outline width in screen pixels, for drawStyle "stroke". */
    lineWidth?: number;
}

/** The generic families every browser has, offered after any fonts the app has loaded. */
export const GENERIC_FONT_FAMILIES = ["serif", "sans-serif", "monospace", "cursive", "fantasy"];

/**
 * MathJax's TeX fonts have an x-height of 0.4306em (MathJax 3, `ex` in its SVG output). Its SVG
 * gives width and height in ex, so this is what turns those into pixels at a given em size.
 */
export const MATHJAX_EX_PER_EM = 0.4306;

/** White or black (as #rrggbb), whichever stands out from a background given as 0-1 RGB(A). */
export const contrastingTextColour = (background: number[]): string => {
    const brightness = background[0] * 0.299 + background[1] * 0.587 + background[2] * 0.114;
    return brightness < 0.5 ? "#ffffff" : "#000000";
};

/** The size of a MathJax SVG, in ex, read from its root element. */
export interface MathJaxSvgMetrics {
    widthEx: number;
    heightEx: number;
    /** How far the box reaches below the baseline (positive downwards). */
    depthEx: number;
}

/**
 * Read width, height and depth from a MathJax SVG.
 *
 * MathJax writes `width="..ex" height="..ex"` and `style="vertical-align: -..ex"` on the root
 * `<svg>`; only the root tag is looked at, so the same attributes on inner elements are not
 * mistaken for it.
 *
 * @returns The metrics, or null when the root tag does not carry a size in ex.
 */
export const parseMathJaxSvgMetrics = (svg: string): MathJaxSvgMetrics | null => {
    const start = svg.indexOf("<svg");
    if (start < 0) return null;
    const end = svg.indexOf(">", start);
    const rootTag = svg.substring(start, end < 0 ? undefined : end);
    const width = /\swidth="([-\d.]+)ex"/.exec(rootTag);
    const height = /\sheight="([-\d.]+)ex"/.exec(rootTag);
    if (!width || !height) return null;
    const align = /vertical-align:\s*([-\d.]+)ex/.exec(rootTag);
    const widthEx = parseFloat(width[1]);
    const heightEx = parseFloat(height[1]);
    if (!(widthEx > 0) || !(heightEx > 0)) return null;
    return { widthEx, heightEx, depthEx: align ? Math.max(0, -parseFloat(align[1])) : 0 };
};

/**
 * Give a MathJax SVG a colour and a size in pixels.
 *
 * MathJax draws in currentColor, so setting `color` on the root colours the whole formula. The
 * ex sizes are replaced by pixel ones so that the browser rasterises the image at the size it
 * will be drawn, rather than at a small natural size that is then scaled up and blurred.
 */
export const styleMathJaxSvg = (svg: string, colour: string, widthPx: number, heightPx: number): string => {
    const start = svg.indexOf("<svg");
    const end = svg.indexOf(">", start);
    if (start < 0 || end < 0) return svg;
    let rootTag = svg.substring(start, end);
    rootTag = rootTag
        .replace(/\swidth="[^"]*"/, ` width="${widthPx.toFixed(2)}px"`)
        .replace(/\sheight="[^"]*"/, ` height="${heightPx.toFixed(2)}px"`)
        .replace(/\scolor="[^"]*"/, "");
    rootTag = rootTag.replace("<svg", `<svg color="${colour.replace(/"/g, "")}"`);
    return svg.substring(0, start) + rootTag + svg.substring(end);
};

/** A typeset LaTeX string, ready to draw. */
export interface LatexImage {
    img: HTMLImageElement;
    /** Size in CSS pixels at the requested fontPixelSize. */
    width: number;
    height: number;
    /** Distance from the top of the image to the baseline, in CSS pixels. */
    ascent: number;
}

/**
 * Typeset a LaTeX string as an image.
 *
 * @param tex - The LaTeX source, without surrounding $ signs.
 * @param fontPixelSize - The em size in CSS pixels.
 * @param colour - Any CSS colour.
 * @param resolution - Device pixels per CSS pixel the image will be drawn at. The image's natural
 * size is the CSS size times this; the returned width, height and ascent stay in CSS pixels.
 * @returns The image once decoded, or null if MathJax is unavailable or could not typeset it.
 */
export const latexToImage = async (tex: string, fontPixelSize: number, colour: string, resolution = 1): Promise<LatexImage | null> => {
    if (!tex) return null;
    const { svg } = await getMathJaxSVG(tex);
    if (!svg) return null;
    const metrics = parseMathJaxSvgMetrics(svg);
    if (!metrics) return null;
    const exPx = MATHJAX_EX_PER_EM * fontPixelSize;
    const width = metrics.widthEx * exPx;
    const height = metrics.heightEx * exPx;
    const ascent = height - metrics.depthEx * exPx;
    const styled = styleMathJaxSvg(svg, colour, width * resolution, height * resolution);
    const img = new window.Image();
    const blobUrl = URL.createObjectURL(new Blob([styled], { type: "image/svg+xml" }));
    img.crossOrigin = "Anonymous";
    img.src = blobUrl;
    try {
        await img.decode();
    } catch (e) {
        console.error("Failed to decode typeset LaTeX", e);
        URL.revokeObjectURL(blobUrl);
        return null;
    }
    return { img, width, height, ascent };
};

/** Pixels of a styled string, and where its baseline is. */
export interface RasterisedText {
    imgData: ImageData;
    /** Rows from the top of imgData to the baseline. */
    ascent: number;
}

const blankContext = (width: number, height: number): OffscreenCanvasRenderingContext2D => {
    const canvas = new OffscreenCanvas(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
    return canvas.getContext("2d");
};

/**
 * Draw a styled string into pixels, for a texture atlas.
 *
 * @param style - What to draw.
 * @param pixelRatio - Device pixels per CSS pixel; fontPixelSize and lineWidth are multiplied by it.
 * @param fallbackColour - Used when the style has no colour of its own.
 * @param maxWidth - Widest image allowed, in device pixels. A wider string is drawn smaller to
 * fit, because the atlas cannot hold it at all otherwise.
 * @returns The pixels, or null for empty text or LaTeX that could not be typeset.
 */
export const rasteriseTextStyle = async (
    style: MoorhenTextStyle,
    pixelRatio: number,
    fallbackColour: string,
    maxWidth = 1024
): Promise<RasterisedText | null> => {
    if (!style.text) return null;
    const colour = style.colour || fallbackColour;

    if (style.latex) {
        let latex = await latexToImage(style.text, style.fontPixelSize, colour, pixelRatio);
        if (!latex) return null;
        if (latex.width * pixelRatio > maxWidth) {
            // Typeset again smaller rather than squash the pixels, which would blur them.
            URL.revokeObjectURL(latex.img.src);
            const shrink = (maxWidth / (latex.width * pixelRatio)) * 0.98;
            latex = await latexToImage(style.text, style.fontPixelSize * shrink, colour, pixelRatio);
            if (!latex) return null;
        }
        const w = Math.max(1, Math.ceil(latex.width * pixelRatio));
        const h = Math.max(1, Math.ceil(latex.height * pixelRatio));
        const ctx = blankContext(w, h);
        ctx.drawImage(latex.img, 0, 0, w, h);
        URL.revokeObjectURL(latex.img.src);
        return { imgData: ctx.getImageData(0, 0, w, h), ascent: Math.round(latex.ascent * pixelRatio) };
    }

    const stroke = style.drawStyle === "stroke";
    const family = style.fontFamily || "sans-serif";
    let px = Math.max(1, Math.round(style.fontPixelSize * pixelRatio));
    const lineWidth = stroke ? Math.max(0.5, (style.lineWidth ?? 1) * pixelRatio) : 0;
    const pad = Math.ceil(lineWidth) + 1;

    const measuring = blankContext(1, 1);
    measuring.font = `${px}px ${family}`;
    let metrics = measuring.measureText(style.text);
    let advance = Math.max(metrics.width, metrics.actualBoundingBoxRight);
    if (advance + 2 * pad > maxWidth) {
        px = Math.max(1, Math.floor(px * (maxWidth - 2 * pad) / advance * 0.98));
        measuring.font = `${px}px ${family}`;
        metrics = measuring.measureText(style.text);
        advance = Math.max(metrics.width, metrics.actualBoundingBoxRight);
    }
    const ascent = Math.ceil(metrics.actualBoundingBoxAscent) + pad;
    const descent = Math.ceil(metrics.actualBoundingBoxDescent) + pad;
    const left = Math.ceil(Math.max(0, metrics.actualBoundingBoxLeft)) + pad;
    const w = Math.ceil(advance) + left + pad;
    const h = ascent + descent;

    const ctx = blankContext(w, h);
    ctx.font = `${px}px ${family}`;
    ctx.textBaseline = "alphabetic";
    if (stroke) {
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = "round";
        ctx.strokeStyle = colour;
        ctx.strokeText(style.text, left, ascent);
    } else {
        ctx.fillStyle = colour;
        ctx.fillText(style.text, left, ascent);
    }
    return { imgData: ctx.getImageData(0, 0, Math.max(1, w), Math.max(1, h)), ascent };
};

/**
 * A key that changes whenever the rasterised pixels would.
 *
 * Used as the "text" of an atlas entry made from pixels, so that two annotations that look the
 * same share one patch of the atlas and two that differ in any way do not.
 */
export const textStyleKey = (style: MoorhenTextStyle, pixelRatio: number, fallbackColour: string): string =>
    [
        style.latex ? "latex" : "text",
        style.text,
        style.fontFamily,
        style.fontPixelSize,
        style.colour || fallbackColour,
        style.latex ? "" : style.drawStyle ?? "fill",
        style.latex || style.drawStyle !== "stroke" ? "" : style.lineWidth ?? 1,
        pixelRatio,
    ].join("\u0000");
