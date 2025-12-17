import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import React, { useCallback, useMemo } from "react";
import { RootState } from "../../../../store/MoorhenReduxStore";
import { setHoveredAtom } from "../../../../store/hoveringStatesSlice";
import { moorhen } from "../../../../types/moorhen";
import { MoorhenAccordion } from "../../../interface-base";
import { MoorhenSequenceViewer, MoorhenSequenceViewerSequence } from "../../../sequence-viewer";
import {
    MoleculeToSeqViewerSequences,
    MoorhenSelectionToSeqViewer,
    handleResiduesSelection,
    useHoveredResidue,
} from "../../../sequence-viewer/utils";

export const MoorhenSequencesAccordion = (props: {
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
    molecule: moorhen.Molecule;
    setSelectedResidues: React.Dispatch<React.SetStateAction<[number, number]>>;
    clickedResidue: {
        modelIndex: number;
        molName: string;
        chain: string;
        seqNum: number;
    };
    setClickedResidue: React.Dispatch<
        React.SetStateAction<{
            modelIndex: number;
            molName: string;
            chain: string;
            seqNum: number;
        }>
    >;
}) => {
    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();

    const residueSelection = useSelector((state: RootState) => state.generalStates.residueSelection);

    const sequenceSelection = useMemo(() => {
        return MoorhenSelectionToSeqViewer(residueSelection);
    }, [residueSelection]);

    const sequenceList = useMemo<MoorhenSequenceViewerSequence[]>(() => {
        return MoleculeToSeqViewerSequences(props.molecule);
    }, [props.molecule, props.molecule.sequences]);

    const display = sequenceList && sequenceList.length > 0 ? true : false;

    const handleClickResidue = useCallback(
        (modelIndex, molName, chain, seqNum) => {
            props.setClickedResidue({ modelIndex, molName, chain, seqNum });
        },
        [props.setClickedResidue]
    );

    const residueSelectionCallback = useCallback(
        selection => {
            handleResiduesSelection(selection, props.molecule, dispatch, enqueueSnackbar);
        },
        [props.molecule, dispatch, enqueueSnackbar]
    );

    const handleHoverResidue = useCallback(
        (molName, chain, resNum, resCode, resCID) => {
            dispatch(setHoveredAtom({ molecule: props.molecule, cid: resCID }));
        },
        [dispatch, props.molecule]
    );

    const hoveredResidue = useHoveredResidue();

    return (
        <MoorhenAccordion title="Sequences">
            {!display ? (
                <div>
                    <b>No sequence data</b>
                </div>
            ) : (
                <MoorhenSequenceViewer
                    sequences={sequenceList}
                    selectedResidues={sequenceSelection}
                    onResidueClick={handleClickResidue}
                    onResiduesSelect={residueSelectionCallback}
                    onHoverResidue={handleHoverResidue}
                    hoveredResidue={hoveredResidue}
                    maxDisplayHeight={8}
                />
            )}
        </MoorhenAccordion>
    );
};
