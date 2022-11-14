import { cootCommand, postCootMessage, readDataFile } from "./BabyGruUtils"
import { readMapFromArrayBuffer, mapToMapGrid } from '../WebGL/mgWebGLReadMap';

export function BabyGruMap(commandCentre) {
    this.commandCentre = commandCentre
    this.contourLevel = 0.5
    this.mapColour = [0.3, 0.3, 1.0, 1.0]
    this.liveUpdatingMaps = {}
    this.webMGContour = false
    this.cootContour = true
    this.displayObjects = { Coot: [] }
    this.litLines = true
}

BabyGruMap.prototype.delete = async function (gl) {
    const $this = this
    Object.getOwnPropertyNames(this.displayObjects).forEach(displayObject => {
        if(this.displayObjects[displayObject].length > 0) {this.clearBuffersOfStyle(gl, displayObject)}
    })
    const inputData = {message:"delete", coordMolNo:$this.mapMolNo}
    const response = await $this.commandCentre.current.postMessage(inputData)
    return response
}


BabyGruMap.prototype.loadToCootFromURL = function (url, mapName, selectedColumns) {
    const $this = this
    console.log('Off to fetch url', url)
    //Remember to change this to an appropriate URL for downloads in produciton, and to deal with the consequent CORS headache
    return fetch(url, { mode: "no-cors" })
        .then(response => {
            return response.blob()
        }).then(reflectionData => reflectionData.arrayBuffer())
        .then(arrayBuffer => {
            return $this.loadToCootFromData(new Uint8Array(arrayBuffer), mapName, selectedColumns)
        })
        .catch((err) => { console.log(err) })
}


BabyGruMap.prototype.loadToCootFromData = function (data, mapName, selectedColumns) {
    const $this = this
    $this.mapName = mapName
    return new Promise((resolve, reject) => {
        return this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "shim_read_mtz",
            commandArgs: [data, mapName, selectedColumns]
        })
            .then(reply => {
                $this.mapMolNo = reply.data.result.result
                resolve($this)
            })
    })
}

BabyGruMap.prototype.loadToCootFromFile = function (source, selectedColumns) {
    const $this = this
    return readDataFile(source)
        .then(reflectionData => {
            const asUIntArray = new Uint8Array(reflectionData)
            return $this.loadToCootFromData(asUIntArray, source.name, selectedColumns)
        })
}

BabyGruMap.prototype.getMap = function () {
    const $this = this
    return this.commandCentre.current.postMessage({
        message: 'get_map',
        mapMolNo: $this.mapMolNo
    })
}

BabyGruMap.prototype.makeWebMGLive = function (gl) {
    const $this = this
    $this.webMGContour = true
    let promise
    if (!Object.keys($this.liveUpdatingMaps).includes("WebMG")){
        promise = $this.contour(gl)
    }
    else {
        promise = Promise.resolve(true)
    }
    promise.then(()=>{
        if (!gl.liveUpdatingMaps.includes($this.liveUpdatingMaps['WebMG'])) {
            gl.liveUpdatingMaps.push($this.liveUpdatingMaps['WebMG'])
        }
        gl.reContourMaps()
        gl.drawScene()
    })

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
    $this.clearBuffersOfStyle(gl, 'Coot')
    gl.buildBuffers();
    gl.drawScene();
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

            gl.drawScene()
        })
}

BabyGruMap.prototype.clearBuffersOfStyle = function (gl, style) {
    const $this = this
    //console.log('In clear buffers', style, $this.displayObjects)
    //Empty existing buffers of this type
    $this.displayObjects[style].forEach((buffer) => {
        buffer.clearBuffers()
        gl.displayBuffers = gl.displayBuffers?.filter(glBuffer => glBuffer.id !== buffer.id)
    })
    $this.displayObjects[style] = []
}

BabyGruMap.prototype.doCootContour = function (gl, x, y, z, radius, contourLevel) {

    const $this = this

    let returnType =  "lines_mesh"
    if(this.litLines)
        returnType =  "lit_lines_mesh"

    return new Promise((resolve, reject) => {
        this.commandCentre.current.cootCommand( {
            returnType: returnType,
            command: "get_map_contours_mesh",
            commandArgs: [$this.mapMolNo, x, y, z, radius, contourLevel]
        }).then(response => {
            const objects = [response.data.result.result]
            $this.clearBuffersOfStyle(gl, "Coot")
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

