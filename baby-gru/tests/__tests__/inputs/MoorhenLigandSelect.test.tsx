import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MoorhenLigandSelect } from "../../../src/components/inputs/Selector/MoorhenLigandSelect";
import { MoorhenMolecule } from "../../../src/utils/MoorhenMolecule";
import { MoorhenReduxStore, renderWithinInstance } from "../testUtils";
import { MoorhenInstance } from "@/InstanceManager";
import React from "react";


const mockMoorhenInstance = new MoorhenInstance(React.createRef<HTMLDivElement>());


describe("MoorhenLigandSelect", () => {
    const makeMolecule = ligands => ({
        molNo: 0,
        name: "3u7t",
        ligands,
        sequences: [],
    });

    test("renders ligand options for a molecule", () => {
        const molecule = makeMolecule([{ cid: "/A/LYS/1" }, { cid: "/A/ALA/2" }]);
        renderWithinInstance(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={0} />);
        expect(screen.getByText("/A/LYS/1")).toBeInTheDocument();
        expect(screen.getByText("/A/ALA/2")).toBeInTheDocument();
    });

    test('shows "No Ligands" when molecule has no ligands', () => {
        const molecule = makeMolecule([]);
        renderWithinInstance(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={0} />);
        expect(screen.getByText("No Ligands")).toBeInTheDocument();
    });

    test('shows "All Ligands" option when allowAll is true', () => {
        const molecule = makeMolecule([{ cid: "/A/LYS/1" }, { cid: "/A/ALA/2" }]);
        renderWithinInstance(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={0} allowAll={true} />);
        expect(screen.getByText("All Ligands")).toBeInTheDocument();
    });

    test("calls onChange when a ligand is selected", async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        const molecule = makeMolecule([{ cid: "/A/LYS/1" }, { cid: "/A/ALA/2" }]);
        renderWithinInstance(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={0} onChange={onChange} />);
        const select = screen.getByRole("combobox");
        await user.selectOptions(select, "/A/ALA/2");
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test("calls setValue when a ligand is selected", async () => {
        const user = userEvent.setup();
        const setValue = jest.fn();
        const molecule = makeMolecule([{ cid: "/A/LYS/1" }, { cid: "/A/ALA/2" }]);
        renderWithinInstance(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={0} setValue={setValue} />);
        const select = screen.getByRole("combobox");
        await user.selectOptions(select, "/A/ALA/2");
        expect(setValue).toHaveBeenCalledWith("/A/ALA/2");
    });

    test("disables select when selectedCoordMolNo is null", () => {
        const molecule = makeMolecule([{ cid: "/A/LYS/1" }]);
        renderWithinInstance(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={null} />);
        // When no molecule is selected, the select renders with an empty options list
        const select = screen.getByRole("combobox");
        // The component is disabled when noLigand is true (no molecule found → allLigands is undefined)
        expect(select).toBeDisabled();
    });

    test("renders custom label", () => {
        const molecule = makeMolecule([{ cid: "/A/LYS/1" }]);
        renderWithinInstance(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={0} label="Choose Ligand" />);
        expect(screen.getByText("Choose Ligand")).toBeInTheDocument();
    });

    // The following tests were migrated from the legacy MoorhenLigandSelect.test.jsx
    test("renders a label and a visible select", () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenLigandSelect molecules={[]} selectedCoordMolNo={null} label="Test Label" />
            </Provider>
        );

        const labelNode = screen.getByText("Test Label");
        expect(labelNode).toBeVisible();

        const selectNode = screen.getByRole("combobox");
        expect(selectNode).toBeVisible();
    });

    test("renders and selects ligands from real molecules", async () => {
        const molecule_1 = new MoorhenMolecule(mockMoorhenInstance);
        molecule_1.molNo = 0;
        molecule_1.name = "mol-1";
        molecule_1.ligands = [{ cid: "//A/301" }, { cid: "//A/302" }, { cid: "//A/303" }] as any;
        const molecule_2 = new MoorhenMolecule(mockMoorhenInstance );
        molecule_2.molNo = 1;
        molecule_2.name = "mol-2";
        const molecule_3 = new MoorhenMolecule(mockMoorhenInstance );
        molecule_3.molNo = 2;
        molecule_3.name = "mol-3";

        const molecules = [molecule_1, molecule_2, molecule_3];

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenLigandSelect molecules={molecules} selectedCoordMolNo={0} />
            </Provider>
        );

        const selectNode = screen.getByRole("combobox");
        const optionNode_1 = screen.getByText("//A/301") as HTMLOptionElement;
        const optionNode_2 = screen.getByText("//A/302");
        const optionNode_3 = screen.getByText("//A/303") as HTMLOptionElement;

        expect(selectNode).toBeVisible();
        expect(optionNode_1).toBeInTheDocument();
        expect(optionNode_2).toBeInTheDocument();
        expect(optionNode_3).toBeInTheDocument();
        expect(selectNode).toHaveValue("//A/301");
        expect(optionNode_1.selected).toBeTruthy();

        const user = userEvent.setup();
        await user.selectOptions(selectNode, ["//A/303"]);
        expect(selectNode).toHaveValue("//A/303");
        expect(optionNode_3.selected).toBeTruthy();
    });

    test("calls onChange when a ligand is selected from real molecules", async () => {
        const molecule_1 = new MoorhenMolecule(mockMoorhenInstance);
        molecule_1.molNo = 0;
        molecule_1.name = "mol-1";
        molecule_1.ligands = [{ cid: "//A/301" }, { cid: "//A/302" }, { cid: "//A/303" }] as any;
        const molecule_2 = new MoorhenMolecule(mockMoorhenInstance);
        molecule_2.molNo = 1;
        molecule_2.name = "mol-2";
        const molecule_3 = new MoorhenMolecule(mockMoorhenInstance);
        molecule_3.molNo = 2;
        molecule_3.name = "mol-3";

        const molecules = [molecule_1, molecule_2, molecule_3];

        const onChange = jest.fn();

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenLigandSelect molecules={molecules} selectedCoordMolNo={0} onChange={onChange} />
            </Provider>
        );

        const selectNode = screen.getByRole("combobox");

        const user = userEvent.setup();
        await user.selectOptions(selectNode, ["//A/303"]);
        expect(onChange).toHaveBeenCalled();
    });
});
