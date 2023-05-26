import './App.css';
import { MoorhenApp } from './components/MoorhenApp';
import { PreferencesContextProvider } from "./utils/MoorhenPreferences";

let test: string
test = 5

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
