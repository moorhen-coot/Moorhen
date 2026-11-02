import "@testing-library/jest-dom";
import { fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MoorhenProvider } from "@/components/MoorhenProvider";
import { MoorhenChainCheckList } from "../../../src/components/inputs/CheckList/MoorhenChainCheckList";
import { MoorhenCheckList } from "../../../src/components/inputs/CheckList/MoorhenCheckList";
import { MoorhenMoleculeCheckList } from "../../../src/components/inputs/CheckList/MoorhenMoleculeCheckList";
import { renderWithinInstance } from "../testUtils";

const options = (...values: string[]) => values.map(value => ({ value, label: `Item ${value}` }));
const checkbox = (label: string) => screen.getByRole("checkbox", { name: label }) as HTMLInputElement;
const checkedLabels = () => (screen.getAllByRole("checkbox") as HTMLInputElement[]).filter(box => box.checked).map(box => box.labels?.[0]?.textContent);

/** Renders `ui` and returns a function rendering a new version of it in the same Moorhen provider. */
const renderUpdatable = (ui: ReactNode) => {
    const result = renderWithinInstance(ui);
    return (next: ReactNode) => result.rerender(<MoorhenProvider>{next}</MoorhenProvider>);
};

describe("MoorhenCheckList", () => {
    test("ticks everything at first, without reporting a user change", () => {
        const setSelected = jest.fn();
        const onChange = jest.fn();
        renderWithinInstance(<MoorhenCheckList options={options("a", "b", "c")} setSelected={setSelected} onChange={onChange} />);
        expect(checkedLabels()).toEqual(["Item a", "Item b", "Item c"]);
        expect(setSelected).toHaveBeenLastCalledWith(["a", "b", "c"]);
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByText("3 / 3")).toBeInTheDocument();
    });

    test("unticking, Uncheck all and Check all are user changes, kept in option order", () => {
        const onChange = jest.fn();
        renderWithinInstance(<MoorhenCheckList options={options("a", "b", "c")} onChange={onChange} />);
        expect(screen.getByRole("button", { name: "Check all" })).toBeDisabled();

        fireEvent.click(checkbox("Item b"));
        expect(onChange).toHaveBeenLastCalledWith(["a", "c"]);
        fireEvent.click(checkbox("Item b"));
        expect(onChange).toHaveBeenLastCalledWith(["a", "b", "c"]);

        fireEvent.click(screen.getByRole("button", { name: "Uncheck all" }));
        expect(onChange).toHaveBeenLastCalledWith([]);
        expect(checkedLabels()).toEqual([]);
        expect(screen.getByRole("button", { name: "Uncheck all" })).toBeDisabled();

        fireEvent.click(screen.getByRole("button", { name: "Check all" }));
        expect(onChange).toHaveBeenLastCalledWith(["a", "b", "c"]);
        expect(onChange).toHaveBeenCalledTimes(4);
    });

    test("new options are ticked while everything is ticked", () => {
        const setSelected = jest.fn();
        const update = renderUpdatable(<MoorhenCheckList options={options("a", "b")} setSelected={setSelected} />);
        update(<MoorhenCheckList options={options("a", "b", "c")} setSelected={setSelected} />);
        expect(checkedLabels()).toEqual(["Item a", "Item b", "Item c"]);
        expect(setSelected).toHaveBeenLastCalledWith(["a", "b", "c"]);
    });

    test("new options stay unticked once the user narrowed the selection, and removed ones are dropped", () => {
        const setSelected = jest.fn();
        const update = renderUpdatable(<MoorhenCheckList options={options("a", "b", "c")} setSelected={setSelected} />);
        fireEvent.click(checkbox("Item a"));
        update(<MoorhenCheckList options={options("b", "c", "d")} setSelected={setSelected} />);
        expect(checkedLabels()).toEqual(["Item b", "Item c"]);
        expect(setSelected).toHaveBeenLastCalledWith(["b", "c"]);
    });

    test("a new resetKey ticks everything again", () => {
        const update = renderUpdatable(<MoorhenCheckList options={options("a", "b")} resetKey="first" />);
        fireEvent.click(screen.getByRole("button", { name: "Uncheck all" }));
        expect(checkedLabels()).toEqual([]);
        update(<MoorhenCheckList options={options("a", "b")} resetKey="second" />);
        expect(checkedLabels()).toEqual(["Item a", "Item b"]);
    });

    test("a selection given by the caller is kept", () => {
        renderWithinInstance(<MoorhenCheckList options={options("a", "b")} selected={["b"]} />);
        expect(checkedLabels()).toEqual(["Item b"]);
    });

    test("shows the empty text, with both buttons disabled", () => {
        renderWithinInstance(<MoorhenCheckList options={[]} emptyText="Nothing here" />);
        expect(screen.getByText("Nothing here")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Check all" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Uncheck all" })).toBeDisabled();
    });
});

