import { reverse } from "dns";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCommandCentre, useMoorhenInstance } from "@/InstanceManager";
import { WorkerResponse } from "@/InstanceManager/CommandCentre/MoorhenCommandCentre";
import { MoorhenButton, MoorhenMoleculeSelect, MoorhenPopoverButton, MoorhenToggle } from "@/components/inputs";
import { MoorhenStack } from "@/components/interface-base/Stack/Stack";
import { MoorhenSequenceViewer, MoorhenSequenceViewerSequence } from "@/components/sequence-viewer";
import {
    MoleculeToSeqViewerSequences,
    MoorhenSelectionToSeqViewer,
    addValidationDataToSeqViewerSequences,
    cootMMRCCToSeqViewer,
    cootValidationDataToSeqViewer,
    handleResiduesSelection,
    useHoveredResidue,
} from "@/components/sequence-viewer/utils";
import { MoorhenMapSelect } from "@/moorhen";
import { RootState, setHoveredAtom, setShowBottomPanel, setShowValidationPanel } from "@/store";
import { libcootApi } from "@/types/libcoot";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { convertRemToPx } from "@/utils/utils";
import "./sequence-viewer-panel.css";

export const ValidationPanel = () => {
    const dispatch = useDispatch();
    const commandCentre = useCommandCentre();
    const moorhenInstance = useMoorhenInstance();

    const bottomPanelIsShown = useSelector((state: RootState) => state.globalUI.bottomPanelIsShown);
    const [sequencesExpand, setSequencesExpand] = useState<boolean>(false);
    const { enqueueSnackbar } = useSnackbar();
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const [selectedMolecule, setSelectedMolecule] = useState<number>(-999);
    const [numberOfLines, setNumberOfLines] = useState<number>(4);
    const [sequencesList, setSequencesList] = useState<MoorhenSequenceViewerSequence[]>([]);
    const molecule: MoorhenMolecule | null = useSelector((state: RootState) => {
        return moleculeList.length > 0
            ? (state.molecules.moleculeList.find(molecule => molecule.molNo === selectedMolecule) ?? moleculeList[0])
            : null;
    });
    const [selectedMap, setSelectedMap] = useState<number>(-999);

    const sidePanelIsOpen = useSelector((state: RootState) => state.globalUI.shownSidePanel !== null);
    const GlViewportWidth = useSelector((state: RootState) => state.sceneSettings.GlViewportWidth);
    const residueSelection = useSelector((state: RootState) => state.generalStates.residueSelection);
    const showValidationPanel = useSelector((state: RootState) => state.globalUI.showValidationPanel);
    const maps = useSelector((state: RootState) => state.maps);
    const store = useStore<RootState>();

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

    useEffect(() => {
        if (!molecule || molecule.molNo === null) {
            return;
        }
        const updateSequences = async () => {
            const sequences = MoleculeToSeqViewerSequences(molecule);

            if (selectedMap === -999) {
                // use active map if no map is selected
                if (store.getState().generalStates.activeMap) {
                    setSelectedMap(store.getState().generalStates.activeMap.molNo);
                    return [];
                }
            }
            const mapRMS = maps.find(map => map.molNo === selectedMap)?.mapRmsd ?? 1.0;
            console.log("mapRMS", mapRMS);

            const geoValidationData = await moorhenInstance.cootCommand.getGeoValidationData(molecule.molNo);
            const newCootDensityFitData = await moorhenInstance.cootCommand.getDensityFitAnalysis(molecule.molNo, selectedMap, mapRMS);
            const newCootDensityCorrelationData = await moorhenInstance.cootCommand.getDensityCorrelationAnalysis(
                molecule.molNo,
                selectedMap
            );
            const qScore = await moorhenInstance.cootCommand.getQScore(molecule.molNo, selectedMap);

            const MMRRCC = (await commandCentre.current.cootCommand(
                {
                    message: "coot_command",
                    command: "mmrrcc",
                    returnType: "mmrrcc_stats",
                    commandArgs: [molecule.molNo, "A", selectedMap],
                },
                false
            )) as WorkerResponse<libcootApi.MMRCCStatsJS>;
            console.log("MMRCC", MMRRCC.data.result.result);

            addValidationDataToSeqViewerSequences(
                sequences,
                cootMMRCCToSeqViewer(MMRRCC.data.result.result),
                undefined,
                undefined,
                true,
                "Density"
            );
            addValidationDataToSeqViewerSequences(sequences, geoValidationData, 4, undefined, undefined, "Geometry");
            // addValidationDataToSeqViewerSequences(
            //     sequences,
            //     cootValidationDataToSeqViewer(newCootDensityFitData, "Density Fit RMSZ"),
            //     4,
            //     undefined,
            //     true,
            //     "Density"
            // );
            addValidationDataToSeqViewerSequences(
                sequences,
                cootValidationDataToSeqViewer(newCootDensityCorrelationData, "Density Correlation"),
                undefined,
                "mpl Viridis",
                true,
                "Density"
            );
            addValidationDataToSeqViewerSequences(
                sequences,
                cootValidationDataToSeqViewer(qScore, "Q Score"),
                undefined,
                "mpl Viridis",
                true,
                "Density"
            );

            setSequencesList(sequences);
        };
        updateSequences();
    }, [selectedMolecule, molecule?.sequences, showValidationPanel, selectedMap]);

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

    const configPanel = (
        <MoorhenStack inputGrid>
            <MoorhenMoleculeSelect onSelect={val => setSelectedMolecule(val)} selected={selectedMolecule} />
            <MoorhenMapSelect onSelect={setSelectedMap} maps={maps} />
        </MoorhenStack>
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

    const expandLength = sequencesList.length <= numberOfLines ? sequencesList.length : numberOfLines;
    const displaySize = showValidationPanel ? 2 * 26 + 76 : (expandLength - 1) * 26 + 76;

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
                    (sequencesList.length > 1 ? (
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
                        sequences={sequencesList}
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
