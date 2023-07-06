import { MoorhenApp } from './components/MoorhenApp';
import { MoorhenContextProvider } from "./utils/MoorhenContext";

function App() {
  return (
    <div className="App">
      <MoorhenContextProvider>
        <MoorhenApp/>
      </MoorhenContextProvider>
    </div>
  );
}

export default App;
