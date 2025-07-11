import { Form, Button, InputGroup, SplitButton, Dropdown } from "react-bootstrap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { useState, useRef } from "react";
import { getMultiColourRuleArgs } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch, batch } from 'react-redux';
import { setActiveMap } from "../../store/generalStatesSlice";
import { addMolecule } from "../../store/moleculesSlice";
import { addMap } from "../../store/mapsSlice";
import { webGL } from "../../types/mgWebGL";
import { MoorhenColourRule } from "../../utils/MoorhenColourRule";
import { Store } from "@reduxjs/toolkit";
import { useSnackbar } from "notistack";

export const MoorhenFetchOnlineSourcesForm = (props: {
    monomerLibraryPath: string;
    store: Store;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
    sources?: string[];
    downloadMaps?: boolean;
    onMoleculeLoad?: (newMolecule: moorhen.Molecule) => any;
}) => {

    const defaultProps = {
        sources: ['PDBe', 'PDB-REDO', 'AFDB', 'EMDB'], downloadMaps: true
    }
    
    const { 
        sources, downloadMaps, commandCentre, glRef, store, monomerLibraryPath
     } = { ...defaultProps, ...props }

    const pdbCodeFetchInputRef = useRef<HTMLInputElement | null>(null);
    const fetchMapDataCheckRef = useRef<HTMLInputElement | null>(null);

    const [remoteSource, setRemoteSource] = useState<string>("PDBe")
    const [isValidPdbId, setIsValidPdbId] = useState<boolean>(true)

    const dispatch = useDispatch()

    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)

    const { enqueueSnackbar } = useSnackbar()

    const fetchFiles = (): void => {
        if (pdbCodeFetchInputRef.current.value === "") {
            return
        }
        props.setBusy(true)
        if (remoteSource === "PDBe") {
            fetchFilesFromEBI()
        } else if (remoteSource === "PDB-REDO") {
            fetchFilesFromPDBRedo()
        } else if (remoteSource === 'AFDB') {
            fetchFilesFromAFDB()
        } else if (remoteSource === 'EMDB') {
            fetchMapFromEMDB()
        } else {
            console.log(`Unrecognised remote source! ${remoteSource}`)
        }
    }

    const fetchMapFromEMDB = async () => {
        const emdbCode = pdbCodeFetchInputRef.current.value.toLowerCase()
        if (emdbCode) {
            const mapUrl = `https://ftp.ebi.ac.uk/pub/databases/emdb/structures/EMD-${emdbCode}/map/emd_${emdbCode}.map.gz`
            const mapInfoResponse = await fetch(`https://www.ebi.ac.uk/emdb/api/entry/map/${emdbCode}`)
            let level: number
            if (mapInfoResponse.ok) {
                const data = await mapInfoResponse.json()
                level = data.map.contour_list.contour.find(item => item.primary)?.level as number
            }
            const newMap = await fetchMapFromURL(mapUrl, `${emdbCode}.map.gz`, false, level)
            newMap.centreOnMap()
        } else {
            console.log('Error: no EMDB entry provided')
        }
    }

    const fetchFilesFromEBI = () => {
        const pdbCode = pdbCodeFetchInputRef.current.value.toLowerCase()
        const coordUrl = `https://www.ebi.ac.uk/pdbe/entry-files/download/${pdbCode}.cif`
        const mapUrl = `https://www.ebi.ac.uk/pdbe/entry-files/${pdbCode}.ccp4`
        const diffMapUrl = `https://www.ebi.ac.uk/pdbe/entry-files/${pdbCode}_diff.ccp4`
        if (pdbCode && fetchMapDataCheckRef.current?.checked) {
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
            fetchMoleculeFromURL(coordUrl, `${uniprotID}`, true)
        }
    }

    const fetchFilesFromPDBRedo = () => {
        const pdbCode = pdbCodeFetchInputRef.current.value
        const coordUrl = `https://pdb-redo.eu/db/${pdbCode}/${pdbCode}_final.cif`
        const mtzUrl = `https://pdb-redo.eu/db/${pdbCode}/${pdbCode}_final.mtz`
        if (pdbCode && fetchMapDataCheckRef.current?.checked) {
            Promise.all([
                fetchMoleculeFromURL(coordUrl, `${pdbCode}-redo`),
                fetchMtzFromURL(mtzUrl, `${pdbCode}-map-redo`, { F: "FWT", PHI: "PHWT", Fobs: 'FP', SigFobs: 'SIGFP', FreeR: 'FREE', isDifference: false, useWeight: false, calcStructFact: true }),
                fetchMtzFromURL(mtzUrl, `${pdbCode}-map-redo`, { F: "DELFWT", PHI: "PHDELWT", isDifference: true, useWeight: false })
            ])
        } else if (pdbCode) {
            fetchMoleculeFromURL(coordUrl, `${pdbCode}-redo`)
        }
    }

    const fetchMoleculeFromURL = async (url: RequestInfo | URL, molName: string, isAF2?: boolean): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(commandCentre, glRef, store, monomerLibraryPath)
        newMolecule.setBackgroundColour(backgroundColor)
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
        try {
            await newMolecule.loadToCootFromURL(url, molName)
            if (newMolecule.molNo === -1) {
                throw new Error("Cannot read the fetched molecule...")
            } else if (isAF2) {
                const newColourRule = new MoorhenColourRule(
                    'af2-plddt', "/*/*/*/*", "#ffffff", commandCentre, true
                )
                newColourRule.setLabel("PLDDT")
                const ruleArgs = await getMultiColourRuleArgs(newMolecule, 'af2-plddt')
                newColourRule.setArgs([ ruleArgs ])
                newColourRule.setParentMolecule(newMolecule)
                newMolecule.defaultColourRules = [ newColourRule ]
            }
            await newMolecule.fetchIfDirtyAndDraw(newMolecule.atomCount >= 50000 ? 'CRs' : 'CBs')
            await newMolecule.centreOn('/*/*/*/*', true)
            dispatch(addMolecule(newMolecule))
            props.onMoleculeLoad?.(newMolecule)
            return newMolecule
        } catch (err) {
            enqueueSnackbar('Failed to read molecule', {variant: "error"})
            console.log(`Cannot fetch molecule from ${url}`)
            setIsValidPdbId(false)
            props.setBusy(false)
        }
    }

    const fetchMapFromURL = async (url: RequestInfo | URL, mapName: string, isDiffMap: boolean = false, contourLevel?: number): Promise<moorhen.Map> => {
        const newMap = new MoorhenMap(commandCentre, glRef, store)
        try {
            try {
                await newMap.loadToCootFromMapURL(url, mapName, isDiffMap)
            } catch (err) {
                // Try again if this is a compressed file...
                if (url.toString().includes('.gz')) {
                    await newMap.loadToCootFromMapURL(url, mapName.replace('.gz', ''), isDiffMap, true)
                } else {
                    console.warn(err)
                    throw new Error("Cannot read the fetched map...")
                }
            }
            if (newMap.molNo === -1) throw new Error("Cannot read the fetched map...")
            if (contourLevel) newMap.suggestedContourLevel = contourLevel
            batch(() => {
                dispatch(addMap(newMap))
                dispatch(setActiveMap(newMap))
            })
        } catch (err) {
            console.warn(err)
            enqueueSnackbar('Failed to read map', {variant: "warning"})
            console.log(`Cannot fetch map from ${url}`)
            props.setBusy(false)
        }
        return newMap
    }

    const fetchMtzFromURL = async (url: RequestInfo | URL, mapName: string, selectedColumns: moorhen.selectedMtzColumns): Promise<moorhen.Map> => {
        const newMap = new MoorhenMap(commandCentre, glRef, store)
        try {
            await newMap.loadToCootFromMtzURL(url, mapName, selectedColumns)
            if (newMap.molNo === -1) throw new Error("Cannot read the fetched mtz...")
            batch(() => {
                dispatch(addMap(newMap))
                dispatch(setActiveMap(newMap))
            })
        } catch {
            enqueueSnackbar('Failed to read mtz', {variant: "error"})
            console.log(`Cannot fetch mtz from ${url}`)
            props.setBusy(false)
        }
        return newMap
    }

    return <Form.Group className='moorhen-form-group' controlId="fetch-pdbe-form">
        <Form.Label>Fetch from online services</Form.Label>
        <InputGroup>
            <SplitButton title={remoteSource} id="fetch-coords-online-source-select">
                {sources.map(source => {
                    /* @ts-ignore */
                    return  <Dropdown.Item key={source} href="#" onClick={() => {
                                setRemoteSource(source)
                            }}>{source}</Dropdown.Item>
                })}
            </SplitButton>
            <Form.Control type="text" style={{ borderColor: isValidPdbId ? '' : 'red', textTransform: 'uppercase'}} ref={pdbCodeFetchInputRef} onKeyDown={(e) => {
                setIsValidPdbId(true)
                if (e.code === 'Enter') {
                    fetchFiles()
                }
            }} />
            <Button variant="light" onClick={fetchFiles}>
                Fetch
            </Button>
        </InputGroup>
        <Form.Label style={{ display: isValidPdbId ? 'none' : 'block', alignContent: 'center', textAlign: 'center' }}>Problem fetching</Form.Label>
        {downloadMaps && <Form.Check style={{ marginTop: '0.5rem' }} ref={fetchMapDataCheckRef} label={'fetch data for map'} name={`fetchMapData`} type="checkbox" />}        
    </Form.Group>
}
