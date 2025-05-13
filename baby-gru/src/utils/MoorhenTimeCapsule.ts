import { moorhen } from "../types/moorhen";
import { webGL } from "../types/mgWebGL";
import { guid } from "./utils";
import { AnyAction, Dispatch } from "@reduxjs/toolkit";
import { MoorhenMolecule } from "./MoorhenMolecule";
import { MoorhenMap } from "./MoorhenMap";
import { MoorhenColourRule } from "./MoorhenColourRule";
import { addCustomRepresentation, addMolecule, emptyMolecules } from "../store/moleculesSlice";
import { addMap, emptyMaps } from "../store/mapsSlice";
import { batch } from "react-redux";
import { setActiveMap } from "../store/generalStatesSlice";
import { setContourLevel, setMapAlpha, setMapColours, setMapRadius, setMapStyle, setNegativeMapColours, setPositiveMapColours } from "../store/mapContourSettingsSlice";
import { enableUpdatingMaps, setConnectedMoleculeMolNo, setFoFcMapMolNo, setReflectionMapMolNo, setTwoFoFcMapMolNo } from "../store/moleculeMapUpdateSlice";
import {
    setBackgroundColor, setDepthBlurDepth, setDepthBlurRadius, setDoEdgeDetect, setDoPerspectiveProjection, setDoSSAO, setDoShadow,
    setEdgeDetectDepthScale, setEdgeDetectDepthThreshold, setEdgeDetectNormalScale, setEdgeDetectNormalThreshold, setSsaoBias,
    setSsaoRadius, setUseOffScreenBuffers
} from "../store/sceneSettingsSlice";
import { moorhensession } from "../protobuf/MoorhenSession";
import { ToolkitStore } from "@reduxjs/toolkit/dist/configureStore";
import { setOrigin, setLightPosition, setAmbient, setSpecular, setDiffuse, setSpecularPower, setZoom } from "../store/glRefSlice"

