import React from 'react';
import ReactDOM from 'react-dom/client';
import { MoorhenContainer } from '../src/components/MoorhenContainer';
import { PreferencesContextProvider } from "../src/utils/MoorhenPreferences";
import reportWebVitals from '../src/reportWebVitals'
import '../src/index.css';
import '../src/App.css';

export default class MoorhenWrapper {
  constructor(urlPrefix) {
    this.urlPrefix = urlPrefix
    this.controls = null
    reportWebVitals()
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
  
  
  renderMoorhen(rootId, exportToCloudCallback) {
    const root = ReactDOM.createRoot(document.getElementById(rootId));
    root.render(
      <React.StrictMode>
        <div className="App">
          <PreferencesContextProvider>
            <MoorhenContainer forwardControls={this.forwardControls.bind(this)} exportToCloudCallback={exportToCloudCallback}/>
          </PreferencesContextProvider>
        </div>
      </React.StrictMode>
    );
  }
}

