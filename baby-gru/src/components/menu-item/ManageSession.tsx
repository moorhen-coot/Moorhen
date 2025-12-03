import { useSnackbar } from "notistack";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useCommandCentre, useMoorhenInstance, useTimeCapsule } from "../../InstanceManager";
import { moorhensession } from "../../protobuf/MoorhenSession";
import { RootState } from "../../store/MoorhenReduxStore";
import type { backupKey } from "../../utils/MoorhenTimeCapsule";
import { doDownload, guid, readDataFile } from "../../utils/utils";
import { MoorhenMenuItem, MoorhenMenuItemPopover } from "../interface-base";
import { Backups } from "./Backups";

export const ManageSession = () => {
    const commandCentre = useCommandCentre();
    const store = useStore();
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
        //console.log(JSON.stringify(sessionData, null, 4))
        const sessionMessage = moorhensession.Session.fromObject(sessionData);
        const sessionBytes = moorhensession.Session.encode(sessionMessage).finish();
        doDownload([sessionBytes] as BlobPart[], "moorhen_session.pb");
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
            label: timeCapsule.current.getBackupLabel(key),
        });
        return timeCapsule.current.createBackup(keyString, sessionString);
    };

    const loadSession = async (session: string | object) => {
        try {
            commandCentre.current.history.reset();
            let status = -1;
            if (typeof session === "string") {
                status = await timeCapsule.current.loadSessionFromJsonString(
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
                status = await timeCapsule.current.loadSessionFromProtoMessage(
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
                Sessions
            </label>
            {/* <input
                className="moorhen__input-files-upload"
                type="file"
                accept=".pb,"
                multiple={false}
                onChange={handleSessionUpload}
                id="session-file-input"
            /> */}
            <MoorhenMenuItem id="download-session-menu-item" onClick={getSession}>
                Download session
            </MoorhenMenuItem>
            <MoorhenMenuItem id="save-session-menu-item" onClick={createBackup} disabled={!enableTimeCapsule}>
                Save backup
            </MoorhenMenuItem>
            <MoorhenMenuItemPopover menuItemText="Load Backup">
                <Backups disabled={!enableTimeCapsule} loadSession={loadSession} />
            </MoorhenMenuItemPopover>
        </>
    );
};
