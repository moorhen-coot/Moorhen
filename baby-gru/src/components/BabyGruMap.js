import { postCootMessage, readDataFile } from "../BabyGruUtils"
import { readMapFromArrayBuffer, mapToMapGrid } from '../WebGL/mgWebGLReadMap';

export function BabyGruMap(cootWorker) {
    this.cootWorker = cootWorker
    this.liveUpdatingMaps = {}
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
                }).then(reply => {
                    $this.name = reply.data.result.name
                    $this.mapMolNo = reply.data.result.mapMolNo
                    resolve($this)
                })
            })
    })
}

BabyGruMap.prototype.getMap = function () {
    const $this = this
    return postCootMessage($this.cootWorker, {
        message: 'get_map',
        mapMolNo: $this.mapMolNo
    })
}

BabyGruMap.prototype.contour = function (gl) {
    const $this = this
    $this.getMap()
        .then(reply => {
            let map = readMapFromArrayBuffer(reply.data.result.mapData);
            var mapGrid = mapToMapGrid(map);
            var mapTriangleData = { "mapGrids": [mapGrid], "col_tri": [[]], "norm_tri": [[]], "vert_tri": [[]], "idx_tri": [[]], "prim_types": [[]] };
            var newBuffers = gl.appendOtherData(mapTriangleData);

            var newMap = gl.liveUpdatingMaps[gl.liveUpdatingMaps.length - 1]

            newMap.contourLevel = 0.5
            newMap.mapColour = [0.2, 0.7, 0.2, 0.5]
            $this.liveUpdatingMaps['2FoFc'] = newMap
            gl.reContourMaps()
            for (var buffer of newBuffers) {
                buffer.visible = true
            }
            $this.displayBuffers['2FoFc'] = $this.displayBuffers['2FoFc'].concat(newBuffers)
            gl.drawScene()
        })
}