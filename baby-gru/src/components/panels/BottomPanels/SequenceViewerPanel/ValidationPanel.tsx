import { add } from "@dnd-kit/utilities";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MoorhenButton, MoorhenMoleculeSelect, MoorhenNumberInput, MoorhenPopoverButton, MoorhenToggle } from "@/components/inputs";
import { MoorhenSequenceViewer, MoorhenSequenceViewerSequence } from "@/components/sequence-viewer";
import { useCommandCentre } from "@/InstanceManager";
import {
    MoleculeToSeqViewerSequences,
    MoorhenSelectionToSeqViewer,
    addValidationDataToSeqViewerSequences,
    handleResiduesSelection,
    useHoveredResidue,
} from "@/components/sequence-viewer/utils";
import { RootState, setHoveredAtom, setShowBottomPanel, setShowValidationPanel } from "@/store";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { convertRemToPx } from "@/utils/utils";
import "./sequence-viewer-panel.css";

export const ValidationPanel = () => {
    const dispatch = useDispatch();
    const commandCentre = useCommandCentre();

    const bottomPanelIsShown = useSelector((state: RootState) => state.globalUI.bottomPanelIsShown);
    const [sequencesExpand, setSequencesExpand] = useState<boolean>(false);
    const { enqueueSnackbar } = useSnackbar();
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const [selectedMolecule, setSelectedMolecule] = useState<number>(-999);
    const [numberOfLines, setNumberOfLines] = useState<number>(4);
    const molecule: MoorhenMolecule | null = useSelector((state: RootState) => {
        return moleculeList.length > 0
            ? (state.molecules.moleculeList.find(molecule => molecule.molNo === selectedMolecule) ?? moleculeList[0])
            : null;
    });

    const sidePanelIsOpen = useSelector((state: RootState) => state.globalUI.shownSidePanel !== null);
    const GlViewportWidth = useSelector((state: RootState) => state.sceneSettings.GlViewportWidth);
    const residueSelection = useSelector((state: RootState) => state.generalStates.residueSelection);
    const showValidationPanel = useSelector((state: RootState) => state.globalUI.showValidationPanel);

    // const showValidationPanel = true;

    const expand = showValidationPanel || sequencesExpand;

    const [panelKeyRef, setPanelKeyRef] = useState<number>(0);

    const toggleBottomPanel = () => {
        if (sequencesExpand) {
            setSequencesExpand(false);
        }
        dispatch(setShowBottomPanel(!bottomPanelIsShown));
    };
    const handleExpand = () => {
        setSequencesExpand(!sequencesExpand);
    };

    const sequenceSelection = useMemo(() => {
        return MoorhenSelectionToSeqViewer(residueSelection);
    }, [residueSelection]);

    const getValidationDataForAllResidues = () => {
        if (!molecule) {
            return [];
        }
        // Mock function to generate random validation data for demonstration purposes
        const data = molecule.sequences.flatMap(sequence => {
            return [
                {
                    chain: sequence.chain,
                    label: "Ramachandran",
                    data: sequence.sequence.map(residue => ({ resNum: residue.resNum, score: Math.random() })),
                },
                {
                    chain: sequence.chain,
                    label: "Rotamer",
                    data: sequence.sequence.map(residue => ({ resNum: residue.resNum, score: Math.random() })),
                },
                {
                    chain: sequence.chain,
                    label: "Bonds",
                    data: sequence.sequence.map(residue => ({ resNum: residue.resNum, score: Math.random() })),
                },
                {
                    chain: sequence.chain,
                    label: "Angle",
                    data: sequence.sequence.map(residue => ({ resNum: residue.resNum, score: Math.random() })),
                },
                {
                    chain: sequence.chain,
                    label: "Peptide Omega",
                    data: sequence.sequence.map(residue => ({ resNum: residue.resNum, score: [Math.random(), 10] as [number, number] })),
                },
                {
                    chain: sequence.chain,
                    label: "1",
                    data: sequence.sequence.map(residue => ({ resNum: residue.resNum, score: 1 })),
                },
            ];
        });
        return data;
    };

    const sequenceList = useMemo<MoorhenSequenceViewerSequence[]>(() => {
        const sequences = MoleculeToSeqViewerSequences(molecule);
        const validationData = getValidationDataForAllResidues();

        const getNewValidationData = async () => {
            const newValidationData = await commandCentre.current.cootCommand(
                {
                    command: "get_validation",
                    commandArgs: [molecule.molNo as number],
                    returnType: "validation_data",
                },
                false
            );
            return newValidationData
        }
        const newValidationData = getNewValidationData().then(data => {
                const myObject = data.data.result.result // JSON.parse(data.data.result.result)
                console.log("My new validation JSON is",myObject)
            }
        )

        addValidationDataToSeqViewerSequences(sequences, validationData);
        return sequences;
    }, [selectedMolecule, molecule?.sequences]);

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
            dispatch(setHoveredAtom({ molecule: molecule, cid: resCID, atomInfo: null }));
        },
        [dispatch, molecule]
    );

    const configPanel = <MoorhenMoleculeSelect onSelect={val => setSelectedMolecule(val)} selected={selectedMolecule} />;

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

    const expandLength = sequenceList.length <= numberOfLines ? sequenceList.length : numberOfLines;
    const displaySize = showValidationPanel ? 2 * 26 + 76 : (expandLength - 1) * 26 + 76;
    //const displaySize = 6 * 26 + 16;

    const seqViewerKey = useMemo(() => {
        return molecule?.molNo !== undefined ? molecule.molNo : `no-molecule`;
    }, [molecule?.molNo, selectedMolecule, moleculeList]);

    return (
        <>
            <div
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
                {bottomPanelIsShown && (
                    <MoorhenToggle
                        label={"Validation"}
                        checked={showValidationPanel}
                        onChange={() => {
                            setPanelKeyRef(current => current + 1);
                            dispatch(setShowValidationPanel(!showValidationPanel));
                        }}
                    />
                )}
            </div>
            <div
                className={`moorhen__sequence-panel-container ${bottomPanelIsShown ? "" : "moorhen__sequence-panel-tab-panel-is-hidden"}`}
                style={expand ? { height: expand ? `${displaySize}px` : "76px" } : {}}
            >
                {bottomPanelIsShown && (
                    <MoorhenSequenceViewer
                        key={seqViewerKey}
                        sequences={sequenceList}
                        selectedResidues={sequenceSelection}
                        hoveredResidue={hoveredResidue}
                        maxDisplayHeight={4}
                        displayHeight={sequencesExpand ? numberOfLines : 1}
                        // displayHeight={1}
                        showTitleBar={false}
                        onResidueClick={handleClick}
                        onResiduesSelect={residueSelectionCallback}
                        onHoverResidue={handleHoverResidue}
                        className={`moorhen__edge-panel-sequence-viewer`}
                        style={sidePanelIsOpen ? { width: GlViewportWidth } : {}}
                        forceRedrawScrollBarKey={panelKeyRef}
                        showValidationData={showValidationPanel}
                    />
                )}
            </div>
        </>
    );
};
