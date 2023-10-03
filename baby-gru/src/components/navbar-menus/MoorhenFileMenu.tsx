import { Form, Button, InputGroup, SplitButton, Dropdown } from "react-bootstrap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenContext } from "../../utils/MoorhenContext";
import { useState, useRef, useContext } from "react";
import { MoorhenLoadTutorialDataMenuItem } from "../menu-item/MoorhenLoadTutorialDataMenuItem"
import { MoorhenAssociateReflectionsToMap } from "../menu-item/MoorhenAssociateReflectionsToMap";
import { MoorhenAutoOpenMtzMenuItem } from "../menu-item/MoorhenAutoOpenMtzMenuItem"
import { MoorhenImportMapMenuItem } from "../menu-item/MoorhenImportMapMenuItem"
import { MoorhenImportFSigFMenuItem } from "../menu-item/MoorhenImportFSigFMenuItem"
import { MoorhenBackupsMenuItem } from "../menu-item/MoorhenBackupsMenuItem"
import { MoorhenImportMapCoefficientsMenuItem } from "../menu-item/MoorhenImportMapCoefficientsMenuItem"
import { MoorhenDeleteEverythingMenuItem } from "../menu-item/MoorhenDeleteEverythingMenuItem"
import { MenuItem } from "@mui/material";
import { WarningOutlined } from "@mui/icons-material";
import { convertViewtoPx, doDownload, readTextFile, getMultiColourRuleArgs, loadSessionData } from "../../utils/MoorhenUtils";
import { getBackupLabel } from "../../utils/MoorhenTimeCapsule"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { moorhen } from "../../types/moorhen";

