import { Button, Form, InputGroup, Modal, Stack } from "react-bootstrap";
import { useRef, useState } from "react";
import { MenuItem } from "@mui/material";
import { cidToSpec } from "../../utils/MoorhenUtils";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import {MoorhenMap} from "../../utils/MoorhenMap"
import {MoorhenMolecule} from "../../utils/MoorhenMolecule"
import { moorhen } from "../../types/moorhen";

var TRIAL_COUNT = 0

const doTest = async (props: any) => {
    TRIAL_COUNT += 1
    console.log(`########################################## ${TRIAL_COUNT}`)
    const molecule = props.molecules.find(molecule => molecule.molNo === 0)
    const chosenAtom = cidToSpec('/1/A/14/C')
    try {
        const result = await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'flipPeptide_cid',
            commandArgs: [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, ''],
            changesMolecules: [molecule.molNo]
        }, true)

        console.log(result.data.timeMainThreadToWorker)
        console.log(result.data.timelibcootAPI)
        console.log(result.data.timeconvertingWASMJS)
        console.log(result)
        console.log(`Message from worker back to main thread took ${Date.now() - result.data.messageSendTime} ms (flipPeptide_cid) - (${result.data.messageId.slice(0, 5)})`)
                    
        const test = await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'refine_residues_using_atom_cid',
            commandArgs: [ molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, 'TRIPLE', 4000],
            changesMolecules: [molecule.molNo]
        }, true)
                    
        console.log(test.data.timeMainThreadToWorker)
        console.log(test.data.timelibcootAPI)
        console.log(test.data.timeconvertingWASMJS)
        console.log(test)
        console.log(`Message from worker back to main thread took ${Date.now() - test.data.messageSendTime} ms (refine_residues_using_atom_cid) - (${test.data.messageId.slice(0, 5)})`)

        molecule.setAtomsDirty(true)
        await molecule.redraw()
        const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molecule.molNo } })
        document.dispatchEvent(scoresUpdateEvent)
        
        if (TRIAL_COUNT <= 99) {
            setTimeout(() => doTest(props), 8000)
        }
    } catch (err) {
            console.log('Encountered', err)
    }
}

