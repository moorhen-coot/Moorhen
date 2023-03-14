import localforage from 'localforage';

const createInstance = (name, empty=false) => {
    const instance = localforage.createInstance({
        driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
        name: name,
        storeName: name
     })
     if (empty) {
        instance.clear()
     }
     return instance
}

export function MoorhenTimeCapsule(moleculesRef, mapsRef, activeMapRef, glRef, preferences) {
    this.moleculesRef = moleculesRef
    this.mapsRef = mapsRef
    this.glRef = glRef
    this.activeMapRef = activeMapRef
    this.preferences = preferences
    this.busy = false
    this.modificationCount = 0
    this.modificationCountBackupThreshold = 5
    this.maxBackupCount = 10
    this.version = '0.0.7'
    this.storageInstance = createInstance('Moorhen-TimeCapsule')
    this.checkVersion()
}

MoorhenTimeCapsule.prototype.checkVersion = async function () {
    const keyString = JSON.stringify({type: 'version'})
    const storedVersion = await this.storageInstance.getItem(keyString)
    if (!storedVersion || this.version !== storedVersion) {
        await this.storageInstance.clear()
        await this.storageInstance.setItem(keyString, this.version)
    }
}

MoorhenTimeCapsule.prototype.updateDataFiles = async function () {
    const allKeyStrings = await this.storageInstance.keys()
    const allKeys = allKeyStrings.map(keyString => JSON.parse(keyString))
    const currentMtzFiles = allKeys.filter(key => key.type === 'mtzData').map(key => key.name)
    const currentMapData = allKeys.filter(key => key.type === 'mapData').map(key => key.name)

    let promises = []
    this.mapsRef.current.map(async (map) => {
        const fileName = map.associatedReflectionFileName
        if (fileName && !currentMtzFiles.includes(fileName)) {
            const key = JSON.stringify({type: 'mtzData', name: fileName})
            promises.push(
                map.fetchReflectionData().then(reflectionData => {
                    this.createBackup(key, reflectionData.data.result.mtzData)
                })    
            )
        }
        if (map.uniqueId && !currentMapData.includes(map.uniqueId)) {
            const key = JSON.stringify({type: 'mapData', name: map.uniqueId})
            promises.push(
                map.getMap().then(mapData => {
                    this.createBackup(key, mapData.data.result.mapData)
                })
            )
        }
    })
    
    return Promise.all(promises)
}

MoorhenTimeCapsule.prototype.fetchSession = async function (includeAdditionalMapData=true) {
    this.busy = true
    const keyStrings = await this.storageInstance.keys()
    const mtzFileNames = keyStrings.map(keyString => JSON.parse(keyString)).filter(key => key.type === 'mtzData').map(key => key.name)
    const mapNames = keyStrings.map(keyString => JSON.parse(keyString)).filter(key => key.type === 'mapData').map(key => key.name)
    
    const promises = await Promise.all([
        ...this.moleculesRef.current.map(molecule => {return molecule.getAtoms()}), 
        ...this.mapsRef.current.map(map => {
            if (!includeAdditionalMapData) {
                return Promise.resolve('map_data')
            } else if (mapNames.includes(map.uniqueId)) {
                return this.retrieveBackup(
                    JSON.stringify({
                        type: 'mapData',
                        name: map.uniqueId
                    })
                ).then(result => {return {data: {message: 'get_map', result: {mapData: result}}}})
            } else {
                return map.getMap()
            }
        }),
        ...this.mapsRef.current.map(map => {
            if (!map.hasReflectionData || !includeAdditionalMapData) { 
                return Promise.resolve('reflection_data')
            } else if (mtzFileNames.includes(map.associatedReflectionFileName)) {
                return this.retrieveBackup(
                    JSON.stringify({
                        type: 'mtzData',
                        name: map.associatedReflectionFileName
                    })
                ).then(result => {return {data: {message: 'get_mtz_data', result: {mtzData: result}}}})
            } else {
                return map.fetchReflectionData()
            }
        })
    ])

    let moleculeDataPromises = []
    let mapDataPromises = []
    let reflectionDataPromises = []
    promises.forEach(promise => {
        if (promise === 'reflection_data') {
            reflectionDataPromises.push(null)
        } else if (promise === 'map_data') {
            mapDataPromises.push(null)
        } else if (promise.data.message === "get_mtz_data") {
            reflectionDataPromises.push(promise.data.result.mtzData)
        }else if (promise.data.message === 'get_atoms') {
            moleculeDataPromises.push(promise.data.result.pdbData)
        } else if (promise.data.message === 'get_map') {
            mapDataPromises.push(new Uint8Array(promise.data.result.mapData))
        }
    })

    const moleculeData = this.moleculesRef.current.map((molecule, index) => {
        return {
            name: molecule.name,
            molNo: molecule.molNo,
            pdbData: moleculeDataPromises[index],
            displayObjectsKeys: Object.keys(molecule.displayObjects).filter(key => molecule.displayObjects[key].length > 0),
            cootBondsOptions: molecule.cootBondsOptions,
            connectedToMaps: molecule.connectedToMaps
        }
    })

    const mapData = this.mapsRef.current.map((map, index) => {
        return {
            name: map.name,
            molNo: map.molNo,
            uniqueId: map.uniqueId,
            mapData: mapDataPromises[index],
            reflectionData: reflectionDataPromises[index],
            cootContour: map.cootContour,
            contourLevel: map.contourLevel,
            radius: map.mapRadius,
            colour: map.mapColour,
            litLines: map.litLines,
            isDifference: map.isDifference,
            selectedColumns: map.selectedColumns,
            hasReflectionData: map.hasReflectionData,
            associatedReflectionFileName: map.associatedReflectionFileName
        }
    })

    const session = {
        includesAdditionalMapData: includeAdditionalMapData,
        moleculeData: moleculeData,
        mapData: mapData,
        activeMapIndex: this.mapsRef.current.findIndex(map => map.molNo === this.activeMapRef.current.molNo),
        origin: this.glRef.current.origin,
        backgroundColor: this.glRef.current.background_colour,
        atomLabelDepthMode: this.preferences.atomLabelDepthMode,
        ambientLight: this.glRef.current.light_colours_ambient,
        diffuseLight: this.glRef.current.light_colours_diffuse,
        lightPosition: this.glRef.current.light_positions,
        specularLight: this.glRef.current.light_colours_specular,
        fogStart: this.glRef.current.gl_fog_start,
        fogEnd: this.glRef.current.gl_fog_end,
        zoom: this.glRef.current.zoom,
        doDrawClickedAtomLines: this.glRef.current.doDrawClickedAtomLines,
        clipStart: (this.glRef.current.gl_clipPlane0[3] + 500) * -1,
        clipEnd: this.glRef.current.gl_clipPlane1[3] - 500,
        quat4: this.glRef.current.myQuat
    }

    return session
}

