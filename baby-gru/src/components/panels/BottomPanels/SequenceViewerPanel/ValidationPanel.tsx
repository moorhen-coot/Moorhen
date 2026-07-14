import { useDispatch, useSelector, useStore } from "react-redux";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCommandCentre, useMoorhenInstance } from "@/InstanceManager";
import { WorkerResponse } from "@/InstanceManager/CommandCentre/MoorhenCommandCentre";
import { MoorhenMoleculeSelect} from "@/components/inputs";
import { MoorhenMapSelect } from "@/components/inputs/";
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
import { RootState, setHoveredAtom } from "@/store";
import { libcootApi } from "@/types/libcoot";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";

export const ValidationPanel = () => {
    const dispatch = useDispatch();
    const commandCentre = useCommandCentre();
    const moorhenInstance = useMoorhenInstance();
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const [selectedMolecule, setSelectedMolecule] = useState<number>(-999);
    const [sequencesList, setSequencesList] = useState<MoorhenSequenceViewerSequence[]>([]);
    const molecule: MoorhenMolecule | null = useSelector((state: RootState) => {
        return moleculeList.length > 0
            ? (state.molecules.moleculeList.find(molecule => molecule.molNo === selectedMolecule) ?? moleculeList[0])
            : null;
    });
    const [selectedMap, setSelectedMap] = useState<number>(-999);

    const sidePanelIsOpen = useSelector((state: RootState) => state.globalUI.shownSidePanel !== null);
    const residueSelection = useSelector((state: RootState) => state.generalStates.residueSelection);
    const maps = useSelector((state: RootState) => state.maps);
    const store = useStore<RootState>();

    const [panelKeyRef, setPanelKeyRef] = useState<number>(0);


    const sequenceSelection = useMemo(() => {
        return MoorhenSelectionToSeqViewer(residueSelection);
    }, [residueSelection]);

    useEffect(() => {
        if (!molecule || molecule.molNo === null) {
            setSequencesList([]);
            return;
        }
    }, [molecule]);

    useEffect(() => {
        let skipDensity = false;
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
                } else {
                    skipDensity = true;
                }
            }

            const geoValidationData = await moorhenInstance.cootCommand.getGeoValidationData(molecule.molNo);
            addValidationDataToSeqViewerSequences(sequences, geoValidationData, 4, undefined, undefined, "Geometry");

            if (!skipDensity) {
                const MMRRCC = (await commandCentre.current.cootCommand(
                    {
                        message: "coot_command",
                        command: "mmrrcc",
                        returnType: "mmrrcc_stats",
                        commandArgs: [molecule.molNo, "A", selectedMap],
                    },
                    false
                )) as WorkerResponse<libcootApi.MMRCCStatsJS>;

                addValidationDataToSeqViewerSequences(
                    sequences,
                    cootMMRCCToSeqViewer(MMRRCC.data.result.result),
                    undefined,
                    undefined,
                    true,
                    "Density"
                );

                const newCootDensityCorrelationData = await moorhenInstance.cootCommand.getDensityCorrelationAnalysis(
                    molecule.molNo,
                    selectedMap
                );
                addValidationDataToSeqViewerSequences(
                    sequences,
                    cootValidationDataToSeqViewer(newCootDensityCorrelationData, "Density Correlation"),
                    undefined,
                    "mpl Viridis",
                    true,
                    "Density"
                );

                const qScore = await moorhenInstance.cootCommand.getQScore(molecule.molNo, selectedMap);
                addValidationDataToSeqViewerSequences(
                    sequences,
                    cootValidationDataToSeqViewer(qScore, "Q Score"),
                    undefined,
                    "mpl Viridis",
                    true,
                    "Density"
                );
            }
            setSequencesList(sequences);
        };
        updateSequences();
    }, [selectedMolecule, molecule?.sequences, selectedMap]);

    const handleClick = useCallback(
        (modelIndex: number, molName: string, chain: string, seqNum: number) => {
            if (!molecule) return;
            molecule.centreOn(`//${chain}/${seqNum}/*`);
        },
        [molecule]
    );

    const hoveredResidue = useHoveredResidue();

    const residueSelectionCallback = useCallback(
        selection => {
            if (!molecule) return;
            handleResiduesSelection(selection, molecule, dispatch);
        },
        [molecule, dispatch]
    );

    const handleHoverResidue = useCallback(
        (molName, chain, resNum, resCode, resCID) => {
            if (!molecule) return;
            dispatch(setHoveredAtom({ molecule: molecule, cid: resCID, atomInfo: null }));
        },
        [dispatch, molecule]
    );

    const configPanel = (
        <MoorhenStack inputGrid>
            <MoorhenMoleculeSelect setSelectedMolecule={setSelectedMolecule} selectedMolecule={selectedMolecule} />
            <MoorhenMapSelect setSelectedMap={setSelectedMap} maps={maps} />
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

    const seqViewerKey = useMemo(() => {
        return molecule?.molNo !== undefined ? molecule.molNo : `no-molecule`;
    }, [molecule?.molNo, selectedMolecule, moleculeList]);

    return (
        <MoorhenSequenceViewer
            key={seqViewerKey}
            sequences={sequencesList}
            selectedResidues={sequenceSelection}
            hoveredResidue={hoveredResidue}
            displayHeight={1}
            showTitleBar={false}
            onResidueClick={handleClick}
            onResiduesSelect={residueSelectionCallback}
            onHoverResidue={handleHoverResidue}
            forceRedrawScrollBarKey={panelKeyRef}
            showValidationData={true}
            nameColumnWidth={4}
            validationTracks={["Overall RMSZ", "Density Correlation", "Rama. ZScore", "Rota. ZScore"]}
        />
    );
};
