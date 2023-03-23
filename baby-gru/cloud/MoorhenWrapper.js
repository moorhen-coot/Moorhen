import React from 'react';
import ReactDOM from 'react-dom/client';
import { MoorhenCloudApp } from './MoorhenCloudApp';
import { MoorhenMolecule } from "../src/utils/MoorhenMolecule"
import { MoorhenMap } from "../src/utils/MoorhenMap"
import { PreferencesContextProvider, getDefaultValues } from "../src/utils/MoorhenPreferences";
import reportWebVitals from '../src/reportWebVitals'
import localforage from 'localforage';
import '../src/index.css';
import '../src/App.css';

function createModule() {
  createCCP4Module({
    print(t) { console.log(["output", t]) },
    printErr(t) { console.log(["output", t]); }
  })
  .then(function (CCP4Mod) {
    window.CCP4Module = CCP4Mod;
  })
  .catch((e) => {
    console.log("CCP4 problem :(");
    console.log(e);
  });
}

export default class MoorhenWrapper {
  constructor(urlPrefix) {
    this.urlPrefix = urlPrefix
    this.monomerLibrary = `${this.urlPrefix}/baby-gru/monomers/`
    this.controls = null
    this.updateInterval = null
    this.workMode = 'build'
    this.inputFiles = null
    this.rootId = null
    this.preferences = null
    this.exportCallback = () => {}
    reportWebVitals()
    createModule()
  }

  setWorkMode(mode='build') {
    if (['build', 'view', 'view-update'].includes(mode)) {
      this.workMode = mode
    } else {
      console.error(`Unrecognised working mode set in moorhen ${mode}`)
    } 
  }

  setPreferences(preferences) {
    this.preferences = JSON.parse(preferences)
  }

  setRootId(rootId) {
    this.rootId = rootId
  }

  setInputFiles(inputFiles) {
    this.inputFiles = inputFiles
  }

  setUpdateInterval(miliseconds) {
    this.updateInterval = miliseconds
  }

  setMonomerLibrary(uri) {
    this.monomerLibrary = uri
  }

  addOnExportListener(callbackFunction){
    this.exportCallback = callbackFunction
  }

  forwardControls(controls) {
    console.log('Fetched controls', {controls})
    this.controls = controls
  }

  async exportBackups() {
    const keys = await this.controls.timeCapsuleRef.current.storageInstance.keys()
    const responses = await Promise.all(
      keys.map(key => this.controls.timeCapsuleRef.current.storageInstance.getItem(key))
    )
    let storedBackups = {}
    keys.forEach((key, index) => storedBackups[key] = responses[index])
    return storedBackups
  }

  async importBackups(backups) {
    const storedVersion = await this.controls.timeCapsuleRef.current.storageInstance.getItem(JSON.stringify({type: 'version'}))
    const newVersion = backups[JSON.stringify({type: 'version'})]
    if (newVersion === storedVersion) {
      await this.controls.timeCapsuleRef.current.storageInstance.clear()
      await Promise.all(
        Object.keys(backups).forEach(key => 
          this.controls.timeCapsuleRef.current.storageInstance.setItem(JSON.stringify(key), backups[JSON.stringify(key)])
        )
      )
    }
  }

  async exportPreferences() {
    const defaultPreferences = getDefaultValues()                
    const responses = await Promise.all(
      Object.keys(defaultPreferences).map(key => localforage.getItem(key))
    )
    let storedPrefereneces = {}
    Object.keys(defaultPreferences).forEach((key, index) => storedPrefereneces[key] = responses[index])
    return JSON.stringify(storedPrefereneces)
  }

  async importPreferences(preferences) {
    const storedVersion = await localforage.getItem('version')
    const defaultPreferences = getDefaultValues()                

    if (storedVersion === defaultPreferences.version) {
      await Promise.all(Object.keys(preferences).map(key => {
        if (key === 'shortCuts') {
          return localforage.setItem(key, JSON.stringify(preferences[key]))
        } else {
          return localforage.setItem(key, preferences[key])
        }
      }))
    }
  }

  addStyleSheet() {
    const head = document.head;
    const style = document.createElement("link");
    style.href = `${this.urlPrefix}/moorhen.css`
    style.rel = "stylesheet";
    style.async = true
    style.type = 'text/css'
    head.appendChild(style);
  }

