import {
    CenterFocusWeakOutlined,
    DownloadOutlined,
    ExpandMoreOutlined,
    VisibilityOffOutlined,
    VisibilityOutlined,
} from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import Fasta from "biojs-io-fasta";
import { Button, Container, Form, Stack, Table } from "react-bootstrap";
import { useDispatch, useSelector, useStore } from "react-redux";
import { createRef, useCallback, useEffect, useMemo, useRef } from "react";
import { useCommandCentre, usePaths } from "../../InstanceManager";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { hideMolecule, showMolecule } from "../../store/moleculesSlice";
import {
    setAFDisplaySettings,
    setAfJson,
    setAfSortField,
    setAfSortReversed,
    setEsmJson,
    setHomologsDisplaySettings,
    setHomologsJson,
    setHomologsSortField,
    setHomologsSortReversed,
    setTargetSequence,
} from "../../store/mrParseSlice";
import { moorhen } from "../../types/moorhen";
import { loadMrParseFiles, loadMrParseUrl } from "../../utils/MoorhenFileLoading";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx, readTextFile } from "../../utils/utils";
import { MoorhenButton } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/DraggableModalBase";
import { MoorhenSequenceViewer, MoorhenSequenceViewerSequence, moorhenSequenceToSeqViewer, stringToSeqViewer } from "../sequence-viewer";

interface MrParsePDBModelJson {
    chain_id: string;
    ellg: number;
    frac_scat: null | number;
    length: number;
    molecular_weight: number;
    name: string;
    ncopies: null | number;
    pdb_file: null | string;
    pdb_id: string;
    pdb_url: string;
    query_start: number;
    query_stop: number;
    range: string;
    region_id: number;
    region_index: number;
    resolution: number;
    rmsd: null | number;
    score: number;
    seq_ident: number;
    total_frac_scat: null | number;
    total_frac_scat_known: null | number;
}

interface MrParseAFModelJson {
    chain_id: string;
    ellg: number;
    frac_scat: null | number;
    length: number;
    molecular_weight: number;
    name: string;
    ncopies: number;
    pdb_file: null | string;
    pdb_id: string;
    pdb_url: string;
    query_start: number;
    query_stop: number;
    range: string;
    region_id: number;
    region_index: number;
    resolution: number;
    rmsd: null | number;
    score: number;
    seq_ident: number;
    total_frac_scat: null | number;
    total_frac_scat_known: null | number;
}

type DisplaySettingsType = {
    rulerStart: number;
    start: number;
    end: number;
    seqLength: number;
    displaySequence: string;
};

