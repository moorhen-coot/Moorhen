import {
    parseCid,
    rgbToHsv,
    hsvToRgb,
    hslToHex,
    componentToHex,
    rgbToHex,
    hexToRgb,
    hexToHsl,
    hexToRGB,
    findConsecutiveRanges,
    get_grid,
    sleep,
    parseAtomInfoLabel,
    cidToSpec,
    cidToAtomInfo,
    atomInfoToResSpec,
    getTooltipShortcutLabel,
    getCone,
    getDashedCylinder,
    getRandomPastelColour,
    guid,
    sequenceIsValid,
    centreOnGemmiAtoms,
    convertViewtoPx,
} from "../../src/utils/utils";

describe("parseCid", () => {
    const defaults = {
        isRange: false,
        residueName: undefined,
        residueRange: null,
        altloc: undefined,
    };

    test("parses basic CID", () => {
        expect(parseCid("//A/123")).toEqual({
            ...defaults,
            model: "*",
            chain: "A",
            residueNumber: 123,
            atom: "",
        });
    });

    test("parses CID with residue range", () => {
        expect(parseCid("//A/10-50")).toEqual({
            ...defaults,
            model: "*",
            chain: "A",
            residueNumber: 10,
            isRange: true,
            residueRange: [10, 50],
            atom: "",
        });
    });

    test("parses CID with residue name in parentheses", () => {
        expect(parseCid("//A/123(ALA)")).toEqual({
            ...defaults,
            model: "*",
            chain: "A",
            residueNumber: 123,
            residueName: "ALA",
            atom: "",
        });
    });

    test("parses CID with atom name", () => {
        expect(parseCid("//A/123/CA")).toEqual({
            ...defaults,
            model: "*",
            chain: "A",
            residueNumber: 123,
            atom: "CA",
        });
    });

    test("parses CID with altloc", () => {
        expect(parseCid("//A/123/CB:altA")).toEqual({
            ...defaults,
            model: "*",
            chain: "A",
            residueNumber: 123,
            atom: "CB:altA",
            altloc: "altA",
        });
    });

    test("parses CID with range and parentheses", () => {
        expect(parseCid("//A/10-50(ALA)")).toEqual({
            ...defaults,
            model: "*",
            chain: "A",
            residueNumber: 10,
            isRange: true,
            residueName: "ALA",
            residueRange: [10, 50],
            atom: "",
        });
    });

    test("handles wildcard residue", () => {
        expect(parseCid("//A/*")).toEqual({
            ...defaults,
            model: "*",
            chain: "A",
            residueNumber: "*",
            atom: "",
        });
    });

    test("handles model number", () => {
        expect(parseCid("/1//123")).toEqual({
            ...defaults,
            model: "1",
            chain: "*",
            residueNumber: 123,
            atom: "",
        });
    });

    test("handles pipe-separated multi-CID (takes first)", () => {
        expect(parseCid("//A/123|//B/456")).toEqual({
            ...defaults,
            model: "*",
            chain: "A",
            residueNumber: 123,
            atom: "",
        });
    });

    test("handles empty segments", () => {
        expect(parseCid("///")).toEqual({
            ...defaults,
            model: "*",
            chain: "*",
            residueNumber: "*",
            atom: "",
        });
    });

    // New CID patterns from cidBuilder.ts

    test("handles chain-only CID", () => {
        expect(parseCid("//A/")).toEqual({
            ...defaults,
            model: "*",
            chain: "A",
            residueNumber: "*",
            atom: "",
        });
    });

    test("handles molecule-level CID", () => {
        expect(parseCid("/*/*/")).toEqual({
            ...defaults,
            model: "*",
            chain: "*",
            residueNumber: "*",
            atom: "",
        });
    });

    test("handles short chain CID without trailing slash", () => {
        expect(parseCid("//A")).toEqual({
            ...defaults,
            model: "*",
            chain: "A",
            residueNumber: "*",
            atom: "",
        });
    });

    test("handles just double-slash CID", () => {
        expect(parseCid("//")).toEqual({
            ...defaults,
            model: "*",
            chain: "*",
            residueNumber: "*",
            atom: "",
        });
    });


    test("handles negated residue name", () => {
        expect(parseCid("//A/(!HOH)")).toEqual({
            ...defaults,
            model: "*",
            chain: "A",
            residueNumber: "*",
            residueName: "!HOH",
            atom: "",
        });
    });

    test("handles full atom wildcard CID", () => {
        expect(parseCid("/*/*/*/*:*")).toEqual({
            ...defaults,
            model: "*",
            chain: "*",
            residueNumber: "*",
            atom: "*:*",
            altloc: "*",
        });
    });

    test("handles chain with negated residue and atom filters", () => {
        expect(parseCid("//A/(!HOH)/!O,C,N,H[!H]:*")).toEqual({
            ...defaults,
            model: "*",
            chain: "A",
            residueNumber: "*",
            residueName: "!HOH",
            atom: "!O,C,N,H[!H]:*",
            altloc: "*",
        });
    });

    test("handles double-pipe union CID (takes first)", () => {
        expect(parseCid("//A/(!HOH)/:*||//B/123")).toEqual({
            ...defaults,
            model: "*",
            chain: "A",
            residueNumber: "*",
            residueName: "!HOH",
            atom: ":*",
            altloc: "*",
        });
    });

    test("handles water selection CID", () => {
        expect(parseCid("/*/*/(HOH)")).toEqual({
            ...defaults,
            model: "*",
            chain: "*",
            residueNumber: "*",
            residueName: "HOH",
            atom: "",
        });
    });

    test("handles residue environment colour CID", () => {
        expect(parseCid("//*")).toEqual({
            ...defaults,
            model: "*",
            chain: "*",
            residueNumber: "*",
            atom: "",
        });
    });
});


