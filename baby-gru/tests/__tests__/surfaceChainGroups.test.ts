import { surfaceChainGroups } from "../../src/utils/surfaceChainGroups";

const atom = (chain_id: string, res_name: string, x: number, y = 0, z = 0) => ({ chain_id, res_name, x, y, z });

describe("surfaceChainGroups", () => {
    test("a glycan or ligand chain goes with the polymer chain it touches", () => {
        const atoms = [
            atom("A", "ASN", 0), atom("A", "ALA", 1.5),
            atom("B", "DG", 30), atom("B", "DC", 31.5),
            atom("E", "NAG", 3), atom("E", "BMA", 4.5),   // on A
            atom("F", "LIG", 33),                          // on B
        ];
        expect(surfaceChainGroups(atoms)).toEqual(["A", "A", "B", "B", "A", "A", "B"]);
    });
    test("a chain touching no polymer keeps its own group", () => {
        expect(surfaceChainGroups([atom("A", "GLY", 0), atom("Z", "NAG", 50)])).toEqual(["A", "Z"]);
    });
    test("with no polymer at all, every chain is its own", () => {
        expect(surfaceChainGroups([atom("E", "NAG", 0), atom("F", "NAG", 1)])).toEqual(["E", "F"]);
    });
});
