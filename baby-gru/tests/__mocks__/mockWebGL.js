
export class MockWebGL {
    constructor() {
        this.buffers = []
        this.origin = [0, 0, 0]
        this.zoom = 0
    }

    setOriginAndZoomAnimated(coords, zoom) {
        this.origin = coords
        this.zoom = zoom
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
