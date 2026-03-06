import { useSelector } from "react-redux";
import { Dispatch, UnknownAction } from "redux";
import { useMemo } from "react";
import { ResidueValidationData, ValidationData } from "@/InstanceManager/CommandCentre/CootCommandWrapper";
import { libcootApi } from "@/types/libcoot";
import { RootState } from "../../store/MoorhenReduxStore";
import { type ResidueSelection, setResidueSelection } from "../../store/generalStatesSlice";
import type { MoorhenMolecule, Sequence } from "../../utils/MoorhenMolecule";
import { cidToSpec, sequenceIsValid } from "../../utils/utils";
import { GradientPreset } from "../inputs/MoorhenGradientPicker/gradientPresets";
import type { ResiduesSelection, SeqElement } from "./MoorhenSeqViewTypes";

export const stringToSeqViewer = (
    seqAsString: string,
    start?: number,
    name?: string,
    molName?: string,
    molNo?: number,
    chain?: string
): SeqElement => {
    const sequence: SeqElement = {
        molName: molName ? molName : "",
        chain: chain ? chain : "",
        molNo: molNo ? molNo : 0,
        displayName: name ? name : "",
        residues: [],
    };
    let resNum = start ? start : 1;
    for (const res of seqAsString) {
        sequence.residues.push({
            resNum: resNum++,
            resCode: res,
            resCID: "/" + sequence.molNo + "/" + sequence.chain + "/" + resNum,
        });
    }
    return sequence;
};

export function moorhenSequenceToSeqViewer(sequence: Sequence, molName: string, molNo: number): SeqElement | null {
    if (sequence !== null && sequence.sequence.length > 0) {
        return {
            molName: molName,
            chain: sequence.chain,
            molNo: molNo,
            residues: sequence.sequence.map(residue => ({
                resNum: residue.resNum,
                resCode: residue.resCode,
                resCID: residue.cid,
            })),
        } as SeqElement;
    }
    return null;
}

export function MoleculeToSeqViewerSequences(molecule: MoorhenMolecule | null, getColors: boolean = true): SeqElement[] {
    if (!molecule) return [];
    const newSequenceList = molecule.sequences.map(sequence => {
        if (!sequenceIsValid(sequence.sequence)) {
            return null;
        }
        const newSeq = moorhenSequenceToSeqViewer(sequence, molecule.name, molecule.molNo);
        newSeq.residues = newSeq.residues.map(res => ({
            ...res,
            colour: null,
        }));
        if (!getColors) {
            return newSeq;
        }
        const seqColour = molecule.representations[0].colourRules.find(rule => rule.cid === "//" + newSeq.chain)?.color;
        newSeq.colour = seqColour ? `color-mix(in srgb, ${seqColour}, rgb(255,255,255) 50%)` : null;
        return newSeq;
    });
    return newSequenceList;
}

// export function addValidationDataToSeqViewerSequences(
//     sequences: SeqElement[],
//     validationData: { chain: string; label: string; data: { resNum: number; score: number | [number, number] }[] }[]
// ): SeqElement[] {
//     for (const dataSet of validationData) {
//         for (const sequence of sequences) {
//             if (dataSet.chain === sequence.chain) {
//                 for (const residue of sequence.residues) {
//                     const resValidation = dataSet.data.find(v => v.resNum === residue.resNum);
//                     if (resValidation) {
//                         if (!residue.validationData) {
//                             residue.validationData = {};
//                         }
//                         residue.validationData[dataSet.label] = resValidation.score;
//                     }
//                 }
//             }
//         }
//     }
//     return sequences;
// }

export const cootValidationDataToSeqViewer = (cootData, valueName: string): ValidationData => {
    const validationData: ValidationData = {};
    const chainIDs: string[] = Array.from(new Set(cootData.map(item => item.chainId)));

    for (const chainId of chainIDs) {
        const residues: ResidueValidationData[] = cootData
            .filter(item => item.chainId === chainId)
            .map(item => ({ seqNum: item.seqNum, insCode: " ", resName: item.restype, [valueName]: item.value }));
        validationData[chainId] = residues;
    }
    return validationData;
};

