import { useRef, useLayoutEffect, useState, useEffect, createRef, useReducer, useCallback } from 'react';
import { Navbar, Container, Nav, Tabs, Tab, Accordion, Button, Col, Row, Card, Spinner } from 'react-bootstrap';
import { BabyGruDisplayObjects } from './BabyGruDisplayObjects';
import { BabyGruWebMG } from './BabyGruWebMG';
import { v4 as uuidv4 } from 'uuid';
import { cootCommand, postCootMessage } from '../BabyGruUtils';
import { BabyGruButtonBar } from './BabyGruButtonBar';
import { BabyGruFileMenu } from './BabyGruFileMenu';
import { BabyGruSequenceViewer } from './BabyGruSequenceViewer';
import { BabyGruRamachandran } from './BabyGruRamachandran';
import { BabyGruMapSettings } from './BabyGruMapSettings';
import { ArrowBackIosOutlined, ArrowForwardIosOutlined } from '@mui/icons-material';
import './BabyGruContainer.css'
import { BabyGruHistoryMenu } from './BabyGruHistoryMenu';


function consoleReducer(consoleState, action) {
    return {
        count: consoleState.count + 1,
        consoleMessage: `${consoleState.consoleMessage}${consoleState.count} > ${action.newText}\n`
    };
}

function journalReducer(journalState, action) {
    return {
        count: journalState.count + 1,
        commands: [...journalState.commands, action.commandAndArgs]
    };
}

function convertPxtoVh(input, height) {
    return 100 * input / height
}

function convertViewtoPx(input, height) {
    return height * (input / 100)
}


