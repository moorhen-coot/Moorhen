import { useDispatch } from "react-redux";
import { setShownControl } from "@/store";
import { useMoorhenInstance } from "../../InstanceManager";
import { moorhen } from "../../types/moorhen";
import { ContextButtonProps, MoorhenContextButtonBase } from "./MoorhenContextButtonBase";

export const MoorhenRotamerChangeButton = (props: ContextButtonProps) => {
    const dispatch = useDispatch();
    const moorhenInstance = useMoorhenInstance();

    const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
        props.setOpacity(1);
        props.setOverrideMenuContents(false);
        props.setShowContextMenu(false);

        dispatch(
            setShownControl({
                name: "changeRotamer",
                payload: {
                    molNo: molecule.molNo,
                    chosenAtom: chosenAtom,
                },
            })
        );
    };

    return (
        <MoorhenContextButtonBase
            icon={<img alt="change rotamer" className="moorhen-context-button__icon" src={`${props.urlPrefix}/pixmaps/rotamers.svg`} />}
            toolTipLabel="Change rotamers"
            nonCootCommand={nonCootCommand}
            onExit={() => moorhenInstance.triggerMoleculeChanged(props.selectedMolecule.uniqueId, "modify")}
            {...props}
        />
    );
};
