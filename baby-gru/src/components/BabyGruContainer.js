import { useRef, useState, useEffect, createRef } from 'react';
import { Navbar, Container, NavDropdown, Nav, Tabs, Tab, ButtonGroup, Button, Image } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import { BabyGruMolecules } from './BabyGruMoleculeUI';
import { BabyGruMaps } from './BabyGruMapUI';
import { BabyGruWebMG } from './BabyGruWebMG';
import { v4 as uuidv4 } from 'uuid';
import { BabyGruMolecule } from './BabyGruMolecule';
import { postCootMessage } from '../BabyGruUtils';
import { BabyGruMap } from './BabyGruMap';

export const BabyGruContainer = (props) => {
    const glRef = useRef(null)
    const cootWorker = useRef(null)
    const graphicsDiv = createRef()
    const flipClickedBinding = useRef(null)
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
        let newOutput = 'Response > '.concat(e.data.response).concat('\n')
        setConsoleOutput(newOutput)
    }

    const readPdbFile = (file) => {
        const newMolecule = new BabyGruMolecule(cootWorker)
        newMolecule.loadToCootFromFile(file)
            .then(result => {
                newMolecule.fetchIfDirtyAndDraw('bonds', glRef, true)
            }).then(result => {
                setMolecules([...molecules, newMolecule])
                Promise.resolve(newMolecule)
            }).then(_ => {
                newMolecule.centreOn(glRef)
            })
    }

    const readMtzFile = (file) => {
        const newMap = new BabyGruMap(cootWorker)
        newMap.loadToCootFromFile(file)
            .then(result => {
                Promise.resolve(true)
            }).then(result => {
                setMaps([...maps, newMap])
                Promise.resolve(newMap)
            })
    }

    const fetchFileFromEBI = (pdbCode) => {
        console.log(pdbCode)
        const newMolecule = new BabyGruMolecule(cootWorker)
        newMolecule.loadToCootFromEBI(pdbCode)
            .then(result => {
                newMolecule.fetchIfDirtyAndDraw('bonds', glRef, true)
            }).then(result => {
                setMolecules([...molecules, newMolecule])
                Promise.resolve(newMolecule)
            }).then(_ => {
                newMolecule.centreOn(glRef)
            })
    }

    return <div>
        <Navbar>
            <Container >
                <Navbar.Brand href="#home">Baby Gru</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <NavDropdown title="File" id="basic-nav-dropdown">
                            <Form.Group style={{ width: '20rem' }} controlId="uploadCoords" className="mb-3">
                                <Form.Label>Coordinates</Form.Label>
                                <Form.Control type="file" accept=".pdb, .mmcif, .ent" onChange={(e) => {
                                    for (const file of e.target.files) {
                                        readPdbFile(file)
                                    }
                                }} />
                            </Form.Group>
                            <Form.Group style={{ width: '20rem' }} controlId="downloadCoords" className="mb-3">
                                <Form.Label>From PDBe</Form.Label>
                                <Form.Control type="text" onKeyDown={(e) => {
                                    if (e.code === 'Enter') {
                                        fetchFileFromEBI(e.target.value.toUpperCase())
                                    }
                                }} />
                            </Form.Group>
                            <Form.Group style={{ width: '20rem' }} controlId="uploadMTZs" className="mb-3">
                                <Form.Label>Map coefficients</Form.Label>
                                <Form.Control type="file" accept=".mtz" onChange={(e) => {
                                    for (const file of e.target.files) {
                                        readMtzFile(file)
                                    }
                                }} />
                            </Form.Group>
                        </NavDropdown>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
        <Container fluid>
            <div style={{ backgroundColor: "#eee", height: "calc(100vh - 15rem)" }}>
                <div
                    ref={graphicsDiv}
                    style={{
                        backgroundColor: "black",
                        float: "left",
                        width: "calc(100vw - 32rem)",
                        height: "calc(100vh - 7rem)",
                        cursor: cursorStyle
                    }}>
                    <BabyGruWebMG
                        molecules={molecules}
                        ref={glRef}
                        maps={maps}
                        width={() => { return window.innerWidth - 440 }}
                        height={() => { return window.innerHeight - 115 }}
                    />
                </div>

                <div class="border" style={{
                    overflow: "auto",
                    float: "left",
                    width: "5rem",
                    backgroundColor: "white",
                    height: "calc(100vh - 7rem)"
                }}>
                    <ButtonGroup size="sm" vertical>
                        <Button onClick={() => {
                            setConsoleOutput('Select atom in residue for which to flip peptide')
                            setCursorStyle("crosshair")
                            flipClickedBinding.current = document.addEventListener('atomClicked', (event) => {
                                setConsoleOutput(`Selected atom ${event.detail}`)
                                //Currrently don't know which molecule has been edited...appply flip to all
                                molecules.forEach(molecule => {
                                    setCursorStyle("default")
                                    postCootMessage(cootWorker, {
                                        message: 'flipPeptide',
                                        coordMolNo: molecule.coordMolNo,
                                        cid: event.detail
                                    }).then(_ => {
                                        molecule.setAtomsDirty(true)
                                        molecule.redraw(glRef)
                                    })
                                })
                            }, {once:true})
                        }}>
                            <img src="pixmaps/flip-peptide.svg"/>
                        </Button>
                    </ButtonGroup>
                </div>
                <div style={{
                    overflow: "auto",
                    float: "left",
                    width: "25rem",
                    backgroundColor: "white",
                    height: "calc(100vh - 7rem)"
                }}>
                    <Tabs defaultActiveKey="models">
                        <Tab title="Models" eventKey="models">
                            <div style={{ width: "25rem" }}>
                                <BabyGruMolecules molecules={molecules} glRef={glRef} />
                            </div>
                        </Tab>
                        <Tab title="Maps" eventKey="maps" >
                            <div style={{ width: "25rem" }}>
                                <BabyGruMaps maps={maps} />
                            </div>
                        </Tab>
                    </Tabs>
                </div>
            </div>
            <textarea readOnly={true} rows={2} value={consoleOutput} style={{ width: "calc(100vw - 20rem)" }} />
        </Container>
    </div>
}
