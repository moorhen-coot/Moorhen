import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MoorhenMenuItem } from "../../../src/components/interface-base/MenuItems/MenuItem";
import { renderWithinInstance } from "../testUtils";

describe("MoorhenMenuItem", () => {
    test("renders children", () => {
        renderWithinInstance(<MoorhenMenuItem>Menu Item Text</MoorhenMenuItem>);
        expect(screen.getByText("Menu Item Text")).toBeInTheDocument();
    });

    test("renders as a button element", () => {
        renderWithinInstance(<MoorhenMenuItem>Button Item</MoorhenMenuItem>);
        expect(screen.getByRole("button", { name: /button item/i })).toBeInTheDocument();
    });

    test("calls onClick when clicked", async () => {
        const user = userEvent.setup();
        const onClick = jest.fn();
        renderWithinInstance(<MoorhenMenuItem onClick={onClick}>Clickable</MoorhenMenuItem>);
        await user.click(screen.getByRole("button", { name: /clickable/i }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    test("applies selected class when selected", () => {
        renderWithinInstance(<MoorhenMenuItem selected={true}>Selected Item</MoorhenMenuItem>);
        const button = screen.getByRole("button", { name: /selected item/i });
        expect(button.className).toContain("moorhen__menu-item-selected");
    });

    test("does not apply selected class when not selected", () => {
        renderWithinInstance(<MoorhenMenuItem selected={false}>Unselected</MoorhenMenuItem>);
        const button = screen.getByRole("button", { name: /unselected/i });
        expect(button.className).not.toContain("moorhen__menu-item-selected");
    });

    test("disables the button when disabled", () => {
        renderWithinInstance(<MoorhenMenuItem disabled={true}>Disabled Item</MoorhenMenuItem>);
        const button = screen.getByRole("button", { name: /disabled item/i });
        expect(button).toBeDisabled();
    });

    test("does not call onClick when disabled", async () => {
        const user = userEvent.setup();
        const onClick = jest.fn();
        renderWithinInstance(
            <MoorhenMenuItem disabled={true} onClick={onClick}>
                Disabled Click
            </MoorhenMenuItem>
        );
        const button = screen.getByRole("button", { name: /disabled click/i });
        await user.click(button);
        expect(onClick).not.toHaveBeenCalled();
    });

    test("applies custom styles", () => {
        renderWithinInstance(
            <MoorhenMenuItem style={{ fontWeight: "bold", color: "red" }}>Styled</MoorhenMenuItem>
        );
        const button = screen.getByRole("button", { name: /styled/i });
        expect(button).toHaveStyle("font-weight: bold");
        expect(button).toHaveStyle("color: red");
    });

    test("has disabled class when disabled", () => {
        renderWithinInstance(<MoorhenMenuItem disabled={true}>Disabled Class</MoorhenMenuItem>);
        const button = screen.getByRole("button", { name: /disabled class/i });
        expect(button.className).toContain("moorhen__menu-item-disabled");
    });

    test("accepts a ref", () => {
        const ref = { current: null };
        renderWithinInstance(<MoorhenMenuItem ref={ref}>Ref Item</MoorhenMenuItem>);
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
});
