import { UnknownAction } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch, useCallback } from "react";
import { CommandCentre } from "@/InstanceManager/CommandCentre";
import { setShownControl } from "@/store";
import { useCommandCentre } from "../../InstanceManager";
import { usePersistentState } from "../../store/menusSlice";
import { hideModal } from "../../store/modalsSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { MoorhenButton, MoorhenSlider } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";

export const flipPeptide = async (
    selectedMolecule: moorhen.Molecule,
    chainId: string,
    seqNum: number,
    insCode: string,
    commandCentre: React.RefObject<CommandCentre>,
    enableRefineAfterMod: boolean,
    dispatch: Dispatch<UnknownAction>
) => {
    await commandCentre.current.cootCommand(
        {
            returnType: "status",
            command: "flipPeptide_cid",
            commandArgs: [selectedMolecule.molNo, `//${chainId}/${seqNum}/C`, ""],
            changesMolecules: [selectedMolecule.molNo],
        },
        true
    );

    if (enableRefineAfterMod) {
        await commandCentre.current.cootCommand(
            {
                returnType: "status",
                command: "refine_residues_using_atom_cid",
                commandArgs: [selectedMolecule.molNo, `//${chainId}/${seqNum}`, "TRIPLE", 4000],
                changesMolecules: [selectedMolecule.molNo],
            },
            true
        );
    }

    selectedMolecule.setAtomsDirty(true);
    await selectedMolecule.redraw();
    dispatch(triggerUpdate(selectedMolecule.molNo));
};
export const MoorhenPepflipsDifferenceMap = () => {
    const modalId = modalKeys.PEPTIDE_FLIPS;
    const [selectedRmsd, setSelectedRmsd] = usePersistentState<number>(modalId, "selectedRmsd", 3.5, true);
    const dispatch = useDispatch();
    const commandCentre = useCommandCentre();

    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.refinementSettings.enableRefineAfterMod);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const filterMapFunction = (map: moorhen.Map) => map.isDifference;

    const handleFlip = (...args: [moorhen.Molecule, string, number, string]) => {
        if (args.every(arg => arg !== null)) {
            flipPeptide(...args, commandCentre, enableRefineAfterMod, dispatch);
        }
    };

    const fetchCardData = async (selectedModel: number, selectedMap: number): Promise<libcootApi.InterestingPlaceDataJS[]> => {
        if (selectedRmsd === null) {
            return null;
        }

        const inputData: moorhen.cootCommandKwargs = {
            message: "coot_command",
            command: "pepflips_using_difference_map",
            returnType: "interesting_places_data",
            commandArgs: [selectedModel, selectedMap, selectedRmsd],
        };

        const response = (await commandCentre.current.cootCommand(inputData, false)) as moorhen.WorkerResponse<
            libcootApi.InterestingPlaceDataJS[]
        >;
        const newPepflips = response.data.result.result;

        return newPepflips;
    };

    const handleFlipAll = useCallback(
        async (selectedMolecule: moorhen.Molecule, residues: libcootApi.InterestingPlaceDataJS[]) => {
            dispatch(hideModal(modalKeys.PEPTIDE_FLIPS));
            if (selectedMolecule) {
                const residueList = residues.map(residue => {
                    return `//${residue.chainId}/${residue.resNum}/`;
                });
                dispatch(
                    setShownControl({
                        name: "flipAllPeptides",
                        payload: { residueList: residueList, selectedMolecule: selectedMolecule.molNo },
                    })
                );
            }
        },
        [molecules]
    );

    const getCards = useCallback(
        (selectedModel: number, selectedMap: number, newPepflips: libcootApi.InterestingPlaceDataJS[]): React.JSX.Element[] => {
            const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel);
            let cards = newPepflips.map((flip, index) => {
                return (
                    <MoorhenStack direction="row" style={{ margin: "0.0rem" }}>
                        <label style={{ height:"2.1rem", margin:"0.1rem", display: "flex", alignItems: "center" }}>{flip.buttonLabel}</label>
                        <MoorhenStack direction="row" style={{ display: "flex", marginLeft: "auto", marginRight: "0rem" }}>

                        <MoorhenButton
                            style={{ display: "flex", marginLeft: "auto", marginRight: "0.1rem" }}
                            onClick={() => selectedMolecule.centreAndAlignViewOn(`//${flip.chainId}/${flip.resNum}-${flip.resNum}/`, false)}
                        >
                            View
                        </MoorhenButton>
                        <MoorhenButton
                            style={{ display: "flex", marginLeft: "0rem" }}
                            onClick={() => {
                                handleFlip(selectedMolecule, flip.chainId, flip.resNum, flip.insCode);
                            }}
                        >
                            Flip
                        </MoorhenButton>
                    </MoorhenStack>
                    </MoorhenStack>
                );
            });
            if (cards.length > 0) {
                const button = (
                    <MoorhenButton
                        style={{ width: "100%" }}
                        onClick={() => handleFlipAll(selectedMolecule, newPepflips)}
                        key="flip-all-button"
                    >
                        Flip all
                    </MoorhenButton>
                );
                cards = [button, ...cards];
            }
            return cards;
        },
        [molecules]
    );

    return (
        <MoorhenValidationListWidgetBase
            filterMapFunction={filterMapFunction}
            fetchData={fetchCardData}
            getCards={getCards}
            extraControlFormValue={selectedRmsd}
            menuId="PEPTIDE_FLIPS"
            extraControlForm={
                <MoorhenSlider
                    minVal={2.5}
                    maxVal={7.0}
                    logScale={false}
                    sliderTitle="RMSD"
                    stepButtons={0.5}
                    decimalPlaces={1}
                    externalValue={selectedRmsd}
                    setExternalValue={(value: number) => setSelectedRmsd(value)}
                />
            }
        />
    );
};
