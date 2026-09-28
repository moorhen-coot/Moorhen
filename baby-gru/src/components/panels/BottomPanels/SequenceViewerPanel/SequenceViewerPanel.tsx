import { useDispatch, useSelector, useStore } from "react-redux";
import { useEffect, useMemo } from "react";
import { RootState, setSeqViewerOption } from "@/store";
import { BaseSequenceViewerPanel } from "./BaseSequenceViewerPanel";
import { useMoleculeChanged } from "@/hooks";

export type SequenceViewerOption = {
    showExpandButton: boolean;
    nOfLines:number;
    expanded: boolean;
    selectedMolecule: string;
    columnWidth: number;
};

export const SequenceViewerPanel = () => {
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const option = useSelector((state: RootState) => state.bottomPanels.seqviewerOption);
    const molecule = useMemo(() => {
        return moleculeList.length > 0
            ? (moleculeList.find(molecule => molecule.uniqueId === option.selectedMolecule) ?? moleculeList[0])
            : null;
    }, [moleculeList, option.selectedMolecule]);

    const moleculeChange = useMoleculeChanged();

    const sequenceList = useMemo(() => {
        return molecule?.seqViewerData ?? [];
        // moleculeChange forces a refresh when a molecule is mutated in place (same reference)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [molecule, moleculeChange]);
    const showExpandButton = sequenceList.length > 1;

    useEffect(() => {
        const seqviewerOption = store.getState().bottomPanels.seqviewerOption;
        if (seqviewerOption.showExpandButton !== showExpandButton) {
            dispatch(setSeqViewerOption({...seqviewerOption, showExpandButton}));
        }
        console.log("SequenceViewerPanel: showExpandButton", showExpandButton);
    }, [showExpandButton, dispatch, store]);

    const expandLength = sequenceList.length <= option.nOfLines ? sequenceList.length : option.nOfLines;

    return (
        <BaseSequenceViewerPanel
            selectedMolecule={option.selectedMolecule}
            sequences={sequenceList}
            displayHeight={option.expanded ? expandLength : 1}
            showValidationData={false}
            columnWidth={option.columnWidth}
        />
    );
};
