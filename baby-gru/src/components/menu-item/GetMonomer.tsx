import parse from "html-react-parser";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RootState, enqueueSnackbar } from "@/store";
import { useMoorhenInstance } from "../../InstanceManager";
import { type MonomerSource, getMonomerMolecule } from "../../utils/monomers";
import { addMolecule } from "../../store/moleculesSlice";
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenButton, MoorhenSelect } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenAutoComplete } from "../inputs/autocomplete/AutoComplete";
import { MoorhenInfoCard, MoorhenMenuItem, MoorhenPopover, MoorhenStack } from "../interface-base";
import { drawLigandBonds } from "@/utils/Representation/defaultRepresentation";

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
    const moorhenInstance = useMoorhenInstance();

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

/** What MonomerPicker reports: the monomer's code (resolved from its name if searched by name) and where to look */
export type MonomerChoice = { code: string; source: MonomerSource };

/**
 * Choose a monomer as Get Monomer does: where to look (Source), by three-letter code or compound
 * name, with the monomer library's list as autocomplete (with the compound's picture). Reports the
 * code and source through onChange. `afterSource` is shown right after the source choice (Get
 * Monomer's molecule choice).
 */
export const MonomerPicker = (props: { onChange: (choice: MonomerChoice) => void; afterSource?: (source: MonomerSource) => React.ReactNode }) => {
    const moorhenInstance = useMoorhenInstance();
    const dispatch = useDispatch();
    const monLibListRef = useRef<libcootApi.compoundInfo[]>([]);
    const [source, setSource] = useState<MonomerSource>("default");
    const [searchMode, setSearchMode] = useState<string>("tlc");
    const [autoCompleteValue, setAutoCompleteValue] = useState<string>("");
    const [autocompleteOpen, setAutocompleteOpen] = useState<boolean>(false);

    useEffect(() => {
        const fetchMonLibList = async () => {
            const response = await fetch("https://raw.githubusercontent.com/MonomerLibrary/monomers/master/list/mon_lib_list.cif");
            if (response.ok) {
                const fileContents = await response.text();
                const table = (await moorhenInstance.commandCentre.cootCommand(
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
        };
        fetchMonLibList();
    }, [moorhenInstance, dispatch]);

    // The code: as typed, or the three-letter code of the compound named
    const code =
        searchMode === "tlc" ? autoCompleteValue.toUpperCase() : (monLibListRef.current.find(item => item.name === autoCompleteValue)?.three_letter_code ?? "");
    const onChange = props.onChange;
    useEffect(() => {
        onChange({ code, source });
    }, [code, source, onChange]);

    const handleSourceChange = evt => {
        setSource(evt.target.value);
        if (evt.target.value !== "default") {
            setSearchMode("tlc");
        }
    };

    const searchKeys =
        searchMode === "tlc"
            ? [{ name: "three_letter_code", weight: 1 }]
            : [
                  { name: "name", weight: 0.9 },
                  { name: "three_letter_code", weight: 0.1 },
              ];
    return (
        <>
            <MoorhenSelect
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
                <option value={"libcoot-api"}>Imported dictionary</option>
                <option value={"default"}>Default</option>
                <option value={"local-monomer-library"}>Local monomer library</option>
                <option value={"remote-monomer-library"}>Remote monomer library</option>
                <option value={"pdbe"}>PDBe</option>
            </MoorhenSelect>
            {props.afterSource?.(source)}
            {source === "default" && (
                <MoorhenSelect setValue={setSearchMode} value={searchMode} label="Search for">
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
                    setValue={searchMode === "tlc" ? val => setAutoCompleteValue(val.toUpperCase().slice(0, 3)) : setAutoCompleteValue}
                    maxResults={5}
                    //@ts-ignore
                    keys={searchKeys}
                    resultsRenderer={result => (
                        <CompoundAutoCompleteOption
                            compoundName={result.name}
                            tlc={result.three_letter_code}
                            setValue={() => {
                                setAutoCompleteValue(searchMode === "tlc" ? result.three_letter_code : result.name);
                                setAutocompleteOpen(false);
                            }}
                        />
                    )}
                />
            </MoorhenStack>
        </>
    );
};

export const GetMonomer = () => {
    const moorhenInstance = useMoorhenInstance();
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const originState = useSelector((state: moorhen.State) => state.sceneSettings.origin);
    const [selectedMolecule, setSelectedMolecule] = useState<number | undefined>(undefined);
    const [choice, setChoice] = useState<MonomerChoice>({ code: "", source: "default" });
    const dispatch = useDispatch();

    const createNewLigandMolecule = useCallback(
        async (tlc: string, molNo: number, ligandDict?: string) => {
            const newMolecule = new MoorhenMolecule(moorhenInstance);
            newMolecule.molNo = molNo;
            newMolecule.name = tlc;
            newMolecule.setBackgroundColour(backgroundColor);
            newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness;
            newMolecule.coordsFormat = "mmcif";
            if (ligandDict) {
                await newMolecule.addDict(ligandDict);
            }
            await drawLigandBonds(newMolecule);
            dispatch(addMolecule(newMolecule));
            return newMolecule;
        },
        [defaultBondSmoothness, moorhenInstance, backgroundColor]
    );

    const onCompleted = useCallback(async () => {
        if (!choice.code) {
            dispatch(enqueueSnackbar({ message: "Something went wrong", variant: "warning" }));
            console.warn("No TLC selected, doing nothing...");
            return;
        }
        // The molecule choice is offered for the default source and imported dictionaries only
        const fromMolNo = ["default", "libcoot-api"].includes(choice.source) ? selectedMolecule : undefined;
        const monomer = await getMonomerMolecule(moorhenInstance, choice.code, {
            source: choice.source,
            fromMolNo,
            position: originState.map(coord => -coord) as [number, number, number],
        });
        if (monomer) {
            await createNewLigandMolecule(choice.code, monomer.molNo, monomer.dictionary);
        } else {
            dispatch(enqueueSnackbar({ message: "Error getting monomer. Missing dictionary?", variant: "warning" }));
        }
        document.body.click();
    }, [choice, selectedMolecule, originState, moorhenInstance, createNewLigandMolecule]);

    return (
        <MoorhenStack inputGrid>
            <MonomerPicker
                onChange={setChoice}
                afterSource={source =>
                    ["default", "libcoot-api"].includes(source) && (
                        <MoorhenMoleculeSelect
                            molecules={molecules}
                            allowAny={true}
                            selectedMolecule={selectedMolecule}
                            setSelectedMolecule={setSelectedMolecule}
                        />
                    )
                }
            />
            <MoorhenButton onClick={onCompleted}>Ok</MoorhenButton>
        </MoorhenStack>
    );
};
