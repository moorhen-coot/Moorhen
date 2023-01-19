import { useRef, useState, useEffect, createRef, useReducer, useCallback, useContext } from 'react';
import { Navbar, Container, Nav, Accordion, Button, Col, Row, Spinner, Form, Toast, ToastContainer } from 'react-bootstrap';
import { MoorhenDisplayObjects } from './MoorhenDisplayObjects';
import { MoorhenWebMG } from './MoorhenWebMG';
import { MoorhenCommandCentre, convertRemToPx, convertViewtoPx } from '../utils/MoorhenUtils';
import { MoorhenButtonBar } from './MoorhenButtonBar';
import { MoorhenFileMenu } from './MoorhenFileMenu';
import { MoorhenCloudMenu } from './MoorhenCloudMenu';
import { MoorhenPreferencesMenu } from './MoorhenPreferencesMenu';
import { ArrowBackIosOutlined, ArrowForwardIosOutlined } from '@mui/icons-material';
import { Backdrop } from '@mui/material';
import { MoorhenHistoryMenu, historyReducer, initialHistoryState } from './MoorhenHistoryMenu';
import { MoorhenViewMenu } from './MoorhenViewMenu';
import { MoorhenLigandMenu } from './MoorhenLigandMenu';
import { MoorhenToolsAccordion } from './MoorhenToolsAccordion'
import { PreferencesContext } from "../utils/MoorhenPreferences";
import { babyGruKeyPress } from './MoorhenKeyboardAccelerators';
import { MoorhenEditMenu } from './MoorhenEditMenu';
import { MoorhenHelpMenu } from './MoorhenHelpMenu'
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
    const commandCentre = useRef(null)
    const graphicsDiv = createRef()
    const navBarRef = useRef()
    const [selectedToolKey, setSelectedToolKey] = useState(null)
    const [showSideBar, setShowSideBar] = useState(false)
    const [activeMap, setActiveMap] = useState(null)
    const [activeMolecule, setActiveMolecule] = useState(null)
    const [hoveredAtom, setHoveredAtom] = useState({ molecule: null, cid: null })
    const [consoleMessage, setConsoleMessage] = useState("")
    const [cursorStyle, setCursorStyle] = useState("default")
    const headerRef = useRef()
    const consoleDivRef = useRef()
    const [busy, setBusy] = useState(false)
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    const [windowHeight, setWindowHeight] = useState(window.innerHeight)
    const [displayObjectsAccordionBodyHeight, setDisplayObjectsAccordionBodyHeight] = useState(convertViewtoPx(0, windowHeight))
    const [toolAccordionBodyHeight, setToolAccordionBodyHeight] = useState(convertViewtoPx(0, windowHeight))
    const [sequenceViewerBodyHeight, setSequenceViewerBodyHeight] = useState(convertViewtoPx(0, windowHeight))
    const [consoleBodyHeight, setConsoleBodyHeight] = useState(convertViewtoPx(0, windowHeight))
    const [accordionHeight, setAccordionHeight] = useState(convertViewtoPx(90, windowHeight))
    const [commandHistory, dispatchHistoryReducer] = useReducer(historyReducer, initialHistoryState)
    const [molecules, changeMolecules] = useReducer(itemReducer, initialMoleculesState)
    const [maps, changeMaps] = useReducer(itemReducer, initialMapsState)
    const [backgroundColor, setBackgroundColor] = useState([0., 0., 0., 1.])
    const [currentDropdownId, setCurrentDropdownId] = useState(-1)
    const [appTitle, setAppTitle] = useState('Moorhen')
    const [cootInitialized, setCootInitialized] = useState(false)
    const [theme, setTheme] = useState("flatly")
    const lastHoveredAtom = useRef(null)
    const [showToast, setShowToast] = useState(false)
    const preferences = useContext(PreferencesContext);
    const [toastContent, setToastContent] = useState("")

    const sideBarWidth = convertViewtoPx(30, windowWidth)
    const innerWindowMarginHeight = convertRemToPx(2.1)
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
        }
    }, [cootInitialized, props.forwardControls])

    useEffect(() => {
        let head = document.head;
        let style = document.createElement("link");

        if (preferences.darkMode === null) {
            return
        } else if (preferences.darkMode) {
            style.href = `${props.urlPrefix}/baby-gru/darkly.css`
            setTheme("darkly")
            setBackgroundColor([0., 0., 0., 1.])
        } else {
            style.href = `${props.urlPrefix}/baby-gru/flatly.css`
            setTheme("flatly")
            setBackgroundColor([1., 1., 1., 1.])
        }

        style.rel = "stylesheet";
        style.async = true
        style.type = 'text/css'

        head.appendChild(style);
        return () => { head.removeChild(style); }

    }, [preferences.darkMode])

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
        setAccordionHeight(getAccordionHeight())
        displayObjectsAccordionBodyHeight !== 0 ? setDisplayObjectsAccordionBodyHeight(convertViewtoPx(40, windowHeight)) : setDisplayObjectsAccordionBodyHeight(convertViewtoPx(0, windowHeight))
        toolAccordionBodyHeight !== 0 ? setToolAccordionBodyHeight(convertViewtoPx(70, windowHeight)) : setToolAccordionBodyHeight(convertViewtoPx(0, windowHeight))
        sequenceViewerBodyHeight !== 0 ? setSequenceViewerBodyHeight(convertViewtoPx(30, windowHeight)) : setSequenceViewerBodyHeight(convertViewtoPx(0, windowHeight))
        consoleBodyHeight !== 0 ? setConsoleBodyHeight(convertViewtoPx(30, windowHeight)) : setConsoleBodyHeight(convertViewtoPx(0, windowHeight))
        consoleDivRef.current.scrollTop = consoleDivRef.current.scrollHeight;
    }, [showSideBar, windowHeight, windowWidth])
    /*
        useEffect(() => {
            console.log('backgroundColor changed', backgroundColor)
        }, [backgroundColor])
    */
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
                    //console.log("Setting/unsetting active molecule (promise)")
                    resetActiveGL()
                })
        } else {
            //console.log("Setting/unsetting active molecule")
            resetActiveGL()
        }
    }, [activeMolecule])

    const glResize = () => {
        glRef.current.resize(webGLWidth(), webGLHeight())
        glRef.current.drawScene()
    }

    const webGLWidth = () => {
        const result = windowWidth - (innerWindowMarginWidth + (showSideBar ? sideBarWidth : 0))
        return result
    }

    const webGLHeight = () => {
        let navBarHeight = parseFloat(window.getComputedStyle(document.getElementById('navbar-baby-gru')).height);
        let buttonBarHeight = parseFloat(window.getComputedStyle(document.getElementById('button-bar-baby-gru')).height);
        return windowHeight - (navBarHeight + buttonBarHeight + innerWindowMarginHeight)
    }

    const getAccordionHeight = () => {
        let navBarHeight = parseFloat(window.getComputedStyle(document.getElementById('navbar-baby-gru')).height);
        return windowHeight - (navBarHeight + innerWindowMarginHeight)
    }

    const collectedProps = {
        molecules, changeMolecules, appTitle, setAppTitle, maps, changeMaps, glRef, activeMolecule, setActiveMolecule,
        activeMap, setActiveMap, commandHistory, commandCentre, backgroundColor, setBackgroundColor, sideBarWidth,
        navBarRef, currentDropdownId, setCurrentDropdownId, hoveredAtom, setHoveredAtom, toastContent, setToastContent, 
        showToast, setShowToast, windowWidth, windowHeight, showSideBar, innerWindowMarginWidth, toolAccordionBodyHeight,
        urlPrefix: props.urlPrefix, ...preferences
    }

    const accordionToolsItemProps = {
        molecules, commandCentre, glRef, toolAccordionBodyHeight, setToolAccordionBodyHeight, sideBarWidth, windowHeight, 
        windowWidth, maps, showSideBar, hoveredAtom, setHoveredAtom, selectedToolKey, setSelectedToolKey, ...preferences
    }

    return <> <div className={`border ${theme}`} ref={headerRef}>

        <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={!cootInitialized}>
            <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
            <span>Starting moorhen...</span>
        </Backdrop>

        <Navbar ref={navBarRef} id='navbar-baby-gru' className={preferences.darkMode ? "navbar-dark" : "navbar-light"} style={{ height: '3rem', justifyContent: 'between', margin: '0.5rem', padding: '0.5rem' }}>
            <Navbar.Brand href="#home">
                <img src={`${props.urlPrefix}/baby-gru/pixmaps/MoorhenLogo.png`} alt={appTitle} style={{height: '2.5rem'}}/>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="justify-content-left">
                    <MoorhenFileMenu dropdownId="File" {...collectedProps} />
                    <MoorhenEditMenu dropdownId="Edit" {...collectedProps} />
                    <MoorhenLigandMenu dropdownId="Ligand" {...collectedProps} />
                    <MoorhenViewMenu dropdownId="View" {...collectedProps} />
                    <MoorhenHistoryMenu dropdownId="History" {...collectedProps} />
                    <MoorhenPreferencesMenu dropdownId="Preferences" {...collectedProps} />
                    <MoorhenHelpMenu dropdownId="Help" setSelectedToolKey={setSelectedToolKey} consoleBodyHeight={consoleBodyHeight} {...collectedProps}/>
                    {props.enableCloudMenu && <MoorhenCloudMenu dropdownId="CloudExport" {...collectedProps}/>}
                    {props.extraMenus && props.extraMenus.map(menu=>menu)}
                </Nav>
            </Navbar.Collapse>
            <Nav className="justify-content-right">
                {hoveredAtom.cid && <Form.Control style={{ width: "20rem" }} type="text" readOnly={true} value={`${hoveredAtom.molecule.name}:${hoveredAtom.cid}`} />}
                {busy && <Spinner animation="border" style={{ marginRight: '0.5rem' }} />}
                <Button id='show-sidebar-button' className="baby-gru-sidebar-button" style={{ height: '100%', backgroundColor: preferences.darkMode ? '#222' : 'white', border: 0 }} onClick={() => { setShowSideBar(!showSideBar) }}>
                    {showSideBar ? <ArrowForwardIosOutlined style={{ color: preferences.darkMode ? 'white' : 'black' }} /> : <ArrowBackIosOutlined style={{ color: preferences.darkMode ? 'white' : 'black' }} />}
                </Button>
            </Nav>
        </Navbar>
    </div>
        <Container fluid className={`baby-gru ${theme}`}>
            <Row>
                <Col style={{ paddingLeft: '0', paddingRight: '0' }}>
                    <div
                        ref={graphicsDiv}
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
                        />
                    </div>
                    <div id='button-bar-baby-gru'
                        style={{
                            height: '4rem',
                            backgroundColor: `rgba(
                                    ${255 * backgroundColor[0]},
                                    ${255 * backgroundColor[1]},
                                    ${255 * backgroundColor[2]}, 
                                    ${backgroundColor[3]})`
                        }}>
                        <MoorhenButtonBar {...collectedProps} />
                    </div>
                </Col>
                <Col className={`side-bar-column ${theme}`} style={{ padding: '0.5rem', margin: '0', display: showSideBar ? "block" : "none" }} >
                    <Accordion className='side-bar-accordion scroller' style={{ height: accordionHeight, overflowY: 'scroll' }}
                        alwaysOpen={true}
                        defaultActiveKey={''}
                        onSelect={(openPanels) => {
                            setDisplayObjectsAccordionBodyHeight(convertViewtoPx(0, windowHeight))
                            setToolAccordionBodyHeight(convertViewtoPx(0, windowHeight))
                            setSequenceViewerBodyHeight(convertViewtoPx(0, windowHeight))
                            setConsoleBodyHeight(convertViewtoPx(0, windowHeight))
                            if (!openPanels) {
                                return
                            }
                            if (openPanels.includes('showDisplayObjects')) {
                                setDisplayObjectsAccordionBodyHeight(convertViewtoPx(40, windowHeight))
                            }
                            if (openPanels.includes('showTools')) {
                                setToolAccordionBodyHeight(convertViewtoPx(70, windowHeight))
                            }
                            if (openPanels.includes('showSequenceViewer')) {
                                setSequenceViewerBodyHeight(convertViewtoPx(30, windowHeight))
                            }
                            if (openPanels.includes('showConsole')) {
                                setConsoleBodyHeight(convertViewtoPx(30, windowHeight))
                            }
                        }}>
                        <Accordion.Item eventKey="showDisplayObjects" style={{ width: sideBarWidth, padding: '0', margin: '0' }} >
                            <Accordion.Header style={{ padding: '0', margin: '0', height: '4rem' }}>Display Objects</Accordion.Header>
                            <Accordion.Body className='side-bar-accordion-body scroller' style={{ overflowY: 'auto', height: displayObjectsAccordionBodyHeight }}>
                                {molecules.length === 0 && maps.length === 0 ? "No data files loaded" : <MoorhenDisplayObjects {...collectedProps} />}
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="showTools" style={{ width: sideBarWidth, padding: '0', margin: '0' }} >
                                <Accordion.Button id='tools-accordion-button'>
                                    Tools
                                </Accordion.Button>
                            <Accordion.Body style={{ height: toolAccordionBodyHeight, padding: '0', margin: '0', }}>
                                <MoorhenToolsAccordion {...accordionToolsItemProps} />
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="showConsole" style={{ width: sideBarWidth, padding: '0', margin: '0' }} >
                            <Accordion.Button id='console-accordion-button'>
                                Console
                            </Accordion.Button>
                            <Accordion.Body style={{ height: consoleBodyHeight }}>
                                <div ref={consoleDivRef} style={{
                                    overflowY: "scroll",
                                    height: '100%',
                                    textAlign: "left"
                                }}>
                                    <pre>{consoleMessage}
                                    </pre>
                                </div>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                </Col>
            </Row>
            <ToastContainer style={{ marginTop: "5rem" }} position='top-center' >
                <Toast bg='light' onClose={() => setShowToast(false)} autohide={true} delay={4000} show={showToast}>
                    <Toast.Header closeButton={false} >
                        {toastContent}
                    </Toast.Header>
                </Toast>
            </ToastContainer>
        </Container>
    </>
}

MoorhenContainer.defaultProps = {
    urlPrefix: '.',
    enableCloudMenu: false
}
