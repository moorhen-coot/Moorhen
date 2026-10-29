import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import {
    setAnimateRefine,
    setEnableRefineAfterMod,
    setRefinementSelection,
    setUseRamaRefinementRestraints,
    setuseTorsionRefinementRestraints,
} from "../../store/refinementSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenSelect, MoorhenSlider, MoorhenToggle } from "../inputs";
import { MoorhenInfoCard, MoorhenStack } from "../interface-base";

export const RefinementSettings = () => {
    const [ramaWeight, setRamaWeight] = useState<number>(null);
    const [torsionWeight, setTorsionWeight] = useState<number>(null);

    const dispatch = useDispatch();
    const useRamaRestraints = useSelector((state: moorhen.State) => state.refinementSettings.useRamaRefinementRestraints);
    const useTorsionRestraints = useSelector((state: moorhen.State) => state.refinementSettings.useTorsionRefinementRestraints);
    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.refinementSettings.enableRefineAfterMod);
    const animateRefine = useSelector((state: moorhen.State) => state.refinementSettings.animateRefine);
    const refinementSelection = useSelector((state: moorhen.State) => state.refinementSettings.refinementSelection);
    const commandCentre = useCommandCentre();

    useEffect(() => {
        const fetchInitialData = async () => {
            const torsion = await commandCentre.current.cootCommand(
                {
                    command: "get_torsion_restraints_weight",
                    commandArgs: [],
                    returnType: "int",
                },
                false
            );
            const rama = await commandCentre.current.cootCommand(
                {
                    command: "get_rama_plot_restraints_weight",
                    commandArgs: [],
                    returnType: "int",
                },
                false
            );

            setRamaWeight(rama.data.result.result);
            setTorsionWeight(torsion.data.result.result);
        };

        if (!ramaWeight && !torsionWeight) {
            fetchInitialData();
        }
    }, []);

    useEffect(() => {
        if (ramaWeight) {
            commandCentre.current.cootCommand(
                {
                    command: "set_rama_plot_restraints_weight",
                    commandArgs: [ramaWeight],
                    returnType: "status",
                },
                false
            );
        }
    }, [ramaWeight]);

    useEffect(() => {
        if (torsionWeight) {
            commandCentre.current.cootCommand(
                {
                    command: "set_torsion_restraints_weight",
                    commandArgs: [torsionWeight],
                    returnType: "status",
                },
                false
            );
        }
    }, [torsionWeight]);

    useEffect(() => {
        commandCentre.current.cootCommand(
            {
                command: "set_use_rama_plot_restraints",
                commandArgs: [useRamaRestraints],
                returnType: "status",
            },
            false
        );
    }, [useRamaRestraints]);

    useEffect(() => {
        commandCentre.current.cootCommand(
            {
                command: "set_use_torsion_restraints",
                commandArgs: [useTorsionRestraints],
                returnType: "status",
            },
            false
        );
    }, [useTorsionRestraints]);

    const menuItemText = "Refinement settings...";

    return torsionWeight !== null && ramaWeight !== null ? (
        <MoorhenStack>
            <MoorhenStack direction="line" align="center" gap="0.5rem">
                <MoorhenSelect
                    label="Default refinement selection"
                    value={refinementSelection}
                    onChange={evt => {
                        dispatch(setRefinementSelection(evt.target.value as "SINGLE" | "TRIPLE" | "SPHERE"));
                    }}
                >
                    <option value={"SINGLE"}>Single residue</option>
                    <option value={"TRIPLE"}>Adjacent residues</option>
                    <option value={"SPHERE"}>Sphere</option>
                </MoorhenSelect>
                <MoorhenInfoCard
                    infoText="
                                Specifies whether refinement should only be done for the clicked residue (Single res.), for the residues
                                directly adjacent to the clicked residue (Adjacent res.) or for the residues within a spherical selection
                                around the clicked residue (Sphere).
                    "
                />
            </MoorhenStack>
            <hr />
            <MoorhenToggle
                type="switch"
                checked={animateRefine}
                onChange={() => {
                    dispatch(setAnimateRefine(!animateRefine));
                }}
                label="Show animation during refinement"
            />
            <MoorhenToggle
                type="switch"
                checked={enableRefineAfterMod}
                onChange={() => {
                    dispatch(setEnableRefineAfterMod(!enableRefineAfterMod));
                }}
                label="Automatic refinement post-modification"
            />
            <MoorhenToggle
                type="switch"
                checked={useRamaRestraints}
                onChange={() => {
                    dispatch(setUseRamaRefinementRestraints(!useRamaRestraints));
                }}
                label="Use ramachandran restraints"
            />
            <MoorhenToggle
                type="switch"
                checked={useTorsionRestraints}
                onChange={() => {
                    dispatch(setuseTorsionRefinementRestraints(!useTorsionRestraints));
                }}
                label="Use torsion restraints"
            />
            <hr />
            <MoorhenSlider
                isDisabled={!useRamaRestraints}
                sliderTitle="Ramachandran restraints weight"
                minVal={0.1}
                maxVal={100}
                decimalPlaces={2}
                scale="log"
                value={ramaWeight}
                setValue={value => setRamaWeight(value)}
            />
            <MoorhenSlider
                isDisabled={!useTorsionRestraints}
                sliderTitle="Torsion restraints weight"
                minVal={0.1}
                maxVal={10}
                decimalPlaces={2}
                scale="log"
                value={torsionWeight}
                setValue={value => setTorsionWeight(value)}
            />
        </MoorhenStack>
    ) : (
        <span>Please wait</span>
    );
};
