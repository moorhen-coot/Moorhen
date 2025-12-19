import { Autocomplete, CircularProgress, MenuItem, Skeleton, TextField, createFilterOptions } from "@mui/material";
import parse from "html-react-parser";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCommandCentre, usePaths } from "../../InstanceManager";
import { addMolecule } from "../../store/moleculesSlice";
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenButton, MoorhenSelect, MoorhenTextInput } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenInfoCard, MoorhenPopover, MoorhenStack } from "../interface-base";

const CompoundAutoCompleteOption = (props: {
    compoundName: string;
    monLibListRef: React.RefObject<libcootApi.compoundInfo[]>;
    setValue: (newVal: string) => void;
}) => {
    const [ligandSVG, setLigandSVG] = useState<string>("");
    const [isShown, setIsShown] = useState<boolean>(false);

    const tooltip = useMemo(() => {
        return (
            <div
                style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                }}
            >
                <div style={{ maxWidth: "300px", maxHeight: "300px", overflow: "hidden" }}>
                    {ligandSVG ? parse(ligandSVG) : <Skeleton variant="rectangular" width={100} height={100} />}
                </div>
                <br></br>
                <strong>{props.compoundName}</strong>
            </div>
        );
    }, [ligandSVG]);

    useEffect(() => {
        const fetchLigandSVG = async () => {
            const threeLetterCode = props.monLibListRef.current.find(item => item.name === props.compoundName)?.three_letter_code;
            const response = await fetch(`https://www.ebi.ac.uk/pdbe/static/files/pdbechem_v2/${threeLetterCode}_300.svg`);
            const text = await response.text();
            setLigandSVG(text);
        };
        fetchLigandSVG();
    }, []);

    const popoverLinkRef = useRef<HTMLButtonElement>(null);

    const popoverLink = (
        <button
            ref={popoverLinkRef}
            onMouseEnter={() => setIsShown(true)}
            onMouseLeave={() => setIsShown(false)}
            onClick={() => props.setValue(props.compoundName)}
            style={{ all: "unset", width: "18rem", height: "6rem", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
            <div style={{ width: "100px", height: "100px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {ligandSVG ? parse(ligandSVG) : <Skeleton variant="rectangular" width={100} height={100} />}
            </div>
            <span style={{ width: "12rem", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{props.compoundName}</span>
        </button>
    );

    return (
        <MoorhenPopover link={popoverLink} linkRef={popoverLinkRef} isShown={isShown} setIsShown={setIsShown} popoverPlacement="right">
            {tooltip}
        </MoorhenPopover>
    );
};

export const GetMonomer = () => {
    const store = useStore();
    const commandCentre = useCommandCentre();
    const monomerLibraryPath = usePaths().monomerLibraryPath;
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);

    const tlcRef = useRef<HTMLInputElement>(null);
    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null);
    const searchModeSelectRef = useRef<HTMLSelectElement | null>(null);
    const monLibListRef = useRef<libcootApi.compoundInfo[]>([]);
    const autoCompleteRef = useRef<string | null>(null);
    const sourceSelectRef = useRef<HTMLSelectElement | null>(null);

    const [source, setSource] = useState<string>("default");
    const [searchMode, setSearchMode] = useState<string>("tlc");
    const [busy, setBusy] = useState<boolean>(false);
    const [autoCompleteValue, setAutoCompleteValue] = useState<string>("");
    const [autocompleteOpen, setAutocompleteOpen] = useState<boolean>(false);

    const dispatch = useDispatch();

    const originState = useSelector((state: moorhen.State) => state.glRef.origin);

    const { enqueueSnackbar } = useSnackbar();

    const filterOptions = useMemo(
        () =>
            createFilterOptions({
                ignoreCase: true,
                matchFrom: "start",
                limit: 5,
            }),
        []
    );

    const handleSourceChange = evt => {
        setSource(evt.target.value);
        if (evt.target.value !== "default") {
            setSearchMode("tlc");
        }
    };

    const handleSearchModeChange = async evt => {
        setSearchMode(evt.target.value);
        if (evt.target.value === "name" && monLibListRef.current.length === 0) {
            setBusy(true);
            const response = await fetch("https://raw.githubusercontent.com/MonomerLibrary/monomers/master/list/mon_lib_list.cif");
            if (response.ok) {
                const fileContents = await response.text();
                const table = (await commandCentre.current.cootCommand(
                    {
                        command: "parse_mon_lib_list_cif",
                        commandArgs: [fileContents],
                        returnType: "status",
                    },
                    false
                )) as moorhen.WorkerResponse<libcootApi.compoundInfo[]>;
                monLibListRef.current = table.data.result.result;
            } else {
                enqueueSnackbar("Unable to fetch ligand names", { variant: "warning" });
                setSearchMode("tlc");
            }
            setBusy(false);
        }
    };

    const getMonomerFromLibcootAPI = useCallback((tlc: string, fromMolNo: number) => {
        return commandCentre.current.cootCommand(
            {
                returnType: "status",
                command: "get_monomer_and_position_at",
                commandArgs: [tlc, fromMolNo, ...originState.map(coord => -coord)],
            },
            true
        ) as Promise<moorhen.WorkerResponse<number>>;
    }, []);

    const createNewLigandMolecule = useCallback(
        async (tlc: string, molNo: number, ligandDict?: string) => {
            const newMolecule = new MoorhenMolecule(commandCentre, store, monomerLibraryPath);
            newMolecule.molNo = molNo;
            newMolecule.name = tlc;
            newMolecule.setBackgroundColour(backgroundColor);
            newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness;
            newMolecule.coordsFormat = "mmcif";
            if (ligandDict) {
                await newMolecule.addDict(ligandDict);
            }
            await newMolecule.fetchIfDirtyAndDraw("CBs");
            dispatch(addMolecule(newMolecule));
            return newMolecule;
        },
        [defaultBondSmoothness]
    );

    const addLigand = useCallback(
        async (tlc: string, ligandDict: string, fromMolNo: number) => {
            const selectedMolecule = molecules.find(molecule => molecule.molNo === fromMolNo);
            if (selectedMolecule) {
                await selectedMolecule.addDict(ligandDict);
            } else {
                await commandCentre.current.cootCommand(
                    {
                        returnType: "status",
                        command: "read_dictionary_string",
                        commandArgs: [ligandDict, -999999],
                        changesMolecules: [],
                    },
                    false
                );
            }

            const result = await getMonomerFromLibcootAPI(tlc, fromMolNo);
            if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
                await createNewLigandMolecule(tlc, result.data.result.result, ligandDict);
            } else {
                enqueueSnackbar("Error getting monomer. Missing dictionary?", { variant: "warning" });
            }
        },
        [getMonomerFromLibcootAPI, createNewLigandMolecule, molecules, commandCentre]
    );

    const fetchLigandDictFromUrl = async (url: string) => {
        const response = await fetch(url);
        if (!response.ok) {
            console.log(`Cannot fetch data from ${url}`);
        } else {
            const fileContent = await response.text();
            return fileContent;
        }
    };

    const fetchLigandDict = useCallback(
        async (source: string, tlc: string, fromMolNo: number = -999999) => {
            let url: string;
            switch (source) {
                case "pdbe":
                    url = `https://www.ebi.ac.uk/pdbe/static/files/pdbechem_v2/${tlc.toUpperCase()}.cif`;
                    break;
                case "remote-monomer-library":
                    url = `https://raw.githubusercontent.com/MonomerLibrary/monomers/master/${tlc.toLowerCase()[0]}/${tlc.toUpperCase()}.cif`;
                    break;
                case "local-monomer-library":
                    url = `${monomerLibraryPath}/${tlc.toLowerCase()[0]}/${tlc.toUpperCase()}.cif`;
                    break;
                default:
                    console.warn(`Unrecognised ligand source ${source}`);
                    break;
            }
            if (url) {
                const ligandDict = await fetchLigandDictFromUrl(url);
                await addLigand(tlc, ligandDict, fromMolNo);
            } else {
                console.warn("No ligand dictionary, doing nothing...");
            }
        },
        [fetchLigandDictFromUrl, addLigand, monomerLibraryPath]
    );

    const defaultGetMonomer = useCallback(async () => {
        const fromMolNo = parseInt(moleculeSelectRef.current.value);

        let newTlc: string;
        if (searchModeSelectRef.current.value === "tlc") {
            newTlc = tlcRef.current.value.toUpperCase();
        } else {
            newTlc = monLibListRef.current.find(item => item.name === autoCompleteRef.current)?.three_letter_code;
        }

        if (!newTlc || !moleculeSelectRef.current.value) {
            enqueueSnackbar("Something went wrong", { variant: "warning" });
            return;
        }

        let result = await getMonomerFromLibcootAPI(newTlc, fromMolNo);

        if (result.data.result.result === -1) {
            const newMolecule = new MoorhenMolecule(commandCentre, store, monomerLibraryPath);
            await newMolecule.loadMissingMonomer(newTlc, fromMolNo);
            result = await getMonomerFromLibcootAPI(newTlc, fromMolNo);
        }

        if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
            const fromMolecule = molecules.find(molecule => molecule.molNo === fromMolNo);
            await createNewLigandMolecule(newTlc, result.data.result.result, fromMolecule?.getDict(newTlc));
        } else {
            enqueueSnackbar("Error getting monomer. Missing dictionary?", { variant: "warning" });
            console.log("Error getting monomer. Missing dictionary?");
        }
    }, [getMonomerFromLibcootAPI, createNewLigandMolecule, molecules]);

    const onCompleted = useCallback(async () => {
        if (sourceSelectRef.current.value === "libcoot-api") {
            const tlc = tlcRef.current.value.toUpperCase();
            const fromMolNo = parseInt(moleculeSelectRef.current.value);
            const result = await getMonomerFromLibcootAPI(tlc, fromMolNo);
            if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
                const fromMolecule = molecules.find(molecule => molecule.molNo === fromMolNo);
                await createNewLigandMolecule(tlc, result.data.result.result, fromMolecule?.getDict(tlc));
            } else {
                enqueueSnackbar("Unable to get monomer. Missing dictionary?", { variant: "warning" });
            }
        } else if (["remote-monomer-library", "local-monomer-library", "pdbe"].includes(sourceSelectRef.current.value)) {
            const tlc = tlcRef.current.value.toUpperCase();
            await fetchLigandDict(sourceSelectRef.current.value, tlc);
        } else {
            await defaultGetMonomer();
        }
    }, [molecules, defaultGetMonomer, fetchLigandDict, getMonomerFromLibcootAPI, createNewLigandMolecule]);

    const menuItemText = "Get monomer...";

    return (
        <MoorhenStack inputGrid>
            <MoorhenSelect
                ref={sourceSelectRef}
                value={source}
                onChange={handleSourceChange}
                label={
                    <label>
                        Source...
                        <MoorhenInfoCard
                            infoText='By default, "Get monomer" will search in each of the following sources until a match is found for
                                your monomer. You can instead override this behaviour by selecting a specific source for your monomer.'
                        />
                    </label>
                }
            >
                <option value={"default"}>Default</option>
                <option value={"libcoot-api"}>Imported dictionary</option>
                <option value={"local-monomer-library"}>Local monomer library</option>
                <option value={"remote-monomer-library"}>Remote monomer library</option>
                <option value={"pdbe"}>PDBe</option>
            </MoorhenSelect>
            {["default", "libcoot-api"].includes(source) && (
                <MoorhenMoleculeSelect molecules={molecules} allowAny={true} ref={moleculeSelectRef} />
            )}
            {source === "default" && (
                <MoorhenSelect ref={searchModeSelectRef} value={searchMode} onChange={handleSearchModeChange} label="Search for">
                    <option value={"tlc"}>Three letter code</option>
                    <option value={"name"}>Compound name</option>
                </MoorhenSelect>
            )}
            {searchMode === "tlc" ? (
                <>
                    <MoorhenTextInput ref={tlcRef} uppercase label="Monomer identifier" />
                </>
            ) : (
                <MoorhenStack direction="line">
                    <label>Compound Name</label>
                    <Autocomplete
                        disablePortal
                        selectOnFocus
                        clearOnBlur
                        handleHomeEndKeys
                        freeSolo
                        includeInputInList
                        filterSelectedOptions
                        size="small"
                        loading={busy}
                        value={autoCompleteValue}
                        open={autocompleteOpen}
                        style={{ width: "18rem" }}
                        onClose={() => setAutocompleteOpen(false)}
                        onOpen={() => setAutocompleteOpen(true)}
                        renderInput={params => (
                            <TextField
                                {...params}
                                label="Search"
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {busy ? <CircularProgress color="inherit" size={20} /> : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                        renderOption={(props, option: string) => {
                            return (
                                <CompoundAutoCompleteOption
                                    key={option}
                                    compoundName={option}
                                    monLibListRef={monLibListRef}
                                    setValue={newVal => {
                                        autoCompleteRef.current = newVal;
                                        setAutoCompleteValue(newVal);
                                        setAutocompleteOpen(false);
                                    }}
                                />
                            );
                        }}
                        options={monLibListRef.current.map(item => item.name)}
                        filterOptions={filterOptions}
                        onChange={(evt, newSelection: string) => {
                            autoCompleteRef.current = newSelection;
                            if (newSelection === null) {
                                setAutoCompleteValue(newSelection);
                            }
                            setAutocompleteOpen(false);
                        }}
                        sx={{
                            "& .MuiInputBase-root": {
                                backgroundColor: isDark ? "#222" : "white",
                                color: isDark ? "white" : "#222",
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: isDark ? "white" : "grey",
                            },
                            "& .MuiButtonBase-root": {
                                color: isDark ? "white" : "grey",
                            },
                            "& .MuiFormLabel-root": {
                                color: isDark ? "white" : "#222",
                            },
                        }}
                    />
                </MoorhenStack>
            )}
            <MoorhenButton onClick={onCompleted}>Ok</MoorhenButton>
        </MoorhenStack>
    );
};
