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
import { DensitySmallOutlined } from '@mui/icons-material';


const initialState = { count: 0, consoleMessage: "" };

function reducer(consoleState, action) {
    return {
        count: consoleState.count + 1,
        consoleMessage: `${consoleState.consoleMessage}${consoleState.count} > ${action.newText}\n`
    };
}

function convertPxtoVh(input, height) {
    return 100 * input / height 
}

function convertVhtoPx(input, height) {
    return height * (input / 100)
}


export const BabyGruContainer = (props) => {

    const glRef = useRef(null)
    const sideBarRef = useRef(null)
    const buttonBarRef = useRef(null)
    const accordionRef = useRef(null)
    const cootWorker = useRef(null)
    const graphicsDiv = createRef()
    const sequenceViewerRef = useRef()
    const [showSideBar, setShowSideBar] = useState(true)
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
    const [mapRadius, setMapRadius] = useState(15.)
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    const [windowHeight, setWindowHeight] = useState(window.innerHeight)

    const consoleHeight = convertVhtoPx(15, windowHeight);
    const accordionHeaderHeight = convertVhtoPx(4, windowHeight);
    const navHeight = convertVhtoPx(4, windowHeight);
    const sequenceViewerHeight = convertVhtoPx(15, windowHeight)
    const innerWindowMarginHeight = windowHeight*0.05

    const [accordionHeight, setAccordionHeight] = useState(2 * accordionHeaderHeight)
    
    const handleMessage = useCallback(e => {
        //Append the response consoleMessage to the console text
        dispatch({ newText: e.data.consoleMessage })
        //remove this messageId from the dispatchedMessagesList
        let newDispatchedMessages = dispatchedMessages.filter(messageId => messageId !== e.data.messageId)
        setDispatchedMessages(newDispatchedMessages)
    })

    const handleCootMessageDispatch = useCallback(e => {
        let newDispatchedMessages = [...dispatchedMessages]
        newDispatchedMessages.push(e.detail.messageId)
        setDispatchedMessages(newDispatchedMessages)
    })
    
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
        sideBarResize()
    }, [accordionHeight, showSideBar, windowHeight, windowWidth])


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
        const result = windowWidth - (190 + (showSideBar ? 500 : 0))
        return result
    }

    const webGLHeight = () => {
        return windowHeight - (navHeight + accordionHeight + innerWindowMarginHeight)
    }

    const sideBarHeight = () => {
        return windowHeight - (navHeight + innerWindowMarginHeight)
    }

    const sideBarResize = () => {
        let newHeight = sideBarHeight()
        sideBarRef.current.style.height = newHeight
        buttonBarRef.current.style.height = newHeight
    }

    return <>
        <div className="border" ref={headerRef}>

            <Navbar style={{ height: navHeight, justifyContent: 'between', marginLeft: '1rem', marginRight: '1rem' }}>
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
                    {busy && <Spinner animation="border" style={{ marginRight: '0.5rem' }} />}
                    <Button style={{height: '100%', backgroundColor: 'white', border: 0}} onClick={() => {
                        setShowSideBar(!showSideBar)
                    }}><DensitySmallOutlined style={{color:'black'}}/></Button>
                </Nav>
            </Navbar>
        </div>
        <Container fluid>
            <Row>
                <Col style={{ paddingLeft: '0.5rem', paddingRight:'0.5rem'}}>
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
                    <div >
                        <Accordion
                            alwaysOpen={true}
                            defaultActiveKey=""
                            onSelect={(openPanels) => {
                                let newAccordionHeight = accordionHeaderHeight*2;
                                if (openPanels && openPanels.includes("console")) {
                                    newAccordionHeight += consoleHeight
                                }
                                if (openPanels && openPanels.includes("sequences")) {
                                    newAccordionHeight += sequenceViewerHeight
                                };
                                setAccordionHeight(newAccordionHeight)
                            }}>
                            <Accordion.Item eventKey="sequences">
                                <Accordion.Header style={{height:accordionHeaderHeight}}>Sequences</Accordion.Header>
                                <Accordion.Body style={{height: sequenceViewerHeight}}>
                                    <div ref={sequenceViewerRef} style={{
                                        textAlign: "left"
                                    }}>
                                        <BabyGruSequenceViewer molecules={molecules} glRef={glRef} />
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>
                            <Accordion.Item eventKey="console">
                                <Accordion.Header style={{height:accordionHeaderHeight}}>Console</Accordion.Header>
                                <Accordion.Body style={{height: consoleHeight}}>
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
                    </div>
                </Col>
                <Col ref={sideBarRef} style={{ height: sideBarHeight(), paddingLeft: '0.5rem', paddingRight:'0.5rem'}}  md="auto">
                    <BabyGruButtonBar setCursorStyle={setCursorStyle}
                        molecules={molecules}
                        cootWorker={cootWorker}
                        activeMap={activeMap}
                        glRef={glRef} />
                </Col>
                <Col ref={buttonBarRef} style={{ height: sideBarHeight(), paddingLeft: '0.5rem', paddingRight:'0.5rem', display: showSideBar ? "Block" : "None" }}  md="auto">
                    <div style={{ width: "35rem", height:'100%' }}>
                    <Row style={{ paddingTop:'2%', height:'48%'}} >
                            <div style={{height:'100%'}}>
                            <Card className="px-0"  style={{marginTop:'0', marginBottom:'0', padding:'0', height:'100%'}} >
                                    <Card.Header>
                                        Display Objects
                                    </Card.Header>
                                    <Card.Body style={{ overflowY:'auto' }}>
                                        { molecules.length===0 && maps.length===0 ? "No data files loaded" : <BabyGruDisplayObjects molecules={molecules} glRef={glRef} cootWorker={cootWorker} maps={maps} activeMap={activeMap} setActiveMap={setActiveMap} mapRadius={mapRadius} setMapRadius={setMapRadius}/> }
                                    </Card.Body>
                                </Card>   
                            </div>
                        </Row>
                        <Row style={{ paddingTop:'2%', height:'48%'}} >
                            <div style={{height:'100%'}}>
                            <Card className="px-0"  style={{marginTop:'0', marginBottom:'0', padding:'0', height:'100%'}} >
                                    <Card.Body>      
                                        <Tabs defaultActiveKey='ramachandran'>
                                        <Tab eventKey='ramachandran' title='Ramachandran'>
                                                <BabyGruRamachandran molecules={molecules} cootWorker={cootWorker} glRef={glRef} />
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
                                    </Card.Body>
                                </Card>   
                            </div>
                        </Row>
                    </div>
                </Col>
            </Row>
        </Container>
    </>
}
