import './App.css';
import { CCP4i2MoorhenContainer } from './wrapper/CCP4i2MoorhenContainer';
import { PreferencesContextProvider } from "./utils/MoorhenPreferences";
import {
  createBrowserRouter,
  RouterProvider,
  useParams,
  useLocation,
  Route,
  Link,
} from "react-router-dom";

function App() {
  return (<RouterProvider router={router} />
  );
}

const router = createBrowserRouter([
  {
    path: "/moorhen/",
    element: (
      <CCP4i2Moorhen />
    ),
  },
]);


function CCP4i2Moorhen() {
  const mySearchParams = new URLSearchParams(window.location.search.slice(1));
  const searchDict = {}
  for (const [key, value] of mySearchParams.entries()) {
    searchDict[key] = decodeURIComponent(value)
  }
  const params = useParams()
  return <div className="App">
    <PreferencesContextProvider>
      <CCP4i2MoorhenContainer {...searchDict} />
    </PreferencesContextProvider>
  </div>
}
export default App;