/**
 * Represents a time capsule with session backups
 * @constructor
 * @param {React.RefObject<moorhen.Molecule[]>} moleculesRef - A react reference to the list of loaded molecules
 * @param {React.RefObject<moorhen.Map[]>} mapsRef - A react reference to the list of loaded maps
 * @param {React.RefObject<moorhen.Map>} activeMapRef - A react reference to the currently active map
 * @param {React.RefObject<webGL.MGWebGL>} glRef - A react reference to the molecular graphics renderer
 * @param {ToolkitStore} store - The Redux store
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
    getBackupLabel: (key: moorhen.backupKey) => string;
    loadSessionData: (
        sessionData: moorhen.backupSession,
        monomerLibraryPath: string,
        molecules: moorhen.Molecule[],
        maps: moorhen.Map[],
        commandCentre: React.RefObject<moorhen.CommandCentre>,
        timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>,
        glRef: React.RefObject<webGL.MGWebGL>,
        store: ToolkitStore,
        dispatch: Dispatch<AnyAction>
    ) => Promise<number>;
    loadSessionFromArrayBuffer: (
        sessionArrayBuffer: ArrayBuffer,
        monomerLibraryPath: string,
        molecules: moorhen.Molecule[],
        maps: moorhen.Map[],
        commandCentre: React.RefObject<moorhen.CommandCentre>,
        timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>,
        glRef: React.RefObject<webGL.MGWebGL>,
        store: ToolkitStore,
        dispatch: Dispatch<AnyAction>
    ) => Promise<number>;
    loadSessionFromProtoMessage: (
        sessionProtoMessage: any,
        monomerLibraryPath: string,
        molecules: moorhen.Molecule[],
        maps: moorhen.Map[],
        commandCentre: React.RefObject<moorhen.CommandCentre>,
        timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>,
        glRef: React.RefObject<webGL.MGWebGL>,
        store: ToolkitStore,
        dispatch: Dispatch<AnyAction>
    ) => Promise<number>;
    loadSessionFromJsonString: (
        sessionDataString: string,
        monomerLibraryPath: string,
        molecules: moorhen.Molecule[],
        maps: moorhen.Map[],
        commandCentre: React.RefObject<moorhen.CommandCentre>,
        timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>,
        glRef: React.RefObject<webGL.MGWebGL>,
        store: ToolkitStore,
        dispatch: Dispatch<AnyAction>
    ) => Promise<number>;

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
        this.version = 'v23'
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
    async fetchSession (includeAdditionalMapData: boolean = true, embedData: boolean = true ): Promise<moorhen.backupSession> {
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
                if(embedData){
                    reflectionDataPromises.push(promise.data.result.mtzData)
                } else {
                    reflectionDataPromises.push(new TextEncoder().encode("NODATA"))
                }
            } else if (typeof promise === "object" && promise.data.message === 'get_atoms') {
                if(embedData){
                    moleculeDataPromises.push(promise.data.result.result)
                } else {
                    moleculeDataPromises.push("NODATA")
                }
            } else if (typeof promise === "object" && promise.data.message === 'get_map') {
                if(embedData){
                    mapDataPromises.push(new Uint8Array(promise.data.result.mapData))
                } else {
                    mapDataPromises.push(new TextEncoder().encode("NODATA"))
                }
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
                uniqueId: molecule.uniqueId,
                representations: molecule.representations.filter(item => item.visible).map(item => { return {
                    cid: item.cid,
                    style: item.style,
                    isCustom: item.isCustom,
                    colourRules: item.useDefaultColourRules ? null : item.colourRules.map(item => item.objectify()),
                    bondOptions: item.useDefaultBondOptions ? null : item.bondOptions,
                    m2tParams: item.useDefaultM2tParams ? null : item.m2tParams,
                    nonCustomOpacity: item.nonCustomOpacity,
                    resEnvOptions: item.useDefaultResidueEnvironmentOptions ? null : item.residueEnvironmentOptions
                }}),
                defaultColourRules: molecule.defaultColourRules.map(item => item.objectify()),
                defaultBondOptions: molecule.defaultBondOptions,
                defaultM2tParams: molecule.defaultM2tParams,
                defaultResEnvOptions: molecule.defaultResidueEnvironmentOptions,
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

        const lightPosition = this.store.getState().glRef.lightPosition
        const ambient = this.store.getState().glRef.ambient
        const specular = this.store.getState().glRef.specular
        const diffuse = this.store.getState().glRef.diffuse
        const specularPower = this.store.getState().glRef.specularPower
        const zoom = this.store.getState().glRef.zoom

        const doShadow = this.store.getState().sceneSettings.doShadow
        const doSSAO = this.store.getState().sceneSettings.doSSAO
        const depthBlurRadius = this.store.getState().sceneSettings.depthBlurRadius
        const depthBlurDepth = this.store.getState().sceneSettings.depthBlurDepth
        const ssaoRadius = this.store.getState().sceneSettings.ssaoRadius
        const ssaoBias = this.store.getState().sceneSettings.ssaoBias
        const useOffScreenBuffers = this.store.getState().sceneSettings.useOffScreenBuffers
        const doEdgeDetect = this.store.getState().sceneSettings.doEdgeDetect
        const depthScale = this.store.getState().sceneSettings.depthScale
        const depthThreshold = this.store.getState().sceneSettings.depthThreshold
        const normalScale = this.store.getState().sceneSettings.normalScale
        const normalThreshold = this.store.getState().sceneSettings.normalThreshold
        const doPerspectiveProjection = this.store.getState().sceneSettings.doPerspectiveProjection
        const backgroundColor = this.store.getState().sceneSettings.backgroundColor

        const viewData: moorhen.viewDataSession = {
            origin: this.store.getState().glRef.origin,
            backgroundColor: backgroundColor,
            ambientLight: ambient,
            diffuseLight: diffuse,
            lightPosition: lightPosition,
            specularLight: specular,
            specularPower: specularPower,
            fogStart: this.glRef.current.gl_fog_start,
            fogEnd: this.glRef.current.gl_fog_end,
            zoom: zoom,
            doDrawClickedAtomLines: this.glRef.current.doDrawClickedAtomLines,
            clipStart: (this.glRef.current.gl_clipPlane0[3] + this.glRef.current.fogClipOffset) * -1,
            clipEnd: this.glRef.current.gl_clipPlane1[3] - this.glRef.current.fogClipOffset,
            quat4: Array.from(this.glRef.current.myQuat),
            doPerspectiveProjection: doPerspectiveProjection,
            edgeDetection: {
                enabled: doEdgeDetect,
                depthScale: depthScale,
                depthThreshold: depthThreshold,
                normalScale: normalScale,
                normalThreshold: normalThreshold
            },
            shadows: doShadow,
            ssao: {
                enabled: doSSAO,
                radius: ssaoRadius,
                bias: ssaoBias
            },
            blur: {
                enabled: useOffScreenBuffers,
                radius: depthBlurRadius,
                depth: depthBlurDepth
            }
        }

        const session: moorhen.backupSession = {
            includesAdditionalMapData: includeAdditionalMapData,
            moleculeData: moleculeData,
            mapData: mapData,
            viewData: viewData,
            activeMapIndex: this.mapsRef.current.findIndex(map => map.molNo === this.activeMapRef.current?.molNo),
            version: this.version,
            dataIsEmbedded: embedData
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
                label: MoorhenTimeCapsule.getBackupLabel(key)
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

    /**
     * A static function that can be used to get the backup label for a given key object
     * @param {moorhen.backupKey} key - An object with the backup key data
     * @returns {string} A string corresponding with the backup label
     */
    static getBackupLabel (key: moorhen.backupKey): string {
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } as const
        const intK: number = parseInt(key.dateTime)
        const date: Date = new Date(intK)
        const dateString = `${date.toLocaleDateString(Intl.NumberFormat().resolvedOptions().locale, dateOptions)} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
        const moleculeNamesLabel: string = key.molNames.join(',').length > 10 ? key.molNames.join(',').slice(0, 8) + "..." : key.molNames.join(',')
        return `${moleculeNamesLabel} -- ${dateString} -- ${key.type === 'automatic' ? 'AUTO' : 'MANUAL'}`
    }

    /**
     * A static function that can be used to load a session data object
     * @param {moorhen.backupSession} sessionData - An object containing session data
     * @param {string} monomerLibraryPath - Path to the monomer library
     * @param {moorhen.Molecule[]} molecules - State containing current molecules loaded in the session
     * @param {moorhen.Map[]} maps - State containing current maps loaded in the session
     * @param {React.RefObject<moorhen.CommandCentre>} commandCentre - React reference to the command centre
     * @param {React.RefObject<moorhen.TimeCapsule>} timeCapsuleRef - React reference to the time capsule
     * @param {React.RefObject<webGL.MGWebGL>} glRef - React reference to the webGL renderer
     * @param {ToolkitStore} store - The Redux store
     * @param {Dispatch<AnyAction>} dispatch - Dispatch method for the MoorhenReduxStore
     * @param {Promise<string>} fetchExternalUrl - Function to fetch external file URL for non embedded data
     * @returns {number} Returns -1 if there was an error loading the session otherwise 0
     */
    static async loadSessionData(
        sessionData: moorhen.backupSession,
        monomerLibraryPath: string,
        molecules: moorhen.Molecule[],
        maps: moorhen.Map[],
        commandCentre: React.RefObject<moorhen.CommandCentre>,
        timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>,
        glRef: React.RefObject<webGL.MGWebGL>,
        store: ToolkitStore,
        dispatch: Dispatch<AnyAction>,
        fetchExternalUrl?: (uniqueId: string) => Promise<string>
    ): Promise<number> {

        if (!sessionData) {
            return -1
        } else if (!Object.hasOwn(sessionData, 'version') || timeCapsuleRef.current.version !== sessionData.version) {
            if((timeCapsuleRef.current.version==="v23"&&((sessionData.version!=="v22")&&(sessionData.version!=="v21")))||timeCapsuleRef.current.version!=="v23"){
                console.warn('Outdated session backup version, wont load...')
                return -1
            }
        }

        // Delete current scene
        molecules.forEach(molecule => {
            molecule.delete()
        })

        maps.forEach(map => {
            map.delete()
        })

        batch(() => {
            dispatch( emptyMolecules() )
            dispatch( emptyMaps() )
        })

        // Load molecules stored in session from coords string
        const newMoleculePromises = sessionData.moleculeData?.map( async (storedMoleculeData) => {
            const newMolecule = new MoorhenMolecule(commandCentre, glRef, store, monomerLibraryPath)
            console.log(sessionData)
            console.log(sessionData.dataIsEmbedded)
            if(sessionData.dataIsEmbedded||sessionData.dataIsEmbedded===undefined){
                return newMolecule.loadToCootFromString(storedMoleculeData.coordString, storedMoleculeData.name)
            } else {
                if (fetchExternalUrl) {
                    newMolecule.uniqueId = storedMoleculeData.uniqueId
                    const doppioUrl = await fetchExternalUrl(storedMoleculeData.uniqueId)
                    return newMolecule.loadToCootFromURL(doppioUrl, storedMoleculeData.name)
                }
                console.warn('No function provided for fetchExternalUrl')
            }
        }) || []

        // Load maps stored in session
        const newMapPromises = sessionData.mapData?.map(async (storedMapData) => {
            const newMap = new MoorhenMap(commandCentre, glRef, store)
            if (sessionData.includesAdditionalMapData) {
                if (sessionData.dataIsEmbedded||sessionData.dataIsEmbedded===undefined) {
                    return newMap.loadToCootFromMapData(
                        storedMapData.mapData,
                        storedMapData.name,
                        storedMapData.isDifference
                        )
                    } else {
                        if (fetchExternalUrl) {
                            newMap.uniqueId = storedMapData.uniqueId
                            const doppioUrl = await fetchExternalUrl(storedMapData.uniqueId)
                            return newMap.loadToCootFromMapURL(doppioUrl, storedMapData.name, storedMapData.isDifference)
                        }
                        console.warn('No function provided for fetchExternalUrl');
                    }
            } else {
                newMap.uniqueId = storedMapData.uniqueId

                if (sessionData.dataIsEmbedded||sessionData.dataIsEmbedded===undefined) {
                    return timeCapsuleRef.current.retrieveBackup(
                        JSON.stringify({
                            type: 'mapData',
                            name: storedMapData.uniqueId
                        })
                        ).then(mapData => {
                            return newMap.loadToCootFromMapData(
                                mapData as ArrayBuffer | Uint8Array,
                                storedMapData.name,
                                storedMapData.isDifference
                                )
                            })
                } else {
                    if (fetchExternalUrl) {
                        const doppioUrl = await fetchExternalUrl(storedMapData.uniqueId)
                        return newMap.loadToCootFromMapURL(doppioUrl, storedMapData.name, storedMapData.isDifference)
                    }
                    console.warn('No function provided for fetchExternalUrl')
                }
            }
        }) || []

        const loadPromises = await Promise.all([...newMoleculePromises, ...newMapPromises])
        const newMolecules = loadPromises.filter(item => item.type === 'molecule') as moorhen.Molecule[]
        const newMaps = loadPromises.filter(item => item.type === 'map') as moorhen.Map[]

        // Draw the molecules with the styles stored in session (needs to be done sequentially due to colour rules)
        for (let i = 0; i < newMolecules.length; i++) {
            const molecule = newMolecules[i]
            const storedMoleculeData = sessionData.moleculeData[i]
            if (storedMoleculeData.ligandDicts) {
                await Promise.all(Object.keys(storedMoleculeData.ligandDicts).map(compId => molecule.addDict(storedMoleculeData.ligandDicts[compId])))
            }
            molecule.defaultColourRules = storedMoleculeData.defaultColourRules.map(item => {
                const colourRule = MoorhenColourRule.initFromDataObject(item, commandCentre, molecule)
                return colourRule
            })
            if (storedMoleculeData.defaultBondOptions){
                molecule.defaultBondOptions = storedMoleculeData.defaultBondOptions
            }
            if (storedMoleculeData.defaultM2tParams) {
                molecule.defaultM2tParams = storedMoleculeData.defaultM2tParams
            }
            if (storedMoleculeData.defaultResEnvOptions) {
                molecule.defaultResidueEnvironmentOptions = storedMoleculeData.defaultResEnvOptions
            }
            if (storedMoleculeData.representations) {
                for (const item of storedMoleculeData.representations) {
                    const colourRules = !item.colourRules ? null : item.colourRules.map(item => {
                        const colourRule = MoorhenColourRule.initFromDataObject(item, commandCentre, molecule)
                        return colourRule
                    })
                    const representation = await molecule.addRepresentation(
                        item.style, item.cid, item.isCustom, colourRules, item.bondOptions, item.m2tParams, item.resEnvOptions
                    )
                    if (item.isCustom) {
                        dispatch( addCustomRepresentation(representation) )
                    }
                }
            }
            if (storedMoleculeData.symmetryOn) {
                molecule.setSymmetryRadius(storedMoleculeData.symmetryRadius)
                await molecule.toggleSymmetry()
            } else if (storedMoleculeData.biomolOn) {
                molecule.toggleBiomolecule()
            }
        }

        // Associate maps to reflection data
        await Promise.all(
            newMaps.map((map, index) => {
                const storedMapData = sessionData.mapData[index]
                if (sessionData.includesAdditionalMapData && storedMapData.reflectionData) {
                    return map.associateToReflectionData(
                        storedMapData.selectedColumns,
                        storedMapData.reflectionData
                    )
                } else if (storedMapData.associatedReflectionFileName && storedMapData.selectedColumns) {
                    return timeCapsuleRef.current.retrieveBackup(
                        JSON.stringify({
                            type: 'mtzData',
                            name: storedMapData.associatedReflectionFileName
                        })
                        ).then(reflectionData => {
                            return map.associateToReflectionData(
                                storedMapData.selectedColumns,
                                reflectionData as ArrayBuffer
                            )
                        })
                }
                return Promise.resolve()
            })
        )

        // Add molecules
        newMolecules.forEach(molecule => {
            dispatch( addMolecule(molecule) )
        })

        // Add maps
        newMaps.forEach((map, index) => {
            const storedMapData = sessionData.mapData[index]
            map.showOnLoad = storedMapData.showOnLoad
            map.suggestedRadius = storedMapData.radius
            map.suggestedContourLevel = storedMapData.contourLevel
            batch(() => {
                dispatch( setMapColours({molNo: map.molNo, rgb: storedMapData.rgba.mapColour}) )
                dispatch( setNegativeMapColours({molNo: map.molNo, rgb: storedMapData.rgba.negativeDiffColour}) )
                dispatch( setPositiveMapColours({molNo: map.molNo, rgb: storedMapData.rgba.positiveDiffColour}) )
                dispatch( setMapRadius({molNo: map.molNo, radius: storedMapData.radius}) )
                dispatch( setContourLevel({molNo: map.molNo, contourLevel: storedMapData.contourLevel}) )
                dispatch( setMapAlpha({molNo: map.molNo, alpha: storedMapData.rgba.a}) )
                dispatch( setMapStyle({molNo: map.molNo, style: storedMapData.style}) )
                dispatch( addMap(map) )
            })
        })

        // Set active map
        if (sessionData.activeMapIndex !== undefined && sessionData.activeMapIndex !== -1){
            dispatch( setActiveMap(newMaps[sessionData.activeMapIndex]) )
        }

        // Set camera details
        dispatch(setOrigin(sessionData.viewData.origin))
        dispatch(setAmbient(sessionData.viewData.ambientLight))
        dispatch(setSpecular(sessionData.viewData.specularLight))
        dispatch(setDiffuse(sessionData.viewData.diffuseLight))
        dispatch(setLightPosition(sessionData.viewData.lightPosition))
        dispatch(setSpecularPower(sessionData.viewData.specularPower))
        dispatch(setZoom(sessionData.viewData.zoom))
        glRef.current.set_fog_range(sessionData.viewData.fogStart, sessionData.viewData.fogEnd, false)
        glRef.current.set_clip_range(sessionData.viewData.clipStart, sessionData.viewData.clipEnd, false)
        glRef.current.doDrawClickedAtomLines = sessionData.viewData.doDrawClickedAtomLines
        glRef.current.setQuat(sessionData.viewData.quat4)
        batch(() => {
            dispatch(setBackgroundColor(sessionData.viewData.backgroundColor))
            dispatch(setEdgeDetectDepthScale(sessionData.viewData.edgeDetection.depthScale))
            dispatch(setEdgeDetectDepthThreshold(sessionData.viewData.edgeDetection.depthThreshold))
            dispatch(setEdgeDetectNormalScale(sessionData.viewData.edgeDetection.normalScale))
            dispatch(setEdgeDetectNormalThreshold(sessionData.viewData.edgeDetection.normalThreshold))
            dispatch(setDoEdgeDetect(sessionData.viewData.edgeDetection.enabled))
            dispatch(setDoShadow(sessionData.viewData.shadows))
            dispatch(setDoSSAO(sessionData.viewData.ssao.enabled))
            dispatch(setSsaoBias(sessionData.viewData.ssao.bias))
            dispatch(setSsaoRadius(sessionData.viewData.ssao.radius))
            dispatch(setUseOffScreenBuffers(sessionData.viewData.blur.enabled))
            dispatch(setDepthBlurDepth(sessionData.viewData.blur.depth))
            dispatch(setDepthBlurRadius(sessionData.viewData.blur.radius))
            dispatch(setUseOffScreenBuffers(sessionData.viewData.blur.enabled))
            dispatch(setDoPerspectiveProjection(sessionData.viewData.doPerspectiveProjection ?? false))
        })

        // Set connected maps and molecules if any
        const connectedMoleculeIndex = sessionData.moleculeData?.findIndex(molecule => molecule.connectedToMaps?.length > 0)
        if (sessionData.mapData && sessionData.moleculeData && connectedMoleculeIndex !== -1) {
            const oldConnectedMolecule = sessionData.moleculeData[connectedMoleculeIndex]
            const molecule = newMolecules[connectedMoleculeIndex].molNo
            const [reflectionMap, twoFoFcMap, foFcMap] = oldConnectedMolecule.connectedToMaps.map(item => newMaps[sessionData.mapData.findIndex(map => map.molNo === item)].molNo)
            const connectMapsArgs = [molecule, reflectionMap, twoFoFcMap, foFcMap]
            const sFcalcArgs = [molecule, twoFoFcMap, foFcMap, reflectionMap]

            await commandCentre.current.cootCommand({
                command: 'connect_updating_maps',
                commandArgs: connectMapsArgs,
                returnType: 'status'
            }, false)

            await commandCentre.current.cootCommand({
                command: 'sfcalc_genmaps_using_bulk_solvent',
                commandArgs: sFcalcArgs,
                returnType: 'status'
            }, false)

            batch(() => {
                dispatch( setFoFcMapMolNo(foFcMap) )
                dispatch( setTwoFoFcMapMolNo(twoFoFcMap) )
                dispatch( setReflectionMapMolNo(reflectionMap) )
                dispatch( setConnectedMoleculeMolNo(molecule) )
                dispatch( enableUpdatingMaps() )
            })
        }

        return 0
    }

    /**
     * A static function that can be used to load a session from an array buffer
     * @param {ArrayBuffer} sessionArrayBuffer - An object containing session data
     * @param {string} monomerLibraryPath - Path to the monomer library
     * @param {moorhen.Molecule[]} molecules - State containing current molecules loaded in the session
     * @param {moorhen.Map[]} maps - State containing current maps loaded in the session
     * @param {React.RefObject<moorhen.CommandCentre>} commandCentre - React reference to the command centre
     * @param {React.RefObject<moorhen.TimeCapsule>} timeCapsuleRef - React reference to the time capsule
     * @param {React.RefObject<webGL.MGWebGL>} glRef - React reference to the webGL renderer
     * @param {ToolkitStore} store - The Redux store
     * @param {Dispatch<AnyAction>} dispatch - Dispatch method for the MoorhenReduxStore
     * @returns {number} Returns -1 if there was an error loading the session otherwise 0
     */
    static async loadSessionFromArrayBuffer(
        sessionArrayBuffer: ArrayBuffer,
        monomerLibraryPath: string,
        molecules: moorhen.Molecule[],
        maps: moorhen.Map[],
        commandCentre: React.RefObject<moorhen.CommandCentre>,
        timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>,
        glRef: React.RefObject<webGL.MGWebGL>,
        store: ToolkitStore,
        dispatch: Dispatch<AnyAction>
    ): Promise<number> {
        timeCapsuleRef.current.setBusy(true)
        const bytes = new Uint8Array(sessionArrayBuffer)
        const sessionMessage = moorhensession.Session.decode(bytes,undefined,undefined)
        const status = await MoorhenTimeCapsule.loadSessionFromProtoMessage(sessionMessage, monomerLibraryPath, molecules, maps, commandCentre, timeCapsuleRef, glRef, store,  dispatch)
        timeCapsuleRef.current.setBusy(false)
        return status
    }

    /**
     * A static function that can be used to load a session from a protobuf message
     * @param {string} sessionProtoMessage - A protobuf message for the object containing session data
     * @param {string} monomerLibraryPath - Path to the monomer library
     * @param {moorhen.Molecule[]} molecules - State containing current molecules loaded in the session
     * @param {moorhen.Map[]} maps - State containing current maps loaded in the session
     * @param {React.RefObject<moorhen.CommandCentre>} commandCentre - React reference to the command centre
     * @param {React.RefObject<moorhen.TimeCapsule>} timeCapsuleRef - React reference to the time capsule
     * @param {React.RefObject<webGL.MGWebGL>} glRef - React reference to the webGL renderer
     * @param {ToolkitStore} store - The Redux store
     * @param {Dispatch<AnyAction>} dispatch - Dispatch method for the MoorhenReduxStore
     * @returns {number} Returns -1 if there was an error loading the session otherwise 0
     */
    static async loadSessionFromProtoMessage(
        sessionProtoMessage: any,
        monomerLibraryPath: string,
        molecules: moorhen.Molecule[],
        maps: moorhen.Map[],
        commandCentre: React.RefObject<moorhen.CommandCentre>,
        timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>,
        glRef: React.RefObject<webGL.MGWebGL>,
        store: ToolkitStore,
        dispatch: Dispatch<AnyAction>
    ): Promise<number> {

        timeCapsuleRef.current.setBusy(true)
        const sessionData = moorhensession.Session.toObject(sessionProtoMessage) as moorhen.backupSession
        const status = await MoorhenTimeCapsule.loadSessionData(sessionData, monomerLibraryPath, molecules, maps, commandCentre, timeCapsuleRef, glRef, store, dispatch)
        timeCapsuleRef.current.setBusy(false)
        return status
    }

    /**
     * A static function that can be used to load a session from a JSON string representation of a session data object
     * @param {string} sessionDataString - A JSON string representation of the object containing session data
     * @param {string} monomerLibraryPath - Path to the monomer library
     * @param {moorhen.Molecule[]} molecules - State containing current molecules loaded in the session
     * @param {moorhen.Map[]} maps - State containing current maps loaded in the session
     * @param {React.RefObject<moorhen.CommandCentre>} commandCentre - React reference to the command centre
     * @param {React.RefObject<moorhen.TimeCapsule>} timeCapsuleRef - React reference to the time capsule
     * @param {React.RefObject<webGL.MGWebGL>} glRef - React reference to the webGL renderer
     * @param {ToolkitStore} store - The Redux store
     * @param {Dispatch<AnyAction>} dispatch - Dispatch method for the MoorhenReduxStore
     * @returns {number} Returns -1 if there was an error loading the session otherwise 0
     */
    static async loadSessionFromJsonString(
        sessionDataString: string,
        monomerLibraryPath: string,
        molecules: moorhen.Molecule[],
        maps: moorhen.Map[],
        commandCentre: React.RefObject<moorhen.CommandCentre>,
        timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>,
        glRef: React.RefObject<webGL.MGWebGL>,
        store: ToolkitStore,
        dispatch: Dispatch<AnyAction>
    ): Promise<number> {

        timeCapsuleRef.current.setBusy(true)
        const sessionData: moorhen.backupSession = JSON.parse(sessionDataString)
        const status = await MoorhenTimeCapsule.loadSessionData(sessionData, monomerLibraryPath, molecules, maps, commandCentre, timeCapsuleRef, glRef, store, dispatch)
        timeCapsuleRef.current.setBusy(false)
        return status
    }
}
