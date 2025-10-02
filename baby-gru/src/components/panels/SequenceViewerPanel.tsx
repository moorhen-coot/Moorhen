import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RootState } from '../../store/MoorhenReduxStore';
import { setHoveredAtom } from '../../store/hoveringStatesSlice';
import { MoorhenSequenceViewer, MoorhenSequenceViewerSequence } from '../sequence-viewer';
import {
    MoleculeToSeqViewerSequences,
    MoorhenSelectionToSeqViewer,
    handleResiduesSelection,
    useHoveredResidue,
} from '../sequence-viewer/utils';
import './side-panels.css';

export const EdgePanelSequenceViewer = () => {
    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const molecule = moleculeList[0];
    const sidePanelIsShown = useSelector((state: RootState) => state.globalUI.sidePanelIsShown);
    const GlViewportWidth = useSelector((state: RootState) => state.sceneSettings.GlViewportWidth);
    const residueSelection = useSelector((state: RootState) => state.generalStates.residueSelection);
    const [panelKeyRef, setPanelKeyRef] = useState<number>(0);
    const isMolecule = molecule?.molNo ? true : false;

    const sequenceSelection = useMemo(() => {
        return MoorhenSelectionToSeqViewer(residueSelection);
    }, [residueSelection]);

    const sequenceList = useMemo<MoorhenSequenceViewerSequence[]>(() => {
        return MoleculeToSeqViewerSequences(molecule);
    }, [molecule]);

    const handleClick = useCallback(
        (modelIndex: number, molName: string, chain: string, seqNum: number) => {
            molecule.centreOn(`//${chain}/${seqNum}/*`);
        },
        [molecule]
    );

    const hoveredResidue = useHoveredResidue();

    const residueSelectionCallback = useCallback(
        selection => {
            handleResiduesSelection(selection, molecule, dispatch, enqueueSnackbar);
        },
        [molecule, dispatch, enqueueSnackbar, isMolecule]
    );

    const handleHoverResidue = useCallback(
        (molName, chain, resNum, resCode, resCID) => {
            dispatch(setHoveredAtom({ molecule: molecule, cid: resCID }));
        },
        [dispatch, molecule, isMolecule]
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
    }, [sidePanelIsShown]);

    if (!molecule) {
        return <div> No Molecule loaded</div>;
    }

    return (
        <MoorhenSequenceViewer
            sequences={sequenceList}
            selectedResidues={sequenceSelection}
            hoveredResidue={hoveredResidue}
            maxDisplayHeight={1}
            showTitleBar={false}
            onResidueClick={handleClick}
            onResiduesSelect={residueSelectionCallback}
            onHoverResidue={handleHoverResidue}
            className={`moorhen__edge-panel-sequence-viewer`}
            style={sidePanelIsShown ? { width: GlViewportWidth } : {}}
            forceRedrawScrollBarKey={panelKeyRef}
        />
    );
};
