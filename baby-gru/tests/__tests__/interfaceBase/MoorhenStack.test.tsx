import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MoorhenStack } from "../../../src/components/interface-base/Stack/Stack";

describe("MoorhenStack", () => {
    test("renders children", () => {
        render(
            <MoorhenStack>
                <p>Stack child</p>
            </MoorhenStack>
        );
        expect(screen.getByText("Stack child")).toBeInTheDocument();
    });

    test("renders as row when direction is row", () => {
        const { container } = render(
            <MoorhenStack direction="row">
                <p>Row item</p>
            </MoorhenStack>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv.className).toContain("moorhen__stack__row");
    });

    test("renders as column by default", () => {
        const { container } = render(
            <MoorhenStack>
                <p>Column item</p>
            </MoorhenStack>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv.className).toContain("moorhen__stack__column");
    });

    test("renders as column when direction is vertical", () => {
        const { container } = render(
            <MoorhenStack direction="vertical">
                <p>Vertical item</p>
            </MoorhenStack>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv.className).toContain("moorhen__stack__column");
    });

    test("applies card class when card is true", () => {
        const { container } = render(
            <MoorhenStack card={true}>
                <p>Card stack</p>
            </MoorhenStack>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv.className).toContain("moorhen__stack_card");
    });

    test("applies margin class when addMargin is true and not card", () => {
        const { container } = render(
            <MoorhenStack addMargin={true}>
                <p>Margins</p>
            </MoorhenStack>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv.className).toContain("moorhen__stack_margins");
    });

    test("uses inputGrid class when inputGrid is true", () => {
        const { container } = render(
            <MoorhenStack inputGrid={true}>
                <p>Input grid</p>
            </MoorhenStack>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv.className).toContain("moorhen__input-grid");
    });

    test("applies custom className", () => {
        const { container } = render(
            <MoorhenStack className="my-custom-class">
                <p>Custom class</p>
            </MoorhenStack>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv.className).toContain("my-custom-class");
    });

    test("sets gap from props", () => {
        const { container } = render(
            <MoorhenStack gap="2rem">
                <p>Gapped</p>
            </MoorhenStack>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv).toHaveStyle("gap: 2rem");
    });

    test("sets justifyContent from justify prop", () => {
        const { container } = render(
            <MoorhenStack justify="center">
                <p>Centered</p>
            </MoorhenStack>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv).toHaveStyle("justify-content: center");
    });

    test("sets alignItems from align prop", () => {
        const { container } = render(
            <MoorhenStack align="stretch">
                <p>Stretched</p>
            </MoorhenStack>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv).toHaveStyle("align-items: stretch");
    });

    test("merges custom styles", () => {
        const { container } = render(
            <MoorhenStack style={{ backgroundColor: "red", padding: "10px" }}>
                <p>Styled</p>
            </MoorhenStack>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv).toHaveStyle("background-color: red");
        expect(stackDiv).toHaveStyle("padding: 10px");
    });

    test("sets overflow from prop", () => {
        const { container } = render(
            <MoorhenStack overflow="auto">
                <p>Auto overflow</p>
            </MoorhenStack>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv).toHaveStyle("overflow: auto");
    });

    test("sets flex from prop", () => {
        const { container } = render(
            <MoorhenStack flex={0}>
                <p>No flex</p>
            </MoorhenStack>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv).toHaveStyle("flex: 0");
    });

    test("forwards ref", () => {
        const ref = { current: null };
        render(
            <MoorhenStack ref={ref}>
                <p>Ref item</p>
            </MoorhenStack>
        );
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
});
