import type { LocalStorageInstance } from "@/InstanceManager/Preferences/MoorhenPreferences";
import type { backupKey } from "@/utils/MoorhenTimeCapsule";

/*
 * Backup storage for CCP4 Cloud (jsCoFE "webcoot" task).
 *
 * The time capsule normally keeps its backups in the browser (LocalForage). CCP4 Cloud instead stores them
 * in the job on its server, through four callbacks in its webcoot.js. This adapter gives the time capsule
 * the LocalForage-like object it expects and forwards every call to those callbacks.
 *
 * It is a port of MoorhenWrapper's CloudStorageInstance. CCP4 Cloud jobs already contain backups written
 * in this format, so the serial numbers and data encodings below must not change, or existing backups
 * could no longer be restored.
 */

/** A backup as stored by CCP4 Cloud: the time capsule key, a serial number identifying it and its serialised data */
export type CloudBackup = backupKey & { serNo: number | string; data: string };

/** The CCP4 Cloud callbacks (MoorhenWrapper's exportBackupCallback, importBackupCallback, removeBackupCallback, loadBackupList) */
export type BackupStorageCallbacks = {
    save: (backup: CloudBackup) => Promise<string | void>;
    load: (serNo: string | number) => Promise<CloudBackup | void>;
    remove: (serNo: string | number) => Promise<void>;
    list: () => Promise<CloudBackup[]>;
};

/** Serial number of reflection data: "./<uid>.mtz" is stored as "<uid>-mtz" */
const mtzSerNo = (name: string) => name.replace("./", "").replace(".mtz", "-mtz");

/**
 * Create the backup storage used by CCP4 Cloud: pass the result as the web component's `backupStorage`
 * property, before the element is appended.
 *
 * Storage format, per time capsule key type:
 * - `version`: serial number 0
 * - `mtzData`: serial number from the file name (see `mtzSerNo`), data as a JSON array of bytes
 * - `mapData`: serial number is the key name, data as a JSON array of bytes
 * - anything else (sessions): the key fields plus `data`, the serial number is the key's own `serNo`
 *
 * @example
 * el.backupStorage = createCallbackBackupStorage({ save, load, remove, list });
 */
export function createCallbackBackupStorage(callbacks: BackupStorageCallbacks): LocalStorageInstance {
    const storage = {
        setItem(keyString: string, value: string | ArrayBuffer | Uint8Array): Promise<string> {
            const key: backupKey = JSON.parse(keyString);
            let backup: CloudBackup;
            if (key.type === "version") {
                backup = { ...key, serNo: 0, data: value as string };
            } else if (key.type === "mtzData") {
                backup = { ...key, serNo: mtzSerNo(key.name), data: JSON.stringify(Array.from(value as Uint8Array)) };
            } else if (key.type === "mapData") {
                backup = { ...key, serNo: key.name, data: JSON.stringify(Array.from(new Uint8Array(value as ArrayBuffer))) };
            } else {
                backup = { data: value as string, ...key } as CloudBackup;
            }
            return callbacks.save(backup) as Promise<string>;
        },

        async getItem(keyString: string): Promise<string | Uint8Array | ArrayBuffer> {
            const key = JSON.parse(keyString);
            if (key.type === "version") {
                const backup = (await callbacks.load(0)) as CloudBackup | undefined;
                return backup?.data;
            } else if (key.type === "mtzData") {
                const backup = (await callbacks.load(mtzSerNo(key.name))) as CloudBackup;
                return new Uint8Array(JSON.parse(backup.data));
            } else if (key.type === "mapData") {
                const backup = (await callbacks.load(key.name)) as CloudBackup;
                return new Uint8Array(JSON.parse(backup.data)).buffer;
            } else {
                const backup = (await callbacks.load(key.serNo)) as CloudBackup;
                return backup.data;
            }
        },

        // Each listed backup doubles as its own key string, so getItem/removeItem receive its serNo back
        async keys(): Promise<string[]> {
            const backups = await callbacks.list();
            return backups.map(backup => JSON.stringify(backup));
        },

        async clear(): Promise<void> {
            const backups = await callbacks.list();
            await Promise.all(backups.map(backup => callbacks.remove(backup.serNo)));
        },

        removeItem(keyString: string): Promise<void> {
            const key: CloudBackup = JSON.parse(keyString);
            return callbacks.remove(key.serNo);
        },
    };
    return storage as unknown as LocalStorageInstance;
}
