import { useCallback, useEffect, useRef, useState } from "react"
import { FormSelect, OverlayTrigger, Tooltip } from "react-bootstrap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { Dropdown, Form, InputGroup, SplitButton } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { TextField } from "@mui/material"
import { readTextFile } from "../../utils/utils"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { libcootApi } from "../../types/libcoot"
import { useSelector, useDispatch } from 'react-redux';
import { addMolecule } from "../../store/moleculesSlice"
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice"
import { ToolkitStore } from "@reduxjs/toolkit/dist/configureStore"
import { InfoOutlined } from "@mui/icons-material";
import { useSnackbar } from "notistack"

const MoorhenImportLigandDictionary = (props: {
    id: string;
    menuItemText: string;
    createInstance: boolean;
    setCreateInstance: React.Dispatch<React.SetStateAction<boolean>>;
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    monomerLibraryPath: string;
    store: ToolkitStore;
    panelContent: JSX.Element;
    fetchLigandDict: () => Promise<string>;
    addToMoleculeValueRef: React.MutableRefObject<number>;
    addToMolecule: string;
    setAddToMolecule: React.Dispatch<React.SetStateAction<string>>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    tlcValueRef: React.RefObject<string>;
    createRef: React.MutableRefObject<boolean>;
    moleculeSelectRef: React.RefObject<HTMLSelectElement>;
    addToRef: React.RefObject<HTMLSelectElement>;
    moleculeSelectValueRef: React.MutableRefObject<string>;
}) => {

    const dispatch = useDispatch()
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const {
        createInstance, setCreateInstance, addToMolecule, fetchLigandDict, panelContent,
        setAddToMolecule, tlcValueRef, createRef, moleculeSelectRef, addToRef,moleculeSelectValueRef,
        addToMoleculeValueRef, setPopoverIsShown, glRef, commandCentre, menuItemText,
        monomerLibraryPath, id, store
    } = props

    const handleFileContent = useCallback(async (fileContent: string) => {
        let newMolecule: moorhen.Molecule
        let selectedMoleculeIndex: number
        let molNosToUpdate: number[] = []

        if (moleculeSelectValueRef.current) {
            selectedMoleculeIndex = parseInt(moleculeSelectValueRef.current)
            const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedMoleculeIndex)
            if (typeof selectedMolecule !== 'undefined') {
                await selectedMolecule.addDict(fileContent)
                await selectedMolecule.redraw()
                molNosToUpdate.push(selectedMolecule.molNo)
            }
        } else {
            selectedMoleculeIndex = -999999
            await commandCentre.current.cootCommand({
                returnType: "status",
                command: 'read_dictionary_string',
                commandArgs: [fileContent, selectedMoleculeIndex],
                changesMolecules: []
            }, false)
            await Promise.all(molecules.map(molecule => {
                molecule.cacheLigandDict(fileContent)
                molNosToUpdate.push(molecule.molNo)
                return molecule.redraw()
            }))
        }

        if (createRef.current) {
            const instanceName = tlcValueRef.current
            const result = await commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'get_monomer_and_position_at',
                commandArgs: [instanceName,
                    selectedMoleculeIndex,
                    ...glRef.current.origin.map(coord => -coord)]
            }, true) as moorhen.WorkerResponse<number>
            if (result.data.result.status === "Completed") {
                newMolecule = new MoorhenMolecule(commandCentre, glRef, store, monomerLibraryPath)
                newMolecule.molNo = result.data.result.result
                newMolecule.name = instanceName
                newMolecule.setBackgroundColour(backgroundColor)
                newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
                newMolecule.coordsFormat = 'mmcif'
                await Promise.all([
                    newMolecule.fetchDefaultColourRules(),
                    newMolecule.addDict(fileContent)
                ])
                await newMolecule.fetchIfDirtyAndDraw("CBs")
                dispatch( addMolecule(newMolecule) )
                if (addToMoleculeValueRef.current !== -1) {
                    const toMolecule = molecules.find(molecule => molecule.molNo === addToMoleculeValueRef.current)
                    if (typeof toMolecule !== 'undefined') {
                        molNosToUpdate.push(toMolecule.molNo)
                        const otherMolecules = [newMolecule]
                        await toMolecule.mergeMolecules(otherMolecules, true)
                        await toMolecule.redraw()
                    } else {
                        await newMolecule.redraw()
                    }
                }
            }
        }

        [...new Set(molNosToUpdate)].map(molNo => dispatch(triggerUpdate(molNo)))
        setPopoverIsShown(false)

    }, [moleculeSelectValueRef, createRef, setPopoverIsShown, molecules, commandCentre, glRef, tlcValueRef, monomerLibraryPath, backgroundColor, defaultBondSmoothness, addToMoleculeValueRef])

    const popoverContent = <>
            {panelContent}
            <MoorhenMoleculeSelect molecules={molecules} allowAny={true} ref={moleculeSelectRef} label="Make monomer available to" onChange={(evt) => {
                moleculeSelectValueRef.current = evt.target.value
        }}/>
            <Form.Group key="createInstance" style={{ width: '20rem', margin: '0.5rem' }} controlId="createInstance" className="mb-3">
                <Form.Label>Create instance on read</Form.Label>
                <InputGroup>
                    <SplitButton title={createInstance ? "Yes" : "No"} id="segmented-button-dropdown-1">
                        {/* @ts-ignore */}
                        <Dropdown.Item key="Yes" href="#" onClick={() => {
                            createRef.current = true
                            setCreateInstance(true)
                        }}>Yes</Dropdown.Item>
                        <Dropdown.Item key="No" href="#" onClick={() => {
                            createRef.current = false
                            setCreateInstance(false)
                        }}>No</Dropdown.Item>
                    </SplitButton>
                    <Form.Select disabled={!createInstance} ref={addToRef} value={addToMolecule} onChange={(e) => {
                        setAddToMolecule(e.target.value)
                        addToMoleculeValueRef.current = parseInt(e.target.value)
                    }}>
                        <option key={-1} value={"-1"}>{createInstance ? "...create new molecule" : ""}</option>
                        {molecules.map(molecule => <option key={molecule.molNo} value={molecule.molNo}>
                            ...add to {molecule.name}
                        </option>)}
                    </Form.Select>
                </InputGroup>
            </Form.Group>
    </>

    const onCompleted = useCallback(async () => {
        const ligandDict = await fetchLigandDict()
        if (ligandDict) {
            handleFileContent(ligandDict)
        } else {
            console.log('Unable to get ligand dict...')
        }
    }, [handleFileContent, fetchLigandDict])

    return <MoorhenBaseMenuItem
        id={id}
        popoverContent={popoverContent}
        menuItemText={menuItemText}
        onCompleted={onCompleted}
        setPopoverIsShown={setPopoverIsShown}
    />

}

export const MoorhenSMILESToLigandMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    monomerLibraryPath: string;
    store: ToolkitStore;
}) => {

    const [smile, setSmile] = useState<string>('')
    const [tlc, setTlc] = useState<string>('')
    const [createInstance, setCreateInstance] = useState<boolean>(true)
    const [addToMolecule, setAddToMolecule] = useState<string>('')
    const [conformerCount, setConformerCount] = useState<number>(10)
    const [iterationCount, setIterationCount] = useState<number>(100)
    const [source, setSource] = useState<string>("smiles")

    const smileRef = useRef<null | string>(null)
    const tlcValueRef = useRef<null | string>(null)
    const createRef = useRef<boolean>(true)
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const moleculeSelectValueRef = useRef<null | string>(null)
    const addToRef = useRef<null | HTMLSelectElement>(null)
    const addToMoleculeValueRef = useRef<null | number>(null)
    const conformerCountRef = useRef<number>(10)
    const iterationCountRef = useRef<number>(100)
    const sourceSelectRef = useRef<HTMLSelectElement | null>(null)

    const collectedProps = {
        smile, setSmile, tlc, setTlc, createInstance, setCreateInstance, addToMolecule,
        setAddToMolecule, smileRef, tlcValueRef, createRef, moleculeSelectRef, addToRef,
        addToMoleculeValueRef, moleculeSelectValueRef, ...props
    }

    const smilesToPDB = async (): Promise<string> => {

        let smilesText = ""
        if(sourceSelectRef.current.value==="pubchem"){
            const molSearchUrl = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/"+smileRef.current+"/cids/TXT"
            console.log(molSearchUrl)
            const moleculeSearchResponse = await fetch(molSearchUrl)
            const moleculeIds = await moleculeSearchResponse.text()
            const smilesSearchUrl = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/"+moleculeIds.split("\n")[0]+"/property/CanonicalSMILES/TXT"
            const smilesResponse = await fetch(smilesSearchUrl)
            const pubchemSmiles = await smilesResponse.text()
            console.log(pubchemSmiles)
            smilesText = pubchemSmiles
        } else {
            smilesText = smileRef.current
        }

        if (!smilesText) {
            console.log('Empty smile, do nothing...')
            return
        }

        let n_conformer: number
        let n_iteration: number
        try {
            n_conformer = conformerCountRef.current
            n_iteration = iterationCountRef.current
        } catch (err) {
            console.log(err)
            return
        }

        if ( (isNaN(n_conformer) || n_conformer < 0 || n_conformer === Infinity) ||
            (isNaN(n_iteration) || n_iteration < 0 || n_iteration === Infinity) ) {
            console.log('Unable to parse n_conformer / n_iteration count into a valid int...')
            return
        }

        const response = await props.commandCentre.current.cootCommand({
            command: 'smiles_to_pdb',
            commandArgs: [smilesText, tlcValueRef.current, n_conformer, n_iteration],
            returnType: 'str_str_pair'
        }, true) as moorhen.WorkerResponse<libcootApi.PairType<string, string>>
        const result = response.data.result.result.second

        if (result) {
            return result
        } else {
            console.log('Error creating molecule... Wrong SMILES?')
        }
    }

    const handleSourceChange = async (evt) => {
        setSource(evt.target.value)
    }

    const panelContent = <>
        <Form.Group key="smile" style={{ width: '20rem', margin: '0.5rem' }} controlId="tlc" className="mb-3">
            <Form.Label>Source...</Form.Label>
            <OverlayTrigger
                placement="right"
                overlay={
                    <Tooltip id="tip-tooltip" className="moorhen-tooltip" style={{zIndex: 99999}}>
                        <em>
                            By default, a structure will be created from a user inputted SMILES string.
                            Alternatively, a molecule name can be used in which case the SMILES string will be
                            generated by searching PubChem.
                        </em>
                    </Tooltip>
                }>
                <InfoOutlined style={{marginLeft: '0.1rem', marginBottom: '0.2rem', width: '15px', height: '15px'}}/>
            </OverlayTrigger>
            <FormSelect ref={sourceSelectRef} size="sm" value={source} onChange={handleSourceChange}>
                <option value={"smiles"}>SMILES</option>
                <option value={"pubchem"}>PubChem search</option>
            </FormSelect>
        </Form.Group>

        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="SmilesString" className="mb-3">
            <Form.Control value={smile} type="text"
                onChange={(e) => {
                    setSmile(e.target.value)
                    smileRef.current = e.target.value
                }}/>
        </Form.Group>
        <Form.Group key="tlc" style={{ width: '20rem', margin: '0.5rem' }} controlId="SmilesMoleculeName" className="mb-3">
            <Form.Label>Assign a name</Form.Label>
            <Form.Control value={tlc} type="text"
                onChange={(e) => {
                    setTlc(e.target.value)
                    tlcValueRef.current = e.target.value
                }}/>
        </Form.Group>
        <Form.Group>
            <TextField
                style={{margin: '0.5rem', width: '9rem'}}
                id='conformer-count'
                label='No. of conformers'
                type='number'
                variant="standard"
                error={isNaN(conformerCount) || conformerCount < 0 || conformerCount === Infinity}
                value={conformerCount}
                onChange={(evt) => {
                    conformerCountRef.current = parseInt(evt.target.value)
                    setConformerCount(parseInt(evt.target.value))
                }}
            />
            <TextField
                style={{margin: '0.5rem', width: '9rem'}}
                id='iteration-count'
                label='No. of iterations'
                type='number'
                variant="standard"
                error={isNaN(iterationCount) || iterationCount < 0 || iterationCount === Infinity}
                value={iterationCount}
                onChange={(evt) => {
                    iterationCountRef.current = parseInt(evt.target.value)
                    setIterationCount(parseInt(evt.target.value))
                }}
            />
        </Form.Group>
    </>

    return <MoorhenImportLigandDictionary id='smiles-to-ligand-menu-item' menuItemText="From SMILES..." panelContent={panelContent} fetchLigandDict={smilesToPDB} {...collectedProps} />
}

export const MoorhenImportDictionaryMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    monomerLibraryPath: string;
    store: ToolkitStore;
 }) => {

    const tlcsOfFileRef = useRef<{ comp_id: string; dict_contents: string }[]>([])
    const filesRef = useRef<null | HTMLInputElement>(null)
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const moleculeSelectValueRef = useRef<null | string>(null)
    const addToRef = useRef<null | HTMLSelectElement>(null)
    const addToMoleculeValueRef = useRef<null | number>(null)
    const tlcSelectRef = useRef<null | HTMLSelectElement>(null)
    const tlcValueRef = useRef<null | string>(null)
    const createRef = useRef<boolean>(true)

    const [tlc, setTlc] = useState<string>('')
    const [addToMolecule, setAddToMolecule] = useState<string>('')
    const [createInstance, setCreateInstance] = useState<boolean>(true)
    const [validDictFile, setValidDictFile] = useState<boolean>(true)
    const [tlcsOfFile, setTlcsOfFile] = useState<{ comp_id: string; dict_contents: string }[]>([])

    const { enqueueSnackbar } = useSnackbar()

    const collectedProps = {
        tlc, setTlc, createInstance, setCreateInstance, addToMolecule,
        setAddToMolecule, tlcValueRef, createRef, moleculeSelectRef, addToRef,
        addToMoleculeValueRef, moleculeSelectValueRef, ...props
    }

    const parseCifDict = async (file: File) => {
        let result: { comp_id: string; dict_contents: string }[] = []
        const fileContent = await readTextFile(file) as string
        const compIdsVector = window.CCP4Module.parse_ligand_dict_info(fileContent)
        const compIdsVectorSize = compIdsVector.size()
        for (let i = 0; i < compIdsVectorSize; i++) {
            const ligandInfo = compIdsVector.get(i)
            result.push({ ...ligandInfo })
        }
        compIdsVector.delete()
        return result
    }

    const panelContent = <>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} className="mb-3"
            onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                const tlcs = await parseCifDict(e.target.files[0])
                if (tlcs.length > 0) {
                    tlcsOfFileRef.current = tlcs
                    setTlcsOfFile(tlcs)
                    setTlc(tlcs[0].comp_id)
                    setValidDictFile(true)
                    tlcValueRef.current = tlcs[0].comp_id
                } else {
                    setValidDictFile(false)
                }
            }}>
            <Form.Label>Browse...</Form.Label>
            <Form.Control ref={filesRef} type="file" accept={".cif, .dict, .mmcif"} multiple={false} style={{borderColor: validDictFile ?  '#c2c2c2' : 'red', borderWidth: validDictFile ? '0.1rem' : '0.15rem'}}/>
            {!validDictFile && <span>Unable to parse</span>}
        </Form.Group>
        {createInstance &&
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} className="mb-3">
        <Form.Label>Monomer identifier</Form.Label>
            <Form.Select ref={tlcSelectRef} value={tlc} onChange={(newVal) => {
                setTlc(newVal.target.value)
                tlcValueRef.current = newVal.target.value
            }}>
                {tlcsOfFile.map(tlcOfFile => <option key={tlcOfFile.comp_id} value={tlcOfFile.comp_id}>{tlcOfFile.comp_id}</option>)}
            </Form.Select>
        </Form.Group>
        }
    </>

    const fetchLigandDict = async (): Promise<string> => {
        if (filesRef.current.files.length > 0 && tlcValueRef.current) {
            const ligandInfo = tlcsOfFileRef.current.find(lig => lig.comp_id === tlcValueRef.current)
            if (ligandInfo) {
                return ligandInfo.dict_contents
            } else {
                console.warn(`Unable to parse ligand dictionary`)
                enqueueSnackbar("Unable to import ligand", { variant: "error" })
            }
        }
    }

    return <MoorhenImportLigandDictionary id='import-dict-menu-item' menuItemText="Import dictionary..." panelContent={panelContent} fetchLigandDict={fetchLigandDict} {...collectedProps} />
}
