import { CheckOutlined, CloseOutlined, FirstPageOutlined, NavigateBeforeOutlined, NavigateNextOutlined } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { SnackbarContent, useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { setIsChangingRotamers } from "../../store/generalStatesSlice";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { removeMolecule } from "../../store/moleculesSlice";
import { libcootApi } from "../../types/libcoot";
import { webGL } from "../../types/mgWebGL";
import { moorhen } from "../../types/moorhen";
import { MoorhenStack } from "../interface-base";

export const MoorhenRotamerChangeSnackBar = forwardRef<
    HTMLDivElement,
    {
        moleculeMolNo: number;
        chosenAtom: moorhen.ResidueSpec;
        commandCentre: React.RefObject<moorhen.CommandCentre>;
        glRef: React.RefObject<webGL.MGWebGL>;
        id: string;
    }
>((props, ref) => {
    const fragmentMolecule = useRef<null | moorhen.Molecule>(null);
    const chosenMolecule = useRef<null | moorhen.Molecule>(null);
    const selectedFragmentRef = useRef<{ cid: string; alt_conf: string }>({ cid: "", alt_conf: "" });

    const [rotamerName, setRotamerName] = useState<string | null>(null);
    const [rotamerRank, setRotamerRank] = useState<number | null>(null);
    const [rotamerProbability, setRotamerProbability] = useState<number | null>(null);

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const dispatch = useDispatch();
    const commandCentre = useCommandCentre();

    const { closeSnackbar, enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        const doRotamerChange = async () => {
            const selectedMolecule = molecules.find(molecule => molecule.molNo === props.moleculeMolNo);
            if (!selectedMolecule) {
                closeSnackbar(props.id);
                enqueueSnackbar("Something went wrong", { variant: "warning" });
                return;
            }

            chosenMolecule.current = selectedMolecule;
            selectedFragmentRef.current.cid = `//${props.chosenAtom.chain_id}/${props.chosenAtom.res_no}/*${
                props.chosenAtom.alt_conf === "" ? "" : ":" + props.chosenAtom.alt_conf
            }`;
            selectedFragmentRef.current.alt_conf = props.chosenAtom.alt_conf === "" ? "" : props.chosenAtom.alt_conf;
            if (!selectedFragmentRef.current.cid) {
                closeSnackbar(props.id);
                enqueueSnackbar("Something went wrong", { variant: "warning" });
                return;
            }

            /* Copy the component to move into a new molecule */
            const newMolecule = await selectedMolecule.copyFragmentUsingCid(selectedFragmentRef.current.cid, false);

            /* Next rotamer */
            const rotamerInfo = (await commandCentre.current.cootCommand(
                {
                    returnType: "rotamer_info_t",
                    command: "change_to_next_rotamer",
                    commandArgs: [newMolecule.molNo, selectedFragmentRef.current.cid, selectedFragmentRef.current.alt_conf],
                },
                true
            )) as moorhen.WorkerResponse<libcootApi.RotamerInfoJS>;
            await newMolecule.updateAtoms();

            /* Redraw after delay so that the context menu does not refresh empty */
            setTimeout(async () => {
                chosenMolecule.current.hideCid(selectedFragmentRef.current.cid);
                await Promise.all(
                    selectedMolecule.representations
                        .filter(item => {
                            return [
                                "CRs",
                                "CBs",
                                "CAs",
                                "ligands",
                                "gaussian",
                                "MolecularSurface",
                                "VdWSurface",
                                "VdwSpheres",
                                "allHBonds",
                                "glycoBlocks",
                                "MetaBalls",
                            ].includes(item.style);
                        })
                        .map(representation => {
                            if (representation.buffers.length > 0 && representation.buffers[0].visible) {
                                return newMolecule.addRepresentation(representation.style, representation.cid);
                            } else {
                                return Promise.resolve();
                            }
                        })
                );
                fragmentMolecule.current = newMolecule;
            }, 1);

            dispatch(setHoveredAtom({ molecule: null, cid: null, atomInfo: null }));
            dispatch(setIsChangingRotamers(true));

            setRotamerName(rotamerInfo.data.result.result.name);
            setRotamerRank(rotamerInfo.data.result.result.rank);
            setRotamerProbability(rotamerInfo.data.result.result.richardson_probability);
        };
        if (!chosenMolecule.current) {
            doRotamerChange();
        }
    }, []);

    const changeRotamer = useCallback(async (command: string) => {
        const rotamerInfo = (await commandCentre.current.cootCommand(
            {
                returnType: "rotamer_info_t",
                command: command,
                commandArgs: [fragmentMolecule.current.molNo, selectedFragmentRef.current.cid, selectedFragmentRef.current.alt_conf],
            },
            false
        )) as moorhen.WorkerResponse<libcootApi.RotamerInfoJS>;

        fragmentMolecule.current.atomsDirty = true;
        await fragmentMolecule.current.redraw();

        setRotamerName(rotamerInfo.data.result.result.name);
        setRotamerRank(rotamerInfo.data.result.result.rank);
        setRotamerProbability(rotamerInfo.data.result.result.richardson_probability);
    }, []);

    const acceptTransform = useCallback(async () => {
        await commandCentre.current.cootCommand(
            {
                returnType: "status",
                command: "replace_fragment",
                commandArgs: [chosenMolecule.current.molNo, fragmentMolecule.current.molNo, selectedFragmentRef.current.cid],
                changesMolecules: [chosenMolecule.current.molNo],
            },
            true
        );

        await fragmentMolecule.current.delete(true);
        chosenMolecule.current.atomsDirty = true;
        await chosenMolecule.current.unhideAll();

        dispatch(triggerUpdate(chosenMolecule.current.molNo));
        dispatch(setIsChangingRotamers(false));
        closeSnackbar(props.id);
    }, []);

    const rejectTransform = async () => {
        await fragmentMolecule.current.delete(true);
        await chosenMolecule.current.unhideAll();
        dispatch(removeMolecule(fragmentMolecule.current));
        dispatch(setIsChangingRotamers(false));
        closeSnackbar(props.id);
    };

    return (
        <SnackbarContent
            ref={ref}
            className="moorhen-notification-div"
            style={{ backgroundColor: isDark ? "grey" : "white", color: isDark ? "white" : "grey" }}
        >
            <MoorhenStack direction="vertical" gap={1}>
                <div>
                    <span>
                        Current rotamer: {rotamerName} ({rotamerRank + 1}
                        <sup>{rotamerRank === 0 ? "st" : rotamerRank === 1 ? "nd" : rotamerRank === 2 ? "rd" : "th"}</sup>)
                    </span>
                </div>
                <div>
                    <span>Probability: {rotamerProbability}%</span>
                </div>
                <MoorhenStack gap={2} direction="horizontal" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                    <IconButton
                        onClick={() => {
                            changeRotamer("change_to_first_rotamer");
                        }}
                    >
                        <FirstPageOutlined />
                    </IconButton>
                    <IconButton
                        onClick={() => {
                            changeRotamer("change_to_previous_rotamer");
                        }}
                    >
                        <NavigateBeforeOutlined />
                    </IconButton>
                    <IconButton
                        onClick={async () => {
                            changeRotamer("change_to_next_rotamer");
                        }}
                    >
                        <NavigateNextOutlined />
                    </IconButton>
                    <IconButton style={{ padding: 0, color: isDark ? "white" : "grey" }} onClick={acceptTransform}>
                        <CheckOutlined />
                    </IconButton>
                    <IconButton style={{ padding: 0, color: isDark ? "white" : "grey" }} onClick={rejectTransform}>
                        <CloseOutlined />
                    </IconButton>
                </MoorhenStack>
            </MoorhenStack>
        </SnackbarContent>
    );
});

MoorhenRotamerChangeSnackBar.displayName = "MoorhenRotamerChangeSnackBar";
