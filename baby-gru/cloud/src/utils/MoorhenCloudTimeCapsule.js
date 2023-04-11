import { guid } from "../../../src/utils/MoorhenUtils"

function CloudStorageInstance() {
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
            resolve(this.BACKUPS.find(i => i.serNo === serNo)    )
        })
    }

    this.removeBackupCallback = (serNo) => {
        return new Promise((resolve, reject) => {
            console.log('REMOVE ITEM')
            console.log(serNo)
            resolve(this.BACKUPS.filter(i => i.serNo !== serNo))
        })
    }

    this.removeAllBackupsCallback = () => {
        return new Promise((resolve, reject) => {
            console.log('CLEAR ALL')
            this.BACKUPS = []
            resolve()
        })
    }

    this.loadBackupList = () => {
        return new Promise((resolve, reject) => {
            console.log('GET ALL KEYS')
            resolve(this.BACKUPS)
        })
    }
}

CloudStorageInstance.prototype.setItem = function (keyString, valueString) {
    const key = JSON.parse(keyString)
    const value = JSON.parse(valueString)
    
    if (key.type === 'version') {
        return this.exportBackupCallback({
            serNo: 0,
            ...key,
            data: value
        })
    }

    return this.exportBackupCallback({
        serNo: guid(),
        ...key,
        data: value
    })
}

CloudStorageInstance.prototype.getItem = function (keyString) {
    const key = JSON.parse(keyString)
    if (key.type === 'version') {
        return this.importBackupCallback(0)
    }
    return this.importBackupCallback(key.serNo)
}

CloudStorageInstance.prototype.keys = async function () {
    const allKeys = await this.loadBackupList()
    return allKeys.map(key => JSON.stringify(key))
}

CloudStorageInstance.prototype.clear = async function () {
    return this.removeAllBackupsCallback()
}

CloudStorageInstance.prototype.removeItem = function (keyString) {
    const key = JSON.parse(keyString)
    return this.removeBackupCallback(key.serNo)
}

export const createLocalStorageInstance = () => {
    console.log('CREATE CLOUD INSTANCEEEEE')
    return new CloudStorageInstance()
}
