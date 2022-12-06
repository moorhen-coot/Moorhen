import { NavDropdown, Form, Button, InputGroup, Overlay } from "react-bootstrap";
import { BabyGruMolecule } from "../utils/BabyGruMolecule";
import { useState, useRef } from "react";
import { BabyGruImportDictionaryMenuItem, BabyGruImportMapCoefficientsMenuItem, BabyGruDeleteEverythingMenuItem, BabyGruLoadTutorialDataMenuItem, BabyGruImportMapMenuItem, BabyGruImportFSigFMenuItem } from "./BabyGruMenuItem";

export const BabyGruFileMenu = (props) => {

    const { molecules, changeMolecules, maps, changeMaps, commandCentre, glRef } = props;
    const [overlayVisible, setOverlayVisible] = useState(false)
    const [overlayContent, setOverlayContent] = useState(<></>)
    const [overlayTarget, setOverlayTarget] = useState(null)
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const readMtzTarget = useRef(null);
    const readDictionaryTarget = useRef(null);
    const pdbCodeFetchInputRef = useRef(null);

    const menuItemProps = { setPopoverIsShown, ...props }

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
            drawPromises.push(newMolecule.fetchIfDirtyAndDraw('CBs', glRef, true))
        }
        await Promise.all(drawPromises)

        changeMolecules({ action: "AddList", items: newMolecules })
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
                newMolecule.fetchIfDirtyAndDraw('CBs', glRef, true)
            }).then(result => {
                changeMolecules({ action: "Add", item: newMolecule })
                return Promise.resolve(newMolecule)
            }).then(_ => {
                newMolecule.centreOn(glRef)
            })
    }

    return <>
        <NavDropdown
            title="File"
            id="basic-nav-dropdown"
            autoClose={popoverIsShown ? false : 'outside'}
            show={props.currentDropdownId === props.dropdownId}
            onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="uploadCoords" className="mb-3">
                <Form.Label>Coordinates</Form.Label>
                <Form.Control type="file" accept=".pdb, .mmcif, .cif, .ent" multiple={true} onChange={(e) => { loadPdbFiles(e.target.files) }} />
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

            <BabyGruImportMapCoefficientsMenuItem {...menuItemProps} />

            <BabyGruImportFSigFMenuItem {...menuItemProps} />

            <BabyGruImportMapMenuItem {...menuItemProps} />

            <BabyGruImportDictionaryMenuItem {...menuItemProps} />

            <BabyGruLoadTutorialDataMenuItem {...menuItemProps} />

            <BabyGruDeleteEverythingMenuItem {...menuItemProps} />

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
