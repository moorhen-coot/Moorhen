import { useDispatch, useSelector, useStore } from "react-redux";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MoorhenSequenceViewer, MoorhenSequenceViewerSequence } from "@/components/sequence-viewer";
import {
    MoleculeToSeqViewerSequences,
    MoorhenSelectionToSeqViewer,
    handleResiduesSelection,
    useHoveredResidue,
} from "@/components/sequence-viewer/utils";
import { RootState, setHoveredAtom, setSeqViewerOption } from "@/store";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { SequenceViewerOption } from "./SequenceViewerTab";

export const SequenceViewerPanel = (props: { option: SequenceViewerOption }) => {
    const { option } = props
    const dispatch = useDispatch();
    const store = useStore<RootState>();

    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const molecule: MoorhenMolecule | null = useSelector((state: RootState) => {
        return moleculeList.length > 0
            ? (state.molecules.moleculeList.find(molecule => molecule.molNo === option.selectedMolecule) ?? moleculeList[0])
            : null;
    });

    const sidePanelIsOpen = useSelector((state: RootState) => state.globalUI.shownSidePanel !== null);
    const residueSelection = useSelector((state: RootState) => state.generalStates.residueSelection);



    const [panelKeyRef, setPanelKeyRef] = useState<number>(0);

    const sequenceSelection = useMemo(() => {
        return MoorhenSelectionToSeqViewer(residueSelection);
    }, [residueSelection]);

    const sequenceList = useMemo<MoorhenSequenceViewerSequence[]>(() => {
        const sequences = MoleculeToSeqViewerSequences(molecule);
        return sequences;
    }, [option.selectedMolecule, molecule?.sequences]);

    useEffect(() => {
        const seqviewerOption = store.getState().bottomPanels.seqviewerOption;
        dispatch(setSeqViewerOption({...seqviewerOption, showExpandButton: sequenceList.length > 1}));
    }, [sequenceList]);

    const handleClick = useCallback(
        (modelIndex: number, molName: string, chain: string, seqNum: number) => {
            molecule.centreOn(`//${chain}/${seqNum}/*`);
        },
        [molecule]
    );

    const hoveredResidue = useHoveredResidue();

    const residueSelectionCallback = useCallback(
        selection => {
            handleResiduesSelection(selection, molecule, dispatch);
        },
        [molecule, dispatch]
    );

    const handleHoverResidue = useCallback(
        (molName, chain, resNum, resCode, resCID) => {
            dispatch(setHoveredAtom({ molecule: molecule, cid: resCID, atomInfo: null }));
        },
        [dispatch, molecule]
    );


    useEffect(() => {
        const animation = () => {
            for (let i = 0; i < 600 / 10; i++) {
                setTimeout(
                    () => {
                        setPanelKeyRef(current => current + 1);
                    },
                    10 * (i + 1)
                );
            }
        };
        animation();
    }, [sidePanelIsOpen]);

    const expandLength = sequenceList.length <= option.nOfLines ? sequenceList.length : option.nOfLines;
    const seqViewerKey = useMemo(() => {
        return molecule?.molNo !== undefined ? molecule.molNo : `no-molecule`;
    }, [molecule?.molNo, option.selectedMolecule, moleculeList]);

    return (
        <MoorhenSequenceViewer
            key={seqViewerKey}
            sequences={sequenceList}
            selectedResidues={sequenceSelection}
            hoveredResidue={hoveredResidue}
            displayHeight={option.expanded ? expandLength : 1}
            showTitleBar={false}
            onResidueClick={handleClick}
            onResiduesSelect={residueSelectionCallback}
            onHoverResidue={handleHoverResidue}
            forceRedrawScrollBarKey={panelKeyRef}
            showValidationData={false}
        />

    );
};
