import './App.css';
import { MoorhenApp } from './components/MoorhenApp';
import { PreferencesContextProvider } from "./utils/MoorhenPreferences";

function App() {
  return (
    <div className="App">
      <PreferencesContextProvider>
        <MoorhenApp/>
      </PreferencesContextProvider>
    </div>
  );
}

export default App;