export const BabyGruContainer = (props) => {

    const glRef = useRef(null)
    const cootWorker = useRef(null)
    const graphicsDiv = createRef()
    const sequenceViewerRef = useRef()
    const [showSideBar, setShowSideBar] = useState(false)
    const [activeMap, setActiveMap] = useState(null)
    const [consoleState, updateConsoleState] = useReducer(consoleReducer, { count: 0, consoleMessage: "" });
    const [journalState, updateJournalState] = useReducer(journalReducer, { count: 0, commands: [] });
    const [molecules, setMolecules] = useState([])
    const [maps, setMaps] = useState([])
    const [cursorStyle, setCursorStyle] = useState("default")
    const headerRef = useRef()
    const consoleDivRef = useRef()
    const cootWorkerListenerBinding = createRef()
    const cootEventDispatchBinding = createRef()
    const [dispatchedMessages, setDispatchedMessages] = useState([])
    const [busy, setBusy] = useState(false)
    const [mapRadius, setMapRadius] = useState(15.)
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    const [windowHeight, setWindowHeight] = useState(window.innerHeight)
    const [displayObjectsAccordionBodyHeight, setDisplayObjectsAccordionBodyHeight] = useState(convertViewtoPx(0, windowHeight))
    const [toolAccordionBodyHeight, setToolAccordionBodyHeight] = useState(convertViewtoPx(0, windowHeight))
    const [sequenceViewerBodyHeight, setSequenceViewerBodyHeight] = useState(convertViewtoPx(0, windowHeight))
    const [consoleBodyHeight, setConsoleBodyHeight] = useState(convertViewtoPx(0, windowHeight))
    const [accordionHeight, setAccordionHeight] = useState(convertViewtoPx(90, windowHeight))

    const sideBarWidth = convertViewtoPx(50, windowWidth)
    const innerWindowMarginHeight = windowHeight * 0.04
    const innerWindowMarginWidth = windowWidth * 0.04

    const handleMessage = e => {
        //Append the response consoleMessage to the console text
        updateConsoleState({ newText: e.data.consoleMessage })
        //console.log('Received from coot', e.data)
        const dataKeys = Object.keys(e.data)
        if (dataKeys.includes("command") && dataKeys.includes("commandArgs")) {
            const storedResult = {}
            Object.keys(e.data).filter(key => key !== "result").forEach(key => {
                storedResult[key] = e.data[key]
            })
            updateJournalState({ commandAndArgs: storedResult })
        }
        //remove this messageId from the dispatchedMessagesList
        let newDispatchedMessages = dispatchedMessages.filter(messageId => messageId !== e.data.messageId)
        setDispatchedMessages(newDispatchedMessages)
    }

    const handleCootMessageDispatch = e => {
        let newDispatchedMessages = [...dispatchedMessages]
        newDispatchedMessages.push(e.detail.messageId)
        setDispatchedMessages(newDispatchedMessages)
    }

    const setWindowDimensions = () => {
        setWindowWidth(window.innerWidth)
        setWindowHeight(window.innerHeight)
    }

    useEffect(() => {
        cootWorker.current = new Worker('CootWorker.js')
        postCootMessage(cootWorker, { messageId: uuidv4(), message: 'CootInitialize', data: {} })
        //Register an event listener to update console
        cootWorkerListenerBinding.current = cootWorker.current.addEventListener("message", handleMessage)
        cootEventDispatchBinding.current = document.addEventListener("coot_message_dispatch", handleCootMessageDispatch)
        window.addEventListener('resize', setWindowDimensions)
        return () => {
            window.removeEventListener('resize', setWindowDimensions)
            cootWorker.current.removeEventListener('message', handleMessage)
            document.removeEventListener('coot_message_dispatch', handleCootMessageDispatch)
            cootWorker.current.terminate()
        }
    }, [])

    useEffect(() => {
        setBusy(dispatchedMessages.length > 0)
    }, [dispatchedMessages.length])

    useEffect(() => {
        consoleDivRef.current.scrollTop = consoleDivRef.current.scrollHeight;
    }, [consoleState.consoleMessage])

    useEffect(() => {
        glResize()
        setAccordionHeight(getAccordionHeight())
        displayObjectsAccordionBodyHeight !== 0 ? setDisplayObjectsAccordionBodyHeight(convertViewtoPx(20, windowHeight)) : setDisplayObjectsAccordionBodyHeight(convertViewtoPx(0, windowHeight))
        toolAccordionBodyHeight !== 0 ? setToolAccordionBodyHeight(convertViewtoPx(70, windowHeight)) : setToolAccordionBodyHeight(convertViewtoPx(0, windowHeight))
        sequenceViewerBodyHeight !== 0 ? setSequenceViewerBodyHeight(convertViewtoPx(30, windowHeight)) : setSequenceViewerBodyHeight(convertViewtoPx(0, windowHeight))
        consoleBodyHeight !== 0 ? setConsoleBodyHeight(convertViewtoPx(15, windowHeight)) : setConsoleBodyHeight(convertViewtoPx(0, windowHeight))
    }, [showSideBar, windowHeight, windowWidth])


    useEffect(() => {
        if (activeMap) {
            cootCommand(cootWorker, {
                returnType: "status",
                command: "set_imol_refinement_map",
                commandArgs: [activeMap.mapMolNo]
            })
        }
    }, [activeMap])

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

    return <>
        <div className="border" ref={headerRef}>

            <Navbar id='navbar-baby-gru' style={{ height: '3rem', justifyContent: 'between', margin: '0.5rem', padding: '0.5rem' }}>
                <Navbar.Brand href="#home">Baby Gru</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="justify-content-left">
                        <BabyGruFileMenu
                            molecules={molecules}
                            setMolecules={setMolecules}
                            maps={maps}
                            setMaps={setMaps}
                            cootWorker={cootWorker}
                            setActiveMap={setActiveMap}
                            glRef={glRef}
                        />
                        <BabyGruHistoryMenu
                            molecules={molecules}
                            setMolecules={setMolecules}
                            maps={maps}
                            setMaps={setMaps}
                            cootWorker={cootWorker}
                            setActiveMap={setActiveMap}
                            glRef={glRef}
                            journalState={journalState}
                        />
                    </Nav>
                </Navbar.Collapse>
                <Nav className="justify-content-right">
                    {busy && <Spinner animation="border" style={{ marginRight: '0.5rem' }} />}
                    <Button style={{ height: '100%', backgroundColor: 'white', border: 0 }} onClick={() => { setShowSideBar(!showSideBar) }}>
                        {showSideBar ? <ArrowForwardIosOutlined style={{ color: 'black' }} /> : <ArrowBackIosOutlined style={{ color: 'black' }} />}
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
                            backgroundColor: "black",
                            cursor: cursorStyle
                        }}>
                        <BabyGruWebMG
                            molecules={molecules}
                            ref={glRef}
                            maps={maps}
                            width={webGLWidth}
                            height={webGLHeight}
                        />
                    </div>
                    <div style={{ height: '4rem' }} id='button-bar-baby-gru'>
                        <BabyGruButtonBar setCursorStyle={setCursorStyle}
                            molecules={molecules}
                            cootWorker={cootWorker}
                            activeMap={activeMap}
                            glRef={glRef} />

                    </div>
                </Col>
                <Col style={{ padding: '0.5rem', margin: '0', display: showSideBar ? "Block" : "None" }} >
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
                                setDisplayObjectsAccordionBodyHeight(convertViewtoPx(20, windowHeight))
                            }
                            if (openPanels.includes('showTools')) {
                                setToolAccordionBodyHeight(convertViewtoPx(70, windowHeight))
                            }
                            if (openPanels.includes('showSequenceViewer')) {
                                setSequenceViewerBodyHeight(convertViewtoPx(30, windowHeight))
                            }
                            if (openPanels.includes('showConsole')) {
                                setConsoleBodyHeight(convertViewtoPx(15, windowHeight))
                            }
                        }}>
                        <Accordion.Item eventKey="showDisplayObjects" style={{ width: sideBarWidth, padding: '0', margin: '0' }} >
                            <Accordion.Header style={{ padding: '0', margin: '0', height: '4rem' }}>Display Objects</Accordion.Header>
                            <Accordion.Body style={{ overflowY: 'auto', height: displayObjectsAccordionBodyHeight }}>
                                {molecules.length === 0 && maps.length === 0 ? "No data files loaded" : <BabyGruDisplayObjects molecules={molecules} glRef={glRef} cootWorker={cootWorker} maps={maps} activeMap={activeMap} setActiveMap={setActiveMap} mapRadius={mapRadius} setMapRadius={setMapRadius} />}
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="showTools" style={{ width: sideBarWidth, padding: '0', margin: '0' }} >
                            <Accordion.Header style={{ height: '4rem' }}>Tools</Accordion.Header>
                            <Accordion.Body style={{ height: toolAccordionBodyHeight, padding: '0', margin: '0', }}>
                                <Tabs defaultActiveKey='ramachandran'>
                                    <Tab eventKey='ramachandran' title='Ramachandran' style={{ height: '100%' }}>
                                        <BabyGruRamachandran molecules={molecules} cootWorker={cootWorker} postCootMessage={postCootMessage} glRef={glRef} toolAccordionBodyHeight={toolAccordionBodyHeight} sideBarWidth={sideBarWidth} windowHeight={windowHeight} windowWidth={windowWidth} />
                                    </Tab>
                                    <Tab eventKey='mapCountour' title='Map Settings'>
                                        <BabyGruMapSettings glRef={glRef} cootWorker={cootWorker} maps={maps} activeMap={activeMap} mapRadius={mapRadius} setMapRadius={setMapRadius} setActiveMap={setActiveMap} />
                                    </Tab>
                                    <Tab eventKey='densityFit' title='Density Fit'>
                                        Not ready yet...
                                    </Tab>
                                    <Tab eventKey='more' title='More...'>
                                        Not ready yet...
                                    </Tab>
                                </Tabs>
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="showSequenceViewer" style={{ width: sideBarWidth, padding: '0', margin: '0' }} >
                            <Accordion.Header style={{ padding: '0', margin: '0', height: '4rem' }}>Sequences</Accordion.Header>
                            <Accordion.Body style={{ overflowY: 'auto', height: sequenceViewerBodyHeight }}>
                                <div ref={sequenceViewerRef} style={{ textAlign: "left" }}>
                                    <BabyGruSequenceViewer molecules={molecules} glRef={glRef} />
                                </div>
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
                                    <pre>{consoleState.consoleMessage}
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
