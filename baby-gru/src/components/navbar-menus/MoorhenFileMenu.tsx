import { Form, Stack } from "react-bootstrap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { useState, useCallback } from "react";
import { MoorhenFetchOnlineSourcesForm } from "../form/MoorhenFetchOnlineSourcesForm"
import { MoorhenLoadTutorialDataMenuItem } from "../menu-item/MoorhenLoadTutorialDataMenuItem"
import { MoorhenAssociateReflectionsToMap } from "../menu-item/MoorhenAssociateReflectionsToMap";
import { MoorhenAutoOpenMtzMenuItem } from "../menu-item/MoorhenAutoOpenMtzMenuItem"
import { MoorhenImportMapMenuItem } from "../menu-item/MoorhenImportMapMenuItem"
import { MoorhenImportFSigFMenuItem } from "../menu-item/MoorhenImportFSigFMenuItem"
import { MoorhenBackupsMenuItem } from "../menu-item/MoorhenBackupsMenuItem"
import { MoorhenImportMapCoefficientsMenuItem } from "../menu-item/MoorhenImportMapCoefficientsMenuItem"
import { MoorhenDeleteEverythingMenuItem } from "../menu-item/MoorhenDeleteEverythingMenuItem"
import { IconButton, MenuItem } from "@mui/material";
import { RadioButtonCheckedOutlined, StopCircleOutlined, WarningOutlined } from "@mui/icons-material";
import { convertViewtoPx, doDownload, readTextFile, loadSessionData, guid } from "../../utils/MoorhenUtils";
import { getBackupLabel } from "../../utils/MoorhenTimeCapsule"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MoorhenNotification } from "../misc/MoorhenNotification";
import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch } from 'react-redux';
import { setNotificationContent } from "../../store/generalStatesSlice";
import { addMoleculeList } from "../../store/moleculesSlice";

