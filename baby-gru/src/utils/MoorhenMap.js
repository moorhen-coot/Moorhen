import { readDataFile, guid } from "./MoorhenUtils"
import { readMapFromArrayBuffer, mapToMapGrid } from '../WebGLgComponents/mgWebGLReadMap';

export function MoorhenMap(commandCentre) {
    this.type = 'map'
    this.commandCentre = commandCentre
    this.contourLevel = 0.5
    this.mapRadius = 13
    this.mapColour = [0.3, 0.3, 1.0, 1.0]
    this.liveUpdatingMaps = {}
    this.webMGContour = false
    this.cootContour = true
    this.displayObjects = { Coot: [] }
    this.litLines = true
    this.solid = false
    this.alpha = 1.0
    this.isDifference = false
    this.hasReflectionData = false
    this.selectedColumns = null
    this.associatedReflectionFileName = null
    this.uniqueId = guid()
}

MoorhenMap.prototype.delete = async function (glRef) {
    const $this = this
    Object.getOwnPropertyNames(this.displayObjects).forEach(displayObject => {
        if(this.displayObjects[displayObject].length > 0) {this.clearBuffersOfStyle(glRef, displayObject)}
    })
    glRef.current.drawScene()
    const promises = [
        $this.commandCentre.current.postMessage({
            message:"delete", molNo:$this.molNo
        }),
        $this.hasReflectionData ? 
            $this.commandCentre.current.postMessage({
                message: 'delete_file_name', fileName: $this.associatedReflectionFileName
            })
            :
            Promise.resolve(true)
    ]
    await Promise.all(promises)
}


MoorhenMap.prototype.loadToCootFromMtzURL = async function (url, name, selectedColumns) {
    const $this = this

    try {
        const response = await fetch(url)
        const reflectionData = await response.blob()
        const arrayBuffer = await reflectionData.arrayBuffer()
        const asUIntArray = new Uint8Array(arrayBuffer)
        await $this.loadToCootFromMtzData(asUIntArray, name, selectedColumns)
        if (selectedColumns.calcStructFact) {
            await $this.associateToReflectionData(selectedColumns, asUIntArray)
        }
        return $this
    } catch (err) {
        console.log(err)
        return Promise.reject(err)
    }
}

MoorhenMap.prototype.loadToCootFromMtzData = function (data, name, selectedColumns) {
    const $this = this
    $this.name = name
    return new Promise((resolve, reject) => {
        return this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "shim_read_mtz",
            commandArgs: [data, name, selectedColumns]
        })
            .then(reply => {
                if (reply.data.result.status === 'Exception') {
                    reject(reply.data.result.consoleMessage)
                }
                $this.molNo = reply.data.result.result
                if (Object.keys(selectedColumns).includes('isDifference')){
                    $this.isDifference = selectedColumns.isDifference
                }
                resolve($this)
            })        
            .catch((err) => {
                return Promise.reject(err)
            })
    
    })
}

MoorhenMap.prototype.loadToCootFromMtzFile = async function (source, selectedColumns) {
    const $this = this
    let reflectionData = await readDataFile(source)
    const asUIntArray = new Uint8Array(reflectionData)
    await $this.loadToCootFromMtzData(asUIntArray, source.name, selectedColumns)
    if (selectedColumns.calcStructFact) {
        await $this.associateToReflectionData(selectedColumns, asUIntArray)
    } 
    return $this
}

MoorhenMap.prototype.loadToCootFromMapURL = function (url, name, isDiffMap=false) {
    const $this = this

    return fetch(url)
        .then(response => {
            return response.blob()
        }).then(mapData => mapData.arrayBuffer())
        .then(arrayBuffer => {
            return $this.loadToCootFromMapData(new Uint8Array(arrayBuffer), name, isDiffMap)
        })
        .catch((err) => { 
            return Promise.reject(err)
         })
}

MoorhenMap.prototype.loadToCootFromMapData = function (data, name, isDiffMap) {
    const $this = this
    $this.name = name
    return new Promise((resolve, reject) => {
        return this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "shim_read_ccp4_map",
            commandArgs: [data, name, isDiffMap]
        })
            .then(reply => {
                if (reply.data.result?.status === 'Exception') {
                    reject(reply.data.result.consoleMessage)
                }
                $this.molNo = reply.data.result.result
                $this.isDifference = isDiffMap
                resolve($this)
            })
            .catch((err) => { 
                return Promise.reject(err)
             })    
    })
}

MoorhenMap.prototype.loadToCootFromMapFile = async function (source, isDiffMap) {
    const $this = this
    return readDataFile(source)
        .then(mapData => {
            const asUIntArray = new Uint8Array(mapData)
            return $this.loadToCootFromMapData(asUIntArray, source.name, isDiffMap)
        })
}

MoorhenMap.prototype.getMap = function () {
    const $this = this
    return this.commandCentre.current.postMessage({
        message: 'get_map',
        molNo: $this.molNo
    })
}

MoorhenMap.prototype.makeWebMGLive = function (glRef) {
    const $this = this
    $this.webMGContour = true
    let promise
    if (!Object.keys($this.liveUpdatingMaps).includes("WebMG")){
        promise = $this.contour(glRef)
    }
    else {
        promise = Promise.resolve(true)
    }
    promise.then(()=>{
        if (!glRef.current.liveUpdatingMaps.includes($this.liveUpdatingMaps['WebMG'])) {
            glRef.current.liveUpdatingMaps.push($this.liveUpdatingMaps['WebMG'])
        }
        glRef.current.reContourMaps()
        glRef.current.drawScene()
    })

}

