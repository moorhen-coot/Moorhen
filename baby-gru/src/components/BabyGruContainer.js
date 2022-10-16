import { useRef, useState, useEffect, createRef, useReducer } from 'react';
import { Navbar, Container, Nav, Tabs, Tab } from 'react-bootstrap';
import { BabyGruMolecules } from './BabyGruMoleculeUI';
import { BabyGruMaps } from './BabyGruMapUI';
import { BabyGruWebMG } from './BabyGruWebMG';
import { v4 as uuidv4 } from 'uuid';
import { postCootMessage } from '../BabyGruUtils';
import { BabyGruButtonBar } from './BabyGruButtonBar';
import { BabyGruFileMenu } from './BabyGruFileMenu';

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
    const footerRef = useRef()
    const consoleDivRef = useRef()

    useEffect(() => {
        cootWorker.current = new Worker('CootWorker.js')
        postCootMessage(cootWorker, { messageId: uuidv4(), message: 'CootInitialize', data: {} })
        //Register an event listener to update console
        cootWorker.current.addEventListener("message", (e) => { 
            dispatch({ newText: e.data.consoleMessage }) 
        })
        return () => {
            cootWorker.current.terminate()
        }
    }, [])

    useEffect(() => {
        consoleDivRef.current.scrollTop = consoleDivRef.current.scrollHeight;
    }, [consoleState.consoleMessage])

    return <div>
        <div className="border" ref={headerRef}>

            <Navbar>
                <Container >
                    <Navbar.Brand href="#home">Baby Gru</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
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
                </Container>
            </Navbar>
        </div>
        <Container fluid>
            <div
                className='baby-gru-panel'
                style={{ backgroundColor: "#eee" }}>
                <div
                    ref={graphicsDiv}
                    className='baby-gru-panel'
                    style={{
                        backgroundColor: "red",
                        float: "left",
                        width: "calc(100vw - 32rem)",
                        cursor: cursorStyle
                    }}>
                    <BabyGruWebMG
                        molecules={molecules}
                        ref={glRef}
                        maps={maps}
                        width={() => { return window.innerWidth - 515 }}
                        height={() => {
                            console.log(footerRef.current.offsetHeight, headerRef.current.offsetHeight)
                            return window.innerHeight - (
                                25 + footerRef.current.offsetHeight + headerRef.current.offsetHeight
                            )
                        }}
                    />
                </div>
                <BabyGruButtonBar setCursorStyle={setCursorStyle}
                    molecules={molecules}
                    //setConsoleOutput={setConsoleOutput}
                    cootWorker={cootWorker}
                    activeMap={activeMap}
                    glRef={glRef} />
                <div
                    className='baby-gru-panel'
                    style={{
                        overflow: "auto",
                        float: "left",
                        width: "25rem",
                        backgroundColor: "white",

                    }}>
                    <Tabs defaultActiveKey="models">
                        <Tab title="Models" eventKey="models">
                            <div style={{ width: "25rem" }}>
                                <BabyGruMolecules molecules={molecules} glRef={glRef} />
                            </div>
                        </Tab>
                        <Tab title="Maps" eventKey="maps" >
                            <div style={{ width: "25rem" }}>
                                <BabyGruMaps maps={maps}
                                    glRef={glRef}
                                    activeMap={activeMap}
                                    setActiveMap={setActiveMap}
                                />
                            </div>
                        </Tab>
                    </Tabs>
                </div>
            </div>
            <div ref={footerRef}>
                <div ref={consoleDivRef} style={{ overflowY: "scroll", height: "10rem", width: "100vw", lineHeight: "1.0rem", textAlign: "left" }}>
                    <pre>{consoleState.consoleMessage}
                    </pre>
                </div>
            </div>
        </Container>
    </div>
}
