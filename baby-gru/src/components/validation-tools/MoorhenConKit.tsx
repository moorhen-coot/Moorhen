import { useDispatch, useSelector } from "react-redux";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { handleResiduesSelection, useHoveredResidue } from "@/components/sequence-viewer/utils";
import { useCommandCentre } from "../../InstanceManager";
import { moorhen } from "../../types/moorhen";
import { MoorhenFileInput, MoorhenMoleculeSelect } from "../inputs";
import { MoorhenButton } from "../inputs";
import { MoorhenToggle } from "../inputs/MoorhenToggle/Toggle";
import { MoorhenChainSelect } from "../inputs/Selector/MoorhenChainSelect";
import { MoorhenStack } from "../interface-base";
import { MoorhenSequenceViewer, MoorhenSequenceViewerSequence, moorhenSequenceToSeqViewer, stringToSeqViewer } from "../sequence-viewer";
import type { ResiduesSelection, SeqElement } from "../sequence-viewer/MoorhenSeqViewTypes";

interface MoorhenConKitProps {
    resizeTrigger?: boolean;
    resizeNodeRef?: React.RefObject<HTMLDivElement>;
    size?: { width: number; height: number };
}

export const MoorhenConKit = (props: MoorhenConKitProps) => {
    const commandCentre = useCommandCentre();
    const dispatch = useDispatch();

    const [selectedInputModel, setSelectedInputModel] = useState<null | number>(null);
    const [selectedPredictedModel, setSelectedPredictedModel] = useState<null | number>(null);
    const [selectedInputChain, setSelectedInputChain] = useState<string | null>(null);
    const [selectedPredictedChain, setSelectedPredictedChain] = useState<string | null>(null);
    const [sequencesLists, setSequenceLists] = useState<MoorhenSequenceViewerSequence[] | null>([]);
    const [conKitMatches, setConKitMatches] = useState<any[] | null>([]);
    const [conKitSuccess, setConKitSuccess] = useState<boolean>(true);
    const [sequenceText, setSequenceText] = useState<null | string>(null);
    const [sequenceFileName, setSequenceFileName] = useState<null | string>(null);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    
    // added by tk 
    const [noeFileContent, setNOEFileContent] = useState<string | null>(null);
    const [NOEMatches, setNOEMatches] = useState<any[]>([]);
    const [NOESuccess, setNOESuccess] = useState<boolean>(false);    

    const [hBondFileContent, setHBondFileContent] = useState<string | null>(null);
    const [HBondMatches, setHBondMatches] = useState<any[]>([]);
    const [HBondSuccess, setHBondSuccess] = useState<boolean>(false);  

    const [undefinedFileContent, setUndefinedFileContent] = useState<string | null>(null);
    const [UndefinedMatches, setUndefinedMatches] = useState<any[]>([]);
    const [UndefinedSuccess, setUndefinedSuccess] = useState<boolean>(false);  
    // added by tk

    const inputMoleculeSelectRef = useRef<HTMLSelectElement>(null);
    const predMoleculeSelectRef = useRef<HTMLSelectElement>(null);
    const inputChainSelectRef = useRef<HTMLSelectElement>(null);
    const predChainSelectRef = useRef<HTMLSelectElement>(null);

    const [specifyTargetChain, setSpecifyTargetChain] = useState<boolean>(false);
    const [doRenumber, setDoRenumber] = useState<boolean>(false);
    const [specifySequence, setSpecifySequence] = useState<boolean>(false);
    const [hoverText, setHoverText] = useState<string>("");

    const sequenceFileRef = useRef<null | HTMLInputElement>(null);

    const handlePredictedChainChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedPredictedChain(evt.target.value);
    };

    const handleInputChainChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedInputChain(evt.target.value);
    };

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedPredictedModel(null);
            setSelectedInputModel(null);
            setSelectedPredictedChain(null);
            setSelectedInputChain(null);
            return;
        }

        if (selectedPredictedModel === null || !molecules.map(molecule => molecule.molNo).includes(selectedPredictedModel)) {
            setSelectedPredictedModel(molecules[0].molNo);
            if (molecules[0].sequences && molecules[0].sequences.length > 0 && molecules[0].sequences[0].chain) {
                setSelectedPredictedChain(molecules[0].sequences[0].chain);
            } else {
                setSelectedPredictedChain("A");
            }
        }

        if (selectedInputModel === null || !molecules.map(molecule => molecule.molNo).includes(selectedInputModel)) {
            setSelectedInputModel(molecules[0].molNo);
            if (molecules[0].sequences && molecules[0].sequences.length > 0 && molecules[0].sequences[0].chain) {
                setSelectedInputChain(molecules[0].sequences[0].chain);
            } else {
                setSelectedInputChain("A");
            }
        }
    }, [molecules.length]);

    useEffect(() => {
        const list: MoorhenSequenceViewerSequence[] = [];
        const foundMol = molecules.find(mol => mol.molNo === parseInt(predMoleculeSelectRef.current.value));
        if (!predMoleculeSelectRef.current || !foundMol) {
            return;
        }

        const filteredSeqs = foundMol.sequences.filter(c => c.chain === selectedPredictedChain);
        if (foundMol && filteredSeqs.length === 1) {
            const seq = filteredSeqs[0];

            const seqElementPLDDT = moorhenSequenceToSeqViewer(seq, foundMol.name, foundMol.molNo);
            seqElementPLDDT.colour = "rgb(128, 128, 128)";
            seqElementPLDDT.blockAlternateColour = true;
            seqElementPLDDT.missingAs = "none";
            seqElementPLDDT.hideResCode = true;
            seqElementPLDDT.displayName = "PLDDT";
            seqElementPLDDT.key = "PLDDT";

            const seqElementMatch = moorhenSequenceToSeqViewer(seq, foundMol.name, foundMol.molNo);
            seqElementMatch.colour = "rgb(128, 128, 128)";
            seqElementMatch.blockAlternateColour = true;
            seqElementMatch.missingAs = "none";
            seqElementMatch.hideResCode = true;
            seqElementMatch.displayName = "Matches";
            seqElementMatch.key = "Matches";

            const seqElement = moorhenSequenceToSeqViewer(seq, foundMol.name, foundMol.molNo);
            seqElement.colour = "rgb(128, 128, 128)";
            seqElement.blockAlternateColour = true;
            seqElement.missingAs = "none";
            seqElement.hideResCode = true;
            seqElement.displayName = "Register";
            seqElement.key = "Register";
            let seq1letter = "";
            const rgx = /.*?\([^\d]*(\d+)[^\d]*\).*/;
            if (seqElement.residues.length > 0 && conKitMatches.length > 0) {
                seqElement.residues.forEach(r => {
                    seq1letter += r.resCode;
                });
                seqElement.colour = "#00ff00";
                let ires = 0;
                conKitMatches.forEach(m => {
                    if (m.predicted_contacts !== null) {
                        const matchScore = 255 - Math.trunc(Math.min(m.predicted_contacts / 15, 1.0) * 255);
                        seqElementMatch.residues[ires].colour = `rgb(${matchScore},${matchScore},${matchScore})`;
                    }
                    if (m.original_number !== null) {
                        seqElement.residues[ires].colour = "#ff0000";
                    }
                    if (m.residue.match(rgx).length > 0) {
                        const matchResNum = parseInt(m.residue.match(rgx)[1]);
                        const plddtResElement = seqElementPLDDT.residues[ires];
                        if (plddtResElement) {
                            if (m.plddt > 90) {
                                plddtResElement.colour = "#0053D6"; // Very high confidence
                            } else if (m.plddt > 70) {
                                plddtResElement.colour = "#65CBF3"; // Confident
                            } else if (m.plddt > 50) {
                                plddtResElement.colour = "#FFDB13"; // Confident
                            } else {
                                plddtResElement.colour = "#FF7D45"; // Confident
                            }
                        }
                    }
                    ires++;
                });
                seqElement.residuesDisplayOffset = 0;
                seqElementPLDDT.residuesDisplayOffset = 0;
                const afDisplaySequence = stringToSeqViewer(seq1letter, seqElement.residues[0].resNum);
                afDisplaySequence.displayName = "Query";
                afDisplaySequence.key = "Query";
                list.push(afDisplaySequence);
                list.push(seqElement);
                list.push(seqElementPLDDT);
                list.push(seqElementMatch);
            }
        }
        setSequenceLists(list);
    }, [inputMoleculeSelectRef.current, molecules, selectedInputChain, conKitMatches]);

    const runConKit = useCallback(async () => {
        const inputMol = molecules.find(mol => mol.molNo === parseInt(inputMoleculeSelectRef.current.value));
        const predMol = molecules.find(mol => mol.molNo === parseInt(predMoleculeSelectRef.current.value));

        const input_cif_string = window.cootModule.get_mmcif_string_from_gemmi_struct(inputMol.gemmiStructure);
        const ref_cif_string = window.cootModule.get_mmcif_string_from_gemmi_struct(predMol.gemmiStructure);

        if (input_cif_string.length == 0 || ref_cif_string.length == 0) {
            return;
        }
        const response = (await commandCentre.current.cootCommand(
            {
                message: "run_conkit_validate",
                command: "run_conkit_validate",
                returnType: "string",
                commandArgs: [
                    input_cif_string,
                    ref_cif_string,
                    "input.cif",
                    "ref.cif",
                    inputChainSelectRef.current.value,
                    specifyTargetChain,
                    predChainSelectRef.current.value,
                    doRenumber,
                    specifySequence,
                    sequenceText,
                    specifySequence && sequenceFileName ? sequenceFileName : null,
                ],
            },
            false
        )) as moorhen.WorkerResponse<string>;

        //FIXME - Hackery!!! Probably want to type the output from conkit and parse the JSON in the Worker
        const json_string = response.data.result as any as string;

        const res = JSON.parse(json_string);
        setConKitMatches(res.residues);
        if (res.residues.length === 0) setConKitSuccess(false);
        else setConKitSuccess(true);
    }, [
        inputMoleculeSelectRef.current,
        predMoleculeSelectRef.current,
        inputChainSelectRef.current,
        predChainSelectRef.current,
        molecules,
        specifyTargetChain,
        doRenumber,
        specifySequence,
        sequenceText,
        sequenceFileName,
    ]);

    const runNOERestraints = useCallback(async () => {
        const inputMol = molecules.find(mol => mol.molNo === parseInt(inputMoleculeSelectRef.current.value));

       const input_cif_string = window.cootModule.get_mmcif_string_from_gemmi_struct(inputMol.gemmiStructure)
        if (!noeFileContent) return

        if (input_cif_string.length === 0) {
            return
        }
        const response = (await commandCentre.current.cootCommand(
            {
                message: "get_noe_restraints",
                command: "get_noe_restraints",
                returnType: "string",
                commandArgs: [input_cif_string],
            },
            false
        )) as moorhen.WorkerResponse<string>;

        //FIXME - Hackery!!! Probably want to type the output from conkit and parse the JSON in the Worker
        const json_string = response.data.result as any as string

        const res = JSON.parse(json_string)
        setNOEMatches(res)
        if(res.length===0)
            setNOESuccess(false)
        else
            setNOESuccess(true)

    }, [noeFileContent]);

    const runHBondRestraints = useCallback(async () => {
        const inputMol = molecules.find(mol => mol.molNo === parseInt(inputMoleculeSelectRef.current.value));

       const input_cif_string = window.cootModule.get_mmcif_string_from_gemmi_struct(inputMol.gemmiStructure)
        if (!hBondFileContent) return

        if (input_cif_string.length === 0) {
            return
        }
        const response = (await commandCentre.current.cootCommand(
            {
                message: "get_hbond_restraints",
                command: "get_hbond_restraints",
                returnType: "string",
                commandArgs: [input_cif_string],
            },
            false
        )) as moorhen.WorkerResponse<string>;

        //FIXME - Hackery!!! Probably want to type the output from conkit and parse the JSON in the Worker
        const json_string = response.data.result as any as string

        const res = JSON.parse(json_string)
        setHBondMatches(res)
        if(res.length===0)
            setHBondSuccess(false)
        else
            setHBondSuccess(true)

    }, [hBondFileContent]);



    const runUndefinedRestraints = useCallback(async () => {
        const inputMol = molecules.find(mol => mol.molNo === parseInt(inputMoleculeSelectRef.current.value));

       const input_cif_string = window.cootModule.get_mmcif_string_from_gemmi_struct(inputMol.gemmiStructure)
        if (!undefinedFileContent) return

        if (input_cif_string.length === 0) {
            return
        }
        const response = (await commandCentre.current.cootCommand(
            {
                message: "get_undefined_restraints",
                command: "get_undefined_restraints",
                returnType: "string",
                commandArgs: [input_cif_string],
            },
            false
        )) as moorhen.WorkerResponse<string>;

        //FIXME - Hackery!!! Probably want to type the output from conkit and parse the JSON in the Worker
        const json_string = response.data.result as any as string

        const res = JSON.parse(json_string)
        setUndefinedMatches(res)
        if(res.length===0)
            setUndefinedSuccess(false)
        else
            setUndefinedSuccess(true)

    }, [hBondFileContent]);



    const handleModelChange = (evt: number, isReferenceModel: boolean) => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === evt);
        if (isReferenceModel) {
            setSelectedPredictedModel(evt);
            if (selectedMolecule.sequences && selectedMolecule.sequences.length > 0 && selectedMolecule.sequences[0].chain) {
                setSelectedPredictedChain(selectedMolecule.sequences[0].chain);
            } else {
                setSelectedPredictedChain("A");
            }
        } else {
            setSelectedInputModel(evt);
            if (selectedMolecule.sequences && selectedMolecule.sequences.length > 0 && selectedMolecule.sequences[0].chain) {
                setSelectedInputChain(selectedMolecule.sequences[0].chain);
            } else {
                setSelectedInputChain("A");
            }
        }
    };

    const handlResiduesSelect = useCallback(
        (selection: ResiduesSelection) => {
            const molecule = molecules[selection.molNo];
            handleResiduesSelection(selection, molecule, dispatch);
        },
        [molecules, dispatch]
    );

    const onHoverResidue = useCallback(
        (molName: string, chain: string, resNum: number, resCode: string, resCID: string) => {
            if (conKitMatches.length > resNum && conKitMatches[resNum - 1]) {
                const poss_reg_error = conKitMatches[resNum - 1].suggested_register;
                setHoverText(poss_reg_error.length > 0 ? `Suggested register change: ${poss_reg_error}` : "Register OK");
            }
        },
        [molecules, conKitMatches]
    );
    const handleClickResidue = useCallback(
        (molIndex: number, molName: string, chain: string, resNum: number) => {
            const foundModel = molecules.find(mod => mod.name === molName);
            foundModel?.centreOn(`/*/${chain}/${resNum}-${resNum}/*`);
        },
        [molecules]
    );

    const loadSequenceFile = async (f: File) => {
        const seqText = await f.text();
        setSequenceText(seqText);
        setSequenceFileName(f.name);
    };

    return (
        <>
            <div>
                <MoorhenStack direction="row">
                    <MoorhenStack direction="column">
                        <MoorhenMoleculeSelect
                            label="Reference structure"
                            onSelect={sel => handleModelChange(sel, false)}
                            ref={inputMoleculeSelectRef}
                        />
                        <MoorhenChainSelect
                            width=""
                            molecules={molecules}
                            onChange={handleInputChainChange}
                            selectedCoordMolNo={selectedInputModel}
                            ref={inputChainSelectRef}
                            allowedTypes={[1, 2]}
                        />
                    </MoorhenStack>
                    <MoorhenStack direction="column">
                        <MoorhenMoleculeSelect
                            label="Predicted model"
                            onSelect={sel => handleModelChange(sel, true)}
                            ref={predMoleculeSelectRef}
                        />
                        <MoorhenStack direction="row">
                            <MoorhenToggle
                                style={{ margin: "1.0rem", justifyContent: "left", display: "flex", gap: "0.5rem" }}
                                label="Specify predicted model chain"
                                checked={specifyTargetChain}
                                onChange={e => {
                                    setSpecifyTargetChain(!specifyTargetChain);
                                }}
                            />
                            <MoorhenChainSelect
                                width=""
                                disabled={!specifyTargetChain}
                                label=""
                                molecules={molecules}
                                onChange={handlePredictedChainChange}
                                selectedCoordMolNo={selectedPredictedModel}
                                ref={predChainSelectRef}
                                allowedTypes={[1, 2]}
                            />
                        </MoorhenStack>
                    </MoorhenStack>
                </MoorhenStack>
                <MoorhenToggle
                    style={{ margin: "1.0rem", justifyContent: "left", display: "flex", gap: "0.5rem" }}
                    label="Renumber residues to assist matching"
                    checked={doRenumber}
                    onChange={e => {
                        setDoRenumber(!doRenumber);
                    }}
                />
                <MoorhenStack direction="row">
                    <MoorhenToggle
                        style={{ margin: "1.0rem", justifyContent: "left", display: "flex", gap: "0.5rem" }}
                        label="Specify sequence file (fasta)"
                        checked={specifySequence}
                        onChange={e => {
                            setSpecifySequence(!specifySequence);
                        }}
                    />
                </MoorhenStack>
                <MoorhenFileInput
                    disabled={!specifySequence}
                    ref={sequenceFileRef}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        loadSequenceFile(e.target.files[0]);
                    }}
                />
                <MoorhenButton onClick={runConKit}>Run ConKit</MoorhenButton>
            </div>
            {conKitMatches !== null && conKitMatches.length === 0 && !conKitSuccess && (
                <div style={{ margin: "1.0rem", justifyContent: "left", display: "flex", gap: "0.5rem" }}>
                    <b>ConKit failed to produce any results</b>
                </div>
            )}
            <MoorhenSequenceViewer
                onResidueClick={handleClickResidue}
                onResiduesSelect={handlResiduesSelect}
                sequences={sequencesLists}
                onHoverResidue={onHoverResidue}
                nameColumnWidth={5}
                columnWidth={0.45}
                fontSize={0.5}
                reOrder={false}
            />
            <div>{hoverText}</div>
        </>
    );
};
