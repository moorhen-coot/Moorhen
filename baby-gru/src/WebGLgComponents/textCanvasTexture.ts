import { AtlasPacker } from "./atlasPacker";
import { RootState } from '@/store/MoorhenReduxStore';
import { webGL } from '../types/mgWebGL';
import { Store } from '@reduxjs/toolkit';

interface Dictionary<T> {
    [Key: string]: T;
}

export class TextCanvasTexture {
    gl: WebGL2RenderingContext;
    ext: any;
    instanced_ext: any;
    nBigTextures: number;
    nBigTexturesInt: number;
    refI: Dictionary<number>;
    bigTextureTexOrigins: number[][];
    bigTextureTexOffsets: number[][];
    bigTextureScalings: number[][];
    bigTextureScreenOffsets: number[][];
    canvasBig: OffscreenCanvas;
    contextBig: OffscreenCanvasRenderingContext2D;
    /** Where each rasterised string sits. Replaces the three cursor fields it used to carry. */
    packer: AtlasPacker;

    /**
     * Set when a string could not be placed, so the next frame starts from an empty atlas.
     *
     * Deferred rather than compacted on the spot: strings already added this frame have had their
     * texture coordinates pushed into the instance arrays, and rebuilding underneath them would
     * leave every one of those labels pointing at a slot that had moved. One frame missing one
     * label, on the rare occasion the atlas fills, is the cheaper mistake.
     */
    atlasFull = false;
    bigTextTex: WebGLTexture;
    bigTextureTexOffsetsBuffer: WebGLBuffer;
    bigTextureTextInstanceOriginBuffer: WebGLBuffer;
    bigTextureTextInstanceSizeBuffer: WebGLBuffer;
    bigTextureTextScreenOffsetBuffer: WebGLBuffer;
    bigTextureTextTexCoordBuffer: WebGLBuffer;
    bigTextureTextPositionBuffer: WebGLBuffer;
    bigTextureTextIndexesBuffer: WebGLBuffer;
    textureCache: Dictionary<Dictionary<Dictionary<number[]>>>;
    shader: webGL.ShaderTextInstanced;
    store: Store<RootState>;
    /**
     * What the atlas currently holds, or null when that is unknown.
     *
     * Null rather than an empty string so that "nothing has been drawn yet" and "the atlas holds
     * no text" are distinguishable: the first must rebuild, the second need not.
     */
    contentKey: string | null = null;

