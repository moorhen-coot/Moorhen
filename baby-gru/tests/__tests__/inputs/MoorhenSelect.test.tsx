import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Provider } from "react-redux";
import { MoorhenSelect } from "../../../src/components/inputs/Selector/Select";
import { MoorhenReduxStore, renderWithinInstance } from "../testUtils";

describe("MoorhenSelect", () => {
    test("renders with options", () => {
        renderWithinInstance(
            <MoorhenSelect>
                <option value="opt1">Option 1</option>
                <option value="opt2">Option 2</option>
            </MoorhenSelect>
        );
        expect(screen.getByText("Option 1")).toBeInTheDocument();
        expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    test("renders a select element", () => {
        renderWithinInstance(
            <MoorhenSelect>
                <option value="a">A</option>
            </MoorhenSelect>
        );
        expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    test("displays label when provided", () => {
        renderWithinInstance(
            <MoorhenSelect label="Choose option">
                <option value="a">A</option>
            </MoorhenSelect>
        );
        expect(screen.getByText("Choose option")).toBeInTheDocument();
    });

    test("calls onChange when selection changes", async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        renderWithinInstance(
            <MoorhenSelect onChange={onChange}>
                <option value="opt1">Option 1</option>
                <option value="opt2">Option 2</option>
            </MoorhenSelect>
        );
        const select = screen.getByRole("combobox");
        await user.selectOptions(select, "opt2");
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test("calls setValue when selection changes", async () => {
        const user = userEvent.setup();
        const setValue = jest.fn();
        renderWithinInstance(
            <MoorhenSelect setValue={setValue}>
                <option value="opt1">Option 1</option>
                <option value="opt2">Option 2</option>
            </MoorhenSelect>
        );
        const select = screen.getByRole("combobox");
        await user.selectOptions(select, "opt2");
        expect(setValue).toHaveBeenCalledWith("opt2");
    });

    test("uses defaultValue", () => {
        renderWithinInstance(
            <MoorhenSelect defaultValue="opt2">
                <option value="opt1">Option 1</option>
                <option value="opt2">Option 2</option>
            </MoorhenSelect>
        );
        const select = screen.getByRole("combobox");
        expect(select).toHaveValue("opt2");
    });

    test("is disabled when disabled prop is true", () => {
        renderWithinInstance(
            <MoorhenSelect disabled={true}>
                <option value="a">A</option>
            </MoorhenSelect>
        );
        const select = screen.getByRole("combobox");
        expect(select).toBeDisabled();
    });

    test("renders inline by default", () => {
        renderWithinInstance(
            <MoorhenSelect label="Inline">
                <option value="a">A</option>
            </MoorhenSelect>
        );
        const stackDiv = screen.getByRole("combobox").parentElement;
        expect(stackDiv.className).toContain("moorhen__stack__row");
    });

    test("renders column layout when inline is false", () => {
        renderWithinInstance(
            <MoorhenSelect label="Column" inline={false}>
                <option value="a">A</option>
            </MoorhenSelect>
        );
        const stackDiv = screen.getByRole("combobox").parentElement;
        expect(stackDiv.className).toContain("moorhen__stack__column");
    });

    test("forwards ref", () => {
        const ref = { current: null };
        renderWithinInstance(
            <MoorhenSelect ref={ref}>
                <option value="a">A</option>
            </MoorhenSelect>
        );
        expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    });

    test("works bidirectionally with lifted useState pattern", async () => {
        const user = userEvent.setup();
        function SelectWrapper() {
            const [value, setValue] = useState("opt1");
            return (
                <Provider store={MoorhenReduxStore}>
                    <button data-testid="reset-select" onClick={() => setValue("opt1")}>
                        Reset
                    </button>
                    <MoorhenSelect value={value} setValue={setValue}>
                        <option value="opt1">Option 1</option>
                        <option value="opt2">Option 2</option>
                    </MoorhenSelect>
                </Provider>
            );
        }
        render(<SelectWrapper />);
        const select = screen.getByRole("combobox");
        // Initial state
        expect(select).toHaveValue("opt1");
        // User interaction → state lifted → UI updates
        await user.selectOptions(select, "opt2");
        expect(select).toHaveValue("opt2");
        // External state change → component re-renders
        await user.click(screen.getByTestId("reset-select"));
        expect(select).toHaveValue("opt1");
    });
});