const residues = (n: number) => Array.from({ length: n }, () => ({}));
const molecules = [
    {
        molNo: 0,
        name: "3u7t",
        uniqueId: "uid-0",
        sequences: [
            { chain: "A", type: 1, sequence: residues(120) },
            { chain: "B", type: 1, sequence: residues(98) },
            { chain: "R", type: 4, sequence: residues(12) },
        ],
    },
    { molNo: 1, name: "4hhb", uniqueId: "uid-1", sequences: [{ chain: "C", type: 1, sequence: residues(141) }] },
] as never[];

describe("MoorhenChainCheckList", () => {
    test("lists the chains of the molecule given by unique id, all ticked", () => {
        const setSelected = jest.fn();
        renderWithinInstance(<MoorhenChainCheckList molecules={molecules} moleculeUniqueId="uid-0" setSelected={setSelected} />);
        expect(checkedLabels()).toEqual(["A (120 residues)", "B (98 residues)", "R (12 residues)"]);
        expect(setSelected).toHaveBeenLastCalledWith(["A", "B", "R"]);
    });

    test("lists only the allowed polymer types", () => {
        renderWithinInstance(<MoorhenChainCheckList molecules={molecules} moleculeUniqueId="uid-0" allowedTypes={[4]} />);
        expect(checkedLabels()).toEqual(["R (12 residues)"]);
    });

    test("ticks all chains of a newly chosen molecule", () => {
        const setSelected = jest.fn();
        const update = renderUpdatable(<MoorhenChainCheckList molecules={molecules} moleculeUniqueId="uid-0" setSelected={setSelected} />);
        fireEvent.click(screen.getByRole("button", { name: "Uncheck all" }));
        update(<MoorhenChainCheckList molecules={molecules} moleculeUniqueId="uid-1" setSelected={setSelected} />);
        expect(checkedLabels()).toEqual(["C (141 residues)"]);
        expect(setSelected).toHaveBeenLastCalledWith(["C"]);
    });

    test("says so when the molecule is not loaded", () => {
        renderWithinInstance(<MoorhenChainCheckList molecules={molecules} moleculeUniqueId="gone" />);
        expect(screen.getByText("No chain")).toBeInTheDocument();
    });
});

describe("MoorhenMoleculeCheckList", () => {
    test("lists the molecules by unique id, all ticked, and applies the filter", () => {
        const setSelected = jest.fn();
        const onlyFirst = (molecule: { molNo: number }) => molecule.molNo === 0;
        const update = renderUpdatable(<MoorhenMoleculeCheckList molecules={molecules} setSelected={setSelected} />);
        expect(checkedLabels()).toEqual(["0: 3u7t", "1: 4hhb"]);
        expect(setSelected).toHaveBeenLastCalledWith(["uid-0", "uid-1"]);

        update(<MoorhenMoleculeCheckList molecules={molecules} setSelected={setSelected} filter={onlyFirst as never} />);
        expect(checkedLabels()).toEqual(["0: 3u7t"]);
        expect(setSelected).toHaveBeenLastCalledWith(["uid-0"]);
    });
});
