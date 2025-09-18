import { Stack } from "react-bootstrap";
import { CheckOutlined, CloseOutlined } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { forwardRef, useCallback, useEffect, useRef } from "react";
import { SnackbarContent, useSnackbar } from "notistack";
import { moorhen } from "../../types/moorhen";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { useCommandCentre } from "../../InstanceManager";

export const MoorhenAcceptRejectMatchingLigandSnackBar = forwardRef<
    HTMLDivElement,
    {
        refMolNo: number;
        movingMolNo: number;
        refLigandCid: string;
        movingLigandCid: string;
        commandCentre: React.RefObject<moorhen.CommandCentre>;
        id: string;
    }
>((props, ref) => {
    const copyMovingMoleculeRef = useRef<moorhen.Molecule | null>(null);

    const dispatch = useDispatch();
    const commandCentre = useCommandCentre();

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const matchLigands = useCallback(async () => {
        const movingMolecule = molecules.find((molecule) => molecule.molNo === props.movingMolNo);
        const referenceMolecule = molecules.find((molecule) => molecule.molNo === props.refMolNo);

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

        if (result.data.result.result) {
            copyMovingMoleculeRef.current.setAtomsDirty(true);
            await copyMovingMoleculeRef.current.fetchIfDirtyAndDraw("ligands");
            await copyMovingMoleculeRef.current.centreOn("/*/*/*/*", true, true);
        } else {
            await copyMovingMoleculeRef.current.delete(true);
            enqueueSnackbar(`Failed to match ligands`, { variant: "warning" });
            closeSnackbar(props.id);
        }
    }, [molecules]);

    useEffect(() => {
        matchLigands();
    }, []);

    const exit = useCallback(async (acceptTransform: boolean = false) => {
        if (!copyMovingMoleculeRef.current) {
            return;
        }

        const movingMolecule = molecules.find((molecule) => molecule.molNo === props.movingMolNo);
        const referenceMolecule = molecules.find((molecule) => molecule.molNo === props.refMolNo);

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

        closeSnackbar(props.id);
    }, []);

    return (
        <SnackbarContent
            ref={ref}
            className="moorhen-notification-div"
            style={{ backgroundColor: isDark ? "grey" : "white", color: isDark ? "white" : "grey" }}
        >
            <Stack
                gap={2}
                direction="horizontal"
                style={{ width: "100%", display: "flex", justifyContent: "space-between" }}
            >
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
            </Stack>
        </SnackbarContent>
    );
});

MoorhenAcceptRejectMatchingLigandSnackBar.displayName = "MoorhenAcceptRejectMatchingLigandSnackBar";
