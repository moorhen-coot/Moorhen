import { useCallback } from "react";
import { Col, Row, Form, Card, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import { MoorhenSlider } from "../inputs";
import { moorhenGlobalInstance } from "../../InstanceManager/MoorhenGlobalInstance";
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { cidToSpec, sleep } from "../../utils/utils";
import { hideModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { usePersistentState } from "../../store/menusSlice";
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";


export const MoorhenPepflipsDifferenceMap = () => {
    const modalId = modalKeys.PEPTIDE_FLIPS;
    const [selectedRmsd, setSelectedRmsd] = usePersistentState<number>(modalId, "selectedRmsd", 3.5, true);
    const dispatch = useDispatch();
    const commandCentre = moorhenGlobalInstance.getCommandCentre();

    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.refinementSettings.enableRefineAfterMod);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const { enqueueSnackbar } = useSnackbar();

    const filterMapFunction = (map: moorhen.Map) => map.isDifference;

    const flipPeptide = async (selectedMolecule: moorhen.Molecule, chainId: string, seqNum: number, insCode: string) => {
        await commandCentre.cootCommand(
            {
                returnType: "status",
                command: "flipPeptide_cid",
                commandArgs: [selectedMolecule.molNo, `//${chainId}/${seqNum}/C`, ""],
                changesMolecules: [selectedMolecule.molNo],
            },
            true
        );

        if (enableRefineAfterMod) {
            await commandCentre.cootCommand(
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

    const handleFlip = (...args: [moorhen.Molecule, string, number, string]) => {
        if (args.every((arg) => arg !== null)) {
            flipPeptide(...args);
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

        const response = (await commandCentre.cootCommand(inputData, false)) as moorhen.WorkerResponse<libcootApi.InterestingPlaceDataJS[]>;
        const newPepflips = response.data.result.result;

        return newPepflips;
    };

    const handleFlipAll = useCallback(
        async (selectedMolecule: moorhen.Molecule, residues: libcootApi.InterestingPlaceDataJS[]) => {
            dispatch(hideModal(modalKeys.PEPTIDE_FLIPS));
            if (selectedMolecule) {
                const handleStepFlipPeptide = async (cid: string) => {
                    const resSpec = cidToSpec(cid);
                    await selectedMolecule.centreAndAlignViewOn(cid, false);
                    await sleep(1000);
                    await flipPeptide(selectedMolecule, resSpec.chain_id, resSpec.res_no, resSpec.ins_code);
                };

                const residueList = residues.map((residue) => {
                    return {
                        cid: `//${residue.chainId}/${residue.resNum}/`,
                    };
                });

                enqueueSnackbar("flip-all-peptides", {
                    variant: "residueSteps",
                    persist: true,
                    residueList: residueList,
                    sleepTime: 1500,
                    onStep: handleStepFlipPeptide,
                    onStart: async () => {
                        await selectedMolecule.fetchIfDirtyAndDraw("rama");
                    },
                    onStop: () => {
                        selectedMolecule.clearBuffersOfStyle("rama");
                    },
                });
            }
        },
        [molecules]
    );

    const getCards = useCallback(
        (selectedModel: number, selectedMap: number, newPepflips: libcootApi.InterestingPlaceDataJS[]):React.JSX.Element[] => {
            const selectedMolecule = molecules.find((molecule) => molecule.molNo === selectedModel);
            let cards = newPepflips.map((flip, index) => {
                return (
                    <Card key={index} style={{ marginTop: "0.5rem" }}>
                        <Card.Body style={{ padding: "0.5rem" }}>
                            <Row style={{ display: "flex", justifyContent: "between" }}>
                                <Col style={{ alignItems: "center", justifyContent: "left", display: "flex" }}>{flip.buttonLabel}</Col>
                                <Col className="col-3" style={{ margin: "0", padding: "0", justifyContent: "right", display: "flex" }}>
                                    <Button
                                        style={{ marginRight: "0.5rem" }}
                                        onClick={() => selectedMolecule.centreAndAlignViewOn(`//${flip.chainId}/${flip.resNum}-${flip.resNum}/`, false)}
                                    >
                                        View
                                    </Button>
                                    <Button
                                        style={{ marginRight: "0.5rem" }}
                                        onClick={() => {
                                            handleFlip(selectedMolecule, flip.chainId, flip.resNum, flip.insCode);
                                        }}
                                    >
                                        Flip
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                );
            });
            if (cards.length > 0) {
                const button = (
                    <Button style={{ width: "100%" }} onClick={() => handleFlipAll(selectedMolecule, newPepflips)} key="flip-all-button">
                        Flip all
                    </Button>
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
                <Col style={{ justifyContent: "center", alignContent: "center", alignItems: "center", display: "flex" }}>
                    <Form.Group controlId="rmsdSlider" style={{ margin: "0.5rem", width: "100%" }}>
                        <MoorhenSlider
                            minVal={2.5}
                            maxVal={7.0}
                            logScale={false}
                            sliderTitle="RMSD"
                            stepButtons={0.5}
                            decimalPlaces={1}
                            externalValue={selectedRmsd}
                            setExternalValue={(value) => setSelectedRmsd(value)}
                        />
                    </Form.Group>
                </Col>
            }
        />
    );
};
