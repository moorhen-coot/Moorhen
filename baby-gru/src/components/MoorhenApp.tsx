import { useRef, useState, useReducer, useContext } from 'react';
import { historyReducer, initialHistoryState } from './navbar-menus/MoorhenHistoryMenu';
import { MoorhenPreferencesInterface, PreferencesContext } from "../utils/MoorhenPreferences";
import { MoorhenContainer } from "./MoorhenContainer"
import { MoorhenMapInterface } from "../utils/MoorhenMap"
import { MoorhenMoleculeInterface } from "../utils/MoorhenMolecule"
import { MoorhenTimeCapsuleInterface } from '../utils/MoorhenTimeCapsule';
import { MoorhenCommandCentreInterface } from '../utils/MoorhenCommandCentre';
import { MoorhenControlsInterface } from "./MoorhenContainer"

export type MolChange<T extends MoorhenMoleculeInterface | MoorhenMapInterface> = {
    action: 'Add' | 'Remove' | 'AddList' | 'Empty';
    item?: T;
    items?: T[];
}

export function itemReducer<T extends MoorhenMoleculeInterface | MoorhenMapInterface> (oldList: T[], change: MolChange<T>): T[] {
    if (change.action === 'Add') {
        return [...oldList, change.item]
    }
    else if (change.action === 'Remove') {
        return oldList.filter(item =>  item.molNo !== change.item.molNo)
    }
    else if (change.action === 'AddList') {
        return oldList.concat(change.items)
    }
    else if (change.action === 'Empty') {
        return []
    }
    return oldList
}

const initialMoleculesState: MoorhenMoleculeInterface[] = []

const initialMapsState: MoorhenMapInterface[] = []

export const MoorhenApp = (props: { forwardControls: (controls: any) => any }) => {
    const glRef = useRef<null | mgWebGLType>(null)
    const timeCapsuleRef = useRef<null | MoorhenTimeCapsuleInterface>(null)
    const commandCentre = useRef<null | MoorhenCommandCentreInterface>(null)
    const moleculesRef = useRef<null | MoorhenMoleculeInterface[]>(null)
    const mapsRef = useRef<null | MoorhenMapInterface[]>(null)
    const activeMapRef = useRef<null | MoorhenMapInterface>(null)
    const consoleDivRef = useRef<null | HTMLDivElement>(null)
    const lastHoveredAtom = useRef<null | HoveredAtomType>(null)
    const prevActiveMoleculeRef = useRef<null | MoorhenMoleculeInterface>(null)
    const preferences = useContext<undefined | MoorhenPreferencesInterface>(PreferencesContext);
    const [activeMap, setActiveMap] = useState<null | MoorhenMapInterface>(null)
    const [activeMolecule, setActiveMolecule] = useState<null | MoorhenMoleculeInterface>(null)
    const [hoveredAtom, setHoveredAtom] = useState<HoveredAtomType>({ molecule: null, cid: null })
    const [consoleMessage, setConsoleMessage] = useState<string>("")
    const [cursorStyle, setCursorStyle] = useState<string>("default")
    const [busy, setBusy] = useState<boolean>(false)
    const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth)
    const [windowHeight, setWindowHeight] = useState<number>(window.innerHeight)
    const [commandHistory, dispatchHistoryReducer] = useReducer(historyReducer, initialHistoryState)
    const [molecules, changeMolecules] = useReducer(itemReducer, initialMoleculesState)
    const [maps, changeMaps] = useReducer(itemReducer, initialMapsState)
    const [backgroundColor, setBackgroundColor] = useState<[number, number, number, number]>([1, 1, 1, 1])
    const [appTitle, setAppTitle] = useState<string>('Moorhen')
    const [cootInitialized, setCootInitialized] = useState<boolean>(false)
    const [theme, setTheme] = useState<string>("flatly")
    const [showToast, setShowToast] = useState<boolean>(false)
    const [toastContent, setToastContent] = useState<null | JSX.Element>()
    const [showColourRulesToast, setShowColourRulesToast] = useState<boolean>(false)
    
    moleculesRef.current = molecules as MoorhenMoleculeInterface[]
    mapsRef.current = maps as MoorhenMapInterface[]
    activeMapRef.current = activeMap

    const collectedProps = {
        glRef, timeCapsuleRef, commandCentre, moleculesRef, mapsRef, activeMapRef,
        consoleDivRef, lastHoveredAtom, prevActiveMoleculeRef, preferences, activeMap, 
        setActiveMap, activeMolecule, setActiveMolecule, hoveredAtom, setHoveredAtom,
        consoleMessage, setConsoleMessage, cursorStyle, setCursorStyle, busy, setBusy,
        windowWidth, setWindowWidth, windowHeight, setWindowHeight, commandHistory, 
        dispatchHistoryReducer, molecules: molecules as MoorhenMoleculeInterface[], 
        changeMolecules, maps: maps as MoorhenMapInterface[], changeMaps, 
        backgroundColor, setBackgroundColor, appTitle, setAppTitle, cootInitialized,
        setCootInitialized, theme, setTheme, showToast, setShowToast, toastContent,
        setToastContent, showColourRulesToast, setShowColourRulesToast,
        forwardControls: props.forwardControls
    }

    return <MoorhenContainer {...collectedProps}/>
}

MoorhenApp.defaultProps = {
    forwardControls: (controls: MoorhenControlsInterface) => { console.log('Fetched controls', {controls}) }
}