    constructor(gl,ext,instanced_ext,shader,width=1024,height=4096, store: Store<RootState>) {
        this.gl = gl
        this.ext = ext
        this.instanced_ext = instanced_ext
        this.shader = shader
        this.nBigTextures = 0;
        this.nBigTexturesInt = 0;
        this.refI = {};
        this.bigTextureTexOrigins = []
        this.bigTextureTexOffsets = []
        this.bigTextureScalings   = []
        this.bigTextureScreenOffsets = []
        this.canvasBig = new OffscreenCanvas(width,Math.min(height,this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)))
        this.contextBig = this.canvasBig.getContext("2d");
        this.packer = new AtlasPacker(this.canvasBig.width, this.canvasBig.height);
        this.contextBig.fillStyle = "#00000000";
        this.contextBig.fillRect(0, 0, this.canvasBig.width, this.canvasBig.height);
        this.bigTextTex = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bigTextTex);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        // Give the texture its storage up front. Uploads are incremental now, and texSubImage2D
        // has nothing to write into unless the full extent has been allocated at least once.
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.canvasBig);
        this.bigTextureTexOffsetsBuffer = this.gl.createBuffer();
        this.bigTextureTextInstanceOriginBuffer = this.gl.createBuffer();
        this.bigTextureTextInstanceSizeBuffer = this.gl.createBuffer();
        this.bigTextureTextScreenOffsetBuffer = this.gl.createBuffer();
        this.bigTextureTextTexCoordBuffer = this.gl.createBuffer();
        this.bigTextureTextPositionBuffer = this.gl.createBuffer();
        this.bigTextureTextIndexesBuffer = this.gl.createBuffer();
        this.textureCache = {};
        this.store = store;
    }

    draw() {
        const zoom = this.store.getState().sceneSettings.zoom
        const canvasHeight = this.store.getState().glRef.canvasSize[1]
        const isWebGL2 = this.store.getState().glRef.isWebGL2

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bigTextTex);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);

        this.gl.enableVertexAttribArray(this.shader.vertexTextureAttribute);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextTexCoordBuffer);
        this.gl.vertexAttribPointer(this.shader.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.enableVertexAttribArray(this.shader.vertexPositionAttribute);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextPositionBuffer);
        this.gl.vertexAttribPointer(this.shader.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.enableVertexAttribArray(this.shader.offsetAttribute);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextInstanceOriginBuffer);
        this.gl.vertexAttribPointer(this.shader.offsetAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.enableVertexAttribArray(this.shader.sizeAttribute);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextInstanceSizeBuffer);
        this.gl.vertexAttribPointer(this.shader.sizeAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.enableVertexAttribArray(this.shader.textureOffsetAttribute);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTexOffsetsBuffer);
        this.gl.vertexAttribPointer(this.shader.textureOffsetAttribute, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.enableVertexAttribArray(this.shader.screenOffsetAttribute);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextScreenOffsetBuffer);
        this.gl.vertexAttribPointer(this.shader.screenOffsetAttribute, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.bigTextureTextIndexesBuffer);

        this.gl.uniform1f(this.shader.pixelZoom,zoom*this.canvasBig.height/canvasHeight);

        if (isWebGL2) {
            this.gl.vertexAttribDivisor(this.shader.sizeAttribute, 1);
            this.gl.vertexAttribDivisor(this.shader.offsetAttribute, 1);
            this.gl.vertexAttribDivisor(this.shader.textureOffsetAttribute, 1);
            this.gl.vertexAttribDivisor(this.shader.screenOffsetAttribute, 1);
            this.gl.drawElementsInstanced(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0, this.nBigTextures);
            this.gl.vertexAttribDivisor(this.shader.sizeAttribute, 0);
            this.gl.vertexAttribDivisor(this.shader.offsetAttribute, 0);
            this.gl.vertexAttribDivisor(this.shader.textureOffsetAttribute, 0);
            this.gl.vertexAttribDivisor(this.shader.screenOffsetAttribute, 0);
        } else {
            this.instanced_ext.vertexAttribDivisorANGLE(this.shader.sizeAttribute, 1);
            this.instanced_ext.vertexAttribDivisorANGLE(this.shader.offsetAttribute, 1);
            this.instanced_ext.vertexAttribDivisorANGLE(this.shader.textureOffsetAttribute, 1);
            this.instanced_ext.vertexAttribDivisorANGLE(this.shader.screenOffsetAttribute, 1);
            this.instanced_ext.drawElementsInstancedANGLE(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0, this.nBigTextures);
            this.instanced_ext.vertexAttribDivisorANGLE(this.shader.sizeAttribute, 0);
            this.instanced_ext.vertexAttribDivisorANGLE(this.shader.offsetAttribute, 0);
            this.instanced_ext.vertexAttribDivisorANGLE(this.shader.textureOffsetAttribute, 0);
            this.instanced_ext.vertexAttribDivisorANGLE(this.shader.screenOffsetAttribute, 0);
        }
    }

    /**
     * Push the per-instance data to GL, and the glyph atlas with it unless told otherwise.
     *
     * uploadAtlas defaults to true so that every existing caller behaves exactly as before. Only
     * the per-frame overlay path passes false, and only when beginFrame has just confirmed the
     * atlas is unchanged. The buffers below are a few hundred bytes and are rewritten every
     * frame regardless; the texture is 6 MB and is the whole reason this parameter exists.
     */
    /**
     * Rebuild the per-instance buffers, and send whatever glyphs are new.
     *
     * @param forceFullUpload re-send the entire atlas rather than the dirty region. Only wanted
     *                        when something outside has invalidated the texture; the default
     *                        incremental path is correct for every ordinary frame.
     */
    recreateBigTextureBuffers(forceFullUpload = false) {
        const bigTextureTexCoords  = [0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0]
        const bigTexturePositions  = [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0 ]
        const bigTextureIdxs = [0,1,2,0,2,3]

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTexOffsetsBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.bigTextureTexOffsets.flat()), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextInstanceOriginBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.bigTextureTexOrigins.flat()), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextInstanceSizeBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.bigTextureScalings.flat()), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextScreenOffsetBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.bigTextureScreenOffsets.flat()), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextTexCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(bigTextureTexCoords), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextPositionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(bigTexturePositions), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.bigTextureTextIndexesBuffer);
        if (this.ext) {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(bigTextureIdxs), this.gl.STATIC_DRAW);
        } else {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(bigTextureIdxs), this.gl.STATIC_DRAW);
        }

        if (forceFullUpload) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.bigTextTex);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.canvasBig);
            this.packer.clearDirty();
        } else {
            this.uploadDirtyRegion();
        }

    }

    /**
     * Send only the part of the atlas that has been drawn into since the last upload.
     *
     * This is the point of the whole exercise. The atlas used to go up in full whenever its
     * content changed - 8 MB for a 1024x2048 one, twice over, because clearBigTexture uploaded the
     * blank canvas first - and it changed whenever any single label did. A new label is a few
     * hundred pixels square.
     *
     * getImageData rather than handing texSubImage2D the canvas directly: the form that takes a
     * canvas uploads the whole of it at an offset, with no way to crop the source, so the region
     * has to be read out first. For a small rectangle that read is cheap, and it is the only way
     * to upload less than everything.
     */
    private uploadDirtyRegion() {
        const region = this.packer.dirtyRegion;
        if (region === null) return;

        // Text metrics are fractional, so the region is too. Round outwards - getImageData wants
        // integers, and rounding inwards would shave a column of pixels off the glyph that was
        // just drawn.
        const x = Math.max(0, Math.floor(region.x));
        const y = Math.max(0, Math.floor(region.y));
        const right = Math.min(this.canvasBig.width, Math.ceil(region.x + region.w));
        const bottom = Math.min(this.canvasBig.height, Math.ceil(region.y + region.h));
        const w = right - x;
        const h = bottom - y;
        if (w <= 0 || h <= 0) {
            this.packer.clearDirty();
            return;
        }

        const imageData = this.contextBig.getImageData(x, y, w, h);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bigTextTex);
        this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, x, y, this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData);
        this.packer.clearDirty();
    }

    addImageToBigTexture(t : string, textColour : string, font : string, imgData: ImageData) : number[] | null {
        this.contextBig.textBaseline = "alphabetic";
        this.contextBig.font = font;

        this.contextBig.fillStyle = textColour;

        let actualHeight = imgData.height+1
        let actualBoundingBoxRight = imgData.width
        let width = imgData.width

        if(!(textColour in this.textureCache)){
            this.textureCache[textColour] = {};
        }

        if(!(font.toLowerCase() in this.textureCache[textColour])){
            this.textureCache[textColour][font.toLowerCase()] = {};
        }

        if(t in this.textureCache[textColour][font.toLowerCase()]){
            return this.textureCache[textColour][font.toLowerCase()][t];
        }

        // topInset 0: the image path never had the one-pixel inset the text path uses.
        const placed = this.packer.place(width, actualHeight, actualBoundingBoxRight, 0);
        if(placed === null){
            this.atlasFull = true;
            return null;
        }

        this.contextBig.fillStyle = textColour;
        this.contextBig.putImageData(imgData, placed.x, placed.baseline-actualHeight);

        this.textureCache[textColour][font.toLowerCase()][t] = placed.texCoords;
        return placed.texCoords
    }

    addTextToBigTexture(t : string, textColour : string, font : string) : number[] | null {

        this.contextBig.textBaseline = "alphabetic";
        this.contextBig.font = font;

        this.contextBig.fillStyle = textColour;

        let textMetric = this.contextBig.measureText(t);

        let actualHeight = textMetric.actualBoundingBoxAscent + textMetric.actualBoundingBoxDescent + 2;
        let actualBoundingBoxRight = textMetric.actualBoundingBoxRight
        let actualBoundingBoxDescent = textMetric.actualBoundingBoxDescent
        let width = textMetric.width

        if(!(textColour in this.textureCache)){
            this.textureCache[textColour] = {};
        }

        if(!(font.toLowerCase() in this.textureCache[textColour])){
            this.textureCache[textColour][font.toLowerCase()] = {};
        }

        if(t in this.textureCache[textColour][font.toLowerCase()]){
            return this.textureCache[textColour][font.toLowerCase()][t];
        }

        // A single string wider than the atlas cannot be laid out: fillText would run past the
        // right edge and the texture coordinates below would exceed 1.0, which CLAMP_TO_EDGE
        // turns into a smear of the last column rather than into anything readable. Shrinking the
        // font to fit keeps it legible and, more to the point, keeps it obviously a string.
        if(width > this.canvasBig.width){
            const shrunk = Math.max(1, Math.floor(parseInt(font) * this.canvasBig.width / width * 0.98));
            const smallerFont = font.replace(/^\s*\d+/, String(shrunk));
            console.warn(`text too wide for the glyph atlas (${Math.round(width)} > ${this.canvasBig.width}); `
                         + `drawn at ${shrunk}px instead`);
            this.contextBig.font = smallerFont;
            textMetric = this.contextBig.measureText(t);
            actualHeight = textMetric.actualBoundingBoxAscent + textMetric.actualBoundingBoxDescent + 2;
            actualBoundingBoxRight = textMetric.actualBoundingBoxRight;
            actualBoundingBoxDescent = textMetric.actualBoundingBoxDescent;
            width = textMetric.width;
        }

        const placed = this.packer.place(width, actualHeight, actualBoundingBoxRight, 1);
        if(placed === null){
            this.atlasFull = true;
            return null;
        }

        this.contextBig.fillStyle = textColour;
        this.contextBig.fillText(t, placed.x, placed.baseline-actualBoundingBoxDescent, width);

        this.textureCache[textColour][font.toLowerCase()][t] = placed.texCoords;
        return placed.texCoords
    }

    clearBigTexture() {
        this.contextBig.fillStyle = "#00000000";
        this.contextBig.clearRect(0, 0, this.canvasBig.width, this.canvasBig.height);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bigTextTex);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.canvasBig);
        this.textureCache = {};
        this.packer.reset();
        // The whole atlas has just gone up blank, so there is nothing outstanding to upload.
        this.packer.clearDirty();
        this.atlasFull = false;
        // The atlas no longer holds what any remembered key described, so the next frame must
        // rebuild. This matters because clearBigTexture is public and called from elsewhere:
        // without it, an outside clear would be followed by a frame that skipped the upload and
        // drew from an atlas that had just been wiped.
        this.contentKey = null;
        this.resetInstances();
    }

    /**
     * Drop the per-instance arrays, keeping the rasterised glyphs.
     *
     * This is the half of clearBigTexture that has to happen every frame. Where each label sits
     * changes as the view moves, so the origins, offsets, scalings and screen offsets are rebuilt
     * from scratch each time; the pixels of the glyphs themselves do not change and are the
     * expensive part to recreate.
     */
    resetInstances() {
        this.nBigTextures = 0;
        this.nBigTexturesInt = 0;
        this.refI = {};
        this.bigTextureTexOrigins = []
        this.bigTextureTexOffsets = []
        this.bigTextureScalings   = []
        this.bigTextureScreenOffsets = []
    }

    /** The text colour the atlas would currently rasterise with, from the background. */
    currentTextColour(): string {
        const background_colour = this.store.getState().sceneSettings.backgroundColor;
        const bright_y = background_colour[0] * 0.299 + background_colour[1] * 0.587 + background_colour[2] * 0.114;
        return bright_y < 0.5 ? "white" : "black";
    }

    /**
     * A key over everything that decides what the atlas looks like.
     *
     * Font, text and colour, in order. Order is part of it because it decides the layout: the
     * same strings packed in a different sequence get different texture coordinates, so treating
     * two orderings as equal would leave every label showing its neighbour's glyphs.
     *
     * The separators are control characters rather than anything that can appear in a label,
     * so that ["a", "b"] cannot collide with ["a b"].
     */
    contentKeyFor(items: { text: string, font: string }[], textColour?: string): string {
        const colour = textColour ?? this.currentTextColour();
        return colour + "\u0002" + items.map(i => i.font + "\u0000" + i.text).join("\u0001");
    }

    /**
     * Begin a frame's worth of text.
     *
     * The rasterised glyphs are kept. Only the per-instance arrays are dropped, because where each
     * label sits changes as the view moves while its pixels do not - and a string already in the
     * atlas costs a dictionary lookup rather than a re-rasterise and a multi-megabyte upload.
     *
     * This used to wipe the atlas whenever the content differed at all, so one label changing out
     * of fifty threw away the other forty-nine. The content key is still recorded, but it no
     * longer decides anything: what to upload is now answered by which pixels were drawn into.
     *
     * The one case that still wipes is an atlas that filled up. Returns whether that happened, so
     * the caller can ask for a full upload rather than an incremental one.
     */
    beginFrame(contentKey: string): boolean {
        if (this.atlasFull) {
            this.clearBigTexture();
            this.contentKey = contentKey;
            return true;
        }
        this.resetInstances();
        this.contentKey = contentKey;
        return false;
    }

    removeBigTextureTextImages(textObjects,uuid=null) {
        textObjects.forEach(label => {
            this.removeBigTextureTextImage(label,uuid)
        })
        this.recreateBigTextureBuffers();
    }

    removeBigTextureTextImage(textObject,uuid=null) {
        const screenOffsetKey = this.getScreenOffsetKey(textObject);
        let key = textObject.text+"_"+textObject.x+"_"+textObject.y+"_"+textObject.z+"_"+textObject.font+"_"+screenOffsetKey
        if(uuid) key += "-"+uuid;
        if(key in this.refI) {
            this.bigTextureTexOrigins[this.refI[key]] = [];
            this.bigTextureTexOffsets[this.refI[key]] = [];
            this.bigTextureScalings[this.refI[key]] = [];
            this.bigTextureScreenOffsets[this.refI[key]] = [];
            delete this.refI[key];
            this.nBigTextures -= 1;
        }
    }

    getScreenOffsetKey(textObject) {
        const screenOffsetVectorX = textObject.screenOffsetVectorX ?? 0.0;
        const screenOffsetVectorY = textObject.screenOffsetVectorY ?? 0.0;
        const screenOffsetVectorZ = textObject.screenOffsetVectorZ ?? 0.0;
        const screenOffsetDistance = textObject.screenOffsetDistance ?? textObject.screenOffsetX ?? 0.0;
        return [
            screenOffsetVectorX,
            screenOffsetVectorY,
            screenOffsetVectorZ,
            screenOffsetDistance,
        ].join("_");
    }

    addBigTextureTextImage(textObject,uuid=null) {

        const background_colour = this.store.getState().sceneSettings.backgroundColor

        const screenOffsetVectorX = textObject.screenOffsetVectorX ?? 0.0;
        const screenOffsetVectorY = textObject.screenOffsetVectorY ?? 0.0;
        const screenOffsetVectorZ = textObject.screenOffsetVectorZ ?? 0.0;
        const screenOffsetDistance = textObject.screenOffsetDistance ?? textObject.screenOffsetX ?? 0.0;
        const screenOffsetKey = this.getScreenOffsetKey(textObject);
        let key = textObject.text+"_"+textObject.x+"_"+textObject.y+"_"+textObject.z+"_"+textObject.font+"_"+screenOffsetKey
        if(uuid) key += "-"+uuid;

        const fontSize = parseInt(textObject.font);
        const x = textObject.x;
        const y = textObject.y;
        const z = textObject.z;
        const o = [x,y,z];

        let colour;
        const bright_y = background_colour[0] * 0.299 + background_colour[1] * 0.587 + background_colour[2] * 0.114;
        if(bright_y<0.5)
            colour = "white";
        else
            colour = "black";

        let t;
        if(textObject.imgData){
            t = this.addImageToBigTexture(textObject.text,colour,textObject.font,textObject.imgData);
        } else {
            t = this.addTextToBigTexture(textObject.text,colour,textObject.font);
        }

        // No room left. The atlas is wiped at the start of the next frame, so this label is absent
        // for one frame rather than drawn with somebody else's texture coordinates.
        if(t === null) return;

        const s = [48 * (t[2]-t[0]) * (this.canvasBig.width / this.canvasBig.height), 48 * (t[3]-t[1]), 1.0];
        this.bigTextureTexOrigins.push(o);
        this.bigTextureTexOffsets.push([t[0], t[2]-t[0], t[1], t[3]-t[1]]);
        this.bigTextureScalings.push(s)
        this.bigTextureScreenOffsets.push([screenOffsetVectorX, screenOffsetVectorY, screenOffsetVectorZ, screenOffsetDistance])
        this.refI[key] = this.nBigTexturesInt;
        this.nBigTextures += 1;
        this.nBigTexturesInt += 1;
    }

}
