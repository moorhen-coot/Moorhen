import * as Y from 'yjs'
import { webGL } from "../types/mgWebGL";
import { moorhen } from "../types/moorhen";
import { WebsocketProvider } from 'y-websocket'
import { railSpecies } from './enums';
import { guid } from './utils';
import { MoorhenMoleculeRepresentation } from './MoorhenMoleculeRepresentation';
import { hexToRgb } from '@mui/material';
import { setIsInSharedSession } from '../store/sharedSessionSlice';
import MoorhenReduxStore from "../store/MoorhenReduxStore";
import { setOrigin, setZoom, setQuat } from "../store/glRefSlice";

export class MoorhenFleetManager {
    
    moleculesRef: React.RefObject<moorhen.Molecule[]>;
    mapsRef: React.RefObject<moorhen.Map[]>;
    activeMapRef: React.RefObject<moorhen.Map>;
    followViewClientId: string;
    clientId: string;
    doc: Y.Doc;
    sessionToken: string;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    websocketProvider: WebsocketProvider;
    molecules: Y.Map<{
        molNo: number;
        coordData: string;
        format: string;
        molName: string;
    }>;
    maps: Y.Map<{
        mapData: Uint8Array;
        mapName: string;
        molNo: number;
        isEM: boolean;
        isDiff: boolean;
        isActiveMap: boolean;
    }>;
    locks: Y.Map<boolean>;
    view: Y.Map<{zoom: number; origin: number[]; quat4: number[]}>;
    viewFollowers: Y.Array<string>;
    viewFollowersAll: Y.Map<Y.Array<string>>;
    connectedClients: Y.Map<{id: string; hexColor: string, rgbaColor: number[], name: string}>;
    hoveredAtoms: Y.Map<{id: string; hoveredAtom: {cid: string, molNo: string}}>;
    hoverRepresentations: {[key: string]: moorhen.MoleculeRepresentation};
    isConnected: boolean;
    lastActiveClientId: string;
    isLocked: boolean;

    constructor(moleculesRef: React.RefObject<moorhen.Molecule[]>, mapsRef: React.RefObject<moorhen.Map[]>, activeMapRef: React.RefObject<moorhen.Map>, commandCentre: React.RefObject<moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>) {
        this.commandCentre = commandCentre
        this.glRef = glRef
        this.moleculesRef = moleculesRef
        this.mapsRef = mapsRef
        this.activeMapRef = activeMapRef
        this.isConnected = false
        this.doc = null
        this.clientId = null
        this.sessionToken = null
        this.molecules = null
        this.maps = null
        this.view = null
        this.connectedClients = null
        this.lastActiveClientId = null
        this.hoveredAtoms = null
        this.followViewClientId = null
        this.viewFollowers = null
        this.viewFollowersAll = null
        this.locks = null
        this.isLocked = false
        this.hoverRepresentations = {}
    }

    setIsConnected(newValue: boolean) {
        this.isConnected = newValue
        MoorhenReduxStore.dispatch( setIsInSharedSession(newValue) )
    }

    joinSession(sessionToken?: string) {
        this.setIsConnected(true)

        this.commandCentre.current?.history.reset()
        this.commandCentre.current?.history.setSkipTracking(true)

        this.doc = new Y.Doc()
        this.sessionToken = sessionToken ? sessionToken : guid()
        this.websocketProvider = new WebsocketProvider(
            'ws://localhost:1234', this.sessionToken, this.doc
        )

        this.clientId = this.doc.clientID.toString()
        this.connectedClients = this.doc.getMap('connectedClients')
        this.viewFollowers = new Y.Array()
        this.viewFollowersAll = this.doc.getMap('viewFollowersAll')
        this.hoveredAtoms = this.doc.getMap('hoveredAtoms')
        this.molecules = this.doc.getMap('molecules')
        this.maps = this.doc.getMap('maps')
        this.view = this.doc.getMap('view')
        this.locks = this.doc.getMap('locks')
        this.setInitialStates()
    }

    setInitialStates() {
        this.locks.set(this.clientId, false)
        const hexColor = hexToRgb(`#${guid().slice(0, 6)}`)
        const rgbaColor = [...hexColor.replace('rgb(', '').replace(')', '').split(', ').map(item => parseFloat(item) / 255), 0.35]
        this.connectedClients.set(this.clientId, {
            id: this.clientId,
            name: railSpecies[Math.floor(Math.random() * railSpecies.length)],
            hexColor: hexColor,
            rgbaColor: rgbaColor,
        })
        this.hoveredAtoms.set(this.clientId, {
            id: this.clientId,
            hoveredAtom: null,
        })
        this.viewFollowersAll.set(this.clientId, this.viewFollowers)
        this.pushViewUpdate()
    }

    handleUserUpdate(evt: Y.YMapEvent<{id: string; hexColor: string; name: string; rgbaColor: number[]}>) {
        evt.changes.keys.forEach((change, clientId) => {
            if (clientId !== this.clientId) {
                if (change.action === 'add') {
                    const representation = new MoorhenMoleculeRepresentation('hover', null, this.commandCentre, this.glRef)
                    representation.hoverColor = this.connectedClients.get(clientId).rgbaColor
                    this.hoverRepresentations[clientId] = representation
                } else if (change.action === 'delete') {
                    this.hoverRepresentations[clientId].deleteBuffers()
                    delete this.hoverRepresentations[clientId]
                } else {
                    // pass
                }
            }
        })
        return this.connectedClients.size
    }

