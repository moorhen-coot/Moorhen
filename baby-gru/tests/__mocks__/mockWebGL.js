
export class MockWebGL {
    constructor() {
        this.buffers = []
        this.origin = [0, 0, 0]
        this.zoom = 0
        this.fontFamily = null
        this.fontSize = null
    }

    setOriginAndZoomAnimated(coords, zoom) {
        this.origin = coords
        this.zoom = zoom
    }

    setTextFont(fontFamily, fontSize) {
        this.fontFamily = fontFamily
        this.fontSize = fontSize
    }

    buildBuffers() {
        //do nothing...
    }

    appendOtherData(jsondata, skipRebuild, name) {
        this.buffers.push(jsondata)
        return [ ]
    }

    drawScene() {
        // do nothing...
    }
}