MoorhenTimeCapsule.prototype.addModification = async function() {
    this.modificationCount += 1
    if (this.modificationCount >= this.modificationCountBackupThreshold) {
        this.busy = true
        this.modificationCount = 0
        
        await this.updateDataFiles()
        const session = await this.fetchSession(false)
        const sessionString = JSON.stringify(session)
        
        const key = {
            dateTime: `${Date.now()}`, 
            type: 'automatic', 
            molNames: this.moleculesRef.current.map(mol => mol.name),
            mapNames: this.mapsRef.current.map(map => map.uniqueId),
            mtzNames: this.mapsRef.current.filter(map => map.hasReflectionData).map(map => map.associatedReflectionFileName)
        }
        const keyString = JSON.stringify(key)
        return this.createBackup(keyString, sessionString)
    }
}

MoorhenTimeCapsule.prototype.cleanupIfFull = async function() {
    const keyStrings = await this.storageInstance.keys()
    const keys = keyStrings.map(keyString => JSON.parse(keyString)).filter(key => key.type === 'automatic')
    const sortedKeys = keys.sort((a, b) => { return parseInt(a.dateTime) - parseInt(b.dateTime) }).reverse()
    if (sortedKeys.length - 1 >= this.maxBackupCount) {
        const toRemoveCount = sortedKeys.length - this.maxBackupCount
        const promises = sortedKeys.slice(-toRemoveCount).map(key => this.removeBackup(JSON.stringify(key)))
        await Promise.all(promises)
    }
}

MoorhenTimeCapsule.prototype.cleanupUnusedDataFiles = async function() {
    const allKeyStrings = await this.storageInstance.keys()
    const allKeys = allKeyStrings.map(keyString => JSON.parse(keyString))
    const backupKeys = allKeys.filter(key => ['automatic', 'manual'].includes(key.type))
    const [ usedNames ] = [ ...backupKeys.map(key => [...key.mtzNames, ...key.mapNames]) ]

    await Promise.all(allKeys.filter(key => ['mtzData', 'mapData'].includes(key.type)).map(key => {
        if (typeof usedNames === 'undefined' || !usedNames.includes(key.name)) {
            return this.removeBackup(JSON.stringify(key))
        }
        return Promise.resolve()
    }))
}

MoorhenTimeCapsule.prototype.createBackup = async function(key, value) {
    try {
         await this.storageInstance.setItem(key, value)
         await this.cleanupIfFull()
         this.busy = false
         return key
     } catch (err) {
         console.log(err)
     }
}

MoorhenTimeCapsule.prototype.retrieveBackup = async function(key) {
    try {
         return await this.storageInstance.getItem(key)
     } catch (err) {
         console.log(err)
     }
}

MoorhenTimeCapsule.prototype.retrieveLastBackup = async function() {
    try {
        const sortedKeys = await this.getSortedKeys()
        if (sortedKeys && sortedKeys.length > 0) {
            const lastBackupKey = sortedKeys[sortedKeys.length - 1].key
            const backup = await this.retrieveBackup(lastBackupKey)
            return backup    
        }
    } catch (err) {
         console.log(err)
    }
}

MoorhenTimeCapsule.prototype.removeBackup = async function(key) {
    try {
         await this.storageInstance.removeItem(key)
     } catch (err) {
         console.log(err)
     }
}

MoorhenTimeCapsule.prototype.dropAllBackups = async function() {
    try {
         await this.storageInstance.clear()
     } catch (err) {
         console.log(err)
     }
}

MoorhenTimeCapsule.prototype.getSortedKeys = async function() {
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    const keyStrings = await this.storageInstance.keys()
    const keys = keyStrings.map(keyString => JSON.parse(keyString)).filter(key => ['automatic', 'manual'].includes(key.type))
    const sortedKeys = keys.sort((a, b) => { return parseInt(a.dateTime) - parseInt(b.dateTime) }).reverse()
    return sortedKeys.map((key, index) => {
        const keyString = JSON.stringify(key)
        const intK = parseInt(key.dateTime)
        const date = new Date(intK)
        const dateString = `${date.toLocaleDateString(Intl.NumberFormat().resolvedOptions().locale, dateOptions)} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
        // TODO: refactor this label into another field of the key data structure
        const moleculeNamesLabel = key.molNames.join(',').length > 10 ? key.molNames.join(',').slice(0, 8) + "..." : key.molNames.join(',')
        const keyLabel = `${moleculeNamesLabel} -- ${dateString} -- ${key.type === 'automatic' ? 'AUTO' : 'MANUAL'}`
        return {label: keyLabel, key: keyString}
    })
}

