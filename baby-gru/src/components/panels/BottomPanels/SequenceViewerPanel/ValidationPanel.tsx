import { useDispatch, useSelector, useStore } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import { useCommandCentre, useMoorhenInstance } from "@/InstanceManager";
import { WorkerResponse } from "@/InstanceManager/CommandCentre/MoorhenCommandCentre";
import { MoorhenSequenceViewerSequence } from "@/components/sequence-viewer";
import {
    MoleculeToSeqViewerSequences,
    addValidationDataToSeqViewerSequences,
    cootMMRCCToSeqViewer,
    cootValidationDataToSeqViewer,
} from "@/components/sequence-viewer/utils";
import { RootState, setValidationOption } from "@/store";
import { libcootApi } from "@/types/libcoot";
import { BaseSequenceViewerPanel } from "./BaseSequenceViewerPanel";

export type ValidationOption = {
    selectedMolecule: string
    selectedMap: string
    availableData: string[]
    shownData: string[]
};

export const ValidationPanel = () => {
    const store = useStore<RootState>();
    const commandCentre = useCommandCentre();
    const moorhenInstance = useMoorhenInstance();
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const mapList = useSelector((state: RootState) => state.maps);

    const validationOption = useSelector((state: RootState) => state.bottomPanels.validationOption);
    const dispatch = useDispatch();

    const [sequencesList, setSequencesList] = useState<MoorhenSequenceViewerSequence[]>([]);

    const molecule = useMemo(() => {
        return moleculeList.length > 0
            ? (moleculeList.find(molecule => molecule.uniqueId === validationOption.selectedMolecule) ?? moleculeList[0])
            : null;
    }, [moleculeList, validationOption.selectedMolecule]);

    const map = useMemo(() => {
        return mapList.length > 0
            ? (mapList.find(map => map.uniqueId === validationOption.selectedMap) ?? null)
            : null;
    }, [mapList, validationOption.selectedMap]);

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

            if (validationOption.selectedMap === "") {
                // use active map if no map is selected
                if (store.getState().generalStates.activeMap) {
                    dispatch(setValidationOption({ ...validationOption, selectedMap: store.getState().generalStates.activeMap.uniqueId }));
                    return [];
                } else {
                    skipDensity = true;
                }
            } else if (!map || map.molNo === null) {
                skipDensity = true;
            }

            const geoValidationData = await moorhenInstance.cootCommand.getGeoValidationData(molecule.molNo);
            addValidationDataToSeqViewerSequences(sequences, geoValidationData, 4, undefined, undefined, "Geometry");

            if (!skipDensity) {
                const MMRRCC = (await commandCentre.current.cootCommand(
                    {
                        message: "coot_command",
                        command: "mmrrcc",
                        returnType: "mmrrcc_stats",
                        commandArgs: [molecule.molNo, "A", map.molNo],
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
                    map.molNo
                );
                addValidationDataToSeqViewerSequences(
                    sequences,
                    cootValidationDataToSeqViewer(newCootDensityCorrelationData, "Density Correlation"),
                    undefined,
                    "mpl Viridis",
                    true,
                    "Density"
                );

                const qScore = await moorhenInstance.cootCommand.getQScore(molecule.molNo, map.molNo);
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
    }, [molecule?.sequences, map?.molNo, validationOption.selectedMap, moorhenInstance, commandCentre, dispatch, validationOption.selectedMolecule]);

    return (
        <BaseSequenceViewerPanel
            selectedMolecule={validationOption.selectedMolecule}
            sequences={sequencesList}
            displayHeight={1}
            showValidationData={true}
            nameColumnWidth={4}
            validationTracks={validationOption.shownData}
        />
    );
};
