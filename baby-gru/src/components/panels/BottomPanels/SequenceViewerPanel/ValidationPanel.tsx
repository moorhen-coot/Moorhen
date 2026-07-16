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
import { useMoleculeChanged } from "@/hooks/usMolleculeChange";
import { OverlayModal } from "@/components/interface-base/ModalBase/OverlayModal";

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
    const [triggerUpdate, setTriggerUpdate] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    
    const molecule = useMemo(() => {
        return moleculeList.length > 0
            ? (moleculeList.find(molecule => molecule.uniqueId === validationOption.selectedMolecule) ?? moleculeList[0])
            : null;
    }, [moleculeList, validationOption.selectedMolecule]);

    const moleculeChange = useMoleculeChanged();

    const map = useMemo(() => {
        return mapList.length > 0
            ? (mapList.find(map => map.uniqueId === validationOption.selectedMap) ?? null)
            : null;
    }, [mapList, validationOption.selectedMap]);

    const sequencesList = useMemo(() => {
        return molecule?.seqViewerData ? [...molecule.seqViewerData] : []; // Return a copy of the seqViewerData array to avoid mutating the original data
    }, [molecule?.seqViewerData, triggerUpdate, moleculeChange]);

    // useEffect(() => {
    //     if (!molecule || molecule.molNo === null) {
    //         setSequencesList([]);
    //         return;
    //     }
    //     else {
    //         setSequencesList(molecule.seqViewerData);
    //     }
    // }, [molecule]);

    useEffect(() => {
        let skipDensity = false;
        if (!molecule || molecule.molNo === null) {
            return;
        }
        const updateSequences = async () => {
            setIsLoading(true);
            const sequences = molecule.seqViewerData;

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
            addValidationDataToSeqViewerSequences(sequences, geoValidationData, "Geometry", 4, undefined, undefined);

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
                    "Density",
                    undefined,
                    undefined,
                    true,              
                );

                const newCootDensityCorrelationData = await moorhenInstance.cootCommand.getDensityCorrelationAnalysis(
                    molecule.molNo,
                    map.molNo
                );
                addValidationDataToSeqViewerSequences(
                    sequences,
                    cootValidationDataToSeqViewer(newCootDensityCorrelationData, "Density Correlation"),
                    "Density",
                    undefined,
                    "mpl Viridis",
                    true,
                    
                );

                const qScore = await moorhenInstance.cootCommand.getQScore(molecule.molNo, map.molNo);
                addValidationDataToSeqViewerSequences(
                    sequences,
                    cootValidationDataToSeqViewer(qScore, "Q Score"),
                    "Density",
                    undefined,
                    "mpl Viridis",
                    true,
                    
                );
            }
            // setValidationOption({ ...validationOption, availableData: sequences[0].validationTracks.map(track => track.name) });
            setTriggerUpdate(current => current + 1);
            setIsLoading(false);

        };
        updateSequences();
    }, [molecule?.sequences, map?.molNo, validationOption.selectedMap, moorhenInstance, commandCentre, dispatch, validationOption.selectedMolecule]);

    return (
        <div style={{ position: "relative"}}>
        <OverlayModal overlay="Loading" isShown={isLoading} style={{ height: "calc(100% - 54px)", transform: "translateY(54px)"}}>
        <BaseSequenceViewerPanel
            selectedMolecule={validationOption.selectedMolecule}
            sequences={sequencesList}
            displayHeight={1}
            showValidationData={true}
            nameColumnWidth={4}
            validationTracks={validationOption.shownData ?? []}
        /></OverlayModal>
        </div>
    );
};
