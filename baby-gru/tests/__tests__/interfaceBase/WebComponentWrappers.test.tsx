import "@testing-library/jest-dom";
import { render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { MoorhenSliderElement, MoorhenToggleElement } from "../../../src/WebComponent/elements";
import { MoorhenChainSelectElement, MoorhenMoleculeSelectElement } from "../../../src/WebComponent/elements";
import { MoorhenChainSelect, MoorhenMoleculeSelect, MoorhenSlider, MoorhenToggle } from "../../../src/WebComponent/react/entry";
import { createMoorhenStore } from "../../../src/store/MoorhenReduxStore";
import { addMolecule } from "../../../src/store/moleculesSlice";

// jsdom has no ResizeObserver; popovers use it
global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

// A stand-in for <moorhen-web-component>: only what the elements use
class FakeMoorhenHost extends HTMLElement {
    public store = createMoorhenStore();
    public moorhenStyleSheet = "";
    public getMoorhenInstance() {
        return Promise.resolve({ store: this.store, getContainerRef: () => ({ current: null }) });
    }
}

beforeAll(() => {
    // The elements render themselves, as in a browser
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    customElements.define("moorhen-web-component", FakeMoorhenHost);
    customElements.define("moorhen-toggle", MoorhenToggleElement);
    customElements.define("moorhen-slider", MoorhenSliderElement);
    customElements.define("moorhen-molecule-select", MoorhenMoleculeSelectElement);
    customElements.define("moorhen-chain-select", MoorhenChainSelectElement);
});

/** Renders `ui` inside a fake web component, as plugin content. */
const renderInMoorhen = (ui: React.ReactElement) => {
    const host = document.createElement("moorhen-web-component") as FakeMoorhenHost;
    document.body.appendChild(host);
    const container = host.appendChild(document.createElement("div"));
    const result = render(ui, { container });
    return { host, ...result, rerender: (next: React.ReactElement) => result.rerender(next) };
};

afterEach(() => {
    document.body.innerHTML = "";
});

describe("React wrappers of the Moorhen UI elements", () => {
    test("camelCase props become the element's attributes, and the ref is the element", () => {
        const ref = createRef<MoorhenSliderElement>();
        renderInMoorhen(<MoorhenSlider ref={ref} label="Zoom" decimalPlaces={2} hideButtons min={1} max={5} className="zoom" />);
        const slider = ref.current!;
        expect(slider).toBeInstanceOf(MoorhenSliderElement);
        expect(slider.getAttribute("label")).toBe("Zoom");
        expect(slider.getAttribute("decimal-places")).toBe("2");
        expect(slider.getAttribute("hide-buttons")).toBe("");
        expect(slider.getAttribute("min")).toBe("1");
        expect(slider.className).toBe("zoom");
    });

    test("a value prop sets the property when it changes, and does not undo the user's change on other renders", async () => {
        const ref = createRef<MoorhenToggleElement>();
        const onChange = jest.fn();
        const { rerender } = renderInMoorhen(<MoorhenToggle ref={ref} checked={true} onChange={onChange}>Axes</MoorhenToggle>);
        const toggle = ref.current!;
        expect(toggle.checked).toBe(true);
        await waitFor(() => expect(toggle.shadowRoot?.querySelector("input")).toBeTruthy());

        // The user unticks: onChange gets the value
        toggle.shadowRoot!.querySelector("input")!.click();
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(false, toggle));

        // A re-render with the same prop keeps the user's state; a changed prop sets it
        rerender(<MoorhenToggle ref={ref} checked={true} onChange={onChange} label="Axes" />);
        expect(toggle.checked).toBe(false);
        rerender(<MoorhenToggle ref={ref} checked={false} onChange={onChange} label="Axes" />);
        rerender(<MoorhenToggle ref={ref} checked={true} onChange={onChange} label="Axes" />);
        expect(toggle.checked).toBe(true);
    });

    test("selects: onChange gets the unique id, or the list with multiple; for links them", async () => {
        const onMolecule = jest.fn();
        const onChains = jest.fn();
        const { host } = renderInMoorhen(
            <div>
                <MoorhenMoleculeSelect id="molecule" onChange={onMolecule} />
                <MoorhenChainSelect for="molecule" multiple onChange={onChains} />
            </div>
        );
        const molecule = document.querySelector("moorhen-molecule-select") as MoorhenMoleculeSelectElement;
        const chains = document.querySelector("moorhen-chain-select") as MoorhenChainSelectElement;
        await waitFor(() => expect(chains.shadowRoot?.querySelector(".moorhen__check-list")).toBeTruthy());
        host.store.dispatch(addMolecule({ molNo: 0, name: "first", uniqueId: "uid-0", sequences: [{ chain: "A", type: 1 }, { chain: "B", type: 1 }] } as never));
        host.store.dispatch(addMolecule({ molNo: 1, name: "second", uniqueId: "uid-1", sequences: [{ chain: "C", type: 1 }] } as never));
        await waitFor(() => expect(chains.values).toEqual(["A", "B"]));

        const select = molecule.shadowRoot!.querySelector("select")!;
        select.value = "uid-1";
        select.dispatchEvent(new Event("change", { bubbles: true }));
        await waitFor(() => expect(onMolecule).toHaveBeenCalledWith("uid-1", molecule));
        await waitFor(() => expect(chains.values).toEqual(["C"]));

        chains.shadowRoot!.querySelector("button")!.click(); // Check all is disabled: all ticked; untick through the list
        const box = chains.shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
        box.click();
        await waitFor(() => expect(onChains).toHaveBeenCalledWith([], chains));
    });
});
