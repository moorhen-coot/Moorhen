
export class MockWebGL {
    constructor() {
        this.buffers = []
        this.origin = [0, 0, 0]
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
