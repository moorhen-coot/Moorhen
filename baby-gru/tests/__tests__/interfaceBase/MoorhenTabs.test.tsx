import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MoorhenTabContainer, MoorhenTab } from "../../../src/components/interface-base/Tabs/Tabs";

describe("MoorhenTabContainer & MoorhenTab", () => {
    test("renders tabs with labels", () => {
        render(
            <MoorhenTabContainer>
                <MoorhenTab id="tab1" label="First Tab">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second Tab">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        );
        expect(screen.getByText("First Tab")).toBeInTheDocument();
        expect(screen.getByText("Second Tab")).toBeInTheDocument();
    });

    test("shows only the active tab content", () => {
        render(
            <MoorhenTabContainer defaultActiveId="tab1">
                <MoorhenTab id="tab1" label="First">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        );
        expect(screen.getByText("First content")).toBeVisible();
        expect(screen.getByText("Second content")).toBeInTheDocument();
    });

    test("switches active tab on click", async () => {
        const user = userEvent.setup();
        render(
            <MoorhenTabContainer defaultActiveId="tab1">
                <MoorhenTab id="tab1" label="First">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        );
        const secondTab = screen.getByRole("tab", { name: /second/i });
        expect(secondTab).toBeInTheDocument();
        expect(screen.getByText("Second content")).toBeInTheDocument();
        expect(screen.getByText("Second content")).not.toBeVisible();
        await user.click(secondTab);
        expect(screen.getByText("Second content")).toBeVisible();
        expect(screen.getByText("First content")).toBeInTheDocument();
        expect(screen.getByText("First content")).not.toBeVisible();
    });

    test("calls onChange when tab is clicked", async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(
            <MoorhenTabContainer defaultActiveId="tab1" onChange={onChange}>
                <MoorhenTab id="tab1" label="First">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        );
        const secondTab = screen.getByRole("tab", { name: /second/i });
        await user.click(secondTab);
        expect(onChange).toHaveBeenCalledWith("tab2");
    });

    test("defaults to first tab when no defaultActiveId is given", () => {
        render(
            <MoorhenTabContainer>
                <MoorhenTab id="tab1" label="First">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        );
        const firstTab = screen.getByRole("tab", { name: /first/i });
        expect(firstTab).toHaveAttribute("aria-selected", "true");
        const secondTab = screen.getByRole("tab", { name: /second/i });
        expect(secondTab).toBeInTheDocument();
        expect(screen.getByText("Second content")).toBeInTheDocument();
        expect(screen.getByText("Second content")).not.toBeVisible();
    });

    test("marks active tab with aria-selected", async () => {
        const user = userEvent.setup();
        render(
            <MoorhenTabContainer defaultActiveId="tab1">
                <MoorhenTab id="tab1" label="First">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        );
        const firstTab = screen.getByRole("tab", { name: /first/i });
        expect(firstTab).toHaveAttribute("aria-selected", "true");

        const secondTab = screen.getByRole("tab", { name: /second/i });
        await user.click(secondTab);
        expect(secondTab).toHaveAttribute("aria-selected", "true");
        expect(firstTab).toHaveAttribute("aria-selected", "false");
    });

    test("applies className to container", () => {
        const { container } = render(
            <MoorhenTabContainer className="my-tabs">
                <MoorhenTab id="tab1" label="First">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        );
        const containerDiv = container.firstElementChild;
        expect(containerDiv.className).toContain("my-tabs");
    });
});