describe("rgbToHsv", () => {
    test("converts red", () => {
        const [h, s, v] = rgbToHsv(255, 0, 0);
        expect(h).toBe(0);
        expect(s).toBe(1);
        expect(v).toBe(255);  // value/lightness is 0-255 range
    });

    test("converts green", () => {
        const [h, s, v] = rgbToHsv(0, 255, 0);
        expect(h).toBe(120);
        expect(s).toBe(1);
        expect(v).toBe(255);
    });

    test("converts blue", () => {
        const [h, s, v] = rgbToHsv(0, 0, 255);
        expect(h).toBe(240);
        expect(s).toBe(1);
        expect(v).toBe(255);
    });

    test("converts black", () => {
        const [h, s, v] = rgbToHsv(0, 0, 0);
        expect(h).toBe(0);
        expect(s).toBe(0);
        expect(v).toBe(0);
    });

    test("converts white", () => {
        const [h, s, v] = rgbToHsv(255, 255, 255);
        expect(h).toBe(0);
        expect(s).toBe(0);
        expect(v).toBe(255);
    });

    test("converts gray", () => {
        const [h, s, v] = rgbToHsv(128, 128, 128);
        expect(h).toBe(0);
        expect(s).toBe(0);
        expect(v).toBe(128);
    });
});

describe("hsvToRgb", () => {
    test("converts red", () => {
        const [r, g, b] = hsvToRgb(0, 1, 1);
        expect(r).toBe(1);
        expect(g).toBe(0);
        expect(b).toBe(0);
    });

    test("converts green", () => {
        const [r, g, b] = hsvToRgb(120, 1, 1);
        expect(r).toBe(0);
        expect(g).toBe(1);
        expect(b).toBe(0);
    });

    test("converts blue", () => {
        const [r, g, b] = hsvToRgb(240, 1, 1);
        expect(r).toBe(0);
        expect(g).toBe(0);
        expect(b).toBe(1);
    });

    test("converts black", () => {
        const [r, g, b] = hsvToRgb(0, 0, 0);
        expect(r).toBe(0);
        expect(g).toBe(0);
        expect(b).toBe(0);
    });

    test("converts white", () => {
        const [r, g, b] = hsvToRgb(0, 0, 1);
        expect(r).toBe(1);
        expect(g).toBe(1);
        expect(b).toBe(1);
    });
});

