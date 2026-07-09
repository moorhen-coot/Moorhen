import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MoorhenButton, MoorhenMoleculeSelect, MoorhenNumberInput, MoorhenPopoverButton } from "@/components/inputs";
import { MoorhenSequenceViewer, MoorhenSequenceViewerSequence } from "@/components/sequence-viewer";
import {
    MoleculeToSeqViewerSequences,
    MoorhenSelectionToSeqViewer,
    handleResiduesSelection,
    useHoveredResidue,
} from "@/components/sequence-viewer/utils";
import { RootState, setHoveredAtom, setShowBottomPanel } from "@/store";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { convertRemToPx } from "@/utils/utils";
import "./sequence-viewer-panel.css";
import { SequenceViewerOption } from "./SequenceViewerTab";

export const SequenceViewerPanel = (props: {option:SequenceViewerOption}) => {
    const {option} = props
    const dispatch = useDispatch();

    const bottomPanelIsShown = useSelector((state: RootState) => state.globalUI.bottomPanelIsShown);

    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const molecule: MoorhenMolecule | null = useSelector((state: RootState) => {
        return moleculeList.length > 0
            ? (state.molecules.moleculeList.find(molecule => molecule.molNo === option.selectedMolecule) ?? moleculeList[0])
            : null;
    });

    const sidePanelIsOpen = useSelector((state: RootState) => state.globalUI.shownSidePanel !== null);
    const GlViewportWidth = useSelector((state: RootState) => state.sceneSettings.GlViewportWidth);
    const residueSelection = useSelector((state: RootState) => state.generalStates.residueSelection);

    const [panelKeyRef, setPanelKeyRef] = useState<number>(0);

    // const toggleBottomPanel = () => {
    //     if (expand) {
    //         setExpand(false);
    //     }
    //     dispatch(setShowBottomPanel(!bottomPanelIsShown));
    // };

    const sequenceSelection = useMemo(() => {
        return MoorhenSelectionToSeqViewer(residueSelection);
    }, [residueSelection]);

    const sequenceList = useMemo<MoorhenSequenceViewerSequence[]>(() => {
        const sequences = MoleculeToSeqViewerSequences(molecule);
        return sequences;
    }, [option.selectedMolecule, molecule?.sequences]);

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
    const displaySize = (expandLength - 1) * 26 + 76;
    //const displaySize = 4 * 26 + 16;

    const seqViewerKey = useMemo(() => {
        return molecule?.molNo !== undefined ? molecule.molNo : `no-molecule`;
    }, [molecule?.molNo, option.selectedMolecule, moleculeList]);

    return (
        <>
            {/* <div
                className={`moorhen__sequence-panel-tab ${bottomPanelIsShown ? "" : "moorhen__sequence-panel-tab-panel-is-hidden"}`}
                style={{ left: `${(GlViewportWidth - convertRemToPx(10)) / 2}px`, bottom: expand ? `${displaySize - 1}px` : "76px" }}
            >
                {bottomPanelIsShown && <MoorhenPopoverButton size="small">{configPanel}</MoorhenPopoverButton>}
                <button className="moorhen__sequence-panel-button" onClick={toggleBottomPanel}>
                    &nbsp;&nbsp;Sequences&nbsp;&nbsp;
                </button>
                {bottomPanelIsShown &&
                    (sequenceList.length > 1 ? (
                        <MoorhenButton
                            type="icon-only"
                            icon={expand ? "MatSymDoubleArrowDown" : "MatSymDoubleArrowUp"}
                            size="small"
                            onClick={handleExpand}
                        />
                    ) : (
                        <span>&nbsp;&nbsp;</span>
                    ))}
            </div> */}
            <div
                className={`moorhen__sequence-panel-container- ${bottomPanelIsShown ? "" : "moorhen__sequence-panel-tab-panel-is-hidden"}`}
                style={option.expanded ? { height:option.expanded? `${displaySize}px` : "76px" } : {}}
            >
                <MoorhenSequenceViewer
                    key={seqViewerKey}
                    sequences={sequenceList}
                    selectedResidues={sequenceSelection}
                    hoveredResidue={hoveredResidue}
                    maxDisplayHeight={4}
                    displayHeight={option.expanded ? option.nOfLines : 1}
                    // displayHeight={1}
                    showTitleBar={false}
                    onResidueClick={handleClick}
                    onResiduesSelect={residueSelectionCallback}
                    onHoverResidue={handleHoverResidue}
                    className={`moorhen__edge-panel-sequence-viewer`}
                    style={sidePanelIsOpen ? { width: GlViewportWidth } : {}}
                    forceRedrawScrollBarKey={panelKeyRef}
                    showValidationData={false}
                />
            </div>
        </>
    );
};
