import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useState } from "react";
import { MoorhenModifyColourRulesCard } from "@/components/card/MoleculeCard/ModifyColourRulesCard";
import { closeResidueSelectionTools, setShownControl } from "@/store";
import {
    clearResidueSelection,
    setIsDraggingAtoms,
    setIsRotatingAtoms,
    setResidueSelection,
    setShowResidueSelection,
} from "../../../store/generalStatesSlice";
import { setHoveredAtom } from "../../../store/hoveringStatesSlice";
import { triggerUpdate } from "../../../store/moleculeMapUpdateSlice";
import { addMolecule, removeMolecule } from "../../../store/moleculesSlice";
import { moorhen } from "../../../types/moorhen";
import { cidToSpec } from "../../../utils/utils";
import { MoorhenButton, MoorhenPopoverButton } from "../../inputs";
import { MoorhenCidInputForm } from "../../inputs/Cid/MoorhenCidInputForm";
import { MoorhenStack } from "../../interface-base";

export const ResidueSelectionControls = () => {
    const [invalidCid, setInvalidCid] = useState<boolean>(false);
    const [selectedColour, setSelectedColour] = useState<string>("#808080");

    const dispatch = useDispatch();
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection);
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);
    const animateRefine = useSelector((state: moorhen.State) => state.refinementSettings.animateRefine);
    const [cidFormValue, setCidFormValue] = useState<string>(residueSelection.label);
    const molecule = residueSelection.molecule ? molecules.find(mol => mol.molNo === residueSelection.molecule.molNo) : null;

    useEffect(() => {
        dispatch(setShowResidueSelection(true));
        return () => {
            dispatch(setShowResidueSelection(false));
        };
    }, []);

    useEffect(() => {
        console.log(residueSelection);
        if (!residueSelection.molecule) {
            dispatch(closeResidueSelectionTools());
        }
    }, [residueSelection]);

    const clearSelection = useCallback(() => {
        setCidFormValue(null);
        setInvalidCid(false);
        molecules.forEach(molecule => molecule.clearBuffersOfStyle("residueSelection"));
    }, [molecules]);

    useEffect(() => {
        if (Object.keys(residueSelection).every(key => !residueSelection[key])) {
            clearSelection();
        }
    }, [residueSelection, clearSelection]);

    const handleResidueCidChange = useCallback(async () => {
        if (!cidFormValue) {
            console.warn("No cid input, doing nothing...");
            return;
        }

        if (!residueSelection.molecule) {
            console.warn("Need to create valid selection before editing the CID, doing nothing...");
            return;
        }

        try {
            const newSelection = await residueSelection.molecule.parseCidIntoSelection(cidFormValue);
            if (!newSelection) {
                throw new Error(`Specified CID resulted in no residue selection: ${cidFormValue}`);
            }

            await residueSelection.molecule.drawResidueSelection(cidFormValue);
            dispatch(setResidueSelection(newSelection));
            setInvalidCid(false);
        } catch (err) {
            console.warn(err);
            console.warn("Error parsing the cid...");
            setInvalidCid(true);
        }
    }, [residueSelection, cidFormValue]);

    const handleSelectionCopy = useCallback(async () => {
        let cid: string;

        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid.join("||");
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string;
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first);
            cid = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`;
        }

        if (cid) {
            const newMolecule = await residueSelection.molecule.copyFragmentUsingCid(cid, true);
            dispatch(addMolecule(newMolecule));
        }

        dispatch(clearResidueSelection());
    }, [residueSelection]);

    const handleRefinement = useCallback(async () => {
        molecules.forEach(molecule => molecule.clearBuffersOfStyle("residueSelection"));
        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            if (animateRefine) {
                await residueSelection.molecule.refineResiduesUsingAtomCidAnimated(residueSelection.cid.join("||"), activeMap, -1);
            } else {
                await residueSelection.molecule.refineResiduesUsingAtomCid(residueSelection.cid.join("||"), "LITERAL");
            }
        } else if (residueSelection.molecule && residueSelection.cid) {
            const startResSpec = cidToSpec(residueSelection.first);
            const stopResSpec = cidToSpec(residueSelection.second);
            const sortedResNums = [startResSpec.res_no, stopResSpec.res_no].sort(function (a, b) {
                return a - b;
            });
            if (animateRefine) {
                await residueSelection.molecule.refineResiduesUsingAtomCidAnimated(
                    `/${startResSpec.mol_no}/${startResSpec.chain_id}/${sortedResNums[0]}-${sortedResNums[1]}`,
                    activeMap,
                    -1
                );
            } else {
                await residueSelection.molecule.refineResidueRange(startResSpec.chain_id, sortedResNums[0], sortedResNums[1], 5000, true);
            }
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first);
            if (animateRefine) {
                await residueSelection.molecule.refineResiduesUsingAtomCidAnimated(
                    `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`,
                    activeMap,
                    -1
                );
            } else {
                await residueSelection.molecule.refineResidueRange(
                    startResSpec.chain_id,
                    startResSpec.res_no,
                    startResSpec.res_no,
                    5000,
                    true
                );
            }
        }
        dispatch(triggerUpdate(residueSelection.molecule.molNo));
        dispatch(clearResidueSelection());
    }, [residueSelection, animateRefine, activeMap]);

    const handleDelete = useCallback(async () => {
        let cid: string;

        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid.join("||");
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string;
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first);
            cid = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`;
        }

        if (cid) {
            const result = await residueSelection.molecule.deleteCid(cid, true);
            if (result.second < 1) {
                console.log("Empty molecule detected, deleting it now...");
                await residueSelection.molecule.delete();
                dispatch(removeMolecule(residueSelection.molecule));
            }
            dispatch(triggerUpdate(residueSelection.molecule.molNo));
        }

        dispatch(clearResidueSelection());
    }, [residueSelection]);

    const handleExpandSelection = useCallback(async () => {
        let cid: string;
        let label: string;

        // FIXME: We want to be able to expand multiCid selections since the user is now able to manually create them...
        if (residueSelection.isMultiCid) {
            // pass
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string;
            const startResSpec = cidToSpec(residueSelection.first);
            const stopResSpec = cidToSpec(residueSelection.second);
            const sortedResNums = [startResSpec.res_no, stopResSpec.res_no].sort(function (a, b) {
                return a - b;
            });
            label = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${sortedResNums[0]}-${sortedResNums[1]} +7Å`;
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first);
            cid = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`;
            label = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no} +7Å`;
        }

        if (cid) {
            const result = await residueSelection.molecule.getNeighborResiduesCids(cid, 7);
            await residueSelection.molecule.drawResidueSelection(result.join("||"));
            dispatch(
                setResidueSelection({
                    molecule: residueSelection.molecule,
                    first: residueSelection.first,
                    second: residueSelection.second,
                    cid: result,
                    isMultiCid: true,
                    label: label,
                })
            );
        }
    }, [residueSelection]);

    const handleInvertSelection = useCallback(async () => {
        let cid: string;

        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid.join("||");
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string;
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first);
            cid = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`;
        }

        if (cid) {
            const result = residueSelection.molecule.getNonSelectedCids(cid);
            const newCid = result.join("||");
            await residueSelection.molecule.drawResidueSelection(newCid);
            dispatch(
                setResidueSelection({
                    molecule: residueSelection.molecule,
                    first: residueSelection.first,
                    second: residueSelection.second,
                    cid: result,
                    isMultiCid: true,
                    label: newCid,
                })
            );
        }
    }, [residueSelection]);

    const handleRigidBodyFit = useCallback(async () => {
        if (!activeMap) {
            console.warn("Cannot do rigid body fit without an active map...");
            return;
        }

        let cid: string;

        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid.join("||");
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string;
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first);
            cid = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`;
        }

        if (cid) {
            await residueSelection.molecule.rigidBodyFit(cid, activeMap.molNo, true);
            dispatch(triggerUpdate(residueSelection.molecule.molNo));
        }

        dispatch(clearResidueSelection());
    }, [activeMap, residueSelection]);

    const handleRotateTranslate = useCallback(async () => {
        let cid: string;

        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid.join("||");
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string;
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first);
            cid = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`;
        }

        if (cid) {
            molecules.forEach(molecule => molecule.clearBuffersOfStyle("residueSelection"));
            dispatch(setHoveredAtom({ molecule: null, cid: null, atomInfo: null }));
            dispatch(setIsRotatingAtoms(true));
            dispatch(
                setShownControl({
                    name: "acceptRejectRotateTranslate",
                    payload: { molNo: residueSelection.molecule.molNo, fragmentCid: cid, drawSelectionOnClose: true },
                })
            );
        }
    }, [residueSelection]);

    const handleDragAtoms = useCallback(() => {
        let cid: string[];

        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid;
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = [residueSelection.cid as string];
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first);
            cid = [`/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`];
        }

        if (cid) {
            molecules.forEach(molecule => molecule.clearBuffersOfStyle("residueSelection"));

            dispatch(setHoveredAtom({ molecule: null, cid: null, atomInfo: null }));
            dispatch(setIsDraggingAtoms(true));
            dispatch(
                setShownControl({
                    name: "acceptRejectDraggingAtoms",
                    payload: { molNo: residueSelection.molecule.molNo, fragmentCid: cid, drawSelectionOnClose: true },
                })
            );
        }
    }, [residueSelection]);

    return (
        <MoorhenStack direction="vertical">
            <MoorhenStack direction="horizontal" align="center" justify="space-between">
                <span style={{ textAlign: "center", width: "100%" }}>{`${
                    residueSelection.label?.length > 16 ? residueSelection.label.substring(0, 12) + "..." : residueSelection.label
                }`}</span>
                <MoorhenButton
                    type="icon-only"
                    onClick={() => dispatch(clearResidueSelection())}
                    tooltip="Clear selection"
                    icon="MatSymClose"
                />
            </MoorhenStack>
            <hr style={{ margin: 2, padding: 0 }}></hr>
            <MoorhenStack gap={"1rem"} direction="vertical">
                <MoorhenStack gap={"1rem"} direction="horizontal">
                    <MoorhenButton
                        type="icon-only"
                        icon="MatSymCrisisAlert"
                        disabled={activeMap === null}
                        onClick={handleRefinement}
                        tooltip="Refine"
                        disabledTooltip={"Active map needed"}
                    />
                    <MoorhenButton
                        type="icon-only"
                        disabled={activeMap === null}
                        onClick={handleDragAtoms}
                        tooltip="Drag atoms"
                        disabledTooltip={"Active map needed"}
                        icon="MatSymAdsClick"
                    />

                    <MoorhenButton type="icon-only" icon="MatSymCopyAll" onClick={handleSelectionCopy} tooltip="Copy fragment" />
                    <MoorhenButton
                        type="icon-only"
                        icon="MatSymAllOut"
                        onClick={handleExpandSelection}
                        tooltip="Expand to neighbouring residues"
                    />

                    <MoorhenPopoverButton type="icon-only" icon="MatSymDelete" tooltip="Delete">
                        <MoorhenStack direction="vertical" align="center" justify="center" gap="0.5rem" style={{ padding: "0.5rem" }}>
                            <span>Delete these residues?</span>
                            <MoorhenButton variant="danger" onClick={handleDelete}>
                                Yes, delete
                            </MoorhenButton>
                        </MoorhenStack>
                    </MoorhenPopoverButton>
                </MoorhenStack>
                <MoorhenStack gap={"1rem"} direction="horizontal" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                    <MoorhenPopoverButton type="icon-only" tooltip="Edit selection" icon="MatSymEdit" popoverPlacement="bottom">
                        <MoorhenCidInputForm
                            margin="0"
                            width="100%"
                            setCid={setCidFormValue}
                            value={cidFormValue}
                            invalidCid={invalidCid}
                        />
                        <MoorhenButton
                            size="sm"
                            variant="primary"
                            style={{ width: "80%", margin: "0.25rem" }}
                            onClick={handleResidueCidChange}
                        >
                            Apply
                        </MoorhenButton>
                    </MoorhenPopoverButton>
                    <MoorhenButton type="icon-only" onClick={handleInvertSelection} tooltip="Invert selection" icon="MatSymSwapVert" />
                    <MoorhenPopoverButton type="icon-only" tooltip="Colour rules" icon="MatSymColors" popoverPlacement="right">
                        <MoorhenModifyColourRulesCard molecule={molecule} residueSelection />
                    </MoorhenPopoverButton>

                    <MoorhenButton type="icon-only" onClick={handleRotateTranslate} tooltip="Rotate/Translate" icon="MatSymRotate90Cw" />
                    <MoorhenButton
                        type="icon-only"
                        disabled={activeMap === null}
                        onClick={handleRigidBodyFit}
                        tooltip="Rigid body fit"
                        disabledTooltip={"Active map needed"}
                        icon="MatSymSwipeRight"
                    />
                </MoorhenStack>
            </MoorhenStack>
        </MoorhenStack>
    );
};
