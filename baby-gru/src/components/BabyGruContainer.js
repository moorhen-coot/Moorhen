import { useRef, useLayoutEffect, useState, useEffect, createRef, useReducer, useCallback } from 'react';
import { Navbar, Container, Nav, Tabs, Tab, Accordion, Button, Col, Row, Card, Spinner } from 'react-bootstrap';
import { BabyGruDisplayObjects } from './BabyGruDisplayObjects';
import { BabyGruWebMG } from './BabyGruWebMG';
import { v4 as uuidv4 } from 'uuid';
import { BabyGruCommandCentre, convertRemToPx, convertViewtoPx } from '../BabyGruUtils';
import { BabyGruButtonBar } from './BabyGruButtonBar';
import { BabyGruFileMenu } from './BabyGruFileMenu';
import { BabyGruRamachandran } from './BabyGruRamachandran';
import { BabyGruValidationPlot } from './BabyGruValidation';
import { BabyGruTimingTest } from './BabyGruTimingTest';
import { ArrowBackIosOutlined, ArrowForwardIosOutlined, DarkModeOutlined, LightModeOutlined } from '@mui/icons-material';
import './BabyGruContainer.css'
import { BabyGruHistoryMenu } from './BabyGruHistoryMenu';
import { BabyGruViewMenu } from './BabyGruViewMenu';
import { BabyGruLigandMenu } from './BabyGruLigandMenu';
import { quatToMat4, quat4Inverse } from '../WebGL/quatToMat4.js';
import * as vec3 from 'gl-matrix/vec3';


const initialHistoryState = { commands: [] }

const historyReducer = (oldHistory, newCommand) => {
    return { commands: [...oldHistory.commands, newCommand] }
}

