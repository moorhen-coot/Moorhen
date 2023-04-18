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

CloudStorageInstance.prototype.setItem = function (keyString, valueString) {
    const key = JSON.parse(keyString)
    return this.exportBackupCallback({
        serNo: key.type === 'version' ? 0 : ['mtzData', 'mapData'].includes(key.type) ? key.name.replace('./', '').replace('.mtz', '-mtz') : guid(),
        data: ['mtzData', 'mapData', 'version'].includes(key.type) ? valueString : JSON.parse(valueString),
        ...key
    })
}

CloudStorageInstance.prototype.getItem = async function (keyString) {
    const key = JSON.parse(keyString)
    if (key.type === 'version') {
        return this.importBackupCallback(0)
    } else if (['mtzData', 'mapData'].includes(key.type)) {
        const backup = await this.importBackupCallback(key.name.replace('./', '').replace('.mtz', '-mtz'))
        return backup.data
    } else {
        const backup = await this.importBackupCallback(key.serNo)
        return JSON.stringify(backup.data)
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
