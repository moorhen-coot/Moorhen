import React from 'react';
import ReactDOM from 'react-dom/client';
import { MoorhenContainer } from '../src/components/MoorhenContainer';
import { PreferencesContextProvider, getDefaultValues } from "../src/utils/MoorhenPreferences";
import reportWebVitals from '../src/reportWebVitals'
import localforage from 'localforage';
import '../src/index.css';
import '../src/App.css';

export default class MoorhenWrapper {
  constructor(urlPrefix) {
    this.urlPrefix = urlPrefix
    this.controls = null
    this.monomerLibrary = null
    this.exportToCloudCallback = () => {}
    reportWebVitals()
  }

  async exportPreferences() {
    const defaultPreferences = getDefaultValues()                
    const fetchPromises = Object.keys(defaultPreferences).map(key => localforage.getItem(key))
    const responses = await Promise.all(fetchPromises)
    let storedPrefereneces = {}
    Object.keys(defaultPreferences).forEach((key, index) => storedPrefereneces[key] = responses[index])
    return storedPrefereneces
  }

  async importPreferences(preferences) {
    const storedVersion = await localforage.getItem('version')
    const defaultPreferences = getDefaultValues()                

    if (storedVersion === defaultPreferences.version) {
      await Promise.all(Object.keys(preferences).map(key => {
        return localforage.getItem(key, preferences[key])
      }))
    }
  }

  addOnExportListener(callbackFunction){
    this.exportToCloudCallback = callbackFunction
  }

  addMonomerLibrary(monomerLibrary){
    this.monomerLibrary = monomerLibrary
  }
  
  forwardControls(controls) {
    console.log('Fetched controls', {controls})
    this.controls = controls
  }

  waitForInitialisation() {
    const checkCootIsInitialised = resolve => {
      if (this.controls) {
        resolve()
      } else {
        setTimeout(_ => checkCootIsInitialised(resolve), 500);
      }  
    }
    return new Promise(checkCootIsInitialised);
  }

  async loadInputFiles(inputFiles) {
    let promises = []
    for (const file of inputFiles) {
      if (file.type === 'pdb') {
        promises.push(this.loadPdbData(...file.args))
      } else if (file.type === 'mtz') {
        promises.push(this.loadMtzData(...file.args))
      }
    }

    let results = await Promise.all(promises)

    setTimeout(() => {
      results.forEach((result, index) => {
        if (result?.type === 'map') {
          let contourOnSessionLoad = new CustomEvent("contourOnSessionLoad", {
            "detail": {
                molNo: result.molNo,
                mapRadius: 13,
                cootContour: true,
                contourLevel: 0.8,
                litLines: false,
            }
        });               
        document.dispatchEvent(contourOnSessionLoad);
        }
      })
    }, 2500);
  }
  
  
  renderMoorhen(rootId) {
    const rootDiv = document.getElementById(rootId)
    const root = ReactDOM.createRoot(rootDiv)
    root.render(
      <React.StrictMode>
        <div className="App">
          <PreferencesContextProvider>
            <MoorhenContainer 
              forwardControls={this.forwardControls.bind(this)}
              exportToCloudCallback={this.exportToCloudCallback.bind(this)}
              monomerLibrary={this.monomerLibrary}
              preferencesInstance={this.preferencesInstance}
              backupsInstance={this.backupsInstance}
              />
          </PreferencesContextProvider>
        </div>
      </React.StrictMode>
    );
  }
}

