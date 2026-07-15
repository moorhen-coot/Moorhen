import { useDispatch, useSelector, useStore } from "react-redux";
import { useEffect, useMemo } from "react";
import { RootState, setSeqViewerOption } from "@/store";
import { BaseSequenceViewerPanel } from "./BaseSequenceViewerPanel";
import { useMoleculeChanged } from "@/hooks/usMolleculeChange";

export type SequenceViewerOption = {
    showExpandButton: boolean;
    nOfLines:number;
    expanded: boolean;
    selectedMolecule: string;
};

export const SequenceViewerPanel = (props: { option: SequenceViewerOption }) => {
    const { option } = props
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const molecule = useMemo(() => {
        return moleculeList.length > 0
            ? (moleculeList.find(molecule => molecule.uniqueId === option.selectedMolecule) ?? moleculeList[0])
            : null;
    }, [moleculeList, option.selectedMolecule]);

    const moleculeChange = useMoleculeChanged();

    const sequenceList = molecule?.seqViewerData ?? [];

    useEffect(() => {
        const seqviewerOption = store.getState().bottomPanels.seqviewerOption;
        dispatch(setSeqViewerOption({...seqviewerOption, showExpandButton: sequenceList.length > 1}));
    }, [sequenceList]);

    const expandLength = sequenceList.length <= option.nOfLines ? sequenceList.length : option.nOfLines;

    return (
        <BaseSequenceViewerPanel
            selectedMolecule={option.selectedMolecule}
            sequences={sequenceList}
            displayHeight={option.expanded ? expandLength : 1}
            showValidationData={false}
        />
    );
};
