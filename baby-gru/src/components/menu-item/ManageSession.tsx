import { useSnackbar } from "notistack";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useCommandCentre, useMoorhenInstance, useTimeCapsule } from "../../InstanceManager";
import { moorhensession } from "../../protobuf/MoorhenSession";
import { RootState } from "../../store/MoorhenReduxStore";
import { usePersistentState } from "../../store/menusSlice";
import { MoorhenTimeCapsule, type backupKey } from "../../utils/MoorhenTimeCapsule";
import { doDownload, guid, readDataFile } from "../../utils/utils";
import { MoorhenButton, MoorhenTextInput } from "../inputs";
import { MoorhenMenuItem, MoorhenMenuItemPopover, MoorhenStack } from "../interface-base";
import { Backups } from "./Backups";

export const ManageSession = () => {
    const commandCentre = useCommandCentre();
    const store = useStore();
    const [sessionName, setSessionName] = usePersistentState("manageSession", "uploadName", "moorhen_session", true);
    const defaultBondSmoothness = useSelector((state: RootState) => state.sceneSettings.defaultBondSmoothness);
    const maps = useSelector((state: RootState) => state.maps);
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const monomerLibraryPath = useMoorhenInstance().paths.monomerLibraryPath;
    const dispatch = useDispatch();
    const timeCapsule = useTimeCapsule();
    const { enqueueSnackbar } = useSnackbar();
    const enableTimeCapsule = useSelector((state: RootState) => state.backupSettings.enableTimeCapsule);

    const handleSessionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files)
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

    const getSession = async () => {
        const sessionData = await timeCapsule.current.fetchSession(true);
        const _sessionName = sessionName !== "" ? sessionName : "moorhen_session";
        //console.log(JSON.stringify(sessionData, null, 4))
        const sessionMessage = moorhensession.Session.fromObject(sessionData);
        const sessionBytes = moorhensession.Session.encode(sessionMessage).finish();
        doDownload([sessionBytes] as BlobPart[], `${_sessionName}.pb`);
    };

    const createBackup = async () => {
        await timeCapsule.current.updateDataFiles();
        const session = await timeCapsule.current.fetchSession(false);
        const sessionString = JSON.stringify(session);
        const key: backupKey = {
            dateTime: `${Date.now()}`,
            type: "manual",
            serNo: guid(),
            molNames: session.moleculeData.map(mol => mol.name),
            mapNames: session.mapData.map(map => map.uniqueId),
            mtzNames: session.mapData.filter(map => map.hasReflectionData).map(map => map.associatedReflectionFileName),
        };
        const keyString = JSON.stringify({
            ...key,
            label: MoorhenTimeCapsule.getBackupLabel(key),
        });
        return timeCapsule.current.createBackup(keyString, sessionString);
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
    return (
        <>
            <label htmlFor="session-file-input" className="moorhen__input__label-menu">
                Save Session File:
            </label>
            <label htmlFor="text-input-session" className="moorhen_menu-custom-left-margin">
                <MoorhenTextInput
                    text={sessionName}
                    setText={setSessionName}
                    button={true}
                    onClick={getSession}
                    icon="MatSymFileDownload"
                    style={{ width: "85%", marginLeft: "0", paddingLeft: "0" }}
                    id="text-input-session"
                />
            </label>
            <hr className="moorhen_menu-hr"></hr>
            <MoorhenMenuItem id="save-session-menu-item" onClick={createBackup} disabled={!enableTimeCapsule}>
                Save in-browser backup
            </MoorhenMenuItem>
            <MoorhenMenuItemPopover menuItemText="Load in-browser Backup">
                <Backups disabled={!enableTimeCapsule} loadSession={loadSession} />
            </MoorhenMenuItemPopover>
        </>
    );
};
