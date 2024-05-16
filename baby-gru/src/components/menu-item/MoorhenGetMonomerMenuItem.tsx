import { useEffect, useMemo, useRef, useState } from "react";
import { Form, FormSelect, OverlayTrigger, Stack, Tooltip } from "react-bootstrap";
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

    const dispatch = useDispatch()

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const tlcRef = useRef<HTMLInputElement>()
    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null)
    const searchModeSelectRef = useRef<HTMLSelectElement | null>(null)
    const monLibListRef = useRef<libcootApi.compoundInfo[]>([])
    const autoCompleteRef = useRef<string | null>(null)

    const [searchMode, setSearchMode] = useState<string>("tlc")
    const [busy, setBusy] = useState<boolean>(false)
    const [autoCompleteValue, setAutoCompleteValue] = useState<string>("")
    const [autocompleteOpen, setAutocompleteOpen] = useState<boolean>(false)

    const { enqueueSnackbar } = useSnackbar()

    const filterOptions = useMemo(() => createFilterOptions({
        ignoreCase: true,
        matchFrom: "start",
        limit: 5
    }), [])

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

    const panelContent = <>
        <MoorhenMoleculeSelect molecules={molecules} allowAny={true} ref={moleculeSelectRef} />
        <Form.Group className='moorhen-form-group'>
            <Form.Label>Search by...</Form.Label>
            <FormSelect ref={searchModeSelectRef} size="sm" value={searchMode} onChange={handleSearchModeChange}>
                <option value={"tlc"}>Three letter code</option>
                <option value={"name"}>Compound name</option>
            </FormSelect>
        </Form.Group>
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
    </>

    const onCompleted = async () => {
        const fromMolNo = parseInt(moleculeSelectRef.current.value)
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.store, props.monomerLibraryPath)

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

        const getMonomer = () => {
            return props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'get_monomer_and_position_at',
                commandArgs: [newTlc, fromMolNo,
                    ...props.glRef.current.origin.map(coord => -coord)
                ]
            }, true) as Promise<moorhen.WorkerResponse<number>>
        }

        let result = await getMonomer()

        if (result.data.result.result === -1) {
            await newMolecule.loadMissingMonomer(newTlc, fromMolNo)
            result = await getMonomer()
        }

        if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
            newMolecule.molNo = result.data.result.result
            newMolecule.name = newTlc
            newMolecule.setBackgroundColour(props.glRef.current.background_colour)
            newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
            newMolecule.coordsFormat = 'mmcif'
            const fromMolecule = molecules.find(molecule => molecule.molNo === fromMolNo)
            if (typeof fromMolecule !== 'undefined') {
                const ligandDict = fromMolecule.getDict(newTlc)
                if (ligandDict) {
                    await newMolecule.addDict(ligandDict)
                }
            }
            await newMolecule.fetchIfDirtyAndDraw('CBs')
            dispatch(addMolecule(newMolecule))
        } else {
            enqueueSnackbar("Error getting monomer. Missing dictionary?", { variant: 'warning' })
            console.log('Error getting monomer. Missing dictionary?')
        }
    }

    return <MoorhenBaseMenuItem
        id='get-monomer-menu-item'
        popoverContent={panelContent}
        menuItemText="Get monomer..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
        popoverPlacement={props.popoverPlacement}
    />
}

MoorhenGetMonomerMenuItem.defaultProps = { popoverPlacement: "right" }
