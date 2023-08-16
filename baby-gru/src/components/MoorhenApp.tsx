import { useRef, useState, useReducer, useContext } from 'react';
import { MoorhenContext } from "../utils/MoorhenContext";
import { MoorhenContainer } from "./MoorhenContainer"
import { moorhen } from '../types/moorhen';
import { webGL } from '../types/mgWebGL';
import { itemReducer } from '../utils/MoorhenUtils';

const initialMoleculesState: moorhen.Molecule[] = []

const initialMapsState: moorhen.Map[] = []

export const MoorhenApp = (props: { forwardControls: (controls: any) => any }) => {
    const glRef = useRef<null | webGL.MGWebGL>(null)
    const timeCapsuleRef = useRef<null | moorhen.TimeCapsule>(null)
    const commandCentre = useRef<null | moorhen.CommandCentre>(null)
    const moleculesRef = useRef<null | moorhen.Molecule[]>(null)
    const mapsRef = useRef<null | moorhen.Map[]>(null)
    const activeMapRef = useRef<null | moorhen.Map>(null)
    const consoleDivRef = useRef<null | HTMLDivElement>(null)
    const lastHoveredAtom = useRef<null | moorhen.HoveredAtom>(null)
    const prevActiveMoleculeRef = useRef<null | moorhen.Molecule>(null)
    const context = useContext<undefined | moorhen.Context>(MoorhenContext);
    const [activeMap, setActiveMap] = useState<null | moorhen.Map>(null)
    const [activeMolecule, setActiveMolecule] = useState<null | moorhen.Molecule>(null)
    const [hoveredAtom, setHoveredAtom] = useState<moorhen.HoveredAtom>({ molecule: null, cid: null })
    const [consoleMessage, setConsoleMessage] = useState<string>("")
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
    const [toastContent, setToastContent] = useState<null | JSX.Element>()
    
    moleculesRef.current = molecules as moorhen.Molecule[]
    mapsRef.current = maps as moorhen.Map[]
    activeMapRef.current = activeMap

    const collectedProps = {
        glRef, timeCapsuleRef, commandCentre, moleculesRef, mapsRef, activeMapRef,
        consoleDivRef, lastHoveredAtom, prevActiveMoleculeRef, context, activeMap, 
        setActiveMap, activeMolecule, setActiveMolecule, hoveredAtom, setHoveredAtom,
        consoleMessage, setConsoleMessage, cursorStyle, setCursorStyle, busy, setBusy,
        windowWidth, setWindowWidth, windowHeight, setWindowHeight, appTitle, setAppTitle,
        changeMolecules, changeMaps, backgroundColor, setBackgroundColor, cootInitialized,
        setCootInitialized, theme, setTheme, showToast, setShowToast, toastContent,
        setToastContent, forwardControls: props.forwardControls, maps: maps as moorhen.Map[],
        molecules: molecules as moorhen.Molecule[]
    }

    return <MoorhenContainer {...collectedProps}/>
}

MoorhenApp.defaultProps = {
    forwardControls: (controls: moorhen.Controls) => { console.log('Fetched controls', {controls}) }
}
