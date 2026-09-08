import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { MoorhenMapSelect } from "../../../src/components/inputs/Selector/MoorhenMapSelect";
import { renderWithinInstance } from "../testUtils";

describe("MoorhenMapSelect", () => {
    test('renders "No maps available" when map list is empty', () => {
        renderWithinInstance(<MoorhenMapSelect maps={[]} />);
        expect(screen.getByText("No maps available")).toBeInTheDocument();
    });

    test("renders map options", () => {
        const mockMaps = [
            { molNo: 0, name: "2FoFc" },
            { molNo: 1, name: "FoFc" },
        ];
        renderWithinInstance(<MoorhenMapSelect maps={mockMaps as any} />);
        expect(screen.getByText("0: 2FoFc")).toBeInTheDocument();
        expect(screen.getByText("1: FoFc")).toBeInTheDocument();
    });

    test("applies filter function", () => {
        const mockMaps = [
            { molNo: 0, name: "2FoFc", hasReflectionData: true },
            { molNo: 1, name: "FoFc", hasReflectionData: false },
        ];
        renderWithinInstance(<MoorhenMapSelect maps={mockMaps as any} filterFunction={(map: any) => !map.hasReflectionData} />);
        expect(screen.queryByText("0: 2FoFc")).not.toBeInTheDocument();
        expect(screen.getByText("1: FoFc")).toBeInTheDocument();
    });

    test("renders with custom label", () => {
        const mockMaps = [{ molNo: 0, name: "2FoFc" }];
        renderWithinInstance(<MoorhenMapSelect maps={mockMaps as any} label="Select Map" />);
        expect(screen.getByText("Select Map")).toBeInTheDocument();
    });

    test("disables select when map list is empty", () => {
        renderWithinInstance(<MoorhenMapSelect maps={[]} />);
        const select = screen.getByRole("combobox");
        expect(select).toBeDisabled();
    });
});
