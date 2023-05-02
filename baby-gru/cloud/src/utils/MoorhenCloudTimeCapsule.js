import { guid } from "../../../src/utils/MoorhenUtils"

export function CloudStorageInstance() {
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

    this.exportBackupCallback = () => { }
    this.importBackupCallback = () => { }
    this.removeBackupCallback = () => { }
    this.loadBackupList = () => { return [] }
}

CloudStorageInstance.prototype.setItem = function (keyString, value) {
    const key = JSON.parse(keyString)
    
    let backup
    if (key.type === 'version') {
        backup = { serNo: 0, data: value, ...key }
    } else if (key.type === 'mtzData') {
        const jsonString = JSON.stringify(Array.from(value))
        backup = {
            serNo: key.name.replace('./', '').replace('.mtz', '-mtz'),
            data: jsonString,
            ...key
        }
    } else if (key.type === 'mapData') {
        const uintArray = new Uint8Array(value)
        const jsonString = JSON.stringify(Array.from(uintArray))
        backup = {
            serNo: key.name,
            data: jsonString,
            ...key
        }
    } else {
        backup = { serNo: guid(), data: value, ...key }
    }

    return this.exportBackupCallback(backup)
}

CloudStorageInstance.prototype.getItem = async function (keyString) {
    const key = JSON.parse(keyString)
    if (key.type === 'version') {
        const backup = await this.importBackupCallback(0)
        return backup?.data
    } else if (key.type === 'mtzData') {
        const backup = await this.importBackupCallback(key.name.replace('./', '').replace('.mtz', '-mtz'))
        const mtzData = new Uint8Array(JSON.parse(backup.data))
        return mtzData
    } else if (key.type === 'mapData') {
        const backup = await this.importBackupCallback(key.name)
        const uintArray = new Uint8Array(JSON.parse(backup.data))
        return uintArray.buffer
    } else {
        const backup = await this.importBackupCallback(key.serNo)
        return backup.data
    }
}

CloudStorageInstance.prototype.keys = async function () {
    const allKeys = await this.loadBackupList()
    return allKeys.map(key => JSON.stringify(key))
}

CloudStorageInstance.prototype.clear = async function () {
    const allKeys = await this.loadBackupList()
    await Promise.all(
        allKeys.map(key => this.removeBackupCallback(key.serNo))
    )
}

CloudStorageInstance.prototype.removeItem = function (keyString) {
    const key = JSON.parse(keyString)
    return this.removeBackupCallback(key.serNo)
}
