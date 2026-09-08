import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MoorhenInstanceProvider } from "../../../src/InstanceManager";
import { MoorhenButton } from "../../../src/components/inputs/MoorhenButton/MoorhenButton";
import { mockMenuSystem, renderWithinInstance } from "../testUtils";

describe("MoorhenButton", () => {
    test("renders with label", () => {
        renderWithinInstance(<MoorhenButton label="Click Me" />);
        expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
    });

    test("calls onClick when clicked", async () => {
        const user = userEvent.setup();
        const onClick = jest.fn();
        renderWithinInstance(<MoorhenButton label="Clickable" onClick={onClick} />);
        await user.click(screen.getByRole("button", { name: /clickable/i }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    test("does not call onClick when disabled", async () => {
        const user = userEvent.setup();
        const onClick = jest.fn();
        renderWithinInstance(<MoorhenButton label="Disabled" onClick={onClick} disabled={true} />);
        const button = screen.getByRole("button", { name: /disabled/i });
        expect(button).toBeDisabled();
        await user.click(button);
        expect(onClick).not.toHaveBeenCalled();
    });

    test("renders with children", () => {
        renderWithinInstance(<MoorhenButton>Child Content</MoorhenButton>);
        expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    test("renders as icon-only type", () => {
        renderWithinInstance(<MoorhenButton type="icon-only" icon="MatSymKeyboardArrowDown" />);
        const button = screen.getByRole("button");
        expect(button.className).toContain("moorhen__button__icon-only");
    });

    test("applies custom className", () => {
        renderWithinInstance(<MoorhenButton label="Styled" className="my-custom-class" />);
        const button = screen.getByRole("button", { name: /styled/i });
        expect(button.className).toContain("my-custom-class");
    });

    test("applies custom style", () => {
        renderWithinInstance(<MoorhenButton label="StyledBtn" style={{ backgroundColor: "blue" }} />);
        const button = screen.getByRole("button", { name: /styledbtn/i });
        expect(button).toHaveStyle("background-color: blue");
    });

    test("renders with variant primary", () => {
        renderWithinInstance(<MoorhenButton label="Primary" variant="primary" />);
        const button = screen.getByRole("button", { name: /primary/i });
        expect(button.className).toContain("primary");
    });

    test("renders with variant danger", () => {
        renderWithinInstance(<MoorhenButton label="Danger" variant="danger" />);
        const button = screen.getByRole("button", { name: /danger/i });
        expect(button.className).toContain("danger");
    });

    test("forwards ref", () => {
        const ref = { current: null };
        renderWithinInstance(<MoorhenButton label="RefBtn" ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    test("renders tooltip text", () => {
        renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenButton label="TooltipBtn" tooltip="Useful tooltip" />
            </MoorhenInstanceProvider>
        );
        expect(screen.getByText("TooltipBtn")).toBeInTheDocument();
    });
});
