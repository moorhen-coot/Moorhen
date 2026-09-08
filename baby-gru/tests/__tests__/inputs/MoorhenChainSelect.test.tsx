import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MoorhenChainSelect } from "../../../src/components/inputs/Selector/MoorhenChainSelect";
import { MoorhenMolecule } from "../../../src/utils/MoorhenMolecule";
import { MoorhenReduxStore, renderWithinInstance } from "../testUtils";
import { MoorhenInstance } from "@/InstanceManager";
import React from "react";

const mockMoorhenInstance = new MoorhenInstance(React.createRef<HTMLDivElement>());
describe("MoorhenChainSelect", () => {
    test("renders chain options from molecule sequences", () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: "3u7t",
                sequences: [
                    { chain: "A", type: 1 },
                    { chain: "B", type: 1 },
                ],
            },
        ];
        renderWithinInstance(<MoorhenChainSelect molecules={mockMolecules as any} selectedCoordMolNo={0} />);
        expect(screen.getByText("A")).toBeInTheDocument();
        expect(screen.getByText("B")).toBeInTheDocument();
    });

    test('shows "All" option when allowAll is true', () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: "3u7t",
                sequences: [{ chain: "A", type: 1 }],
            },
        ];
        renderWithinInstance(<MoorhenChainSelect molecules={mockMolecules as any} selectedCoordMolNo={0} allowAll={true} />);
        expect(screen.getByText("All")).toBeInTheDocument();
    });

    test("filters chains by allowedTypes", () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: "3u7t",
                sequences: [
                    { chain: "A", type: 1 },
                    { chain: "B", type: 3 },
                    { chain: "C", type: 999 },
                ],
            },
        ];
        renderWithinInstance(<MoorhenChainSelect molecules={mockMolecules as any} selectedCoordMolNo={0} />);
        expect(screen.getByText("A")).toBeInTheDocument();
        expect(screen.getByText("B")).toBeInTheDocument();
        expect(screen.queryByText("C")).not.toBeInTheDocument();
    });

    test("renders with custom label", () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: "3u7t",
                sequences: [{ chain: "A", type: 1 }],
            },
        ];
        renderWithinInstance(<MoorhenChainSelect molecules={mockMolecules as any} selectedCoordMolNo={0} label="Chain ID" />);
        expect(screen.getByText("Chain ID")).toBeInTheDocument();
    });

    test("renders select even when selectedCoordMolNo is null", () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: "3u7t",
                sequences: [{ chain: "A", type: 1 }],
            },
        ];
        renderWithinInstance(<MoorhenChainSelect molecules={mockMolecules as any} selectedCoordMolNo={null} />);
        const select = screen.getByRole("combobox");
        expect(select).toBeInTheDocument();
    });

    // The following tests were migrated from the legacy MoorhenChainSelect.test.jsx
    test("renders a label and a visible select", () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenChainSelect molecules={[]} selectedCoordMolNo={null} label="Test Label" />
            </Provider>
        );

        const labelNode = screen.getByText("Test Label");
        expect(labelNode).toBeVisible();

        const selectNode = screen.getByRole("combobox");
        expect(selectNode).toBeVisible();
    });

    test("renders and selects chains from real molecules", async () => {
        const molecule_1 = new MoorhenMolecule(mockMoorhenInstance);
        molecule_1.molNo = 0;
        molecule_1.name = "mol-1";
        molecule_1.sequences = [
            { type: 1, chain: "A" },
            { type: 2, chain: "B" },
            { type: 3, chain: "C" },
        ] as any;
        const molecule_2 = new MoorhenMolecule(mockMoorhenInstance);
        molecule_2.molNo = 1;
        molecule_2.name = "mol-2";
        const molecule_3 = new MoorhenMolecule(mockMoorhenInstance);
        molecule_3.molNo = 2;
        molecule_3.name = "mol-3";

        const molecules = [molecule_1, molecule_2, molecule_3];

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenChainSelect molecules={molecules} selectedCoordMolNo={0} />
            </Provider>
        );

        const selectNode = screen.getByRole("combobox");
        const optionNode_1 = screen.getByText("A") as HTMLOptionElement;
        const optionNode_2 = screen.getByText("B");
        const optionNode_3 = screen.getByText("C") as HTMLOptionElement;

        expect(selectNode).toBeVisible();
        expect(optionNode_1).toBeInTheDocument();
        expect(optionNode_2).toBeInTheDocument();
        expect(optionNode_3).toBeInTheDocument();
        expect(selectNode).toHaveValue("A");
        expect(optionNode_1.selected).toBeTruthy();

        const user = userEvent.setup();
        await user.selectOptions(selectNode, ["C"]);
        expect(selectNode).toHaveValue("C");
        expect(optionNode_3.selected).toBeTruthy();
    });

    test("filters chains by the allowedTypes prop", () => {
        const molecule_1 = new MoorhenMolecule(mockMoorhenInstance);
        molecule_1.molNo = 0;
        molecule_1.name = "mol-1";
        molecule_1.sequences = [
            { type: 1, chain: "A" },
            { type: 2, chain: "B" },
            { type: 3, chain: "C" },
        ] as any;
        const molecule_2 = new MoorhenMolecule(mockMoorhenInstance);
        molecule_2.molNo = 1;
        molecule_2.name = "mol-2";
        const molecule_3 = new MoorhenMolecule(mockMoorhenInstance);
        molecule_3.molNo = 2;
        molecule_3.name = "mol-3";

        const molecules = [molecule_1, molecule_2, molecule_3];

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenChainSelect molecules={molecules} selectedCoordMolNo={0} allowedTypes={[1, 3]} />
            </Provider>
        );

        const selectNode = screen.getByRole("combobox");
        const optionNode_1 = screen.queryByText("A") as HTMLOptionElement;
        const optionNode_2 = screen.queryByText("B");
        const optionNode_3 = screen.queryByText("C");

        expect(selectNode).toBeVisible();
        expect(optionNode_1).toBeInTheDocument();
        expect(optionNode_2).not.toBeInTheDocument();
        expect(optionNode_3).toBeInTheDocument();
        expect(selectNode).toHaveValue("A");
        expect(optionNode_1.selected).toBeTruthy();
    });

    test("calls onChange when a chain is selected", async () => {
        const molecule_1 = new MoorhenMolecule(mockMoorhenInstance);
        molecule_1.molNo = 0;
        molecule_1.name = "mol-1";
        molecule_1.sequences = [
            { type: 1, chain: "A" },
            { type: 2, chain: "B" },
            { type: 3, chain: "C" },
        ] as any;
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
                <MoorhenChainSelect molecules={molecules} selectedCoordMolNo={0} onChange={onChange} />
            </Provider>
        );

        const selectNode = screen.getByRole("combobox");

        const user = userEvent.setup();
        await user.selectOptions(selectNode, ["C"]);
        expect(onChange).toHaveBeenCalled();
    });
});
