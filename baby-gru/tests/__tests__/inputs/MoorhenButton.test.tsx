import "@testing-library/jest-dom";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MoorhenInstanceProvider } from "../../../src/InstanceManager";
import { MoorhenButton } from "../../../src/components/inputs/MoorhenButton/MoorhenButton";
import { mockMenuSystem, renderWithinInstance } from "../testUtils";

jest.mock("../../../src/components/interface-base/Popovers/Tooltip", () => ({
    MoorhenTooltip: ({ tooltip, placement, link }) => (
        <div data-testid="moorhen-tooltip" data-placement={placement}>
            {link}
            <div>{tooltip}</div>
        </div>
    ),
}));

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

    test("calls mouse event handlers", () => {
        const onMouseDown = jest.fn();
        const onMouseUp = jest.fn();
        const onMouseEnter = jest.fn();
        const onMouseLeave = jest.fn();
        renderWithinInstance(
            <MoorhenButton
                label="Mouse handlers"
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            />
        );
        const button = screen.getByRole("button", { name: /mouse handlers/i });
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
        fireEvent.mouseEnter(button);
        fireEvent.mouseLeave(button);
        expect(onMouseDown).toHaveBeenCalledTimes(1);
        expect(onMouseUp).toHaveBeenCalledTimes(1);
        expect(onMouseEnter).toHaveBeenCalledTimes(1);
        expect(onMouseLeave).toHaveBeenCalledTimes(1);
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

    test("supports id, value, and ariaLabel", () => {
        renderWithinInstance(<MoorhenButton label="Hidden label" id="button-id" value="button-value" ariaLabel="Accessible label" />);
        const button = screen.getByRole("button", { name: /accessible label/i });
        expect(button).toHaveAttribute("id", "button-id");
        expect(button).toHaveValue("button-value");
    });

    test("applies icon size and iconStyle", () => {
        renderWithinInstance(
            <MoorhenButton
                label="Sized icon"
                icon="MatSymKeyboardArrowDown"
                size="lg"
                iconStyle={{ width: "24px", height: "24px" }}
            />
        );
        const icon = screen.getByLabelText("MatSymKeyboardArrowDown");
        expect(icon.className).toContain("large");
        expect(icon).toHaveStyle({ width: "24px", height: "24px" });
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
                <MoorhenButton label="TooltipBtn" tooltip="Useful tooltip" tooltipPlacement="left" />
            </MoorhenInstanceProvider>
        );
        expect(screen.getByTestId("moorhen-tooltip")).toHaveAttribute("data-placement", "left");
        expect(screen.getByText("Useful tooltip")).toBeInTheDocument();
        expect(screen.getByText("TooltipBtn")).toBeInTheDocument();
    });

    test("renders disabled tooltip content", () => {
        renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenButton label="Disabled tooltip" tooltip="Base tooltip" disabledTooltip="Disabled details" disabled={true} />
            </MoorhenInstanceProvider>
        );
        expect(screen.getByRole("button", { name: /disabled tooltip/i })).toBeDisabled();
        expect(screen.getByText(/Disabled details/i)).toBeInTheDocument();
    });

    test("renders toggle buttons with checked state", () => {
        renderWithinInstance(<MoorhenButton type="toggle" checked={true} label="Toggle" />);
        const button = screen.getByRole("button", { name: /toggle/i });
        expect(button.className).toContain("moorhen__button__toggle-checked");
    });
});
