import { cootCommand, postCootMessage, readDataFile } from "../BabyGruUtils"
import { readMapFromArrayBuffer, mapToMapGrid } from '../WebGL/mgWebGLReadMap';

export function BabyGruMap(cootWorker) {
    this.cootWorker = cootWorker
    this.liveUpdatingMaps = {}
    this.displayObjects = {}
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
            $this.displayObjects['2FoFc'] = $this.displayObjects['2FoFc'].concat(newBuffers)
            gl.drawScene()
        })
}

BabyGruMap.prototype.cootContour = function (gl, x, y, z, radius, contourLevel) {
    const $this = this
    Object.keys($this.displayObjects).forEach(style => {
        const objectCategoryBuffers = $this.displayObjects[style]
        if (objectCategoryBuffers.length > 0) {
            objectCategoryBuffers.forEach((buffer) => {
                buffer.clearBuffers()
            })
        }
        $this.displayObjects[style] = []
    })

    return cootCommand($this.cootWorker, {
        returnType: "mesh",
        command: "get_map_contours_mesh",
        commandArgs: [$this.mapMolNo, x, y, z, radius, contourLevel]
    }).then(response => {
        console.log('result', response)
        const objects = [response.data.result.result]
        objects.forEach(object => {
            var a = gl.appendOtherData(object, true);
            $this.displayObjects['2FoFc'] = $this.displayObjects['2FoFc'].concat(a)
        })
        gl.buildBuffers();
        gl.drawScene();
    })

}