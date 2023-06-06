import { LocalStorageInstanceInterface, backupKeyInterface } from "../../../src/utils/MoorhenTimeCapsule"
import { guid } from "../../../src/utils/MoorhenUtils"

export interface CloudBackupInterface extends backupKeyInterface {
    serNo: number | string;
    data: string;
}

export interface CloudStorageInstanceInterface extends Omit<LocalStorageInstanceInterface, "getItem"> {
    getItem: (arg0: string) => Promise<string | Uint8Array | ArrayBuffer>;
    setItem: (arg0: string, arg1: string | ArrayBuffer) => Promise<string>;
    exportBackupCallback: (arg0: CloudBackupInterface) => Promise<string | void>;
    importBackupCallback: (arg0: string | number) => Promise<CloudBackupInterface | void>;
    removeBackupCallback: (arg: string | number) => Promise<void>
    loadBackupList: () => Promise<CloudBackupInterface[]>
}

export class CloudStorageInstance implements CloudStorageInstanceInterface {
    exportBackupCallback: (arg0: CloudBackupInterface) => Promise<string | void>;
    importBackupCallback: (arg0: string | number) => Promise<CloudBackupInterface | void>;
    removeBackupCallback: (arg: string | number) => Promise<void>
    loadBackupList: () => Promise<CloudBackupInterface[]>

    constructor() {
        /** THIS CAN BE USED FOR TESTING PURPOSES
        
        this.BACKUPS = []
        
        this.exportBackupCallback = (obj) => {
            return new Promise((resolve, reject) => {
                console.log('SET ITEM')
                console.log(obj)
                this.BACKUPS.push(obj)
                resolve()
            })
        }
    
        this.importBackupCallback = (serNo) => {
            return new Promise((resolve, reject) => {
                console.log('GET ITEM')
                console.log(serNo)
                resolve(this.BACKUPS.find(i => i.serNo === serNo))
            })
        }
    
        this.removeBackupCallback = (serNo) => {
            return new Promise((resolve, reject) => {
                console.log('REMOVE ITEM')
                console.log(serNo)
                this.BACKUPS = this.BACKUPS.filter(i => i.serNo !== serNo)
                resolve()
            })
        }
    
        this.loadBackupList = () => {
            return new Promise((resolve, reject) => {
                console.log('GET ALL KEYS')
                resolve(this.BACKUPS)
            })
        }
    
        */
        this.exportBackupCallback = async () => { }
        this.importBackupCallback = async () => { }
        this.removeBackupCallback = async () => { }
        this.loadBackupList = async () => { return [] }
    }
    
    setItem(keyString: string, value: string | ArrayBuffer): Promise<string> {
        const key: backupKeyInterface = JSON.parse(keyString)

        let backup: CloudBackupInterface
        if (key.type === 'version') {
            backup = { serNo: 0, data: value as string, ...key }
        } else if (key.type === 'mtzData') {
            const jsonString = JSON.stringify(Array.from(value as string))
            backup = {
                serNo: key.name.replace('./', '').replace('.mtz', '-mtz'),
                data: jsonString,
                ...key
            }
        } else if (key.type === 'mapData') {
            const uintArray = new Uint8Array(value as ArrayBuffer)
            const jsonString = JSON.stringify(Array.from(uintArray))
            backup = {
                serNo: key.name,
                data: jsonString,
                ...key
            }
        } else {
            backup = { serNo: guid(), data: value as string, ...key }
        }

        return this.exportBackupCallback(backup) as Promise<string>
    }

    async getItem(keyString: string): Promise<string | Uint8Array | ArrayBuffer> {
        const key = JSON.parse(keyString)
        if (key.type === 'version') {
            const backup = await this.importBackupCallback(0) as CloudBackupInterface
            return backup?.data
        } else if (key.type === 'mtzData') {
            const backup = await this.importBackupCallback(key.name.replace('./', '').replace('.mtz', '-mtz')) as CloudBackupInterface
            const mtzData = new Uint8Array(JSON.parse(backup.data))
            return mtzData
        } else if (key.type === 'mapData') {
            const backup = await this.importBackupCallback(key.name) as CloudBackupInterface
            const uintArray = new Uint8Array(JSON.parse(backup.data))
            return uintArray.buffer
        } else {
            const backup = await this.importBackupCallback(key.serNo) as CloudBackupInterface
            return backup.data
        }
    }

    async keys(): Promise<string[]> {
        const allKeys = await this.loadBackupList()
        return allKeys.map(key => JSON.stringify(key))
    }

    async clear(): Promise<void> {
        const allKeys = await this.loadBackupList()
        await Promise.all(
            allKeys.map(key => this.removeBackupCallback(key.serNo))
        )
    }

    removeItem(keyString: string): Promise<void> {
        const key: CloudBackupInterface = JSON.parse(keyString)
        return this.removeBackupCallback(key.serNo)
    }
}






