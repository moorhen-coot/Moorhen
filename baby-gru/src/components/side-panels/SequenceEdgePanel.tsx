import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { RootState } from '../../store/MoorhenReduxStore';
import { MoorhenSequenceViewer, MoorhenSequenceViewerSequence } from '../sequence-viewer';
import {
    MoleculeToSeqViewerSequences,
    MoorhenSelectionToSeqViewer,
    handleResiduesSelection,
    useHoveredResidue,
} from '../sequence-viewer/utils';

export const EdgePanelSequenceViewer = () => {
    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const molecule = useSelector((state: RootState) => state.molecules.moleculeList[0]);
    const sidePanelIsShown = useSelector((state: RootState) => state.globalUI.sidePanelIsShown);
    const residueSelection = useSelector((state: RootState) => state.generalStates.residueSelection);

    const sequenceSelection = useMemo(() => {
        return MoorhenSelectionToSeqViewer(residueSelection);
    }, [residueSelection]);

    const sequenceList = useMemo<MoorhenSequenceViewerSequence[]>(() => {
        return MoleculeToSeqViewerSequences(molecule);
    }, [molecule]);
    console.log('sequenceList', sequenceList);

    const handleClick = (modelIndex: number, molName: string, chain: string, seqNum: number) => {
        molecule.centreOn(`//${chain}/${seqNum}/*`);
    };

    const hoveredResidue = useHoveredResidue();

    const residueSelectionCallback = useCallback(() => {
        handleResiduesSelection(molecule, dispatch, enqueueSnackbar);
    }, [molecule, dispatch, enqueueSnackbar]);

    return (
        <MoorhenSequenceViewer
            sequences={sequenceList}
            selectedResidues={sequenceSelection}
            hoveredResidue={hoveredResidue}
            maxDisplayHeight={1}
            showTitleBar={false}
            onResidueClick={handleClick}
            onResiduesSelect={residueSelectionCallback}
            className={`moorhen__edge-panel-sequence-viewer ${
                sidePanelIsShown ? 'moorhen__edge-panel-sequence-viewer--side-panel-visible' : ''
            }`}
        />
    );
};