export const MoorhenDevMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const customCid = useRef<string>('')
    const moleculeSelectRef = useRef<HTMLSelectElement>()
    const menuItemProps = {setPopoverIsShown, customCid, moleculeSelectRef, ...props}

    // FIXME: At the moment this is Copy & Paste from MoorhenFileMenu. Things will need to be refactored...
    const loadSessionJSON = async (sessionDataString: string): Promise<void> => {
        props.timeCapsuleRef.current.busy = true
        const sessionData: moorhen.backupSession = JSON.parse(sessionDataString)

        if (!sessionData) {
            return
        } else if (!Object.hasOwn(sessionData, 'version') || props.timeCapsuleRef.current.version !== sessionData.version) {
            props.setToastContent(<h4>Failed to read backup (deprecated format)</h4>)
            console.log('Outdated session backup version, wont load...')
            return
        }
        
        // Delete current scene
        props.molecules.forEach(molecule => {
            molecule.delete()
        })
        props.changeMolecules({ action: "Empty" })

        props.maps.forEach(map => {
            map.delete()
        })
        props.changeMaps({ action: "Empty" })

        // Load molecules stored in session from pdb string
        const newMoleculePromises = sessionData.moleculeData.map(storedMoleculeData => {
            const newMolecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.monomerLibraryPath)
            return newMolecule.loadToCootFromString(storedMoleculeData.pdbData, storedMoleculeData.name)
        })
        
        // Load maps stored in session
        const newMapPromises = sessionData.mapData.map(storedMapData => {
            const newMap = new MoorhenMap(props.commandCentre, props.glRef)
            if (sessionData.includesAdditionalMapData) {
                return newMap.loadToCootFromMapData(
                    Uint8Array.from(Object.values(storedMapData.mapData)).buffer, 
                    storedMapData.name, 
                    storedMapData.isDifference
                    )
            } else {
                newMap.uniqueId = storedMapData.uniqueId
                return props.timeCapsuleRef.current.retrieveBackup(
                    JSON.stringify({
                        type: 'mapData',
                        name: storedMapData.uniqueId
                    })
                    ).then(mapData => {
                        return newMap.loadToCootFromMapData(
                            mapData as Uint8Array, 
                            storedMapData.name, 
                            storedMapData.isDifference
                            )
                        })    
            }
        })
        
        const loadPromises = await Promise.all([...newMoleculePromises, ...newMapPromises])
        const newMolecules = loadPromises.filter(item => item.type === 'molecule') as moorhen.Molecule[] 
        const newMaps = loadPromises.filter(item => item.type === 'map') as moorhen.Map[] 

        // Draw the molecules with the styles stored in session
        let drawPromises: Promise<void>[] = []
        newMolecules.forEach((molecule, moleculeIndex) => {
            const storedMoleculeData = sessionData.moleculeData[moleculeIndex]
            molecule.defaultBondOptions = storedMoleculeData.defaultBondOptions
            storedMoleculeData.representations.forEach(item => molecule.addRepresentation(item.style, item.cid))
        })

        // Associate maps to reflection data
        const associateReflectionsPromises = newMaps.map((map, index) => {
            const storedMapData = sessionData.mapData[index]
            if (sessionData.includesAdditionalMapData && storedMapData.reflectionData) {
                return map.associateToReflectionData(
                    storedMapData.selectedColumns, 
                    Uint8Array.from(Object.values(storedMapData.reflectionData))
                )
            } else if(storedMapData.associatedReflectionFileName && storedMapData.selectedColumns) {
                return props.timeCapsuleRef.current.retrieveBackup(
                    JSON.stringify({
                        type: 'mtzData',
                        name: storedMapData.associatedReflectionFileName
                    })
                    ).then(reflectionData => {
                        return map.associateToReflectionData(
                            storedMapData.selectedColumns, 
                            Uint8Array.from(Object.values(reflectionData))
                        )
                    })
            }
            return Promise.resolve()
        })
        
        await Promise.all([...drawPromises, ...associateReflectionsPromises])

        // Change props.molecules
        newMolecules.forEach(molecule => {
            props.changeMolecules({ action: "Add", item: molecule })
        })

        // Change props.maps
        newMaps.forEach(map => {
            props.changeMaps({ action: "Add", item: map })
        })

        // Set active map
        if (sessionData.activeMapIndex !== -1){
            props.setActiveMap(newMaps[sessionData.activeMapIndex])
        }

        // Set camera details
        props.glRef.current.setAmbientLightNoUpdate(...Object.values(sessionData.viewData.ambientLight) as [number, number, number])
        props.glRef.current.setSpecularLightNoUpdate(...Object.values(sessionData.viewData.specularLight) as [number, number, number])
        props.glRef.current.setDiffuseLightNoUpdate(...Object.values(sessionData.viewData.diffuseLight) as [number, number, number])
        props.glRef.current.setLightPositionNoUpdate(...Object.values(sessionData.viewData.lightPosition) as [number, number, number])
        props.glRef.current.setZoom(sessionData.viewData.zoom, false)
        props.glRef.current.set_fog_range(sessionData.viewData.fogStart, sessionData.viewData.fogEnd, false)
        props.glRef.current.set_clip_range(sessionData.viewData.clipStart, sessionData.viewData.clipEnd, false)
        props.glRef.current.doDrawClickedAtomLines = sessionData.viewData.doDrawClickedAtomLines
        props.glRef.current.background_colour = sessionData.viewData.backgroundColor
        props.glRef.current.setOrigin(sessionData.viewData.origin, false)
        props.glRef.current.setQuat(sessionData.viewData.quat4)

        // Set connected maps and molecules if any
        const connectedMoleculeIndex = sessionData.moleculeData.findIndex(molecule => molecule.connectedToMaps !== null)
        if (connectedMoleculeIndex !== -1) {
            const oldConnectedMolecule = sessionData.moleculeData[connectedMoleculeIndex]        
            const molecule = newMolecules[connectedMoleculeIndex].molNo
            const [reflectionMap, twoFoFcMap, foFcMap] = oldConnectedMolecule.connectedToMaps.map(item => newMaps[sessionData.mapData.findIndex(map => map.molNo === item)].molNo)
            const connectMapsArgs = [molecule, reflectionMap, twoFoFcMap, foFcMap]
            const sFcalcArgs = [molecule, twoFoFcMap, foFcMap, reflectionMap]
            
            await props.commandCentre.current.cootCommand({
                command: 'connect_updating_maps',
                commandArgs: connectMapsArgs,
                returnType: 'status'
            }, false)
                
            await props.commandCentre.current.cootCommand({
                command: 'sfcalc_genmaps_using_bulk_solvent',
                commandArgs: sFcalcArgs,
                returnType: 'status'
            }, false)
                    
            const connectedMapsEvent: moorhen.ConnectMapsEvent = new CustomEvent("connectMaps", {
                "detail": {
                    molecule: molecule,
                    maps: [reflectionMap, twoFoFcMap, foFcMap],
                    uniqueMaps: [...new Set([reflectionMap, twoFoFcMap, foFcMap].slice(1))]
                }
            })
            document.dispatchEvent(connectedMapsEvent)
        }
        
        // Set map visualisation details after map card is created using a timeout
        setTimeout(() => {
            newMaps.forEach((map, index) => {
                const storedMapData = sessionData.mapData[index]
                map.mapColour = storedMapData.colour
                let newMapContour: moorhen.NewMapContourEvent = new CustomEvent("newMapContour", {
                    "detail": {
                        molNo: map.molNo,
                        mapRadius: storedMapData.radius,
                        cootContour: storedMapData.cootContour,
                        contourLevel: storedMapData.contourLevel,
                        mapColour: storedMapData.colour,
                        litLines: storedMapData.litLines,
                    }
                });               
                document.dispatchEvent(newMapContour);
            })
        }, 2500);

        props.timeCapsuleRef.current.busy = false

    }

    const getHistoryCard = (historyEntry: moorhen.cootCommandKwargs, index: number) => {
        const moleculeNames = []
        if (historyEntry.changesMolecules?.length > 0) {
            historyEntry.changesMolecules.forEach(imol => {
                const molecule = props.molecules.find(mol => mol.molNo === imol)
                if (molecule) {
                    moleculeNames.push(molecule.name)
                }
            })
        }

        return <div key={index} style={{
            borderStyle: 'solid',
            borderColor: 'grey',
            borderWidth: '1px',
            borderRadius: '1.5rem',
            marginBottom: '0.5rem',
            padding: '0.5rem',
        }}>
        <Stack gap={1} direction='horizontal'>
            <Stack direction='vertical' gap={1}>
                <b>{historyEntry.command}</b>
                {moleculeNames.length > 0 &&
                <span>Modified mol: {moleculeNames.map(name => name)}</span>}           
            </Stack>
            {historyEntry.associatedBackupKey && 
            <Button onClick={async () => {
                let backup = await props.timeCapsuleRef.current.retrieveBackup(historyEntry.associatedBackupKey) as string
                await loadSessionJSON(backup)
                setShowHistory(false)
            }}>Load</Button>}
        </Stack>    
        </div>
    }

    return <>
                    <MenuItem onClick={() => doTest(menuItemProps)}>
                        Do a timing test...
                    </MenuItem>
                    <MenuItem onClick={() => setShowHistory(true)}>
                        Do history test
                    </MenuItem>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={props.doShadow}
                            onChange={() => { props.setDoShadow(!props.doShadow) }}
                            label="Shadows"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={props.doOutline}
                            onChange={() => { props.setDoOutline(!props.doOutline) }}
                            label="Outlines"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={props.doSpinTest}
                            onChange={() => { props.setDoSpinTest(!props.doSpinTest) }}
                            label="Spin test"/>
                    </InputGroup>
                    <Modal show={showHistory} onHide={() => setShowHistory(false)} backdrop="static">
                    <Modal.Header closeButton>
                        <Modal.Title>Session history</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {props.commandCentre.current.history.entries.map((entry, index) => getHistoryCard(entry, index)) }
                    </Modal.Body>
                    </Modal>
        </>
    }
