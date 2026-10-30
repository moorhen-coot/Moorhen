import { AnyAction, Dispatch, Store } from "@reduxjs/toolkit";
import { batch } from "react-redux";
import { moorhensession } from "../protobuf/MoorhenSession";
import { cameraFromSession, sessionFromCamera } from "./sessionCamera";
import { slabFromCamera } from "../WebGLgComponents/slab";
import { setActiveMap } from "../store/generalStatesSlice";
import {
    setAmbient,
    setClipEnd,
    setClipStart,
    setDiffuse,
    setFogClipOffset,
    setFogEnd,
    setFogStart,
    setLightPosition,
    setOrigin,
    setQuat,
    setSpecular,
    setSpecularPower,
    setZoom, setContourLevel,
    setMapAlpha,
    setMapColours,
    setMapRadius,
    setMapStyle,
    setNegativeMapColours,
    setPositiveMapColours, addMap, emptyMaps, enableUpdatingMaps,
    setConnectedMoleculeMolNo,
    setFoFcMapMolNo,
    setReflectionMapMolNo,
    setTwoFoFcMapMolNo, addCustomRepresentation, addMolecule, emptyMolecules, addFracPathOverlay,
    addImageOverlay,
    addLatexOverlay,
    addSvgPathOverlay,
    addTextOverlay,
    emptyOverlays, setBackgroundColor,
    setDepthBlurDepth,
    setPerspectiveEyeDistance,
    setDepthBlurRadius,
    setDoEdgeDetect,
    setDoPerspectiveProjection,
    setDoSSAO,
    setDoShadow,
    setEdgeDetectDepthScale,
    setEdgeDetectDepthThreshold,
    setEdgeDetectNormalScale,
    setEdgeDetectNormalThreshold,
    setSsaoBias,
    setSsaoRadius,
    setUseOffScreenBuffers,
    MoorhenReduxStoreType,
} from "../store";
import { newMovie } from "../store/movieSlice";

import type {
    Overlay2DFracPath,
    Overlay2DImageSrcFrac,
    Overlay2DLatexSrcFrac,
    Overlay2DSvgPath,
    Overlay2DTextFrac,
} from "../store/overlaysSlice";
import { MoorhenVector, addVector, emptyVectors } from "../store/vectorsSlice";
import { ThreeDObject, addObject, emptyObjects } from "../store/threeDObjectsSlice";
import { withMigratedTags } from "./tags";
import { moorhen } from "../types/moorhen";
import { ColourRule } from "./MoorhenColourRule";
import { MoorhenMap } from "./MoorhenMap";
import { MoorhenMolecule } from "./MoorhenMolecule";
import { m2tParameters, residueEnvironmentOptions } from "./Representation/MoorhenMoleculeRepresentation";
import { guid } from "./utils";
import { representationIdForRestore } from "./sessionRepresentation";
import { MoorhenInstance } from "@/InstanceManager";
import { USER_SCENE_FORMAT_VERSION, type UserSceneState } from "@/store/userSceneFormat";
import { Root } from "protobufjs";

export interface backupKey {
    name?: string;
    label?: string;
    dateTime: string;
    type: string;
    serNo: string | number;
    molNames: string[];
    mapNames?: string[];
    mtzNames?: string[];
}

export type moleculeSessionData = {
    name: string;
    molNo: number;
    coordString: string;
    coordFormat: moorhen.coorFormats;
    representations: {
        /**
         * The representation's identity, so that it survives a reload.
         *
         * Absent in sessions written before the field existed; those keep the guid minted on
         * restore, which is what has always happened.
         */
        uniqueId: string;
        cid: string;
        style: moorhen.RepresentationStyles;
        isCustom: boolean;
        colourRules: moorhen.ColourRuleObject[];
        bondOptions: moorhen.cootBondOptions;
        m2tParams: m2tParameters;
        nonCustomOpacity: number;
        resEnvOptions: residueEnvironmentOptions;
        neighboursCid: string;
        restrictToNeighbours: boolean;
        excludeNeighbours: boolean;
        hbondedToCid: string;
        hbondedTo: boolean;
        neighboursDistance: number;
    }[];
    defaultBondOptions: moorhen.cootBondOptions;
    defaultM2tParams: m2tParameters;
    defaultResEnvOptions: residueEnvironmentOptions;
    defaultColourRules: moorhen.ColourRuleObject[];
    connectedToMaps: number[];
    ligandDicts: { [comp_id: string]: string };
    symmetryOn: boolean;
    biomolOn: boolean;
    symmetryRadius: number;
    uniqueId: string;
};

export type mapDataSession = {
    name: string;
    molNo: number;
    uniqueId: string;
    mapData: Uint8Array;
    reflectionData: Uint8Array;
    showOnLoad: boolean;
    contourLevel: number;
    radius: number;
    rgba: {
        mapColour: { r: number; g: number; b: number };
        positiveDiffColour: { r: number; g: number; b: number };
        negativeDiffColour: { r: number; g: number; b: number };
        a: number;
    };
    style: "solid" | "lit-lines" | "lines";
    isDifference: boolean;
    selectedColumns: moorhen.selectedMtzColumns;
    hasReflectionData: boolean;
    associatedReflectionFileName: string;
};

export type viewDataSession = {
    origin: [number, number, number];
    backgroundColor: [number, number, number, number];
    ambientLight: [number, number, number, number];
    diffuseLight: [number, number, number, number];
    lightPosition: [number, number, number, number];
    specularLight: [number, number, number, number];
    specularPower: number;
    fogStart: number;
    fogEnd: number;
    zoom: number;
    doDrawClickedAtomLines: boolean;
    clipStart: number;
    clipEnd: number;
    /**
     * Distance from the eye to the view centre, the renderer's old `fogClipOffset`.
     *
     * Optional because sessions written before this field exists do not have it. `fogStart` and
     * `fogEnd` are measured from the eye, so without it they could only be read back against an
     * assumed 250 - which was right until the perspective eye-distance control made it movable.
     * See LEGACY_EYE_DISTANCE: 250 is not a guess for an older file, it is the only value for
     * which that file's fog numbers ever meant what they said.
     */
    eyeDistance?: number;
    quat4: any[];
    shadows: boolean;
    ssao: { enabled: boolean; radius: number; bias: number };
    edgeDetection: {
        enabled: boolean;
        depthScale: number;
        normalScale: number;
        depthThreshold: number;
        normalThreshold: number;
    };
    doPerspectiveProjection: boolean;
    blur: { enabled: boolean; depth: number; radius: number };
};

