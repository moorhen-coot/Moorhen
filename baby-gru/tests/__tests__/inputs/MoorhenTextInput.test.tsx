import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Provider } from "react-redux";
import { MoorhenTextInput } from "../../../src/components/inputs/TextInput";
import { MoorhenReduxStore, renderWithinInstance } from "../testUtils";

describe("MoorhenTextInput", () => {
    test("renders an input field", () => {
        renderWithinInstance(<MoorhenTextInput />);
        const input = screen.getByRole("textbox");
        expect(input).toBeInTheDocument();
    });

    test("renders label when provided", () => {
        renderWithinInstance(<MoorhenTextInput label="Name" />);
        expect(screen.getByText("Name")).toBeInTheDocument();
    });

    test("calls setText on change", async () => {
        const user = userEvent.setup();
        const setText = jest.fn();
        renderWithinInstance(<MoorhenTextInput setText={setText} />);
        const input = screen.getByRole("textbox");
        await user.type(input, "hello");
        expect(setText).toHaveBeenCalled();
    });

    test("calls onChange on change", async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        renderWithinInstance(<MoorhenTextInput onChange={onChange} />);
        const input = screen.getByRole("textbox");
        await user.type(input, "a");
        expect(onChange).toHaveBeenCalled();
    });

    test("renders with defaultValue", () => {
        renderWithinInstance(<MoorhenTextInput text="Initial value" />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("Initial value");
    });

    test("disables input when disabled is true", () => {
        renderWithinInstance(<MoorhenTextInput disabled={true} />);
        const input = screen.getByRole("textbox");
        expect(input).toBeDisabled();
    });

    test("renders with placeholder", () => {
        renderWithinInstance(<MoorhenTextInput placeholder="Enter text..." />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveAttribute("placeholder", "Enter text...");
    });

    test("renders with button when button prop is true", () => {
        const onClick = jest.fn();
        renderWithinInstance(<MoorhenTextInput button={true} onClick={onClick} />);
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    test("calls onSubmit when Enter is pressed", async () => {
        const user = userEvent.setup();
        const onSubmit = jest.fn();
        renderWithinInstance(<MoorhenTextInput onSubmit={onSubmit} />);
        const input = screen.getByRole("textbox");
        await user.type(input, "{Enter}");
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    test("applies isInvalid class", () => {
        renderWithinInstance(<MoorhenTextInput isInvalid={true} />);
        const input = screen.getByRole("textbox");
        expect(input.className).toContain("invalid");
    });

    test("renders inline by default (line direction)", () => {
        renderWithinInstance(<MoorhenTextInput label="Inline" />);
        const stackDiv = screen.getByText("Inline").parentElement;
        expect(stackDiv.className).toContain("moorhen__stack__row");
    });

    test("renders column layout when inline is false", () => {
        renderWithinInstance(<MoorhenTextInput label="Column" inline={false} />);
        const stackDiv = screen.getByText("Column").parentElement;
        expect(stackDiv.className).toContain("moorhen__stack__column");
    });

    test("applies uppercase style", () => {
        renderWithinInstance(<MoorhenTextInput uppercase={true} />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveStyle("text-transform: uppercase");
    });

    test("renders as readonly", () => {
        renderWithinInstance(<MoorhenTextInput readOnly={true} />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveAttribute("readonly");
    });

    test("forwards ref", () => {
        const ref = { current: null };
        renderWithinInstance(<MoorhenTextInput ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    test("works bidirectionally with lifted useState pattern", async () => {
        const user = userEvent.setup();
        function TextInputWrapper() {
            const [text, setText] = useState("");
            return (
                <Provider store={MoorhenReduxStore}>
                    <button data-testid="reset-text" onClick={() => setText("")}>
                        Reset
                    </button>
                    <MoorhenTextInput text={text} setText={setText} />
                </Provider>
            );
        }
        render(<TextInputWrapper />);
        const input = screen.getByRole("textbox");
        // Initial state
        expect(input).toHaveValue("");
        // User interaction → state lifted → UI updates
        await user.type(input, "hello");
        expect(input).toHaveValue("hello");
        // External state change → component re-renders
        await user.click(screen.getByTestId("reset-text"));
        expect(input).toHaveValue("");
    });
});
