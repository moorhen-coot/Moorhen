import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, FormSelect, OverlayTrigger, Stack, Tooltip } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector, useDispatch } from 'react-redux';
import { addMolecule } from "../../store/moleculesSlice";
import { ToolkitStore } from "@reduxjs/toolkit/dist/configureStore";
import { useSnackbar } from "notistack";
import { Autocomplete, CircularProgress, createFilterOptions, MenuItem, Skeleton, TextField } from "@mui/material";
import { libcootApi } from "../../types/libcoot";
import parse from 'html-react-parser';
import { InfoOutlined } from "@mui/icons-material";

const CompoundAutoCompleteOption = (props: {
    compoundName: string;
    monLibListRef: React.RefObject<libcootApi.compoundInfo[]>;
    setValue: (newVal: string) => void;
}) => {

    const [ligandSVG, setLigandSVG] = useState<string>("")

    const tooltip = useMemo(() => {
        return <Tooltip style={{ zIndex: 99999 }}>
            {ligandSVG ? parse(ligandSVG) : <Skeleton variant="rectangular" width={100} height={100} />}
            <br></br>
            <strong>{props.compoundName}</strong>
        </Tooltip>
    }, [ligandSVG])

    useEffect(() => {
        const fetchLigandSVG = async () => {
            const threeLetterCode = props.monLibListRef.current.find(item => item.name === props.compoundName)?.three_letter_code
            const response = await fetch(`https://www.ebi.ac.uk/pdbe/static/files/pdbechem_v2/${threeLetterCode}_100.svg`)
            const text = await response.text()
            setLigandSVG(text)
        }
        fetchLigandSVG()
    }, [])

    return <OverlayTrigger placement="right" overlay={tooltip}>
        <MenuItem onClick={() => props.setValue(props.compoundName)}>
            <Stack direction="horizontal" gap={1} style={{ width: "100%" }}>
                {ligandSVG ? parse(ligandSVG) : <Skeleton variant="rectangular" width={100} height={100} />}
                <span style={{ width: '100%', overflow: "hidden" }}>
                    {props.compoundName}
                </span>
            </Stack>
        </MenuItem>
    </OverlayTrigger>
}

