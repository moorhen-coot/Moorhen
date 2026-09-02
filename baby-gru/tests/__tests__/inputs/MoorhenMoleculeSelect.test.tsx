import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { MoorhenMoleculeSelect } from "../../../src/components/inputs/Selector/MoleculeSelector";
import { renderWithinInstance } from "../testUtils";

describe("MoorhenMoleculeSelect", () => {
    test('renders "No molecules loaded" when molecule list is empty', () => {
        renderWithinInstance(<MoorhenMoleculeSelect molecules={[]} />);
        expect(screen.getByText("No molecules loaded")).toBeInTheDocument();
    });

    test("renders molecule options", () => {
        const mockMolecules = [
            { molNo: 0, name: "3u7t", sequences: [] },
            { molNo: 1, name: "4hhb", sequences: [] },
        ];
        renderWithinInstance(<MoorhenMoleculeSelect molecules={mockMolecules as any} />);
        expect(screen.getByText("0: 3u7t")).toBeInTheDocument();
        expect(screen.getByText("1: 4hhb")).toBeInTheDocument();
    });

    test('shows "Any molecule" option when allowAny is true', () => {
        const mockMolecules = [{ molNo: 0, name: "3u7t", sequences: [] }];
        renderWithinInstance(<MoorhenMoleculeSelect molecules={mockMolecules as any} allowAny={true} />);
        expect(screen.getByText("Any molecule")).toBeInTheDocument();
    });

    test("disables select when empty", () => {
        renderWithinInstance(<MoorhenMoleculeSelect molecules={[]} />);
        const select = screen.getByRole("combobox");
        expect(select).toBeDisabled();
    });

    test("applies filter function", () => {
        const mockMolecules = [
            { molNo: 0, name: "3u7t", sequences: [] },
            { molNo: 1, name: "4hhb", sequences: [] },
        ];
        renderWithinInstance(<MoorhenMoleculeSelect molecules={mockMolecules as any} filterFunction={mol => mol.molNo === 0} />);
        expect(screen.getByText("0: 3u7t")).toBeInTheDocument();
        expect(screen.queryByText("1: 4hhb")).not.toBeInTheDocument();
    });

    test("renders with custom label", () => {
        const mockMolecules = [{ molNo: 0, name: "3u7t", sequences: [] }];
        renderWithinInstance(<MoorhenMoleculeSelect molecules={mockMolecules as any} label="Pick Molecule" />);
        expect(screen.getByText("Pick Molecule")).toBeInTheDocument();
    });
});