describe("hslToHex", () => {
    test("converts red", () => {
        expect(hslToHex(0, 100, 50)).toBe("#ff0000");
    });

    test("converts green", () => {
        expect(hslToHex(120, 100, 50)).toBe("#00ff00");
    });

    test("converts blue", () => {
        expect(hslToHex(240, 100, 50)).toBe("#0000ff");
    });

    test("converts white", () => {
        expect(hslToHex(0, 0, 100)).toBe("#ffffff");
    });

    test("converts black", () => {
        expect(hslToHex(0, 0, 0)).toBe("#000000");
    });
});

describe("rgbToHex", () => {
    test("converts red", () => {
        expect(rgbToHex(255, 0, 0)).toBe("#ff0000");
    });

    test("converts green", () => {
        expect(rgbToHex(0, 255, 0)).toBe("#00ff00");
    });

    test("converts blue", () => {
        expect(rgbToHex(0, 0, 255)).toBe("#0000ff");
    });

    test("converts white", () => {
        expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
    });

    test("converts black", () => {
        expect(rgbToHex(0, 0, 0)).toBe("#000000");
    });
});

describe("componentToHex", () => {
    test("converts 0", () => expect(componentToHex(0)).toBe("00"));
    test("converts 255", () => expect(componentToHex(255)).toBe("ff"));
    test("converts 128", () => expect(componentToHex(128)).toBe("80"));
    test("converts 15", () => expect(componentToHex(15)).toBe("0f"));
    test("converts 16", () => expect(componentToHex(16)).toBe("10"));
});

describe("hexToRgb", () => {
    test("converts hex to rgb string", () => {
        expect(hexToRgb("#ff0000")).toBe("rgb(255, 0, 0)");
    });
    test("handles hex without hash", () => {
        expect(hexToRgb("00ff00")).toBe("rgb(0, 255, 0)");
    });
    test("converts black", () => {
        expect(hexToRgb("#000000")).toBe("rgb(0, 0, 0)");
    });
});

describe("hexToRGB (tuple)", () => {
    test("converts hex to tuple", () => {
        expect(hexToRGB("#ff0000")).toEqual([255, 0, 0]);
    });
    test("converts green", () => {
        expect(hexToRGB("#00ff00")).toEqual([0, 255, 0]);
    });
});

describe("hexToHsl", () => {
    test("converts red", () => {
        const [h, s, l] = hexToHsl("#ff0000");
        expect(h).toBeCloseTo(0, 1);
        expect(s).toBeCloseTo(1, 1);
        expect(l).toBeCloseTo(0.5, 1);
    });

    test("converts white", () => {
        const [h, s, l] = hexToHsl("#ffffff");
        expect(l).toBe(1);
    });

    test("converts black", () => {
        const [h, s, l] = hexToHsl("#000000");
        expect(l).toBe(0);
    });
});

describe("findConsecutiveRanges", () => {
    test("finds single range", () => {
        expect(findConsecutiveRanges([1, 2, 3, 4, 5])).toEqual([[1, 5]]);
    });

    test("finds multiple ranges", () => {
        expect(findConsecutiveRanges([1, 2, 3, 10, 11, 12])).toEqual([[1, 3], [10, 12]]);
    });

    test("handles unsorted input", () => {
        expect(findConsecutiveRanges([5, 1, 3, 2, 4])).toEqual([[1, 5]]);
    });

    test("handles single element", () => {
        expect(findConsecutiveRanges([42])).toEqual([[42, 42]]);
    });

    test("handles empty array", () => {
        // Note: currently returns [[undefined, undefined]] - this is a known bug
        expect(findConsecutiveRanges([])).toEqual([]);
    });

    test("handles non-consecutive numbers", () => {
        expect(findConsecutiveRanges([1, 3, 5, 7])).toEqual([[1, 1], [3, 3], [5, 5], [7, 7]]);
    });
});