MoorhenMap.prototype.makeWebMGUnlive = function (glRef) {
    const $this = this
    $this.webMGContour = false
    glRef.current.liveUpdatingMaps = glRef.current.liveUpdatingMaps.filter(item => item !== $this.liveUpdatingMaps['WebMG'])
    $this.liveUpdatingMaps['WebMG'].theseBuffers.forEach(buffer => {
        buffer.clearBuffers()
    })
    glRef.current.reContourMaps()
    glRef.current.drawScene()
}

MoorhenMap.prototype.makeCootLive = function (glRef) {
    const $this = this
    $this.cootContour = true
    $this.doCootContour(glRef,
        -glRef.current.origin[0],
        -glRef.current.origin[1],
        -glRef.current.origin[2],
        $this.mapRadius, $this.contourLevel)
    glRef.current.drawScene()
}

MoorhenMap.prototype.makeCootUnlive = function (glRef) {
    const $this = this
    $this.cootContour = false
    $this.clearBuffersOfStyle(glRef, 'Coot')
    glRef.current.buildBuffers();
    glRef.current.drawScene();
}


MoorhenMap.prototype.contour = function (glRef) {
    const $this = this
    $this.getMap()
        .then(reply => {
            let map = readMapFromArrayBuffer(reply.data.result.mapData);
            let mapGrid = mapToMapGrid(map);
            let mapTriangleData = { "mapGrids": [mapGrid], "col_tri": [[]], "norm_tri": [[]], "vert_tri": [[]], "idx_tri": [[]], "prim_types": [[]] };
            glRef.current.appendOtherData(mapTriangleData);
            let newMap = glRef.current.liveUpdatingMaps[glRef.current.liveUpdatingMaps.length - 1]

            newMap.contourLevel = $this.contourLevel
            newMap.mapColour = $this.mapColour
            $this.liveUpdatingMaps['WebMG'] = newMap

            if (!$this.webMGContour) {
                glRef.current.liveUpdatingMaps = glRef.current.liveUpdatingMaps.filter(item => item !== newMap)
            }
            else {
                glRef.current.reContourMaps()
            }

            glRef.current.drawScene()
        })
}

MoorhenMap.prototype.clearBuffersOfStyle = function (glRef, style) {
    const $this = this
    //Empty existing buffers of this type
    $this.displayObjects[style].forEach((buffer) => {
        buffer.clearBuffers()
        glRef.current.displayBuffers = glRef.current.displayBuffers?.filter(glBuffer => glBuffer.id !== buffer.id)
    })
    $this.displayObjects[style] = []
}

MoorhenMap.prototype.doCootContour = function (glRef, x, y, z, radius, contourLevel) {

    const $this = this

    let returnType
    if(this.solid) {
        returnType = "mesh_perm"
    } else if (this.litLines) {
        returnType = "lit_lines_mesh"
    } else {
        returnType = "lines_mesh"
    }

    return new Promise((resolve, reject) => {
        this.commandCentre.current.cootCommand( {
            returnType: returnType,
            command: "get_map_contours_mesh",
            commandArgs: [$this.molNo, x, y, z, radius, contourLevel]
        }).then(response => {
            const objects = [response.data.result.result]
            $this.clearBuffersOfStyle(glRef, "Coot")
            //$this.displayObjects['Coot'] = [...$this.displayObjects['Coot'], ...objects.map(object=>gl.appendOtherData(object, true))]
            objects.forEach(object => {
                //I could inject alpha here ... ?
                object.col_tri.forEach(cols => {
                        cols.forEach(col => {
                                for(let idx=3;idx<col.length;idx+=4){
                                    col[idx] = $this.alpha
                                }
                        })
                })
                let a = glRef.current.appendOtherData(object, true);
                $this.displayObjects['Coot'] = $this.displayObjects['Coot'].concat(a)
            })
            glRef.current.buildBuffers();
            glRef.current.drawScene();
            resolve(true)
        })
    })

}

MoorhenMap.prototype.setAlpha = async function (alpha,glRef) {
    this.alpha = alpha
    this.displayObjects['Coot'].forEach(buffer => {
        buffer.triangleColours.forEach(colbuffer => {
            for(let idx=3;idx<colbuffer.length;idx+=4){
                colbuffer[idx] = alpha
            }
        })
        buffer.isDirty = true
        buffer.alphaChanged = true
        if(alpha<0.99) {
            buffer.transparent = true
        } else {
            buffer.transparent = false
        }
    })
    glRef.current.buildBuffers();
    glRef.current.drawScene();
}

MoorhenMap.prototype.associateToReflectionData = async function (selectedColumns, reflectionData) {
    if (!selectedColumns.Fobs || !selectedColumns.SigFobs || !selectedColumns.FreeR) {
        return Promise.reject('Missing column data')
    }
    
    const commandArgs = [
        this.molNo, { fileName: this.uniqueId, data: reflectionData },
        selectedColumns.Fobs, selectedColumns.SigFobs, selectedColumns.FreeR
    ]

    const response = await this.commandCentre.current.cootCommand({
        command: 'shim_associate_data_mtz_file_with_map',
        commandArgs: commandArgs,
        returnType: 'status'
    }, true)
    
    if (response.data.result.status === "Completed") {
        this.hasReflectionData = true
        this.selectedColumns = selectedColumns
        this.associatedReflectionFileName = response.data.result.result
    } else {
        console.log('Unable to associate reflection data with map')
    }   
}

MoorhenMap.prototype.fetchReflectionData = async function () {
    if (this.hasReflectionData) {
        return await this.commandCentre.current.postMessage({
            molNo: this.molNo,
            message: 'get_mtz_data',
            fileName: this.associatedReflectionFileName
        })
    } else {
        console.log('Map has no reflection data associated...')
    }
}