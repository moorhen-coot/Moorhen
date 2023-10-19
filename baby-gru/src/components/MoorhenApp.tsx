import { useRef, useState, useReducer } from 'react';
import { MoorhenContextProvider } from "../utils/MoorhenContext";
import { itemReducer } from '../utils/MoorhenUtils';
import { MoorhenContainer } from "./MoorhenContainer"
import { moorhen } from '../types/moorhen';
import { webGL } from '../types/mgWebGL';
import MoorhenStore from '../store/MoorhenReduxStore';
import { Provider } from 'react-redux';

const initialMoleculesState: moorhen.Molecule[] = []

const initialMapsState: moorhen.Map[] = []

export const MoorhenApp = (props: { forwardControls: (controls: any) => any }) => {
    const glRef = useRef<null | webGL.MGWebGL>(null)
    const timeCapsuleRef = useRef<null | moorhen.TimeCapsule>(null)
    const commandCentre = useRef<null | moorhen.CommandCentre>(null)
    const moleculesRef = useRef<null | moorhen.Molecule[]>(null)
    const mapsRef = useRef<null | moorhen.Map[]>(null)
    const activeMapRef = useRef<null | moorhen.Map>(null)
    const lastHoveredAtom = useRef<null | moorhen.HoveredAtom>(null)
    const prevActiveMoleculeRef = useRef<null | moorhen.Molecule>(null)
    const [activeMap, setActiveMap] = useState<null | moorhen.Map>(null)
    const [activeMolecule, setActiveMolecule] = useState<null | moorhen.Molecule>(null)
    const [hoveredAtom, setHoveredAtom] = useState<moorhen.HoveredAtom>({ molecule: null, cid: null })
    const [cursorStyle, setCursorStyle] = useState<string>("default")
    const [busy, setBusy] = useState<boolean>(false)
    const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth)
    const [windowHeight, setWindowHeight] = useState<number>(window.innerHeight)
    const [molecules, changeMolecules] = useReducer(itemReducer, initialMoleculesState)
    const [maps, changeMaps] = useReducer(itemReducer, initialMapsState)
    const [backgroundColor, setBackgroundColor] = useState<[number, number, number, number]>([1, 1, 1, 1])
    const [appTitle, setAppTitle] = useState<string>('Moorhen')
    const [cootInitialized, setCootInitialized] = useState<boolean>(false)
    const [theme, setTheme] = useState<string>("flatly")
    const [showToast, setShowToast] = useState<boolean>(false)
    const [notificationContent, setNotificationContent] = useState<null | JSX.Element>()
    
    moleculesRef.current = molecules as moorhen.Molecule[]
    mapsRef.current = maps as moorhen.Map[]
    activeMapRef.current = activeMap

    const collectedProps = {
        glRef, timeCapsuleRef, commandCentre, moleculesRef, mapsRef, activeMapRef,
         lastHoveredAtom, prevActiveMoleculeRef, activeMap, hoveredAtom, setHoveredAtom,
        setActiveMap, activeMolecule, setActiveMolecule, molecules: molecules as moorhen.Molecule[],
        cursorStyle, setCursorStyle, busy, setBusy, maps: maps as moorhen.Map[],
        windowWidth, setWindowWidth, windowHeight, setWindowHeight, appTitle, setAppTitle,
        changeMolecules, changeMaps, backgroundColor, setBackgroundColor, cootInitialized,
        setCootInitialized, theme, setTheme, showToast, setShowToast, notificationContent,
        setNotificationContent, forwardControls: props.forwardControls
    }

    return <Provider store={MoorhenStore}> 
        <MoorhenContextProvider>
                <MoorhenContainer {...collectedProps}/>
        </MoorhenContextProvider>
    </Provider>
}

MoorhenApp.defaultProps = {
    forwardControls: (controls: moorhen.Controls) => { console.log('Fetched controls', {controls}) }
}
