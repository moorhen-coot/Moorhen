import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MoorhenAccordion } from "../../../src/components/interface-base/Accordion/Accordion";
import { MoorhenReduxStore, renderWithinInstance } from "../testUtils";

describe("MoorhenAccordion", () => {
    test("renders with title and children when open", () => {
        renderWithinInstance(
            <MoorhenAccordion title="Test Title" defaultOpen={true}>
                <p>Accordion content</p>
            </MoorhenAccordion>
        );
        expect(screen.getByText("Test Title")).toBeInTheDocument();
        expect(screen.getByText("Accordion content")).toBeInTheDocument();
    });

    test("children are hidden when accordion is closed", () => {
        renderWithinInstance(
            <MoorhenAccordion title="Closed" defaultOpen={false}>
                <p>Hidden content</p>
            </MoorhenAccordion>
        );
        expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
    });

    test("children are visible when defaultOpen is true", () => {
        renderWithinInstance(
            <MoorhenAccordion title="Open" defaultOpen={true}>
                <p>Visible content</p>
            </MoorhenAccordion>
        );
        expect(screen.getByText("Visible content")).toBeInTheDocument();
    });

    test("toggles content visibility on button click", async () => {
        const user = userEvent.setup();
        renderWithinInstance(
            <MoorhenAccordion title="Toggle" defaultOpen={false}>
                <p>Toggle content</p>
            </MoorhenAccordion>
        );
        expect(screen.queryByText("Toggle content")).not.toBeInTheDocument();

        const toggleButton = screen.getByRole("button", { name: /keyboard/i });
        await user.click(toggleButton);
        expect(screen.getByText("Toggle content")).toBeInTheDocument();

        await user.click(toggleButton);
        expect(screen.queryByText("Toggle content")).not.toBeInTheDocument();
    });

    test("calls onChange callback when toggled", async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        renderWithinInstance(
            <MoorhenAccordion title="Callback" defaultOpen={false} onChange={onChange}>
                <p>Callback content</p>
            </MoorhenAccordion>
        );
        const toggleButton = screen.getByRole("button", { name: /keyboard/i });
        await user.click(toggleButton);
        expect(onChange).toHaveBeenCalledWith(true);
        await user.click(toggleButton);
        expect(onChange).toHaveBeenCalledWith(false);
    });

    test("calls onOpen and onClose callbacks", async () => {
        const user = userEvent.setup();
        const onOpen = jest.fn();
        const onClose = jest.fn();
        renderWithinInstance(
            <MoorhenAccordion title="OpenClose" defaultOpen={false} onOpen={onOpen} onClose={onClose}>
                <p>OpenClose content</p>
            </MoorhenAccordion>
        );
        const toggleButton = screen.getByRole("button", { name: /keyboard/i });
        await user.click(toggleButton);
        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
        await user.click(toggleButton);
        expect(onClose).toHaveBeenCalledTimes(1);
    });


    test("renders with card type", () => {
        renderWithinInstance(
            <MoorhenAccordion title="Card" type="card" defaultOpen={true}>
                <p>Card content</p>
            </MoorhenAccordion>
        );
        expect(screen.getByText("Card")).toBeInTheDocument();
    });

    test("disabled accordion does not toggle", async () => {
        const user = userEvent.setup();
        renderWithinInstance(
            <MoorhenAccordion title="Disabled" disabled={true} defaultOpen={false}>
                <p>Disabled content</p>
            </MoorhenAccordion>
        );
        const toggleButton = screen.getByRole("button", { name: /keyboard/i });
        await user.click(toggleButton);
        expect(screen.queryByText("Disabled content")).not.toBeInTheDocument();
    });

    test("renders extra controls", () => {
        renderWithinInstance(
            <MoorhenAccordion
                title="Extra"
                extraControls={[
                    <button key="x" data-testid="extra-btn">
                        Extra
                    </button>,
                ]}
            >
                <p>Extra content</p>
            </MoorhenAccordion>
        );
        expect(screen.getByTestId("extra-btn")).toBeInTheDocument();
    });
});