describe("get_grid", () => {
    test("returns nearsquare grid for 4 items", () => {
        expect(get_grid(4)).toEqual([2, 2]);
    });

    test("returns nearsquare grid for 6 items", () => {
        const [rows, cols] = get_grid(6);
        expect(rows * cols).toBeGreaterThanOrEqual(6);
    });

    test("returns nearsquare grid for 1 item", () => {
        expect(get_grid(1)).toEqual([1, 1]);
    });

    test("returns nearsquare grid for 9 items", () => {
        expect(get_grid(9)).toEqual([3, 3]);
    });
});

describe("sleep", () => {
    test("resolves after given time", async () => {
        const start = Date.now();
        await sleep(10);
        expect(Date.now() - start).toBeGreaterThanOrEqual(8);
    });
});

describe("parseAtomInfoLabel", () => {
    test("formats atom info correctly", () => {
        const atom = {
            mol_name: "mol1",
            chain_id: "A",
            res_no: "123",
            res_name: "ALA",
            name: "CA",
            has_altloc: false,
            alt_loc: "",
        } as any;
        expect(parseAtomInfoLabel(atom)).toBe("/mol1/A/123(ALA)/CA");
    });

    test("includes altloc when present", () => {
        const atom = {
            mol_name: "mol1",
            chain_id: "A",
            res_no: "123",
            res_name: "ALA",
            name: "CB",
            has_altloc: true,
            alt_loc: "B",
        } as any;
        expect(parseAtomInfoLabel(atom)).toBe("/mol1/A/123(ALA)/CB:B");
    });
});

describe("cidToSpec", () => {
    test("parses CID into ResidueSpec", () => {
        const spec = cidToSpec("//A/123(ALA)");
        expect(spec.mol_name).toBe("");
        expect(spec.chain_id).toBe("A");
        expect(spec.res_no).toBe(123);
        expect(spec.res_name).toBe("ALA");
        expect(spec.atom_name).toBe("");
    });

    test("parses CID with atom name", () => {
        const spec = cidToSpec("//A/123(ALA)/CA");
        expect(spec.atom_name).toBe("CA");
    });

    test("parses CID with altloc", () => {
        const spec = cidToSpec("//A/123(ALA)/CB:B");
        expect(spec.atom_name).toBe("CB");
        expect(spec.alt_conf).toBe("B");
    });
});

describe("cidToAtomInfo", () => {
    test("parses CID into AtomInfo", () => {
        const atom = cidToAtomInfo("//A/123(ALA)/CA");
        expect(atom.mol_name).toBe("");
        expect(atom.chain_id).toBe("A");
        expect(atom.res_no).toBe("123");
        expect(atom.res_name).toBe("ALA");
        expect(atom.name).toBe("CA");
    });

    test("sets has_altloc correctly", () => {
        const atom = cidToAtomInfo("//A/123(ALA)/CB:B");
        expect(atom.has_altloc).toBe(true);
        expect(atom.alt_loc).toBe("B");
    });
});

describe("atomInfoToResSpec", () => {
    test("converts AtomInfo to ResidueSpec", () => {
        const atom = {
            mol_name: "1",
            chain_id: "A",
            res_no: "123",
            res_name: "ALA",
            name: "CA",
            has_altloc: false,
            alt_loc: "",
        } as any;
        const spec = atomInfoToResSpec(atom);
        expect(spec.mol_no).toBe("1");
        expect(spec.chain_id).toBe("A");
        expect(spec.res_no).toBe(123);
        expect(spec.res_name).toBe("ALA");
        expect(spec.atom_name).toBe("CA");
    });
});

