import { MoorhenTimeCapsule } from "../../../src/utils/MoorhenTimeCapsule"

function CloudStorageInstance() {
    this.exportBackupCallback = () => {}
    this.importBackupCallback = () => {}
    this.removeBackupCallback = () => {}
    this.loadBackupList = () => {}
}

CloudStorageInstance.prototype.setItem = function (key, value) {
    this.exportBackupCallback({
        name: key.name,
        serNo: key.serNo,
        data: value
    })
}

CloudStorageInstance.prototype.getItem = function (key) {
    return this.importBackupCallback(key.serNo)
}

CloudStorageInstance.prototype.keys = function () {
    return this.loadBackupList()
}

CloudStorageInstance.prototype.clear = async function () {
    const backupList = this.loadBackupList()
    return await Promise.all(backupList.map(key => this.removeItem(key.serNo)))
}

CloudStorageInstance.prototype.removeItem = function (key) {
    return this.removeBackupCallback(key.serNo)
}

export function MoorhenCloudTimeCapsule(moleculesRef, mapsRef, activeMapRef, glRef, preferences) {
    this.moleculesRef = moleculesRef
    this.mapsRef = mapsRef
    this.glRef = glRef
    this.activeMapRef = activeMapRef
    this.preferences = preferences
    this.busy = false
    this.modificationCount = 0
    this.modificationCountBackupThreshold = 5
    this.maxBackupCount = 10
    this.version = 'v7'
    this.disableBackups = false
    this.storageInstance = null
}
  
MoorhenCloudTimeCapsule.prototype = new MoorhenTimeCapsule()


MoorhenCloudTimeCapsule.prototype.init = function () {
    this.storageInstance = new CloudStorageInstance()
    this.checkVersion()
}

MoorhenCloudTimeCapsule.prototype.checkVersion = async function () {
    
}

MoorhenCloudTimeCapsule.prototype.updateDataFiles = async function () {
    //pass
}

MoorhenCloudTimeCapsule.prototype.fetchSession = async function (includeAdditionalMapData=true) {

}

MoorhenCloudTimeCapsule.prototype.addModification = async function() {

}

MoorhenCloudTimeCapsule.prototype.cleanupIfFull = async function() {

}

MoorhenCloudTimeCapsule.prototype.cleanupUnusedDataFiles = async function() {

}

MoorhenCloudTimeCapsule.prototype.createBackup = async function(key, value) {


}

MoorhenCloudTimeCapsule.prototype.retrieveBackup = async function(key) {

}

MoorhenCloudTimeCapsule.prototype.retrieveLastBackup = async function() {

}

MoorhenCloudTimeCapsule.prototype.removeBackup = async function(key) {

}

MoorhenCloudTimeCapsule.prototype.dropAllBackups = async function() {

}

MoorhenCloudTimeCapsule.prototype.getSortedKeys = async function() {

}

