import './App.css';
import { MoorhenApp } from './components/MoorhenApp';
import { PreferencesContextProvider } from "./utils/MoorhenPreferences";

function App() {
  return (
    <div className="App">
      <PreferencesContextProvider>
        <MoorhenApp forwardControls={(controls) => {
          console.log('Fetched controls', {controls})
        }}/>
      </PreferencesContextProvider>
    </div>
  );
}

export default App;
