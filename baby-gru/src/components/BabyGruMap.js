import { postCootMessage, readDataFile } from "../BabyGruUtils"

export function BabyGruMap(cootWorker) {
    this.cootWorker = cootWorker
    this.displayBuffers = []
}

BabyGruMap.prototype.loadToCootFromFile = function (source) {
    const $this = this
    return new Promise((resolve, reject) => {
        return readDataFile(source)
            .then(reflectionData => {
                const asUIntArray = new Uint8Array(reflectionData)
                return postCootMessage($this.cootWorker, {
                    message: 'read_mtz',
                    name: source.name,
                    data: asUIntArray
                }).then(e => {
                    $this.name = e.data.result.name
                    $this.mapMolNo = e.data.result.mapMolNo
                    resolve($this)
                })
            })
    })
}

BabyGruMap.prototype.contour = function (gl) {
    const $this = this
/*
    var map = readMapFromArrayBuffer($this._base64ToArrayBuffer(result.text));
    result.text = null
    var mapGrid = mapToMapGrid(map);
    var mapTriangleData = { "mapGrids": [mapGrid], "col_tri": [[]], "norm_tri": [[]], "vert_tri": [[]], "idx_tri": [[]], "prim_types": [[]] };
    $this.gl.setShowAxes(true);
    var newBuffers = $this.gl.appendOtherData(mapTriangleData);

    var newMap = $this.gl.liveUpdatingMaps[$this.gl.liveUpdatingMaps.length - 1]
    newMap.contourLevel = 0.5
    newMap.mapColour = [0.2, 0.7, 0.2, 0.5]
    $this.liveUpdatingMaps[objectType] = newMap
    $this.gl.reContourMaps()
    for (var buffer of newBuffers) {
        buffer.visible = true
    }
    $this.displayObjects[objectType] = $this.displayObjects[objectType].concat(newBuffers)
    $this.gl.drawScene()


*/
}