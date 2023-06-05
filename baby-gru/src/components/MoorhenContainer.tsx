import React, { useEffect, useCallback, useReducer, useRef, useState, useContext } from 'react';
import { Container, Col, Row, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { MoorhenWebMG } from './webMG/MoorhenWebMG';
import { convertRemToPx, convertViewtoPx, getTooltipShortcutLabel, createLocalStorageInstance, allFontsSet } from '../utils/MoorhenUtils';
import { historyReducer, initialHistoryState } from './navbar-menus/MoorhenHistoryMenu';
import { MoorhenCommandCentre, MoorhenCommandCentreInterface } from "../utils/MoorhenCommandCentre"
import { MoorhenPreferencesInterface, PreferencesContext } from "../utils/MoorhenPreferences";
import { MoorhenTimeCapsule, MoorhenTimeCapsuleInterface } from '../utils/MoorhenTimeCapsule';
import { MoorhenButtonBar } from './button/MoorhenButtonBar';
import { Backdrop } from "@mui/material";
import { babyGruKeyPress } from '../utils/MoorhenKeyboardAccelerators';
import { MoorhenSideBar } from './list/MoorhenSideBar';
import { isDarkBackground } from '../WebGLgComponents/mgWebGL'
import { MoorhenNavBar } from "./navbar-menus/MoorhenNavBar"
import { MoorhenMoleculeInterface } from '../utils/MoorhenMolecule';
import { MoorhenMapInterface } from '../utils/MoorhenMap';
import { itemReducer, MolChange } from "./MoorhenApp"
import './MoorhenContainer.css'

const initialMoleculesState: MoorhenMoleculeInterface[] = []

const initialMapsState: MoorhenMapInterface[] = []

interface statesMapInterface {
    glRef: React.MutableRefObject<null | mgWebGLType>;
    timeCapsuleRef: React.MutableRefObject<null | MoorhenTimeCapsuleInterface>;
    commandCentre: React.MutableRefObject<MoorhenCommandCentreInterface>;
    moleculesRef: React.MutableRefObject<null | MoorhenMoleculeInterface[]>;
    mapsRef: React.MutableRefObject<null | MoorhenMapInterface[]>;
    activeMapRef: React.MutableRefObject<MoorhenMapInterface>;
    consoleDivRef: React.MutableRefObject<null | HTMLDivElement>;
    lastHoveredAtom: React.MutableRefObject<null | HoveredAtomType>;
    prevActiveMoleculeRef: React.MutableRefObject<null | MoorhenMoleculeInterface>;
    preferences: MoorhenPreferencesInterface;
    activeMap: MoorhenMapInterface;
    setActiveMap: React.Dispatch<React.SetStateAction<MoorhenMapInterface>>;
    activeMolecule: MoorhenMoleculeInterface;
    setActiveMolecule: React.Dispatch<React.SetStateAction<MoorhenMoleculeInterface>>;
    hoveredAtom: null | HoveredAtomType;
    setHoveredAtom: React.Dispatch<React.SetStateAction<HoveredAtomType>>;
    consoleMessage: string;
    setConsoleMessage: React.Dispatch<React.SetStateAction<string>>;
    cursorStyle: string;
    setCursorStyle: React.Dispatch<React.SetStateAction<string>>;
    busy: boolean;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
    windowWidth: number;
    setWindowWidth: React.Dispatch<React.SetStateAction<number>>;
    windowHeight: number;
    setWindowHeight: React.Dispatch<React.SetStateAction<number>>;
    commandHistory: any;
    dispatchHistoryReducer: (arg0: any) => void;
    molecules: MoorhenMoleculeInterface[]
    changeMolecules: (arg0: MolChange<MoorhenMoleculeInterface>) => void;
    maps: MoorhenMapInterface[];
    changeMaps: (arg0: MolChange<MoorhenMapInterface>) => void;
    backgroundColor: [number, number, number, number];
    setBackgroundColor: React.Dispatch<React.SetStateAction<[number, number, number, number]>>;
    appTitle: string;
    setAppTitle: React.Dispatch<React.SetStateAction<string>>;
    cootInitialized: boolean;
    setCootInitialized: React.Dispatch<React.SetStateAction<boolean>>;
    theme: string,
    setTheme: React.Dispatch<React.SetStateAction<string>>;
    showToast: boolean;
    setShowToast: React.Dispatch<React.SetStateAction<boolean>>;
    toastContent: null | JSX.Element;
    setToastContent: React.Dispatch<React.SetStateAction<JSX.Element>>;
    showColourRulesToast: boolean;
    setShowColourRulesToast: React.Dispatch<React.SetStateAction<boolean>>;
    availableFonts: string[];
    setAvailableFonts: React.Dispatch<React.SetStateAction<string[]>>
}

interface MoorhenContainerOptionalPropsInterface {
    disableFileUploads: boolean;
    urlPrefix: string;
    extraNavBarMenus: JSX.Element[];
    exportCallback: any;
    viewOnly: boolean;
    extraDraggableModals: JSX.Element[];
    monomerLibraryPath: string;
    forwardControls: (arg0: MoorhenControlsInterface) => any;
    extraFileMenuItems: JSX.Element[];
    allowScripting: boolean;
    backupStorageInstance: any;
    extraEditMenuItems: JSX.Element[];
    extraCalculateMenuItems: JSX.Element[];
    aceDRGInstance: any; 
}

interface MoorhenContainerPropsInterface extends Partial<statesMapInterface>, Partial<MoorhenContainerOptionalPropsInterface> { }

export interface MoorhenControlsInterface extends Partial<statesMapInterface>, Partial<MoorhenContainerOptionalPropsInterface>, MoorhenPreferencesInterface {
    isDark: boolean;
}

export const MoorhenContainer = (props: MoorhenContainerPropsInterface) => {
    const innerGlRef = useRef<null | mgWebGLType>(null)
    const innerTimeCapsuleRef = useRef<null | MoorhenTimeCapsuleInterface>(null);
    const innnerCommandCentre = useRef<null | MoorhenCommandCentreInterface>(null)
    const innerMoleculesRef = useRef<null | MoorhenMoleculeInterface[]>(null)
    const innerMapsRef = useRef<null | MoorhenMapInterface[]>(null)
    const innerActiveMapRef = useRef<null | MoorhenMapInterface>(null)
    const innerConsoleDivRef = useRef<null | HTMLDivElement>(null)
    const innerLastHoveredAtom = useRef<null | HoveredAtomType>(null)
    const innerPrevActiveMoleculeRef = useRef<null |  MoorhenMoleculeInterface>(null)
    const innerPreferences = useContext<undefined | MoorhenPreferencesInterface>(PreferencesContext);
    const [innerActiveMap, setInnerActiveMap] = useState<null | MoorhenMapInterface>(null)
    const [innerActiveMolecule, setInnerActiveMolecule] = useState<null|  MoorhenMoleculeInterface>(null)
    const [innerHoveredAtom, setInnerHoveredAtom] = useState<null | HoveredAtomType>({ molecule: null, cid: null })
    const [innerConsoleMessage, setInnerConsoleMessage] = useState<string>("")
    const [innerCursorStyle, setInnerCursorStyle] = useState<string>("default")
    const [innerBusy, setInnerBusy] = useState<boolean>(false)
    const [innerWindowWidth, setInnerWindowWidth] = useState<number>(window.innerWidth)
    const [innerWindowHeight, setInnerWindowHeight] = useState<number>(window.innerHeight)
    const [innerCommandHistory, innerDispatchHistoryReducer] = useReducer(historyReducer, initialHistoryState)
    const [innerMolecules, innerChangeMolecules] = useReducer(itemReducer, initialMoleculesState)
    const [innerMaps, innerChangeMaps] = useReducer(itemReducer, initialMapsState)
    const [innerBackgroundColor, setInnerBackgroundColor] = useState<[number, number, number, number]>([1, 1, 1, 1])
    const [innerAppTitle, setInnerAppTitle] = useState<string>('Moorhen')
    const [innerCootInitialized, setInnerCootInitialized] = useState<boolean>(false)
    const [innerTheme, setInnerTheme] = useState<string>("flatly")
    const [innerShowToast, setInnerShowToast] = useState<boolean>(false)
    const [innerToastContent, setInnerToastContent] = useState<null | JSX.Element>(null)
    const [innerShowColourRulesToast, setInnerShowColourRulesToast] = useState<boolean>(false)
    const [innerAvailableFonts, setInnerAvailableFonts] = useState<string[]>([])
    
    innerMoleculesRef.current = innerMolecules as MoorhenMoleculeInterface[]
    innerMapsRef.current = innerMaps as MoorhenMapInterface[]
    innerActiveMapRef.current = innerActiveMap

    useEffect(() => {
        const fetchAvailableFonts = async () => {
            await document.fonts.ready;
            const fontAvailable: string[] = []
            allFontsSet.forEach((font: string) => {
                if (document.fonts.check(`12px "${font}"`)) {
                    fontAvailable.push(font);
                }    
            })
            setInnerAvailableFonts(Array.from(fontAvailable))  
        }

        fetchAvailableFonts()

    }, [])

    const innerStatesMap: statesMapInterface = {
        glRef: innerGlRef, timeCapsuleRef: innerTimeCapsuleRef, commandCentre: innnerCommandCentre,
        moleculesRef: innerMoleculesRef, mapsRef: innerMapsRef, activeMapRef: innerActiveMapRef,
        consoleDivRef: innerConsoleDivRef, lastHoveredAtom: innerLastHoveredAtom, 
        prevActiveMoleculeRef: innerPrevActiveMoleculeRef, preferences: innerPreferences,
        activeMap: innerActiveMap, setActiveMap: setInnerActiveMap, activeMolecule: innerActiveMolecule,
        setActiveMolecule: setInnerActiveMolecule, hoveredAtom: innerHoveredAtom, setHoveredAtom: setInnerHoveredAtom,
        consoleMessage: innerConsoleMessage, setConsoleMessage: setInnerConsoleMessage, cursorStyle: innerCursorStyle,
        setCursorStyle: setInnerCursorStyle, busy: innerBusy, setBusy: setInnerBusy, windowHeight: innerWindowHeight, 
        windowWidth: innerWindowWidth, setWindowWidth: setInnerWindowWidth, maps: innerMaps as MoorhenMapInterface[],
        changeMaps: innerChangeMaps, setWindowHeight: setInnerWindowHeight, commandHistory: innerCommandHistory, 
        dispatchHistoryReducer: innerDispatchHistoryReducer, molecules: innerMolecules as MoorhenMoleculeInterface[],
        changeMolecules: innerChangeMolecules, backgroundColor: innerBackgroundColor, setBackgroundColor: setInnerBackgroundColor,
        appTitle: innerAppTitle, setAppTitle: setInnerAppTitle, cootInitialized: innerCootInitialized, 
        setCootInitialized: setInnerCootInitialized, theme: innerTheme, setTheme: setInnerTheme,
        showToast: innerShowToast, setShowToast: setInnerShowToast, toastContent: innerToastContent, 
        setToastContent: setInnerToastContent, showColourRulesToast: innerShowColourRulesToast, 
        setShowColourRulesToast: setInnerShowColourRulesToast, availableFonts: innerAvailableFonts,
        setAvailableFonts: setInnerAvailableFonts,
    }

    let states = {} as statesMapInterface
    Object.keys(innerStatesMap).forEach(key => {
        states[key] = props[key] ? props[key] : innerStatesMap[key]
    })

    const { glRef, timeCapsuleRef, commandCentre, moleculesRef, mapsRef, activeMapRef,
        consoleDivRef, lastHoveredAtom, prevActiveMoleculeRef, preferences, activeMap, 
        setActiveMap, activeMolecule, setActiveMolecule, hoveredAtom, setHoveredAtom,
        consoleMessage, setConsoleMessage, cursorStyle, setCursorStyle, busy, setBusy,
        windowWidth, setWindowWidth, windowHeight, setWindowHeight, commandHistory, 
        dispatchHistoryReducer, molecules, changeMolecules, maps, changeMaps,
        backgroundColor, setBackgroundColor, availableFonts, setAvailableFonts,
        appTitle, setAppTitle, cootInitialized, setCootInitialized, theme, setTheme,
        showToast, setShowToast, toastContent, setToastContent, showColourRulesToast,
        setShowColourRulesToast
    } = states

    const {
        disableFileUploads, urlPrefix, extraNavBarMenus, exportCallback, viewOnly, extraDraggableModals, 
        monomerLibraryPath, forwardControls, extraFileMenuItems, allowScripting, backupStorageInstance,
        extraEditMenuItems, aceDRGInstance, extraCalculateMenuItems
    } = props
    
    const setWindowDimensions = () => {
        setWindowWidth(window.innerWidth)
        setWindowHeight(window.innerHeight)
    }

    //The purpose here is to return the functions that define and control MoorhenContainer state to a 
    //containing React component
    useEffect(() => {
        if (cootInitialized && forwardControls) {
            forwardControls(collectedProps)
        }
    }, [cootInitialized, forwardControls])

    useEffect(() => {
        const initTimeCapsule = async () => {
            if (preferences.isMounted) {
                timeCapsuleRef.current = new MoorhenTimeCapsule(moleculesRef, mapsRef, activeMapRef, glRef, preferences)
                timeCapsuleRef.current.storageInstance = backupStorageInstance
                timeCapsuleRef.current.maxBackupCount = preferences.maxBackupCount
                timeCapsuleRef.current.modificationCountBackupThreshold = preferences.modificationCountBackupThreshold
                await timeCapsuleRef.current.init()
            }
        }
        initTimeCapsule()
    }, [preferences.isMounted])
    
    useEffect(() => {
        if (cootInitialized && preferences.isMounted) {
            const shortCut = JSON.parse(preferences.shortCuts as string).show_shortcuts
            setToastContent(
                <h4 style={{margin: 0}}>
                    {`Press ${getTooltipShortcutLabel(shortCut)} to show help`}
                </h4>
            )
        }
    }, [cootInitialized, preferences.isMounted])

    useEffect(() => {
        if (preferences.isMounted && preferences.defaultBackgroundColor !== backgroundColor) {
            setBackgroundColor(preferences.defaultBackgroundColor)
        }
        
    }, [preferences.isMounted])

    useEffect(() => {
        if (!preferences.isMounted) {
            return
        }
        
        let head = document.head;
        let style: any = document.createElement("link");
        const isDark = isDarkBackground(...backgroundColor)

        if (isDark) {
            style.href = `${urlPrefix}/baby-gru/darkly.css`
            setTheme("darkly")
        } else {
            style.href = `${urlPrefix}/baby-gru/flatly.css`
            setTheme("flatly")
        }
        
        if (preferences.defaultBackgroundColor !== backgroundColor) {
            preferences.setDefaultBackgroundColor(backgroundColor)
        }

        style.rel = "stylesheet";
        style.async = true
        style.type = 'text/css'

        head.appendChild(style);
        return () => { head.removeChild(style); }


    }, [backgroundColor])

    useEffect(() => {
        async function setMakeBackupsAPI() {
            await commandCentre.current.cootCommand({
                command: 'set_make_backups',
                commandArgs: [preferences.makeBackups],
                returnType: "status"
            })
        }

        if (commandCentre.current && preferences.makeBackups !== null && cootInitialized) {
            setMakeBackupsAPI()
        }

    }, [preferences.makeBackups, cootInitialized])

    useEffect(() => {
        async function setDrawMissingLoopAPI() {
            await commandCentre.current.cootCommand({
                command: 'set_draw_missing_residue_loops',
                commandArgs: [preferences.drawMissingLoops],
                returnType: "status"
            })
        }

        if (commandCentre.current && preferences.drawMissingLoops !== null && cootInitialized) {
            setDrawMissingLoopAPI()
        }

    }, [preferences.drawMissingLoops, cootInitialized])

    useEffect(() => {
        commandCentre.current = new MoorhenCommandCentre({
            onConsoleChanged: (newMessage) => {
                setConsoleMessage(newMessage)
            },
            onActiveMessagesChanged: (newActiveMessages) => {
                setBusy(newActiveMessages.length !== 0)
            },
            onNewCommand: (newCommand) => {
                dispatchHistoryReducer({ action: "Add", item: newCommand })
            },
            onCootInitialized: () => {
                setCootInitialized(true)
            },
            urlPrefix: urlPrefix
        })
        window.addEventListener('resize', setWindowDimensions)
        return () => {
            window.removeEventListener('resize', setWindowDimensions)
            commandCentre.current.unhook()
        }
    }, [])

    useEffect(() => {
        if(consoleDivRef.current !== null) {
            consoleDivRef.current.scrollTop = consoleDivRef.current.scrollHeight;
        }
    }, [consoleMessage])

    const onAtomHovered = useCallback((identifier: { buffer: { id: string; }; atom: { label: string; }; }) => {
        if (identifier == null) {
            if (lastHoveredAtom.current !== null && lastHoveredAtom.current.molecule !== null) {
                setHoveredAtom({ molecule: null, cid: null })
            }
        }
        else {
            molecules.forEach(molecule => {
                if (molecule.buffersInclude(identifier.buffer)) {
                    if (molecule !== hoveredAtom.molecule || identifier.atom.label !== hoveredAtom.cid) {
                        setHoveredAtom({ molecule: molecule, cid: identifier.atom.label })
                    }
                }
            })
        }
    }, [molecules])

    useEffect(() => {
        if (toastContent) setShowToast(true)
    }, [toastContent])

    //Make this so that the keyPress returns true or false, depending on whether mgWebGL is to continue processing event
    const onKeyPress = useCallback((event: KeyboardEvent) => {
        return babyGruKeyPress(event, collectedProps, JSON.parse(preferences.shortCuts as string))
    }, [molecules, activeMolecule, activeMap, hoveredAtom, viewOnly, preferences])

    useEffect(() => {
        if (hoveredAtom && hoveredAtom.molecule && hoveredAtom.cid) {
            if (lastHoveredAtom.current == null ||
                hoveredAtom.molecule !== lastHoveredAtom.current.molecule ||
                hoveredAtom.cid !== lastHoveredAtom.current.cid
            ) {
                hoveredAtom.molecule.drawHover(glRef, hoveredAtom.cid)
                //if we have changed molecule, might have to clean up hover display item of previous molecule
            }
        }

        if (lastHoveredAtom.current !== null &&
            lastHoveredAtom.current.molecule !== null &&
            lastHoveredAtom.current.molecule !== hoveredAtom.molecule
        ) {
            lastHoveredAtom.current.molecule.clearBuffersOfStyle("hover", glRef)
        }

        lastHoveredAtom.current = hoveredAtom
    }, [hoveredAtom])

    useEffect(() => {
        glResize()
    }, [windowHeight, windowWidth])

    useEffect(() => {
        if (activeMap && commandCentre.current) {
            commandCentre.current.cootCommand({
                returnType: "status",
                command: "set_imol_refinement_map",
                commandArgs: [activeMap.molNo]
            })
        }
    }, [activeMap])

    useEffect(() => {
        function resetActiveGL() {
            prevActiveMoleculeRef.current = activeMolecule;
            if (activeMolecule)
                glRef.current.setActiveMolecule(activeMolecule)
            else
                glRef.current.setActiveMolecule(null)
        }
        if (prevActiveMoleculeRef.current) {
            prevActiveMoleculeRef.current.applyTransform(glRef).then(() => resetActiveGL())
        } else {
            resetActiveGL()
        }
    }, [activeMolecule])

    const glResize = () => {
        glRef.current.resize(webGLWidth(), webGLHeight())
        glRef.current.drawScene()
    }

    const webGLWidth = () => {
        return windowWidth
    }

    const webGLHeight = () => {
        return windowHeight - (viewOnly ? 0: convertRemToPx(2.2))
    }

    const isDark = isDarkBackground(...backgroundColor)

    const collectedProps: MoorhenControlsInterface = {
        molecules, changeMolecules, appTitle, setAppTitle, maps, changeMaps, glRef, activeMolecule, setActiveMolecule,
        activeMap, setActiveMap, commandHistory, commandCentre, backgroundColor, setBackgroundColor, toastContent, 
        setToastContent, hoveredAtom, setHoveredAtom, showToast, setShowToast, windowWidth, windowHeight, showColourRulesToast,
        timeCapsuleRef, setShowColourRulesToast, isDark, exportCallback, disableFileUploads, urlPrefix, viewOnly,
        extraNavBarMenus, monomerLibraryPath, moleculesRef, extraFileMenuItems, mapsRef, allowScripting, extraCalculateMenuItems,
        extraEditMenuItems, extraDraggableModals, aceDRGInstance, availableFonts, ...preferences
    }

    return <> 
    <div>
        <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={!cootInitialized}>
            <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
            <span>Starting moorhen...</span>
        </Backdrop>
        
        {!viewOnly && <MoorhenNavBar {...collectedProps} busy={busy}/>}
        
    </div>
    
    <Container fluid className={`baby-gru ${theme}`}>
        <Row>
            <Col style={{ paddingLeft: '0', paddingRight: '0' }}>
                <div
                    style={{
                        backgroundColor: `rgba(
                            ${255 * backgroundColor[0]},
                            ${255 * backgroundColor[1]},
                            ${255 * backgroundColor[2]}, 
                            ${backgroundColor[3]})`,
                        cursor: cursorStyle, margin: 0, padding: 0, height: Math.floor(webGLHeight()),
                    }}>
                    <MoorhenWebMG
                        ref={glRef}
                        timeCapsuleRef={timeCapsuleRef}
                        commandCentre={commandCentre}
                        molecules={molecules}
                        changeMolecules={changeMolecules}
                        maps={maps}
                        changeMaps={changeMaps}
                        width={webGLWidth}
                        height={webGLHeight}
                        backgroundColor={backgroundColor}
                        setBackgroundColor={setBackgroundColor}
                        isDark={isDark}
                        onAtomHovered={onAtomHovered}
                        onKeyPress={onKeyPress}
                        hoveredAtom={hoveredAtom}
                        preferences={preferences}
                        setShowColourRulesToast={setShowColourRulesToast}
                        showColourRulesToast={showColourRulesToast}
                        windowHeight={windowHeight}
                        windowWidth={windowWidth}
                        urlPrefix={urlPrefix}
                        activeMap={activeMap}
                        viewOnly={viewOnly}
                        extraDraggableModals={extraDraggableModals}
                    />
                </div>
                {!viewOnly && <MoorhenButtonBar {...collectedProps} />}
            </Col>
            {!viewOnly && <MoorhenSideBar {...collectedProps} busy={busy} consoleMessage={consoleMessage} ref={consoleDivRef} />}
        </Row>
        <ToastContainer style={{ marginTop: "5rem", maxWidth: '20rem' }} position='top-center' >
            <Toast className='shadow-none hide-scrolling' onClose={() => setShowToast(false)} autohide={true} delay={4000} show={showToast} style={{overflowY: 'scroll', maxHeight: convertViewtoPx(80, webGLHeight())}}>
                <Toast.Header className="stop-scrolling" closeButton={false} style={{justifyContent:'center'}}>
                    {toastContent}
                </Toast.Header>
            </Toast>
        </ToastContainer>
    </Container>
    </>
}

MoorhenContainer.defaultProps = {
    urlPrefix: '.',
    monomerLibraryPath: './baby-gru/monomers',
    forwardControls: () => {},
    exportCallback: null,
    disableFileUploads: false,
    extraNavBarMenus: [],
    extraFileMenuItems: [],
    extraEditMenuItems: [],
    extraCalculateMenuItems: [],
    extraDraggableModals: [],
    viewOnly: false,
    allowScripting: true,
    backupStorageInstance: createLocalStorageInstance('Moorhen-TimeCapsule'),
    aceDRGInstance: null
}
