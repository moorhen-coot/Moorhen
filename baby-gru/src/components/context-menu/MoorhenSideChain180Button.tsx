import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase, ContextButtonProps } from "./MoorhenContextButtonBase";

export const MoorhenSideChain180Button = (props: ContextButtonProps) => {
    const getCootCommandInput = (
        selectedMolecule: moorhen.Molecule,
        chosenAtom: moorhen.ResidueSpec,
        localParameters?: string
    ): moorhen.cootCommandKwargs => {
        return {
            message: "coot_command",
            returnType: "status",
            command: "side_chain_180",
            commandArgs: [
                selectedMolecule.molNo,
                `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${
                    chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf
                }`,
            ],
            changesMolecules: [selectedMolecule.molNo],
        };
    };

    return (
        <MoorhenContextButtonBase
            icon={
                <img
                    className="moorhen-context-button__icon"
                    src={`${props.urlPrefix}/pixmaps/side-chain-180.svg`}
                    alt="Rotate Side-chain"
                />
            }
            toolTipLabel="Rotate side-chain 180 degrees"
            cootCommandInput={getCootCommandInput(props.selectedMolecule, props.chosenAtom)}
            {...props}
        />
    );
};
