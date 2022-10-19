import { useRef, useState, useEffect, createRef, useReducer } from 'react';
import { Navbar, Container, Nav, Tabs, Tab, Accordion, Button, Offcanvas, Col, Row, Card, Collapse, Fade, Spinner } from 'react-bootstrap';
import { BabyGruMolecules } from './BabyGruMoleculeUI';
import { BabyGruMaps } from './BabyGruMapUI';
import { BabyGruWebMG } from './BabyGruWebMG';
import { v4 as uuidv4 } from 'uuid';
import { postCootMessage } from '../BabyGruUtils';
import { BabyGruButtonBar } from './BabyGruButtonBar';
import { BabyGruFileMenu } from './BabyGruFileMenu';
import { BabyGruSequenceViewer } from './BabyGruSequenceViewer';

const initialState = { count: 0, consoleMessage: "" };

function reducer(consoleState, action) {
    return {
        count: consoleState.count + 1,
        consoleMessage: `${consoleState.consoleMessage}${consoleState.count} > ${action.newText}\n`
    };
}

export const BabyGruContainer = (props) => {

    const glRef = useRef(null)
    const cootWorker = useRef(null)
    const graphicsDiv = createRef()
    const [activeMap, setActiveMap] = useState(null)
    const [consoleState, dispatch] = useReducer(reducer, initialState);
    const [molecules, setMolecules] = useState([])
    const [maps, setMaps] = useState([])
    const [cursorStyle, setCursorStyle] = useState("default")
    const headerRef = useRef()
    const consoleDivRef = useRef()
    const cootWorkerListenerBinding = createRef()
    const cootEventDispatchBinding = createRef()
    const [dispatchedMessages, setDispatchedMessages] = useState([])
    const [busy, setBusy] = useState(false)

    const consoleHeight = 192;
    const accordionHeaderHeight = 52;
    const navHeight = 58;

    const [accordionHeight, setAccordionHeight] = useState(2 * accordionHeaderHeight)
    const [showSideBar, setShowSideBar] = useState(true)
    const sequenceViewerRef = useRef()
    const sequenceViewerHeight = 272

    useEffect(() => {
        cootWorker.current = new Worker('CootWorker.js')
        postCootMessage(cootWorker, { messageId: uuidv4(), message: 'CootInitialize', data: {} })
        //Register an event listener to update console
        cootWorkerListenerBinding.current = cootWorker.current.addEventListener("message", (e) => {
            //Append the response consoleMessage to the console text
            dispatch({ newText: e.data.consoleMessage })
            //remove this messageId from the dispatchedMessagesList
            let newDispatchedMessages = dispatchedMessages.filter(messageId => messageId !== e.data.messageId)
            setDispatchedMessages(newDispatchedMessages)
        })
        cootEventDispatchBinding.current = document.addEventListener("coot_message_dispatch", (e) => {
            let newDispatchedMessages = [...dispatchedMessages]
            newDispatchedMessages.push(e.detail.messageId)
            setDispatchedMessages(newDispatchedMessages)
        })
        return () => {
            cootWorker.current.removeEventListener('message', cootWorkerListenerBinding.current)
            document.removeEventListener('coot_message_dispatch', cootEventDispatchBinding.current)
            cootWorker.current.terminate()
        }
        glResize()
    }, [])

    useEffect(() => {
        setBusy(dispatchedMessages.length > 0)
    }, [dispatchedMessages.length])

    useEffect(() => {
        consoleDivRef.current.scrollTop = consoleDivRef.current.scrollHeight;
    }, [consoleState.consoleMessage])

    useEffect(() => {
        glResize()
    }, [accordionHeight, showSideBar])

    const glResize = () => {
        glRef.current.resize(webGLWidth(), webGLHeight())
        glRef.current.drawScene()
    }

    const webGLWidth = () => {
        const result = window.innerWidth - (190 + (showSideBar ? 500 : 0))
        return result
    }

    const webGLHeight = () => {
        return window.innerHeight - (navHeight + accordionHeight)
    }

    return <>
        <div className="border" ref={headerRef}>

        <Navbar style={{justifyContent:'between', marginLeft:'1rem', marginRight:'1rem'}}>
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
                        </Nav>
                    </Navbar.Collapse>
                    <Nav className="justify-content-right">
                        {busy && <Spinner animation="border" style={{marginRight:'0.5rem'}} />}
                        <Button className="ml-2" onClick={() => {
                            //setShowDisplayTable(true) 
                            setShowSideBar(!showSideBar)
                        }}>Sidebar</Button>
                    </Nav>
            </Navbar>
        </div>
        <Container fluid>
            <Row>
                <Col>
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
                </Col>
                <Col>
                    <BabyGruButtonBar setCursorStyle={setCursorStyle}
                        molecules={molecules}
                        cootWorker={cootWorker}
                        activeMap={activeMap}
                        glRef={glRef} />
                </Col>
                <Col style={{ display: showSideBar ? "Block" : "None" }}>
                    <div style={{ width: "30rem" }}>
                        <Tabs defaultActiveKey="models">
                            <Tab title="Models" eventKey="models">
                                <div>
                                    <BabyGruMolecules molecules={molecules} glRef={glRef} />
                                </div>
                            </Tab>
                            <Tab title="Maps" eventKey="maps" >
                                <div>
                                    <BabyGruMaps maps={maps}
                                        glRef={glRef}
                                        activeMap={activeMap}
                                        setActiveMap={setActiveMap}
                                    />
                                </div>
                            </Tab>
                        </Tabs>
                    </div>
                </Col>
            </Row>
            <Row style={{ backgroundColor: "white" }}>
                <Col>
                    <div >
                        <Accordion
                            alwaysOpen={true}
                            defaultActiveKey=""
                            onSelect={(openPanels) => {
                                let newAccordionHeight = 0;
                                newAccordionHeight += accordionHeaderHeight;
                                if (openPanels && openPanels.includes("console")) {
                                    newAccordionHeight += consoleHeight
                                }
                                newAccordionHeight += accordionHeaderHeight;//sequences header line
                                if (openPanels && openPanels.includes("sequences")) {
                                    newAccordionHeight += sequenceViewerHeight
                                }
                                setAccordionHeight(newAccordionHeight)
                            }}>
                            <Accordion.Item eventKey="sequences">
                                <Accordion.Header>Sequences</Accordion.Header>
                                <Accordion.Body>
                                    <div ref={sequenceViewerRef} style={{
                                        height: "15rem",
                                        width: "95vw",
                                        lineHeight: "1.0rem",
                                        textAlign: "left"
                                    }}>
                                        <BabyGruSequenceViewer molecules={molecules} glRef={glRef} />
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>
                            <Accordion.Item eventKey="console">
                                <Accordion.Header>Console</Accordion.Header>
                                <Accordion.Body>
                                    <div ref={consoleDivRef} style={{
                                        overflowY: "scroll",
                                        height: "10rem",
                                        width: "100vw",
                                        lineHeight: "1.0rem",
                                        textAlign: "left"
                                    }}>
                                        <pre>{consoleState.consoleMessage}
                                        </pre>
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>
                        </Accordion>
                    </div>
                </Col>
            </Row>
        </Container>
    </>
}
