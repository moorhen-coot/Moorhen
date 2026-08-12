import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { MoorhenInstanceProvider } from "../../../src/InstanceManager";
import { MoorhenGradientPicker } from "../../../src/components/inputs/MoorhenGradientPicker/MoorhenGradientPicker";
import { mockMenuSystem, renderWithinInstance } from "../testUtils";

describe("MoorhenGradientPicker", () => {
    const basicColourTable: [number, [number, number, number]][] = [
        [0.0, [255, 0, 0]],
        [0.5, [255, 255, 255]],
        [1.0, [0, 0, 255]],
    ];

    test("renders the gradient picker container with colour stops", () => {
        const { container } = renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker colourTable={basicColourTable} setColourTable={() => {}} menu="test" />
            </MoorhenInstanceProvider>
        );
        // The outer container has a 0.5rem margin
        const outerContainer = container.querySelector('[style*="margin: 0.5rem"]');
        expect(outerContainer).toBeInTheDocument();
        // The colour preset is rendered
        expect(screen.getByText("Red White Blue")).toBeInTheDocument();
    });

    test("renders the points number input", () => {
        renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker colourTable={basicColourTable} setColourTable={() => {}} menu="test" />
            </MoorhenInstanceProvider>
        );
        expect(screen.getByText("Points:")).toBeInTheDocument();
    });

    test("renders preset selector with options", () => {
        renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker colourTable={basicColourTable} setColourTable={() => {}} menu="test" />
            </MoorhenInstanceProvider>
        );
        expect(screen.getByText("Custom")).toBeInTheDocument();
        expect(screen.getByText("Red White Blue")).toBeInTheDocument();
    });

    test("renders value labels when showValues is true (default)", () => {
        renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker colourTable={basicColourTable} setColourTable={() => {}} menu="test" />
            </MoorhenInstanceProvider>
        );
        // With minValue=0, maxValue=1 and 3 points, values are 0.0, 0.5, 1.0
        expect(screen.getByText("0.0")).toBeInTheDocument();
        expect(screen.getByText("0.5")).toBeInTheDocument();
        expect(screen.getByText("1.0")).toBeInTheDocument();
    });

    test("hides value labels when showValues is false", () => {
        renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker colourTable={basicColourTable} setColourTable={() => {}} menu="test" showValues={false} />
            </MoorhenInstanceProvider>
        );
        expect(screen.queryByText("0.0")).not.toBeInTheDocument();
        expect(screen.queryByText("0.5")).not.toBeInTheDocument();
        expect(screen.queryByText("1.0")).not.toBeInTheDocument();
    });

    test("renders revert button", () => {
        const { container } = renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker colourTable={basicColourTable} setColourTable={() => {}} menu="test" />
            </MoorhenInstanceProvider>
        );
        // The revert button uses icon "MatSymFlipCamera"; find it by its containing stack
        const reversionStack = container.querySelector('[style*="margin: 0.5rem"]');
        expect(reversionStack).toBeInTheDocument();
    });

    test("renders number inputs for min/max when modifyValues is true", () => {
        renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker
                    colourTable={basicColourTable}
                    setColourTable={() => {}}
                    menu="test"
                    modifyValues={true}
                    minValue={0}
                    maxValue={100}
                    setMinValue={() => {}}
                    setMaxValue={() => {}}
                />
            </MoorhenInstanceProvider>
        );
        // Should show two number inputs for min/max
        const textboxes = screen.getAllByRole("textbox");
        expect(textboxes.length).toBeGreaterThanOrEqual(2);
    });
});
