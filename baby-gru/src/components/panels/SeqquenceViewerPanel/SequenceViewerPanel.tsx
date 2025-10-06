import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RootState } from '../../../store/MoorhenReduxStore';
import { setShowBottomPanel } from '../../../store/globalUISlice';
import { setHoveredAtom } from '../../../store/hoveringStatesSlice';
import type { MoorhenMolecule } from '../../../utils/MoorhenMolecule';
import { convertRemToPx } from '../../../utils/utils';
import { MoorhenButton, MoorhenMoleculeSelect, MoorhenPopoverButton, MoorhenPreciseInput } from '../../inputs';
import { MoorhenSequenceViewer, MoorhenSequenceViewerSequence } from '../../sequence-viewer';
import {
    MoleculeToSeqViewerSequences,
    MoorhenSelectionToSeqViewer,
    handleResiduesSelection,
    useHoveredResidue,
} from '../../sequence-viewer/utils';
import './sequence-viewer-panel.css';

export const SequenceViewerPanel = () => {
    const dispatch = useDispatch();

    const bottomPanelIsShown = useSelector((state: RootState) => state.globalUI.bottomPanelIsShown);
    const [expand, setExpand] = useState<boolean>(false);
    const { enqueueSnackbar } = useSnackbar();
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const [selectedMolecule, setSelectedMolecule] = useState<number>(-999);
    const [numberOfLines, setNumberOfLines] = useState<number>(4);
    const molecule: MoorhenMolecule | null = useMemo(() => {
        return moleculeList.length > 0 ? (moleculeList.find(molecule => molecule.molNo === selectedMolecule) ?? moleculeList[0]) : null;
    }, [moleculeList, selectedMolecule]);

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
    }, [molecule, selectedMolecule]);

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

    const configPanel = (
        <div>
            <MoorhenMoleculeSelect onSelect={val => setSelectedMolecule(val)} selected={selectedMolecule} />
            <p></p>
            <MoorhenPreciseInput
                label="Max lines"
                labelPosition="left"
                minMax={[1, 10]}
                type="numberForm"
                decimalDigits={0}
                value={numberOfLines}
                setValue={val => setNumberOfLines(parseInt(val))}
                width="4rem"
            />
        </div>
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

    const expandLength = sequenceList.length <= numberOfLines ? sequenceList.length : numberOfLines;
    const displaySize = (expandLength - 1) * 26 + 76;

    const seqViewerKey = useMemo(() => {
        return molecule?.molNo !== undefined ? molecule.molNo : `no-molecule`;
    }, [molecule?.molNo, selectedMolecule, moleculeList]);

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
                style={{ left: `${(GlViewportWidth - convertRemToPx(10)) / 2}px`, bottom: expand ? `${displaySize - 1}px` : '76px' }}
            >
                {bottomPanelIsShown && <MoorhenPopoverButton size="small">{configPanel}</MoorhenPopoverButton>}
                <button className="moorhen__bottom-panel-button" onClick={toggleBottomPanel}>
                    &nbsp;&nbsp;Sequences&nbsp;&nbsp;
                </button>
                {bottomPanelIsShown &&
                    (sequenceList.length > 1 ? (
                        <MoorhenButton
                            type="icon-only"
                            icon={expand ? 'MUISymbolDoubleArrowDown' : 'MUISymbolDoubleArrowUp'}
                            size="small"
                            onClick={handleExpand}
                        />
                    ) : (
                        <span>&nbsp;&nbsp;</span>
                    ))}
            </div>
            <div
                className={`moorhen__bottom-panel-container ${bottomPanelIsShown ? '' : 'moorhen__bottom-panel-tab-panel-is-hidden'}`}
                style={expand ? { height: expand ? `${displaySize}px` : '76px' } : {}}
            >
                <MoorhenSequenceViewer
                    key={seqViewerKey}
                    sequences={sequenceList}
                    selectedResidues={sequenceSelection}
                    hoveredResidue={hoveredResidue}
                    maxDisplayHeight={4}
                    displayHeight={expand ? numberOfLines : 1}
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
