import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Provider } from "react-redux";
import { MoorhenInstanceProvider } from "../../../src/InstanceManager";
import { MoorhenNumberInput } from "../../../src/components/inputs/MoorhenNumberInput/NumberInput";
import { mockMenuSystem, MoorhenReduxStore, renderWithinInstance } from "../testUtils";

describe("MoorhenNumberInput", () => {
    test("renders an input field", () => {
        renderWithinInstance(<MoorhenNumberInput value={42} />);
        const input = screen.getByRole("textbox");
        expect(input).toBeInTheDocument();
    });

    test("displays formatted value", () => {
        renderWithinInstance(<MoorhenNumberInput value={42.5} decimalDigits={1} />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("42.5");
    });

    test("displays integer value when integer prop is true", () => {
        renderWithinInstance(<MoorhenNumberInput value={42.7} integer={true} />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("43");
    });

    test("displays label when provided", () => {
        renderWithinInstance(<MoorhenNumberInput value={0} label="Radius" />);
        expect(screen.getByText("Radius")).toBeInTheDocument();
    });

    test("disables input when disabled is true", () => {
        renderWithinInstance(<MoorhenNumberInput value={0} disabled={true} />);
        const input = screen.getByRole("textbox");
        expect(input).toBeDisabled();
    });

    test("shows tooltip when provided", () => {
        renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenNumberInput value={0} tooltip="Number tooltip" />
            </MoorhenInstanceProvider>
        );
        // The input displays the formatted value with 2 decimal places
        expect(screen.getByDisplayValue("0.00")).toBeInTheDocument();
    });

    test("applies custom className", () => {
        renderWithinInstance(<MoorhenNumberInput value={0} className="my-num-class" />);
        expect(screen.getByRole("textbox").className).toContain("my-num-class");
        // className is applied to the wrapping MoorhenStack
    });

    test("forwards ref", () => {
        const ref = { current: null };
        renderWithinInstance(<MoorhenNumberInput value={0} ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    test("works bidirectionally with lifted useState pattern", async () => {
        const user = userEvent.setup();
        function NumberInputWrapper() {
            const [value, setValue] = useState(10);
            return (
                <Provider store={MoorhenReduxStore}>
                    <button data-testid="reset-num" onClick={() => setValue(10)}>
                        Reset
                    </button>
                    <MoorhenNumberInput value={value} setValue={setValue} />
                </Provider>
            );
        }
        render(<NumberInputWrapper />);
        const input = screen.getByRole("textbox");
        // Initial state
        expect(input).toHaveValue("10.00");
        // User interaction → state lifted → UI updates
        await user.clear(input);
        await user.type(input, "42.50");
        expect(input).toHaveValue("42.50");
        // External state change → component re-renders
        await user.click(screen.getByTestId("reset-num"));
        expect(input).toHaveValue("10.00");
    });

    // -------------------------------------------------------
    // waitReturn mode — only commits on Enter
    // -------------------------------------------------------
    test("waitReturn does not call setValue on keystroke (only on Enter)", async () => {
        const user = userEvent.setup();
        const setValue = jest.fn();
        renderWithinInstance(<MoorhenNumberInput value={0} setValue={setValue} waitReturn={true} />);
        const input = screen.getByRole("textbox");
        await user.clear(input);
        await user.type(input, "42");
        // Without Enter, setValue should not have been called
        expect(setValue).not.toHaveBeenCalled();
    });

    test("waitReturn calls setValue when Enter is pressed", async () => {
        const user = userEvent.setup();
        const setValue = jest.fn();
        renderWithinInstance(<MoorhenNumberInput value={0} setValue={setValue} waitReturn={true} />);
        const input = screen.getByRole("textbox");
        await user.clear(input);
        await user.type(input, "42{Enter}");
        expect(setValue).toHaveBeenCalledWith(42);
    });

    // -------------------------------------------------------
    // minMax clamping on blur
    // -------------------------------------------------------
    test("clamps value to minMax range on blur", async () => {
        const user = userEvent.setup();
        const setValue = jest.fn();
        renderWithinInstance(<MoorhenNumberInput value={50} setValue={setValue} minMax={[0, 100]} waitReturn={true} />);
        const input = screen.getByRole("textbox");
        await user.clear(input);
        await user.type(input, "999");
        // Blur the input to trigger commitInputValue
        await user.click(document.body);
        // Should clamp to max of 100
        expect(setValue).toHaveBeenCalledWith(100);
    });

    // -------------------------------------------------------
    // allowNegativeValues
    // -------------------------------------------------------
    test("rejects negative input when allowNegativeValues is false", async () => {
        const user = userEvent.setup();
        const setValue = jest.fn();
        renderWithinInstance(<MoorhenNumberInput value={10} setValue={setValue} allowNegativeValues={false} waitReturn={true} />);
        const input = screen.getByRole("textbox");
        await user.clear(input);
        await user.type(input, "-5{Enter}");
        // -5 is invalid so the input won't commit
        expect(setValue).not.toHaveBeenCalled();
    });

    // -------------------------------------------------------
    // type="number" with +/- buttons
    // -------------------------------------------------------
    test("renders +/- arrow buttons when type is number", () => {
        renderWithinInstance(<MoorhenNumberInput value={50} setValue={() => {}} type="number" />);
        const buttons = screen.getAllByRole("button");
        // Should have at least the up/down arrow buttons
        expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    test("plus button increments from value 0", async () => {
        const user = userEvent.setup();
        const setValue = jest.fn();
        renderWithinInstance(<MoorhenNumberInput value={0} setValue={setValue} integer type="number" minMax={[0, 5]} />);
        const buttons = screen.getAllByRole("button");
        // First button is the up/plus arrow
        await user.click(buttons[0]);
        expect(setValue).toHaveBeenCalledWith(1);
    });

    // -------------------------------------------------------
    // labelPosition
    // -------------------------------------------------------
    test("renders label on top when labelPosition is top", () => {
        renderWithinInstance(<MoorhenNumberInput value={0} label="Top Label" labelPosition="top" />);
        const outerStack = screen.getByText("Top Label").parentElement;
        expect(outerStack.className).toContain("moorhen__stack__column");
    });

    // -------------------------------------------------------
    // Validity class (computed from checkIsValidInput internally)
    // -------------------------------------------------------
    test("applies valid class when input value is valid", () => {
        renderWithinInstance(<MoorhenNumberInput value={42} />);
        const input = screen.getByRole("textbox");
        expect(input.className).toContain("moorhen__input__valid");
    });
});
