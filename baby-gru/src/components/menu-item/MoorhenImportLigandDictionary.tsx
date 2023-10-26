import { useCallback, useEffect, useRef, useState } from "react"
import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { Dropdown, Form, InputGroup, SplitButton } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { TextField } from "@mui/material"
import { readTextFile } from "../../utils/MoorhenUtils"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { libcootApi } from "../../types/libcoot"
import { useSelector, useDispatch } from 'react-redux';
import { addMolecule } from "../../store/moleculesSlice"

const MoorhenImportLigandDictionary = (props: { 
    id: string;
    menuItemText: string;
    createInstance: boolean;
    setCreateInstance: React.Dispatch<React.SetStateAction<boolean>>;
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    monomerLibraryPath: string;
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
    const backgroundColor = useSelector((state: moorhen.State) => state.canvasStates.backgroundColor)
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const {
        createInstance, setCreateInstance, addToMolecule, fetchLigandDict, panelContent,
        setAddToMolecule, tlcValueRef, createRef, moleculeSelectRef, addToRef,moleculeSelectValueRef,
        addToMoleculeValueRef, setPopoverIsShown, glRef, commandCentre, menuItemText,
        monomerLibraryPath, id
    } = props

    const handleFileContent = useCallback(async (fileContent: string) => {
        let newMolecule: moorhen.Molecule
        let selectedMoleculeIndex: number
        
        if (moleculeSelectValueRef.current) {
            selectedMoleculeIndex = parseInt(moleculeSelectValueRef.current)
            const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedMoleculeIndex)
            if (typeof selectedMolecule !== 'undefined') {
                selectedMolecule.addDict(fileContent)
            }
        } else {
            selectedMoleculeIndex = -999999
            await Promise.all([
                commandCentre.current.cootCommand({
                    returnType: "status",
                    command: 'read_dictionary_string',
                    commandArgs: [fileContent, selectedMoleculeIndex],
                    changesMolecules: []
                }, false),
                ...molecules.map(molecule => {
                    molecule.addDictShim(fileContent)
                    return molecule.redraw()
                })
            ])
            
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
                newMolecule = new MoorhenMolecule(commandCentre, glRef, monomerLibraryPath)
                newMolecule.molNo = result.data.result.result
                newMolecule.name = instanceName
                newMolecule.setBackgroundColour(backgroundColor)
                newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
                await Promise.all([
                    newMolecule.fetchDefaultColourRules(),
                    newMolecule.addDict(fileContent)
                ])
                await newMolecule.fetchIfDirtyAndDraw("CBs")
                dispatch( addMolecule(newMolecule) )
                if (addToMoleculeValueRef.current !== -1) {
                    const toMolecule = molecules.find(molecule => molecule.molNo === addToMoleculeValueRef.current)
                    if (typeof toMolecule !== 'undefined') {
                        const otherMolecules = [newMolecule]
                        await toMolecule.mergeMolecules(otherMolecules, true)
                        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: glRef.current.origin, modifiedMolecule: toMolecule.molNo } })
                        document.dispatchEvent(scoresUpdateEvent)
                        await toMolecule.redraw()
                    } else {
                        await newMolecule.redraw()
                    }
                }
            }
        }

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
}) => {

    const [smile, setSmile] = useState<string>('')
    const [tlc, setTlc] = useState<string>('')
    const [createInstance, setCreateInstance] = useState<boolean>(true)
    const [addToMolecule, setAddToMolecule] = useState<string>('')
    const [conformerCount, setConformerCount] = useState<number>(10)
    const [iterationCount, setIterationCount] = useState<number>(100)

    const smileRef = useRef<null | string>(null)
    const tlcValueRef = useRef<null | string>(null)
    const createRef = useRef<boolean>(true)
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const moleculeSelectValueRef = useRef<null | string>(null)
    const addToRef = useRef<null | HTMLSelectElement>(null)
    const addToMoleculeValueRef = useRef<null | number>(null)
    const conformerCountRef = useRef<number>(10)
    const iterationCountRef = useRef<number>(100)

    const collectedProps = {
        smile, setSmile, tlc, setTlc, createInstance, setCreateInstance, addToMolecule,
        setAddToMolecule, smileRef, tlcValueRef, createRef, moleculeSelectRef, addToRef,
        addToMoleculeValueRef, moleculeSelectValueRef, ...props
    }

    const smilesToPDB = async (): Promise<string> => {
        if (!smileRef.current) {
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
            commandArgs: [smileRef.current, tlcValueRef.current, n_conformer, n_iteration],
            returnType: 'str_str_pair'
        }, true) as moorhen.WorkerResponse<libcootApi.PairType<string, string>>
        const result = response.data.result.result.second

        if (result) {
            return result
        } else {
            console.log('Error creating molecule... Wrong SMILES?')
        }
    }

    const panelContent = <>
        <Form.Group key="smile" style={{ width: '20rem', margin: '0.5rem' }} controlId="tlc" className="mb-3">
            <Form.Label>Type a smile</Form.Label>
            <Form.Control value={smile} type="text" 
                onChange={(e) => {
                    setSmile(e.target.value)
                    smileRef.current = e.target.value
                }}/>
        </Form.Group>            
        <Form.Group key="tlc" style={{ width: '20rem', margin: '0.5rem' }} controlId="tlc" className="mb-3">
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
 }) => {
    
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
    const [fileOrLibrary, setFileOrLibrary] = useState<string>("Library")
    const fileOrLibraryRef = useRef<string>("Library")
    const [createInstance, setCreateInstance] = useState<boolean>(true)
    const [validDictFile, setValidDictFile] = useState<boolean>(true)
    const [tlcsOfFile, setTlcsOfFile] = useState([])

    const collectedProps = {
        tlc, setTlc, createInstance, setCreateInstance, addToMolecule,
        setAddToMolecule, tlcValueRef, createRef, moleculeSelectRef, addToRef,
        addToMoleculeValueRef, moleculeSelectValueRef, ...props
    }

    const panelContent = <>
        <Form.Group key="fileOrLibrary" style={{ width: '20rem', margin: '0.5rem' }} controlId="fileOrLibrary" className="mb-3">
            <Form.Label>Select a source</Form.Label>
            <Form.Select value={fileOrLibrary} onChange={(e) => { setFileOrLibrary(e.target.value) }}>
                <option key="File" value="File">From local file</option>
                <option key="Library" value="Library">From monomer library</option>
                <option key="MRC" value="MRC">Fetch from MRC-LMB</option>
            </Form.Select>
        </Form.Group>
        {fileOrLibrary === 'File' ? <>
            <Form.Group key="uploadDicts" style={{ width: '20rem', margin: '0.5rem' }} controlId="uploadDicts" className="mb-3"
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const fileContent = await readTextFile(e.target.files[0]) as string
                    const rx = /data_comp_(.*)/g;
                    const tlcs = [...fileContent.matchAll(rx)].map(array => array[1]).filter(item => item !== 'list')
                    if (tlcs.length > 0) {
                        setTlcsOfFile(tlcs)
                        setTlc(tlcs[0])
                        setValidDictFile(true)
                        tlcValueRef.current = tlcs[0]
                    } else {
                        setValidDictFile(false)
                    }
                }}>
                <Form.Label>Browse...</Form.Label>
                <Form.Control ref={filesRef} type="file" accept={".cif, .dict, .mmcif"} multiple={false} style={{borderColor: validDictFile ?  '#c2c2c2' : 'red', borderWidth: validDictFile ? '0.1rem' : '0.15rem'}}/>
                {!validDictFile && <span>Unable to parse</span>}
            </Form.Group>
            {createInstance &&
                <Form.Select ref={tlcSelectRef} value={tlc} onChange={(newVal) => { setTlc(newVal.target.value) }} style={{ width: '20rem', margin: '0.5rem' }} >
                    {tlcsOfFile.map(tlcOfFile => <option key={tlcOfFile} value={tlcOfFile}>{tlcOfFile}</option>)}
                </Form.Select>
            }
        </>
        :
            <Form.Group key="tlc" style={{ width: '20rem', margin: '0.5rem' }} controlId="tlc" className="mb-3">
                <Form.Label>Three letter code</Form.Label>
                <Form.Control value={tlc}
                    onChange={(e) => {
                        setTlc(e.target.value)
                        tlcValueRef.current = e.target.value.toUpperCase()
                    }}
                    type="text" />
            </Form.Group>
        }
    </>

    useEffect(() => {
        fileOrLibraryRef.current = fileOrLibrary
    }, [fileOrLibrary])

    const fetchLigandDictFromUrl = async (url: string) => {
        const response = await fetch(url)
        if (!response.ok) {
            console.log(`Cannot fetch data from ${url}`)
        } else {
            const fileContent = await response.text()
            return fileContent
        }
    }

    const fetchLigandDict = async (): Promise<string> => {
        if (fileOrLibraryRef.current === "File" && filesRef.current.files.length > 0 && tlcValueRef.current) {
            return readTextFile(filesRef.current.files[0]) as Promise<string>
        }
        else if (fileOrLibraryRef.current === "Library" && tlcValueRef.current) {
            const url = `${props.monomerLibraryPath}/${tlcValueRef.current.toLowerCase()[0]}/${tlcValueRef.current.toUpperCase()}.cif`
            return fetchLigandDictFromUrl(url)
        } else if (fileOrLibraryRef.current === "MRC" && tlcValueRef.current) {
            const url = `https://raw.githubusercontent.com/MRC-LMB-ComputationalStructuralBiology/monomers/master/${tlcValueRef.current.toLowerCase()[0]}/${tlcValueRef.current.toUpperCase()}.cif`
            return fetchLigandDictFromUrl(url)
        } else {
            console.log(`Unkown ligand source or invalid input`)
        }
    }

    return <MoorhenImportLigandDictionary id='import-dict-menu-item' menuItemText="Import dictionary..." panelContent={panelContent} fetchLigandDict={fetchLigandDict} {...collectedProps} />
}
