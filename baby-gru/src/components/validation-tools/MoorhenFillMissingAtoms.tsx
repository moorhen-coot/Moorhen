import { UnknownAction } from "@reduxjs/toolkit";
import { Button, Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import React, { Dispatch, useCallback } from "react";
import { setShownControl } from "@/store/globalUISlice";
import { useCommandCentre } from "../../InstanceManager";
import { CommandCentre } from "../../InstanceManager/CommandCentre/MoorhenCommandCentre";
import { hideModal } from "../../store/modalsSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { MoorhenButton } from "../inputs";
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";

export const fillPartialResidue = async (
    selectedMolecule: moorhen.Molecule,
    chainId: string,
    resNum: number,
    insCode: string,
    commandCentre: React.RefObject<CommandCentre>,
    dispatch: Dispatch<UnknownAction>,
    enableRefineAfterMod: boolean
) => {
    await commandCentre.current.cootCommand(
        {
            returnType: "status",
            command: "fill_partial_residue",
            commandArgs: [selectedMolecule.molNo, chainId, resNum, insCode],
            changesMolecules: [selectedMolecule.molNo],
        },
        true
    );

    if (enableRefineAfterMod) {
        await commandCentre.current.cootCommand(
            {
                returnType: "status",
                command: "refine_residues_using_atom_cid",
                commandArgs: [selectedMolecule.molNo, `//${chainId}/${resNum}`, "TRIPLE", 4000],
                changesMolecules: [selectedMolecule.molNo],
            },
            true
        );
    }
    selectedMolecule.setAtomsDirty(true);
    await selectedMolecule.redraw();
    dispatch(triggerUpdate(selectedMolecule.molNo));
};

export const MoorhenFillMissingAtoms = () => {
    const dispatch = useDispatch();

    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.refinementSettings.enableRefineAfterMod);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const commandCentre = useCommandCentre();

    const handleAtomFill = (...args: [moorhen.Molecule, string, number, string]) => {
        if (args.every(arg => arg !== null)) {
            fillPartialResidue(...args, commandCentre, dispatch, enableRefineAfterMod);
        }
    };

    async function fetchCardData(selectedModel: number, selectedMap: number): Promise<libcootApi.ResidueSpecJS[]> {
        const inputData = {
            message: "coot_command",
            command: "residues_with_missing_atoms",
            returnType: "residue_specs",
            commandArgs: [selectedModel],
        };

        const response = (await commandCentre.current.cootCommand(inputData, false)) as moorhen.WorkerResponse<libcootApi.ResidueSpecJS[]>;
        const newResidueList = response.data.result.result;
        return newResidueList;
    }

    const handleFillAll = useCallback(
        (selectedMolecule: moorhen.Molecule, residues: libcootApi.ResidueSpecJS[]) => {
            dispatch(hideModal(modalKeys.FILL_PART_RES));
            if (selectedMolecule) {
                const residueList = residues.map(residue => {
                    return `//${residue.chainId}/${residue.resNum}/`;
                });

                dispatch(
                    setShownControl({
                        name: "fillAllAtoms",
                        payload: { residueList: residueList, selectedMolecule: selectedMolecule.molNo },
                    })
                );
            }
        },
        [molecules]
    );

    const getCards = useCallback(
        (selectedModel: number, selectedMap: number, residueList: libcootApi.ResidueSpecJS[]) => {
            const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel);

            let cards = residueList.map(residue => {
                const label = `/${residue.modelNumber}/${residue.chainId}/${residue.resNum}${residue.insCode ? "." + residue.insCode : ""}/`;
                return (
                    <Card style={{ marginTop: "0.5rem" }} key={label}>
                        <Card.Body style={{ padding: "0.5rem" }}>
                            <Row style={{ display: "flex", justifyContent: "between" }}>
                                <Col style={{ alignItems: "center", justifyContent: "left", display: "flex" }}>{label}</Col>
                                <Col className="col-3" style={{ margin: "0", padding: "0", justifyContent: "right", display: "flex" }}>
                                    <MoorhenButton
                                        style={{ marginRight: "0.5rem" }}
                                        onClick={() =>
                                            selectedMolecule.centreAndAlignViewOn(
                                                `//${residue.chainId}/${residue.resNum}-${residue.resNum}/`,
                                                true
                                            )
                                        }
                                    >
                                        View
                                    </MoorhenButton>
                                    <MoorhenButton
                                        style={{ marginRight: "0.5rem" }}
                                        onClick={() => {
                                            handleAtomFill(selectedMolecule, residue.chainId, residue.resNum, residue.insCode);
                                        }}
                                    >
                                        Fill
                                    </MoorhenButton>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                );
            });
            if (cards.length > 0) {
                const button = (
                    <MoorhenButton
                        style={{ width: "100%" }}
                        onClick={() => handleFillAll(selectedMolecule, residueList)}
                        key="fill-all-button"
                    >
                        Fill all
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
            enableMapSelect={false}
            fetchData={fetchCardData}
            getCards={getCards}
            menuId="fill-missing-atoms-validation"
        />
    );
};