export const MoorhenFileMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    
    const dispatch = useDispatch()
    const maps = useSelector((state: moorhen.State) => state.maps)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const enableTimeCapsule = useSelector((state: moorhen.State) => state.backupSettings.enableTimeCapsule)
    const height = useSelector((state: moorhen.State) => state.canvasStates.height)
    const backgroundColor = useSelector((state: moorhen.State) => state.canvasStates.backgroundColor)
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const { commandCentre, glRef, monomerLibraryPath, setBusy } = props;

    const getWarningToast = (message: string) => <MoorhenNotification key={guid()} hideDelay={3000} width={20}>
            <><WarningOutlined style={{margin: 0}}/>
                <h4 className="moorhen-warning-toast">
                    {message}
                </h4>
            <WarningOutlined style={{margin: 0}}/></>
        </MoorhenNotification>

    const menuItemProps = { setPopoverIsShown, getWarningToast, ...props }

    const loadPdbFiles = async (files: FileList) => {
        let readPromises: Promise<moorhen.Molecule>[] = []
        Array.from(files).forEach(file => {
            readPromises.push(readPdbFile(file))
        })
        
        let newMolecules: moorhen.Molecule[] = await Promise.all(readPromises)
        if (!newMolecules.every(molecule => molecule.molNo !== -1)) {
            dispatch(setNotificationContent(getWarningToast(`Failed to read molecule`)))
            newMolecules = newMolecules.filter(molecule => molecule.molNo !== -1)
            if (newMolecules.length === 0) {
                return
            }
        }

        let drawPromises: Promise<void>[] = []
        for (const newMolecule of newMolecules) {
            drawPromises.push(
                newMolecule.fetchIfDirtyAndDraw(newMolecule.atomCount >= 50000 ? 'CRs' : 'CBs')
            )
        }
        await Promise.all(drawPromises)

        dispatch( addMoleculeList(newMolecules) )
        newMolecules.at(-1).centreOn('/*/*/*/*', false)
    }

    const readPdbFile = async (file: File): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(commandCentre, glRef, monomerLibraryPath)
        newMolecule.setBackgroundColour(backgroundColor)
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
        await newMolecule.loadToCootFromFile(file)        
        return newMolecule        
    }

    const handleSessionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const sessionData = await readTextFile(e.target.files[0]) as string
            props.commandCentre.current.history.reset()
            await loadSession(sessionData) 
        } catch (err) {
            console.log(err)
            dispatch(setNotificationContent(getWarningToast("Error loading session")))
        }
    }

    const loadSession = async (sessionData: string) => {
        try {
            props.commandCentre.current.history.reset()
            const status = await loadSessionData(
                sessionData as string,
                props.monomerLibraryPath,
                molecules, 
                maps,
                props.commandCentre,
                props.timeCapsuleRef,
                props.glRef,
                dispatch
            )
            if (status === -1) {
                dispatch(setNotificationContent(getWarningToast(`Failed to read backup (deprecated format)`)))
            }
        } catch (err) {
            console.log(err)
            dispatch(setNotificationContent(getWarningToast("Error loading session")))
        }
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
        const key: moorhen.backupKey = {
            dateTime: `${Date.now()}`,
            type: 'manual',
            serNo: guid(),
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

    const handleRecording = useCallback( () => {
        if (!props.videoRecorderRef.current) {
            console.warn('Attempted to record screen before webGL is initated...')
            return
        } else if (props.videoRecorderRef.current.isRecording()) {
            console.warn('Screen recoder already recording!')
            return
        } else {
            document.body.click()
            props.videoRecorderRef.current.startRecording()
            dispatch(
                setNotificationContent(
                    <MoorhenNotification key={guid()} width={13}>
                        <Stack gap={2} direction='horizontal' style={{width: '100%', display:'flex', justifyContent: 'space-between'}}>
                            <div style={{alignItems: 'center', display: 'flex', justifyContent: 'center'}}>
                                <RadioButtonCheckedOutlined style={{color: 'red', borderRadius: '30px', borderWidth: 0, borderStyle: 'hidden'}} className="moorhen-recording-icon"/>
                                <span>Recording</span>
                            </div>
                            <IconButton onClick={() => {
                                props.videoRecorderRef.current.stopRecording()
                                dispatch( setNotificationContent(null) )
                            }}>
                                <StopCircleOutlined/>
                            </IconButton>
                        </Stack>
                    </MoorhenNotification>   
                )
            )
        }
    }, [props.videoRecorderRef])

    return <>
                <div style={{maxHeight: convertViewtoPx(65, height), overflow: 'auto'}}>
                    
                    {!props.disableFileUploads && 
                    <Form.Group className='moorhen-form-group' controlId="upload-coordinates-form">
                        <Form.Label>Coordinates</Form.Label>
                        <Form.Control type="file" accept=".pdb, .mmcif, .cif, .ent" multiple={true} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { loadPdbFiles(e.target.files) }}/>
                    </Form.Group>}
                    
                    <MoorhenFetchOnlineSourcesForm commandCentre={commandCentre} glRef={glRef} setBusy={setBusy} monomerLibraryPath={monomerLibraryPath} />
                    
                    {!props.disableFileUploads && 
                    <Form.Group className='moorhen-form-group' controlId="upload-session-form">
                        <Form.Label>Load from stored session</Form.Label>
                        <Form.Control type="file" accept=".json" multiple={false} onChange={handleSessionUpload}/>
                    </Form.Group>}
                    
                    <hr></hr>

                    <MenuItem id='query-online-services-sequence' onClick={() => {
                        props.setShowQuerySequence(true)
                        document.body.click()
                    }}>
                        Query online services with a sequence...
                    </MenuItem>

                    {!props.disableFileUploads && 
                    <>
                        <MoorhenAssociateReflectionsToMap {...menuItemProps} />
                        <MoorhenAutoOpenMtzMenuItem {...menuItemProps} />
                        <MoorhenImportMapCoefficientsMenuItem {...menuItemProps} />
                        <MoorhenImportMapMenuItem {...menuItemProps} />
                    </>}
                    
                    <MoorhenImportFSigFMenuItem {...menuItemProps} />

                    <MoorhenLoadTutorialDataMenuItem {...menuItemProps} />

                    <MenuItem id='download-session-menu-item' onClick={getSession}>
                        Download session
                    </MenuItem>

                    <MenuItem id='save-session-menu-item' onClick={createBackup} disabled={!enableTimeCapsule}>
                        Save backup
                    </MenuItem>
                    
                    <MoorhenBackupsMenuItem {...menuItemProps} disabled={!enableTimeCapsule} loadSession={loadSession} />

                    <MenuItem id='screenshot-menu-item' onClick={() => props.videoRecorderRef.current?.takeScreenShot("moorhen.png")}>
                        Screenshot
                    </MenuItem>

                    <MenuItem id='recording-menu-item' onClick={handleRecording}>
                        Record a video
                    </MenuItem>

                    {props.extraFileMenuItems && props.extraFileMenuItems.map( menu => menu)}
                    
                    <hr></hr>

                    <MoorhenDeleteEverythingMenuItem {...menuItemProps} />
                </div>
    </>
}
