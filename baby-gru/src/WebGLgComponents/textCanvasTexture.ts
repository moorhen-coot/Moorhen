import { webGL } from '../types/mgWebGL';
import store from '../store/MoorhenReduxStore'

interface Dictionary<T> {
    [Key: string]: T;
}

export class TextCanvasTexture {
    gl: WebGL2RenderingContext;
    ext: any;
    nBigTextures: number;
    nBigTexturesInt: number;
    refI: Dictionary<number>;
    bigTextureTexOrigins: number[][];
    bigTextureTexOffsets: number[][];
    bigTextureScalings: number[][];
    contextBig: CanvasRenderingContext2D;
    bigTextureCurrentBaseLine: number;
    bigTextureCurrentWidth: number;
    maxCurrentColumnWidth: number;
    bigTextTex: WebGLTexture;
    bigTextureTexOffsetsBuffer: WebGLBuffer;
    bigTextureTextInstanceOriginBuffer: WebGLBuffer;
    bigTextureTextInstanceSizeBuffer: WebGLBuffer;
    bigTextureTextTexCoordBuffer: WebGLBuffer;
    bigTextureTextPositionBuffer: WebGLBuffer;
    bigTextureTextIndexesBuffer: WebGLBuffer;
    textureCache: Dictionary<Dictionary<Dictionary<number[]>>>;
    shader: webGL.ShaderTextInstanced;

