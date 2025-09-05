import "../inputs/MoorhenInput.css";
import { useState, useCallback } from "react";
import { useSelector, useDispatch, useStore } from "react-redux";
import { useSnackbar } from "notistack";
import { MoorhenMenuItem } from "../menu-item/MenuItem";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenFetchOnlineSourcesForm } from "../form/MoorhenFetchOnlineSourcesForm";
import { MoorhenLoadTutorialDataMenuItem } from "../menu-item/MoorhenLoadTutorialDataMenuItem";
import { MoorhenAssociateReflectionsToMap } from "../menu-item/MoorhenAssociateReflectionsToMap";
import { MoorhenAutoOpenMtzMenuItem } from "../menu-item/MoorhenAutoOpenMtzMenuItem";
import { MoorhenImportMapMenuItem } from "../menu-item/MoorhenImportMapMenuItem";
import { MoorhenImportFSigFMenuItem } from "../menu-item/MoorhenImportFSigFMenuItem";
import { MoorhenBackupsMenuItem } from "../menu-item/MoorhenBackupsMenuItem";
import { MoorhenImportMapCoefficientsMenuItem } from "../menu-item/MoorhenImportMapCoefficientsMenuItem";
import { MoorhenDeleteEverythingMenuItem } from "../menu-item/MoorhenDeleteEverythingMenuItem";
import { doDownload, guid, readDataFile } from "../../utils/utils";
import { MoorhenTimeCapsule } from "../../utils/MoorhenTimeCapsule";
import { moorhen } from "../../types/moorhen";
import { addMoleculeList } from "../../store/moleculesSlice";
import { showModal } from "../../store/modalsSlice";
import { moorhensession } from "../../protobuf/MoorhenSession";
import { modalKeys } from "../../utils/enums";
import { autoOpenFiles } from "../../utils/MoorhenFileLoading";
import { useCommandCentre, useMoorhenGlobalInstance, usePaths, useTimeCapsule } from "../../InstanceManager";

interface MoorhenFileMenuProps {
    extraFileMenuItems?: React.JSX.Element[];
}

export const MoorhenFileMenu = (props: MoorhenFileMenuProps) => {
    const dispatch = useDispatch();
    const store = useStore();
    const disableFileUploads = useSelector((state: moorhen.State) => state.generalStates.disableFileUpload);

    const [, setPopoverIsShown] = useState<boolean>(false);

    const maps = useSelector((state: moorhen.State) => state.maps);
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);
    const enableTimeCapsule = useSelector((state: moorhen.State) => state.backupSettings.enableTimeCapsule);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const devMode = useSelector((state: moorhen.State) => state.generalStates.devMode);

    const { enqueueSnackbar } = useSnackbar();
    const commandCentre = useCommandCentre();
    const timeCapsule = useTimeCapsule();
    const monomerLibraryPath = usePaths().monomerLibraryPath;
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
        const newMolecule = new MoorhenMolecule(commandCentre, store, monomerLibraryPath);
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
                    monomerLibraryPath,
                    molecules,
                    maps,
                    commandCentre,
                    timeCapsule,
                    store,
                    dispatch
                );
            } else {
                status = await MoorhenTimeCapsule.loadSessionFromProtoMessage(
                    session,
                    monomerLibraryPath,
                    molecules,
                    maps,
                    commandCentre,
                    timeCapsule,
                    store,
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
        doDownload([sessionBytes] as BlobPart[], "moorhen_session.pb");
    };

    const autoLoadHandler = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files: File[] = [];
        for (let ifile = 0; ifile < e.target.files.length; ifile++) {
            files.push(e.target.files[ifile]);
        }
        autoOpenFiles(
            files,
            commandCentre,
            store,
            monomerLibraryPath,
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

    const moorhenGlobalInstance = useMoorhenGlobalInstance();
    const videoRecorderRef = moorhenGlobalInstance.getVideoRecorderRef();
    const handleRecording = useCallback(() => {
        if (!videoRecorderRef.current) {
            console.warn("Attempted to record screen before webGL is initated...");
            return;
        } else if (videoRecorderRef.current.isRecording()) {
            console.warn("Screen recoder already recording!");
            return;
        } else {
            document.body.click();
            videoRecorderRef.current.startRecording();
            enqueueSnackbar("screen-recoder", {
                variant: "screenRecorder",
                videoRecorderRef: videoRecorderRef,
                persist: true,
            });
        }
    }, [videoRecorderRef]);
    const menuItemProps = {
        commandCentre,
        setPopoverIsShown,
    };

    return (
        <>
            <>
                <label htmlFor="upload-form" className="moorhen__input__label-menu">
                    Load files
                </label>
                <input
                    id="upload-form"
                    className="moorhen__input-files-upload"
                    type="file"
                    multiple={true}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        autoLoadHandler(e);
                    }}
                />
                <label htmlFor="coordinates-file-input" className="moorhen__input__label-menu">
                    Coordinates
                </label>
                <input
                    id="coordinates-file-input"
                    className="moorhen__input-files-upload"
                    type="file"
                    accept=".pdb, .mmcif, .cif, .ent, .mol"
                    multiple={true}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        loadPdbFiles(e.target.files);
                    }}
                />
            </>
            <MoorhenFetchOnlineSourcesForm />
            {!disableFileUploads && (
                <>
                    <label htmlFor="session-file-input" className="moorhen__input__label-menu">
                        Load from stored session
                    </label>
                    <input
                        className="moorhen__input-files-upload"
                        type="file"
                        accept=".pb,"
                        multiple={false}
                        onChange={handleSessionUpload}
                        id="session-file-input"
                    />
                </>
            )}
            <hr></hr>
            <MoorhenMenuItem
                id="query-online-services-sequence"
                onClick={() => {
                    dispatch(showModal(modalKeys.SEQ_QUERY));
                    document.body.click();
                }}
            >
                Query online services with a sequence...
            </MoorhenMenuItem>
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
            <MoorhenMenuItem id="download-session-menu-item" onClick={getSession}>
                Download session
            </MoorhenMenuItem>
            <MoorhenMenuItem id="save-session-menu-item" onClick={createBackup} disabled={!enableTimeCapsule}>
                Save backup
            </MoorhenMenuItem>
            <MoorhenBackupsMenuItem {...menuItemProps} disabled={!enableTimeCapsule} loadSession={loadSession} />
            <MoorhenMenuItem
                id="screenshot-menu-item"
                onClick={() => {
                    enqueueSnackbar("screenshot", {
                        variant: "screenshot",
                        persist: true,
                        videoRecorderRef: videoRecorderRef,
                    });
                    document.body.click();
                }}
            >
                Screenshot
            </MoorhenMenuItem>
            <MoorhenMenuItem id="export-gltf-menu-item" onClick={handleExportGltf}>
                Export scene as gltf
            </MoorhenMenuItem>
            <MoorhenMenuItem id="recording-menu-item" onClick={handleRecording}>
                Record a video
            </MoorhenMenuItem>
            {!disableFileUploads && devMode && false && (
                <MoorhenMenuItem id="load-mrbump-menu-item" onClick={handleLoadMrBump}>
                    MrBump results...
                </MoorhenMenuItem>
            )}
            {!disableFileUploads && devMode && (
                <MoorhenMenuItem id="load-mrparse-menu-item" onClick={handleLoadMrParse}>
                    MrParse results...
                </MoorhenMenuItem>
            )}
            {props.extraFileMenuItems && props.extraFileMenuItems.map((menu) => menu)}
            <hr></hr>
            <MoorhenDeleteEverythingMenuItem {...menuItemProps} />
        </>
    );
};
