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

export function MoorhenTimeCapsule(moleculesRef, glRef, preferences) {
    this.moleculesRef = moleculesRef
    this.glRef = glRef
    this.preferences = preferences
    this.busy = false
    this.modificationCount = 0
    this.modificationCountBackupThreshold = 5
    this.maxBackupCount = 10
    this.version = '0.0.1'
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

MoorhenTimeCapsule.prototype.fetchSession = async function () {
    let moleculePromises = this.moleculesRef.current.map(molecule => {return molecule.getAtoms()})
    let moleculeAtoms = await Promise.all(moleculePromises)

    const session = {
        moleculesNames: this.moleculesRef.current.map(molecule => molecule.name),
        mapsNames: [],
        moleculesPdbData: moleculeAtoms.map(item => item.data.result.pdbData),
        mapsMapData: [],
        activeMapMolNo: null,
        moleculesDisplayObjectsKeys: this.moleculesRef.current.map(molecule => Object.keys(molecule.displayObjects).filter(key => molecule.displayObjects[key].length > 0)),
        moleculesCootBondsOptions: this.moleculesRef.current.map(molecule => molecule.cootBondsOptions),
        mapsCootContours: [],
        mapsContourLevels: [],
        mapsColours: [],
        mapsLitLines: [],
        mapsRadius: [],
        mapsIsDifference: [],
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
        const session = await this.fetchSession()
        const sessionString = JSON.stringify(session)
        const key = {dateTime: `${Date.now()}`, type: 'automatic', name: '', molNames: session.moleculesNames}
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
    const keys = keyStrings.map(keyString => JSON.parse(keyString)).filter(key => key.type !== 'version')
    const sortedKeys = keys.sort((a, b) => { return parseInt(a.dateTime) - parseInt(b.dateTime) }).reverse()
    return sortedKeys.map((key, index) => {
        const keyString = JSON.stringify(key)
        const intK = parseInt(key.dateTime)
        const date = new Date(intK)
        const dateString = `${date.toLocaleDateString(Intl.NumberFormat().resolvedOptions().locale, dateOptions)} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
        const moleculeNamesLabel = key.molNames.join(',').length > 10 ? key.molNames.join(',').slice(0, 8) + "..." : key.molNames.join(',')
        const keyLabel = `${moleculeNamesLabel} -- ${dateString} -- ${key.type === 'automatic' ? 'AUTO' : 'MANUAL'}`
        return {label: keyLabel, key: keyString}
    })
}

