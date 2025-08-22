import { useSnackbar } from "notistack";
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase, ContextButtonProps } from "./MoorhenContextButtonBase";

export const MoorhenRotamerChangeButton = (props: ContextButtonProps) => {
    const { enqueueSnackbar } = useSnackbar();

    const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
        props.setOpacity(1);
        props.setOverrideMenuContents(false);
        props.setShowContextMenu(false);
        enqueueSnackbar("rotamer-change", {
            variant: "rotamerChange",
            persist: true,
            commandCentre: props.commandCentre,
            moleculeMolNo: molecule.molNo,
            chosenAtom: chosenAtom,
        });
    };

    return (
        <MoorhenContextButtonBase
            icon={
                <img
                    alt="change rotamer"
                    className="moorhen-context-button__icon"
                    src={`${props.urlPrefix}/pixmaps/rotamers.svg`}
                />
            }
            toolTipLabel="Change rotamers"
            nonCootCommand={nonCootCommand}
            {...props}
        />
    );
};
