import './App.css';
import { BabyGruContainer } from './components/BabyGruContainer';
import { PreferencesContextProvider } from "./utils/BabyGruPreferences";

function App() {
  return (
    <div className="App">
      <PreferencesContextProvider>
        <BabyGruContainer urlPrefix="." forwardControls={(controls) => {
          console.log('Fetched controls', {controls})
        }}/>
      </PreferencesContextProvider>
    </div>
  );
}

export default App;
