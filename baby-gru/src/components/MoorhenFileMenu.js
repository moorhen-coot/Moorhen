import { NavDropdown, Form, Button, InputGroup, Overlay, SplitButton, Dropdown, Modal, Card, Stack } from "react-bootstrap";
import { MoorhenMolecule } from "../utils/MoorhenMolecule";
import { MoorhenMap } from "../utils/MoorhenMap";
import { useState, useRef, useEffect } from "react";
import { MoorhenAssociateReflectionsToMap, MoorhenImportMapCoefficientsMenuItem, MoorhenAutoOpenMtzMenuItem, MoorhenDeleteEverythingMenuItem, MoorhenLoadTutorialDataMenuItem, MoorhenImportMapMenuItem, MoorhenImportFSigFMenuItem, MoorhenBackupsMenuItem } from "./MoorhenMenuItem";
import { MenuItem } from "@mui/material";
import { convertViewtoPx, doDownload, readTextFile, getMultiColourRuleArgs } from "../utils/MoorhenUtils";
import { getBackupLabel } from "../utils/MoorhenTimeCapsule"

export const MoorhenFileMenu = (props) => {

    const { changeMolecules, changeMaps, commandCentre, glRef } = props;
    const [overlayVisible, setOverlayVisible] = useState(false)
    const [overlayContent, setOverlayContent] = useState(<></>)
    const [overlayTarget, setOverlayTarget] = useState(null)
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const [remoteSource, setRemoteSource] = useState("PDBe")
    const [isValidPdbId, setIsValidPdbId] = useState(true)
    const [showBackupsModal, setShowBackupsModal] = useState(false)
    const [backupKeys, setBackupKeys] = useState(null)
    const pdbCodeFetchInputRef = useRef(null);
    const fetchMapDataCheckRef = useRef(null);

    const menuItemProps = { setPopoverIsShown, ...props }

    const loadPdbFiles = async (files) => {
        let readPromises = []
        for (const file of files) {
            readPromises.push(readPdbFile(file))
        }
        let newMolecules = await Promise.all(readPromises)

        let drawPromises = []
        for (const newMolecule of newMolecules) {
            drawPromises.push(newMolecule.fetchIfDirtyAndDraw('CBs', glRef))
        }
        await Promise.all(drawPromises)

        changeMolecules({ action: "AddList", items: newMolecules })
        newMolecules.at(-1).centreOn(glRef, null, false)
    }

    const readPdbFile = (file) => {
        const newMolecule = new MoorhenMolecule(commandCentre, props.monomerLibraryPath)
        newMolecule.setBackgroundColour(props.backgroundColor)
        newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
        return newMolecule.loadToCootFromFile(file)
    }

    const fetchFiles = () => {
        if (remoteSource === "PDBe") {
            fetchFilesFromEBI()
        } else if (remoteSource === "PDB-REDO") {
            fetchFilesFromPDBRedo()
        } else if (remoteSource === 'AFDB') {
            fetchFilesFromAFDB()
        } else if (remoteSource === 'COD') {
            fetchFilesFromCOD()
        } else {
            console.log(`Unrecognised remote source! ${remoteSource}`)
        }
    }

    const fetchFilesFromCOD = () => {
        const entryCod = pdbCodeFetchInputRef.current.value.toLowerCase()
        const codUrl = `http://www.crystallography.net/cod/${entryCod}.cif`
        if (entryCod) {
            Promise.all([
                fetchMoleculeFromURL(codUrl, `cod-${entryCod}`),
            ])
        } else {
            console.log('Error: no COD entry')
        }
    }

    const fetchFilesFromEBI = () => {
        const pdbCode = pdbCodeFetchInputRef.current.value.toLowerCase()
        const coordUrl = `https://www.ebi.ac.uk/pdbe/entry-files/download/${pdbCode}.cif`
        const mapUrl = `https://www.ebi.ac.uk/pdbe/entry-files/${pdbCode}.ccp4`
        const diffMapUrl = `https://www.ebi.ac.uk/pdbe/entry-files/${pdbCode}_diff.ccp4`
        if (pdbCode && fetchMapDataCheckRef.current.checked) {
            Promise.all([
                fetchMoleculeFromURL(coordUrl, pdbCode),
                fetchMapFromURL(mapUrl, `${pdbCode}-map`),
                fetchMapFromURL(diffMapUrl, `${pdbCode}-map`, true)
            ])
        } else if (pdbCode) {
            fetchMoleculeFromURL(coordUrl, pdbCode)
        }
    }

    const fetchFilesFromAFDB = () => {
        const uniprotID = pdbCodeFetchInputRef.current.value.toUpperCase()
        const coordUrl = `https://alphafold.ebi.ac.uk/files/AF-${uniprotID}-F1-model_v4.pdb`
        if (uniprotID ) {
            fetchMoleculeFromURL(coordUrl, `${uniprotID}`)
                .then(newMolecule => {
                    const newRule = [{
                        commandInput: {
                            message:'coot_command',
                            command: 'add_colour_rules_multi', 
                            returnType:'status',
                            commandArgs: getMultiColourRuleArgs(newMolecule, 'af2-plddt')
                        },
                        isMultiColourRule: true,
                        ruleType: 'af2-plddt',
                        label: `//*`
                    }]
                    newMolecule.setColourRules(glRef, newRule, false)
                })
                .catch(err => console.log(err))
        }
    }

    const fetchFilesFromPDBRedo = () => {
        const pdbCode = pdbCodeFetchInputRef.current.value
        const coordUrl = `https://pdb-redo.eu/db/${pdbCode}/${pdbCode}_final.pdb`
        const mtzUrl = `https://pdb-redo.eu/db/${pdbCode}/${pdbCode}_final.mtz/`
        if (pdbCode && fetchMapDataCheckRef.current.checked) {
            Promise.all([
                fetchMoleculeFromURL(coordUrl, `${pdbCode}-redo`),
                fetchMtzFromURL(mtzUrl, `${pdbCode}-map-redo`,  {F: "FWT", PHI: "PHWT", Fobs: 'FP', SigFobs: 'SIGFP', FreeR: 'FREE', isDifference: false, useWeight: false, calcStructFact: true}),  
                fetchMtzFromURL(mtzUrl, `${pdbCode}-map-redo`,  {F: "DELFWT", PHI: "PHDELWT", isDifference: true, useWeight: false})    
            ])
        } else if (pdbCode) {
            fetchMoleculeFromURL(coordUrl, `${pdbCode}-redo`)
        }
    }

    const fetchMoleculeFromURL = (url, molName) => {
        const newMolecule = new MoorhenMolecule(commandCentre, props.monomerLibraryPath)
        newMolecule.setBackgroundColour(props.backgroundColor)
        newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
        return new Promise(async (resolve, reject) => {
            try {
                await newMolecule.loadToCootFromURL(url, molName)
                await newMolecule.fetchIfDirtyAndDraw('CBs', glRef)
                changeMolecules({ action: "Add", item: newMolecule })
                newMolecule.centreOn(glRef, null, false)
                resolve(newMolecule)
            } catch (err) {
                console.log(`Cannot fetch molecule from ${url}`)
                setIsValidPdbId(false)
                reject(err)
            }   
        })
    }

    const fetchMapFromURL = (url, mapName, isDiffMap=false) => {
        const newMap = new MoorhenMap(props.commandCentre)
        return new Promise(async () => {
            try {
                await newMap.loadToCootFromMapURL(url, mapName, isDiffMap)
                changeMaps({ action: 'Add', item: newMap })
                props.setActiveMap(newMap)
            } catch {
                console.log(`Cannot fetch map from ${url}`)
            }
        })
    }

    const fetchMtzFromURL = async (url, mapName, selectedColumns) => {
        const newMap = new MoorhenMap(props.commandCentre)
        return new Promise(async () => {
            try {
                await newMap.loadToCootFromMtzURL(url, mapName, selectedColumns)
                changeMaps({ action: 'Add', item: newMap })
                props.setActiveMap(newMap)
            } catch {
                console.log(`Cannot fetch mtz from ${url}`)
            }   
        })
    }

    const loadSessionJSON = async (sessionData) => {
        props.timeCapsuleRef.current.busy = true
        sessionData = JSON.parse(sessionData)
        
        // Delete current scene
        props.molecules.forEach(molecule => {
            molecule.delete(props.glRef)
        })
        changeMolecules({ action: "Empty" })

        props.maps.forEach(map => {
            map.delete(props.glRef)
        })
        changeMaps({ action: "Empty" })

        // Load molecules stored in session from pdb string
        const newMoleculePromises = sessionData.moleculeData.map(storedMoleculeData => {
            const newMolecule = new MoorhenMolecule(commandCentre, props.monomerLibraryPath)
            return newMolecule.loadToCootFromString(storedMoleculeData.pdbData, storedMoleculeData.name)
        })
        
        // Load maps stored in session
        const newMapPromises = sessionData.mapData.map(storedMapData => {
            const newMap = new MoorhenMap(commandCentre)
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
                            mapData, 
                            storedMapData.name, 
                            storedMapData.isDifference
                            )
                        })    
            }
        })
        
        const loadPromises = await Promise.all([...newMoleculePromises, ...newMapPromises])
        const newMolecules = loadPromises.filter(item => item.type === 'molecule')
        const newMaps = loadPromises.filter(item => item.type === 'map')

        // Draw the molecules with the styles stored in session
        let drawPromises = []
        newMolecules.forEach((molecule, moleculeIndex) => {
            const storedMoleculeData = sessionData.moleculeData[moleculeIndex]
            molecule.cootBondsOptions = storedMoleculeData.cootBondsOptions
            const styles = storedMoleculeData.displayObjectsKeys
            styles.forEach(style => drawPromises.push(molecule.fetchIfDirtyAndDraw(style, glRef)))
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
            changeMolecules({ action: "Add", item: molecule })
        })

        // Change props.maps
        newMaps.forEach(map => {
            changeMaps({ action: "Add", item: map })
        })

        // Set active map
        if (sessionData.activeMapIndex !== -1){
            props.setActiveMap(newMaps[sessionData.activeMapIndex])
        }

        // Set camera details
        glRef.current.setAmbientLightNoUpdate(...Object.values(sessionData.ambientLight))
        glRef.current.setSpecularLightNoUpdate(...Object.values(sessionData.specularLight))
        glRef.current.setDiffuseLightNoUpdate(...Object.values(sessionData.diffuseLight))
        glRef.current.setLightPositionNoUpdate(...Object.values(sessionData.lightPosition))
        glRef.current.setZoom(sessionData.zoom, false)
        glRef.current.set_fog_range(sessionData.fogStart, sessionData.fogEnd, false)
        glRef.current.set_clip_range(sessionData.clipStart, sessionData.clipEnd, false)
        glRef.current.doDrawClickedAtomLines = sessionData.doDrawClickedAtomLines
        glRef.current.atomLabelDepthMode = sessionData.atomLabelDepthMode
        glRef.current.clipCapPerfectSpheres = sessionData.clipCap
        glRef.current.background_colour = sessionData.backgroundColor
        glRef.current.setOrigin(sessionData.origin, false)
        glRef.current.setQuat(sessionData.quat4)

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
            }, true)
                
            await props.commandCentre.current.cootCommand({
                command: 'sfcalc_genmaps_using_bulk_solvent',
                commandArgs: sFcalcArgs,
                returnType: 'status'
            }, true)
                    
            const connectedMapsEvent = new CustomEvent("connectMaps", {
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
                let newMapContour = new CustomEvent("newMapContour", {
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

    const loadSession = async (file) => {
        let sessionData = await readTextFile(file)
        loadSessionJSON(sessionData)
    }

    const getSession = async () => {        
        const session = await props.timeCapsuleRef.current.fetchSession(true)
        const sessionString = JSON.stringify(session)
        doDownload([sessionString], `session.json`)
    }

    const createBackup = async () => {
        await props.timeCapsuleRef.current.updateDataFiles()
        const session = await props.timeCapsuleRef.current.fetchSession(false)
        const sessionString = JSON.stringify(session)
        const key = {
            dateTime: `${Date.now()}`,
            type: 'manual',
            molNames: session.moleculeData.map(mol => mol.name),
            mapNames: session.mapData.map(map => map.uniqueId),
            mtzNames: session.mapData.filter(map => map.hasReflectionData).map(map => map.associatedReflectionFileName)
        }
        const keyString = JSON.stringify({
            ...key,
            label: getBackupLabel(key)
        })
        return props.timeCapsuleRef.current.createBackup(keyString, sessionString)
    }

    const getBackupCards = (sortedKeys) => {
        if (sortedKeys && sortedKeys.length > 0) {
            return sortedKeys.map((key, index) => {
                return  <Card key={`${key.label}-${index}`} style={{marginTop: '0.5rem'}}>
                            <Card.Body style={{padding:'0.5rem'}}>
                                <Stack direction="horizontal" gap={2} style={{alignItems: 'center'}}>
                                    {key.label}
                                    <Button variant='primary' onClick={async () => {
                                        try {
                                            let backup = await props.timeCapsuleRef.current.retrieveBackup(JSON.stringify(key))
                                            loadSessionJSON(backup)
                                        } catch (err) {
                                            console.log(err)
                                        }                                            
                                        setShowBackupsModal(false)
                                    }}>
                                        Load
                                    </Button>
                                    <Button variant='danger' onClick={async () => {
                                        try {
                                            await props.timeCapsuleRef.current.removeBackup(JSON.stringify(key))
                                            await props.timeCapsuleRef.current.cleanupUnusedDataFiles()
                                            sortedKeys = await props.timeCapsuleRef.current.getSortedKeys()
                                            setBackupKeys(sortedKeys)
                                        } catch (err) {
                                            console.log(err)
                                        }                                         
                                    }}>
                                        Delete
                                    </Button>
                                </Stack>
                            </Card.Body>
                        </Card>
            })    
        } else {
            return <span>No backups...</span>
        }
    }

    useEffect(() => {
        async function fetchKeys() {
            const sortedKeys = await props.timeCapsuleRef.current.getSortedKeys()
            if (sortedKeys && sortedKeys.length > 0) {
                setBackupKeys(sortedKeys)
            } else {
                setBackupKeys(null)
            }
        }

        if(!showBackupsModal) {
            return
        } else {
            fetchKeys()
        }
    }, [showBackupsModal])

    return <>
        <NavDropdown
            title="File"
            id="file-nav-dropdown"
            autoClose={popoverIsShown ? false : 'outside'}
            show={props.currentDropdownId === props.dropdownId}
            style={{display:'flex', alignItems:'center'}}
            onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
                <div style={{maxHeight: convertViewtoPx(65, props.windowHeight), overflowY: 'auto'}}>
                    {!props.disableFileUploads && 
                    <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="upload-coordinates-form" className="mb-3">
                        <Form.Label>Coordinates</Form.Label>
                        <Form.Control type="file" accept=".pdb, .mmcif, .cif, .ent" multiple={true} onChange={(e) => { loadPdbFiles(e.target.files) }}/>
                    </Form.Group>
                    }
                    <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="fetch-pdbe-form" className="mb-3">
                        <Form.Label>Fetch coords from online services</Form.Label>
                        <InputGroup>
                            <SplitButton title={remoteSource} id="fetch-coords-online-source-select">
                                <Dropdown.Item key="PDBe" href="#" onClick={() => {
                                    setRemoteSource("PDBe")
                                }}>PDBe</Dropdown.Item>
                                <Dropdown.Item key="PDB-REDO" href="#" onClick={() => {
                                    setRemoteSource("PDB-REDO")
                                }}>PDB-REDO</Dropdown.Item>
                                <Dropdown.Item key="AFDB" href="#" onClick={() => {
                                    setRemoteSource("AFDB")
                                }}>AlphaFold DB</Dropdown.Item>
                                <Dropdown.Item key="COD" href="#" onClick={() => {
                                    setRemoteSource("COD")
                                }}>COD</Dropdown.Item>
                            </SplitButton>
                            <Form.Control type="text" style={{borderColor: isValidPdbId ? '' : 'red'}}  ref={pdbCodeFetchInputRef} onKeyDown={(e) => {
                                setIsValidPdbId(true)
                                if (e.code === 'Enter') {
                                    fetchFiles()
                                }
                            }}/>
                            <Button variant="light" onClick={fetchFiles}>
                                Fetch
                            </Button>
                        </InputGroup>
                        <Form.Label style={{display: isValidPdbId ? 'none' : 'block', alignContent: 'center' ,textAlign: 'center'}}>Problem fetching</Form.Label>
                        <Form.Check style={{ marginTop: '0.5rem' }} ref={fetchMapDataCheckRef} label={'fetch map data'} name={`fetchMapData`} type="checkbox" variant="outline" />
                    </Form.Group>
                    {!props.disableFileUploads && 
                    <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="upload-session-form" className="mb-3">
                        <Form.Label>Load from stored session</Form.Label>
                        <Form.Control type="file" accept=".json" multiple={false} onChange={(e) => { loadSession(e.target.files[0]) }}/>
                    </Form.Group>
                    }
                    <hr></hr>

                    {!props.disableFileUploads && 
                    <>
                        <MoorhenAssociateReflectionsToMap {...menuItemProps} />
                        <MoorhenAutoOpenMtzMenuItem {...menuItemProps} />
                        <MoorhenImportMapCoefficientsMenuItem {...menuItemProps} />
                        <MoorhenImportMapMenuItem {...menuItemProps} />
                    </>
                    }
                    
                    <MoorhenImportFSigFMenuItem {...menuItemProps} />

                    <MoorhenLoadTutorialDataMenuItem {...menuItemProps} />

                    <MenuItem id='download-session-menu-item' variant="success" onClick={getSession}>
                        Download session
                    </MenuItem>

                    <MenuItem id='save-session-menu-item' variant="success" onClick={createBackup} disabled={!props.enableTimeCapsule}>
                        Save molecule backup
                    </MenuItem>
                    
                    <MoorhenBackupsMenuItem {...menuItemProps} disabled={!props.enableTimeCapsule} setShowBackupsModal={setShowBackupsModal} loadSessionJSON={loadSessionJSON} />

                    {props.extraFileMenuItems && props.extraFileMenuItems.map( menu => menu)}
                    
                    <hr></hr>

                    <MoorhenDeleteEverythingMenuItem {...menuItemProps} />
                </div>
        </NavDropdown>



        <Overlay
            target={overlayTarget}
            show={overlayVisible}
            placement={"right"}
        >
            {({ placement, arrowProps, show: _show, popper, ...props }) => (
                <div
                    {...props}
                    style={{
                        position: 'absolute',
                        marginBottom: '0.5rem',
                        marginLeft: '1rem',
                        borderRadius: 3,
                        ...props.style,
                    }}
                >{overlayContent}
                </div>
            )}
        </Overlay>

        <Modal show={showBackupsModal} onHide={() => setShowBackupsModal(false)}>
            <Modal.Header closeButton>
                <Modal.Title>Stored molecule backups</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {getBackupCards(backupKeys)}
            </Modal.Body>
        </Modal>

    </>
}
