import { Fragment, useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Container, Col, Form, Row } from "react-bootstrap";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenChainSelect } from "../inputs/Selector/MoorhenChainSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenStack } from "../interface-base";
import { MoorhenButton } from "../inputs";
import { useCommandCentre } from "../../InstanceManager";
import { MoorhenToggle } from "../inputs/MoorhenToggle/Toggle"
import { MoorhenSequenceViewer, MoorhenSequenceViewerSequence, moorhenSequenceToSeqViewer, stringToSeqViewer } from "../sequence-viewer";

interface MoorhenConKitProps {
    resizeTrigger?: boolean;
    resizeNodeRef?: React.RefObject<HTMLDivElement>;
    size?: { width: number; height: number };
}

export const MoorhenConKit = (props: MoorhenConKitProps) => {

    const commandCentre = useCommandCentre();

    const [selectedInputModel, setSelectedInputModel] = useState<null | number>(null);
    const [selectedPredictedModel, setSelectedPredictedModel] = useState<null | number>(null);
    const [selectedInputChain, setSelectedInputChain] = useState<string | null>(null);
    const [selectedPredictedChain, setSelectedPredictedChain] = useState<string | null>(null);
    const [sequencesLists, setSequenceLists] = useState<MoorhenSequenceViewerSequence[] | null>([]);
    const [conKitMatches, setConKitMatches] = useState<any[] | null>([]);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const inputMoleculeSelectRef = useRef<HTMLSelectElement>(null);
    const predMoleculeSelectRef = useRef<HTMLSelectElement>(null);
    const inputChainSelectRef = useRef<HTMLSelectElement>(null);
    const predChainSelectRef = useRef<HTMLSelectElement>(null);

    const [specifyTargetChain, setSpecifyTargetChain] = useState<boolean>(false);
    const [doRenumber, setDoRenumber] = useState<boolean>(false);

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
        if(!predMoleculeSelectRef.current||!molecules[predMoleculeSelectRef.current.value]){
            return 
        }
        const foundMol = molecules[predMoleculeSelectRef.current.value]
        const filteredSeqs =  foundMol.sequences.filter(c => c.chain===selectedPredictedChain)
        if(foundMol&&filteredSeqs.length===1){
            const seq = filteredSeqs[0];

            const seqElementPLDDT = moorhenSequenceToSeqViewer(seq, foundMol.name, foundMol.molNo);
            seqElementPLDDT.colour = "rgb(128, 128, 128)";
            seqElementPLDDT.blockAlternateColour = true;
            seqElementPLDDT.missingAs = "none";
            seqElementPLDDT.hideResCode = true;
            seqElementPLDDT.displayName = "PLDDT";

            const seqElement = moorhenSequenceToSeqViewer(seq, foundMol.name, foundMol.molNo);
            seqElement.colour = "rgb(128, 128, 128)";
            seqElement.blockAlternateColour = true;
            seqElement.missingAs = "none";
            seqElement.hideResCode = true;
            seqElement.displayName = "Register";
            let seq1letter = ""
            const rgx = /.*?\([^\d]*(\d+)[^\d]*\).*/
            if(seqElement.residues.length>0){
                if(conKitMatches.length>0){
                    seqElement.colour = "#00ff00"
                    conKitMatches.forEach(m => {
                        if(m.original_number!==null) {
                            const registerError = seqElement.residues.find((element) => element.resNum === m.original_number);
                            if(registerError) registerError.colour = "#ff0000"
                        }
                        if(m.residue.match(rgx).length>0){
                            const matchResNum = parseInt(m.residue.match(rgx)[1])
                            const plddtResElement = seqElementPLDDT.residues.find((element) => element.resNum === matchResNum);
                            if(plddtResElement){
                                if(m.plddt>90){
                                    plddtResElement.colour = "#0053D6"; // Very high confidence
                                } else  if(m.plddt>70){
                                    plddtResElement.colour = "#65CBF3"; // Confident
                                } else  if(m.plddt>50){
                                    plddtResElement.colour = "#FFDB13"; // Confident
                                } else {
                                    plddtResElement.colour = "#FF7D45"; // Confident
                                }
                            }
                        }
                    })
                }
                seqElement.residuesDisplayOffset = 0
                seqElement.residues.forEach(r => {
                    seq1letter += r.resCode
                })
                seqElementPLDDT.residuesDisplayOffset = 0
                const afDisplaySequence = stringToSeqViewer(seq1letter, seqElement.residues[0].resNum);
                afDisplaySequence.displayName = "Query";
                list.push(afDisplaySequence);
                list.push(seqElement);
                list.push(seqElementPLDDT);
            }
        }
        setSequenceLists(list)
    },[inputMoleculeSelectRef.current, molecules, selectedInputChain,conKitMatches])

    const runConKit = useCallback(async () => {

       const input_cif_string = window.cootModule.get_mmcif_string_from_gemmi_struct(molecules[inputMoleculeSelectRef.current.value].gemmiStructure)
       const ref_cif_string = window.cootModule.get_mmcif_string_from_gemmi_struct(molecules[predMoleculeSelectRef.current.value].gemmiStructure)

        if(input_cif_string.length==0 || ref_cif_string.length==0){
            return
        }
        const response = (await commandCentre.current.cootCommand(
            {
                message: "run_conkit_validate",
                command: "run_conkit_validate",
                returnType: "string",
                commandArgs: [input_cif_string,ref_cif_string,"input.cif","ref.cif",inputChainSelectRef.current.value, specifyTargetChain, predChainSelectRef.current.value, doRenumber],
            },
            false
        )) as moorhen.WorkerResponse<string>;

        //FIXME - Hackery!!! Probably want to type the output from conkit and parse the JSON in the Worker
        const json_string = response.data.result as any as string

        const res = JSON.parse(json_string)
        setConKitMatches(res.residues)

    }, [inputMoleculeSelectRef.current, predMoleculeSelectRef.current, inputChainSelectRef.current, predChainSelectRef.current, molecules,specifyTargetChain,doRenumber]);

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

    const handleClickResidue = useCallback(
        (molIndex: number, molName: string, chain: string, resNum: number) => {
            const foundModel = molecules.find(mod => mod.name === molName);
            foundModel?.centreOn(`/*/${chain}/${resNum}-${resNum}/*`);
        },
        [molecules]
    );

    return (<>
                    <MoorhenStack direction="row">
                        <MoorhenStack direction="column">
                            <MoorhenMoleculeSelect label="Reference structure" onSelect={sel => handleModelChange(sel, false)} ref={inputMoleculeSelectRef} />
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
                            <MoorhenMoleculeSelect label="Predicted model" onSelect={sel => handleModelChange(sel, true)} ref={predMoleculeSelectRef} />
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
                    <MoorhenButton onClick={runConKit}>Run ConKit</MoorhenButton>
                    <MoorhenSequenceViewer
                        onResidueClick={handleClickResidue}
                        sequences={sequencesLists}
                        nameColumnWidth={5}
                        columnWidth={0.45}
                        fontSize={0.5}
                        reOrder={false}
                    />
            </>)
}
