import { useRef, useState, useEffect, createRef } from 'react';
import { Navbar, Container, Nav, Tabs, Tab } from 'react-bootstrap';
import { BabyGruMolecules } from './BabyGruMoleculeUI';
import { BabyGruMaps } from './BabyGruMapUI';
import { BabyGruWebMG } from './BabyGruWebMG';
import { v4 as uuidv4 } from 'uuid';
import { postCootMessage } from '../BabyGruUtils';
import { BabyGruButtonBar } from './BabyGruButtonBar';
import { BabyGruFileMenu } from './BabyGruFileMenu';

export const BabyGruContainer = (props) => {

    const glRef = useRef(null)
    const cootWorker = useRef(null)
    const graphicsDiv = createRef()
    const [consoleOutput, setConsoleOutput] = useState("")
    const [molecules, setMolecules] = useState([])
    const [maps, setMaps] = useState([])
    const [cursorStyle, setCursorStyle] = useState("default")

    useEffect(() => {
        cootWorker.current = new Worker('CootWorker.js')
        postCootMessage(cootWorker, { messageId: uuidv4(), message: 'CootInitialize', data: {} })
        cootWorker.current.addEventListener("message", (e) => { handleResponse(e) })
        return () => {
            cootWorker.current.terminate()
        }
    }, [])

    const handleResponse = (e) => {
        setConsoleOutput(`${consoleOutput}${e.data.response}\n`)
    }

    return <div>
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
                            glRef={glRef}
                        />
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
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
                        height={() => { return window.innerHeight - 240 }}
                    />
                </div>
                <BabyGruButtonBar setCursorStyle={setCursorStyle}
                    molecules={molecules}
                    setConsoleOutput={setConsoleOutput}
                    cootWorker={cootWorker}
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
                                <BabyGruMaps maps={maps} glRef={glRef}/>
                            </div>
                        </Tab>
                    </Tabs>
                </div>
            </div>
            <textarea readOnly={true} value={consoleOutput} style={{ overflowY: "scroll", height: "15rem", width: "100vw" }} />
        </Container>
    </div>
}