export const BabyGruContainer = (props) => {

    const glRef = useRef(null)
    const commandCentre = useRef(null)
    const graphicsDiv = createRef()
    const sequenceViewerRef = useRef()
    const navBarRef = useRef()
    const [showSideBar, setShowSideBar] = useState(false)
    const [darkMode, setDarkMode] = useState(false)
    const [activeMap, setActiveMap] = useState(null)
    const [activeMolecule, setActiveMolecule] = useState(null)
    const [consoleMessage, setConsoleMessage] = useState("")
    const [molecules, setMolecules] = useState([])
    const [maps, setMaps] = useState([])
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
    const [backgroundColor, setBackgroundColor] = useState([0., 0., 0., 1.])

    const sideBarWidth = convertViewtoPx(30, windowWidth)
    const innerWindowMarginHeight = convertRemToPx(2.1)
    const innerWindowMarginWidth = convertRemToPx(1)

    const setWindowDimensions = () => {
        setWindowWidth(window.innerWidth)
        setWindowHeight(window.innerHeight)
    }

    useEffect(() => {
        let head = document.head;
        let style = document.createElement("link");

        if (darkMode) {
            style.href = "/darkly.css"
            setBackgroundColor([0., 0., 0., 1.])
        } else {
            style.href = "/flatly.css"
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

    useEffect(() => {
        glResize()
        setAccordionHeight(getAccordionHeight())
        displayObjectsAccordionBodyHeight !== 0 ? setDisplayObjectsAccordionBodyHeight(convertViewtoPx(40, windowHeight)) : setDisplayObjectsAccordionBodyHeight(convertViewtoPx(0, windowHeight))
        toolAccordionBodyHeight !== 0 ? setToolAccordionBodyHeight(convertViewtoPx(70, windowHeight)) : setToolAccordionBodyHeight(convertViewtoPx(0, windowHeight))
        sequenceViewerBodyHeight !== 0 ? setSequenceViewerBodyHeight(convertViewtoPx(30, windowHeight)) : setSequenceViewerBodyHeight(convertViewtoPx(0, windowHeight))
        consoleBodyHeight !== 0 ? setConsoleBodyHeight(convertViewtoPx(30, windowHeight)) : setConsoleBodyHeight(convertViewtoPx(0, windowHeight))
        consoleDivRef.current.scrollTop = consoleDivRef.current.scrollHeight;
    }, [showSideBar, windowHeight, windowWidth])

    useEffect(() => {
        console.log('backgroundColor changed', backgroundColor)
    }, [backgroundColor])

    useEffect(() => {
        if (activeMap && commandCentre.current) {
            commandCentre.current.cootCommand({
                returnType: "status",
                command: "set_imol_refinement_map",
                commandArgs: [activeMap.mapMolNo]
            })
        }
    }, [activeMap])

    const prevActiveMoleculeRef = useRef();
    useEffect(() => {
        function resetActiveGL() {
                prevActiveMoleculeRef.current = activeMolecule;
                if(activeMolecule)
                    glRef.current.setActiveMolecule(activeMolecule)
                else
                    glRef.current.setActiveMolecule(null)
        }
        if (prevActiveMoleculeRef.current) {
            let movedResidues = [];
            prevActiveMoleculeRef.current.applyTransform(glRef)
            .then(response => {
                console.log("Setting/unsetting active molecule (promise)")
                resetActiveGL()
            })
        } else {
            console.log("Setting/unsetting active molecule")
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
        molecules, setMolecules, maps, setMaps, glRef, activeMolecule, setActiveMolecule,
        activeMap, setActiveMap, commandHistory, commandCentre, backgroundColor, setBackgroundColor,
        navBarRef
    }

    return <> <div className="border" ref={headerRef}>

        <Navbar ref={navBarRef} id='navbar-baby-gru' className={darkMode ? "navbar-dark" : "navbar-light"} style={{ height: '3rem', justifyContent: 'between', margin: '0.5rem', padding: '0.5rem' }}>
            <Navbar.Brand href="#home">Baby Gru</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="justify-content-left">
                    <BabyGruFileMenu {...collectedProps} />
                    <BabyGruHistoryMenu {...collectedProps} />
                    <BabyGruViewMenu {...collectedProps} />
                    <BabyGruLigandMenu {...collectedProps} />
                </Nav>
            </Navbar.Collapse>
            <Nav className="justify-content-right">
                {busy && <Spinner animation="border" style={{ marginRight: '0.5rem' }} />}
                <Button style={{ height: '100%', backgroundColor: darkMode ? '#222' : 'white', border: 0 }} onClick={() => { setDarkMode(darkMode ? false : true) }}>
                    {darkMode ? <LightModeOutlined style={{ color: 'white' }} /> : <DarkModeOutlined style={{ color: 'black' }} />}
                </Button>
                <Button style={{ height: '100%', backgroundColor: darkMode ? '#222' : 'white', border: 0 }} onClick={() => { setShowSideBar(!showSideBar) }}>
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
                <Col style={{ padding: '0.5rem', margin: '0', display: showSideBar ? "block" : "none" }} >
                    <Accordion style={{ height: accordionHeight, overflowY: 'scroll' }}
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
                            <Accordion.Body style={{ overflowY: 'auto', height: displayObjectsAccordionBodyHeight }}>
                                {molecules.length === 0 && maps.length === 0 ? "No data files loaded" : <BabyGruDisplayObjects {...collectedProps} />}
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="showTools" style={{ width: sideBarWidth, padding: '0', margin: '0' }} >
                            <Accordion.Header style={{ height: '4rem' }}>Tools</Accordion.Header>
                            <Accordion.Body style={{ height: toolAccordionBodyHeight, padding: '0', margin: '0', }}>
                                <Tabs defaultActiveKey='ramachandran'>
                                    <Tab eventKey='ramachandran' title='Ramachandran' style={{ height: '100%' }}>
                                        <BabyGruRamachandran molecules={molecules} commandCentre={commandCentre} glRef={glRef} toolAccordionBodyHeight={toolAccordionBodyHeight} sideBarWidth={sideBarWidth} windowHeight={windowHeight} windowWidth={windowWidth} />
                                    </Tab>
                                    <Tab eventKey='validationPlot' title='Validation' style={{ height: '100%' }}>
                                        Not ready yet
                                        {/**<BabyGruValidationPlot darkMode={darkMode} molecules={molecules} maps={maps} commandCentre={commandCentre} glRef={glRef} toolAccordionBodyHeight={toolAccordionBodyHeight} sideBarWidth={sideBarWidth} windowHeight={windowHeight} windowWidth={windowWidth} />*/}
                                    </Tab>
                                    <Tab eventKey='more' title='More...'>
                                        <BabyGruTimingTest commandCentre={commandCentre} />
                                    </Tab>
                                </Tabs>
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
