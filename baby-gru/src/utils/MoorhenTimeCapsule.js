import localforage from 'localforage';

const createInstance = () => {
    console.log(`Creating local storage instance for time capsule...`)
    return localforage.createInstance({
        driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
        name: "Moorhen-TimeCapsule",
        storeName: "Moorhen-TimeCapsule"
     })
}

export function MoorhenTimeCapsule() {
    this.storageInstance = createInstance()
    this.modificationCount = 0
    this.modificationCountThreshold = 5
    this.busy = false
}

MoorhenTimeCapsule.prototype.addModification = async function(molecules) {
    this.modificationCount += 1
    if (this.modificationCount >= this.modificationCountThreshold) {
        this.busy = true
        this.modificationCount = 0
        const session = await this.fetchSession(molecules)
        return this.createBackup(JSON.stringify(session))
    }
}

MoorhenTimeCapsule.prototype.createBackup = async function(value) {
    const key =`backup-${Date.now()}`
    console.log(`Creating backup ${key} in local storage...`)
    try {
         await this.storageInstance.setItem(key, value)
         console.log("Successully created backup in time capsule")
         this.busy = false
         return key
     } catch (err) {
         console.log(err)
     }
}

MoorhenTimeCapsule.prototype.retrieveBackup = async function(key) {
    console.log(`Fetching backup ${key} from local storage...`)
    try {
         return await this.storageInstance.getItem(key)
     } catch (err) {
         console.log(err)
     }
}

MoorhenTimeCapsule.prototype.removeBackup = async function(key) {
    console.log(`Removing backup ${key} from time capsule...`)
    try {
         await this.storageInstance.removeItem(key)
         console.log('Successully removed backup from time capsule')
     } catch (err) {
         console.log(err)
     }
}

MoorhenTimeCapsule.prototype.dropAllBackups = async function() {
    console.log(`Removing all backups from time capsule...`)
    try {
         await this.storageInstance.clear()
         console.log('Successully removed all backup from time capsule')
     } catch (err) {
         console.log(err)
     }
}
