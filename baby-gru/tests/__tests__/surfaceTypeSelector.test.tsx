/**
 * The three MoleculesToTriangles surfaces (MolecularSurface, VdWSurface, AccessibleSurface) are
 * separate representation styles, offered in the add/edit representation dialogs as one style,
 * "Mol Surface", with a "Surface type" select under it.
 */
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StyleSelector } from "../../src/components/card/MoleculeCard/addRepresentation/components/StyleSelector";
import { moorhen } from "../../src/types/moorhen";
import { renderWithinInstance } from "./testUtils";

const renderSelector = (value: moorhen.RepresentationStyles, onChange = jest.fn()) => {
    renderWithinInstance(<StyleSelector value={value} onChange={onChange} mode="add" adaptBondOOF="CRs" setAdaptBondOOF={jest.fn()} />);
    return onChange;
};

const styleSelect = () => screen.getByLabelText("Style") as HTMLSelectElement;
const surfaceTypeSelect = () => screen.queryByLabelText("Surface type") as HTMLSelectElement | null;

describe("the surface type in the representation dialogs", () => {
    test("is not offered for a style that is not a surface", () => {
        renderSelector("CBs");
        expect(surfaceTypeSelect()).toBeNull();
    });

    test.each([
        ["MolecularSurface", "Molecular"],
        ["VdWSurface", "Van der Waals"],
        ["AccessibleSurface", "Solvent accessible"],
    ] as [moorhen.RepresentationStyles, string][])("shows %s as Mol Surface of type %s", (style, label) => {
        renderSelector(style);
        expect(styleSelect().value).toBe("MolecularSurface");
        expect(surfaceTypeSelect().value).toBe(style);
        expect(surfaceTypeSelect().selectedOptions[0].textContent).toBe(label);
    });

    test("choosing a surface type chooses that surface's style", async () => {
        const user = userEvent.setup();
        const onChange = renderSelector("MolecularSurface");
        await user.selectOptions(surfaceTypeSelect(), "AccessibleSurface");
        expect(onChange).toHaveBeenLastCalledWith("AccessibleSurface");
        await user.selectOptions(surfaceTypeSelect(), "VdWSurface");
        expect(onChange).toHaveBeenLastCalledWith("VdWSurface");
    });

    test("Mol Surface is still one style among the others", async () => {
        const user = userEvent.setup();
        const onChange = renderSelector("CBs");
        expect(Array.from(styleSelect().options).filter(option => option.textContent === "Mol Surface")).toHaveLength(1);
        expect(Array.from(styleSelect().options).map(option => option.value)).not.toContain("VdWSurface");
        await user.selectOptions(styleSelect(), "MolecularSurface");
        expect(onChange).toHaveBeenLastCalledWith("MolecularSurface");
    });
});
