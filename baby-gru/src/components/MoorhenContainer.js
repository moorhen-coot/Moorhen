import { useRef, useState, useEffect, useReducer, useCallback, useContext } from 'react';
import { Container, Col, Row, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { MoorhenWebMG } from './MoorhenWebMG';
import { MoorhenCommandCentre, convertRemToPx, convertViewtoPx } from '../utils/MoorhenUtils';
import { MoorhenTimeCapsule } from '../utils/MoorhenTimeCapsule';
import { MoorhenButtonBar } from './MoorhenButtonBar';
import { Backdrop } from "@mui/material";
import { historyReducer, initialHistoryState } from './MoorhenHistoryMenu';
import { PreferencesContext } from "../utils/MoorhenPreferences";
import { babyGruKeyPress } from './MoorhenKeyboardAccelerators';
import { MoorhenSideBar } from './MoorhenSideBar';
import { isDarkBackground } from '../WebGLgComponents/mgWebGL'
import { MoorhenNavBar } from "./MoorhenNavBar"
import './MoorhenContainer.css'

const initialMoleculesState = []

const initialMapsState = []

const itemReducer = (oldList, change) => {
    if (change.action === 'Add') {
        return [...oldList, change.item]
    }
    else if (change.action === 'Remove') {
        return oldList.filter(item => item.molNo !== change.item.molNo)
    }
    else if (change.action === 'AddList') {
        return oldList.concat(change.items)
    }
    else if (change.action === 'Empty') {
        return []
    }
}

export const MoorhenContainer = (props) => {
    const glRef = useRef(null)
    const timeCapsuleRef = useRef(null)
    const commandCentre = useRef(null)
    const moleculesRef = useRef(null)
    const mapsRef = useRef(null)
    const activeMapRef = useRef(null)
    const consoleDivRef = useRef(null)
    const lastHoveredAtom = useRef(null)
    const preferences = useContext(PreferencesContext);
    const [activeMap, setActiveMap] = useState(null)
    const [activeMolecule, setActiveMolecule] = useState(null)
    const [hoveredAtom, setHoveredAtom] = useState({ molecule: null, cid: null })
    const [consoleMessage, setConsoleMessage] = useState("")
    const [cursorStyle, setCursorStyle] = useState("default")
    const [busy, setBusy] = useState(false)
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    const [windowHeight, setWindowHeight] = useState(window.innerHeight)
    const [commandHistory, dispatchHistoryReducer] = useReducer(historyReducer, initialHistoryState)
    const [molecules, changeMolecules] = useReducer(itemReducer, initialMoleculesState)
    const [maps, changeMaps] = useReducer(itemReducer, initialMapsState)
    const [backgroundColor, setBackgroundColor] = useState([1, 1, 1, 1])
    const [currentDropdownId, setCurrentDropdownId] = useState(-1)
    const [appTitle, setAppTitle] = useState('Moorhen')
    const [cootInitialized, setCootInitialized] = useState(false)
    const [theme, setTheme] = useState("flatly")
    const [showToast, setShowToast] = useState(false)
    const [toastContent, setToastContent] = useState("")
    const [showColourRulesToast, setShowColourRulesToast] = useState(false)
    
    moleculesRef.current = molecules
    mapsRef.current = maps
    activeMapRef.current = activeMap
    const innerWindowMarginHeight = convertRemToPx(0.5)
    const innerWindowMarginWidth = convertRemToPx(1)

    const setWindowDimensions = () => {
        setWindowWidth(window.innerWidth)
        setWindowHeight(window.innerHeight)
    }

    //The purpose here is to return the functions that define and control MoorhenContainer state to a 
    //containing React component
    useEffect(() => {
        if (cootInitialized && props.forwardControls) {
            props.forwardControls(collectedProps)
            timeCapsuleRef.current = new MoorhenTimeCapsule(moleculesRef, mapsRef, activeMapRef, glRef, preferences)
            timeCapsuleRef.current.maxBackupCount = preferences.maxBackupCount
            timeCapsuleRef.current.modificationCountBackupThreshold = preferences.modificationCountBackupThreshold
        }
    }, [cootInitialized, props.forwardControls])
    
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
        let style = document.createElement("link");
        const isDark = isDarkBackground(...backgroundColor)

        if (isDark) {
            style.href = `${props.urlPrefix}/baby-gru/darkly.css`
            setTheme("darkly")
        } else {
            style.href = `${props.urlPrefix}/baby-gru/flatly.css`
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
                dispatchHistoryReducer({ action: "add", command: newCommand })
            },
            onCootInitialized: () => {
                setCootInitialized(true)
            },
            urlPrefix: props.urlPrefix
        })
        window.addEventListener('resize', setWindowDimensions)
        return () => {
            window.removeEventListener('resize', setWindowDimensions)
            commandCentre.current.unhook()
        }
    }, [])

    useEffect(() => {
        consoleDivRef.current.scrollTop = consoleDivRef.current.scrollHeight;
    }, [consoleMessage])

    const onAtomHovered = useCallback(identifier => {
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
    const onKeyPress = useCallback(event => {
        return babyGruKeyPress(event, collectedProps, JSON.parse(preferences.shortCuts))
    }, [molecules, activeMolecule, activeMap, hoveredAtom, preferences])

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

    const prevActiveMoleculeRef = useRef();
    useEffect(() => {
        function resetActiveGL() {
            prevActiveMoleculeRef.current = activeMolecule;
            if (activeMolecule)
                glRef.current.setActiveMolecule(activeMolecule)
            else
                glRef.current.setActiveMolecule(null)
        }
        if (prevActiveMoleculeRef.current) {
            prevActiveMoleculeRef.current.applyTransform(glRef)
                .then(response => {
                    resetActiveGL()
                })
        } else {
            resetActiveGL()
        }
    }, [activeMolecule])

    const glResize = () => {
        glRef.current.resize(webGLWidth(), webGLHeight())
        glRef.current.drawScene()
    }

    const webGLWidth = () => {
        const result = windowWidth - innerWindowMarginWidth
        return result
    }

    const webGLHeight = () => {
        return windowHeight - (innerWindowMarginHeight + convertRemToPx(2))
    }

    const isDark = isDarkBackground(...backgroundColor)

    const collectedProps = {
        molecules, changeMolecules, appTitle, setAppTitle, maps, changeMaps, glRef, activeMolecule, setActiveMolecule,
        activeMap, setActiveMap, commandHistory, commandCentre, backgroundColor, setBackgroundColor, toastContent, 
        setToastContent, currentDropdownId, setCurrentDropdownId, hoveredAtom, setHoveredAtom, showToast, setShowToast,
        windowWidth, windowHeight, innerWindowMarginWidth, showColourRulesToast, timeCapsuleRef, setShowColourRulesToast, 
        isDark, exportCallback: props.exportCallback, disableFileUploads: props.disableFileUploads, urlPrefix: props.urlPrefix, 
        extraMenus:props.extraMenus, monomerLibraryPath: props.monomerLibraryPath, ...preferences
    }

    return <> <div>

        <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={!cootInitialized}>
            <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
            <span>Starting moorhen...</span>
        </Backdrop>
        
        <MoorhenNavBar {...collectedProps} busy={busy}/>
        
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
                            cursor: cursorStyle
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
                            isDark={isDark}
                            atomLabelDepthMode={preferences.atomLabelDepthMode}
                            onAtomHovered={onAtomHovered}
                            onKeyPress={onKeyPress}
                            hoveredAtom={hoveredAtom}
                            preferences={preferences}
                            setShowColourRulesToast={setShowColourRulesToast}
                            showColourRulesToast={showColourRulesToast}
                            windowHeight={windowHeight}
                            windowWidth={windowWidth}
                            urlPrefix={props.urlPrefix}
                            activeMap={activeMap}
                        />
                    </div>
                    <MoorhenButtonBar {...collectedProps} />
                </Col>
                <MoorhenSideBar {...collectedProps} busy={busy} consoleMessage={consoleMessage} ref={consoleDivRef} />
            </Row>
            <ToastContainer style={{ marginTop: "5rem" }} position='top-center' >
                <Toast bg='light' onClose={() => setShowToast(false)} autohide={true} delay={4000} show={showToast} style={{overflowY: 'scroll', maxHeight: convertViewtoPx(80, webGLHeight())}}>
                    <Toast.Header closeButton={false} style={{justifyContent:'center'}}>
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
    exportCallback: null,
    disableFileUploads: false,
    extraMenus:[]
}
