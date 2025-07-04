import { Form } from "react-bootstrap";
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
import { MenuItem } from "@mui/material";
import { convertViewtoPx, doDownload, guid, readDataFile } from "../../utils/utils";
import { MoorhenTimeCapsule } from "../../utils/MoorhenTimeCapsule"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch } from 'react-redux';
import { addMoleculeList } from "../../store/moleculesSlice";
import { showModal } from "../../store/modalsSlice";
import { moorhensession } from "../../protobuf/MoorhenSession";
import { useSnackbar } from "notistack";
import { modalKeys } from "../../utils/enums";

export const MoorhenFileMenu = (props: MoorhenNavBarExtendedControlsInterface) => {

    const dispatch = useDispatch()

    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)

    const maps = useSelector((state: moorhen.State) => state.maps)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const enableTimeCapsule = useSelector((state: moorhen.State) => state.backupSettings.enableTimeCapsule)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const devMode = useSelector((state: moorhen.State) => state.generalStates.devMode)

    const { enqueueSnackbar } = useSnackbar()

    const { commandCentre, glRef, monomerLibraryPath, setBusy, store } = props;

    const menuItemProps = { setPopoverIsShown, ...props }
    const mrBumpenuItemProps = { monomerLibraryPath, setPopoverIsShown, ...props }

    const loadPdbFiles = async (files: FileList) => {
        let readPromises: Promise<moorhen.Molecule>[] = []
        Array.from(files).forEach(file => {
            readPromises.push(readPdbFile(file))
        })

        let newMolecules: moorhen.Molecule[] = await Promise.all(readPromises)
        if (!newMolecules.every(molecule => molecule.molNo !== -1)) {
            enqueueSnackbar("Failed to read molecule", { variant: "warning" })
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
        newMolecules.at(-1).centreOn('/*/*/*/*', true)
    }

    const readPdbFile = async (file: File): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(commandCentre, glRef, store, monomerLibraryPath)
        newMolecule.setBackgroundColour(backgroundColor)
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
        await newMolecule.loadToCootFromFile(file)
        return newMolecule
    }

    const handleLoadMrBump = async () => {
        dispatch(showModal(modalKeys.MRBUMP))
        document.body.click()
    }

    const handleLoadMrParse = async () => {
        dispatch(showModal(modalKeys.MRPARSE))
        document.body.click()
    }

    const handleExportGltf = async () => {
        for (let map of maps) {
            const gltfData = await map.exportAsGltf()
            if (gltfData) {
                doDownload([gltfData], `${map.name}.glb`)
            }
        }
        for (let molecule of molecules) {
            let index = 0
            for (let representation of molecule.representations) {
                if (representation.visible) {
                    const gltfData = await representation.exportAsGltf()
                    if (gltfData) {
                        index += 1
                        doDownload([gltfData], `${molecule.name}-${index}.glb`)
                    }
                }
            }
        }
    }

    const handleSessionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const arrayBuffer = await readDataFile(e.target.files[0])
            const bytes = new Uint8Array(arrayBuffer)
            const sessionMessage = moorhensession.Session.decode(bytes,undefined,undefined)
            //console.log(JSON.stringify(sessionMessage, null, 4))
            await loadSession(sessionMessage)
        } catch (err) {
            console.log(err)
            enqueueSnackbar("Error loading the session", {variant: "error"})
        }
    }

    const loadSession = async (session: string | object) => {
        try {
            props.commandCentre.current.history.reset()
            let status = -1
            if (typeof session === 'string') {
                status = await MoorhenTimeCapsule.loadSessionFromJsonString(
                    session as string,
                    props.monomerLibraryPath,
                    molecules,
                    maps,
                    props.commandCentre,
                    props.timeCapsuleRef,
                    props.glRef,
                    store,
                    dispatch
                )
            } else {
                status = await MoorhenTimeCapsule.loadSessionFromProtoMessage(
                    session,
                    props.monomerLibraryPath,
                    molecules,
                    maps,
                    props.commandCentre,
                    props.timeCapsuleRef,
                    props.glRef,
                    store,
                    dispatch
                )
            }
            if (status === -1) {
                enqueueSnackbar("Failed to read backup (deprecated format)", {variant: "warning"})
            }
        } catch (err) {
            console.log(err)
            enqueueSnackbar("Error loading session", {variant: "warning"})
        }
    }

    const getSession = async () => {
        const sessionData = await props.timeCapsuleRef.current.fetchSession(true)
        //console.log(JSON.stringify(sessionData, null, 4))
        const sessionMessage = moorhensession.Session.fromObject(sessionData)
        const sessionBytes = moorhensession.Session.encode(sessionMessage).finish()
        doDownload([sessionBytes], 'moorhen_session.pb')
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
            label: MoorhenTimeCapsule.getBackupLabel(key)
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
            enqueueSnackbar("screen-recoder", {variant: "screenRecorder", videoRecorderRef: props.videoRecorderRef, persist: true})
        }
    }, [props.videoRecorderRef])

    return <>
                <div style={{maxHeight: convertViewtoPx(65, height), overflow: 'auto'}}>

                    {!props.disableFileUploads &&
                    <Form.Group className='moorhen-form-group' controlId="upload-coordinates-form">
                        <Form.Label>Coordinates</Form.Label>
                        <Form.Control type="file" accept=".pdb, .mmcif, .cif, .ent, .mol" multiple={true} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { loadPdbFiles(e.target.files) }}/>
                    </Form.Group>}

                    <MoorhenFetchOnlineSourcesForm commandCentre={commandCentre} glRef={glRef} setBusy={setBusy} monomerLibraryPath={monomerLibraryPath} store={store} />

                    {!props.disableFileUploads &&
                    <Form.Group className='moorhen-form-group' controlId="upload-session-form">
                        <Form.Label>Load from stored session</Form.Label>
                        <Form.Control type="file" accept=".pb," multiple={false} onChange={handleSessionUpload}/>
                    </Form.Group>}

                    <hr></hr>

                    <MenuItem id='query-online-services-sequence' onClick={() => {
                        dispatch(showModal(modalKeys.SEQ_QUERY))
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

                    <MenuItem id='screenshot-menu-item' onClick={() =>  {
                        enqueueSnackbar("screenshot", {
                            variant: "screenshot",
                            persist: true,
                            glRef: props.glRef,
                            videoRecorderRef: props.videoRecorderRef
                        })
                        document.body.click()
                    }}>
                        Screenshot
                    </MenuItem>

                    <MenuItem id='export-gltf-menu-item' onClick={handleExportGltf}>
                        Export scene as gltf
                    </MenuItem>

                    <MenuItem id='recording-menu-item' onClick={handleRecording}>
                        Record a video
                    </MenuItem>

                    {(!props.disableFileUploads && devMode && false) &&
                    <MenuItem id='load-mrbump-menu-item' onClick={handleLoadMrBump}>
                    MrBump results...
                    </MenuItem>
                    }

                    {(!props.disableFileUploads && devMode) &&
                    <MenuItem id='load-mrparse-menu-item' onClick={handleLoadMrParse}>
                    MrParse results...
                    </MenuItem>
                    }

                    {props.extraFileMenuItems && props.extraFileMenuItems.map( menu => menu)}

                    <hr></hr>

                    <MoorhenDeleteEverythingMenuItem {...menuItemProps} />
                </div>
    </>
}
