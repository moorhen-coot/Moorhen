import { useSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { memo, useState } from "react";
import { MoorhenLigandSelect } from "@/components/inputs/Selector/MoorhenLigandSelect";
import { addCustomRepresentation, removeCustomRepresentation } from "../../../store/moleculesSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenButton, MoorhenNumberInput, MoorhenSelect, MoorhenToggle } from "../../inputs";
import { MoorhenCidInputForm } from "../../inputs/Cid/MoorhenCidInputForm";
import { MoorhenStack } from "../../interface-base";
import { MoleculeRepresentation } from "../../../utils/MoorhenMoleculeRepresentation";

export const PictureWizardCard = memo(
    (props: {
        molecule: moorhen.Molecule;
        setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
        onApply?: () => void;
    }) => {
        const [wizardType, setWizardType] = useState<"site-and-ribbons" | "bonds" | "ribbons" | "catrace">("site-and-ribbons");
        const [ruleType, setRuleType] = useState<"ligands" | "cid">("ligands");
        const [ligandSelection, setLigandSelection] = useState<string | null>(null);
        const [cid, setCid] = useState<string>("/*/*/*/*:*");
        const [deleteExisting, setDeleteExisting] = useState<boolean>(true);
        const [neighboursDistance, setNeighboursDistance] = useState<number>(6.0);

        const dispatch = useDispatch();

        const { enqueueSnackbar } = useSnackbar();

        const createRepresentations = async () => {

            if(deleteExisting){
                props.setBusy?.(true);
                props.molecule.representations.forEach(rep => {
                    props.molecule.removeRepresentation(rep.uniqueId)
                    dispatch(removeCustomRepresentation(rep));
                })
                props.molecule.clearBuffersOfStyle("environment");
                props.setBusy?.(false);
            }

            let splitLigands = []
            if(wizardType==="site-and-ribbons" || wizardType==="ribbons") {
                if(ruleType==="ligands"){
                    let theLigandSelection = ""
                    if(ligandSelection){
                        theLigandSelection = ligandSelection
                    } else if(props.molecule.ligands&&props.molecule.ligands.length>0) {
                        theLigandSelection = props.molecule.ligands.map(x => x.cid).join("||")
                    } else {
                        return
                    }
                    splitLigands = theLigandSelection.split("||")
                } else if(ruleType==="cid"){
                    splitLigands = cid.split("||")
                }
            }
            if(wizardType==="site-and-ribbons") {
                if(splitLigands){
                    if(splitLigands.length>3){
                        await createWizardRepresentation({ ruleType: "molecule", representationStyle: "CBs", neighboursCid: splitLigands.join("||"), restrictToNeighbours: true, sideChainOnly: true });
                        await createWizardRepresentation({ ruleType: "molecule", representationStyle: "allHBonds", neighboursCid: splitLigands.join("||"), restrictToNeighbours: true });
                    } else {
                        for(let ilig=0; ilig<splitLigands.length; ilig++){
                            await createWizardRepresentation({ ruleType: "molecule", representationStyle: "CBs", neighboursCid: splitLigands[ilig], restrictToNeighbours: true, sideChainOnly: true });
                            await createWizardRepresentation({ ruleType: "molecule", representationStyle: "allHBonds", neighboursCid: splitLigands[ilig], restrictToNeighbours: true });
                        }
                    }
                }
                await createWizardRepresentation({ ruleType: "molecule", representationStyle: "CRs" });
            } else if(wizardType==="ribbons") {
                if(splitLigands){
                    await createWizardRepresentation({ ruleType: "cid", representationStyle: "CBs", cid: splitLigands.join("||") });
                }
                await createWizardRepresentation({ ruleType: "molecule", representationStyle: "CRs" });
            } else if(wizardType==="catrace") {
                await createWizardRepresentation({ ruleType: "molecule", representationStyle: "CAs" });
            } else if(wizardType==="bonds") {
                await createWizardRepresentation({ ruleType: "molecule", representationStyle: "CBs" });
            }
        }

        const createWizardRepresentation = async (params: {
            ruleType: "molecule" | "cid";
            representationStyle: "CBs" | "CRs" | "CAs" | "allHBonds";
            neighboursCid?: string;
            restrictToNeighbours?: boolean;
            excludeNeighbours?: boolean;
            cid?: string;
            sideChainOnly?: boolean;
        }) => {
            props.setBusy?.(true);

            const representation = await MoleculeRepresentation.create({
                ...params,
                molecule: props.molecule,
                neighboursDistance,
                hbondedTo: params.restrictToNeighbours ?? false,
            });

            if (representation) {
                dispatch(addCustomRepresentation(representation));
                props.onApply?.();
            }

            props.setBusy?.(false);
        };

        const handleCreateRepresentation = async () => {
            try {
                await createRepresentations();
            } catch (err) {
                console.warn(err);
                enqueueSnackbar(`Something went wrong while creating a new custom representation`, {
                    variant: "error",
                });
            }
        };

        const isThereLigand: boolean = props.molecule.ligands.length > 0;

        return (
            <MoorhenStack style={{ width: "25rem", margin: "0.5rem" }}>
                <MoorhenStack inputGrid>
                        <MoorhenSelect label={"Wizard"} defaultValue={wizardType} setValue={setWizardType}>
                                <>
                                    <option value={"site-and-ribbons"} key={"site-and-ribbons"}>
                                        Binding site and ribbons
                                    </option>
                                    <option value={"ribbons"} key={"ribbons"}>
                                        Ribbons and ligands
                                    </option>
                                    <option value={"catrace"} key={"catrace"}>
                                        CA trace and ligands
                                    </option>
                                    <option value={"bonds"} key={"bonds"}>
                                        Bonds
                                    </option>
                                </>
                        </MoorhenSelect>
                        {(wizardType === "site-and-ribbons" || wizardType === "ribbons") && (
                            <MoorhenSelect label={"Residue selection"} defaultValue={ruleType} setValue={setRuleType}>
                                <>
                                    {isThereLigand && (
                                        <option value={"ligands"} key={"ligands"}>
                                            Ligands
                                        </option>
                                    )}
                                    <option value={"cid"} key={"cid"}>
                                        Atom selection
                                    </option>
                                </>
                            </MoorhenSelect>
                        )}
                    {ruleType === "cid"  && (wizardType === "site-and-ribbons" || wizardType === "ribbons") && (
                        <MoorhenCidInputForm
                            setValue={setCid}
                            label="Atom selection"
                            defaultValue={""}
                            allowUseCurrentSelection={true}
                        />
                    )}
                    {ruleType === "ligands" && (wizardType === "site-and-ribbons" || wizardType === "ribbons") && (
                        <>
                            <MoorhenLigandSelect
                                selectedCoordMolNo={props.molecule.molNo}
                                molecules={[props.molecule]}
                                allowAll
                                setValue={setLigandSelection}
                            />
                        </>
                    )}
                    {wizardType === "site-and-ribbons" &&
                        <MoorhenNumberInput
                           value={neighboursDistance}
                           type="number"
                           label="Neighbours distance:"
                           setValue={setNeighboursDistance}
                        />
                    }
                </MoorhenStack>
                <MoorhenToggle
                    label="Delete all existing representations"
                    checked={deleteExisting}
                    onChange={() => setDeleteExisting(!deleteExisting)}
                />
                <MoorhenButton onClick={handleCreateRepresentation}>Create</MoorhenButton>
            </MoorhenStack>
        );
    }
);
