import { parseFasta } from "../../src/utils/fasta";

describe("parseFasta", () => {
    test("joins wrapped sequence lines", () => {
        const seqs = parseFasta(">sp|P69905|HBA_HUMAN Hemoglobin\nMVLSPADKTNVKAAWGKV\nGAHAGEYGAEALERMFLSF\n");
        expect(seqs).toEqual([{ name: "sp|P69905|HBA_HUMAN Hemoglobin", seq: "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSF" }]);
    });

    test("splits multiple records", () => {
        expect(parseFasta(">A\nACDE\nFGH\n>B\nKLMN\n").map(s => s.seq)).toEqual(["ACDEFGH", "KLMN"]);
    });

    test("strips Windows line endings from the sequence", () => {
        expect(parseFasta(">A\r\nACDE\r\nFGH\r\n")[0].seq).toBe("ACDEFGH");
    });

    test("accepts ';' headers and ignores blank lines", () => {
        expect(parseFasta(";old style\nPEP\n\nTIDE\n\n")[0].seq).toBe("PEPTIDE");
    });

    test("returns no sequences for empty input or text without a header", () => {
        expect(parseFasta("")).toEqual([]);
        expect(parseFasta("ACDE\n")).toEqual([]);
    });
});
