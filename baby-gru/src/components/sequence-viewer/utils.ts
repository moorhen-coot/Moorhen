import { useSelector } from "react-redux";
import { useMemo } from "react";
import { RootState } from "../../store/MoorhenReduxStore";
import { type ResidueSelection, setResidueSelection } from "../../store/generalStatesSlice";
import type { MoorhenMolecule, Sequence } from "../../utils/MoorhenMolecule";
import { cidToSpec, sequenceIsValid } from "../../utils/utils";
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

export function addValidationDataToSeqViewerSequences(
    sequences: SeqElement[],
    validationData: { chain: string; label: string; data: { resNum: number; score: number | [number, number] }[] }[]
): SeqElement[] {
    for (const dataSet of validationData) {
        for (const sequence of sequences) {
            if (dataSet.chain === sequence.chain) {
                for (const residue of sequence.residues) {
                    const resValidation = dataSet.data.find(v => v.resNum === residue.resNum);
                    if (resValidation) {
                        if (!residue.validationData) {
                            residue.validationData = {};
                        }
                        residue.validationData[dataSet.label] = resValidation.score;
                    }
                }
            }
        }
    }
    return sequences;
}

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

export const handleResiduesSelection = (selection: ResiduesSelection, molecule: MoorhenMolecule, dispatch: any, enqueueSnackbar: any) => {
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