  async canFetchFile(url, timeout=3000) {
    const timeoutSignal = AbortSignal.timeout(timeout)
    try {
      const response = await fetch(url, {method: 'HEAD', signal: timeoutSignal})
      if (response.ok) {
        return true
      } else {
        return false
      }
    } catch (err) {
      console.log(err)
      return false
    }
}

  async loadMtzData(inputFile, mapName, selectedColumns) {
    const fetchIsOK = await this.canFetchFile(inputFile)
    if (!fetchIsOK) {
      console.log(`Error fetching data from url ${inputFile}`)
    } else {
      const newMap = new MoorhenMap(this.controls.commandCentre)
      return new Promise(async (resolve, reject) => {
        try {
          await newMap.loadToCootFromMtzURL(inputFile, mapName, selectedColumns)
          this.controls.changeMaps({ action: 'Add', item: newMap })
          this.controls.setActiveMap(newMap)
          return resolve(newMap)
        } catch (err) {
          console.log(`Cannot fetch mtz from ${inputFile}`)
          return reject(err)
        }
      })  
    }
  }

  async loadPdbData(inputFile, molName) {
    const fetchIsOK = await this.canFetchFile(inputFile)
    if (!fetchIsOK) {
      console.log(`Error fetching data from url ${inputFile}`)
    } else {
      const newMolecule = new MoorhenMolecule(this.controls.commandCentre, this.monomerLibrary)
      return new Promise(async (resolve, reject) => {
          try {
              await newMolecule.loadToCootFromURL(inputFile, molName)
              await newMolecule.fetchIfDirtyAndDraw('CBs', this.controls.glRef)
              this.controls.changeMolecules({ action: "Add", item: newMolecule })
              newMolecule.centreOn(this.controls.glRef, null, false)
              return resolve(newMolecule)
          } catch (err) {
              console.log(`Cannot fetch molecule from ${inputFile}`)
              return reject(err)
          }   
      })  
    }
  }

  async loadInputFiles() {
    await Promise.all(
      this.inputFiles.map(file => {
        if (file.type === 'pdb') {
          return this.loadPdbData(...file.args)
        } 
        return this.loadMtzData(...file.args)
    }))

    setTimeout(async () => {
      await Promise.all(
        this.controls.mapsRef.current.map(map => {
          return map.doCootContour(
            this.controls.glRef, ...this.controls.glRef.current.origin.map(coord => -coord), 13.0, 0.8
          )
        })  
      )
    }, 2500)
  }

  startMoleculeUpdates() {
    setTimeout(() => {
      this.updateMolecules().then(this.startMoleculeUpdates())
    }, this.updateInterval)
  }

  async updateMolecules() {
    const moleculeInputFiles = this.inputFiles.filter(file => file.type === 'pdb')
    if (moleculeInputFiles.length === this.controls.moleculesRef.current.length) {
      await Promise.all(
        this.controls.moleculesRef.current.map((molecule, index) => {
          return molecule.replaceModelWithFile(moleculeInputFiles[index].args[0], this.controls.glRef)
        })  
      )  
    } else {
      await Promise.all(
        moleculeInputFiles.map(file => this.loadPdbData(...file.args))
      )
    }
  }

  waitForInitialisation() {
    const checkCootIsInitialised = resolve => {
      if (this.controls) {
        resolve()
      } else {
        setTimeout(_ => checkCootIsInitialised(resolve), 500);
      }  
    }
    return new Promise(checkCootIsInitialised)
  }

  renderMoorhen() {
    const rootDiv = document.getElementById(this.rootId)
    const root = ReactDOM.createRoot(rootDiv)
    root.render(
      <React.StrictMode>
        <div className="App">
          <PreferencesContextProvider>
            <MoorhenCloudApp 
              urlPrefix={this.urlPrefix}
              forwardControls={this.forwardControls.bind(this)}
              disableFileUploads={true}
              exportCallback={this.exportCallback.bind(this)}
              monomerLibraryPath={this.monomerLibrary}
              extraMenus={[]}
              viewOnly={this.workMode === 'view'}
              />
          </PreferencesContextProvider>
        </div>
      </React.StrictMode>
    );
  }

  async start() {
    if (this.preferences) {
      await this.importPreferences(this.preferences)
    }

    this.renderMoorhen()
    this.addStyleSheet()
    await this.waitForInitialisation()
    await this.controls.timeCapsuleRef.current.dropAllBackups()
    await this.loadInputFiles()
    
    if (this.updateInterval !== null) {
      this.startMoleculeUpdates()
    }

  }
}

