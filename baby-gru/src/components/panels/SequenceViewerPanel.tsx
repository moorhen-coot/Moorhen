import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RootState } from '../../store/MoorhenReduxStore';
import { setShowBottomPanel } from '../../store/globalUISlice';
import { setHoveredAtom } from '../../store/hoveringStatesSlice';
import { MoorhenButton } from '../inputs';
import { MoorhenSequenceViewer, MoorhenSequenceViewerSequence } from '../sequence-viewer';
import {
    MoleculeToSeqViewerSequences,
    MoorhenSelectionToSeqViewer,
    handleResiduesSelection,
    useHoveredResidue,
} from '../sequence-viewer/utils';
import './side-panels.css';

export const SequenceViewerPanel = () => {
    const dispatch = useDispatch();

    const bottomPanelIsShown = useSelector((state: RootState) => state.globalUI.bottomPanelIsShown);

    const [expand, setExpand] = useState<boolean>(false);
    const { enqueueSnackbar } = useSnackbar();
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const molecule = moleculeList[0];
    const sidePanelIsShown = useSelector((state: RootState) => state.globalUI.sidePanelIsShown);
    const GlViewportWidth = useSelector((state: RootState) => state.sceneSettings.GlViewportWidth);
    const residueSelection = useSelector((state: RootState) => state.generalStates.residueSelection);
    const [panelKeyRef, setPanelKeyRef] = useState<number>(0);

    const toggleBottomPanel = () => {
        if (expand) {
            setExpand(false);
        }
        dispatch(setShowBottomPanel(!bottomPanelIsShown));
    };
    const handleExpand = () => {
        setExpand(!expand);
    };

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
        [molecule, dispatch, enqueueSnackbar]
    );

    const handleHoverResidue = useCallback(
        (molName, chain, resNum, resCode, resCID) => {
            dispatch(setHoveredAtom({ molecule: molecule, cid: resCID }));
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
    }, [sidePanelIsShown]);

    const expandLength = sequenceList.length < 5 ? sequenceList.length : 4;
    const displaySize = (expandLength - 1) * 26 + 76;

    if (!molecule) {
        return <div> No Molecule loaded</div>;
    }

    return (
        <>
            <div
                className={`moorhen__bottom-panel-tab ${
                    bottomPanelIsShown
                        ? expand
                            ? 'moorhen__bottom-panel-tab-panel-is-expanded'
                            : ''
                        : 'moorhen__bottom-panel-tab-panel-is-hidden'
                }`}
                style={{ left: `${GlViewportWidth / 2}px`, bottom: expand ? `${displaySize - 1}px` : '76px' }}
            >
                {bottomPanelIsShown && <MoorhenButton type="icon-only" icon="MUISymbolSettings" size="small" onClick={handleExpand} />}
                <button className="moorhen__bottom-panel-button" onClick={toggleBottomPanel}>
                    &nbsp;Sequences&nbsp;{' '}
                </button>
                {bottomPanelIsShown && sequenceList.length > 1 && (
                    <MoorhenButton
                        type="icon-only"
                        icon={expand ? 'MUISymbolDoubleArrowDown' : 'MUISymbolDoubleArrowUp'}
                        size="small"
                        onClick={handleExpand}
                    />
                )}
            </div>
            <div
                className={`moorhen__bottom-panel-container ${bottomPanelIsShown ? '' : 'moorhen__bottom-panel-tab-panel-is-hidden'}`}
                style={expand ? { height: expand ? `${displaySize}px` : '76px' } : {}}
            >
                <MoorhenSequenceViewer
                    sequences={sequenceList}
                    selectedResidues={sequenceSelection}
                    hoveredResidue={hoveredResidue}
                    maxDisplayHeight={4}
                    displayHeight={expand ? 4 : 1}
                    showTitleBar={false}
                    onResidueClick={handleClick}
                    onResiduesSelect={residueSelectionCallback}
                    onHoverResidue={handleHoverResidue}
                    className={`moorhen__edge-panel-sequence-viewer`}
                    style={sidePanelIsShown ? { width: GlViewportWidth } : {}}
                    forceRedrawScrollBarKey={panelKeyRef}
                />
            </div>
        </>
    );
};
