import { Form, Button, Modal, Card, Stack } from "react-bootstrap";
import { MoorhenMolecule } from "../utils/MoorhenMolecule";
import { MoorhenMap } from "../utils/MoorhenMap";
import { useState, useEffect } from "react";
import { MoorhenImportMapCoefficientsMenuItem, MoorhenAutoOpenMtzMenuItem, MoorhenDeleteEverythingMenuItem, 
         MoorhenLoadTutorialDataMenuItem, MoorhenImportMapMenuItem, MoorhenImportFSigFMenuItem, MoorhenUploadSessionJsonMenuItem,
         MoorhenBackupsMenuItem, MoorhenAutoOpenCoordsMenuItem, MoorhenLoadFromOnlineResourcesMenuItem } from "./MoorhenMenuItem";
import { Collapse, ListItemButton, ListItemText, MenuItem } from "@mui/material";
import { doDownload } from "../utils/MoorhenUtils";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

export const MoorhenFileMenu = (props) => {
    const { changeMolecules, changeMaps, commandCentre, glRef } = props;
    const [showBackupsModal, setShowBackupsModal] = useState(false)
    const [backupKeys, setBackupKeys] = useState(null)

    const loadSessionJSON = async (sessionData) => {
        sessionData = JSON.parse(sessionData)
        console.log('Loaded the following session data...')
        console.log(sessionData)
        
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
        let newMoleculePromises = [];
        let newMolecule;
        sessionData.moleculesPdbData.forEach((pdbData, index) => {
            newMolecule = new MoorhenMolecule(commandCentre, props.urlPrefix)
            newMoleculePromises.push(
                newMolecule.loadToCootFromString(pdbData, sessionData.moleculesNames[index])
            )
        })
        let newMolecules = await Promise.all(newMoleculePromises)

        // Draw the molecules with the styles stored in session
        let drawPromises = []
        newMolecules.forEach((molecule, moleculeIndex) => {
            molecule.cootBondsOptions = sessionData.moleculesCootBondsOptions[moleculeIndex]
            const styles = sessionData.moleculesDisplayObjectsKeys[moleculeIndex]
            styles.forEach(style => drawPromises.push(molecule.fetchIfDirtyAndDraw(style, glRef)))
        })
        await Promise.all(drawPromises)
        
        // Change props.molecules
        newMolecules.forEach(molecule => {
            changeMolecules({ action: "Add", item: molecule })
        })

        // Load maps stored in session
        let newMapPromises = [];
        sessionData.mapsMapData.forEach((decodedData, index) => {
            let mapData = Uint8Array.from(Object.values(decodedData)).buffer
            let newMap = new MoorhenMap(commandCentre)
            newMapPromises.push(
                newMap.loadToCootFromMapData(mapData, sessionData.mapsNames[index], sessionData.mapsIsDifference[index])
            )
        })
        let newMaps = await Promise.all(newMapPromises)

        // Change props.maps
        newMaps.forEach(map => {
            changeMaps({ action: "Add", item: map })
        })

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
        glRef.current.background_colour = sessionData.backgroundColor
        glRef.current.setOrigin(sessionData.origin, false)
        glRef.current.setQuat(sessionData.quat4)

        // Set map visualisation details after map card is created using a timeout
        setTimeout(() => {
            newMaps.forEach((map, index) => {
                map.mapColour = sessionData.mapColour
                let contourOnSessionLoad = new CustomEvent("contourOnSessionLoad", {
                    "detail": {
                        molNo: map.molNo,
                        mapRadius: sessionData.mapsRadius[index],
                        cootContour: sessionData.mapsCootContours[index],
                        contourLevel: sessionData.mapsContourLevels[index],
                        mapColour: sessionData.mapsColours[index],
                        litLines: sessionData.mapsLitLines[index],
                    }
                });               
                document.dispatchEvent(contourOnSessionLoad);       
            })
        }, 2500);
    }

    const getSession = async () => {
        let moleculePromises = props.molecules.map(molecule => {return molecule.getAtoms()})
        let moleculeAtoms = await Promise.all(moleculePromises)
        let mapPromises = props.maps.map(map => {return map.getMap()})
        let mapData = await Promise.all(mapPromises)

        const session = {
            moleculesNames: props.molecules.map(molecule => molecule.name),
            mapsNames: props.maps.map(map => map.name),
            moleculesPdbData: moleculeAtoms.map(item => item.data.result.pdbData),
            mapsMapData: mapData.map(item => new Uint8Array(item.data.result.mapData)),
            activeMapMolNo: props.activeMap ? props.activeMap.molNo : null,
            moleculesDisplayObjectsKeys: props.molecules.map(molecule => Object.keys(molecule.displayObjects).filter(key => molecule.displayObjects[key].length > 0)),
            moleculesCootBondsOptions: props.molecules.map(molecule => molecule.cootBondsOptions),
            mapsCootContours:  props.maps.map(map => map.cootContour),
            mapsContourLevels: props.maps.map(map => map.contourLevel),
            mapsColours: props.maps.map(map => map.mapColour),
            mapsLitLines: props.maps.map(map => map.litLines),
            mapsRadius: props.maps.map(map => map.mapRadius),
            mapsIsDifference: props.maps.map(map => map.isDifference),
            origin: props.glRef.current.origin,
            backgroundColor: props.backgroundColor,
            atomLabelDepthMode: props.atomLabelDepthMode,
            ambientLight: glRef.current.light_colours_ambient,
            diffuseLight: glRef.current.light_colours_diffuse,
            lightPosition: glRef.current.light_positions,
            specularLight: glRef.current.light_colours_specular,
            fogStart: glRef.current.gl_fog_start,
            fogEnd: glRef.current.gl_fog_end,
            zoom: glRef.current.zoom,
            doDrawClickedAtomLines: glRef.current.doDrawClickedAtomLines,
            clipStart: (glRef.current.gl_clipPlane0[3] + 500) * -1,
            clipEnd: glRef.current.gl_clipPlane1[3] - 500,
            quat4: glRef.current.myQuat
        }
        
        const sessionString = JSON.stringify(session)
        doDownload([sessionString], `session.json`)
    }

    const createBackup = async () => {
        const session = await props.timeCapsuleRef.current.fetchSession()
        const sessionString = JSON.stringify(session)
        const key = {dateTime: `${Date.now()}`, type: 'manual', name: '', molNames: session.moleculesNames}
        const keyString = JSON.stringify(key)
        return props.timeCapsuleRef.current.createBackup(keyString, sessionString)
    }

    const getBackupCards = (sortedKeys) => {
        if (sortedKeys && sortedKeys.length > 0) {
            return sortedKeys.map((item, index) => {
                return  <Card key={`${item.label}-${index}`} style={{marginTop: '0.5rem'}}>
                            <Card.Body style={{padding:'0.5rem'}}>
                                <Stack direction="horizontal" gap={2} style={{alignItems: 'center'}}>
                                    {item.label}
                                    <Button variant='primary' onClick={async () => {
                                        console.log(`Recover .... ${item.label}`)                                           
                                        try {
                                            let backup = await props.timeCapsuleRef.current.retrieveBackup(item.key)
                                            loadSessionJSON(backup)
                                        } catch (err) {
                                            console.log(err)
                                        }                                            
                                        setShowBackupsModal(false)
                                    }}>
                                        Load
                                    </Button>
                                    <Button variant='danger' onClick={async () => {
                                        console.log(`Delete .... ${item.label}`)                                           
                                        try {
                                            await props.timeCapsuleRef.current.removeBackup(item.key)
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
        <ListItemButton
            id="file-nav-dropdown"
            show={props.currentDropdownId === props.dropdownId}
            style={{display:'flex', alignItems:'center'}}
            onClick={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
            <ListItemText primary="File" />
            {props.dropdownId !== props.currentDropdownId ? <ExpandMore/> : <ExpandLess/>}
        </ListItemButton>
        <Collapse in={props.dropdownId === props.currentDropdownId} timeout="auto" unmountOnExit>
                
                <hr></hr>

                <MoorhenLoadFromOnlineResourcesMenuItem {...props}/>

                <MoorhenAutoOpenCoordsMenuItem {...props} />
                
                <MoorhenUploadSessionJsonMenuItem loadSessionJSON={loadSessionJSON} {...props}/>

                <MoorhenAutoOpenMtzMenuItem {...props} />
                    
                <MoorhenImportMapCoefficientsMenuItem {...props} />

                <MoorhenImportFSigFMenuItem {...props} />

                <MoorhenImportMapMenuItem {...props} />

                <MoorhenLoadTutorialDataMenuItem {...props} />

                <MenuItem id='download-session-menu-item' variant="success" onClick={getSession}>
                    Download session
                </MenuItem>

                <MenuItem id='save-session-menu-item' variant="success" onClick={createBackup}>
                    Save molecule backup
                </MenuItem>
                    
                <MoorhenBackupsMenuItem {...props} setShowBackupsModal={setShowBackupsModal} loadSessionJSON={loadSessionJSON} />
                    

                <MoorhenDeleteEverythingMenuItem {...props} />

                <hr></hr>
        </Collapse>

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
