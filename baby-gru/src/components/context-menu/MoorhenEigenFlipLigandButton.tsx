import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getTooltipShortcutLabel } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase, ContextButtonProps } from "./MoorhenContextButtonBase";

export const MoorhenEigenFlipLigandButton = (props: ContextButtonProps) => {
    const [toolTipLabel, setToolTipLabel] = useState("Eigen Flip: flip the ligand around its eigenvectors");
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts);

    const getCootCommandInput = (
        selectedMolecule: moorhen.Molecule,
        chosenAtom: moorhen.ResidueSpec,
        localParameters?: string
    ): moorhen.cootCommandKwargs => {
        return {
            message: "coot_command",
            returnType: "status",
            command: "eigen_flip_ligand",
            commandArgs: [
                selectedMolecule.molNo,
                `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${
                    chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf
                }`,
            ],
            changesMolecules: [selectedMolecule.molNo],
        };
    };

    useEffect(() => {
        if (shortCuts) {
            const shortCut = JSON.parse(shortCuts as string).eigen_flip;
            setToolTipLabel(`Eigen Flip: flip the ligand around its eigenvectors ${getTooltipShortcutLabel(shortCut)}`);
        }
    }, [shortCuts]);

    return (
        <MoorhenContextButtonBase
            icon={
                <img
                    className="moorhen-context-button__icon"
                    src={`${props.urlPrefix}/pixmaps/spin-view.svg`}
                    alt="Eigen flip"
                />
            }
            toolTipLabel={toolTipLabel}
            cootCommandInput={getCootCommandInput(props.selectedMolecule, props.chosenAtom)}
            {...props}
        />
    );
};