export const cootMMRCCToSeqViewer = (cootData: libcootApi.MMRCCStatsJS): ValidationData => {
    const chainID = cootData["All atoms"][0].chainId;
    const validationData: ValidationData = {};
    const residues: ResidueValidationData[] = cootData["All atoms"].map(item => ({
        seqNum: item.resNum,
        "MMRRCC All Atoms": item.correlation,
        "MMRRCC Side Chain": cootData["Side-chains"].find(i => i.resNum === item.resNum)?.correlation ?? null,
    }));
    validationData[chainID] = residues;
    return validationData;
};

export const addValidationDataToSeqViewerSequences = (
    sequences: SeqElement[],
    validationData: ValidationData,
    rmszScale: number = 5,
    gradientPresets?: GradientPreset,
    reverseGradient?: boolean,
    category?: string
): SeqElement[] => {
    const scaleRMSZ = val => {
        return Math.min(val / rmszScale, 1);
    };

    const newSequences = [...sequences];
    for (const sequence of newSequences) {
        const chainValidationData = validationData[sequence.chain];
        if (!chainValidationData) {
            continue;
        }
        for (const residue of sequence.residues) {
            const resValidation = chainValidationData.find(v => v.seqNum === residue.resNum);
            if (resValidation) {
                if (!residue.validationData) {
                    residue.validationData = {};
                }
                for (const [key, value] of Object.entries(resValidation)) {
                    if (key !== "seqNum" && key !== "insCode" && key !== "resName") {
                        if (typeof value === "number") {
                            if (!residue.validationData[key]) {
                                residue.validationData[key] = { value: null };
                            }
                            if (key.includes("RMSZ")) {
                                residue.validationData[key] = {
                                    value: [scaleRMSZ(value), value],
                                    gradientPreset: gradientPresets ? gradientPresets[key] : null,
                                    reverseGradient: reverseGradient ?? false,
                                    category: category,
                                };
                            } else {
                                residue.validationData[key] = {
                                    value: value,
                                    gradientPreset: gradientPresets ? gradientPresets[key] : null,
                                    reverseGradient: reverseGradient ?? false,
                                    category: category,
                                };
                            }
                        }
                    }
                }
            }
        }
    }
    return newSequences;
};

export const MoorhenSelectionToSeqViewer = (residueSelection: ResidueSelection): ResiduesSelection | null => {
    const selection: ResiduesSelection | null = residueSelection.molecule
        ? {
              molNo: residueSelection.molecule.molNo,
              chain: residueSelection.first.split("/")[2],
              range: [
                  parseInt(residueSelection.first.split("/")[3]),
                  residueSelection.second
                      ? parseInt(residueSelection.second.split("/")[3])
                      : parseInt(residueSelection.first.split("/")[3]),
              ],
          }
        : null;
    return selection;
};

export const handleResiduesSelection = (
    selection: ResiduesSelection,
    molecule: MoorhenMolecule,
    dispatch: Dispatch<UnknownAction>,
    enqueueSnackbar: any
) => {
    if (selection.molNo !== molecule.molNo) return;
    const first = Math.min(selection.range[0], selection.range[1]);
    const second = Math.max(selection.range[0], selection.range[1]);
    const newSelection: ResidueSelection = {
        molecule: molecule,
        first: "/1/" + selection.chain + "/" + first + "/CA",
        second: "/1/" + selection.chain + "/" + second + "/CA",
        cid: "/*/" + selection.chain + "/" + first + "-" + second + "/*",
        isMultiCid: false,
        label: "/*/" + selection.chain + "/" + first + "-" + second + "/*",
    };
    dispatch(setResidueSelection(newSelection));
    molecule.drawResidueSelection(newSelection.cid as string);
    enqueueSnackbar("residue-selection", { variant: "residueSelection", persist: true });
};

export const useHoveredResidue = (): {
    molNo: number;
    chain: string;
    resNum: number;
} | null => {
    const hoveredAtom = useSelector((state: RootState) => state.hoveringStates.hoveredAtom);
    const hoveredResidue = useMemo(() => {
        if (hoveredAtom && hoveredAtom.cid) {
            const resInfo = cidToSpec(hoveredAtom.cid);
            return { molNo: hoveredAtom.molecule.molNo, chain: resInfo.chain_id, resNum: resInfo.res_no };
        } else {
            return null;
        }
    }, [hoveredAtom]);
    return hoveredResidue;
};
