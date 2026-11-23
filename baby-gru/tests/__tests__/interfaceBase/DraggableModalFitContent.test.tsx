import "@testing-library/jest-dom";
import { act, fireEvent } from "@testing-library/react";
import { MoorhenDraggableModalBase } from "../../../src/components/interface-base/ModalBase/DraggableModalBase";
import { renderWithinInstance } from "../testUtils";

// jsdom has no layout: content sizes are set by hand, and ResizeObserver is driven by the test
let resizeCallbacks: (() => void)[] = [];
beforeEach(() => {
    resizeCallbacks = [];
    global.ResizeObserver = class {
        constructor(callback: () => void) {
            resizeCallbacks.push(callback);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
});

/**
 * The content grows to `width` x `height` (scroll size of the modal body), and the observers fire.
 * The modal is drawn at its size, but at least `minHeight` tall (as a CSS minimum would); its body
 * shows the drawn size minus 100px, as header, footer and margins would take.
 */
const contentGrowsTo = (container: HTMLElement, width: number, height: number, minHeight = 0) => {
    const body = container.querySelector(".moorhen__modal-body") as HTMLElement;
    const modal = container.querySelector(".moorhen__modal-base-container") as HTMLElement;
    const drawn = () => ({ width: parseFloat(modal.style.width), height: Math.max(minHeight, parseFloat(modal.style.height)) });
    modal.getBoundingClientRect = () => ({ ...drawn(), x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) });
    Object.defineProperty(body, "scrollWidth", { configurable: true, value: width });
    Object.defineProperty(body, "scrollHeight", { configurable: true, value: height });
    Object.defineProperty(body, "clientWidth", { configurable: true, get: () => drawn().width - 100 });
    Object.defineProperty(body, "clientHeight", { configurable: true, get: () => drawn().height - 100 });
    act(() => resizeCallbacks.forEach(callback => callback()));
};

const modalSize = (container: HTMLElement) => {
    const modal = container.querySelector(".moorhen__modal-base-container") as HTMLElement;
    return [parseFloat(modal.style.width), parseFloat(modal.style.height)];
};

const renderModal = (fitContent: boolean, modalId: string) =>
    renderWithinInstance(
        <MoorhenDraggableModalBase
            modalId={modalId}
            headerTitle="Test"
            body={<div>content</div>}
            initialWidth={300}
            initialHeight={200}
            maxWidth={1000}
            maxHeight={800}
            fitContent={fitContent}
        />
    );

describe("MoorhenDraggableModalBase fitContent", () => {
    test("grows to fit content that grows after opening, within the maximum size", () => {
        const { container } = renderModal(true, "fit-grow");
        expect(modalSize(container)).toEqual([300, 200]);

        contentGrowsTo(container, 150, 400);
        // Grown by exactly what did not fit (400 - (200 - 100)); the narrower content keeps the width
        expect(modalSize(container)).toEqual([300, 500]);

        contentGrowsTo(container, 2000, 2000);
        expect(modalSize(container)).toEqual([1000, 800]);
    });

    test("grows from the size drawn, when a CSS minimum makes the modal taller than its size", () => {
        const { container } = renderModal(true, "fit-min");
        // Drawn 350 tall (body shows 250) although its size is 200: 100 more is needed for 350 of content
        contentGrowsTo(container, 150, 350, 350);
        expect(modalSize(container)).toEqual([300, 450]);
    });

    test("stops once the user resizes the modal", () => {
        const { container } = renderModal(true, "fit-user");
        const resizeButton = container.querySelector(".moorhen__modal-resize-button") as HTMLElement;
        fireEvent.mouseDown(resizeButton);
        fireEvent.pointerUp(window);
        const before = modalSize(container);
        contentGrowsTo(container, 600, 600);
        expect(modalSize(container)).toEqual(before);
    });

    test("does nothing without fitContent", () => {
        const { container } = renderModal(false, "fit-off");
        contentGrowsTo(container, 600, 600);
        expect(modalSize(container)).toEqual([300, 200]);
    });
});
