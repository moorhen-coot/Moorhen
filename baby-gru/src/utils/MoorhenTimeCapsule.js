import localforage from 'localforage';

const createInstance = () => {
    console.log(`Creating local storage instance for time capsule...`)
    return localforage.createInstance({
        driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
        name: "Moorhen-TimeCapsule",
        storeName: "Moorhen-TimeCapsule"
     })
}

export function MoorhenTimeCapsule(moleculesRef, glRef, preferences) {
    this.storageInstance = createInstance()
    this.moleculesRef = moleculesRef
    this.glRef = glRef
    this.preferences = preferences
    this.busy = false
    this.modificationCount = 0
    this.modificationCountThreshold = 5
    this.maxBackupCount = 10
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

    return JSON.stringify(session)
}

MoorhenTimeCapsule.prototype.addModification = async function() {
    this.modificationCount += 1
    if (this.modificationCount >= this.modificationCountThreshold) {
        this.busy = true
        this.modificationCount = 0
        const sessionString = await this.fetchSession()
        return this.createBackup(sessionString)
    }
}

MoorhenTimeCapsule.prototype.cleanupIfFull = async function() {
    const keys = await this.storageInstance.keys()
    const sortedKeys = keys.filter(key => key.indexOf("backup-") == 0).sort((a,b)=>{return parseInt(a.substr(7))-parseInt(b.substr(7))}).reverse()
    if (sortedKeys.length >= this.maxBackupCount) {
        const toRemoveCount = sortedKeys.length - this.maxBackupCount
        const promises = sortedKeys.slice(-toRemoveCount).map(key => this.removeBackup(key))
        await Promise.all(promises)
    }
}

MoorhenTimeCapsule.prototype.createBackup = async function(value) {
    const key =`backup-${Date.now()}`
    console.log(`Creating backup ${key} in local storage...`)
    try {
         await this.storageInstance.setItem(key, value)
         console.log("Successully created backup in time capsule")
         await this.cleanupIfFull()
         this.busy = false
         return key
     } catch (err) {
         console.log(err)
     }
}

MoorhenTimeCapsule.prototype.retrieveBackup = async function(key) {
    console.log(`Fetching backup ${key} from local storage...`)
    try {
         return await this.storageInstance.getItem(key)
     } catch (err) {
         console.log(err)
     }
}

MoorhenTimeCapsule.prototype.removeBackup = async function(key) {
    console.log(`Removing backup ${key} from time capsule...`)
    try {
         await this.storageInstance.removeItem(key)
         console.log('Successully removed backup from time capsule')
     } catch (err) {
         console.log(err)
     }
}

MoorhenTimeCapsule.prototype.dropAllBackups = async function() {
    console.log(`Removing all backups from time capsule...`)
    try {
         await this.storageInstance.clear()
         console.log('Successully removed all backup from time capsule')
     } catch (err) {
         console.log(err)
     }
}
