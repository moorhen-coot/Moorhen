import { CheckOutlined, CloseOutlined } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef } from "react";
import { useCommandCentre } from "../../../InstanceManager";
import { setShownControl } from "../../../store/globalUISlice";
import { triggerUpdate } from "../../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenStack } from "../../interface-base";

export const AcceptRejectMatchingLigand = () => {
    const copyMovingMoleculeRef = useRef<moorhen.Molecule | null>(null);

    const dispatch = useDispatch();
    const commandCentre = useCommandCentre();

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const props = useSelector((state: moorhen.State) => state.globalUI.shownControl?.payload) as {
        movingMolNo: number;
        refMolNo: number;
        movingLigandCid: string;
        refLigandCid: string;
    };
    console.log("props", props);

    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const matchLigands = useCallback(async () => {
        const movingMolecule = molecules.find(molecule => molecule.molNo === props.movingMolNo);
        const referenceMolecule = molecules.find(molecule => molecule.molNo === props.refMolNo);

        if (!movingMolecule || !referenceMolecule) {
            return;
        }

        copyMovingMoleculeRef.current = await movingMolecule.copyFragmentUsingCid(props.movingLigandCid, false);

        const result = (await commandCentre.current.cootCommand(
            {
                command: "match_ligand_torsions_and_position_using_cid",
                commandArgs: [copyMovingMoleculeRef.current.molNo, referenceMolecule.molNo, props.refLigandCid],
                returnType: "boolean",
            },
            false
        )) as moorhen.WorkerResponse<boolean>;

        console.log("match result", result);
        if (result.data.result.result) {
            copyMovingMoleculeRef.current.setAtomsDirty(true);
            await copyMovingMoleculeRef.current.fetchIfDirtyAndDraw("ligands");
            await copyMovingMoleculeRef.current.centreOn("/*/*/*/*", true, true);
        } else {
            await copyMovingMoleculeRef.current.delete(true);
            enqueueSnackbar(`Failed to match ligands`, { variant: "warning" });
            dispatch(setShownControl(null));
        }
    }, [molecules]);

    useEffect(() => {
        matchLigands();
    }, []);

    const exit = useCallback(async (acceptTransform: boolean = false) => {
        if (!copyMovingMoleculeRef.current) {
            return;
        }

        const movingMolecule = molecules.find(molecule => molecule.molNo === props.movingMolNo);
        const referenceMolecule = molecules.find(molecule => molecule.molNo === props.refMolNo);

        if (!movingMolecule || !referenceMolecule) {
            return;
        }

        if (acceptTransform) {
            await referenceMolecule.deleteCid(props.refLigandCid, false);
            await referenceMolecule.mergeMolecules([copyMovingMoleculeRef.current], false);
            referenceMolecule.setAtomsDirty(true);
            await copyMovingMoleculeRef.current.delete();
            await referenceMolecule.redraw();
            dispatch(triggerUpdate(props.refMolNo));
        } else {
            await copyMovingMoleculeRef.current.delete();
        }

        await commandCentre.current.cootCommand(
            {
                command: "end_delete_closed_molecules",
                commandArgs: [],
                returnType: "void",
            },
            false
        );

        dispatch(setShownControl(null));
    }, []);

    return (
        <MoorhenStack gap={2} direction="horizontal" style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
            <div>
                <span>Replace ligand?</span>
            </div>
            <div>
                <IconButton
                    style={{ padding: 0, color: isDark ? "white" : "grey" }}
                    onClick={async () => {
                        await exit(true);
                    }}
                >
                    <CheckOutlined />
                </IconButton>
                <IconButton
                    style={{ padding: 0, color: isDark ? "white" : "grey" }}
                    onClick={async () => {
                        await exit();
                    }}
                >
                    <CloseOutlined />
                </IconButton>
            </div>
        </MoorhenStack>
    );
};
