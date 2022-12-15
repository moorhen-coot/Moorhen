import { NavDropdown, Form, Button, InputGroup, Overlay, SplitButton, Dropdown } from "react-bootstrap";
import { BabyGruMolecule } from "../utils/BabyGruMolecule";
import { BabyGruMap } from "../utils/BabyGruMap";
import { useState, useRef } from "react";
import { BabyGruImportDictionaryMenuItem, BabyGruImportMapCoefficientsMenuItem, BabyGruDeleteEverythingMenuItem, BabyGruLoadTutorialDataMenuItem, BabyGruImportMapMenuItem, BabyGruImportFSigFMenuItem } from "./BabyGruMenuItem";
import { MenuItem } from "@mui/material";
import { doDownload, readTextFile } from "../utils/BabyGruUtils";

export const BabyGruFileMenu = (props) => {

    const { changeMolecules, changeMaps, commandCentre, glRef } = props;
    const [overlayVisible, setOverlayVisible] = useState(false)
    const [overlayContent, setOverlayContent] = useState(<></>)
    const [overlayTarget, setOverlayTarget] = useState(null)
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const [remoteSource, setRemoteSource] = useState("PDBe")
    const pdbCodeFetchInputRef = useRef(null);

    const menuItemProps = { setPopoverIsShown, ...props }

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

    const fetchFiles = () => {
        if (remoteSource === "PDBe") {
            fetchFilesFromEBI()
        } else {
            fetchFilesFromPDBRedo()
        }
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

    const fetchFilesFromPDBRedo = () => {
        let pdbCode = pdbCodeFetchInputRef.current.value.toLowerCase()
        let coordUrl = `https://pdb-redo.eu/db/${pdbCode}/${pdbCode}_final.pdb`
        let mtzUrl = `https://pdb-redo.eu/db/${pdbCode}/${pdbCode}_final.mtz/`
        if (pdbCode) {
            fetchMoleculeFromURL(coordUrl, `${pdbCode}-redo`)
            fetchMtzFromURL(mtzUrl, `${pdbCode}-map-redo`,  {F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false})
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

    const fetchMtzFromURL = async (url, mapName, selectedColumns) => {
        const newMap = new BabyGruMap(props.commandCentre)
        try {
            await newMap.loadToCootFromMtzURL(url, mapName, selectedColumns)
            changeMaps({ action: 'Add', item: newMap })
            props.setActiveMap(newMap)
        } catch {
            console.log(`Cannot fetch mtz from ${url}`)
        }
    }

    const loadSession = async (file) => {
        // Load session data
        let sessionData = await readTextFile(file)
        sessionData = JSON.parse(sessionData)
        console.log(sessionData)
        
        // Delete current scene
        props.molecules.forEach(molecule => {
            molecule.delete(props.glRef)
        })
        changeMolecules({ action: "Empty" })

        // Load molecules stored in session from pdb string
        let newMoleculePromises = [];
        let newMolecule;
        sessionData.moleculesPdbData.forEach((pdbData, index) => {
            newMolecule = new BabyGruMolecule(commandCentre)
            newMoleculePromises.push(
                newMolecule.loadToCootFromString(pdbData, sessionData.moleculesNames[index])
            )
        })
        let newMolecules = await Promise.all(newMoleculePromises)

        // Draw the molecules with the styles stored in session
        let drawPromises = []
        newMolecules.forEach((molecule, moleculeIndex) => {
            molecule.cootBondsOptions = sessionData.moleculesCootBondsOptions[moleculeIndex]
            const styles = sessionData.moleculesDisplayObjectsKeys[moleculeIndex]
            styles.forEach(style => drawPromises.push(molecule.fetchIfDirtyAndDraw(style, glRef, true)))
        })
        await Promise.all(drawPromises)
        
        // Change props.molecules
        newMolecules.forEach(molecule => {
            changeMolecules({ action: "Add", item: molecule })
        })

        // Set camera details
        glRef.current.setAmbientLightNoUpdate(...Object.values(sessionData.ambientLight))
        glRef.current.setSpecularLightNoUpdate(...Object.values(sessionData.specularLight))
        glRef.current.setDiffuseLightNoUpdate(...Object.values(sessionData.diffuseLight))
        glRef.current.setLightPositionNoUpdate(...Object.values(sessionData.lightPosition))
        glRef.current.setZoom(sessionData.zoom, false)
        glRef.current.set_fog_range(sessionData.fogStart, sessionData.fogEnd, false)
        glRef.current.set_clip_range(sessionData.clipStart, sessionData.clipEnd, false)
        glRef.current.doDrawClickedAtomLines = sessionData.doDrawClickedAtomLines
        glRef.current.atomLabelDepthMode = sessionData.atomLabelDepthMode
        glRef.current.background_colour = sessionData.backgroundColor
        glRef.current.setOrigin(sessionData.origin, false)
        glRef.current.setQuat(sessionData.quat4)

    }

    const downloadSession = async () => {
        let promises = props.molecules.map(molecule => {return molecule.getAtoms()})
        let response = await Promise.all(promises)

        let session = {
            moleculesNames: props.molecules.map(molecule => molecule.name),
            moleculesPdbData: response.map(item => item.data.result.pdbData),
            moleculesDisplayObjectsKeys: props.molecules.map(molecule => Object.keys(molecule.displayObjects).filter(key => molecule.displayObjects[key].length > 0)),
            moleculesCootBondsOptions: props.molecules.map(molecule => molecule.cootBondsOptions),
            origin: props.glRef.current.origin,
            backgroundColor: props.backgroundColor,
            atomLabelDepthMode: props.atomLabelDepthMode,
            ambientLight: glRef.current.light_colours_ambient,
            diffuseLight: glRef.current.light_colours_diffuse,
            lightPosition: glRef.current.light_positions,
            specularLight: glRef.current.light_colours_specular,
            fogStart: glRef.current.gl_fog_start,
            fogEnd: glRef.current.gl_fog_end,
            zoom: glRef.current.zoom,
            doDrawClickedAtomLines: glRef.current.doDrawClickedAtomLines,
            clipStart: (glRef.current.gl_clipPlane0[3] + 500) * -1,
            clipEnd: glRef.current.gl_clipPlane1[3] - 500,
            quat4: glRef.current.myQuat
        }

        doDownload([JSON.stringify(session)], `session.json`)
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
                <Form.Label>Fetch coords from online services</Form.Label>
                <InputGroup>
                <SplitButton title={remoteSource} id="fetch-coords-online-source-select">
                    <Dropdown.Item key="PDBe" href="#" onClick={() => {
                        setRemoteSource("PDBe")
                    }}>PDBe</Dropdown.Item>
                    <Dropdown.Item key="PDB-REDO" href="#" onClick={() => {
                        setRemoteSource("PDB-REDO")
                    }}>PDB-REDO</Dropdown.Item>
                </SplitButton>
                    <Form.Control type="text" ref={pdbCodeFetchInputRef} onKeyDown={(e) => {
                        if (e.code === 'Enter') {
                            fetchFiles()
                        }
                    }} />
                    <Button variant="light" onClick={fetchFiles}>
                        Fetch
                    </Button>
                </InputGroup>
            </Form.Group>

            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="upload-session-form" className="mb-3">
                <Form.Label>Load from stored session</Form.Label>
                <Form.Control type="file" accept=".json" multiple={false} onChange={(e) => { loadSession(e.target.files[0]) }}/>
            </Form.Group>

            <BabyGruImportMapCoefficientsMenuItem {...menuItemProps} />

            <BabyGruImportFSigFMenuItem {...menuItemProps} />

            <BabyGruImportMapMenuItem {...menuItemProps} />

            <BabyGruImportDictionaryMenuItem {...menuItemProps} />

            <BabyGruLoadTutorialDataMenuItem {...menuItemProps} />

            <MenuItem id='download-session-menu-item' variant="success" onClick={downloadSession}>
                Download session
            </MenuItem>

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
