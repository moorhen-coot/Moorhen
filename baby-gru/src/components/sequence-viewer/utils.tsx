import { moorhen } from "../../types/moorhen";
import type { SeqElement } from "./MoorhenSeqViewTypes";

export function stringToSeqViewer(
    seqAsString: string,
    start?: number,
    name?: string,
    molName?: string,
    molNo?: number,
    chain?: string
): SeqElement {
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
}

export function moorhenSequenceToSeqViewer(
    sequence: moorhen.Sequence,
    molName: string,
    molNo: number
): SeqElement | null {
    if (sequence !== null && sequence.sequence.length > 0) {
        return {
            molName: molName,
            chain: sequence.chain,
            molNo: molNo,
            residues: sequence.sequence.map((residue) => ({
                resNum: residue.resNum,
                resCode: residue.resCode,
                resCID: residue.cid,
            })),
        };
    }
    return null;
}