    async pushMoleculeUpdate(molecule: moorhen.Molecule) {
        const newCoordData = await molecule.getAtoms()
        this.doc.transact(() => {
            this.locks.set(this.clientId, false)
            this.molecules.set(molecule.molNo.toString(), {
                coordData: newCoordData,
                molName: molecule.name,
                format: molecule.coordsFormat,
                molNo: molecule.molNo
            })    
        })
    }

    handleMoleculeUpdates(evt: Y.YMapEvent<string>) {
        if (this.lastActiveClientId === this.clientId) {
            console.log('Ignoring molecule update triggered by this client')
            return
        }

        this.hoverRepresentations[this.lastActiveClientId]?.deleteBuffers()
        evt.changes.keys.forEach(async (change, key) => {
            const molecule = this.moleculesRef.current.find(mol => mol.molNo === parseInt(key))
            if (change.action === 'add') {
                // Add new molecule
            } else if (change.action === 'delete') {
                // Delete molecule
            } else {
                const coordData = this.molecules.get(key).coordData
                await molecule.replaceModelWithCoordData(coordData)
            }
        })
    }

    async pushMapUpdate(map: moorhen.Map) {
        const response = await map.getMap()
        this.maps.set(map.molNo.toString(), {
            mapData: new Uint8Array(response.data.result.mapData),
            mapName: map.name,
            molNo: map.molNo,
            isEM: map.isEM,
            isDiff: map.isDifference,
            isActiveMap: this.activeMapRef.current.molNo === map.molNo
        })    
    }

    setFollowViewClient(clientId: string | null) {
        if (clientId && this.clientId !== clientId) {
            this.followViewClientId = clientId
            this.viewFollowersAll.get(clientId).push([this.clientId])
            this.setClientView(clientId)
        } else {
            const followersArray = this.viewFollowersAll.get(this.followViewClientId)
            const index = followersArray.toArray().findIndex(item => item === this.clientId)
            if (index !== -1) {
                followersArray.delete(index, 1)
            } else {
                console.warn(`Cannot find ${this.clientId} among followers for ${this.followViewClientId}`)
            }
            this.followViewClientId = null
        }
    }

    setClientView(clientId: string) {
        const newView = this.view.get(clientId)
        MoorhenReduxStore.dispatch(setOrigin(newView.origin as [number, number, number]))
        MoorhenReduxStore.dispatch(setQuat(newView.quat4))
        MoorhenReduxStore.dispatch(setZoom(newView.zoom))
    }

    pushViewUpdate() {
        this.view.set(this.clientId, {
            zoom: MoorhenReduxStore.getState().glRef.zoom,
            origin: MoorhenReduxStore.getState().glRef.origin,
            quat4: MoorhenReduxStore.getState().glRef.quat
        })
    }

    handleViewUpdate(evt: Y.YMapEvent<{zoom: number; origin: number[]}>) {
        evt.changes.keys.forEach((change, clientId) => {
            if (this.followViewClientId === clientId && change.action === 'update') {
                this.setClientView(this.followViewClientId)
            }
        })
    }

    pushHoveredAtomUpdate(hoveredAtom: moorhen.HoveredAtom) {
        const { molecule, cid } = hoveredAtom
        this.hoveredAtoms.set(this.clientId, {
            id: this.clientId,
            hoveredAtom: {cid: cid, molNo: molecule.molNo.toString()},
        })
    }
    
    handleAtomHovering(evt: Y.YMapEvent<{id: string; hoveredAtom: {cid: string, molNo: string}}>) {
        evt.changes.keys.forEach((change, clientId) => {
            if (this.clientId !== clientId && change.action === 'update') {
                const { molNo, cid } = this.hoveredAtoms.get(clientId).hoveredAtom
                const molecule = this.moleculesRef.current.find(mol => mol.molNo === parseInt(molNo))
                const representation = this.hoverRepresentations[clientId]
                if (
                    representation 
                    && molecule 
                    && (
                        (representation.cid === null || representation.parentMolecule === null) 
                        || (representation.cid !== cid || representation.parentMolecule?.molNo !== molecule.molNo)
                    )
                ) {
                    representation.setParentMolecule(molecule)
                    representation.cid = cid
                    representation.redraw()
                }            
            }
        })
    }

    setLock(newValue: boolean) {
        this.locks.set(this.clientId, newValue)
    }

    handleLockUpdate(evt: Y.YMapEvent<boolean>) {
        evt.changes.keys.forEach((change, key) => {
            // We want to ignore additions and deletions
            if (change.action === 'update') {
                this.isLocked = this.locks.get(key)
                if (this.isLocked) {
                    this.lastActiveClientId = key
                }
            }
        })
    }

    handleDisconect() {
        this.connectedClients.delete(this.clientId)
        this.hoveredAtoms.delete(this.clientId)
        this.locks.delete(this.clientId)
        this.doc.destroy()
        for (const clientId in this.hoverRepresentations) {
            this.hoverRepresentations[clientId]?.deleteBuffers()
        }
        this.setIsConnected(false)
    }

    getClientList() {
        const result = []
        this.connectedClients.forEach((clientData, clientId) => {
            if (clientId !== this.clientId) {
                result.push(clientData)
            }
        })
        return result
    }
}
