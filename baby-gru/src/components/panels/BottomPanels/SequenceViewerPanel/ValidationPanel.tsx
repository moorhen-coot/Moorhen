import { useDispatch, useSelector, useStore } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import {  MoorhenInstance, useMoorhenInstance } from "@/InstanceManager";
import {
    addValidationDataToSeqViewerSequences,
    cootMMRCCToSeqViewer,
    cootValidationDataToSeqViewer,
} from "@/components/sequence-viewer/utils";
import { RootState, setValidationOption } from "@/store";
import { BaseSequenceViewerPanel } from "./BaseSequenceViewerPanel";
import { OverlayModal } from "@/components/interface-base/ModalBase/OverlayModal";
import { MoorhenSpinner } from "@/components/icons/MoorhenSpinner";
import type { SeqElement } from "@/components/sequence-viewer/MoorhenSeqViewTypes";
import { useMoleculeChanged } from "@/hooks";
import { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { libcootApi } from "@/types/libcoot";
import { WorkerResponse } from "@/InstanceManager/CommandCentre";

export type ValidationOption = {
    selectedMolecule: string
    selectedMap: string
    availableData: string[]
    shownData: string[]
    columnWidth: number
};


const updateValidationData = async (moorhenInstance: MoorhenInstance, molecule: MoorhenMolecule, map?: number, ) => {
        const skipDensity = map ? false : true;
        if (!molecule || molecule.molNo === null) {
            return;
        }
            const sequences: SeqElement[] = molecule.seqViewerData.map(seq => ({
                ...seq,
                residues: seq.residues.map(res => ({ ...res })),
            }));

            const scaleRMSZ = val => {
                return Math.min(val / 4, 1);
            };


            const geoValidationData = await moorhenInstance.cootCommand.getGeoValidationData(molecule.molNo);
            addValidationDataToSeqViewerSequences(sequences, geoValidationData, "Geometry", undefined, undefined, scaleRMSZ);
            console.log(geoValidationData);

            const BValidationData = await moorhenInstance.cootCommand.getBValidationData(molecule.molNo);
            addValidationDataToSeqViewerSequences(sequences, BValidationData, "B Factor", "mpl Viridis", undefined, (value) => { return Math.min(value / 100 , 1); });

            if (!skipDensity) {
                const MMRRCC = (await moorhenInstance.commandCentre.cootCommand(
                    {
                        message: "coot_command",
                        command: "mmrrcc",
                        returnType: "mmrrcc_stats",
                        commandArgs: [molecule.molNo, "A", map],
                    },
                    false
                )) as WorkerResponse<libcootApi.MMRCCStatsJS>;

                addValidationDataToSeqViewerSequences(
                    sequences,
                    cootMMRCCToSeqViewer(MMRRCC.data.result.result),
                    "Density",
                    undefined,
                    true,              
                );

                const newCootDensityCorrelationData = await moorhenInstance.cootCommand.getDensityCorrelationAnalysis(
                    molecule.molNo,
                    map
                );
                addValidationDataToSeqViewerSequences(
                    sequences,
                    cootValidationDataToSeqViewer(newCootDensityCorrelationData, "Density Correlation"),
                    "Density",
                    "mpl Viridis",
                    true,
                    
                );

                const qScore = await moorhenInstance.cootCommand.getQScore(molecule.molNo, map);
                addValidationDataToSeqViewerSequences(
                    sequences,
                    cootValidationDataToSeqViewer(qScore, "Q Score"),
                    "Density",
                    "mpl Viridis",
                    true,
                    
                );
            }
            molecule.seqViewerData = sequences;
            return sequences;        
        }

export const ValidationPanel = () => {
    const moorhenInstance = useMoorhenInstance();

    const validationOption = useSelector((state: RootState) => state.bottomPanels.validationOption);
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const molecule = useMemo(() => {
        return moleculeList.length > 0
            ? (moleculeList.find(molecule => molecule.uniqueId === validationOption.selectedMolecule) ?? moleculeList[0])
            : null;
    }, [moleculeList, validationOption.selectedMolecule]);

    const mapList  = useSelector((state: RootState) => state.maps);
    const mapNo = useMemo(() => {
        return mapList.find(map => map.uniqueId === validationOption.selectedMap)?.molNo ?? mapList[0]?.molNo ?? null;
    }, [mapList, validationOption.selectedMap]);



    const updateSequences = async () => {
        if (!molecule || molecule.molNo === null) {
            return;
        }
        const sequences = await updateValidationData(moorhenInstance, molecule, mapNo);
        if (sequences) {
            dispatch(setValidationOption({ ...validationOption, availableData: sequences[0]?.validationTracks?.map(track => track.name) ?? [] }));
            // setValidationState({ molUID: molecule.uniqueId, mapUID: validationOption.selectedMap, sequences });
        }
    };


    useMoleculeChanged({
        uid: molecule?.uniqueId ?? undefined,
        onChange: async () => {
            setIsLoading(true);
            await updateSequences();
            setIsLoading(false);
        }
    });


    useEffect(() => {
        const fetchData = async () => {
            if (!molecule || molecule.molNo === null) {
                return; 
            }
            setIsLoading(true);
            await updateSequences();
            setIsLoading(false);       
        };
        fetchData();
    }, [molecule, mapNo]);

    const displaySequence =  molecule?.seqViewerData ?? [];

    return (
        <div style={{ position: "relative"}}>
        <OverlayModal overlay={<><MoorhenSpinner size="4rem" colour="white"/> Loading</>} isShown={isLoading} style={{ height: "calc(100% - 54px)", transform: "translateY(52px)"}}>
        <BaseSequenceViewerPanel
            selectedMolecule={molecule?.uniqueId ?? undefined}
            sequences={displaySequence}
            displayHeight={1}
            showValidationData={true}
            nameColumnWidth={4}
            validationTracks={validationOption.shownData ?? []}
            columnWidth={validationOption.columnWidth}
        /></OverlayModal>
        </div>
    );
};
