import { useSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { memo, useState } from "react";
import { MoorhenLigandSelect } from "@/components/inputs/Selector/MoorhenLigandSelect";
import { addCustomRepresentation, removeCustomRepresentation } from "../../../store/moleculesSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenButton, MoorhenNumberInput, MoorhenSelect, MoorhenToggle } from "../../inputs";
import { MoorhenCidInputForm } from "../../inputs/Cid/MoorhenCidInputForm";
import { MoorhenStack } from "../../interface-base";
import { PictureWizardType, runPictureWizard } from "../../../utils/Representation/PictureWizard";
import { useMoorhenInstance } from "@/InstanceManager/useMoorhenInstance";

export const PictureWizardCard = memo(
    (props: {
        molecule: moorhen.Molecule;
        setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
        onApply?: () => void;
    }) => {
        const [wizardType, setWizardType] = useState<PictureWizardType>("site-and-ribbons");
        const [ruleType, setRuleType] = useState<"ligands" | "cid">("ligands");
        const [ligandSelection, setLigandSelection] = useState<string | null>(null);
        const [cid, setCid] = useState<string>("/*/*/*/*:*");
        const [deleteExisting, setDeleteExisting] = useState<boolean>(true);
        const [neighboursDistance, setNeighboursDistance] = useState<number>(6.0);
        const moorhenInstance = useMoorhenInstance();

        const dispatch = useDispatch();

        const { enqueueSnackbar } = useSnackbar();

        const handleCreateRepresentation = async () => {
            props.setBusy?.(true);
            try {
                await runPictureWizard({
                    molecule: props.molecule,
                    wizardType,
                    ruleType,
                    ligandSelection,
                    cid,
                    neighboursDistance,
                    deleteExisting,
                    onRepresentationAdded: representation => dispatch(addCustomRepresentation(representation)),
                    onRepresentationRemoved: representation => dispatch(removeCustomRepresentation(representation)),
                    onApply: props.onApply,
                    dispatch: moorhenInstance.dispatch,
                });
            } catch (err) {
                console.warn(err);
                enqueueSnackbar(`Something went wrong while creating a new custom representation`, {
                    variant: "error",
                });
            } finally {
                props.setBusy?.(false);
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
                                    <option value={"ribbons-and-ligands"} key={"ribbons-and-ligands"}>
                                        Ribbons and ligands
                                    </option>
                                    <option value={"ribbons-and-side-chains"} key={"ribbons-and-side-chains"}>
                                        Ribbons and side chains
                                    </option>
                                    <option value={"catrace"} key={"catrace"}>
                                        CA trace and ligands
                                    </option>
                                    <option value={"bonds"} key={"bonds"}>
                                        Bonds
                                    </option>
                                </>
                        </MoorhenSelect>
                        {(wizardType === "site-and-ribbons" || wizardType === "ribbons-and-ligands") && (
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
                    {ruleType === "cid"  && (wizardType === "site-and-ribbons" || wizardType === "ribbons-and-ligands") && (
                        <MoorhenCidInputForm
                            setValue={setCid}
                            label="Atom selection"
                            defaultValue={""}
                            allowUseCurrentSelection={true}
                        />
                    )}
                    {ruleType === "ligands" && (wizardType === "site-and-ribbons" || wizardType === "ribbons-and-ligands") && (
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
