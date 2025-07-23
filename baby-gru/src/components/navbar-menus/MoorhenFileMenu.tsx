import { Form } from "react-bootstrap";
import { useState, useCallback } from "react";
import { MenuItem } from "@mui/material";
import { useSelector, useDispatch } from 'react-redux';
import { useSnackbar } from "notistack";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenFetchOnlineSourcesForm } from "../form/MoorhenFetchOnlineSourcesForm"
import { MoorhenLoadTutorialDataMenuItem } from "../menu-item/MoorhenLoadTutorialDataMenuItem"
import { MoorhenAssociateReflectionsToMap } from "../menu-item/MoorhenAssociateReflectionsToMap";
import { MoorhenAutoOpenMtzMenuItem } from "../menu-item/MoorhenAutoOpenMtzMenuItem"
import { MoorhenImportMapMenuItem } from "../menu-item/MoorhenImportMapMenuItem"
import { MoorhenImportFSigFMenuItem } from "../menu-item/MoorhenImportFSigFMenuItem"
import { MoorhenBackupsMenuItem } from "../menu-item/MoorhenBackupsMenuItem"
import { MoorhenImportMapCoefficientsMenuItem } from "../menu-item/MoorhenImportMapCoefficientsMenuItem"
import { MoorhenDeleteEverythingMenuItem } from "../menu-item/MoorhenDeleteEverythingMenuItem"
import { convertViewtoPx, doDownload, guid, readDataFile } from "../../utils/utils";
import { MoorhenTimeCapsule } from "../../utils/MoorhenTimeCapsule"
import { moorhen } from "../../types/moorhen";
import { addMoleculeList } from "../../store/moleculesSlice";
import { showModal } from "../../store/modalsSlice";
import { moorhensession } from "../../protobuf/MoorhenSession";
import { modalKeys } from "../../utils/enums";
import { autoOpenFiles } from "../../utils/MoorhenFileLoading";
import { MoorhenReduxStore } from "../../moorhen";

interface MoorhenFileMenuProps {
    dropdownId: string;
}

