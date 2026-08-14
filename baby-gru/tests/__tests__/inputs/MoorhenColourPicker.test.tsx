import "@testing-library/jest-dom";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MoorhenInstanceProvider } from "../../../src/InstanceManager";
import { MoorhenColourPicker } from "../../../src/components/inputs/MoorhenColourPicker/MoorhenColourPicker";
import { mockMenuSystem, renderWithinInstance } from "../testUtils";

describe("MoorhenColourPicker", () => {
    const clickSwatch = (container: HTMLElement) => {
        const swatch = container.querySelector('[style*="border-radius: 8px"]') as HTMLElement;
        if (swatch) fireEvent.click(swatch);
        return swatch;
    };

    test("renders a coloured swatch trigger", () => {
        const { container } = renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[255, 0, 0]} />
            </MoorhenInstanceProvider>
        );
        const swatch = container.querySelector('[style*="border-radius: 8px"]');
        expect(swatch).toBeInTheDocument();
    });

    test("applies the colour as background of the swatch", () => {
        const { container } = renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[100, 150, 200]} />
            </MoorhenInstanceProvider>
        );
        const swatch = container.querySelector('[style*="background-color"]') as HTMLElement;
        expect(swatch.style.backgroundColor).toBe("rgb(100, 150, 200)");
    });

    test("renders label text after opening the popover", () => {
        const { container } = renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[0, 0, 255]} label="Main colour" />
            </MoorhenInstanceProvider>
        );
        clickSwatch(container);
        expect(screen.getByText("Main colour")).toBeInTheDocument();
    });

    test("renders dual colour labels after opening the popover", () => {
        const { container } = renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[255, 0, 0]} colour2={[0, 0, 255]} setColour2={() => {}} label="A" label2="B" />
            </MoorhenInstanceProvider>
        );
        clickSwatch(container);
        expect(screen.getByText("A")).toBeInTheDocument();
        expect(screen.getByText("B")).toBeInTheDocument();
    });

    test("renders Apply button after opening the popover", () => {
        const { container } = renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[0, 255, 0]} onApply={() => {}} />
            </MoorhenInstanceProvider>
        );
        clickSwatch(container);
        expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();
    });

    test("calls onApply with the colour when Apply is clicked", async () => {
        const user = userEvent.setup();
        const onApply = jest.fn();
        const { container } = renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[0, 255, 0]} onApply={onApply} />
            </MoorhenInstanceProvider>
        );
        clickSwatch(container);
        await user.click(screen.getByRole("button", { name: /apply/i }));
        expect(onApply).toHaveBeenCalledWith([0, 255, 0]);
    });

    test("renders with tooltip text", () => {
        const { container } = renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[255, 255, 0]} tooltip="Pick a colour" />
            </MoorhenInstanceProvider>
        );
        const swatch = container.querySelector('[style*="border-radius: 8px"]');
        expect(swatch).toBeInTheDocument();
    });

    test("applies custom style to the swatch", () => {
        const { container } = renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[0, 0, 0]} style={{ opacity: 0.5 }} />
            </MoorhenInstanceProvider>
        );
        const swatch = container.querySelector('[style*="border-radius: 8px"]') as HTMLElement;
        expect(swatch.style.opacity).toBe("0.5");
    });
});
