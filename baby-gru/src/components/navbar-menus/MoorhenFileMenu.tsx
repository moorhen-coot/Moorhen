import { Form, Button, InputGroup, SplitButton, Dropdown, Stack } from "react-bootstrap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { useState, useRef, useCallback } from "react";
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
import { convertViewtoPx, doDownload, readTextFile, getMultiColourRuleArgs, loadSessionData, guid } from "../../utils/MoorhenUtils";
import { getBackupLabel } from "../../utils/MoorhenTimeCapsule"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MoorhenNotification } from "../misc/MoorhenNotification";
import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch, batch } from 'react-redux';
import { setActiveMap, setNotificationContent } from "../../store/generalStatesSlice";
import { addMolecule, addMoleculeList } from "../../store/moleculesSlice";
import { addMap } from "../../store/mapsSlice";

export const MoorhenFileMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const pdbCodeFetchInputRef = useRef<HTMLInputElement | null>(null);
    const fetchMapDataCheckRef = useRef<HTMLInputElement | null>(null);

    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    const [remoteSource, setRemoteSource] = useState<string>("PDBe")
    const [isValidPdbId, setIsValidPdbId] = useState<boolean>(true)
    
    const dispatch = useDispatch()
    const maps = useSelector((state: moorhen.State) => state.maps)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const enableTimeCapsule = useSelector((state: moorhen.State) => state.backupSettings.enableTimeCapsule)
    const height = useSelector((state: moorhen.State) => state.canvasStates.height)
    const backgroundColor = useSelector((state: moorhen.State) => state.canvasStates.backgroundColor)
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const { commandCentre, glRef, monomerLibraryPath } = props;

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

    const fetchFiles = (): void => {
        props.setBusy(true)
        if (remoteSource === "PDBe") {
            fetchFilesFromEBI()
        } else if (remoteSource === "PDB-REDO") {
            fetchFilesFromPDBRedo()
        } else if (remoteSource === 'AFDB') {
            fetchFilesFromAFDB()
        } else if (remoteSource === 'EMDB') {
            fetchMapFromEMDB()
        } else {
            console.log(`Unrecognised remote source! ${remoteSource}`)
        }
    }

    const fetchMapFromEMDB = () => {
        const emdbCode = pdbCodeFetchInputRef.current.value.toLowerCase()
        if (emdbCode) {
            const mapUrl = `https://ftp.ebi.ac.uk/pub/databases/emdb/structures/EMD-${emdbCode}/map/emd_${emdbCode}.map.gz`
            fetchMapFromURL(mapUrl, `${emdbCode}.map.gz`, false)
            .then(newMap => newMap.centreOnMap())
        } else {
            console.log('Error: no EMDB entry provided')
        }
    }

    const fetchFilesFromCOD = () => {
        const entryCod: string = pdbCodeFetchInputRef.current.value.toLowerCase()
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
        const uniprotID: string = pdbCodeFetchInputRef.current.value.toUpperCase()
        const coordUrl = `https://alphafold.ebi.ac.uk/files/AF-${uniprotID}-F1-model_v4.pdb`
        if (uniprotID) {
            fetchMoleculeFromURL(coordUrl, `${uniprotID}`, true)
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

    const fetchMoleculeFromURL = async (url: RequestInfo | URL, molName: string, isAF2?: boolean): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(commandCentre, glRef, monomerLibraryPath)
        newMolecule.setBackgroundColour(backgroundColor)
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
        try {
            await newMolecule.loadToCootFromURL(url, molName)
            if (newMolecule.molNo === -1) {
                throw new Error("Cannot read the fetched molecule...")
            } else if (isAF2) {
                const newRule = {
                    args: [getMultiColourRuleArgs(newMolecule, 'af2-plddt')],
                    isMultiColourRule: true,
                    ruleType: 'af2-plddt',
                    label: `//*`
                }
                newMolecule.defaultColourRules = [newRule]
            }
            await newMolecule.fetchIfDirtyAndDraw(newMolecule.atomCount >= 50000 ? 'CRs' : 'CBs')
            await newMolecule.centreOn('/*/*/*/*', true)
            dispatch( addMolecule(newMolecule) )
            return newMolecule
        } catch (err) {
            dispatch(setNotificationContent(getWarningToast(`Failed to read molecule`)))
            console.log(`Cannot fetch molecule from ${url}`)
            setIsValidPdbId(false)
            props.setBusy(false)
        }
    }

    const fetchMapFromURL = async (url: RequestInfo | URL, mapName: string, isDiffMap: boolean = false): Promise<moorhen.Map> => {
        const newMap = new MoorhenMap(commandCentre, glRef)
        try {
            await newMap.loadToCootFromMapURL(url, mapName, isDiffMap)
            if (newMap.molNo === -1) throw new Error("Cannot read the fetched map...")
            batch(() => {
                dispatch( addMap(newMap) )
                dispatch( setActiveMap(newMap) )
            })
        } catch (err) {
            console.warn(err)
            dispatch(setNotificationContent(getWarningToast(`Failed to read map`)))
            console.log(`Cannot fetch map from ${url}`)
            props.setBusy(false)
        }
        return newMap
    }

    const fetchMtzFromURL = async (url: RequestInfo | URL, mapName: string, selectedColumns: moorhen.selectedMtzColumns): Promise<moorhen.Map> => {
        const newMap = new MoorhenMap(commandCentre, glRef)
        try {
            await newMap.loadToCootFromMtzURL(url, mapName, selectedColumns)
            if (newMap.molNo === -1) throw new Error("Cannot read the fetched mtz...")
            batch(() => {
                dispatch( addMap(newMap) )
                dispatch( setActiveMap(newMap) )
            })
        } catch {
            dispatch(setNotificationContent(getWarningToast(`Failed to read mtz`)))
            console.log(`Cannot fetch mtz from ${url}`)
            props.setBusy(false)
        }
        return newMap
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
                <div style={{maxHeight: convertViewtoPx(65, height), overflowY: 'auto'}}>
                    {!props.disableFileUploads && 
                    <Form.Group className='moorhen-form-group' controlId="upload-coordinates-form">
                        <Form.Label>Coordinates</Form.Label>
                        <Form.Control type="file" accept=".pdb, .mmcif, .cif, .ent" multiple={true} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { loadPdbFiles(e.target.files) }}/>
                    </Form.Group>
                    }
                    <Form.Group className='moorhen-form-group' controlId="fetch-pdbe-form">
                        <Form.Label>Fetch coords from online services</Form.Label>
                        <InputGroup>
                            <SplitButton title={remoteSource} id="fetch-coords-online-source-select">
                                {/* @ts-ignore */}
                                <Dropdown.Item key="PDBe" href="#" onClick={() => {
                                    setRemoteSource("PDBe")
                                }}>PDBe</Dropdown.Item>
                                <Dropdown.Item key="PDB-REDO" href="#" onClick={() => {
                                    setRemoteSource("PDB-REDO")
                                }}>PDB-REDO</Dropdown.Item>
                                <Dropdown.Item key="AFDB" href="#" onClick={() => {
                                    setRemoteSource("AFDB")
                                }}>AlphaFold DB</Dropdown.Item>
                                <Dropdown.Item key="EMDB" href="#" onClick={() => {
                                    setRemoteSource("EMDB")
                                }}>EMDB</Dropdown.Item>
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
                        <Form.Check style={{ marginTop: '0.5rem' }} ref={fetchMapDataCheckRef} label={'fetch data for map'} name={`fetchMapData`} type="checkbox" />
                    </Form.Group>
                    {!props.disableFileUploads && 
                    <Form.Group className='moorhen-form-group' controlId="upload-session-form">
                        <Form.Label>Load from stored session</Form.Label>
                        <Form.Control type="file" accept=".json" multiple={false} onChange={handleSessionUpload}/>
                    </Form.Group>
                    }
                    
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
                    </>
                    }
                    
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
