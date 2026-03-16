import { CheckOutlined, CloseOutlined, FirstPageOutlined, NavigateBeforeOutlined, NavigateNextOutlined } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCommandCentre } from "@/InstanceManager";
import { MoorhenButton } from "@/components/inputs";
import { MoorhenStack } from "@/components/interface-base";
import { removeMolecule, setHoveredAtom, setIsChangingRotamers, setShownControl, triggerUpdate } from "@/store";
import { RootState } from "@/store";
import { libcootApi } from "@/types/libcoot";
import { moorhen } from "@/types/moorhen";

export const RotamerChange = () => {
    const fragmentMolecule = useRef<null | moorhen.Molecule>(null);
    const chosenMolecule = useRef<null | moorhen.Molecule>(null);
    const selectedFragmentRef = useRef<{ cid: string; alt_conf: string }>({ cid: "", alt_conf: "" });

    const [rotamerName, setRotamerName] = useState<string | null>(null);
    const [rotamerRank, setRotamerRank] = useState<number | null>(null);
    const [rotamerProbability, setRotamerProbability] = useState<number | null>(null);

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const shownControl = useSelector((state: RootState) => state.globalUI.shownControl);
    const molNo = shownControl?.name === "changeRotamer" ? (shownControl.payload?.molNo ?? 0) : 0;
    const chosenAtom = shownControl?.name === "changeRotamer" ? (shownControl.payload?.chosenAtom ?? null) : null;

    const dispatch = useDispatch();
    const commandCentre = useCommandCentre();

    const { closeSnackbar, enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        const doRotamerChange = async () => {
            if (!chosenAtom) {
                dispatch(setShownControl(null));
                return;
            }
            const selectedMolecule = molecules.find(molecule => molecule.molNo === molNo);
            if (!selectedMolecule) {
                dispatch(setShownControl(null));
                enqueueSnackbar("Something went wrong", { variant: "warning" });
                return;
            }

            chosenMolecule.current = selectedMolecule;
            selectedFragmentRef.current.cid = `//${chosenAtom.chain_id}/${chosenAtom.res_no}/*${
                chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf
            }`;
            selectedFragmentRef.current.alt_conf = chosenAtom.alt_conf === "" ? "" : chosenAtom.alt_conf;
            if (!selectedFragmentRef.current.cid) {
                dispatch(setShownControl(null));
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
        dispatch(setShownControl(null));
    }, []);

    const rejectTransform = async () => {
        await fragmentMolecule.current.delete(true);
        await chosenMolecule.current.unhideAll();
        dispatch(removeMolecule(fragmentMolecule.current));
        dispatch(setIsChangingRotamers(false));
        dispatch(setShownControl(null));
    };

    return (
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
            <MoorhenStack direction="horizontal" align="center" justify="center">
                <MoorhenButton
                    type="icon-only"
                    icon="MatSymFirstPage"
                    onClick={() => {
                        changeRotamer("change_to_first_rotamer");
                    }}
                    tooltip="First"
                />

                <MoorhenButton
                    type="icon-only"
                    icon="MatSymChevronL"
                    onClick={() => {
                        changeRotamer("change_to_previous_rotamer");
                    }}
                    tooltip="Previous"
                />
                <MoorhenButton
                    type="icon-only"
                    icon="MatSymChevronR"
                    onClick={() => changeRotamer("change_to_next_rotamer")}
                    tooltip="Next"
                />
                <MoorhenButton type="icon-only" icon="MatSymCheck" onClick={acceptTransform} tooltip="Accept" />
                <MoorhenButton type="icon-only" icon="MatSymClose" onClick={rejectTransform} tooltip="Cancel" />
            </MoorhenStack>
        </MoorhenStack>
    );
};
