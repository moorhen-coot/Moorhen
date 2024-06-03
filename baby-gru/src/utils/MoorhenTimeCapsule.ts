import { moorhen } from "../types/moorhen";
import { webGL } from "../types/mgWebGL";
import { guid } from "./MoorhenUtils";
import { ToolkitStore } from "@reduxjs/toolkit/dist/configureStore";

export const getBackupLabel = (key: moorhen.backupKey): string => {
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } as const
    const intK: number = parseInt(key.dateTime)
    const date: Date = new Date(intK)
    const dateString = `${date.toLocaleDateString(Intl.NumberFormat().resolvedOptions().locale, dateOptions)} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    const moleculeNamesLabel: string = key.molNames.join(',').length > 10 ? key.molNames.join(',').slice(0, 8) + "..." : key.molNames.join(',')
    return `${moleculeNamesLabel} -- ${dateString} -- ${key.type === 'automatic' ? 'AUTO' : 'MANUAL'}`
}

/**
 * Represents a time capsule with session backups
 * @constructor
 * @param {React.RefObject<moorhen.Molecule[]>} moleculesRef - A react reference to the list of loaded molecules
 * @param {React.RefObject<moorhen.Map[]>} mapsRef - A react reference to the list of loaded maps
 * @param {React.RefObject<moorhen.Map>} activeMapRef - A react reference to the currently active map
 * @param {React.RefObject<webGL.MGWebGL>} glRef - A react reference to the molecular graphics renderer
 * @property {string} version - Version number of the current time capsule
 * @property {boolean} busy - Indicates if time capsule is busy loading from local storage
 * @property {boolean} disableBackups - Disable time capsule
 * @property {number} maxBackupCount - Maximum number of automatic backups to store in local storage
 * @property {number} modificationCountBackupThreshold - Number of modifications to trigger an automatic backup
 * @property {function} onIsBusyChange - Callback function called whenever there's a change in the `this.busy` state
 */
export class MoorhenTimeCapsule implements moorhen.TimeCapsule {

    moleculesRef: React.RefObject<moorhen.Molecule[]>;
    mapsRef: React.RefObject<moorhen.Map[]>;
    glRef: React.RefObject<webGL.MGWebGL>;
    activeMapRef: React.RefObject<moorhen.Map>;
    busy: boolean;
    modificationCount: number;
    modificationCountBackupThreshold: number;
    maxBackupCount: number;
    version: string;
    disableBackups: boolean;
    storageInstance: moorhen.LocalStorageInstance;
    store: ToolkitStore;
    onIsBusyChange: (arg0: boolean) => void;
    
    constructor(moleculesRef: React.RefObject<moorhen.Molecule[]>, mapsRef: React.RefObject<moorhen.Map[]>, activeMapRef: React.RefObject<moorhen.Map>, glRef: React.RefObject<webGL.MGWebGL>, store: ToolkitStore) {
        this.store = store
        this.moleculesRef = moleculesRef
        this.mapsRef = mapsRef
        this.glRef = glRef
        this.activeMapRef = activeMapRef
        this.busy = false
        this.modificationCount = 0
        this.modificationCountBackupThreshold = 5
        this.maxBackupCount = 10
        this.version = 'v21'
        this.disableBackups = false
        this.storageInstance = null
        this.onIsBusyChange = null
    }

    /**
     * Intiate the time capsule
     * @returns {Promise<void>}
     */
    init(): Promise<void> {
        if (this.storageInstance) {
            return this.checkVersion()
        } else {
            console.log('Time capsule storage instance has not been defined! Backups will be disabled...')
            this.disableBackups = true
        }
    }

    /**
     * Toggles the time capsule disabled state
     */
    toggleDisableBackups() {
        this.disableBackups = !this.disableBackups
    }

    /**
     * Sets instance attr. this.busy and calls this.onIsBusyChange()
     * @param {boolea} newValue - The new value for the busy attr.
     */
    setBusy(newValue: boolean) {
        this.busy = newValue
        if (this.onIsBusyChange) {
            this.onIsBusyChange(this.busy)
        }
    }

    /**
     * Check if the current version is compatible with that stored in local storage
     */
    async checkVersion(): Promise<void> {
        const keyString = JSON.stringify({type: 'version'})
        const storedVersion = await this.storageInstance.getItem(keyString)
        if (!storedVersion || this.version !== storedVersion) {
            await this.storageInstance.clear()
            await this.storageInstance.setItem(keyString, this.version)
        }
    }

    /**
     * Update metadata files currently stored in the local storage. It might be required to call this function before
     * using MoorhenTimeCapsule.fetchSession
     * @returns {Promise<string[]>} Backup keys for the new metadata files that were created if any
     */
    async updateDataFiles(): Promise<(string | void)[]> {
        const allKeyStrings = await this.storageInstance.keys()
        const allKeys: moorhen.backupKey[] = allKeyStrings.map((keyString: string) => JSON.parse(keyString))
        const currentMtzFiles = allKeys.filter((key: moorhen.backupKey) => key.type === 'mtzData').map(key => key.name)
        const currentMapData = allKeys.filter((key: moorhen.backupKey) => key.type === 'mapData').map(key => key.name)

        let promises: Promise<string | void>[] = []
        this.mapsRef.current.map(async (map: moorhen.Map) => {
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

    /**
     * Fetch a backup session
     * @param {boolean} [includeAdditionalMapData=true] - True if map data should be fetched and included in the resulting session
     * @returns {Promise<moorhen.backupSession>} A backup for the current session
     */
    async fetchSession (includeAdditionalMapData: boolean = true): Promise<moorhen.backupSession> {
        this.setBusy(true)
        const keyStrings = await this.storageInstance.keys()
        const mtzFileNames = keyStrings.map((keyString: string) => JSON.parse(keyString)).filter((key: moorhen.backupKey) => key.type === 'mtzData').map((key: moorhen.backupKey) => key.name)
        const mapNames = keyStrings.map((keyString: string) => JSON.parse(keyString)).filter((key: moorhen.backupKey) => key.type === 'mapData').map((key: moorhen.backupKey) => key.name)
        const state = this.store.getState()

        const promises = await Promise.all([
            ...this.moleculesRef.current.map(molecule => {
                return molecule.getAtoms()
                .then(result => {return {data: {message: 'get_atoms', result: {result: result}}}})
            }), 
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

        let moleculeDataPromises: string[] = []
        let mapDataPromises: Uint8Array[] = []
        let reflectionDataPromises: Uint8Array[] = []
        promises.forEach((promise: string | moorhen.WorkerResponse) => {
            if (typeof promise === "string" && promise === 'reflection_data') {
                reflectionDataPromises.push(null)
            } else if (promise === 'map_data') {
                mapDataPromises.push(null)
            } else if (typeof promise === "object" && promise.data.message === "get_mtz_data") {
                reflectionDataPromises.push(promise.data.result.mtzData)
            } else if (typeof promise === "object" && promise.data.message === 'get_atoms') {
                moleculeDataPromises.push(promise.data.result.result)
            } else if (typeof promise === "object" && promise.data.message === 'get_map') {
                mapDataPromises.push(new Uint8Array(promise.data.result.mapData))
            } else {
                console.log(`Unrecognised promise type when fetching session... ${promise}`)
            }
        })

        const moleculeData: moorhen.moleculeSessionData[] = this.moleculesRef.current.map((molecule, index) => {
            return {
                name: molecule.name,
                molNo: molecule.molNo,
                coordFormat: molecule.coordsFormat,
                coordString: moleculeDataPromises[index],
                representations: molecule.representations.filter(item => item.visible).map(item => { return {
                    cid: item.cid,
                    style: item.style,
                    isCustom: item.isCustom,
                    colourRules: item.useDefaultColourRules ? null : item.colourRules.map(item => item.objectify()),
                    bondOptions: item.useDefaultBondOptions ? null : item.bondOptions,
                    m2tParams: item.useDefaultM2tParams ? null : item.m2tParams,
                }}),
                defaultColourRules: molecule.defaultColourRules.map(item => item.objectify()),
                defaultBondOptions: molecule.defaultBondOptions,
                defaultM2tParams: molecule.defaultM2tParams,
                connectedToMaps: molecule.connectedToMaps,
                ligandDicts: molecule.ligandDicts,
                symmetryOn: molecule.symmetryOn,
                biomolOn: molecule.biomolOn,
                symmetryRadius: molecule.symmetryRadius
            }
        })

        const mapData: moorhen.mapDataSession[] = this.mapsRef.current.map((map, index) => {
            return {
                name: map.name,
                molNo: map.molNo,
                uniqueId: map.uniqueId,
                mapData: mapDataPromises[index],
                reflectionData: reflectionDataPromises[index],
                showOnLoad: state.mapContourSettings.visibleMaps.includes(map.molNo),
                contourLevel: state.mapContourSettings.contourLevels.find(item => item.molNo === map.molNo)?.contourLevel,
                radius: state.mapContourSettings.mapRadii.find(item => item.molNo === map.molNo)?.radius,
                rgba: {
                    a: state.mapContourSettings.mapAlpha.find(item => item.molNo === map.molNo)?.alpha,
                    mapColour: state.mapContourSettings.mapColours.find(item => item.molNo === map.molNo)?.rgb,
                    positiveDiffColour: state.mapContourSettings.positiveMapColours.find(item => item.molNo === map.molNo)?.rgb,
                    negativeDiffColour: state.mapContourSettings.negativeMapColours.find(item => item.molNo === map.molNo)?.rgb
                },
                style: state.mapContourSettings.mapStyles.find(item => item.molNo === map.molNo)?.style,
                isDifference: map.isDifference,
                selectedColumns: map.selectedColumns,
                hasReflectionData: map.hasReflectionData,
                associatedReflectionFileName: map.associatedReflectionFileName
            }
        })

        const viewData: moorhen.viewDataSession = {
            origin: this.glRef.current.origin,
            backgroundColor: this.glRef.current.background_colour,
            ambientLight: Array.from(this.glRef.current.light_colours_ambient) as [number, number, number, number],
            diffuseLight: Array.from(this.glRef.current.light_colours_diffuse) as [number, number, number, number],
            lightPosition: Array.from(this.glRef.current.light_positions) as [number, number, number, number],
            specularLight: Array.from(this.glRef.current.light_colours_specular) as [number, number, number, number],
            specularPower: this.glRef.current.specularPower,
            fogStart: this.glRef.current.gl_fog_start,
            fogEnd: this.glRef.current.gl_fog_end,
            zoom: this.glRef.current.zoom,
            doDrawClickedAtomLines: this.glRef.current.doDrawClickedAtomLines,
            clipStart: (this.glRef.current.gl_clipPlane0[3] + this.glRef.current.fogClipOffset) * -1,
            clipEnd: this.glRef.current.gl_clipPlane1[3] - this.glRef.current.fogClipOffset,
            quat4: Array.from(this.glRef.current.myQuat),
            doPerspectiveProjection: this.glRef.current.doPerspectiveProjection,
            edgeDetection: {
                enabled: this.glRef.current.doEdgeDetect,
                depthScale: this.glRef.current.scaleDepth,
                depthThreshold: this.glRef.current.depthThreshold,
                normalScale: this.glRef.current.scaleNormal,
                normalThreshold: this.glRef.current.normalThreshold
            },
            shadows: this.glRef.current.doShadow,
            ssao: {
                enabled: this.glRef.current.doSSAO,
                radius: this.glRef.current.ssaoRadius,
                bias: this.glRef.current.ssaoBias
            },
            blur: {
                enabled: this.glRef.current.useOffScreenBuffers,
                radius: this.glRef.current.blurSize,
                depth: this.glRef.current.blurDepth
            }
        }

        const session: moorhen.backupSession = {
            includesAdditionalMapData: includeAdditionalMapData,
            moleculeData: moleculeData,
            mapData: mapData,
            viewData: viewData,
            activeMapIndex: this.mapsRef.current.findIndex(map => map.molNo === this.activeMapRef.current?.molNo),
            version: this.version
        }

        return session
    }

    /**
     * Add a modification to the modification counter and create a backup if the modification count has reached
     * the modification threshold
     * @returns {Promise<string>} Backup key if a backup was created
     */
    async addModification(): Promise<string> {
        this.modificationCount += 1
        if (this.modificationCount >= this.modificationCountBackupThreshold && !this.disableBackups) {
            this.setBusy(true)
            this.modificationCount = 0
            
            await this.updateDataFiles()
            const session: moorhen.backupSession = await this.fetchSession(false)
            const sessionString: string = JSON.stringify(session)
            
            const key: moorhen.backupKey = {
                dateTime: `${Date.now()}`, 
                type: 'automatic', 
                serNo: guid(),
                molNames: this.moleculesRef.current.map(mol => mol.name),
                mapNames: this.mapsRef.current.map(map => map.uniqueId),
                mtzNames: this.mapsRef.current.filter(map => map.hasReflectionData).map(map => map.associatedReflectionFileName)
            }
            
            const keyString: string = JSON.stringify({
                ...key,
                label: getBackupLabel(key)
            })

            return this.createBackup(keyString, sessionString)
        }
    }

    /**
     * Remove the oldest automatic backup if the number of backups in the local storage has reached the threshold
     */
    async cleanupIfFull(): Promise<void> {
        const keyStrings: string[] = await this.storageInstance.keys()
        const keys: moorhen.backupKey[] = keyStrings.map((keyString: string) => JSON.parse(keyString)).filter(key => key.type === 'automatic')
        const sortedKeys = keys.sort((a, b) => { return parseInt(a.dateTime) - parseInt(b.dateTime) }).reverse()
        if (sortedKeys.length - 1 >= this.maxBackupCount) {
            const toRemoveCount = sortedKeys.length - this.maxBackupCount
            const promises = sortedKeys.slice(-toRemoveCount).map(key => this.removeBackup(JSON.stringify(key)))
            await Promise.all(promises)
        }
    }

    /**
     * Remove orphan metadata files with no backup session associated
     */
    async cleanupUnusedDataFiles(): Promise<void> {
        const allKeyStrings = await this.storageInstance.keys()
        const allKeys: moorhen.backupKey[] = allKeyStrings.map((keyString: string) => JSON.parse(keyString))
        const backupKeys = allKeys.filter((key: moorhen.backupKey) => ['automatic', 'manual'].includes(key.type))
        const [ usedNames ] = [ ...backupKeys.map((key: moorhen.backupKey) => [...key.mtzNames, ...key.mapNames]) ]

        await Promise.all(allKeys.filter((key: moorhen.backupKey) => ['mtzData', 'mapData'].includes(key.type)).map((key: moorhen.backupKey) => {
            if (typeof usedNames === 'undefined' || !usedNames.includes(key.name)) {
                return this.removeBackup(JSON.stringify(key))
            }
            return Promise.resolve()
        }))
    }

    /**
     * Create a session backup
     * @param {string} key - Backup key
     * @param {string} value - JSON structure with session data
     * @returns {string} Backup key 
     */
    async createBackup(key: string, value: string): Promise<string> {
        if (!this.disableBackups) {
            try {
                await this.storageInstance.setItem(key, value)
                await this.cleanupIfFull()
                this.setBusy(false)
                return key
            } catch (err) {
                console.log(err)
            }   
        }
    }

    /**
     * Retrieve a session backup
     * @param {string} key - Backup key
     */
    async retrieveBackup(key: string): Promise<string | ArrayBuffer> {
        try {
            return await this.storageInstance.getItem(key)
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Retrieve the latest backup stored in local storage
     * @returns {string} JSON structure with session data
     */
    async retrieveLastBackup(): Promise<string | ArrayBuffer> {
        try {
            const sortedKeys = await this.getSortedKeys()
            if (sortedKeys && sortedKeys.length > 0) {
                const lastBackupKey = sortedKeys[sortedKeys.length - 1]
                const backup = await this.retrieveBackup(JSON.stringify(lastBackupKey))
                return backup    
            }
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Remove a specific backup
     * @param {string} key - Backup key 
     */
    async removeBackup(key: string): Promise<void> {
        try {
            await this.storageInstance.removeItem(key)
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Remove all backups
     */
    async dropAllBackups(): Promise<void> {
        try {
            await this.storageInstance.clear()
            await this.storageInstance.setItem(JSON.stringify({type: 'version'}), this.version)
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Get backup keys sorted by date
     * @returns {moorhen.backupKey[]} A list of backup keys
     */
    async getSortedKeys(): Promise<moorhen.backupKey[]> {
        const keyStrings = await this.storageInstance.keys()
        const keys: moorhen.backupKey[] = keyStrings.map((keyString: string) => JSON.parse(keyString)).filter(key => ['automatic', 'manual'].includes(key.type))
        const sortedKeys = keys.sort((a, b) => { return parseInt(a.dateTime) - parseInt(b.dateTime) }).reverse()
        return sortedKeys
    }
}
