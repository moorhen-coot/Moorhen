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
        expect(representation.wormOptions).toMatchObject({ radiusSource: "b-factor", bFactorScale: 0.05, uniformRadius: 1 });
        renderWithinInstance(<WormSettingsPanel representation={representation} />);

        const source = screen.getByLabelText("Worm radius") as HTMLSelectElement;
        expect(source.value).toBe("b-factor");
        expect(Array.from(source.options).map(option => option.value)).toEqual(["b-factor", "uniform"]);

        await user.selectOptions(source, "uniform");
        expect(representation.wormOptions.radiusSource).toBe("uniform");
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
