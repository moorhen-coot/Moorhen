import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase, ContextButtonProps } from "./MoorhenContextButtonBase";

export const MoorhenJedFlipFalseButton = (props: ContextButtonProps) => {
    const getCootCommandInput = (
        selectedMolecule: moorhen.Molecule,
        chosenAtom: moorhen.ResidueSpec,
        localParameters?: string
    ): moorhen.cootCommandKwargs => {
        return {
            message: "coot_command",
            returnType: "status",
            command: "jed_flip",
            commandArgs: [
                selectedMolecule.molNo,
                `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${
                    chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf
                }`,
                false,
            ],
            changesMolecules: [selectedMolecule.molNo],
        };
    };

    return (
        <MoorhenContextButtonBase
            icon={
                <img
                    className="moorhen-context-button__icon"
                    src={`${props.urlPrefix}/pixmaps/edit-chi.svg`}
                    alt="jed-flip"
                />
            }
            toolTipLabel="JED Flip: wag the tail"
            cootCommandInput={getCootCommandInput(props.selectedMolecule, props.chosenAtom)}
            {...props}
        />
    );
};