    constructor(gl,ext,shader,width=1024,height=4096) {
        this.gl = gl
        this.ext = ext
        this.shader = shader
        this.nBigTextures = 0;
        this.nBigTexturesInt = 0;
        this.refI = {};
        this.bigTextureTexOrigins = []
        this.bigTextureTexOffsets = []
        this.bigTextureScalings   = []
        this.contextBig = document.createElement("canvas").getContext("2d");
        this.contextBig.canvas.width = width;
        this.contextBig.canvas.height = Math.min(height,this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE));
        this.bigTextureCurrentBaseLine = 0;
        this.bigTextureCurrentWidth = 0;
        this.maxCurrentColumnWidth = 0;
        this.contextBig.fillStyle = "#00000000";
        this.contextBig.fillRect(0, 0, this.contextBig.canvas.width, this.contextBig.canvas.height);
        this.bigTextTex = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bigTextTex);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.bigTextureTexOffsetsBuffer = this.gl.createBuffer();
        this.bigTextureTextInstanceOriginBuffer = this.gl.createBuffer();
        this.bigTextureTextInstanceSizeBuffer = this.gl.createBuffer();
        this.bigTextureTextTexCoordBuffer = this.gl.createBuffer();
        this.bigTextureTextPositionBuffer = this.gl.createBuffer();
        this.bigTextureTextIndexesBuffer = this.gl.createBuffer();
        this.textureCache = {};
    }

    draw() {
        const zoom = store.getState().glRef.zoom
        const canvasHeight = store.getState().glRef.canvasSize[1]
        const isWebGL2 = store.getState().glRef.isWebGL2

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

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.bigTextureTextIndexesBuffer);

        this.gl.uniform1f(this.shader.pixelZoom,zoom*this.contextBig.canvas.height/canvasHeight);

        if (isWebGL2) {
            this.gl.vertexAttribDivisor(this.shader.sizeAttribute, 1);
            this.gl.vertexAttribDivisor(this.shader.offsetAttribute, 1);
            this.gl.vertexAttribDivisor(this.shader.textureOffsetAttribute, 1);
            this.gl.drawElementsInstanced(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0, this.nBigTextures);
            this.gl.vertexAttribDivisor(this.shader.sizeAttribute, 0);
            this.gl.vertexAttribDivisor(this.shader.offsetAttribute, 0);
            this.gl.vertexAttribDivisor(this.shader.textureOffsetAttribute, 0);
        }
    }

    recreateBigTextureBuffers() {
        const bigTextureTexCoords  = [0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0]
        const bigTexturePositions  = [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0 ]
        const bigTextureIdxs = [0,1,2,0,2,3]

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTexOffsetsBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.bigTextureTexOffsets.flat()), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextInstanceOriginBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.bigTextureTexOrigins.flat()), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextInstanceSizeBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.bigTextureScalings.flat()), this.gl.STATIC_DRAW);

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

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bigTextTex);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.contextBig.canvas);

    }

    addImageToBigTexture(t : string, textColour : string, font : string) : number[] {
        this.contextBig.textBaseline = "alphabetic";
        this.contextBig.font = font;
        let textMetric = this.contextBig.measureText(t);
        let actualHeight = textMetric.actualBoundingBoxAscent + textMetric.actualBoundingBoxDescent + 2;
        this.contextBig.fillStyle = textColour;
        if(!(textColour in this.textureCache)){
            this.textureCache[textColour] = {};
        }
        if(!(font.toLowerCase() in this.textureCache[textColour])){
            this.textureCache[textColour][font.toLowerCase()] = {};
        }
        if(t in this.textureCache[textColour][font.toLowerCase()]){
            return this.textureCache[textColour][font.toLowerCase()][t];
        }
        if(this.bigTextureCurrentBaseLine+actualHeight>this.contextBig.canvas.height){
            this.bigTextureCurrentBaseLine = 0;
            this.bigTextureCurrentWidth += this.maxCurrentColumnWidth;
            this.maxCurrentColumnWidth = 0;
        }
        const x1 = this.bigTextureCurrentWidth / this.contextBig.canvas.width;
        const y1 = (this.bigTextureCurrentBaseLine + 1)/ this.contextBig.canvas.height;
        this.bigTextureCurrentBaseLine += actualHeight;
        const x2 = x1 + textMetric.actualBoundingBoxRight / this.contextBig.canvas.width;
        const y2 = this.bigTextureCurrentBaseLine / this.contextBig.canvas.height;
        this.contextBig.fillText(t, this.bigTextureCurrentWidth, this.bigTextureCurrentBaseLine-textMetric.actualBoundingBoxDescent, textMetric.width);
        if(textMetric.width>this.maxCurrentColumnWidth){
            this.maxCurrentColumnWidth = textMetric.width;
        }
        this.textureCache[textColour][font.toLowerCase()][t] = [x1,y1,x2,y2];
        return [x1,y1,x2,y2]
    }

    clearBigTexture() {
        this.contextBig.fillStyle = "#00000000";
        this.contextBig.clearRect(0, 0, this.contextBig.canvas.width, this.contextBig.canvas.height);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bigTextTex);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.contextBig.canvas);
        this.nBigTextures = 0
        this.nBigTexturesInt = 0;
        this.refI = {};
        this.textureCache = {};
        this.bigTextureCurrentBaseLine = 0;
        this.bigTextureCurrentWidth = 0;
        this.maxCurrentColumnWidth = 0;
        this.bigTextureTexOrigins = []
        this.bigTextureTexOffsets = []
        this.bigTextureScalings   = []
    }

    removeBigTextureTextImages(textObjects,uuid=null) {
        textObjects.forEach(label => {
            this.removeBigTextureTextImage(label,uuid)
        })
        this.recreateBigTextureBuffers();
    }

    removeBigTextureTextImage(textObject,uuid=null) {
        let key = textObject.text+"_"+textObject.x+"_"+textObject.y+"_"+textObject.z+"_"+textObject.font
        if(uuid) key += "-"+uuid;
        if(key in this.refI) {
            this.bigTextureTexOrigins[this.refI[key]] = [];
            this.bigTextureTexOffsets[this.refI[key]] = [];
            this.bigTextureScalings[this.refI[key]] = [];
            delete this.refI[key];
            this.nBigTextures -= 1;
        }
    }

    addBigTextureTextImage(textObject,uuid=null) {

        const background_colour = store.getState().sceneSettings.backgroundColor

        let key = textObject.text+"_"+textObject.x+"_"+textObject.y+"_"+textObject.z+"_"+textObject.font
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

        const t = this.addImageToBigTexture(textObject.text,colour,textObject.font);
        const s = [fontSize*this.contextBig.canvas.width / this.contextBig.canvas.height * (t[2]-t[0])/0.25, fontSize*(t[3]-t[1]) /0.25, 1.0];
        this.bigTextureTexOrigins.push(o);
        this.bigTextureTexOffsets.push([t[0], t[2]-t[0], t[1], t[3]-t[1]]);
        this.bigTextureScalings.push(s)
        this.refI[key] = this.nBigTexturesInt;
        this.nBigTextures += 1;
        this.nBigTexturesInt += 1;
    }

}