export const MoorhenMrParseModal = () => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);

    const filesRef = useRef<null | HTMLInputElement>(null);

    const dispatch = useDispatch();
    const store = useStore();
    const commandCentre = useCommandCentre();
    const monomerLibraryPath = usePaths().monomerLibraryPath;
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);
    const visibleMolecules = useSelector((state: moorhen.State) => state.molecules.visibleMolecules);

    const AFSelectedResiduesTrackRef = useRef<{}>({});
    const AFSequenceRef = useRef<any>(null);

    const HomologsSelectedResiduesTrackRef = useRef<{}>({});
    const HomologsSequenceRef = useRef<any>(null);
    const pdbHeaders = [
        { key: "name", label: "Name" },
        { key: "pdb_id", label: "PDB" },
        { key: "resolution", label: "Resolution" },
        { key: "region_id", label: "Region" },
        { key: "range", label: "Range" },
        { key: "length", label: "Length" },
        { key: "ellg", label: "eLLG" },
        { key: "molecular_weight", label: "Mol. Wt." },
        { key: "rmsd", label: "eRMSD" },
        { key: "seq_ident", label: "Seq. Ident." },
    ];

    const pdbHeaderTypes = {
        name: "string",
        pdb_id: "string",
        resolution: "number",
        region_id: "number",
        range: "string",
        length: "number",
        ellg: "number",
        molecular_weight: "number",
        rmsd: "number",
        seq_ident: "number",
    };

    const afHeaders = [
        { key: "name", label: "Name" },
        { key: "date_made", label: "Date made" },
        { key: "range", label: "Range" },
        { key: "length", label: "Length" },
        { key: "avg_plddt", label: "Average pLDDT" },
        { key: "h_score", label: "H-score" },
        { key: "seq_ident", label: "Seq. Ident." },
    ];

    const afHeaderTypes = {
        name: "string",
        date_made: "string",
        range: "string",
        length: "number",
        avg_plddt: "number",
        h_score: "number",
        seq_ident: "number",
    };

    const mrParseModels = useSelector((state: moorhen.State) => state.mrParse.mrParseModels);
    const targetSequence = useSelector((state: moorhen.State) => state.mrParse.targetSequence);
    const afJson = useSelector((state: moorhen.State) => state.mrParse.afJson);
    const esmJson = useSelector((state: moorhen.State) => state.mrParse.esmJson);
    const homologsJson = useSelector((state: moorhen.State) => state.mrParse.homologsJson);
    const afSortField = useSelector((state: moorhen.State) => state.mrParse.afSortField);
    const homologsSortField = useSelector((state: moorhen.State) => state.mrParse.homologsSortField);
    const afSortReversed = useSelector((state: moorhen.State) => state.mrParse.afSortReversed);
    const homologsSortReversed = useSelector((state: moorhen.State) => state.mrParse.homologsSortReversed);
    const AFDisplaySettings = useSelector((state: moorhen.State) => state.mrParse.AFDisplaySettings);
    const HomologsDisplaySettings = useSelector((state: moorhen.State) => state.mrParse.HomologsDisplaySettings);

    const homologsSequencesLists = useMemo(() => {
        const homologDisplaySequence = stringToSeqViewer(HomologsDisplaySettings.displaySequence, HomologsDisplaySettings.start);
        homologDisplaySequence.displayName = "Query";
        const list: MoorhenSequenceViewerSequence[] = [];
        list.push(homologDisplaySequence);

        homologsJson?.forEach(el => {
            const foundModel = mrParseModels.find(
                mod => "models/" + mod.name + ".pdb" === el.pdb_file || "homologs/" + mod.name + ".pdb" === el.pdb_file
            );
            if (foundModel) {
                const seq = foundModel.sequences[0];
                const offset = foundModel.name.split("_")[2].match(/-?\d+/)[0];
                const seqElement = moorhenSequenceToSeqViewer(seq, foundModel.name, foundModel.molNo);
                seqElement.residuesDisplayOffset = Number(-offset) + el.query_start + 1;
                seqElement.displayName = el.pdb_id;
                seqElement.colour = "rgb(205, 128, 100)";
                seqElement.blockAlternateColour = true;
                seqElement.missingAs = "none";
                seqElement.hideResCode = true;
                seqElement.residues.forEach(residue => {
                    if (homologDisplaySequence.residues[residue.resNum + seqElement.residuesDisplayOffset]) {
                        if (
                            residue.resCode ===
                            homologDisplaySequence.residues.find(r => r.resNum === residue.resNum + seqElement.residuesDisplayOffset)
                                .resCode
                        ) {
                            residue.colour = "rgb(205, 0, 0)";
                        }
                    }
                });
                list.push(seqElement);
            }
        });
        return list;
    }, [HomologsDisplaySettings, homologsJson, mrParseModels]);

    const colorByPLDDT = (
        seqElement: MoorhenSequenceViewerSequence,
        plddt_regions: {
            v_low: [number, number][];
            low: [number, number][];
            confident: [number, number][];
            v_high: [number, number][];
        }
    ) => {
        const newSeqElement: MoorhenSequenceViewerSequence = {
            ...seqElement,
            residues: seqElement.residues.map(res => ({ ...res })),
        };
        for (const [regionType, regionsArray] of Object.entries(plddt_regions)) {
            regionsArray.forEach(region => {
                for (let ires = region[0]; ires <= region[1]; ires++) {
                    const res = newSeqElement.residues.find(r => r.resNum + seqElement.residuesDisplayOffset === ires);
                    if (res) {
                        switch (regionType) {
                            case "v_low":
                                res.colour = "#FF7D45"; // Very low confidence
                                break;
                            case "low":
                                res.colour = "#FFDB13";
                                break; // Low confidence
                            case "confident":
                                res.colour = "#65CBF3"; // Confident
                                break;
                            case "v_high":
                                res.colour = "#0053D6"; // Very high confidence
                                break;
                        }
                    }
                }
            });
        }
        return newSeqElement;
    };

    const afSequencesLists = useMemo(() => {
        const afDisplaySequence = stringToSeqViewer(AFDisplaySettings.displaySequence, AFDisplaySettings.start);
        afDisplaySequence.displayName = "Query";
        const list: MoorhenSequenceViewerSequence[] = [];
        list.push(afDisplaySequence);

        afJson?.forEach(afModel => {
            const foundModel = mrParseModels.find(mod => "models/" + mod.name + ".pdb" === afModel.pdb_file);
            if (foundModel) {
                const seq = foundModel.sequences[0];
                const seqElement = moorhenSequenceToSeqViewer(seq, foundModel.name, foundModel.molNo);
                const offset = afModel.pdb_file.split("_").slice(-1)[0].match(/-?\d+/)[0];
                seqElement.residuesDisplayOffset = Number(-offset) + afModel.query_start;
                seqElement.displayName = afModel.name.split("-")[1];
                seqElement.colour = "rgb(196, 187, 184)";
                seqElement.missingAs = "none";
                seqElement.blockAlternateColour = true;
                seqElement.hideResCode = true;
                const coloredSeqElement = colorByPLDDT(seqElement, afModel.plddt_regions);
                list.push(coloredSeqElement);
            }
        });
        return list;
    }, [AFDisplaySettings, afJson, mrParseModels]);

    const handleClickResidue = useCallback(
        (molIndex: number, molName: string, chain: string, resNum: number) => {
            const foundModel = mrParseModels.find(mod => mod.name === molName);
            foundModel?.centreOn(`/*/${chain}/${resNum}-${resNum}/*`);
        },
        [mrParseModels]
    );

    const tableSort = (a, b, key, isString, reversed) => {
        if (isString) {
            if (reversed) return String(a[key]).localeCompare(String(b[key]));
            else return String(b[key]).localeCompare(String(a[key]));
        } else {
            if (reversed) return a[key] - b[key];
            else return b[key] - a[key];
        }
    };

    const homologsSortFun = (a, b) => {
        const key = homologsSortField;
        const isString = pdbHeaderTypes[key] === "string";
        const reversed = homologsSortReversed;
        return tableSort(a, b, key, isString, reversed);
    };

    const afSortFun = (a, b) => {
        const key = afSortField;
        const isString = afHeaderTypes[key] === "string";
        const reversed = afSortReversed;
        return tableSort(a, b, key, isString, reversed);
    };

    const readPdbString = async (fileString: string, fileName: string): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(commandCentre, store, monomerLibraryPath);
        newMolecule.setBackgroundColour(backgroundColor);
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness;
        await newMolecule.loadToCootFromString(fileString, fileName);
        return newMolecule;
    };

    const readPdbFile = async (file: File): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(commandCentre, store, monomerLibraryPath);
        newMolecule.setBackgroundColour(backgroundColor);
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness;
        await newMolecule.loadToCootFromFile(file);
        return newMolecule;
    };

    useEffect(() => {
        return () => {};
    }, [mrParseModels]);

    useEffect(() => {
        let minRes = 0;
        let maxRes = 0;

        const allSelectedResiduesTrackData = [];

        homologsJson.forEach(res => {
            const foundModel = mrParseModels.find(mod => "homologs/" + mod.name + ".pdb" === res.pdb_file);
            if (Object.hasOwn(res, "query_start") && res.query_start < minRes) {
                minRes = res.query_start;
            }
            if (Object.hasOwn(res, "query_stop") && res.query_stop > maxRes) {
                maxRes = res.query_stop;
            }
            const selectedResiduesTrackData = [];
            if (foundModel && Object.hasOwn(res, "query_start") && Object.hasOwn(res, "query_stop")) {
                const seq = foundModel.sequences[0].sequence;
                let baseNum;
                if (seq.length > 0) baseNum = seq[0].resNum;
                seq.forEach((r, i) => {
                    selectedResiduesTrackData.push({
                        accession: "X",
                        type: "" + r.resNum,
                        color: "#4f3727",
                        locations: [
                            {
                                fragments: [
                                    {
                                        start: r.resNum - baseNum + res.query_start + 1,
                                        end: r.resNum - baseNum + res.query_start + 1,
                                    },
                                ],
                            },
                        ],
                    });
                });
            }
            allSelectedResiduesTrackData.push(selectedResiduesTrackData);
        });

        const seq = targetSequence; //".".repeat(maxRes-minRes+1)

        if (HomologsSequenceRef.current) {
            HomologsSequenceRef.current.sequence = seq;
            HomologsSequenceRef.current._createSequence();
        }
        const newSequenceData = {
            rulerStart: 0,
            start: minRes,
            end: maxRes,
            seqLength: seq.length,
            displaySequence: seq,
        };
        dispatch(setHomologsDisplaySettings(newSequenceData));

        homologsJson.map((el, i) => {
            if (!HomologsSelectedResiduesTrackRef[i]) {
                HomologsSelectedResiduesTrackRef[i] = createRef();
            }
            if (HomologsSelectedResiduesTrackRef[i].current) {
                HomologsSelectedResiduesTrackRef[i].current.removeEventListener("click", handleClick);
                HomologsSelectedResiduesTrackRef[i].current.removeEventListener("change", e => {
                    handleChange(e, el.chain_id, el.pdb_file, el.query_start);
                });
                HomologsSelectedResiduesTrackRef[i].current.removeEventListener("dblclick", disableDoubleClick, true);
                HomologsSelectedResiduesTrackRef[i].current.data = allSelectedResiduesTrackData[i];
                HomologsSelectedResiduesTrackRef[i].current.addEventListener("click", handleClick);
                HomologsSelectedResiduesTrackRef[i].current.addEventListener("change", e => {
                    handleChange(e, el.chain_id, el.pdb_file, el.query_start);
                });
                HomologsSelectedResiduesTrackRef[i].current.addEventListener("dblclick", disableDoubleClick, true);
            }
        });
    }, [homologsJson, targetSequence, mrParseModels]);

    const handleChange = useCallback(
        (evt, chain_id, model_id, seq_start) => {
            setTimeout(() => {
                if (evt && evt.detail && (evt.detail.eventtype === "mouseover" || evt.detail.eventtype === "click")) {
                    if (evt.detail.feature) {
                        if (evt.detail.feature && evt.detail.feature.locations && evt.detail.feature.locations.length > 0) {
                            if (evt.detail.feature.locations[0].fragments && evt.detail.feature.locations[0].fragments.length > 0) {
                                const frag = evt.detail.feature.locations[0].fragments[0];
                                if (Object.hasOwn(frag, "start") && Object.hasOwn(frag, "end")) {
                                    if (frag.start === frag.end) {
                                        const foundModel = mrParseModels.find(
                                            mod =>
                                                "models/" + mod.name + ".pdb" === model_id || "homologs/" + mod.name + ".pdb" === model_id
                                        );
                                        if (foundModel) {
                                            if (
                                                foundModel.sequences.length > 0 &&
                                                foundModel.sequences[0] &&
                                                foundModel.sequences[0].sequence.length > 0
                                            ) {
                                                const cid = `//${chain_id}/${evt.detail.feature.type}/CA`;
                                                if (evt.detail.eventtype === "click") {
                                                    foundModel.centreOn(cid);
                                                } else if (evt.detail.eventtype === "mouseover") {
                                                    dispatch(setHoveredAtom({ molecule: foundModel, cid: cid }));
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }, 1);
        },
        [mrParseModels]
    );

    const handleClick = (evt: MouseEvent) => {};

    const disableDoubleClick = (evt: MouseEvent) => {
        evt.preventDefault();
        evt.stopPropagation();
    };

    useEffect(() => {
        let minRes = 0;
        let maxRes = 0;

        const allSelectedResiduesTrackData = [];

        afJson.forEach(res => {
            const foundModel = mrParseModels.find(mod => "models/" + mod.name + ".pdb" === res.pdb_file);
            if (Object.hasOwn(res, "query_start") && res.query_start < minRes) {
                minRes = res.query_start;
            }
            if (Object.hasOwn(res, "query_stop") && res.query_stop > maxRes) {
                maxRes = res.query_stop;
            }
            if (Object.hasOwn(res, "plddt_regions")) {
                const selectedResiduesTrackData = [];
                if (foundModel) {
                    const seq = foundModel.sequences[0].sequence;
                    const ver_range = foundModel.name.substring(res.name.length + 1);
                    const fname_base = parseInt(ver_range.substring(ver_range.indexOf("_") + 1).split("-")[0]);
                    const baseNum = fname_base;
                    seq.forEach((r, i) => {
                        const loc = r.resNum - baseNum + res.query_start;
                        let color = null;
                        if (Object.hasOwn(res.plddt_regions, "v_low")) {
                            res.plddt_regions.v_low.forEach(region => {
                                for (let ires = region[0]; ires <= region[1]; ires++) {
                                    if (ires + 1 === loc) {
                                        color = "#FF7D45";
                                        break;
                                    }
                                }
                            });
                        }
                        if (!color && Object.hasOwn(res.plddt_regions, "low")) {
                            res.plddt_regions.low.forEach(region => {
                                for (let ires = region[0]; ires <= region[1]; ires++) {
                                    if (ires + 1 === loc) {
                                        color = "#FFDB13";
                                        break;
                                    }
                                }
                            });
                        }
                        if (!color && Object.hasOwn(res.plddt_regions, "confident")) {
                            res.plddt_regions.confident.forEach(region => {
                                for (let ires = region[0]; ires <= region[1]; ires++) {
                                    if (ires + 1 === loc) {
                                        color = "#65CBF3";
                                        break;
                                    }
                                }
                            });
                        }
                        if (!color && Object.hasOwn(res.plddt_regions, "v_high")) {
                            res.plddt_regions.v_high.forEach(region => {
                                for (let ires = region[0]; ires <= region[1]; ires++) {
                                    if (ires + 1 === loc) {
                                        color = "#0053D6";
                                        break;
                                    }
                                }
                            });
                        }
                        if (!color) color = "#FF0000";
                        selectedResiduesTrackData.push({
                            accession: "X",
                            type: "" + r.resNum,
                            color: color,
                            locations: [{ fragments: [{ start: loc, end: loc }] }],
                        });
                    });
                }
                allSelectedResiduesTrackData.push(selectedResiduesTrackData);
            }
        });

        const seq = targetSequence; //".".repeat(maxRes-minRes+1)

        if (AFSequenceRef.current) {
            AFSequenceRef.current.sequence = seq;
            AFSequenceRef.current._createSequence();
        }
        const newSequenceData = {
            rulerStart: 0,
            start: minRes,
            end: maxRes,
            seqLength: seq.length,
            displaySequence: seq,
        };
        dispatch(setAFDisplaySettings(newSequenceData));

        afJson.map((el, i) => {
            if (!AFSelectedResiduesTrackRef[i]) {
                AFSelectedResiduesTrackRef[i] = createRef();
            }
            if (AFSelectedResiduesTrackRef[i].current) {
                AFSelectedResiduesTrackRef[i].current.removeEventListener("click", handleClick);
                AFSelectedResiduesTrackRef[i].current.removeEventListener("change", e => {
                    handleChange(e, "A", el.pdb_file, el.query_start);
                });
                AFSelectedResiduesTrackRef[i].current.removeEventListener("dblclick", disableDoubleClick, true);
                AFSelectedResiduesTrackRef[i].current.data = allSelectedResiduesTrackData[i];
                AFSelectedResiduesTrackRef[i].current.addEventListener("click", handleClick);
                AFSelectedResiduesTrackRef[i].current.addEventListener("change", e => {
                    handleChange(e, "A", el.pdb_file, el.query_start);
                });
                AFSelectedResiduesTrackRef[i].current.addEventListener("dblclick", disableDoubleClick, true);
            }
        });
    }, [afJson, targetSequence, mrParseModels]);

    const loadMrParseJson = async (files: FileList) => {
        if (files.length === 0) return;

        let fastaContents = "";
        let afModelContents = "";
        let esmModelContents = "";
        let homologsContents = "";

        for (const file of files) {
            if (file.name === "input.fasta") {
                fastaContents = (await readTextFile(file)) as string;
            }
            if (file.name === "af_models.json") {
                afModelContents = (await readTextFile(file)) as string;
            }
            if (file.name === "esm_models.json") {
                esmModelContents = (await readTextFile(file)) as string;
            }
            if (file.name === "homologs.json") {
                homologsContents = (await readTextFile(file)) as string;
            }
        }

        return { fastaContents, afModelContents, esmModelContents, homologsContents };
    };

    const parseJSONAndGetModelFiles = json_contents => {
        const fastaContents = json_contents.fastaContents;
        const afModelContents = json_contents.afModelContents;
        const esmModelContents = json_contents.esmModelContents;
        const homologsContents = json_contents.homologsContents;

        const modelFiles: string[] = [];
        if (fastaContents) {
            try {
                const seqs = Fasta.parse(fastaContents);
                dispatch(setTargetSequence(seqs[0].seq));
            } catch (e) {
                console.log("Failed to extract sequence from input.fasta");
            }
        }
        if (afModelContents) {
            const json = JSON.parse(afModelContents);
            json.map((el, i) => {
                AFSelectedResiduesTrackRef[i] = createRef();
            });
            dispatch(setAfJson(json));
            for (const iter of Object.entries(json)) {
                const key: string = iter[0];
                const value: MrParseAFModelJson = iter[1] as MrParseAFModelJson;
                const fullName = value["pdb_file"];
                if (fullName) {
                    const relName = fullName.substring(fullName.lastIndexOf("models/") + "models/".length);
                    modelFiles.push(fullName);
                }
            }
        }
        if (esmModelContents) {
            const json = JSON.parse(esmModelContents);
            dispatch(setEsmJson(json));
            for (const iter of Object.entries(json)) {
                const key: string = iter[0];
                const value: any = iter[1];
            }
        }
        if (homologsContents) {
            const json = JSON.parse(homologsContents);
            json.map((el, i) => {
                HomologsSelectedResiduesTrackRef[i] = createRef();
            });
            dispatch(setHomologsJson(json));
            for (const iter of Object.entries(json)) {
                const key: string = iter[0];
                const value: MrParsePDBModelJson = iter[1] as MrParsePDBModelJson;
                const fullName = value["pdb_file"];
                if (fullName) {
                    const relName = fullName.substring(fullName.lastIndexOf("homologs/") + "homologs/".length);
                    modelFiles.push(fullName);
                }
            }
        }
        return modelFiles;
    };

    const loadMrParseJsonUrl = async urlBase => {
        let fastaContents = "";
        let afModelContents = "";
        let esmModelContents = "";
        let homologsContents = "";

        let response = await fetch(urlBase + "/input.fasta");
        if (response.ok) {
            fastaContents = await response.text();
        }
        response = await fetch(urlBase + "/af_models.json");
        if (response.ok) {
            afModelContents = await response.text();
        }
        response = await fetch(urlBase + "/esm_models.json");
        if (response.ok) {
            esmModelContents = await response.text();
        }
        response = await fetch(urlBase + "/homologs.json");
        if (response.ok) {
            homologsContents = await response.text();
        }

        return { fastaContents, afModelContents, esmModelContents, homologsContents };
    };

    const handlePDBSortingChange = key => {
        if (key === homologsSortField) {
            dispatch(setHomologsSortReversed(!homologsSortReversed));
        } else {
            dispatch(setHomologsSortReversed(false));
        }
        dispatch(setHomologsSortField(key));
    };

    const handleAFSortingChange = key => {
        if (key === afSortField) {
            dispatch(setAfSortReversed(!afSortReversed));
        } else {
            dispatch(setAfSortReversed(false));
        }
        dispatch(setAfSortField(key));
    };

    const handleLoadFromUrlExample = () => {
        //This is an example of loading a set of MrParse results on a server.
        //In testing I just run Python simple server in an MrParse results dir.
        const urlBase = "http://localhost:8000/";
        loadMrParseUrl(urlBase, commandCentre, monomerLibraryPath, backgroundColor, defaultBondSmoothness, store, dispatch);
    };

    const footerContent = (
        <MoorhenStack
            gap={2}
            direction="horizontal"
            style={{
                paddingTop: "0.5rem",
                alignItems: "space-between",
                alignContent: "space-between",
                justifyContent: "space-between",
                width: "100%",
            }}
        >
            <Stack
                gap={2}
                direction="horizontal"
                style={{ alignItems: "center", alignContent: "center", justifyContent: "center" }}
            >
                <Form.Group
                    style={{ width: "20rem", margin: "0.5rem", padding: "0rem" }}
                    controlId="uploadMrParse"
                    className="mb-3"
                >
{/* @ts-expect-error */}
                    <Form.Control ref={filesRef} type="file" multiple={true} directory="" webkitdirectory="true"
            <MoorhenStack gap={2} direction="horizontal" style={{ alignItems: "center", alignContent: "center", justifyContent: "center" }}>
                <Form.Group style={{ width: "20rem", margin: "0.5rem", padding: "0rem" }} controlId="uploadMrParse" className="mb-3">
                    <Form.Control
                        ref={filesRef}
                        type="file"
                        multiple={true}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            loadMrParseFiles(
                                Array.from(e.target.files),
                                commandCentre,
                                store,
                                monomerLibraryPath,
                                backgroundColor,
                                defaultBondSmoothness,
                                dispatch
                            );
                        }}
                    />
                </Form.Group>
            </MoorhenStack>
            {false && <MoorhenButton onClick={handleLoadFromUrlExample}>Load from URL example</MoorhenButton>}
        </MoorhenStack>
    );

    const pdbArrow = homologsSortReversed ? <>&darr;</> : <>&uarr;</>;
    const afArrow = afSortReversed ? <>&darr;</> : <>&uarr;</>;

    let bodyContent = (
        <>
            <div style={{ verticalAlign: "center" }}>Use the button below to browse for an MrParse results directory</div>
        </>
    );

    if (mrParseModels.length > 0)
        bodyContent = (
            <>
                <Accordion
                    defaultExpanded
                    className="moorhen-accordion"
                    disableGutters={true}
                    elevation={0}
                    style={{ padding: "0.2rem", backgroundColor: isDark ? "#333333" : "white" }}
                >
                    <AccordionSummary style={{ backgroundColor: isDark ? "#adb5bd" : "#ecf0f1" }} expandIcon={<ExpandMoreOutlined />}>
                        Experimental structures from the PDB
                    </AccordionSummary>
                    <AccordionDetails style={{ padding: "0.2rem", backgroundColor: isDark ? "#333333" : "white" }}>
                        <Table style={{ backgroundColor: isDark ? "#3d3d3d" : "white" }}>
                            <thead>
                                <tr>
                                    {pdbHeaders.map(head => (
                                        <th key={head.key} onClick={() => handlePDBSortingChange(head.key)}>
                                            {head.label} {head.key === homologsSortField ? pdbArrow : <></>}
                                        </th>
                                    ))}
                                    <th>
                                        <em>Tools</em>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {homologsJson.toSorted(homologsSortFun).map((homEl, i) => {
                                    const model_id = homEl.pdb_file;
                                    const foundModel = mrParseModels.find(
                                        mod => "models/" + mod.name + ".pdb" === model_id || "homologs/" + mod.name + ".pdb" === model_id
                                    );
                                    if (foundModel) {
                                        const isVisible = visibleMolecules.indexOf(foundModel.molNo) > -1;
                                        const handleDownload = async () => {
                                            await foundModel.downloadAtoms();
                                        };
                                        const handleCentering = () => {
                                            foundModel.centreOn();
                                        };
                                        const handleVisibility = () => {
                                            dispatch(isVisible ? hideMolecule(foundModel) : showMolecule(foundModel));
                                        };
                                        return (
                                            <tr key={i}>
                                                <td>{homEl.name}</td>
                                                <td>{homEl.pdb_id}</td>
                                                <td>{homEl.resolution.toFixed(2)}</td>
                                                <td>{homEl.region_id}</td>
                                                <td>{homEl.range}</td>
                                                <td>{homEl.length}</td>
                                                <td>{homEl.ellg}</td>
                                                <td>{homEl.molecular_weight}</td>
                                                <td>{homEl.rmsd}</td>
                                                <td>{homEl.seq_ident.toFixed(2)}</td>
                                                <td>
                                                    <MoorhenButton key={1} size="sm" variant="outlined" onClick={handleVisibility}>
                                                        {isVisible ? <VisibilityOutlined /> : <VisibilityOffOutlined />}
                                                    </MoorhenButton>
                                                    <MoorhenButton key={2} size="sm" variant="outlined" onClick={handleCentering}>
                                                        <CenterFocusWeakOutlined />
                                                    </MoorhenButton>
                                                    <MoorhenButton key={3} size="sm" variant="outlined" onClick={handleDownload}>
                                                        <DownloadOutlined />
                                                    </MoorhenButton>
                                                </td>
                                            </tr>
                                        );
                                    } else {
                                        return <tr key={i}></tr>;
                                    }
                                })}
                            </tbody>
                        </Table>
                        <Container style={{ backgroundColor: isDark ? "#7d7d7d" : "white", color: isDark ? "white" : "black" }}>
                            <MoorhenSequenceViewer
                                sequences={homologsSequencesLists}
                                onResidueClick={handleClickResidue}
                                nameColumnWidth={4}
                                columnWidth={0.45}
                                fontSize={0.5}
                                reOrder={false}
                            ></MoorhenSequenceViewer>
                        </Container>
                    </AccordionDetails>
                </Accordion>
                <Accordion
                    defaultExpanded
                    className="moorhen-accordion"
                    disableGutters={true}
                    elevation={0}
                    style={{ padding: "0.2rem", backgroundColor: isDark ? "#333333" : "white" }}
                >
                    <AccordionSummary style={{ backgroundColor: isDark ? "#adb5bd" : "#ecf0f1" }} expandIcon={<ExpandMoreOutlined />}>
                        Structure predictions from the EBI AlphaFold database
                    </AccordionSummary>
                    <AccordionDetails style={{ padding: "0.2rem", backgroundColor: isDark ? "#333333" : "white" }}>
                        <Table style={{ backgroundColor: isDark ? "#3d3d3d" : "white" }}>
                            <thead>
                                <tr>
                                    {afHeaders.map(head => (
                                        <th key={head.key} onClick={() => handleAFSortingChange(head.key)}>
                                            {head.label} {head.key === afSortField ? afArrow : <></>}
                                        </th>
                                    ))}
                                    <th>
                                        <em>Tools</em>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {afJson.toSorted(afSortFun).map((afEl, i) => {
                                    const model_id = afEl.pdb_file;
                                    const foundModel = mrParseModels.find(
                                        mod => "models/" + mod.name + ".pdb" === model_id || "homologs/" + mod.name + ".pdb" === model_id
                                    );
                                    if (foundModel) {
                                        const isVisible = visibleMolecules.indexOf(foundModel.molNo) > -1;
                                        const handleDownload = async () => {
                                            await foundModel.downloadAtoms();
                                        };
                                        const handleCentering = () => {
                                            foundModel.centreOn();
                                        };
                                        const handleVisibility = () => {
                                            dispatch(isVisible ? hideMolecule(foundModel) : showMolecule(foundModel));
                                        };
                                        return (
                                            <tr key={i}>
                                                <td>{afEl.name}</td>
                                                <td>{afEl.date_made}</td>
                                                <td>{afEl.range}</td>
                                                <td>{afEl.length}</td>
                                                <td>{afEl.avg_plddt.toFixed(2)}</td>
                                                <td>{afEl.h_score}</td>
                                                <td>{afEl.seq_ident.toFixed(2)}</td>
                                                <td>
                                                    <MoorhenButton key={1} size="sm" variant="outlined" onClick={handleVisibility}>
                                                        {isVisible ? <VisibilityOutlined /> : <VisibilityOffOutlined />}
                                                    </MoorhenButton>
                                                    <MoorhenButton key={2} size="sm" variant="outlined" onClick={handleCentering}>
                                                        <CenterFocusWeakOutlined />
                                                    </MoorhenButton>
                                                    <MoorhenButton key={3} size="sm" variant="outlined" onClick={handleDownload}>
                                                        <DownloadOutlined />
                                                    </MoorhenButton>
                                                </td>
                                            </tr>
                                        );
                                    } else {
                                        return <tr key={i}></tr>;
                                    }
                                })}
                            </tbody>
                        </Table>
                        <Container style={{ backgroundColor: isDark ? "#7d7d7d" : "white", color: isDark ? "white" : "black" }}>
                            <MoorhenSequenceViewer
                                sequences={afSequencesLists}
                                onResidueClick={handleClickResidue}
                                nameColumnWidth={5}
                                columnWidth={0.45}
                                fontSize={0.5}
                                reOrder={false}
                            ></MoorhenSequenceViewer>
                        </Container>
                    </AccordionDetails>
                </Accordion>
            </>
        );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.MRPARSE}
            left={width / 6}
            top={height / 3}
            minHeight={50}
            minWidth={convertRemToPx(37)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(90, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="MrParse results"
            footer={footerContent}
            resizeNodeRef={resizeNodeRef}
            body={bodyContent}
        />
    );
};
