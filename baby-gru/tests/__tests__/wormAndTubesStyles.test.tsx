/**
 * Coot's worm ("Worm") and bendy helices ("Tubes", which Coot's menu calls Bendix) in the
 * add/edit representation dialogs, and the worm's radius settings.
 */
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StyleSelector } from "../../src/components/card/MoleculeCard/addRepresentation/components/StyleSelector";
import { WormSettingsPanel } from "../../src/components/card/MoleculeCard/MoleculeRepresentationSettingsCard";
import { MoleculeRepresentation } from "../../src/utils/Representation/MoorhenMoleculeRepresentation";
import { renderWithinInstance } from "./testUtils";

describe("the Worm and Tubes styles", () => {
    test("are offered, as Worm and Bendix", async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        renderWithinInstance(<StyleSelector value="CBs" onChange={onChange} mode="add" adaptBondOOF="CRs" setAdaptBondOOF={jest.fn()} />);
        const select = screen.getByLabelText("Style") as HTMLSelectElement;
        const labels = Object.fromEntries(Array.from(select.options).map(option => [option.value, option.textContent]));
        expect(labels.Worm).toBe("Worm");
        expect(labels.Tubes).toBe("Bendix");
        await user.selectOptions(select, "Tubes");
        expect(onChange).toHaveBeenLastCalledWith("Tubes");
    });

    test("a worm is scaled by B-factor unless told otherwise", async () => {
        const user = userEvent.setup();
        const representation = new MoleculeRepresentation("Worm", "/*/*/*/*:*", null);
        expect(representation.wormOptions).toMatchObject({ radiusSource: "b-factor", bFactorScale: 0.05, uniformRadius: 1, axialSampling: 6, angularSampling: 12 });
        renderWithinInstance(<WormSettingsPanel representation={representation} />);
        expect(screen.getByText(/Axial sampling \(steps per residue\): 6/)).toBeInTheDocument();
        expect(screen.getByText(/Angular sampling \(sides\): 12/)).toBeInTheDocument();

        const source = screen.getByLabelText("Worm radius") as HTMLSelectElement;
        expect(source.value).toBe("b-factor");
        expect(Array.from(source.options).map(option => option.value)).toEqual(["b-factor", "uniform"]);

        await user.selectOptions(source, "uniform");
        expect(representation.wormOptions.radiusSource).toBe("uniform");
    });

    test("a worm uses the general worm options until given its own", () => {
        const representation = new MoleculeRepresentation("Worm", "/*/*/*/*:*", null);
        expect(representation.useDefaultWormOptions).toBe(true);
        representation.wormOptions.angularSampling = 20;
        expect(representation.drawnWormOptions.angularSampling).toBe(12);
        representation.setWormOptions({ angularSampling: 20 });
        expect(representation.useDefaultWormOptions).toBe(false);
        expect(representation.drawnWormOptions.angularSampling).toBe(20);
        representation.setWormOptions(null);
        expect(representation.drawnWormOptions.angularSampling).toBe(12);
    });

    test("radii given through the API can be kept", () => {
        const representation = new MoleculeRepresentation("Worm", "/*/*/*/*:*", null);
        representation.setWormOptions({ radiusSource: "custom", residueRadii: [{ chainId: "A", resNo: 1, radius: 2 }] });
        expect(representation.wormOptions.bFactorScale).toBe(0.05);
        renderWithinInstance(<WormSettingsPanel representation={representation} />);
        const source = screen.getByLabelText("Worm radius") as HTMLSelectElement;
        expect(source.value).toBe("custom");
    });
});