export const MoorhenFileMenu = (props: MoorhenNavBarExtendedControlsInterface) => {

    const { changeMolecules, changeMaps, commandCentre, glRef, monomerLibraryPath } = props;
    const context = useContext<undefined | moorhen.Context>(MoorhenContext);
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    const [remoteSource, setRemoteSource] = useState<string>("PDBe")
    const [isValidPdbId, setIsValidPdbId] = useState<boolean>(true)
    const pdbCodeFetchInputRef = useRef<HTMLInputElement | null>(null);
    const fetchMapDataCheckRef = useRef<HTMLInputElement | null>(null);

    const getWarningToast = (message: string) => <>
        <WarningOutlined style={{margin: 0}}/>
            <h4 className="moorhen-warning-toast">
                {message}
            </h4>
        <WarningOutlined style={{margin: 0}}/>
    </>

    const menuItemProps = { setPopoverIsShown, getWarningToast, ...props }

    const loadPdbFiles = async (files: FileList) => {
        let readPromises: Promise<moorhen.Molecule>[] = []
        Array.from(files).forEach(file => {
            readPromises.push(readPdbFile(file))
        })
        
        let newMolecules: moorhen.Molecule[] = await Promise.all(readPromises)
        if (!newMolecules.every(molecule => molecule.molNo !== -1)) {
            props.setToastContent(getWarningToast(`Failed to read molecule`))
            newMolecules = newMolecules.filter(molecule => molecule.molNo !== -1)
            if (newMolecules.length === 0) {
                return
            }
        }

        let drawPromises: Promise<void>[] = []
        for (const newMolecule of newMolecules) {
            drawPromises.push(
                newMolecule.getNumberOfAtoms()
                .then(atomCount => newMolecule.fetchIfDirtyAndDraw(atomCount >= 50000 ? 'CRs' : 'CBs'))
            )
        }
        await Promise.all(drawPromises)

        changeMolecules({ action: "AddList", items: newMolecules })
        newMolecules.at(-1).centreOn('/*/*/*/*', false)
    }

    const readPdbFile = async (file: File): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(commandCentre, glRef, monomerLibraryPath)
        newMolecule.setBackgroundColour(props.backgroundColor)
        newMolecule.defaultBondOptions.smoothness = context.defaultBondSmoothness
        await newMolecule.loadToCootFromFile(file)        
        return newMolecule        
    }

    const fetchFiles = (): void => {
        if (remoteSource === "PDBe") {
            fetchFilesFromEBI()
        } else if (remoteSource === "PDB-REDO") {
            fetchFilesFromPDBRedo()
        } else if (remoteSource === 'AFDB') {
            fetchFilesFromAFDB()
        } else if (remoteSource === 'COD') {
            fetchFilesFromCOD()
        } else {
            console.log(`Unrecognised remote source! ${remoteSource}`)
        }
    }

    const fetchFilesFromCOD = () => {
        const entryCod: string = pdbCodeFetchInputRef.current.value.toLowerCase()
        const codUrl = `http://www.crystallography.net/cod/${entryCod}.cif`
        if (entryCod) {
            Promise.all([
                fetchMoleculeFromURL(codUrl, `cod-${entryCod}`),
            ])
        } else {
            console.log('Error: no COD entry')
        }
    }

    const fetchFilesFromEBI = () => {
        const pdbCode = pdbCodeFetchInputRef.current.value.toLowerCase()
        const coordUrl = `https://www.ebi.ac.uk/pdbe/entry-files/download/${pdbCode}.cif`
        const mapUrl = `https://www.ebi.ac.uk/pdbe/entry-files/${pdbCode}.ccp4`
        const diffMapUrl = `https://www.ebi.ac.uk/pdbe/entry-files/${pdbCode}_diff.ccp4`
        if (pdbCode && fetchMapDataCheckRef.current.checked) {
            Promise.all([
                fetchMoleculeFromURL(coordUrl, pdbCode),
                fetchMapFromURL(mapUrl, `${pdbCode}-map`),
                fetchMapFromURL(diffMapUrl, `${pdbCode}-map`, true)
            ])
        } else if (pdbCode) {
            fetchMoleculeFromURL(coordUrl, pdbCode)
        }
    }

    const fetchFilesFromAFDB = () => {
        const uniprotID: string = pdbCodeFetchInputRef.current.value.toUpperCase()
        const coordUrl = `https://alphafold.ebi.ac.uk/files/AF-${uniprotID}-F1-model_v4.pdb`
        if (uniprotID) {
            fetchMoleculeFromURL(coordUrl, `${uniprotID}`)
                .then(newMolecule => {
                    const newRule = {
                        args: [getMultiColourRuleArgs(newMolecule, 'af2-plddt')],
                        isMultiColourRule: true,
                        ruleType: 'af2-plddt',
                        label: `//*`
                    }
                    newMolecule.defaultColourRules = [newRule]
                })
                .catch(err => console.log(err))
        }
    }

    const fetchFilesFromPDBRedo = () => {
        const pdbCode = pdbCodeFetchInputRef.current.value
        const coordUrl = `https://pdb-redo.eu/db/${pdbCode}/${pdbCode}_final.pdb`
        const mtzUrl = `https://pdb-redo.eu/db/${pdbCode}/${pdbCode}_final.mtz/`
        if (pdbCode && fetchMapDataCheckRef.current.checked) {
            Promise.all([
                fetchMoleculeFromURL(coordUrl, `${pdbCode}-redo`),
                fetchMtzFromURL(mtzUrl, `${pdbCode}-map-redo`,  {F: "FWT", PHI: "PHWT", Fobs: 'FP', SigFobs: 'SIGFP', FreeR: 'FREE', isDifference: false, useWeight: false, calcStructFact: true}),  
                fetchMtzFromURL(mtzUrl, `${pdbCode}-map-redo`,  {F: "DELFWT", PHI: "PHDELWT", isDifference: true, useWeight: false})    
            ])
        } else if (pdbCode) {
            fetchMoleculeFromURL(coordUrl, `${pdbCode}-redo`)
        }
    }

    const fetchMoleculeFromURL = async (url: RequestInfo | URL, molName: string): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(commandCentre, glRef, monomerLibraryPath)
        newMolecule.setBackgroundColour(props.backgroundColor)
        newMolecule.defaultBondOptions.smoothness = context.defaultBondSmoothness
        try {
            await newMolecule.loadToCootFromURL(url, molName)
            if (newMolecule.molNo === -1) throw new Error("Cannot read the fetched molecule...")
            await newMolecule.fetchIfDirtyAndDraw('CBs')
            changeMolecules({ action: "Add", item: newMolecule })
            newMolecule.centreOn('/*/*/*/*', false)
            return newMolecule
        } catch (err) {
            props.setToastContent(getWarningToast(`Failed to read molecule`))
            console.log(`Cannot fetch molecule from ${url}`)
            setIsValidPdbId(false)
        }   
    }

    const fetchMapFromURL = async (url: RequestInfo | URL, mapName: string, isDiffMap: boolean = false): Promise<void> => {
        const newMap = new MoorhenMap(commandCentre, glRef)
        try {
            await newMap.loadToCootFromMapURL(url, mapName, isDiffMap)
            if (newMap.molNo === -1) throw new Error("Cannot read the fetched map...")
            changeMaps({ action: 'Add', item: newMap })
            props.setActiveMap(newMap)
        } catch {
            props.setToastContent(getWarningToast(`Failed to read map`))
            console.log(`Cannot fetch map from ${url}`)
        }
    }

    const fetchMtzFromURL = async (url: RequestInfo | URL, mapName: string, selectedColumns: moorhen.selectedMtzColumns): Promise<void> => {
        const newMap = new MoorhenMap(commandCentre, glRef)
        try {
            await newMap.loadToCootFromMtzURL(url, mapName, selectedColumns)
            if (newMap.molNo === -1) throw new Error("Cannot read the fetched mtz...")
            changeMaps({ action: 'Add', item: newMap })
            props.setActiveMap(newMap)
        } catch {
            props.setToastContent(getWarningToast(`Failed to read mtz`))
            console.log(`Cannot fetch mtz from ${url}`)
        }
    }

    const handleSessionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const sessionData = await readTextFile(e.target.files[0]) as string
            props.commandCentre.current.history.reset()
            await loadSession(sessionData) 
        } catch (err) {
            console.log(err)
            props.setToastContent(getWarningToast("Error loading session"))
        }
    }

    const loadSession = async (sessionData: string) => {
        try {
            props.commandCentre.current.history.reset()
            const status = await loadSessionData(
                sessionData as string,
                props.monomerLibraryPath,
                props.molecules, 
                props.changeMolecules,
                props.maps,
                props.changeMaps,
                props.setActiveMap,
                props.commandCentre,
                props.timeCapsuleRef,
                props.glRef
            )
            if (status === -1) {
                props.setToastContent(getWarningToast(`Failed to read backup (deprecated format)`))
            }
        } catch (err) {
            console.log(err)
            props.setToastContent(getWarningToast("Error loading session"))
        }
    }

    const getSession = async () => {        
        const session = await props.timeCapsuleRef.current.fetchSession(true)
        const sessionString = JSON.stringify(session)
        doDownload([sessionString], `session.json`)
    }

    const createBackup = async () => {
        await props.timeCapsuleRef.current.updateDataFiles()
        const session = await props.timeCapsuleRef.current.fetchSession(false)
        const sessionString = JSON.stringify(session)
        const key: moorhen.backupKey = {
            dateTime: `${Date.now()}`,
            type: 'manual',
            molNames: session.moleculeData.map(mol => mol.name),
            mapNames: session.mapData.map(map => map.uniqueId),
            mtzNames: session.mapData.filter(map => map.hasReflectionData).map(map => map.associatedReflectionFileName)
        }
        const keyString = JSON.stringify({
            ...key,
            label: getBackupLabel(key)
        })
        return props.timeCapsuleRef.current.createBackup(keyString, sessionString)
    }

    return <>
                <div style={{maxHeight: convertViewtoPx(65, props.windowHeight), overflowY: 'auto'}}>
                    {!props.disableFileUploads && 
                    <Form.Group className='moorhen-form-group' controlId="upload-coordinates-form">
                        <Form.Label>Coordinates</Form.Label>
                        <Form.Control type="file" accept=".pdb, .mmcif, .cif, .ent" multiple={true} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { loadPdbFiles(e.target.files) }}/>
                    </Form.Group>
                    }
                    <Form.Group className='moorhen-form-group' controlId="fetch-pdbe-form">
                        <Form.Label>Fetch coords from online services</Form.Label>
                        <InputGroup>
                            <SplitButton title={remoteSource} id="fetch-coords-online-source-select">
                                {/* @ts-ignore */}
                                <Dropdown.Item key="PDBe" href="#" onClick={() => {
                                    setRemoteSource("PDBe")
                                }}>PDBe</Dropdown.Item>
                                <Dropdown.Item key="PDB-REDO" href="#" onClick={() => {
                                    setRemoteSource("PDB-REDO")
                                }}>PDB-REDO</Dropdown.Item>
                                <Dropdown.Item key="AFDB" href="#" onClick={() => {
                                    setRemoteSource("AFDB")
                                }}>AlphaFold DB</Dropdown.Item>
                                <Dropdown.Item key="COD" href="#" onClick={() => {
                                    setRemoteSource("COD")
                                }}>COD</Dropdown.Item>
                            </SplitButton>
                            <Form.Control type="text" style={{borderColor: isValidPdbId ? '' : 'red'}}  ref={pdbCodeFetchInputRef} onKeyDown={(e) => {
                                setIsValidPdbId(true)
                                if (e.code === 'Enter') {
                                    fetchFiles()
                                }
                            }}/>
                            <Button variant="light" onClick={fetchFiles}>
                                Fetch
                            </Button>
                        </InputGroup>
                        <Form.Label style={{display: isValidPdbId ? 'none' : 'block', alignContent: 'center' ,textAlign: 'center'}}>Problem fetching</Form.Label>
                        <Form.Check style={{ marginTop: '0.5rem' }} ref={fetchMapDataCheckRef} label={'fetch map data'} name={`fetchMapData`} type="checkbox" />
                    </Form.Group>
                    {!props.disableFileUploads && 
                    <Form.Group className='moorhen-form-group' controlId="upload-session-form">
                        <Form.Label>Load from stored session</Form.Label>
                        <Form.Control type="file" accept=".json" multiple={false} onChange={handleSessionUpload}/>
                    </Form.Group>
                    }
                    
                    <hr></hr>

                    <MenuItem id='query-online-services-sequence' onClick={() => {
                        props.setShowQuerySequence(true)
                        document.body.click()
                    }}>
                        Query online services with a sequence...
                    </MenuItem>

                    {!props.disableFileUploads && 
                    <>
                        <MoorhenAssociateReflectionsToMap {...menuItemProps} />
                        <MoorhenAutoOpenMtzMenuItem {...menuItemProps} />
                        <MoorhenImportMapCoefficientsMenuItem {...menuItemProps} />
                        <MoorhenImportMapMenuItem {...menuItemProps} />
                    </>
                    }
                    
                    <MoorhenImportFSigFMenuItem {...menuItemProps} />

                    <MoorhenLoadTutorialDataMenuItem {...menuItemProps} />

                    <MenuItem id='download-session-menu-item' onClick={getSession}>
                        Download session
                    </MenuItem>

                    <MenuItem id='save-session-menu-item' onClick={createBackup} disabled={!context.enableTimeCapsule}>
                        Save backup
                    </MenuItem>
                    
                    <MoorhenBackupsMenuItem {...menuItemProps} disabled={!context.enableTimeCapsule} loadSession={loadSession} />

                    {props.extraFileMenuItems && props.extraFileMenuItems.map( menu => menu)}
                    
                    <hr></hr>

                    <MoorhenDeleteEverythingMenuItem {...menuItemProps} />
                </div>
    </>
}