describe("getTooltipShortcutLabel", () => {
    test("formats simple shortcut", () => {
        expect(getTooltipShortcutLabel({ keyPress: "a", modifiers: [] } as any)).toBe("<A>");
    });

    test("formats shortcut with ctrl", () => {
        // modifiers already contain angle brackets, then the whole thing is wrapped
        expect(getTooltipShortcutLabel({ keyPress: "z", modifiers: ["ctrlKey"] } as any)).toBe("<<Ctrl> Z>");
    });

    test("formats shortcut with multiple modifiers", () => {
        expect(getTooltipShortcutLabel({ keyPress: "s", modifiers: ["ctrlKey", "shiftKey"] } as any)).toBe("<Shift <Ctrl> S>");
    });

    test("formats space key", () => {
        expect(getTooltipShortcutLabel({ keyPress: " ", modifiers: [] } as any)).toBe("<<Space>  >");
    });
});

describe("getRandomPastelColour", () => {
    test("returns valid hex colour", () => {
        const colour = getRandomPastelColour();
        expect(colour).toMatch(/^#[0-9a-f]{6}$/);
    });

    test("returns different colours on subsequent calls", () => {
        const c1 = getRandomPastelColour();
        const c2 = getRandomPastelColour();
        // Extremely unlikely to get the same value twice
        expect(c1).not.toBe(c2);
    });
});

describe("guid", () => {
    test("returns UUID format", () => {
        const id = guid();
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test("returns unique values", () => {
        expect(guid()).not.toBe(guid());
    });
});

describe("sequenceIsValid", () => {
    test("returns false for empty sequence", () => {
        expect(sequenceIsValid([])).toBe(false);
    });

    test("returns false for null/undefined", () => {
        expect(sequenceIsValid(null as any)).toBe(false);
        expect(sequenceIsValid(undefined as any)).toBe(false);
    });

    test("returns false for residue without resNum", () => {
        expect(sequenceIsValid([{ resCode: "A" } as any])).toBe(false);
    });

    test("returns false for residue without resCode", () => {
        expect(sequenceIsValid([{ resNum: 1 } as any])).toBe(false);
    });

    test("returns false for null resNum", () => {
        expect(sequenceIsValid([{ resNum: null, resCode: "A" } as any])).toBe(false);
    });

    test("returns true for valid sequence", () => {
        expect(sequenceIsValid([{ resNum: 1, resCode: "A" } as any])).toBe(true);
    });
});

describe("centreOnGemmiAtoms", () => {
    test("returns zero for empty array", () => {
        expect(centreOnGemmiAtoms([])).toEqual([0, 0, 0]);
    });

    test("computes centre of single atom", () => {
        expect(centreOnGemmiAtoms([{ x: 10, y: 20, z: 30 } as any])).toEqual([-10, -20, -30]);
    });

    test("computes centre of multiple atoms", () => {
        const atoms = [
            { x: 0, y: 0, z: 0 } as any,
            { x: 10, y: 10, z: 10 } as any,
        ];
        expect(centreOnGemmiAtoms(atoms)).toEqual([-5, -5, -5]);
    });
});

describe("convertViewtoPx", () => {
    test("converts 50% of 800 to 400", () => {
        expect(convertViewtoPx(50, 800)).toBe(400);
    });

    test("converts 100% of 600 to 600", () => {
        expect(convertViewtoPx(100, 600)).toBe(600);
    });

    test("converts 0% to 0", () => {
        expect(convertViewtoPx(0, 500)).toBe(0);
    });
});

describe("getCone", () => {
    test("returns positions, normals and indices", () => {
        const [pos, norm, idx] = getCone(16);
        expect(pos.length).toBeGreaterThan(0);
        expect(norm.length).toBeGreaterThan(0);
        expect(idx.length).toBeGreaterThan(0);
        expect(pos.length).toBe(norm.length);
    });
});

describe("getDashedCylinder", () => {
    test("returns positions, normals and indices", () => {
        const [pos, norm, idx] = getDashedCylinder(10, 16);
        expect(pos.length).toBeGreaterThan(0);
        expect(norm.length).toBeGreaterThan(0);
        expect(idx.length).toBeGreaterThan(0);
        expect(pos.length).toBe(norm.length);
    });
});
