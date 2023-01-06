import './App.css';
import { MoorhenContainer } from './components/MoorhenContainer';
import { PreferencesContextProvider } from "./utils/MoorhenPreferences";

function App() {
  return (
    <div className="App">
      <PreferencesContextProvider>
        <MoorhenContainer forwardControls={(controls) => {
          console.log('Fetched controls', {controls})
        }}/>
      </PreferencesContextProvider>
    </div>
  );
}

export default App;
