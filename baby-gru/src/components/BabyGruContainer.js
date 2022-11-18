import { useRef, useState, useEffect, createRef, useReducer, useCallback } from 'react';
import { Navbar, Container, Nav, Tabs, Tab, Accordion, Button, Col, Row, Card, Spinner, Form } from 'react-bootstrap';
import { BabyGruDisplayObjects } from './BabyGruDisplayObjects';
import { BabyGruWebMG } from './BabyGruWebMG';
import { BabyGruCommandCentre, convertRemToPx, convertViewtoPx } from '../utils/BabyGruUtils';
import { BabyGruButtonBar } from './BabyGruButtonBar';
import { BabyGruFileMenu } from './BabyGruFileMenu';
import { BabyGruPreferencesMenu } from './BabyGruPreferencesMenu';
import { ArrowBackIosOutlined, ArrowForwardIosOutlined } from '@mui/icons-material';
import './BabyGruContainer.css'
import { BabyGruHistoryMenu } from './BabyGruHistoryMenu';
import { BabyGruViewMenu } from './BabyGruViewMenu';
import { BabyGruLigandMenu } from './BabyGruLigandMenu';
import { BabyGruToolsAccordion } from './BabyGruToolsAccordion'

const initialHistoryState = { commands: [] }

const historyReducer = (oldHistory, newCommand) => {
    return { commands: [...oldHistory.commands, newCommand] }
}

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