export const MoorhenGetMonomerMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>
    popoverPlacement?: 'left' | 'right'
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    monomerLibraryPath: string;
    store: ToolkitStore;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const tlcRef = useRef<HTMLInputElement>()
    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null)
    const searchModeSelectRef = useRef<HTMLSelectElement | null>(null)
    const monLibListRef = useRef<libcootApi.compoundInfo[]>([])
    const autoCompleteRef = useRef<string | null>(null)
    const sourceSelectRef = useRef<HTMLSelectElement | null>(null)

    const [source, setSource] = useState<string>("default")
    const [searchMode, setSearchMode] = useState<string>("tlc")
    const [busy, setBusy] = useState<boolean>(false)
    const [autoCompleteValue, setAutoCompleteValue] = useState<string>("")
    const [autocompleteOpen, setAutocompleteOpen] = useState<boolean>(false)

    const dispatch = useDispatch()

    const originState = useSelector((state: moorhen.State) => state.glRef.origin)

    const { enqueueSnackbar } = useSnackbar()

    const filterOptions = useMemo(() => createFilterOptions({
        ignoreCase: true,
        matchFrom: "start",
        limit: 5
    }), [])

    const handleSourceChange = (evt) => {
        setSource(evt.target.value)
        if (evt.target.value !== "default") {
            setSearchMode("tlc")
        }
    }

    const handleSearchModeChange = async (evt) => {
        setSearchMode(evt.target.value)
        if (evt.target.value === "name" && monLibListRef.current.length === 0) {
            setBusy(true)
            const response = await fetch("https://raw.githubusercontent.com/MonomerLibrary/monomers/master/list/mon_lib_list.cif")
            if (response.ok) {
                const fileContents = await response.text()
                const table = await props.commandCentre.current.cootCommand({
                    command: 'parse_mon_lib_list_cif',
                    commandArgs: [fileContents],
                    returnType: 'status'
                }, false) as moorhen.WorkerResponse<libcootApi.compoundInfo[]>
                monLibListRef.current = table.data.result.result
            } else {
                enqueueSnackbar("Unable to fetch ligand names", { variant: "warning" })
                setSearchMode("tlc")
            }
            setBusy(false)
        }
    }

    const getMonomerFromLibcootAPI = useCallback((tlc: string, fromMolNo: number) => {
        return props.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'get_monomer_and_position_at',
            commandArgs: [tlc, fromMolNo,
                ...originState.map(coord => -coord)
            ]
        }, true) as Promise<moorhen.WorkerResponse<number>>
    }, [])

    const createNewLigandMolecule = useCallback(async (tlc: string, molNo: number, ligandDict?: string) => {
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.store, props.monomerLibraryPath)
        newMolecule.molNo = molNo
        newMolecule.name = tlc
        newMolecule.setBackgroundColour(backgroundColor)
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
        newMolecule.coordsFormat = 'mmcif'
        if (ligandDict) {
            await newMolecule.addDict(ligandDict)
        }
        await newMolecule.fetchIfDirtyAndDraw('CBs')
        dispatch(addMolecule(newMolecule))
        return newMolecule
    }, [defaultBondSmoothness, props.commandCentre, props.glRef, props.store, props.monomerLibraryPath])

    const addLigand = useCallback(async (tlc: string, ligandDict: string, fromMolNo: number) => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === fromMolNo)
        if (selectedMolecule) {
            await selectedMolecule.addDict(ligandDict)
        } else {
            await props.commandCentre.current.cootCommand({
                returnType: "status",
                command: 'read_dictionary_string',
                commandArgs: [ligandDict, -999999],
                changesMolecules: []
            }, false)
        }

        const result = await getMonomerFromLibcootAPI(tlc, fromMolNo)
        if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
            await createNewLigandMolecule(tlc, result.data.result.result, ligandDict)
        } else {
            enqueueSnackbar("Error getting monomer. Missing dictionary?", { variant: "warning" })
        }
    }, [getMonomerFromLibcootAPI, createNewLigandMolecule, molecules, props.commandCentre])

    const fetchLigandDictFromUrl = useCallback(async (url: string) => {
        const response = await fetch(url)
        if (!response.ok) {
            console.log(`Cannot fetch data from ${url}`)
        } else {
            const fileContent = await response.text()
            return fileContent
        }
    }, [])

    const fetchLigandDict = useCallback(async (source: string, tlc: string, fromMolNo: number = -999999) => {
        let url: string
        switch(source) {
            case "pdbe":
                url = `https://www.ebi.ac.uk/pdbe/static/files/pdbechem_v2/${tlc.toUpperCase()}.cif`
                break
            case "remote-monomer-library":
                url = `https://raw.githubusercontent.com/MonomerLibrary/monomers/master/${tlc.toLowerCase()[0]}/${tlc.toUpperCase()}.cif`
                break
            case "local-monomer-library":
                url = `${props.monomerLibraryPath}/${tlc.toLowerCase()[0]}/${tlc.toUpperCase()}.cif`
                break
            default:
                console.warn(`Unrecognised ligand source ${source}`)
                break
        }
        if (url) {
            const ligandDict = await fetchLigandDictFromUrl(url)
            await addLigand(tlc, ligandDict, fromMolNo)
        } else {
            console.warn("No ligand dictionary, doing nothing...")
        }
    }, [fetchLigandDictFromUrl, addLigand, props.monomerLibraryPath])

    const defaultGetMonomer = useCallback(async () => {
        const fromMolNo = parseInt(moleculeSelectRef.current.value)

        let newTlc: string
        if (searchModeSelectRef.current.value === "tlc") {
            newTlc = tlcRef.current.value.toUpperCase()
        } else {
            newTlc = monLibListRef.current.find(item => item.name === autoCompleteRef.current)?.three_letter_code
        }

        if (!newTlc || !moleculeSelectRef.current.value) {
            enqueueSnackbar("Something went wrong", { variant: "warning" })
            return
        }

        let result = await getMonomerFromLibcootAPI(newTlc, fromMolNo)

        if (result.data.result.result === -1) {
            const newMolecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.store, props.monomerLibraryPath)
            await newMolecule.loadMissingMonomer(newTlc, fromMolNo)
            result = await getMonomerFromLibcootAPI(newTlc, fromMolNo)
        }

        if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
            const fromMolecule = molecules.find(molecule => molecule.molNo === fromMolNo)
            await createNewLigandMolecule(newTlc, result.data.result.result, fromMolecule?.getDict(newTlc))
        } else {
            enqueueSnackbar("Error getting monomer. Missing dictionary?", { variant: 'warning' })
            console.log('Error getting monomer. Missing dictionary?')
        }
    }, [getMonomerFromLibcootAPI, createNewLigandMolecule, molecules, props.commandCentre, props.glRef, props.store, props.monomerLibraryPath])

    const onCompleted = useCallback(async () => {
        if (sourceSelectRef.current.value === "libcoot-api") {
            const tlc = tlcRef.current.value.toUpperCase()
            const fromMolNo = parseInt(moleculeSelectRef.current.value)
            const result = await getMonomerFromLibcootAPI(tlc, fromMolNo)
            if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
                const fromMolecule = molecules.find(molecule => molecule.molNo === fromMolNo)
                await createNewLigandMolecule(tlc, result.data.result.result, fromMolecule?.getDict(tlc))
            } else {
                enqueueSnackbar("Unable to get monomer. Missing dictionary?", { variant: "warning" })
            }
        } else if (["remote-monomer-library", "local-monomer-library", "pdbe"].includes(sourceSelectRef.current.value)) {
            const tlc = tlcRef.current.value.toUpperCase()
            await fetchLigandDict(sourceSelectRef.current.value, tlc)
        } else {
            await defaultGetMonomer()
        }
    }, [molecules, defaultGetMonomer, fetchLigandDict, getMonomerFromLibcootAPI, createNewLigandMolecule])

    const panelContent = <>
            <Form.Group className='moorhen-form-group'>
            <Form.Label>Source...</Form.Label>
            <OverlayTrigger
                placement="right"
                overlay={
                    <Tooltip id="tip-tooltip" className="moorhen-tooltip" style={{zIndex: 99999}}>
                        <em>
                            By default, "Get monomer" will search in each of the following sources until a match is found
                            for your monomer. You can instead override this behaviour by selecting a specific source for your monomer.
                        </em>
                    </Tooltip>
                }>
                <InfoOutlined style={{marginLeft: '0.1rem', marginBottom: '0.2rem', width: '15px', height: '15px'}}/>
            </OverlayTrigger>
            <FormSelect ref={sourceSelectRef} size="sm" value={source} onChange={handleSourceChange}>
                <option value={"default"}>Default</option>
                <option value={"libcoot-api"}>Imported dictionary</option>
                <option value={"local-monomer-library"}>Local monomer library</option>
                <option value={"remote-monomer-library"}>Remote monomer library</option>
                <option value={"pdbe"}>PDBe</option>
            </FormSelect>
        </Form.Group>
        {["default", "libcoot-api"].includes(source) &&
        <MoorhenMoleculeSelect molecules={molecules} allowAny={true} ref={moleculeSelectRef} />
        }
        {source === "default" &&
        <Form.Group className='moorhen-form-group'>
            <Form.Label>Search by...</Form.Label>
            <FormSelect ref={searchModeSelectRef} size="sm" value={searchMode} onChange={handleSearchModeChange}>
                <option value={"tlc"}>Three letter code</option>
                <option value={"name"}>Compound name</option>
            </FormSelect>
        </Form.Group>
        }
        {searchMode === "tlc" ?
            <Form.Group className='moorhen-form-group' controlId="MoorhenGetMonomerMenuItem">
                <Form.Label>Monomer identifier</Form.Label>
                <Form.Control ref={tlcRef} type="text" size="sm" style={{ textTransform: 'uppercase' }} />
            </Form.Group>
            :
            <Form.Group className='moorhen-form-group' controlId="MoorhenGetMonomerMenuItem">
                <Form.Label>Compound Name</Form.Label>
                <Autocomplete
                    disablePortal
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    freeSolo
                    includeInputInList
                    filterSelectedOptions
                    size='small'
                    loading={busy}
                    value={autoCompleteValue}
                    open={autocompleteOpen}
                    onClose={() => setAutocompleteOpen(false)}
                    onOpen={() => setAutocompleteOpen(true)}
                    renderInput={(params) => <TextField {...params} label="Search" InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {busy ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }} />}
                    renderOption={(props, option: string) => {
                        return <CompoundAutoCompleteOption key={option} compoundName={option} monLibListRef={monLibListRef} setValue={(newVal) => {
                            autoCompleteRef.current = newVal
                            setAutoCompleteValue(newVal)
                            setAutocompleteOpen(false)
                        }}/>
                    }}
                    options={monLibListRef.current.map(item => item.name)}
                    filterOptions={filterOptions}
                    onChange={(evt, newSelection: string) => {
                        autoCompleteRef.current = newSelection
                        if (newSelection === null) {
                            setAutoCompleteValue(newSelection)
                        }
                        setAutocompleteOpen(false)
                    }}
                    sx={{
                        '& .MuiInputBase-root': {
                            backgroundColor: isDark ? '#222' : 'white',
                            color: isDark ? 'white' : '#222',
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: isDark ? 'white' : 'grey',
                        },
                        '& .MuiButtonBase-root': {
                            color: isDark ? 'white' : 'grey',
                        },
                        '& .MuiFormLabel-root': {
                            color: isDark ? 'white' : '#222',
                        },
                    }}
                />
            </Form.Group>
        }
        <Button variant='primary' onClick={onCompleted}>
            OK
        </Button>
    </>

    return <MoorhenBaseMenuItem
        id='get-monomer-menu-item'
        popoverContent={panelContent}
        menuItemText="Get monomer..."
        onCompleted={() => {}}
        showOkButton={false}
        setPopoverIsShown={props.setPopoverIsShown}
        popoverPlacement={props.popoverPlacement ?? "right"}
    />
}
