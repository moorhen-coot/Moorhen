import type { MGWebGL } from './mgWebGL';

/**
 * 2D-canvas text/circle rasterisation helpers. These draw a string (or a
 * ringed letter) into an offscreen 2D canvas so its pixels can be uploaded as
 * a WebGL texture. They are self-contained: they only touch the reusable
 * drawing contexts (`textCtx`, `circleCtx`, `extraFontCtxs`) and the
 * `*Initialized` flags on the MGWebGL instance, which stay there because the
 * texture-upload code reads their canvases. Only the drawing logic moves here.
 * `self` is the live MGWebGL instance (type-only import avoids a runtime cycle).
 */

export function makeCircleCanvas(self: MGWebGL, text, width, height, circleColour) {
    self.circleCanvasInitialized = false;
    if (!self.circleCanvasInitialized) {
        self.circleCtx.canvas.width = width;
        self.circleCtx.canvas.height = height;
        self.circleCtx.font = "80px helvetica";
        self.circleCtx.textAlign = "left";
        self.circleCtx.textBaseline = "middle";
        self.circleCanvasInitialized = true;
    }
    self.circleCtx.fillStyle = "red";
    self.circleCtx.clearRect(0, 0, self.circleCtx.canvas.width, self.circleCtx.canvas.height);
    self.circleCtx.fillRect(0, 0, self.circleCtx.canvas.width, self.circleCtx.canvas.height);
    self.circleCtx.fillStyle = circleColour;
    self.circleCtx.strokeStyle = circleColour;
    self.circleCtx.lineWidth = width / 10;
    self.circleCtx.arc(width / 2, height / 2, width / 2 - width / 20 - 1, 0, 2 * Math.PI);
    self.circleCtx.stroke();
    const tm = self.circleCtx.measureText(text);
    self.circleCtx.fillText(text, width / 2 - tm.width / 2, height / 2 + 30);
}

// Puts text in center of canvas.
export function makeTextCanvas(self: MGWebGL, text:string, width:number, height:number, textColour:string, font?:string)  : [number,CanvasRenderingContext2D] {
    if(font){
        let theCtx;
        if(self.extraFontCtxs && (font in self.extraFontCtxs)){
            theCtx = self.extraFontCtxs[font];
        } else {
            theCtx = document.createElement("canvas").getContext("2d", {willReadFrequently: true});
        }
        theCtx.canvas.width = width;
        theCtx.canvas.height = height;
        theCtx.textBaseline = "alphabetic";
        theCtx.font = font;
        let textMetric = theCtx.measureText("Mgq!^(){}|'\"~`√∫Å");
        let actualHeight = textMetric.fontBoundingBoxAscent + textMetric.fontBoundingBoxDescent;
        let loop = 0;
        while(actualHeight>theCtx.canvas.height&&loop<3){
            theCtx.canvas.height *= 2;
            theCtx.font = font;
            textMetric = theCtx.measureText("M");
            actualHeight = textMetric.fontBoundingBoxAscent + textMetric.fontBoundingBoxDescent;
            loop += 1;
        }
        theCtx.textAlign = "left";
        theCtx.fillStyle = "#00000000";
        theCtx.fillRect(0, 0, theCtx.canvas.width, theCtx.canvas.height);
        theCtx.fillStyle = textColour;
        theCtx.fillText(text, 0, theCtx.canvas.height + textMetric.ideographicBaseline,theCtx.canvas.width);
        if(!self.extraFontCtxs)
            self.extraFontCtxs = {};
        self.extraFontCtxs[font] = theCtx;
        textMetric = theCtx.measureText(text);
        return [textMetric.actualBoundingBoxRight / width,theCtx];
    }
    self.textCanvasInitialized = false;
    if (!self.textCanvasInitialized) {
        self.textCtx.canvas.width = width;
        self.textCtx.canvas.height = height;
        self.textCtx.font = "20px helvetica";
        self.textCtx.textAlign = "left";
        self.textCtx.textBaseline = "middle";
        self.textCanvasInitialized = true;
    }
    self.textCtx.fillStyle = "#00000000";
    self.textCtx.fillRect(0, 0, self.textCtx.canvas.width, self.textCtx.canvas.height);
    self.textCtx.fillStyle = textColour;
    self.textCtx.fillText(text, 0, height / 2,self.textCtx.canvas.width);
    const textMetric = self.textCtx.measureText(text);
    //Return the maximum width in fractional box coordinates
    return [textMetric.actualBoundingBoxRight / width,self.textCtx];
}
