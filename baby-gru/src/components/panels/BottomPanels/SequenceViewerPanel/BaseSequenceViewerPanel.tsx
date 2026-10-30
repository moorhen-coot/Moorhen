import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MoorhenSequenceViewer, MoorhenSequenceViewerSequence } from "@/components/sequence-viewer";
import { MoorhenSelectionToSeqViewer, handleResiduesSelection, useHoveredResidue } from "@/components/sequence-viewer/utils";
import { RootState, setHoveredAtom } from "@/store";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";

export interface BaseSequenceViewerPanelProps {
    selectedMolecule: string;
    sequences: MoorhenSequenceViewerSequence[];
    displayHeight?: number;
    showValidationData?: boolean;
    nameColumnWidth?: number;
    validationTracks?: string[];
    showTitleBar?: boolean;
    columnWidth?: number;
}

/**
 * Generic base component for rendering a sequence viewer
 * Eliminates duplication between SequenceViewerPanel and ValidationPanel
 */
export const BaseSequenceViewerPanel = ({
    selectedMolecule,
    sequences,
    displayHeight = 1,
    showValidationData = false,
    nameColumnWidth,
    validationTracks,
    showTitleBar = false,
    columnWidth = 1,
}: BaseSequenceViewerPanelProps) => {
    const dispatch = useDispatch();
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const residueSelection = useSelector((state: RootState) => state.generalStates.residueSelection);

    const molecule: MoorhenMolecule | null = useMemo(() => {
        return moleculeList.length > 0
            ? (moleculeList.find(molecule => molecule.uniqueId === selectedMolecule) ?? moleculeList[0])
            : null;
    }, [moleculeList, selectedMolecule]);

    const sequenceSelection = useMemo(() => MoorhenSelectionToSeqViewer(residueSelection), [residueSelection]);
    const hoveredResidue = useHoveredResidue();

    const handleClick = useCallback(
        (modelIndex: number, molName: string, chain: string, seqNum: number) => {
            if (!molecule) return;
            molecule.centreOn(`//${chain}/${seqNum}/*`);
        },
        [molecule]
    );

    const residueSelectionCallback = useCallback(
        (selection) => {
            if (!molecule) return;
            handleResiduesSelection(selection, molecule, dispatch);
        },
        [molecule, dispatch]
    );

    const handleHoverResidue = useCallback(
        (molName: string, chain: string, resNum: number, resCode: string, resCID: string) => {
            if (!molecule) return;
            dispatch(setHoveredAtom({ molecule: molecule, cid: resCID, atomInfo: null }));
        },
        [dispatch, molecule]
    );

    const seqViewerKey = useMemo(() => {
        return molecule?.molNo !== undefined ? molecule.molNo : "no-molecule";
    }, [molecule?.molNo]);

    return (
        <MoorhenSequenceViewer
            key={seqViewerKey}
            sequences={sequences}
            selectedResidues={sequenceSelection}
            hoveredResidue={hoveredResidue}
            displayHeight={displayHeight}
            showTitleBar={showTitleBar}
            onResidueClick={handleClick}
            setSelectedResidues={residueSelectionCallback}
            onHoverResidue={handleHoverResidue}
            showValidationData={showValidationData}
            nameColumnWidth={nameColumnWidth}
            validationTracks={validationTracks}
            columnWidth={columnWidth}
        />
    );
};