export const MoorhenFileMenu = (props: MoorhenFileMenuProps) => {
    const dispatch = useDispatch();

    const disableFileUploads = false; /*** This is temporary add a store value to control this ***/

    const [, setPopoverIsShown] = useState<boolean>(false);

    const maps = useSelector((state: moorhen.State) => state.maps);
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);
    const enableTimeCapsule = useSelector((state: moorhen.State) => state.backupSettings.enableTimeCapsule);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const devMode = useSelector((state: moorhen.State) => state.generalStates.devMode);

    const { enqueueSnackbar } = useSnackbar();

    const commandCentre = useSelector((state: moorhen.State) => state.coreRefs.commandCentre);
    const timeCapsule = useSelector((state: moorhen.State) => state.coreRefs.timeCapsule);
    const paths = useSelector((state: moorhen.State) => state.coreRefs.paths);

    const menuItemProps = { setPopoverIsShown, ...props };
    //const mrBumpenuItemProps = { setPopoverIsShown, ...props };

    const loadPdbFiles = async (files: FileList) => {
        const readPromises: Promise<moorhen.Molecule>[] = [];
        Array.from(files).forEach((file) => {
            readPromises.push(readPdbFile(file));
        });

        let newMolecules: moorhen.Molecule[] = await Promise.all(readPromises);
        if (!newMolecules.every((molecule) => molecule.molNo !== -1)) {
            enqueueSnackbar("Failed to read molecule", { variant: "warning" });
            newMolecules = newMolecules.filter((molecule) => molecule.molNo !== -1);
            if (newMolecules.length === 0) {
                return;
            }
        }

        const drawPromises: Promise<void>[] = [];
        for (const newMolecule of newMolecules) {
            drawPromises.push(newMolecule.fetchIfDirtyAndDraw(newMolecule.atomCount >= 50000 ? "CRs" : "CBs"));
        }
        await Promise.all(drawPromises);

        dispatch(addMoleculeList(newMolecules));
        newMolecules.at(-1).centreOn("/*/*/*/*", true);
    };

    const readPdbFile = async (file: File): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(commandCentre, paths.monomerLibrary);
        newMolecule.setBackgroundColour(backgroundColor);
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness;
        await newMolecule.loadToCootFromFile(file);
        return newMolecule;
    };

    const handleLoadMrBump = async () => {
        dispatch(showModal(modalKeys.MRBUMP));
        document.body.click();
    };

    const handleLoadMrParse = async () => {
        dispatch(showModal(modalKeys.MRPARSE));
        document.body.click();
    };

    const handleExportGltf = async () => {
        for (const map of maps) {
            const gltfData = await map.exportAsGltf();
            if (gltfData) {
                doDownload([gltfData], `${map.name}.glb`);
            }
        }
        for (const molecule of molecules) {
            let index = 0;
            for (const representation of molecule.representations) {
                if (representation.visible) {
                    const gltfData = await representation.exportAsGltf();
                    if (gltfData) {
                        index += 1;
                        doDownload([gltfData], `${molecule.name}-${index}.glb`);
                    }
                }
            }
        }
    };

    const handleSessionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const arrayBuffer = await readDataFile(e.target.files[0]);
            const bytes = new Uint8Array(arrayBuffer);
            const sessionMessage = moorhensession.Session.decode(bytes, undefined, undefined);
            //console.log(JSON.stringify(sessionMessage, null, 4))
            await loadSession(sessionMessage);
        } catch (err) {
            console.log(err);
            enqueueSnackbar("Error loading the session", { variant: "error" });
        }
    };

    const loadSession = async (session: string | object) => {
        try {
            commandCentre.current.history.reset();
            let status = -1;
            if (typeof session === "string") {
                status = await MoorhenTimeCapsule.loadSessionFromJsonString(
                    session as string,
                    paths.monomerLibrary,
                    molecules,
                    maps,
                    commandCentre,
                    timeCapsule,

                    dispatch
                );
            } else {
                status = await MoorhenTimeCapsule.loadSessionFromProtoMessage(
                    session,
                    paths.monomerLibrary,
                    molecules,
                    maps,
                    commandCentre,
                    timeCapsule,
                    dispatch
                );
            }
            if (status === -1) {
                enqueueSnackbar("Failed to read backup (deprecated format)", { variant: "warning" });
            }
        } catch (err) {
            console.log(err);
            enqueueSnackbar("Error loading session", { variant: "warning" });
        }
    };

    const getSession = async () => {
        const sessionData = await timeCapsule.current.fetchSession(true);
        //console.log(JSON.stringify(sessionData, null, 4))
        const sessionMessage = moorhensession.Session.fromObject(sessionData);
        const sessionBytes = moorhensession.Session.encode(sessionMessage).finish();
        doDownload([sessionBytes], "moorhen_session.pb");
    };

    const autoLoadHandler = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const store = MoorhenReduxStore;
        const files: File[] = [];
        for (let ifile = 0; ifile < e.target.files.length; ifile++) {
            files.push(e.target.files[ifile]);
        }
        autoOpenFiles(
            files,
            commandCentre,
            store,
            paths.monomerLibrary,
            backgroundColor,
            defaultBondSmoothness,
            timeCapsule,
            dispatch
        );
    };

    const createBackup = async () => {
        await timeCapsule.current.updateDataFiles();
        const session = await timeCapsule.current.fetchSession(false);
        const sessionString = JSON.stringify(session);
        const key: moorhen.backupKey = {
            dateTime: `${Date.now()}`,
            type: "manual",
            serNo: guid(),
            molNames: session.moleculeData.map((mol) => mol.name),
            mapNames: session.mapData.map((map) => map.uniqueId),
            mtzNames: session.mapData
                .filter((map) => map.hasReflectionData)
                .map((map) => map.associatedReflectionFileName),
        };
        const keyString = JSON.stringify({
            ...key,
            label: MoorhenTimeCapsule.getBackupLabel(key),
        });
        return timeCapsule.current.createBackup(keyString, sessionString);
    };

    /*
    const handleRecording = useCallback(() => {
        if (!props.videoRecorderRef.current) {
            console.warn("Attempted to record screen before webGL is initated...");
            return;
        } else if (props.videoRecorderRef.current.isRecording()) {
            console.warn("Screen recoder already recording!");
            return;
        } else {
            document.body.click();
            props.videoRecorderRef.current.startRecording();
            enqueueSnackbar("screen-recoder", {
                variant: "screenRecorder",
                videoRecorderRef: props.videoRecorderRef,
                persist: true,
            });
        }
    }, [props.videoRecorderRef]);
    */
    return (
        <>
            <div style={{ maxHeight: convertViewtoPx(65, height), overflow: "auto" }}>
                {!disableFileUploads && (
                    <Form.Group className="moorhen-form-group" controlId="upload-coordinates-form">
                        <Form.Label>Coordinates</Form.Label>
                        <Form.Control
                            type="file"
                            accept=".pdb, .mmcif, .cif, .ent, .mol"
                            multiple={true}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                loadPdbFiles(e.target.files);
                            }}
                        />
                    </Form.Group>
                )}

                <MoorhenFetchOnlineSourcesForm commandCentre={commandCentre} />

                {!disableFileUploads && (
                    <Form.Group className="moorhen-form-group" controlId="upload-session-form">
                        <Form.Label>Load from stored session</Form.Label>
                        <Form.Control type="file" accept=".pb," multiple={false} onChange={handleSessionUpload} />
                    </Form.Group>
                )}

                <hr></hr>

                <MenuItem
                    id="query-online-services-sequence"
                    onClick={() => {
                        dispatch(showModal(modalKeys.SEQ_QUERY));
                        document.body.click();
                    }}
                >
                    Query online services with a sequence...
                </MenuItem>

                {/*
                {!disableFileUploads && (
                    <>
                        <MoorhenAssociateReflectionsToMap {...menuItemProps} />
                        <MoorhenAutoOpenMtzMenuItem {...menuItemProps} />
                        <MoorhenImportMapCoefficientsMenuItem {...menuItemProps} />
                        <MoorhenImportMapMenuItem {...menuItemProps} />
                    </>
                )}

                <MoorhenImportFSigFMenuItem {...menuItemProps} />

                <MoorhenLoadTutorialDataMenuItem {...menuItemProps} />

                <MenuItem id="download-session-menu-item" onClick={getSession}>
                    Download session
                </MenuItem>

                <MenuItem id="save-session-menu-item" onClick={createBackup} disabled={!enableTimeCapsule}>
                    Save backup
                </MenuItem>

                <MoorhenBackupsMenuItem {...menuItemProps} disabled={!enableTimeCapsule} loadSession={loadSession} />

                <MenuItem
                    id="screenshot-menu-item"
                    onClick={() => {
                        enqueueSnackbar("screenshot", {
                            variant: "screenshot",
                            persist: true,
                            glRef: props.glRef,
                            videoRecorderRef: props.videoRecorderRef,
                        });
                        document.body.click();
                    }}
                >
                    Screenshot
                </MenuItem>

                <MenuItem id="export-gltf-menu-item" onClick={handleExportGltf}>
                    Export scene as gltf
                </MenuItem>

                <MenuItem id="recording-menu-item" onClick={handleRecording}>
                    Record a video
                </MenuItem>

                {!props.disableFileUploads && devMode && false && (
                    <MenuItem id="load-mrbump-menu-item" onClick={handleLoadMrBump}>
                        MrBump results...
                    </MenuItem>
                )}

                {devMode && false && (
                    <Form.Group className="moorhen-form-group" controlId="upload-coordinates-form">
                        <Form.Label>Auto load</Form.Label>
                        <Form.Control
                            type="file"
                            multiple={true}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                autoLoadHandler(e);
                            }}
                        />
                    </Form.Group>
                )}

                {!props.disableFileUploads && devMode && (
                    <MenuItem id="load-mrparse-menu-item" onClick={handleLoadMrParse}>
                        MrParse results...
                    </MenuItem>
                )}

                {props.extraFileMenuItems && props.extraFileMenuItems.map((menu) => menu)}

                <hr></hr>

                <MoorhenDeleteEverythingMenuItem {...menuItemProps} />*/}
            </div>
        </>
    );
};
