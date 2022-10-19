import { cootCommand, postCootMessage, readDataFile } from "../BabyGruUtils"
import { readMapFromArrayBuffer, mapToMapGrid } from '../WebGL/mgWebGLReadMap';

export function BabyGruMap(cootWorker) {
    this.cootWorker = cootWorker
    this.contourLevel = 0.5
    this.mapColour = [0.3, 0.3, 1.0, 1.0]
    this.liveUpdatingMaps = {}
    this.webMGContour = true
    this.cootContour = false
    this.displayObjects = { 'Coot': [] }
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

BabyGruMap.prototype.makeWebMGLive = function (gl) {
    const $this = this
    $this.webMGContour = true
    if (!gl.liveUpdatingMaps.includes($this.liveUpdatingMaps['WebMG'])) {
        gl.liveUpdatingMaps.push($this.liveUpdatingMaps['WebMG'])
    }
    gl.reContourMaps()
    gl.drawScene()
}

BabyGruMap.prototype.makeWebMGUnlive = function (gl) {
    const $this = this
    $this.webMGContour = false
    gl.liveUpdatingMaps = gl.liveUpdatingMaps.filter(item => item !== $this.liveUpdatingMaps['WebMG'])
    $this.liveUpdatingMaps['WebMG'].theseBuffers.forEach(buffer => {
        buffer.clearBuffers()
    })
    gl.reContourMaps()
    gl.drawScene()
}

BabyGruMap.prototype.makeCootLive = function (gl, mapRadius) {
    const $this = this
    $this.cootContour = true
    $this.doCootContour(gl,
        -gl.origin[0],
        -gl.origin[1],
        -gl.origin[2],
        mapRadius, $this.contourLevel)
    gl.drawScene()
}

BabyGruMap.prototype.makeCootUnlive = function (gl) {
    const $this = this
    $this.cootContour = false
    $this.clearBuffersOfStyle('Coot')
    gl.drawScene()
}


BabyGruMap.prototype.contour = function (gl) {
    const $this = this
    $this.getMap()
        .then(reply => {
            let map = readMapFromArrayBuffer(reply.data.result.mapData);
            var mapGrid = mapToMapGrid(map);
            var mapTriangleData = { "mapGrids": [mapGrid], "col_tri": [[]], "norm_tri": [[]], "vert_tri": [[]], "idx_tri": [[]], "prim_types": [[]] };
            let _ = gl.appendOtherData(mapTriangleData);
            var newMap = gl.liveUpdatingMaps[gl.liveUpdatingMaps.length - 1]

            newMap.contourLevel = $this.contourLevel
            newMap.mapColour = $this.mapColour
            $this.liveUpdatingMaps['WebMG'] = newMap

            if (!$this.webMGContour) {
                gl.liveUpdatingMaps = gl.liveUpdatingMaps.filter(item => item !== newMap)
            }
            else {
                gl.reContourMaps()
            }

            if ($this.cootContour) {
                $this.doCootContour(gl,
                    -gl.origin[0],
                    -gl.origin[1],
                    -gl.origin[2],
                    15, $this.contourLevel)
            }
            gl.drawScene()
        })
}

BabyGruMap.prototype.clearBuffersOfStyle = function (style) {
    const $this = this
    //Empty existing buffers of this type
    $this.displayObjects[style].forEach((buffer) => {
        buffer.clearBuffers()
    })
    $this.displayObjects[style] = []
}

BabyGruMap.prototype.doCootContour = function (gl, x, y, z, radius, contourLevel) {

    const $this = this

    return new Promise((resolve, reject)=>{
        cootCommand($this.cootWorker, {
            returnType: "mesh",
            command: "get_map_contours_mesh",
            commandArgs: [$this.mapMolNo, x, y, z, radius, contourLevel]
        }).then(response => {
            const objects = [response.data.result.result]
            $this.clearBuffersOfStyle('Coot')
            //$this.displayObjects['Coot'] = [...$this.displayObjects['Coot'], ...objects.map(object=>gl.appendOtherData(object, true))]
            objects.forEach(object => {
                var a = gl.appendOtherData(object, true);
                $this.displayObjects['Coot'] = $this.displayObjects['Coot'].concat(a)
            })
            gl.buildBuffers();
            gl.drawScene();
            resolve(true)
        })
    })

}