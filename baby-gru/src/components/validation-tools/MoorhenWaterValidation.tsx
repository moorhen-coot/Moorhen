import { useDispatch, useSelector } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton, MoorhenToggle } from "../inputs";
import { MoorhenNumberInput } from "../inputs/";
import { MoorhenStack } from "../interface-base";
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";

export const MoorhenWaterValidation = () => {
    const isDirty = useRef<boolean>(false);
    const busyFetching = useRef<boolean>(false);
    const ignorePartOccRef = useRef<HTMLInputElement>(null);
    const ignoreZeroOccRef = useRef<HTMLInputElement>(null);

    const [triggerDataFetch, setTriggerDataFetch] = useState<boolean>(false);
    const [bFactorLim, setBFactorLim] = useState<number>(60);
    const [sigmaLevel, setSigmaLevel] = useState<number>(0.8);
    const [minDist, setMinDist] = useState<number>(2.3);
    const [maxDist, setMaxDist] = useState<number>(3.5);
    const [ignorePartOcc, setIgnorePartOcc] = useState<boolean>(false);
    const [ignoreZeroOcc, setIgnoreZeroOcc] = useState<boolean>(false);
    const commandCentre = useCommandCentre();

    const dispatch = useDispatch();
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const viewWater = useCallback(
        async (selectedModel: number, water: libcootApi.AtomSpecJS) => {
            const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel);
            if (selectedMolecule) {
                const cid = `/${water.model_number}/${water.chain_id}/${water.res_no}`;
                await selectedMolecule.centreOn(cid, true, true);
            }
        },
        [molecules]
    );

    const deleteWater = useCallback(
        async (selectedModel: number, water: libcootApi.AtomSpecJS) => {
            const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel);
            if (selectedMolecule) {
                const cid = `/${water.model_number}/${water.chain_id}/${water.res_no}`;
                await selectedMolecule.deleteCid(cid);
                dispatch(triggerUpdate(selectedModel));
            }
        },
        [molecules]
    );

    const refineWater = useCallback(
        async (selectedModel: number, water: libcootApi.AtomSpecJS) => {
            const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel);
            if (selectedMolecule) {
                const cid = `/${water.model_number}/${water.chain_id}/${water.res_no}`;
                await selectedMolecule.refineResiduesUsingAtomCid(cid, "SNGLE");
                dispatch(triggerUpdate(selectedModel));
            }
        },
        [molecules]
    );

    const fetchCardData = useCallback(
        async (selectedModel: number, selectedMap: number): Promise<libcootApi.AtomSpecJS[]> => {
            busyFetching.current = true;
            let badWaters = [];

            const inputData: moorhen.cootCommandKwargs = {
                message: "coot_command",
                command: "find_water_baddies",
                returnType: "atom_specs",
                commandArgs: [
                    selectedModel,
                    selectedMap,
                    bFactorLim,
                    sigmaLevel,
                    minDist,
                    maxDist,
                    ignorePartOccRef.current.checked,
                    ignoreZeroOccRef.current.checked,
                ],
            };

            let response = (await commandCentre.current.cootCommand(inputData, false)) as moorhen.WorkerResponse<libcootApi.AtomSpecJS[]>;
            if (response.data.result.result) {
                badWaters = response.data.result.result;
            } else if (response.data.result.status === "Exception") {
                console.warn(response.data.consoleMessage);
            } else {
                console.warn("Moorhen was unable to get water validation...");
            }

            busyFetching.current = false;
            return badWaters;
        },
        [bFactorLim, sigmaLevel, minDist, maxDist]
    );

    const getCards = (selectedModel: number, selectedMap: number, badWaters: libcootApi.AtomSpecJS[]): React.JSX.Element[] => {
        if (badWaters) {
            return badWaters.map((water, index) => {
                return (
                    <>
                        <MoorhenStack direction="horizontal">
                            {`/${water.model_number}/${water.chain_id}/${water.res_no}(HOH)    ${water.string_user_data}`}
                        </MoorhenStack>
                        <MoorhenStack direction="horizontal">
                            <MoorhenButton
                                style={{ marginRight: "0.5rem" }}
                                onClick={() => {
                                    viewWater(selectedModel, water);
                                }}
                            >
                                View
                            </MoorhenButton>
                            <MoorhenButton
                                style={{ marginRight: "0.5rem" }}
                                onClick={() => {
                                    refineWater(selectedModel, water);
                                }}
                            >
                                Refine
                            </MoorhenButton>
                            <MoorhenButton
                                style={{ marginRight: "0.5rem" }}
                                onClick={() => {
                                    deleteWater(selectedModel, water);
                                }}
                            >
                                Delete
                            </MoorhenButton>
                        </MoorhenStack>
                    </>
                );
            });
        } else {
            console.warn("Got undefined value for bad waters...");
        }
    };

    const handleControlFormChange = () => {
        setTimeout(() => {
            if (isDirty.current) {
                if (!busyFetching.current) {
                    isDirty.current = false;
                    setTriggerDataFetch(prev => !prev);
                }
                handleControlFormChange();
            }
        }, 2000);
    };

    const extraControls = (
        <>
            <MoorhenStack direction="horizontal" justify="center" align="center">
                <MoorhenNumberInput
                    label="B-Factor"
                    labelPosition="top"
                    value={bFactorLim}
                    decimalDigits={1}
                    type="numberForm"
                    setValue={newVal => {
                        setBFactorLim(newVal);
                        isDirty.current = true;
                        handleControlFormChange();
                    }}
                />
                <MoorhenNumberInput
                    label="Sigma"
                    labelPosition="top"
                    value={sigmaLevel}
                    decimalDigits={1}
                    type="numberForm"
                    setValue={newVal => {
                        setSigmaLevel(newVal);
                        isDirty.current = true;
                        handleControlFormChange();
                    }}
                />
                <MoorhenNumberInput
                    label="Min. dist."
                    labelPosition="top"
                    value={minDist}
                    decimalDigits={1}
                    type="numberForm"
                    setValue={newVal => {
                        setMinDist(newVal);
                        isDirty.current = true;
                        handleControlFormChange();
                    }}
                />
                <MoorhenNumberInput
                    label="Max. dist."
                    labelPosition="top"
                    value={maxDist}
                    decimalDigits={1}
                    type="numberForm"
                    setValue={newVal => {
                        setMaxDist(newVal);
                        isDirty.current = true;
                        handleControlFormChange();
                    }}
                />
            </MoorhenStack>
            <MoorhenStack direction="horizontal">
                <MoorhenStack direction="horizontal" gap={1} style={{ display: "flex" }}>
                    <MoorhenToggle
                        label="Ignore part. occ."
                        ref={ignorePartOccRef}
                        type="switch"
                        style={{ marginRight: "2rem" }}
                        checked={ignorePartOcc}
                        onChange={() => {
                            setIgnorePartOcc(prev => !prev);
                            setTriggerDataFetch(prev => !prev);
                        }}
                    />
                    <MoorhenToggle
                        label="Ignore zero occ."
                        ref={ignoreZeroOccRef}
                        type="switch"
                        checked={ignoreZeroOcc}
                        onChange={() => {
                            setIgnoreZeroOcc(prev => !prev);
                            setTriggerDataFetch(prev => !prev);
                        }}
                    />
                </MoorhenStack>
            </MoorhenStack>
        </>
    );

    return (
        <MoorhenValidationListWidgetBase
            filterMapFunction={(map: moorhen.Map) => !map.isDifference}
            fetchData={fetchCardData}
            getCards={getCards}
            extraControlFormValue={triggerDataFetch}
            extraControlForm={extraControls}
            menuId="water-validation"
        />
    );
};
