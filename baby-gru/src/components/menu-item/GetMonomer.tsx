import parse from "html-react-parser";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RootState, enqueueSnackbar } from "@/store";
import { useCommandCentre, usePaths } from "../../InstanceManager";
import { addMolecule } from "../../store/moleculesSlice";
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenButton, MoorhenSelect, MoorhenTextInput } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenAutoComplete } from "../inputs/autocomplete/AutoComplete";
import { MoorhenInfoCard, MoorhenMenuItem, MoorhenPopover, MoorhenStack } from "../interface-base";

function resizeSvgString(svg: string, size: number): string {
  const s = String(size);
  const sizePx = `${s}px`;

  const viewBoxMatch = svg.match(/viewBox=['"]([^'"]+)['"]/i);
  const withoutWH = svg.replace(/\s(?:width|height)=['"][^'"]*['"]/gi, "");

  if (viewBoxMatch) {
    const vb = viewBoxMatch[1];
    return withoutWH.replace(/<svg[^>]*>/i, `<svg width="${sizePx}" height="${sizePx}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">`);
  }

  const widthMatch = svg.match(/width=['"]?(\d+(\.\d+)?)px?['"]?/i);
  const heightMatch = svg.match(/height=['"]?(\d+(\.\d+)?)px?['"]?/i);
  if (widthMatch && heightMatch) {
    const w = widthMatch[1];
    const h = heightMatch[1];
    return withoutWH.replace(/<svg[^>]*>/i, `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">`);
  }

  // Fallback: add width/height and allow overflow (less ideal, but avoids clipping)
  return withoutWH.replace(/<svg[^>]*>/i, `<svg width="${sizePx}" height="${sizePx}" preserveAspectRatio="xMidYMid meet" style="overflow:visible">`);
}

const CompoundAutoCompleteOption = (props: {
    compoundName: string;
    tlc?: string;
    setValue: (newVal: string) => void;
}) => {
    const [ligandSVG, setLigandSVG] = useState<string>("");
    const [isShown, setIsShown] = useState<boolean>(false);

    const svgPopover = useMemo(() => {
        return (
            parse(resizeSvgString(ligandSVG, 350)) as React.ReactNode
        );
    }, [ligandSVG]);

    useEffect(() => {
        const fetchLigandSVG = async () => {;
            const response = await fetch(`https://www.ebi.ac.uk/pdbe/static/files/pdbechem_v2/${props.tlc}_300.svg`);
            const text = await response.text();
            setLigandSVG(text);
        };
        fetchLigandSVG();
    }, [props.compoundName, props.tlc]);

    const popoverLinkRef = useRef<HTMLButtonElement>(null);

    const svg = ligandSVG ? parse(resizeSvgString(ligandSVG, 100)) : null;

        const popoverLink = (
        <button
            key={`compound-${props.compoundName}`}
            onClick={() => props.setValue(props.compoundName)}
            className="moorhen__autocomplete-option"
            onMouseEnter={() => setIsShown(true)}
            onMouseLeave={() => setIsShown(false)}
            ref={popoverLinkRef}
        >
            <MoorhenStack direction="line" align="center">
                <div style={{flex:0}}>
            {svg}</div>
            {props.compoundName}{" "}</MoorhenStack>
        </button>
    );

    return (
        <MoorhenPopover key={`popover-${props.compoundName}`} popoverPlacement="top" link={popoverLink} linkRef={popoverLinkRef} isShown={isShown} setIsShown={setIsShown}>
            {svgPopover}
        </MoorhenPopover>
    );
};

export const GetMonomer = () => {
    const store = useStore<RootState>();
    const commandCentre = useCommandCentre();
    const monomerLibraryPath = usePaths().monomerLibraryPath;
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    // const moleculeSelectRef = useRef<HTMLSelectElement | null>(null);
    const searchModeSelectRef = useRef<HTMLSelectElement | null>(null);
    const monLibListRef = useRef<libcootApi.compoundInfo[]>([]);
    const sourceSelectRef = useRef<HTMLSelectElement | null>(null);

    const [source, setSource] = useState<string>("default");
    const [searchMode, setSearchMode] = useState<string>("tlc");
    const [busy, setBusy] = useState<boolean>(false);
    const [autoCompleteValue, setAutoCompleteValue] = useState<string>("");
    const [autocompleteOpen, setAutocompleteOpen] = useState<boolean>(false);
    const [selectedMolecule, setSelectedMolecule] = useState<number | undefined>(undefined);
    const [tlc, setTlc] = useState<string>("");

    const dispatch = useDispatch();

    const originState = useSelector((state: moorhen.State) => state.glRef.origin);

    const handleSourceChange = evt => {
        setSource(evt.target.value);
        if (evt.target.value !== "default") {
            setSearchMode("tlc");
        }
    };

    // const handleSearchModeChange = async evt => {
    //     setSearchMode(evt.target.value);
    //     if (evt.target.value === "name" && monLibListRef.current.length === 0) {
    //         setBusy(true);
    //         const response = await fetch("https://raw.githubusercontent.com/MonomerLibrary/monomers/master/list/mon_lib_list.cif");
    //         if (response.ok) {
    //             const fileContents = await response.text();
    //             const table = (await commandCentre.current.cootCommand(
    //                 {
    //                     command: "parse_mon_lib_list_cif",
    //                     commandArgs: [fileContents],
    //                     returnType: "status",
    //                 },
    //                 false
    //             )) as moorhen.WorkerResponse<libcootApi.compoundInfo[]>;
    //             monLibListRef.current = table.data.result.result;
    //         } else {
    //             dispatch(enqueueSnackbar({ message: "Unable to fetch ligand names", variant: "warning" }));
    //             setSearchMode("tlc");
    //         }
    //         setBusy(false);
    //     }
    // };

    useEffect(() => {
        const fetchMonLibList = async () => {
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
                dispatch(enqueueSnackbar({ message: "Unable to fetch ligand names", variant: "warning" }));
            }
            setBusy(false);
        };
        fetchMonLibList();
    }, [commandCentre, dispatch]);

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
                dispatch(enqueueSnackbar({ message: "Error getting monomer. Missing dictionary?", variant: "warning" }));
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
        const fromMolNo = selectedMolecule
        
        let newTlc: string;
        if (searchModeSelectRef.current.value === "tlc") {
            newTlc = autoCompleteValue.toUpperCase();
        } else {
            newTlc = monLibListRef.current.find(item => item.name === autoCompleteValue)?.three_letter_code;
        }
        
        if (!newTlc || fromMolNo === -1) {
            dispatch(enqueueSnackbar({ message: "Something went wrong", variant: "warning" }));
            console.warn("No TLC or molecule selected, doing nothing...");
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
            dispatch(enqueueSnackbar({ message: "Error getting monomer. Missing dictionary?", variant: "warning" }));
            console.log("Error getting monomer. Missing dictionary?");
        }
    }, [autoCompleteValue, getMonomerFromLibcootAPI, createNewLigandMolecule, molecules]);

    const onCompleted = useCallback(async () => {
        if (sourceSelectRef.current.value === "libcoot-api") {
            const tlc = autoCompleteValue.toUpperCase();
            const fromMolNo = selectedMolecule;
            const result = await getMonomerFromLibcootAPI(tlc, fromMolNo);
            if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
                const fromMolecule = molecules.find(molecule => molecule.molNo === fromMolNo);
                await createNewLigandMolecule(tlc, result.data.result.result, fromMolecule?.getDict(tlc));
            } else {
                dispatch(enqueueSnackbar({ message: "Unable to get monomer. Missing dictionary?", variant: "warning" }));
            }
        } else if (["remote-monomer-library", "local-monomer-library", "pdbe"].includes(sourceSelectRef.current.value)) {
            const tlc = autoCompleteValue.toUpperCase();
            await fetchLigandDict(sourceSelectRef.current.value, tlc);
        } else {
            await defaultGetMonomer();
        }
        document.body.click();
    }, [autoCompleteValue, molecules, defaultGetMonomer, fetchLigandDict, getMonomerFromLibcootAPI, createNewLigandMolecule]);

    const searchKeys = searchMode === "tlc" ? [
                            { name: "three_letter_code", weight: 1 },
                        ] : [
                            { name: "name", weight: 0.9 },
                            { name: "three_letter_code", weight: 0.1 },
                        ];
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
                <MoorhenMoleculeSelect molecules={molecules} allowAny={true} selectedMolecule={selectedMolecule} setSelectedMolecule={setSelectedMolecule} />
            )}
            {source === "default" && (
                <MoorhenSelect ref={searchModeSelectRef} value={searchMode} label="Search for">
                    <option value={"tlc"}>Three letter code</option>
                    <option value={"name"}>Compound name</option>
                </MoorhenSelect>
            )}
                <MoorhenStack direction="line">
                    <label>{searchMode === "tlc" ? "Three letter code" : "Compound name"}</label>
                    <MoorhenAutoComplete
                        autocompleteOpen={autocompleteOpen}
                        setAutocompleteOpen={setAutocompleteOpen}
                        searchItems={monLibListRef.current}
                        value={autoCompleteValue}
                        setValue={searchMode === "tlc" ? (val) =>setAutoCompleteValue(val.toUpperCase().slice(0, 3)) : setAutoCompleteValue}
                        maxResults={5}
                        //@ts-ignore
                        keys={searchKeys}
                        resultsRenderer={result => (
                            <CompoundAutoCompleteOption
                                compoundName={result.name}
                                tlc={result.three_letter_code}
                                setValue={newVal => {
                                    setAutoCompleteValue(searchMode === "tlc" ? result.three_letter_code : result.name);
                                    setTlc(result.three_letter_code);
                                    setAutocompleteOpen(false);
                                }}
                            />
                        )}
                    />
                </MoorhenStack>
            <MoorhenButton onClick={onCompleted}>Ok</MoorhenButton>
        </MoorhenStack>
    );
};
