import { useRef, useState, useEffect, useReducer, useCallback, useContext } from 'react';
import { Container, Col, Row, Spinner, Form, Toast, ToastContainer, Stack } from 'react-bootstrap';
import { MoorhenWebMG } from './MoorhenWebMG';
import { MoorhenCommandCentre, convertRemToPx, convertViewtoPx } from '../utils/MoorhenUtils';
import { MoorhenTimeCapsule } from '../utils/MoorhenTimeCapsule';
import { MoorhenButtonBar } from './MoorhenButtonBar';
import { MoorhenFileMenu } from './MoorhenFileMenu';
import { MoorhenCloudMenu } from './MoorhenCloudMenu';
import { MoorhenPreferencesMenu } from './MoorhenPreferencesMenu';
import { ChevronLeftOutlined, ChevronRightOutlined, SaveOutlined } from '@mui/icons-material';
import { Backdrop, IconButton, Drawer, Divider, List} from "@mui/material";
import { MoorhenHistoryMenu, historyReducer, initialHistoryState } from './MoorhenHistoryMenu';
import { MoorhenViewMenu } from './MoorhenViewMenu';
import { MoorhenLigandMenu } from './MoorhenLigandMenu';
import { PreferencesContext } from "../utils/MoorhenPreferences";
import { babyGruKeyPress } from './MoorhenKeyboardAccelerators';
import { MoorhenEditMenu } from './MoorhenEditMenu';
import { MoorhenSideBar } from './MoorhenSideBar';
import { MoorhenHelpMenu } from './MoorhenHelpMenu'
import { isDarkBackground } from '../WebGLgComponents/mgWebGL'
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
    const [showDrawer, setShowDrawer] = useState(true)
    const [drawerOpacity, setDrawerOpacity] = useState(0.7)
    const [showColourRulesToast, setShowColourRulesToast] = useState(false)
    
    moleculesRef.current = molecules
    const innerWindowMarginHeight = convertRemToPx(0)
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
            timeCapsuleRef.current = new MoorhenTimeCapsule(moleculesRef, glRef, preferences)
            timeCapsuleRef.current.maxBackupCount = preferences.maxBackupCount
            timeCapsuleRef.current.modificationCountBackupThreshold = preferences.modificationCountBackupThreshold
        }
    }, [cootInitialized, props.forwardControls])
    
    useEffect(() => {
        if (preferences.defaultBackgroundColor && preferences.defaultBackgroundColor !== backgroundColor) {
            setBackgroundColor(preferences.defaultBackgroundColor)
        }
        
    }, [preferences.defaultBackgroundColor])

    useEffect(() => {
        if (!preferences.defaultBackgroundColor) {
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
                //console.log('Being notified of coot initialized')
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
            let movedResidues = [];
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
        return windowHeight - innerWindowMarginHeight
    }

    const collectedProps = {
        molecules, changeMolecules, appTitle, setAppTitle, maps, changeMaps, glRef, activeMolecule, setActiveMolecule,
        activeMap, setActiveMap, commandHistory, commandCentre, backgroundColor, setBackgroundColor, toastContent, 
        setToastContent, currentDropdownId, setCurrentDropdownId, hoveredAtom, setHoveredAtom, showToast, setShowToast,
        windowWidth, windowHeight, innerWindowMarginWidth,showDrawer, setShowDrawer, showColourRulesToast, timeCapsuleRef,
        setShowColourRulesToast, urlPrefix: props.urlPrefix, ...preferences
    }

    return <> <div>

        <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={!cootInitialized}>
            <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
            <span>Starting moorhen...</span>
        </Backdrop>
        
        <Drawer anchor='top' open={true} variant='persistent'
            onMouseOver={() => setDrawerOpacity(1)}
            onMouseOut={() => setDrawerOpacity(0.7)}
            sx={{
                opacity: showDrawer ? '0.0' : drawerOpacity,
                width: '25rem',
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    borderWidth: '0',
                    width: '30rem',
                    boxSizing: 'border-box',
                },
            }}>
            <Stack  gap={2} direction='horizontal' 
                    style={{backgroundColor: `rgba(
                        ${255 * backgroundColor[0]},
                        ${255 * backgroundColor[1]},
                        ${255 * backgroundColor[2]}, 
                        ${backgroundColor[3]})`}}
                >
                <IconButton onClick={() => {setShowDrawer(true)}}>
                    <img src={`${props.urlPrefix}/baby-gru/pixmaps/MoorhenLogo.png`} alt={appTitle} style={{height: '2.5rem'}}/>
                    <ChevronRightOutlined style={{color: isDarkBackground(...backgroundColor) ? 'white' : 'black'}}/>
                </IconButton>
                {<Form.Control style={{maxWidth: "20rem" }} type="text" readOnly={true} value={`${hoveredAtom.molecule ? hoveredAtom.molecule.name + ':' + hoveredAtom.cid : ''}`} />}
                {<div style={{width:'5rem'}}> { busy && <Spinner animation="border" style={{ marginRight: '0.5rem' }} />} </div>}
                {<div style={{width:'5rem', display:'flex', alignItems:'center', alignContent:'center'}}> { timeCapsuleRef.current?.busy && <SaveOutlined/>} </div>}
            </Stack>
        </Drawer>
            <Drawer
                onClose={(ev, reason) => {setShowDrawer(false)}}
                onMouseOver={() => setDrawerOpacity(1)}
                onMouseOut={() => setDrawerOpacity(0.7)}
                sx={{
                    opacity: drawerOpacity,
                    width: '25rem',
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: '25rem',
                        boxSizing: 'border-box',
                        backgroundColor: isDarkBackground(...backgroundColor) ? 'grey' : 'white'
                    },
                }}
                variant="persistent"
                anchor="left"
                open={showDrawer}
            >
            <Stack gap={2} direction='horizontal' style={{backgroundColor: isDarkBackground(...backgroundColor) ? 'grey' : 'white'}}>
                    {<Form.Control style={{ maxWidth: "25rem" }} type="text" readOnly={true} value={`${hoveredAtom.molecule ? hoveredAtom.molecule.name + ':' + hoveredAtom.cid : ''}`} />}
                    <IconButton onClick={() => {setShowDrawer(false)}}>
                        <img src={`${props.urlPrefix}/baby-gru/pixmaps/MoorhenLogo.png`} alt={appTitle} style={{height: '2.5rem'}}/>
                        <ChevronLeftOutlined style={{color: 'black'}}/>
                    </IconButton>
                </Stack>
                <Divider/>
                <List>
                        <MoorhenFileMenu dropdownId="File" {...collectedProps} />
                        <MoorhenEditMenu dropdownId="Edit" {...collectedProps} />
                        <MoorhenLigandMenu dropdownId="Ligand" {...collectedProps} />
                        <MoorhenViewMenu dropdownId="View" {...collectedProps} />
                        <MoorhenHistoryMenu dropdownId="History" {...collectedProps} />
                        <MoorhenPreferencesMenu dropdownId="Preferences" {...collectedProps} />
                        <MoorhenHelpMenu dropdownId="Help" {...collectedProps}/>
                        {props.exportToCloudCallback && <MoorhenCloudMenu dropdownId="CloudExport" exportToCloudCallback={props.exportToCloudCallback} {...collectedProps}/>}
                        {props.extraMenus && props.extraMenus.map(menu=>menu)}

                </List>
            </Drawer>
        
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
                            molecules={molecules}
                            ref={glRef}
                            maps={maps}
                            commandCentre={commandCentre}
                            width={webGLWidth}
                            height={webGLHeight}
                            backgroundColor={backgroundColor}
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
                        />
                    </div>
                    <MoorhenButtonBar {...collectedProps} />
                </Col>
                <MoorhenSideBar {...collectedProps} consoleMessage={consoleMessage} ref={consoleDivRef} />
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
    exportToCloudCallback: null
}