export type backupSession = {
    version: string;
    includesAdditionalMapData: boolean;
    moleculeData: moleculeSessionData[];
    mapData: mapDataSession[];
    viewData: viewDataSession;
    activeMapIndex: number;
    dataIsEmbedded: boolean;
    vectorData?: MoorhenVector[];
    overlay2dData?: Overlay2DSessionData;
    threeDObjectData?: ThreeDObject[];
    /**
     * The scenes and snapshots (JSON of a UserSceneState). The fields above describe the scene shown
     * when the session was saved; sessions saved without it load into the "Default" scene.
     */
    sceneData?: string;
};

export type Overlay2DSessionData = {
    fracPath2D: Overlay2DFracPath[];
    svgPath2D: Overlay2DSvgPath[];
    textFracPath2D: Overlay2DTextFrac[];
    latexFracPath2D: Overlay2DLatexSrcFrac[];
    imageFracPath2D: Overlay2DImageSrcFrac[];
};

export type Moorhen3DObjectSessionData = {
    objects: ThreeDObject[];
};

/**
 * Represents a time capsule with session backups
 * @constructor
 * @param {React.RefObject<moorhen.Molecule[]>} moleculesRef - A react reference to the list of loaded molecules
 * @param {React.RefObject<moorhen.Map[]>} mapsRef - A react reference to the list of loaded maps
 * @param {React.RefObject<moorhen.Map>} activeMapRef - A react reference to the currently active map
 * @param {React.RefObject<webGL.MGWebGL>} glRef - A react reference to the molecular graphics renderer
 * @param {Store} store - The Redux store
 * @property {string} version - Version number of the current time capsule
 * @property {boolean} busy - Indicates if time capsule is busy loading from local storage
 * @property {boolean} disableBackups - Disable time capsule
 * @property {number} maxBackupCount - Maximum number of automatic backups to store in local storage
 * @property {number} modificationCountBackupThreshold - Number of modifications to trigger an automatic backup
 * @property {function} onIsBusyChange - Callback function called whenever there's a change in the `this.busy` state
 */
export class MoorhenTimeCapsule {
    moleculesRef: React.RefObject<moorhen.Molecule[]>;
    mapsRef: React.RefObject<moorhen.Map[]>;
    activeMapRef: React.RefObject<moorhen.Map | null>;
    busy: boolean;
    modificationCount: number;
    modificationCountBackupThreshold: number;
    maxBackupCount: number;
    version: string;
    disableBackups: boolean;
    storageInstance: LocalForage;
    store: MoorhenReduxStoreType;
    onIsBusyChange: (arg0: boolean) => void;
    /** Provides the scenes to save in sessions (set by MoorhenInstance) */
    getSceneData: (() => string) | null = null;

    /** Status returned by the session loaders for a session saved by a more recent version of Moorhen */
    static readonly NEWER_VERSION_STATUS = -2;
    static readonly NEWER_VERSION_MESSAGE = "This session file is for a more recent version of Moorhen, open it at moorhen.org";
    /** A session cannot be loaded while a movie plays or is exported: loading replaces what it shows */
    static readonly MOVIE_PLAYING_STATUS = -3;
    static readonly MOVIE_PLAYING_MESSAGE = "A movie is playing: stop it before loading a session";

    /**
     * Session versions older than the current one that can still be loaded. Add the outgoing
     * version here when bumping `this.version`, and drop any version whose format can no longer
     * be read.
     */
    static readonly supportedLegacyVersions: string[] = ["v21", "v22", "v23"];

    constructor(
        moleculesRef: React.RefObject<moorhen.Molecule[]>,
        mapsRef: React.RefObject<moorhen.Map[]>,
        activeMapRef: React.RefObject<moorhen.Map>,
        store: MoorhenReduxStoreType
    ) {
        this.store = store;
        this.moleculesRef = moleculesRef;
        this.mapsRef = mapsRef;
        this.activeMapRef = activeMapRef;
        this.busy = false;
        this.modificationCount = 0;
        this.modificationCountBackupThreshold = 5;
        this.maxBackupCount = 10;
        this.version = "v24";
        this.disableBackups = false;
        this.storageInstance = null;
        this.onIsBusyChange = null;
    }

    /**
     * Intiate the time capsule
     * @returns {Promise<void>}
     */
    init(): Promise<void> {
        if (this.storageInstance) {
            return this.checkVersion();
        } else {
            console.log("Time capsule storage instance has not been defined! Backups will be disabled...");
            this.disableBackups = true;
        }
    }

    /**
     * Toggles the time capsule disabled state
     */
    toggleDisableBackups() {
        this.disableBackups = !this.disableBackups;
    }

    /**
     * Sets instance attr. this.busy and calls this.onIsBusyChange()
     * @param {boolea} newValue - The new value for the busy attr.
     */
    setBusy(newValue: boolean) {
        this.busy = newValue;
        if (this.onIsBusyChange) {
            this.onIsBusyChange(this.busy);
        }
    }

    /**
     * Check if the current version is compatible with that stored in local storage
     */
    async checkVersion(): Promise<void> {
        const keyString = JSON.stringify({ type: "version" });
        const storedVersion = await this.storageInstance.getItem(keyString);
        if (!storedVersion || this.version !== storedVersion) {
            await this.storageInstance.clear();
            await this.storageInstance.setItem(keyString, this.version);
        }
    }

    /**
     * Update metadata files currently stored in the local storage. It might be required to call this function before
     * using MoorhenTimeCapsule.fetchSession
     * @returns {Promise<string[]>} Backup keys for the new metadata files that were created if any
     */
    async updateDataFiles(): Promise<(string | void)[]> {
        const allKeyStrings = await this.storageInstance.keys();
        const allKeys: backupKey[] = allKeyStrings.map((keyString: string) => JSON.parse(keyString));
        const currentMtzFiles = allKeys.filter((key: backupKey) => key.type === "mtzData").map(key => key.name);
        const currentMapData = allKeys.filter((key: backupKey) => key.type === "mapData").map(key => key.name);

        const promises: Promise<string | void>[] = [];
        this.mapsRef.current.map(async (map: moorhen.Map) => {
            const fileName = map.associatedReflectionFileName;
            if (fileName && !currentMtzFiles.includes(fileName)) {
                const key = JSON.stringify({ type: "mtzData", name: fileName });
                promises.push(
                    map.fetchReflectionData().then(reflectionData => {
                        this.createBackup(key, reflectionData.data.result.mtzData);
                    })
                );
            }
            if (map.uniqueId && !currentMapData.includes(map.uniqueId)) {
                const key = JSON.stringify({
                    type: "mapData",
                    name: map.uniqueId,
                });
                promises.push(
                    map.getMap().then(mapData => {
                        this.createBackup(key, mapData.data.result.mapData);
                    })
                );
            }
        });

        return Promise.all(promises);
    }

