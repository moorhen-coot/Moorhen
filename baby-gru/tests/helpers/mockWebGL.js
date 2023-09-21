
export class MockWebGL {
    constructor() {
        this.buffers = []
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
