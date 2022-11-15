import logo from './logo.svg';
import './App.css';
import { BabyGruContainer } from './components/BabyGruContainer';

function App() {
  return (
    <div className="App">
      <BabyGruContainer forwardControls={(controls) => {
        console.log('Fetched controls', {controls})
      }} />
    </div>
  );
}

export default App;