export const BabyGruContainer = (props) => {

    const glRef = useRef(null)
    const commandCentre = useRef(null)
    const graphicsDiv = createRef()
    const navBarRef = useRef()
    const [showSideBar, setShowSideBar] = useState(false)
    const [darkMode, setDarkMode] = useState(false)
    const [defaultExpandDisplayCards, setDefaultExpandDisplayCards] = useState(true)
    const [activeMap, setActiveMap] = useState(null)
    const [activeMolecule, setActiveMolecule] = useState(null)
    const [hoveredAtom, setHoveredAtom] = useState({ molecule: { name: null }, cid: null })
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
    const [appTitle, setAppTitle] = useState('BabyGru')
    const [cootInitialized, setCootInitialized] = useState(false)
    const [theme, setTheme] = useState("flatly")

    const sideBarWidth = convertViewtoPx(30, windowWidth)
    const innerWindowMarginHeight = convertRemToPx(2.1)
    const innerWindowMarginWidth = convertRemToPx(1)

    const setWindowDimensions = () => {
        setWindowWidth(window.innerWidth)
        setWindowHeight(window.innerHeight)
    }

    //The purpose here is to return the functions that define and control BabyGruContainer state to a 
    //containing React component
    useEffect(() => {
        //console.log('Coot initialized', cootInitialized, props.forwardControls)
        if (cootInitialized && props.forwardControls) {
            props.forwardControls(collectedProps)
        }
    }, [cootInitialized, props.forwardControls])

    useEffect(() => {
        let head = document.head;
        let style = document.createElement("link");

        if (darkMode) {
            style.href = "/baby-gru/darkly.css"
            setTheme("darkly")
            setBackgroundColor([0., 0., 0., 1.])
        } else {
            style.href = "/baby-gru/flatly.css"
            setTheme("flatly")
            setBackgroundColor([1., 1., 1., 1.])
        }

        style.rel = "stylesheet";
        style.async = true
        style.type = 'text/css'

        head.appendChild(style);
        return () => { head.removeChild(style); }

    }, [darkMode])


    useEffect(() => {
        commandCentre.current = new BabyGruCommandCentre({
            onConsoleChanged: (newMessage) => {
                setConsoleMessage(newMessage)
            },
            onActiveMessagesChanged: (newActiveMessages) => {
                setBusy(newActiveMessages.length !== 0)
            },
            onNewCommand: (newCommand) => {
                dispatchHistoryReducer(newCommand)
            },
            onCootInitialized: () => {
                //console.log('Being notified of coot initialized')
                setCootInitialized(true)
            }
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
        molecules.forEach(molecule => {
            if (molecule.buffersInclude(identifier.buffer)) {
                if (molecule.name !== hoveredAtom.molecule.name || identifier.atom.label !== hoveredAtom.cid) {
                    setHoveredAtom({ molecule: molecule, cid: identifier.atom.label })
                }
            }
        })
    }, [molecules])

    useEffect(() => {
        //console.log({ hoveredAtom })
    }, [hoveredAtom])

    useEffect(() => {
        document.addEventListener('atomHovered', onAtomHovered)
        return () => {
            document.removeEventListener('atomHovered', onAtomHovered)
        }
    }, [document])

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
        let buttonBarHeight = parseFloat(window.getComputedStyle(document.getElementById('button-bar-baby-gru')).height);
        return windowHeight - (navBarHeight + innerWindowMarginHeight)
    }

    const collectedProps = {
        molecules, changeMolecules, appTitle, setAppTitle, maps, changeMaps, glRef, activeMolecule, setActiveMolecule,
        activeMap, setActiveMap, commandHistory, commandCentre, backgroundColor, setBackgroundColor, sideBarWidth,
        navBarRef, currentDropdownId, setCurrentDropdownId, darkMode, setDarkMode, defaultExpandDisplayCards,
        setDefaultExpandDisplayCards
    }

    const accordionToolsItemProps = {
        molecules, commandCentre, glRef, toolAccordionBodyHeight, sideBarWidth, windowHeight, windowWidth, darkMode, maps, showSideBar,
    }

    return <> <div className={`border ${theme}`} ref={headerRef}>

        <Navbar ref={navBarRef} id='navbar-baby-gru' className={darkMode ? "navbar-dark" : "navbar-light"} style={{ height: '3rem', justifyContent: 'between', margin: '0.5rem', padding: '0.5rem' }}>
            <Navbar.Brand href="#home">{appTitle}</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="justify-content-left">
                    <BabyGruFileMenu dropdownId={1} {...collectedProps} />
                    <BabyGruHistoryMenu dropdownId={2} {...collectedProps} />
                    <BabyGruViewMenu dropdownId={3} {...collectedProps} />
                    <BabyGruLigandMenu dropdownId={4} {...collectedProps} />
                    <BabyGruPreferencesMenu dropdownId={5} {...collectedProps} />
                </Nav>
            </Navbar.Collapse>
            <Nav className="justify-content-right">
            {hoveredAtom.cid && <Form.Control style={{width:"20rem"}} type="text" value={`${hoveredAtom.molecule.name}:${hoveredAtom.cid}`}/>}
                {busy && <Spinner animation="border" style={{ marginRight: '0.5rem' }} />}
                <Button className="baby-gru-sidebar-button" style={{ height: '100%', backgroundColor: darkMode ? '#222' : 'white', border: 0 }} onClick={() => { setShowSideBar(!showSideBar) }}>
                    {showSideBar ? <ArrowForwardIosOutlined style={{ color: darkMode ? 'white' : 'black' }} /> : <ArrowBackIosOutlined style={{ color: darkMode ? 'white' : 'black' }} />}
                </Button>
            </Nav>
        </Navbar>
    </div>
        <Container fluid>
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
                        <BabyGruWebMG
                            molecules={molecules}
                            ref={glRef}
                            maps={maps}
                            commandCentre={commandCentre}
                            width={webGLWidth}
                            height={webGLHeight}
                            backgroundColor={backgroundColor}
                            onAtomHovered={onAtomHovered}
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
                        <BabyGruButtonBar {...collectedProps} />
                    </div>
                </Col>
                <Col className={`side-bar-column ${theme}`} style={{ padding: '0.5rem', margin: '0', display: showSideBar ? "block" : "none" }} >
                    <Accordion className='side-bar-accordion' style={{ height: accordionHeight, overflowY: 'scroll' }}
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
                            <Accordion.Body className='side-bar-accordion-body' style={{ overflowY: 'auto', height: displayObjectsAccordionBodyHeight }}>
                                {molecules.length === 0 && maps.length === 0 ? "No data files loaded" : <BabyGruDisplayObjects {...collectedProps} />}
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="showTools" style={{ width: sideBarWidth, padding: '0', margin: '0' }} >
                            <Accordion.Header style={{ height: '4rem' }}>Tools</Accordion.Header>
                            <Accordion.Body style={{ height: toolAccordionBodyHeight, padding: '0', margin: '0', }}>
                                <BabyGruToolsAccordion {...accordionToolsItemProps} />
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="showConsole" style={{ width: sideBarWidth, padding: '0', margin: '0' }} >
                            <Accordion.Header style={{ height: '4rem' }}>Console</Accordion.Header>
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
        </Container>
    </>
}