    /**
     * Fetch a backup session
     * @param {boolean} [includeAdditionalMapData=true] - True if map data should be fetched and included in the resulting session
     * @returns {Promise<backupSession>} A backup for the current session
     */
    async fetchSession(includeAdditionalMapData: boolean = true, embedData: boolean = true): Promise<backupSession> {
        this.setBusy(true);
        const keyStrings = await this.storageInstance.keys();
        const mtzFileNames = keyStrings
            .map((keyString: string) => JSON.parse(keyString))
            .filter((key: backupKey) => key.type === "mtzData")
            .map((key: backupKey) => key.name);
        const mapNames = keyStrings
            .map((keyString: string) => JSON.parse(keyString))
            .filter((key: backupKey) => key.type === "mapData")
            .map((key: backupKey) => key.name);
        const state = this.store.getState();

        const promises = await Promise.all([
            ...this.moleculesRef.current.map(molecule => {
                return molecule.getAtoms().then(result => {
                    return {
                        data: {
                            message: "get_atoms",
                            result: { result: result },
                        },
                    };
                });
            }),
            ...this.mapsRef.current.map(map => {
                if (!includeAdditionalMapData) {
                    return Promise.resolve("map_data");
                } else if (mapNames.includes(map.uniqueId)) {
                    return this.retrieveBackup(
                        JSON.stringify({
                            type: "mapData",
                            name: map.uniqueId,
                        })
                    ).then(result => {
                        return {
                            data: {
                                message: "get_map",
                                result: { mapData: result },
                            },
                        };
                    });
                } else {
                    return map.getMap();
                }
            }),
            ...this.mapsRef.current.map(map => {
                if (!map.hasReflectionData || !includeAdditionalMapData) {
                    return Promise.resolve("reflection_data");
                } else if (mtzFileNames.includes(map.associatedReflectionFileName)) {
                    return this.retrieveBackup(
                        JSON.stringify({
                            type: "mtzData",
                            name: map.associatedReflectionFileName,
                        })
                    ).then(result => {
                        return {
                            data: {
                                message: "get_mtz_data",
                                result: { mtzData: result },
                            },
                        };
                    });
                } else {
                    return map.fetchReflectionData();
                }
            }),
        ]);

        const moleculeDataPromises: string[] = [];
        const mapDataPromises: Uint8Array[] = [];
        const reflectionDataPromises: Uint8Array[] = [];
        promises.forEach((promise: string | moorhen.WorkerResponse) => {
            if (typeof promise === "string" && promise === "reflection_data") {
                reflectionDataPromises.push(null);
            } else if (promise === "map_data") {
                mapDataPromises.push(null);
            } else if (typeof promise === "object" && promise.data.message === "get_mtz_data") {
                if (embedData) {
                    reflectionDataPromises.push(promise.data.result.mtzData);
                } else {
                    reflectionDataPromises.push(new TextEncoder().encode("NODATA"));
                }
            } else if (typeof promise === "object" && promise.data.message === "get_atoms") {
                if (embedData) {
                    moleculeDataPromises.push(promise.data.result.result);
                } else {
                    moleculeDataPromises.push("NODATA");
                }
            } else if (typeof promise === "object" && promise.data.message === "get_map") {
                if (embedData) {
                    mapDataPromises.push(new Uint8Array(promise.data.result.mapData));
                } else {
                    mapDataPromises.push(new TextEncoder().encode("NODATA"));
                }
            } else {
                console.log(`Unrecognised promise type when fetching session... ${promise}`);
            }
        });

        const moleculeData: moleculeSessionData[] = this.moleculesRef.current.map((molecule, index) => {
            return {
                name: molecule.name,
                molNo: molecule.molNo,
                coordFormat: molecule.coordsFormat,
                coordString: moleculeDataPromises[index],
                uniqueId: molecule.uniqueId,
                representations: molecule.representations
                    .filter(item => item.visible)
                    .map(item => {
                        return {
                            uniqueId: item.uniqueId,
                            cid: item.cid,
                            style: item.style,
                            isCustom: item.isCustom,
                            colourRules: item.useDefaultColourRules ? null : item.colourRules.map(item => item.objectify()),
                            bondOptions: item.useDefaultBondOptions ? null : item.bondOptions,
                            m2tParams: item.useDefaultM2tParams ? null : item.m2tParams,
                            nonCustomOpacity: item.nonCustomOpacity,
                            resEnvOptions: item.useDefaultResidueEnvironmentOptions ? null : item.residueEnvironmentOptions,
                            neighboursCid: item.neighboursCid,
                            restrictToNeighbours: item.restrictToNeighbours,
                            excludeNeighbours: item.excludeNeighbours,
                            hbondedToCid: item.hbondedToCid,
                            hbondedTo: item.hbondedTo,
                            neighboursDistance: item.neighboursDistance,
                        };
                    }),
                defaultColourRules: molecule.defaultColourRules.map(item => item.objectify()),
                defaultBondOptions: molecule.defaultBondOptions,
                defaultM2tParams: molecule.defaultM2tParams,
                defaultResEnvOptions: molecule.defaultResidueEnvironmentOptions,
                connectedToMaps: molecule.connectedToMaps,
                ligandDicts: molecule.ligandDicts,
                symmetryOn: molecule.symmetryOn,
                biomolOn: molecule.biomolOn,
                symmetryRadius: molecule.symmetryRadius,
            };
        });

        const mapData: mapDataSession[] = this.mapsRef.current.map((map, index) => {
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
                    negativeDiffColour: state.mapContourSettings.negativeMapColours.find(item => item.molNo === map.molNo)?.rgb,
                },
                style: state.mapContourSettings.mapStyles.find(item => item.molNo === map.molNo)?.style,
                isDifference: map.isDifference,
                selectedColumns: map.selectedColumns,
                hasReflectionData: map.hasReflectionData,
                associatedReflectionFileName: map.associatedReflectionFileName,
            };
        });

        const lightPosition = this.store.getState().sceneSettings.lightPosition;
        const ambient = this.store.getState().sceneSettings.ambient;
        const specular = this.store.getState().sceneSettings.specular;
        const diffuse = this.store.getState().sceneSettings.diffuse;
        const specularPower = this.store.getState().sceneSettings.specularPower;
        const zoom = this.store.getState().sceneSettings.zoom;
        const quat = this.store.getState().glRef.quat;
        // The camera's conventions, translated to the session's by sessionCamera.ts - which is also
        // what reads them back. The session stores fog as absolute distances from the eye while
        // clip is relative to the view centre and negated; keeping both directions of that in one
        // tested module is the point. `eyeDistance` is new, and is the field whose absence meant
        // fog was saved against an eye whose position was not.
        const { fogStart, fogEnd, clipStart, clipEnd, eyeDistance } = sessionFromCamera({
            quat: [quat[0], quat[1], quat[2], quat[3]],
            origin: this.store.getState().sceneSettings.origin,
            zoom,
            eyeDistance: this.store.getState().sceneSettings.fogClipOffset,
            clipFront: this.store.getState().sceneSettings.clipStart,
            clipBack: this.store.getState().sceneSettings.clipEnd,
            fogFront: this.store.getState().sceneSettings.fogClipOffset - this.store.getState().sceneSettings.fogStart,
            fogBack: this.store.getState().sceneSettings.fogEnd - this.store.getState().sceneSettings.fogClipOffset,
        });

        const doShadow = this.store.getState().sceneSettings.doShadow;
        const doSSAO = this.store.getState().sceneSettings.doSSAO;
        const depthBlurRadius = this.store.getState().sceneSettings.depthBlurRadius;
        const depthBlurDepth = this.store.getState().sceneSettings.depthBlurDepth;
        const ssaoRadius = this.store.getState().sceneSettings.ssaoRadius;
        const ssaoBias = this.store.getState().sceneSettings.ssaoBias;
        const useOffScreenBuffers = this.store.getState().sceneSettings.useOffScreenBuffers;
        const doEdgeDetect = this.store.getState().sceneSettings.doEdgeDetect;
        const depthScale = this.store.getState().sceneSettings.edgeDetectDepthScale;
        const depthThreshold = this.store.getState().sceneSettings.edgeDetectDepthThreshold;
        const normalScale = this.store.getState().sceneSettings.edgeDetectNormalScale;
        const normalThreshold = this.store.getState().sceneSettings.edgeDetectNormalThreshold;
        const doPerspectiveProjection = this.store.getState().sceneSettings.doPerspectiveProjection;
        const backgroundColor = this.store.getState().sceneSettings.backgroundColor;

        const viewData: viewDataSession = {
            origin: this.store.getState().sceneSettings.origin,
            backgroundColor: backgroundColor,
            ambientLight: ambient,
            diffuseLight: diffuse,
            lightPosition: lightPosition,
            specularLight: specular,
            specularPower: specularPower,
            fogStart: fogStart,
            fogEnd: fogEnd,
            zoom: zoom,
            doDrawClickedAtomLines: false, // This is unused as far as I can tell
            clipStart: clipStart,
            clipEnd: clipEnd,
            eyeDistance: eyeDistance,
            quat4: [quat[0], quat[1], quat[2], quat[3]],
            doPerspectiveProjection: doPerspectiveProjection,
            edgeDetection: {
                enabled: doEdgeDetect,
                depthScale: depthScale,
                depthThreshold: depthThreshold,
                normalScale: normalScale,
                normalThreshold: normalThreshold,
            },
            shadows: doShadow,
            ssao: {
                enabled: doSSAO,
                radius: ssaoRadius,
                bias: ssaoBias,
            },
            blur: {
                enabled: useOffScreenBuffers,
                radius: depthBlurRadius,
                depth: depthBlurDepth,
            },
        };

        const vectorData: MoorhenVector[] = this.store.getState().vectors.vectorsList;
        const threeDObjectData: ThreeDObject[] = this.store.getState().threeDObjects.objects;

        const overlay2dData: Overlay2DSessionData = {
            fracPath2D: this.store.getState().overlays.fracPathOverlayList,
            svgPath2D: this.store.getState().overlays.svgPathOverlayList,
            textFracPath2D: this.store.getState().overlays.textOverlayList,
            latexFracPath2D: this.store.getState().overlays.latexOverlayList,
            imageFracPath2D: this.store.getState().overlays.imageOverlayList,
        };

        const session: backupSession = {
            includesAdditionalMapData: includeAdditionalMapData,
            moleculeData: moleculeData,
            mapData: mapData,
            viewData: viewData,
            activeMapIndex: this.mapsRef.current.findIndex(map => map.molNo === this.activeMapRef.current?.molNo),
            version: this.version,
            dataIsEmbedded: embedData,
            overlay2dData: overlay2dData,
            vectorData: vectorData,
            threeDObjectData: threeDObjectData,
        };
        const sceneData = this.getSceneData?.();
        if (sceneData) session.sceneData = sceneData;

        return session;
    }

    /**
     * Add a modification to the modification counter and create a backup if the modification count has reached
     * the modification threshold
     * @returns {Promise<string>} Backup key if a backup was created
     */
    async addModification(): Promise<string> {
        this.modificationCount += 1;
        if (this.modificationCount >= this.modificationCountBackupThreshold && !this.disableBackups) {
            this.setBusy(true);
            this.modificationCount = 0;

            await this.updateDataFiles();
            const session: backupSession = await this.fetchSession(false);
            const sessionString: string = JSON.stringify(session);

            const key: backupKey = {
                dateTime: `${Date.now()}`,
                type: "automatic",
                serNo: guid(),
                molNames: this.moleculesRef.current.map(mol => mol.name),
                mapNames: this.mapsRef.current.map(map => map.uniqueId),
                mtzNames: this.mapsRef.current.filter(map => map.hasReflectionData).map(map => map.associatedReflectionFileName),
            };

            const keyString: string = JSON.stringify({
                ...key,
                label: MoorhenTimeCapsule.getBackupLabel(key),
            });

            return this.createBackup(keyString, sessionString);
        }
    }

    /**
     * Remove the oldest automatic backup if the number of backups in the local storage has reached the threshold
     */
    async cleanupIfFull(): Promise<void> {
        const keyStrings: string[] = await this.storageInstance.keys();
        const keys: backupKey[] = keyStrings.map((keyString: string) => JSON.parse(keyString)).filter(key => key.type === "automatic");
        const sortedKeys = keys
            .sort((a, b) => {
                return parseInt(a.dateTime) - parseInt(b.dateTime);
            })
            .reverse();
        if (sortedKeys.length - 1 >= this.maxBackupCount) {
            const toRemoveCount = sortedKeys.length - this.maxBackupCount;
            const promises = sortedKeys.slice(-toRemoveCount).map(key => this.removeBackup(JSON.stringify(key)));
            await Promise.all(promises);
        }
    }

    /**
     * Remove orphan metadata files with no backup session associated
     */
    async cleanupUnusedDataFiles(): Promise<void> {
        const allKeyStrings = await this.storageInstance.keys();
        const allKeys: backupKey[] = allKeyStrings.map((keyString: string) => JSON.parse(keyString));
        const backupKeys = allKeys.filter((key: backupKey) => ["automatic", "manual"].includes(key.type));
        // Data files used by any backup, not only the first one
        const usedNames = new Set(backupKeys.flatMap((key: backupKey) => [...(key.mtzNames ?? []), ...(key.mapNames ?? [])]));

        await Promise.all(
            allKeys
                .filter((key: backupKey) => ["mtzData", "mapData"].includes(key.type))
                .map((key: backupKey) => {
                    if (!usedNames.has(key.name)) {
                        return this.removeBackup(JSON.stringify(key));
                    }
                    return Promise.resolve();
                })
        );
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
                await this.storageInstance.setItem(key, value);
                console.log(`Created backup with value: ${value}`);
                await this.cleanupIfFull();
                this.setBusy(false);
                return key;
            } catch (err) {
                console.log(err);
            }
        }
    }

    /**
     * Retrieve a session backup
     * @param {string} key - Backup key
     */
    async retrieveBackup(key: string): Promise<string | ArrayBuffer> {
        try {
            return await this.storageInstance.getItem(key);
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Retrieve the latest backup stored in local storage
     * @returns {string} JSON structure with session data
     */
    async retrieveLastBackup(): Promise<string | ArrayBuffer> {
        try {
            const sortedKeys = await this.getSortedKeys();
            if (sortedKeys && sortedKeys.length > 0) {
                // getSortedKeys lists the newest backup first
                const lastBackupKey = sortedKeys[0];
                const backup = await this.retrieveBackup(JSON.stringify(lastBackupKey));
                return backup;
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Remove a specific backup
     * @param {string} key - Backup key
     */
    async removeBackup(key: string): Promise<void> {
        try {
            await this.storageInstance.removeItem(key);
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Remove all backups
     */
    async dropAllBackups(): Promise<void> {
        try {
            await this.storageInstance.clear();
            await this.storageInstance.setItem(JSON.stringify({ type: "version" }), this.version);
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Get backup keys sorted by date
     * @returns {backupKey[]} A list of backup keys
     */
    async getSortedKeys(): Promise<backupKey[]> {
        const keyStrings = await this.storageInstance.keys();
        const keys: backupKey[] = keyStrings
            .map((keyString: string) => JSON.parse(keyString))
            .filter(key => ["automatic", "manual"].includes(key.type));
        const sortedKeys = keys
            .sort((a, b) => {
                return parseInt(a.dateTime) - parseInt(b.dateTime);
            })
            .reverse();
        return sortedKeys;
    }

    /**
     * A static function that can be used to get the backup label for a given key object
     * @param {backupKey} key - An object with the backup key data
     * @returns {string} A string corresponding with the backup label
     */
    static getBackupLabel(key: backupKey): string {
        const dateOptions = {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        } as const;
        const intK: number = parseInt(key.dateTime);
        const date: Date = new Date(intK);
        const dateString = `${date.toLocaleDateString(
            Intl.NumberFormat().resolvedOptions().locale,
            dateOptions
        )} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
        const moleculeNamesLabel: string =
            key.molNames.join(",").length > 10 ? key.molNames.join(",").slice(0, 8) + "..." : key.molNames.join(",");
        return `${moleculeNamesLabel} -- ${dateString} -- ${key.type === "automatic" ? "AUTO" : "MANUAL"}`;
    }

    /**
     * A static function that can be used to load a session data object
     * @param {backupSession} sessionData - An object containing session data
     * @param {string} monomerLibraryPath - Path to the monomer library
     * @param {moorhen.Molecule[]} molecules - State containing current molecules loaded in the session
     * @param {moorhen.Map[]} maps - State containing current maps loaded in the session
     * @param {React.RefObject<moorhen.CommandCentre>} commandCentre - React reference to the command centre
     * @param {React.RefObject<moorhen.TimeCapsule>} timeCapsuleRef - React reference to the time capsule
     * @param {React.RefObject<webGL.MGWebGL>} glRef - React reference to the webGL renderer
     * @param {Store} store - The Redux store
     * @param {Dispatch<AnyAction>} dispatch - Dispatch method for the MoorhenReduxStore
     * @param {Promise<string>} fetchExternalUrl - Function to fetch external file URL for non embedded data
     * @returns {number} Returns -1 if there was an error loading the session otherwise 0
     */
    static async loadSessionData(
        sessionData: backupSession,
        moorhenInstance: MoorhenInstance,
        fetchExternalUrl?: (uniqueId: string) => Promise<string>,

    ): Promise<number> {

        const timeCapsuleRef = moorhenInstance.getTimeCapsuleRef();
        const store = moorhenInstance.store;

        if (!sessionData) {
            return -1;
        }
        // Versions are "v<number>": refuse sessions from a more recent Moorhen with a clear message
        const versionNumber = (version: unknown) => parseInt(String(version).replace(/^v/, ""));
        if (versionNumber(sessionData.version) > versionNumber(timeCapsuleRef.current.version)) {
            console.warn(MoorhenTimeCapsule.NEWER_VERSION_MESSAGE);
            return MoorhenTimeCapsule.NEWER_VERSION_STATUS;
        }
        let sceneState: UserSceneState | null = null;
        if (sessionData.sceneData) {
            try {
                sceneState = JSON.parse(sessionData.sceneData);
            } catch (error) {
                console.warn("Ignoring unreadable scene data in session", error);
            }
            if (sceneState?.formatVersion > USER_SCENE_FORMAT_VERSION) {
                console.warn(MoorhenTimeCapsule.NEWER_VERSION_MESSAGE);
                return MoorhenTimeCapsule.NEWER_VERSION_STATUS;
            }
        }
        if (!Object.hasOwn(sessionData, "version") || timeCapsuleRef.current.version !== sessionData.version) {
            if (!MoorhenTimeCapsule.supportedLegacyVersions.includes(sessionData.version)) {
                console.warn(`Outdated session backup version (${sessionData.version}), wont load...`);
                return -1;
            }
        }
        // Loading deletes every molecule: no scene switch may run meanwhile (a running one finishes first)
        return moorhenInstance.userScene.whileLocked(async () => {
            // Checked once no switch runs: Play waits for the scenes too (see the movie panel)
            if (store.getState().movie.isPlaying) {
                console.warn(MoorhenTimeCapsule.MOVIE_PLAYING_MESSAGE);
                return MoorhenTimeCapsule.MOVIE_PLAYING_STATUS;
            }
            timeCapsuleRef.current.setBusy(true);
            // A session replaces everything, the movie included: its scene and the objects it
            // fades are about to go (a movie file sets its own movie after loading its session)
            store.dispatch(newMovie());
            try {
                await MoorhenTimeCapsule.restoreSessionData(sessionData, sceneState, moorhenInstance, fetchExternalUrl);
            } catch (error) {
                // Molecules may already be deleted: drop the old scenes, which refer to them
                moorhenInstance.userScene.resetForLegacySession();
                throw error;
            } finally {
                timeCapsuleRef.current.setBusy(false);
            }
            return 0;
        });
    }

    /** The session restore proper, once loadSessionData has checked the session can be loaded */
    private static async restoreSessionData(
        sessionData: backupSession,
        sceneState: UserSceneState | null,
        moorhenInstance: MoorhenInstance,
        fetchExternalUrl?: (uniqueId: string) => Promise<string>
    ): Promise<void> {
        const timeCapsuleRef = moorhenInstance.getTimeCapsuleRef();
        const molecules = moorhenInstance.getMoleculeList();
        const maps = moorhenInstance.getMapList();
        const commandCentre = moorhenInstance.getCommandCentreRef();
        const store = moorhenInstance.store;
        const dispatch = moorhenInstance.dispatch;
        const monomerLibraryPath = moorhenInstance.paths.monomerLibraryPath;

        // Ids handed out to restored representations, so that a file carrying a duplicate - one
        // stitched together from two sessions, say - cannot make two representations answer to
        // the same name. See representationIdForRestore.
        const representationIdsTaken = new Set<string>();

        // Delete current scene
        molecules.forEach(molecule => {
            molecule.delete();
        });

        maps.forEach(map => {
            map.delete();
        });

        batch(() => {
            dispatch(emptyMolecules());
            dispatch(emptyMaps());
        });

        // Load molecules stored in session from coords string
        const newMoleculePromises =
            sessionData.moleculeData?.map(async storedMoleculeData => {
                const newMolecule = new MoorhenMolecule(moorhenInstance);
                if (sessionData.dataIsEmbedded || sessionData.dataIsEmbedded === undefined) {
                    newMolecule.uniqueId = storedMoleculeData.uniqueId;
                    return newMolecule.loadToCootFromString(storedMoleculeData.coordString, storedMoleculeData.name);
                } else {
                    if (fetchExternalUrl) {
                        newMolecule.uniqueId = storedMoleculeData.uniqueId;
                        const doppioUrl = await fetchExternalUrl(storedMoleculeData.uniqueId);
                        return newMolecule.loadToCootFromURL(doppioUrl, storedMoleculeData.name);
                    }
                    console.warn("No function provided for fetchExternalUrl");
                }
            }) || [];

        // Load maps stored in session
        const newMapPromises =
            sessionData.mapData?.map(async storedMapData => {
                if (sessionData.includesAdditionalMapData) {
                    if (sessionData.dataIsEmbedded || sessionData.dataIsEmbedded === undefined) {
                        return MoorhenMap.loadToCootFromMapData(storedMapData.mapData, storedMapData.name, storedMapData.isDifference, moorhenInstance);
                    } else {
                        if (fetchExternalUrl) {

                            const doppioUrl = await fetchExternalUrl(storedMapData.uniqueId);
                            const newMap = MoorhenMap.loadToCootFromMapURL(doppioUrl, storedMapData.name, moorhenInstance, storedMapData.isDifference, false, undefined, storedMapData.uniqueId);
                            return newMap
                        }
                        console.warn("No function provided for fetchExternalUrl");
                    }
                } else {
                    if (sessionData.dataIsEmbedded || sessionData.dataIsEmbedded === undefined) {
                        return timeCapsuleRef.current
                            .retrieveBackup(
                                JSON.stringify({
                                    type: "mapData",
                                    name: storedMapData.uniqueId,
                                })
                            )
                            .then(mapData => {
                                return MoorhenMap.loadToCootFromMapData(
                                    mapData as ArrayBuffer | Uint8Array,
                                    storedMapData.name,
                                    storedMapData.isDifference,
                                    moorhenInstance,
                                    storedMapData.uniqueId
                                );
                            });
                    } else {
                        if (fetchExternalUrl) {
                            const doppioUrl = await fetchExternalUrl(storedMapData.uniqueId);
                            return MoorhenMap.loadToCootFromMapURL(doppioUrl, storedMapData.name, moorhenInstance, storedMapData.isDifference, false, undefined, storedMapData.uniqueId);
                        }
                        console.warn("No function provided for fetchExternalUrl");
                    }
                }
            }) || [];

        const loadPromises = await Promise.all([...newMoleculePromises, ...newMapPromises]);
        const newMolecules = loadPromises.filter(item => item.type === "molecule") as moorhen.Molecule[];
        const newMaps = loadPromises.filter(item => item.type === "map") as moorhen.Map[];

        // Draw the molecules with the styles stored in session (needs to be done sequentially due to colour rules)
        for (let i = 0; i < newMolecules.length; i++) {
            const molecule = newMolecules[i];
            const storedMoleculeData = sessionData.moleculeData[i];
            if (storedMoleculeData.ligandDicts) {
                await Promise.all(
                    Object.keys(storedMoleculeData.ligandDicts).map(compId => molecule.addDict(storedMoleculeData.ligandDicts[compId]))
                );
            }
            molecule.defaultColourRules = storedMoleculeData.defaultColourRules.map(item => {
                const colourRule = ColourRule.initFromDataObject(item, moorhenInstance.commandCentre, molecule);
                return colourRule;
            });
            if (storedMoleculeData.defaultBondOptions) {
                molecule.defaultBondOptions = storedMoleculeData.defaultBondOptions;
            }
            if (storedMoleculeData.defaultM2tParams) {
                molecule.defaultM2tParams = storedMoleculeData.defaultM2tParams;
            }
            if (storedMoleculeData.defaultResEnvOptions) {
                molecule.defaultResidueEnvironmentOptions = storedMoleculeData.defaultResEnvOptions;
            }
            if (storedMoleculeData.representations) {
                for (const item of storedMoleculeData.representations) {
                    const colourRules = !item.colourRules
                        ? null
                        : item.colourRules.map(item => {
                              const colourRule = ColourRule.initFromDataObject(item, moorhenInstance.commandCentre, molecule);
                              return colourRule;
                          });
                    const representation = await molecule.addRepresentation(
                        item.style,
                        item.cid,
                        item.isCustom,
                        colourRules,
                        item.bondOptions,
                        item.m2tParams,
                        item.resEnvOptions,
                        item.nonCustomOpacity,
                        item.neighboursCid,
                        item.restrictToNeighbours,
                        item.excludeNeighbours,
                        item.hbondedToCid,
                        item.hbondedTo,
                        item.neighboursDistance
                    );
                    // Its identity, back as it was saved. A session written before the format
                    // carried this keeps the guid minted a moment ago, which is what has always
                    // happened.
                    representation.uniqueId = representationIdForRestore(
                        item.uniqueId, representationIdsTaken, representation.uniqueId,
                    );
                    representationIdsTaken.add(representation.uniqueId);

                    if (item.isCustom) {
                        dispatch(addCustomRepresentation(representation));
                    }
                }
            }
            if (storedMoleculeData.symmetryOn) {
                molecule.setSymmetryRadius(storedMoleculeData.symmetryRadius);
                await molecule.toggleSymmetry();
            } else if (storedMoleculeData.biomolOn) {
                molecule.toggleBiomolecule();
            }
        }

        // Associate maps to reflection data
        await Promise.all(
            newMaps.map((map, index) => {
                const storedMapData = sessionData.mapData[index];
                if (sessionData.includesAdditionalMapData && storedMapData.reflectionData) {
                    return map.associateToReflectionData(storedMapData.selectedColumns, storedMapData.reflectionData);
                } else if (storedMapData.associatedReflectionFileName && storedMapData.selectedColumns) {
                    return timeCapsuleRef.current
                        .retrieveBackup(
                            JSON.stringify({
                                type: "mtzData",
                                name: storedMapData.associatedReflectionFileName,
                            })
                        )
                        .then(reflectionData => {
                            return map.associateToReflectionData(storedMapData.selectedColumns, reflectionData as ArrayBuffer);
                        });
                }
                return Promise.resolve();
            })
        );

        // Add molecules
        newMolecules.forEach(molecule => {
            dispatch(addMolecule(molecule));
        });

        // Add maps
        newMaps.forEach((map, index) => {
            const storedMapData = sessionData.mapData[index];
            map.showOnLoad = storedMapData.showOnLoad;
            map.suggestedRadius = storedMapData.radius;
            map.suggestedContourLevel = storedMapData.contourLevel;
            batch(() => {
                dispatch(
                    setMapColours({
                        molNo: map.molNo,
                        rgb: storedMapData.rgba.mapColour,
                    })
                );
                dispatch(
                    setNegativeMapColours({
                        molNo: map.molNo,
                        rgb: storedMapData.rgba.negativeDiffColour,
                    })
                );
                dispatch(
                    setPositiveMapColours({
                        molNo: map.molNo,
                        rgb: storedMapData.rgba.positiveDiffColour,
                    })
                );
                dispatch(
                    setMapRadius({
                        molNo: map.molNo,
                        radius: storedMapData.radius,
                    })
                );
                dispatch(
                    setContourLevel({
                        molNo: map.molNo,
                        contourLevel: storedMapData.contourLevel,
                    })
                );
                dispatch(
                    setMapAlpha({
                        molNo: map.molNo,
                        alpha: storedMapData.rgba.a,
                    })
                );
                dispatch(
                    setMapStyle({
                        molNo: map.molNo,
                        style: storedMapData.style,
                    })
                );
                dispatch(addMap(map));
            });
        });

        // Set active map
        if (sessionData.activeMapIndex !== undefined && sessionData.activeMapIndex !== -1) {
            dispatch(setActiveMap(newMaps[sessionData.activeMapIndex]));
        }

        // A session saved before tags were a field has them written into the uniqueId instead,
        // so they are recovered on the way in. One-way, by design: nothing writes a tag into an
        // identifier any more, and a session written now is not expected to group correctly in
        // an older Moorhen. Anything already tagged is left alone.
        //
        // The XPID form needs the molecule ids to be separable from the rest of the identifier,
        // which is why they are collected first.
        const knownMoleculeIds = (sessionData.moleculeData ?? []).map(m => m.uniqueId).filter(Boolean);

        // Load 3D objects
        dispatch(emptyObjects());
        if (sessionData.threeDObjectData) {
            withMigratedTags(sessionData.threeDObjectData, knownMoleculeIds).forEach(d => {
                dispatch(addObject(d));
            });
        }

        // Load vectors
        dispatch(emptyVectors());
        if (sessionData.vectorData) {
            withMigratedTags(sessionData.vectorData, knownMoleculeIds).forEach(d => {
                dispatch(addVector(d));
            });
        }

        // Load 2D canvas overlays
        dispatch(emptyOverlays());
        if (sessionData.overlay2dData) {
            if (sessionData.overlay2dData.fracPath2D) {
                sessionData.overlay2dData.fracPath2D.forEach(d => {
                    dispatch(addFracPathOverlay(d));
                });
            }
            if (sessionData.overlay2dData.svgPath2D) {
                sessionData.overlay2dData.svgPath2D.forEach(d => {
                    dispatch(addSvgPathOverlay(d));
                });
            }
            if (sessionData.overlay2dData.textFracPath2D) {
                sessionData.overlay2dData.textFracPath2D.forEach(d => {
                    dispatch(addTextOverlay(d));
                });
            }
            if (sessionData.overlay2dData.latexFracPath2D) {
                sessionData.overlay2dData.latexFracPath2D.forEach(d => {
                    dispatch(addLatexOverlay(d));
                });
            }
            if (sessionData.overlay2dData.imageFracPath2D) {
                sessionData.overlay2dData.imageFracPath2D.forEach(d => {
                    dispatch(addImageOverlay(d));
                });
            }
        }

        // Set camera details
        const guardedDispatch = (action: (data) => AnyAction, data: unknown) => {
            if (dispatch && action) {
                if (typeof data === "undefined") {
                    console.warn(`Data is undefined for action ${action}`);
                    return;
                }
                dispatch(action(data));
            }
        }

        guardedDispatch(setOrigin, sessionData.viewData.origin);
        guardedDispatch(setAmbient, sessionData.viewData.ambientLight);
        guardedDispatch(setSpecular, sessionData.viewData.specularLight);
        guardedDispatch(setDiffuse, sessionData.viewData.diffuseLight);
        guardedDispatch(setLightPosition, sessionData.viewData.lightPosition);
        guardedDispatch(setSpecularPower, sessionData.viewData.specularPower);
        guardedDispatch(setZoom, sessionData.viewData.zoom);

        // The camera as the file describes it: fog turned from absolute distances into offsets from
        // the view centre, the clip negation undone, and an eye distance that an older file does
        // not carry and so is assumed to be the historical 250. The store still holds the old
        // shapes - absolute fog, positive clip - so they are turned straight back; the value of
        // going through here is that one tested module owns both directions of the conversion.
        //
        // The eye is dispatched before the fog. MoorhenWebMG reconciles them in that order for the
        // same reason: fog read against the wrong eye lands in the wrong place.
        //
        // A file missing any of these fields must still restore the rest, as it did when each one
        // went through guardedDispatch on its own. Origin and quat are only placeholders here - they
        // are restored separately - and a fog or clip computed from a missing field comes out NaN,
        // which is turned back into "absent" so guardedDispatch skips it.
        const restoredCamera = cameraFromSession({
            ...sessionData.viewData,
            origin: sessionData.viewData.origin ?? [0, 0, 0],
            quat4: sessionData.viewData.quat4 ?? [0, 0, 0, 1],
        });
        const restoredSlab = slabFromCamera(restoredCamera);
        const finiteOrAbsent = (value: number) => (Number.isFinite(value) ? value : undefined);
        guardedDispatch(setFogClipOffset, restoredCamera.eyeDistance);
        guardedDispatch(setFogStart, finiteOrAbsent(restoredSlab.fogStart));
        guardedDispatch(setFogEnd, finiteOrAbsent(restoredSlab.fogEnd));
        guardedDispatch(setClipStart, finiteOrAbsent(restoredCamera.clipFront));
        guardedDispatch(setClipEnd, finiteOrAbsent(restoredCamera.clipBack));
        guardedDispatch(setQuat, sessionData.viewData.quat4);
        guardedDispatch(setBackgroundColor, sessionData.viewData.backgroundColor);
        guardedDispatch(setEdgeDetectDepthScale, sessionData.viewData.edgeDetection.depthScale);
        guardedDispatch(setEdgeDetectDepthThreshold, sessionData.viewData.edgeDetection.depthThreshold);
        guardedDispatch(setEdgeDetectNormalScale, sessionData.viewData.edgeDetection.normalScale);
        guardedDispatch(setEdgeDetectNormalThreshold, sessionData.viewData.edgeDetection.normalThreshold);
        guardedDispatch(setDoEdgeDetect, sessionData.viewData.edgeDetection.enabled);
        guardedDispatch(setDoShadow, sessionData.viewData.shadows);
        guardedDispatch(setDoSSAO, sessionData.viewData.ssao.enabled);
        guardedDispatch(setSsaoBias, sessionData.viewData.ssao.bias);
        guardedDispatch(setSsaoRadius, sessionData.viewData.ssao.radius);
        guardedDispatch(setUseOffScreenBuffers, sessionData.viewData.blur.enabled);
        guardedDispatch(setDepthBlurDepth, sessionData.viewData.blur.depth);
        guardedDispatch(setDepthBlurRadius, sessionData.viewData.blur.radius);
        guardedDispatch(setUseOffScreenBuffers, sessionData.viewData.blur.enabled);
        guardedDispatch(setDoPerspectiveProjection, sessionData.viewData.doPerspectiveProjection ?? false);
        // The eye distance is restored with the rest of the camera further up, through
        // cameraFromSession, which also applies the "a session without one means 250" rule. The
        // dispatch that used to be here said it ran before the fog was restored, and after this
        // merge it would have run after - so it goes rather than being left to mean the opposite
        // of what it says.


        // Set connected maps and molecules if any
        const connectedMoleculeIndex = sessionData.moleculeData?.findIndex(molecule => molecule.connectedToMaps?.length > 0);
        if (sessionData.mapData && sessionData.moleculeData && connectedMoleculeIndex !== -1) {
            const oldConnectedMolecule = sessionData.moleculeData[connectedMoleculeIndex];
            const molecule = newMolecules[connectedMoleculeIndex].molNo;
            const [reflectionMap, twoFoFcMap, foFcMap] = oldConnectedMolecule.connectedToMaps.map(
                item => newMaps[sessionData.mapData.findIndex(map => map.molNo === item)].molNo
            );
            const connectMapsArgs = [molecule, reflectionMap, twoFoFcMap, foFcMap];
            const sFcalcArgs = [molecule, twoFoFcMap, foFcMap, reflectionMap];

            await commandCentre.current.cootCommand(
                {
                    command: "connect_updating_maps",
                    commandArgs: connectMapsArgs,
                    returnType: "status",
                },
                false
            );

            await commandCentre.current.cootCommand(
                {
                    command: "sfcalc_genmaps_using_bulk_solvent",
                    commandArgs: sFcalcArgs,
                    returnType: "status",
                },
                false
            );
            // The 2Fo-Fc and Fo-Fc maps were made again in place, perhaps after they were first
            // fetched for the GPU contours.
            newMaps.filter(map => map.molNo === twoFoFcMap || map.molNo === foFcMap).forEach(map => map.markDataChanged());

            batch(() => {
                dispatch(setFoFcMapMolNo(foFcMap));
                dispatch(setTwoFoFcMapMolNo(twoFoFcMap));
                dispatch(setReflectionMapMolNo(reflectionMap));
                dispatch(setConnectedMoleculeMolNo(molecule));
                dispatch(enableUpdatingMaps());
            });
        }

        // What the session restored above is the selected scene; restore the others around it
        if (sceneState) {
            moorhenInstance.userScene.importState(sceneState);
        } else {
            moorhenInstance.userScene.resetForLegacySession();
        }
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
     * @param {Store} store - The Redux store
     * @param {Dispatch<AnyAction>} dispatch - Dispatch method for the MoorhenReduxStore
     * @returns {number} Returns 0 on success, -1 if there was an error loading the session, or
     * NEWER_VERSION_STATUS if the session is from a more recent Moorhen
     */
    static async loadSessionFromArrayBuffer(
        sessionArrayBuffer: ArrayBuffer,
        moorhenInstance: MoorhenInstance
    ): Promise<number> {
        const timeCapsuleRef = moorhenInstance.getTimeCapsuleRef();
        timeCapsuleRef.current.setBusy(true);
        try {
            const bytes = new Uint8Array(sessionArrayBuffer);
            const sessionMessage = moorhensession.Session.decode(bytes, undefined, undefined);
            return await MoorhenTimeCapsule.loadSessionFromProtoMessage(sessionMessage, moorhenInstance);
        } finally {
            timeCapsuleRef.current.setBusy(false);
        }
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
     * @param {Store} store - The Redux store
     * @param {Dispatch<AnyAction>} dispatch - Dispatch method for the MoorhenReduxStore
     * @returns {number} Returns -1 if there was an error loading the session otherwise 0
     */
    static async loadSessionFromProtoMessage(
        sessionProtoMessage: any,
        moorhenInstance: MoorhenInstance
    ): Promise<number> {
        const timeCapsuleRef = moorhenInstance.getTimeCapsuleRef();
        timeCapsuleRef.current.setBusy(true);
        try {
            const sessionData = moorhensession.Session.toObject(sessionProtoMessage) as backupSession;
            return await MoorhenTimeCapsule.loadSessionData(sessionData, moorhenInstance);
        } finally {
            timeCapsuleRef.current.setBusy(false);
        }
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
     * @param {Store} store - The Redux store
     * @param {Dispatch<AnyAction>} dispatch - Dispatch method for the MoorhenReduxStore
     * @returns {number} Returns -1 if there was an error loading the session otherwise 0
     */
    static async loadSessionFromJsonString(
        sessionDataString: string,
        moorhenInstance: MoorhenInstance
    ): Promise<number> {
        const timeCapsuleRef = moorhenInstance.getTimeCapsuleRef();
        timeCapsuleRef.current.setBusy(true);
        try {
            const sessionData: backupSession = JSON.parse(sessionDataString);
            return await MoorhenTimeCapsule.loadSessionData(sessionData, moorhenInstance);
        } finally {
            timeCapsuleRef.current.setBusy(false);
        }
    }
}
