import React from 'react';
import ReactDOM from 'react-dom/client';
import { MoorhenCloudApp } from './components/MoorhenCloudApp';
import { MoorhenMolecule } from "../../src/utils/MoorhenMolecule"
import { MoorhenMap } from "../../src/utils/MoorhenMap"
import { guid } from "../../src/utils/MoorhenUtils"
import { PreferencesContextProvider, getDefaultValues } from "../../src/utils/MoorhenPreferences";
import reportWebVitals from '../../src/reportWebVitals'
import localforage from 'localforage';
import parse from 'html-react-parser';
import '../src/index.css';
import '../src/App.css';

const createModule = () => {
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
    this.cachedPreferences = null
    this.cachedLegend = null
    this.noDataLegendMessage = null
    this.exportCallback = () => {}
    this.exportPreferencesCallback = () => {}
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

  setNoDataLegendMessage(htmlString) {
    try {
      this.noDataLegendMessage = parse(htmlString)
    } catch (err) {
      console.log('Unable to parse legend html string')
      console.log(err)
    }
  }

  setPreferences(preferences) {
    this.preferences = JSON.parse(preferences)
  }

  setRootId(rootId) {
    this.rootId = rootId
  }

  setInputFiles(inputFiles) {
    this.inputFiles = inputFiles.map(inputFile => {
      return {uniqueId: guid(), ...inputFile}
    })
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

  addOnChangePreferencesListener(callbackFunction) {
    this.exportPreferencesCallback = callbackFunction
  }

  onChangePreferencesListener(preferences) {
    const objectKeys = ['shortCuts', 'defaultBackgroundColor', 'defaultUpdatingScores']
    for (const key of Object.keys(this.cachedPreferences)) {
      if (key === 'version') {
        continue
      } else if (!objectKeys.includes(key) && this.cachedPreferences[key] !== preferences[key]) {
        this.exportPreferencesCallback(JSON.stringify(preferences))
        this.cachedPreferences = preferences  
        break
      } else if (objectKeys.includes(key) && JSON.stringify(this.cachedPreferences[key]) !== JSON.stringify(preferences[key])) {
        this.exportPreferencesCallback(JSON.stringify(preferences))
        this.cachedPreferences = preferences  
        break
      }
    }
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
        Object.keys(backups).map(key => 
          this.controls.timeCapsuleRef.current.storageInstance.setItem(JSON.stringify(key), backups[JSON.stringify(key)])
        )
      )
    }
  }

  async importPreferences(newPreferences) {
    const defaultPreferences = getDefaultValues()
    let preferences
    
    if (newPreferences.version === defaultPreferences.version) {
      preferences = newPreferences
    } else {
      preferences = defaultPreferences
    }

    await Promise.all(Object.keys(preferences).map(key => {
        if (key === 'shortCuts') {
          return localforage.setItem(key, JSON.stringify(preferences[key]))
        } else {
          return localforage.setItem(key, preferences[key])
        }
    }))

    this.cachedPreferences = preferences
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

  async loadMtzData(uniqueId, inputFile, mapName, selectedColumns) {
    // FIXME: Remove this when we finally get 404 from cloud
    const fetchIsOK = true
    if (!fetchIsOK) {
      console.log(`Error fetching data from url ${inputFile}`)
    } else {
      const newMap = new MoorhenMap(this.controls.commandCentre)
      newMap.litLines = this.preferences.litLines
      newMap.uniqueId = uniqueId
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

  async loadPdbData(uniqueId, inputFile, molName) {
    // FIXME: Remove this when we finally get 404 from cloud
    const fetchIsOK = true
    if (!fetchIsOK) {
      console.log(`Error fetching data from url ${inputFile}`)
    } else {
      const newMolecule = new MoorhenMolecule(this.controls.commandCentre, this.monomerLibrary)
      newMolecule.setBackgroundColour(this.controls.glRef.current.background_colour)
      newMolecule.uniqueId = uniqueId
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

  async loadLegend(url) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        const fileContents = await response.text()
        if (fileContents !== this.cachedLegend) {
          this.controls.setNotifyNewContent(true)
          const domComponent = parse(fileContents)
          this.controls.setLegendText(domComponent)
          this.cachedLegend = fileContents
          setTimeout(() => this.controls.setNotifyNewContent(false), 4000)
        }
      } else {
        console.log(`Unable to fetch legend file ${url}`)
      }
    } catch (err) {
      console.log(err)
    }
  }

  async loadInputFiles() {
    try {
      await Promise.all(
        this.inputFiles.map(file => {
          if (file.type === 'pdb') {
            return this.loadPdbData(file.uniqueId, ...file.args)
          } else if (file.type === 'mtz') {
            return this.loadMtzData(file.uniqueId, ...file.args)
          } else if (file.type === 'legend') {
            return this.loadLegend(...file.args)
          } else {
            console.log(`Unrecognised file type ${file.type}`)
            return Promise.resolve()
          }
      }))
    } catch (err) {
      console.log('Error fetching files...')
      console.log(err)
    } finally {
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
  }

  triggerSceneUpdates() {
    setTimeout(async () => {
      try {
        this.controls.setBusyFetching(true)
        await Promise.all([
          this.updateMolecules(),
          this.updateMaps(),
          this.updateLegend(),
        ])
      }
      catch (err) {
        console.log('Error fetching files...')
        console.log(err)  
      } finally {
        setTimeout(() => this.controls.setBusyFetching(false), 2000)
        this.triggerSceneUpdates()
      } 
    }, this.updateInterval)
  }

  updateLegend(){
    const legendInputFile = this.inputFiles.find(file => file.type === 'legend')
    if (typeof legendInputFile !== 'undefined') {
      return this.loadLegend(...legendInputFile.args).catch((err) => console.log(err))
    }
    return Promise.resolve()
  }

  updateMolecules() {
    const moleculeInputFiles = this.inputFiles.filter(file => file.type === 'pdb')
    moleculeInputFiles.map(inputFile => {
      const loadedMolecule = this.controls.moleculesRef.current.find(molecule => molecule.uniqueId === inputFile.uniqueId)
      if (typeof loadedMolecule === 'undefined') {
        return this.loadPdbData(inputFile.uniqueId, ...inputFile.args).catch((err) => console.log(err))
      } else {
        const oldUnitCellParams = JSON.stringify(loadedMolecule.getUnitCellParams())
        return loadedMolecule.replaceModelWithFile(this.controls.glRef, ...inputFile.args)
          .then(_ => {
            const newUnitCellParams = JSON.stringify(loadedMolecule.getUnitCellParams())
            if (oldUnitCellParams !== newUnitCellParams) {
              loadedMolecule.centreOn(this.controls.glRef, null, true)
            }   
          })
          .catch((err) => {
            console.log(err)
          })
      }
    })
  }
  
  updateMaps() {
    const mapInputFiles = this.inputFiles.filter(file => file.type === 'mtz')
    return Promise.all(mapInputFiles.map(inputFile => {
      const loadedMap = this.controls.mapsRef.current.find(map => map.uniqueId === inputFile.uniqueId)
      if (typeof loadedMap === 'undefined') {
        return this.loadMtzData(inputFile.uniqueId, ...inputFile.args).catch((err) => console.log(err))
      } else {
        return loadedMap.replaceMapWithMtzFile(this.controls.glRef, ...inputFile.args).catch((err) => console.log(err))
      }
    }))
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
              onChangePreferencesListener={this.onChangePreferencesListener.bind(this)}
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
    if (!this.preferences) {
      this.preferences = getDefaultValues()
    }
    await this.importPreferences(this.preferences)

    this.renderMoorhen()
    this.addStyleSheet()
    await this.waitForInitialisation()
    await this.controls.timeCapsuleRef.current.dropAllBackups()

    if (this.noDataLegendMessage) {
      this.controls.setLegendText(this.noDataLegendMessage)
    }

    await this.loadInputFiles()
    
    if (this.updateInterval !== null) {
      this.triggerSceneUpdates()
    }

  }
}

