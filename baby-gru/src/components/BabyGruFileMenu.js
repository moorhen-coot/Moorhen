import { NavDropdown, Form, Button, InputGroup, Overlay } from "react-bootstrap";
import { BabyGruMolecule } from "../utils/BabyGruMolecule";
import { BabyGruMap } from "../utils/BabyGruMap";
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

    const fetchFilesFromEBI = () => {
        let pdbCode = pdbCodeFetchInputRef.current.value.toLowerCase()
        let coordUrl = `https://www.ebi.ac.uk/pdbe/entry-files/download/pdb${pdbCode}.ent`
        let mapUrl = `https://www.ebi.ac.uk/pdbe/entry-files/${pdbCode}.ccp4`
        if (pdbCode) {
            fetchMoleculeFromURL(coordUrl, pdbCode)
            fetchMapFromURL(mapUrl, `${pdbCode}-map`)
        }
    }

    const fetchMoleculeFromURL = async (url, molName) => {
        const newMolecule = new BabyGruMolecule(commandCentre)
        try {
            await newMolecule.loadToCootFromURL(url, molName)
            await newMolecule.fetchIfDirtyAndDraw('CBs', glRef, true)
            changeMolecules({ action: "Add", item: newMolecule })
            newMolecule.centreOn(glRef)
        } catch {
            console.log(`Cannot fetch map from ${url}`)
        }
    }

    const fetchMapFromURL = async (url, mapName) => {
        const newMap = new BabyGruMap(props.commandCentre)
        try {
            await newMap.loadToCootFromMapURL(url, mapName)
            changeMaps({ action: 'Add', item: newMap })
            props.setActiveMap(newMap)
        } catch {
            console.log(`Cannot fetch map from ${url}`)
        }
    }

    return <>
        <NavDropdown
            title="File"
            id="file-nav-dropdown"
            autoClose={popoverIsShown ? false : 'outside'}
            show={props.currentDropdownId === props.dropdownId}
            style={{display:'flex', alignItems:'center'}}
            onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="upload-coordinates-form" className="mb-3">
                <Form.Label>Coordinates</Form.Label>
                <Form.Control type="file" accept=".pdb, .mmcif, .cif, .ent" multiple={true} onChange={(e) => { loadPdbFiles(e.target.files) }}/>
            </Form.Group>
            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="fetch-pdbe-form" className="mb-3">
                <Form.Label>Fetch coords from PDBe</Form.Label>
                <InputGroup>
                    <Form.Control type="text" ref={pdbCodeFetchInputRef} onKeyDown={(e) => {
                        if (e.code === 'Enter') {
                            fetchFilesFromEBI()
                        }
                    }} />
                    <Button variant="light" onClick={fetchFilesFromEBI}>
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
