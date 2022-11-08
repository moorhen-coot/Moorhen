import { NavDropdown, Form, Button, InputGroup, Modal, FormSelect, Col, Row, Overlay, Card, FormCheck } from "react-bootstrap";
import { BabyGruMolecule } from "./BabyGruMolecule";
import { BabyGruMap } from "./BabyGruMap";
import { useEffect, useState, useRef, createRef } from "react";
import { BabyGruMtzWrapper, cootCommand, readTextFile } from '../BabyGruUtils';
import { InsertDriveFile } from "@mui/icons-material";
import { BabyGruMoleculeSelect } from "./BabyGruMoleculeSelect";
import { BabyGruImportDictionaryMenuItem, BabyGruImportMapCoefficientsMenuItem, BabyGruDeleteEverythingMenuItem } from "./BabyGruMenuItem";
import { MenuItem } from "@mui/material";

export const BabyGruFileMenu = (props) => {

    const { molecules, setMolecules, maps, setMaps, commandCentre, glRef } = props;
    const [overlayVisible, setOverlayVisible] = useState(false)
    const [overlayContent, setOverlayContent] = useState(<></>)
    const [overlayTarget, setOverlayTarget] = useState(null)
    const readMtzTarget = useRef(null);
    const readDictionaryTarget = useRef(null);
    const pdbCodeFetchInputRef = useRef(null);

    const awaitingPromiseRef = useRef({
        resolve: () => { },
        reject: () => { }
    })

    const loadPdbFiles = async (files) => {
        let readPromises = []
        for (const file of files) {
            readPromises.push(readPdbFile(file))
        }
        let newMolecules = await Promise.all(readPromises)

        let drawPromises = []
        for (const newMolecule of newMolecules) {
            drawPromises.push(newMolecule.fetchIfDirtyAndDraw('bonds', glRef, true))
        }
        await Promise.all(drawPromises)

        setMolecules(molecules.concat(newMolecules))
        newMolecules.at(-1).centreOn(glRef)
    }

    const readPdbFile = (file) => {
        const newMolecule = new BabyGruMolecule(commandCentre)
        return newMolecule.loadToCootFromFile(file)
    }

    const fetchFileFromEBI = () => {
        let pdbCode = pdbCodeFetchInputRef.current.value.toLowerCase()
        if (pdbCode) {
            return fetchFileFromURL(`https://www.ebi.ac.uk/pdbe/entry-files/download/pdb${pdbCode}.ent`, pdbCode)
        }
    }

    const fetchFileFromURL = (url, molName) => {
        const newMolecule = new BabyGruMolecule(commandCentre)
        return newMolecule.loadToCootFromURL(url, molName)
            .then(result => {
                newMolecule.fetchIfDirtyAndDraw('bonds', glRef, true)
            }).then(result => {
                setMolecules([...molecules, newMolecule])
                return Promise.resolve(newMolecule)
            }).then(_ => {
                newMolecule.centreOn(glRef)
            })
    }

    const loadTutorialData = () => {
        const newMolecule = new BabyGruMolecule(commandCentre)
        const newMap = new BabyGruMap(commandCentre)
        const newDiffMap = new BabyGruMap(commandCentre)
        newMolecule.loadToCootFromURL(`./tutorials/moorhen-tutorial-structure-number-1.pdb`, "moorhen-tutorial-1")
            .then(result => {
                newMolecule.fetchIfDirtyAndDraw('bonds', glRef, true)
            }).then(result => {
                setMolecules([...molecules, newMolecule])
                Promise.resolve(newMolecule)
            }).then(_ => {
                newMolecule.centreOn(glRef)
            }).then(_ => {
                return newMap.loadToCootFromURL(`./tutorials/moorhen-tutorial-map-number-1.mtz`, "moorhen-tutorial-1",
                    { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false })
            }).then(_ => {
                return newDiffMap.loadToCootFromURL(`./tutorials/moorhen-tutorial-map-number-1.mtz`, "moorhen-tutorial-1",
                    { F: "DELFWT", PHI: "PHDELWT", isDifference: true, useWeight: false })
            }).then(_ => {
                setMaps([...maps, newMap, newDiffMap])
                props.setActiveMap(newMap)
            })
    }

    return <>
        <NavDropdown title="File" id="basic-nav-dropdown">
            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="uploadCoords" className="mb-3">
                <Form.Label>Coordinates</Form.Label>
                <Form.Control type="file" accept=".pdb, .mmcif, .ent" multiple={true} onChange={(e) => { loadPdbFiles(e.target.files) }} />
            </Form.Group>
            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="downloadCoords" className="mb-3">
                <Form.Label>Fetch coords from PDBe</Form.Label>
                <InputGroup>
                    <Form.Control type="text" ref={pdbCodeFetchInputRef} onKeyDown={(e) => {
                        if (e.code === 'Enter') {
                            fetchFileFromEBI()
                        }
                    }} />
                    <Button variant="light" onClick={fetchFileFromEBI}>
                        Fetch
                    </Button>
                </InputGroup>
            </Form.Group>

            <BabyGruImportMapCoefficientsMenuItem {...props} />

            <BabyGruImportDictionaryMenuItem {...props} />

            <MenuItem variant="success" onClick={(e) => {
                loadTutorialData()
            }}>Load tutorial data</MenuItem>

            <BabyGruDeleteEverythingMenuItem {...props}/>

        </NavDropdown>



        <Overlay
            target={overlayTarget}
            show={overlayVisible}
            placement={"right"}
        >
            {({ placement, arrowProps, show: _show, popper, ...props }) => (
                <div
                    {...props}
                    style={{
                        position: 'absolute',
                        marginBottom: '0.5rem',
                        marginLeft: '1rem',
                        borderRadius: 3,
                        ...props.style,
                    }}
                >{overlayContent}
                </div>
            )}
        </Overlay>
    </>
}
