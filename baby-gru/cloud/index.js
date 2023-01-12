import React from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from '../src/reportWebVitals';
import { MoorhenContainer } from '../src/components/MoorhenContainer';
import { PreferencesContextProvider } from "../src/utils/MoorhenPreferences";
import { MoorhenMolecule } from "../src/utils/MoorhenMolecule"
import { MoorhenMap } from "../src/utils/MoorhenMap"
import '../src/index.css';
import '../src/App.css';

class MoorhenWrapper {
    constructor(urlPrefix) {
      this.urlPrefix = urlPrefix
      this.controls = null
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

    async loadPdbData(inputFile, molName) {
      const newMolecule = new MoorhenMolecule(this.controls.commandCentre, this.urlPrefix)
      return new Promise(async (resolve, reject) => {
          try {
              await newMolecule.loadToCootFromURL(inputFile, molName)
              await newMolecule.fetchIfDirtyAndDraw('CBs', this.controls.glRef)
              this.controls.changeMolecules({ action: "Add", item: newMolecule })
              newMolecule.centreOn(this.controls.glRef)
              return resolve(newMolecule)
          } catch (err) {
              console.log(`Cannot fetch molecule from ${inputFile}`)
              return reject(err)
          }   
      })
    }

    async loadMtzData(inputFile, mapName, selectedColumns) {
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
  
  renderMoorhen(rootId) {
      const root = ReactDOM.createRoot(document.getElementById(rootId));
      root.render(
        <React.StrictMode>
          <div className="App">
            <PreferencesContextProvider>
              <MoorhenContainer forwardControls={this.forwardControls.bind(this)} enableCloudMenu={true}/>
            </PreferencesContextProvider>
          </div>
        </React.StrictMode>
      );
    }
}
  
let moorhenWrapper = new MoorhenWrapper(window.moorhenInput.urlPrefix)
moorhenWrapper.renderMoorhen(window.moorhenInput.rootId);
moorhenWrapper.waitForInitialisation().then(_ => moorhenWrapper.loadInputFiles(window.moorhenInput.inputFiles))

reportWebVitals();
