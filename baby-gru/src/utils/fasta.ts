export type FastaSequence = {
    name: string;
    seq: string;
};

/**
 * Parse FASTA text into its sequences.
 *
 * Header lines start with ">" (or ";", as biojs-io-fasta accepted); every other line is appended
 * to the current sequence. Lines before the first header are ignored, and so is whitespace,
 * including the "\r" left by Windows line endings.
 */
export const parseFasta = (text: string): FastaSequence[] => {
    const seqs: FastaSequence[] = [];
    if (!text) {
        return seqs;
    }
    for (const line of text.split(/\r?\n/)) {
        if (line[0] === ">" || line[0] === ";") {
            seqs.push({ name: line.slice(1).trim(), seq: "" });
        } else if (seqs.length > 0) {
            seqs[seqs.length - 1].seq += line.replace(/\s/g, "");
        }
    }
    return seqs;
};
