import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MoorhenToggle } from "../../../src/components/inputs/MoorhenToggle/Toggle";

describe("MoorhenToggle", () => {
    test("renders with label", () => {
        render(<MoorhenToggle label="Toggle me" />);
        expect(screen.getByText("Toggle me")).toBeInTheDocument();
    });

    test("renders a checkbox input", () => {
        render(<MoorhenToggle label="Toggle input" />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeInTheDocument();
    });

    test("is checked when checked prop is true", () => {
        render(<MoorhenToggle label="Checked" checked={true} />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeChecked();
    });

    test("is unchecked when checked prop is false", () => {
        render(<MoorhenToggle label="Unchecked" checked={false} />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).not.toBeChecked();
    });

    test("calls onChange when toggled", async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<MoorhenToggle label="Changeable" onChange={onChange} />);
        const checkbox = screen.getByRole("checkbox");
        await user.click(checkbox);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test("is disabled when disabled prop is true", () => {
        render(<MoorhenToggle label="Disabled toggle" disabled={true} />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeDisabled();
    });

    test("does not call onChange when disabled", async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<MoorhenToggle label="Disabled change" onChange={onChange} disabled={true} />);
        const checkbox = screen.getByRole("checkbox");
        await user.click(checkbox);
        expect(onChange).not.toHaveBeenCalled();
    });

    test("renders with radio type", () => {
        const { container } = render(<MoorhenToggle label="Radio" type="radio" />);
        const radioSpan = container.querySelector(".moorhen__toggle-radio");
        expect(radioSpan).toBeInTheDocument();
    });

    test("renders with checkbox type", () => {
        const { container } = render(<MoorhenToggle label="Checkbox" type="checkbox" />);
        const checkboxSpan = container.querySelector(".moorhen__toggle-checkbox");
        expect(checkboxSpan).toBeInTheDocument();
    });

    test("renders with switch type (default)", () => {
        const { container } = render(<MoorhenToggle label="Switch" />);
        const sliderSpan = container.querySelector(".moorhen__toggle-slider");
        expect(sliderSpan).toBeInTheDocument();
    });

    test("applies custom className", () => {
        const { container } = render(<MoorhenToggle label="Custom class" className="my-toggle-class" />);
        const toggleContainer = container.firstElementChild;
        expect(toggleContainer.className).toContain("my-toggle-class");
    });

    test("applies custom style", () => {
        const { container } = render(<MoorhenToggle label="Styled toggle" style={{ margin: "10px" }} />);
        const toggleContainer = container.firstElementChild;
        expect(toggleContainer).toHaveStyle("margin: 10px");
    });

    test("renders with name attribute", () => {
        render(<MoorhenToggle label="Named" name="myToggle" />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toHaveAttribute("name", "myToggle");
    });

    test("renders with id attribute", () => {
        render(<MoorhenToggle label="ID'd" id="myToggleId" />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toHaveAttribute("id", "myToggleId");
    });

    test("works bidirectionally with lifted useState pattern", async () => {
        const user = userEvent.setup();
        function ToggleWrapper() {
            const [checked, setChecked] = useState(false);
            return (
                <>
                    <button data-testid="reset-toggle" onClick={() => setChecked(false)}>
                        Reset
                    </button>
                    <MoorhenToggle label="Lifted" checked={checked} onChange={() => setChecked(!checked)} />
                </>
            );
        }
        render(<ToggleWrapper />);
        const checkbox = screen.getByRole("checkbox");
        // Initial state
        expect(checkbox).not.toBeChecked();
        // User interaction → state lifted → UI updates
        await user.click(checkbox);
        expect(checkbox).toBeChecked();
        // External state change → component re-renders
        await user.click(screen.getByTestId("reset-toggle"));
        expect(checkbox).not.toBeChecked();
    });
});
