import "@testing-library/jest-dom";
import { waitFor } from "@testing-library/react";
import {
    MoorhenButtonElement,
    MoorhenChainSelectElement,
    MoorhenColourPickerElement,
    MoorhenMapSelectElement,
    MoorhenMoleculeSelectElement,
    MoorhenSliderElement,
    MoorhenToggleElement,
} from "../../../src/WebComponent/elements";
import { addMap, removeMap } from "../../../src/store/mapsSlice";
import { createMoorhenStore } from "../../../src/store/MoorhenReduxStore";
import { addMolecule, removeMolecule } from "../../../src/store/moleculesSlice";
import { setIsDark } from "../../../src/store/sceneSettingsSlice";

// jsdom has no ResizeObserver; popovers use it
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

// A stand-in for <moorhen-web-component>: only what the UI elements use
class FakeMoorhenHost extends HTMLElement {
    public store = createMoorhenStore();
    public moorhenStyleSheet = ".moorhen__button__default { color: red; }";
    // Where popovers portal to, as Moorhen's popup container
    public popupContainer = { current: null as HTMLDivElement | null };
    public getMoorhenInstance() {
        return Promise.resolve({ store: this.store, getContainerRef: () => this.popupContainer });
    }
}

beforeAll(() => {
    // The element renders itself, as in a browser, so there is nothing for act() to wrap
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    customElements.define("moorhen-web-component", FakeMoorhenHost);
    customElements.define("moorhen-button", MoorhenButtonElement);
    customElements.define("moorhen-toggle", MoorhenToggleElement);
    customElements.define("moorhen-molecule-select", MoorhenMoleculeSelectElement);
    customElements.define("moorhen-map-select", MoorhenMapSelectElement);
    customElements.define("moorhen-chain-select", MoorhenChainSelectElement);
    customElements.define("moorhen-slider", MoorhenSliderElement);
    customElements.define("moorhen-colour-picker", MoorhenColourPickerElement);
});

afterEach(() => {
    document.body.innerHTML = "";
});

/** Mounts `html` as slotted content and waits until the element has rendered `ready` in its shadow root. */
const mountElement = async <T extends HTMLElement>(html: string, tag: string, ready: string) => {
    document.body.innerHTML = `<moorhen-web-component><div slot="plugin">${html}</div></moorhen-web-component>`;
    const host = document.querySelector("moorhen-web-component") as FakeMoorhenHost;
    const element = document.querySelector(tag) as T;
    await waitFor(() => expect(element.shadowRoot?.querySelector(ready)).toBeTruthy());
    return { host, element, inner: <E extends Element>(selector: string) => element.shadowRoot!.querySelector(selector) as E };
};

const mount = async (html: string) => {
    const { host, element, inner } = await mountElement(html, "moorhen-button", "button");
    return { host, element, button: () => inner<HTMLButtonElement>("button") };
};

// Just what the molecule and map selects read
const fakeMolecule = (molNo: number, name: string) => ({ molNo, name, uniqueId: `uid-${molNo}` }) as never;
const fakeMoleculeWithChains = (molNo: number, chains: string[]) =>
    ({ molNo, name: `m${molNo}`, uniqueId: `uid-${molNo}`, sequences: chains.map(chain => ({ chain, type: 1 })) }) as never;
const fakeMap = (molNo: number, name: string, isDifference = false) => ({ molNo, name, uniqueId: `map-${molNo}`, isDifference }) as never;

describe("<moorhen-button>", () => {
    test("renders a Moorhen button in its shadow root, with the host's stylesheet and a slot for its content", async () => {
        const { element, button } = await mount(`<moorhen-button label="Run" variant="secondary">more</moorhen-button>`);
        expect(button().className).toContain("moorhen__button__default");
        expect(button().className).toContain("secondary");
        expect(button().textContent).toContain("Run");
        expect(button().querySelector("slot")).not.toBeNull();
        expect(element.shadowRoot!.querySelector("style")!.textContent).toContain("color: red");
    });

    test("follows attribute changes", async () => {
        const { element, button } = await mount(`<moorhen-button label="Run"></moorhen-button>`);
        expect(button()).not.toBeDisabled();
        element.setAttribute("disabled", "");
        await waitFor(() => expect(button()).toBeDisabled());
        element.setAttribute("disabled", "false");
        await waitFor(() => expect(button()).not.toBeDisabled());
    });

    test("follows the app's theme from the store", async () => {
        const { host, element } = await mount(`<moorhen-button label="Run"></moorhen-button>`);
        const theme = () => element.shadowRoot!.querySelector("[data-theme]")!.getAttribute("data-theme");
        expect(theme()).toBe("light");
        host.store.dispatch(setIsDark(true));
        await waitFor(() => expect(theme()).toBe("dark"));
    });

    test("reports an error and renders nothing outside a <moorhen-web-component>", async () => {
        const error = jest.spyOn(console, "error").mockImplementation(() => {});
        document.body.innerHTML = `<moorhen-button label="Lost"></moorhen-button>`;
        expect(error).toHaveBeenCalledWith(expect.stringContaining("must be placed inside a <moorhen-web-component>"));
        expect(document.querySelector("moorhen-button")!.shadowRoot).toBeNull();
        error.mockRestore();
    });
});

describe("<moorhen-toggle>", () => {
    test("the attribute is the starting state, the property the current one, and only the user fires change", async () => {
        const { element, inner } = await mountElement<MoorhenToggleElement>(`<moorhen-toggle checked label="Option"></moorhen-toggle>`, "moorhen-toggle", "input");
        const input = () => inner<HTMLInputElement>("input");
        const onChange = jest.fn();
        element.addEventListener("change", onChange);
        expect(element.checked).toBe(true);
        expect(input().checked).toBe(true);

        input().click();
        await waitFor(() => expect(element.checked).toBe(false));
        expect(input().checked).toBe(false);
        expect(onChange).toHaveBeenCalledTimes(1);

        // The attribute no longer decides once the state was changed
        element.setAttribute("checked", "");
        await waitFor(() => expect(element.checked).toBe(false));

        element.checked = true;
        await waitFor(() => expect(input().checked).toBe(true));
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test("uses its content as the label when there is no label attribute", async () => {
        const { inner } = await mountElement(`<moorhen-toggle>Slotted label</moorhen-toggle>`, "moorhen-toggle", "input");
        expect(inner(".moorhen__toggle-label-text slot")).not.toBeNull();
    });
});

describe("<moorhen-molecule-select>", () => {
    const mountSelect = async (html: string, molecules: { molNo: number; name: string }[]) => {
        document.body.innerHTML = "";
        const mounted = await mountElement<MoorhenMoleculeSelectElement>(html, "moorhen-molecule-select", "select");
        molecules.forEach(m => mounted.host.store.dispatch(addMolecule(fakeMolecule(m.molNo, m.name))));
        const select = () => mounted.inner<HTMLSelectElement>("select");
        await waitFor(() => expect(select().options.length).toBeGreaterThanOrEqual(molecules.length || 1));
        return { ...mounted, select };
    };

    test("lists the store's molecules live and picks the first one by unique id, without an event", async () => {
        const onChange = jest.fn();
        const { host, element, select } = await mountSelect(`<moorhen-molecule-select></moorhen-molecule-select>`, [
            { molNo: 0, name: "first" },
            { molNo: 1, name: "second" },
        ]);
        element.addEventListener("change", onChange);
        await waitFor(() => expect(element.value).toBe("uid-0"));
        expect([...select().options].map(o => o.textContent)).toEqual(["0: first", "1: second"]);
        expect(onChange).not.toHaveBeenCalled();

        host.store.dispatch(addMolecule(fakeMolecule(2, "third")));
        await waitFor(() => expect(select().options.length).toBe(3));
        host.store.dispatch(removeMolecule(fakeMolecule(1, "second")));
        await waitFor(() => expect([...select().options].map(o => o.value)).toEqual(["uid-0", "uid-2"]));
    });

    test("fires change with the unique id when the user picks, and can be set from a script", async () => {
        const { element, select } = await mountSelect(`<moorhen-molecule-select value="uid-1"></moorhen-molecule-select>`, [
            { molNo: 0, name: "first" },
            { molNo: 1, name: "second" },
        ]);
        expect(element.value).toBe("uid-1");
        await waitFor(() => expect(select().value).toBe("uid-1"));

        const onChange = jest.fn(() => element.value);
        element.addEventListener("change", onChange);
        select().value = "uid-0";
        select().dispatchEvent(new Event("change", { bubbles: true }));
        await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
        expect(onChange).toHaveReturnedWith("uid-0");

        element.value = "uid-1";
        await waitFor(() => expect(select().value).toBe("uid-1"));
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test("reports Any molecule as null and applies the filter property", async () => {
        const { element, select } = await mountSelect(`<moorhen-molecule-select allow-any></moorhen-molecule-select>`, [
            { molNo: 0, name: "first" },
            { molNo: 1, name: "second" },
        ]);
        element.value = null;
        await waitFor(() => expect(select().value).toBe(""));
        expect(element.value).toBeNull();

        element.filter = molecule => molecule.molNo === 1;
        await waitFor(() => expect([...select().options].map(o => o.textContent)).toEqual(["1: second", "Any molecule"]));
    });
});

describe("<moorhen-map-select>", () => {
    const mountMapSelect = async (html: string, maps: { molNo: number; name: string; isDifference?: boolean }[]) => {
        const mounted = await mountElement<MoorhenMapSelectElement>(html, "moorhen-map-select", "select");
        maps.forEach(m => mounted.host.store.dispatch(addMap(fakeMap(m.molNo, m.name, m.isDifference))));
        const select = () => mounted.inner<HTMLSelectElement>("select");
        await waitFor(() => expect(select().options.length).toBe(maps.length || 1));
        return { ...mounted, select };
    };

    test("is disabled while there is no map, then lists the store's maps live and picks the first by unique id, without an event", async () => {
        const { host, element, select } = await mountMapSelect(`<moorhen-map-select></moorhen-map-select>`, []);
        expect(select().disabled).toBe(true);
        expect(element.value).toBeUndefined();

        const onChange = jest.fn();
        element.addEventListener("change", onChange);
        host.store.dispatch(addMap(fakeMap(0, "2fofc")));
        host.store.dispatch(addMap(fakeMap(1, "fofc", true)));
        await waitFor(() => expect(element.value).toBe("map-0"));
        expect(select().disabled).toBe(false);
        expect([...select().options].map(o => o.textContent)).toEqual(["0: 2fofc", "1: fofc"]);

        host.store.dispatch(removeMap(fakeMap(1, "fofc")));
        await waitFor(() => expect([...select().options].map(o => o.value)).toEqual(["map-0"]));
        expect(onChange).not.toHaveBeenCalled();
    });

    test("fires change with the unique id when the user picks, can be set from a script, and applies the filter", async () => {
        const { element, select } = await mountMapSelect(`<moorhen-map-select value="map-1"></moorhen-map-select>`, [
            { molNo: 0, name: "2fofc" },
            { molNo: 1, name: "fofc", isDifference: true },
        ]);
        await waitFor(() => expect(select().value).toBe("map-1"));

        const onChange = jest.fn(() => element.value);
        element.addEventListener("change", onChange);
        select().value = "map-0";
        select().dispatchEvent(new Event("change", { bubbles: true }));
        await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
        expect(onChange).toHaveReturnedWith("map-0");

        element.value = "map-1";
        await waitFor(() => expect(select().value).toBe("map-1"));
        expect(onChange).toHaveBeenCalledTimes(1);

        element.filter = map => map.isDifference;
        await waitFor(() => expect([...select().options].map(o => o.textContent)).toEqual(["1: fofc"]));
    });
});

/** Sets a native input's value the way a user edit does, so React sees it. */
const userSetsValue = (input: HTMLInputElement, value: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
};

/** A pointer pressed on `target` and released elsewhere in the page; resolves once the release was handled. */
const release = async (target: Element) => {
    target.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }));
    document.body.dispatchEvent(new Event("pointerup", { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 10));
};

describe("<moorhen-slider>", () => {
    test("fires input while the user drags, change once on release, nothing for a script", async () => {
        const { element, inner } = await mountElement<MoorhenSliderElement>(
            `<moorhen-slider label="Radius" min="0" max="50" value="10"></moorhen-slider>`,
            "moorhen-slider",
            'input[type="range"]'
        );
        const range = () => inner<HTMLInputElement>('input[type="range"]');
        expect(element.value).toBe(10);
        await waitFor(() => expect(range().value).toBe("10"));

        const onInput = jest.fn();
        const onChange = jest.fn(() => element.value);
        element.addEventListener("input", onInput);
        element.addEventListener("change", onChange);

        userSetsValue(range(), "20");
        userSetsValue(range(), "30");
        await waitFor(() => expect(element.value).toBe(30));
        expect(onInput.mock.calls.length).toBeGreaterThanOrEqual(2);
        expect(onChange).not.toHaveBeenCalled();

        // Released outside the element, as at the end of a drag
        await release(range());
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveReturnedWith(30);
        // Releasing again without a change does not repeat it
        await release(range());
        expect(onChange).toHaveBeenCalledTimes(1);

        element.value = 5;
        await waitFor(() => expect(range().value).toBe("5"));
        await release(range());
        expect(onChange).toHaveBeenCalledTimes(1);
    });
});

describe("<moorhen-colour-picker>", () => {
    test("reads and writes hex colours", async () => {
        const { element } = await mountElement<MoorhenColourPickerElement>(
            `<moorhen-colour-picker value="#f80"></moorhen-colour-picker>`,
            "moorhen-colour-picker",
            "button"
        );
        expect(element.value).toBe("#ff8800");
        element.value = "#123456";
        expect(element.value).toBe("#123456");
        element.setAttribute("use-alpha", "");
        expect(element.value).toBe("#123456ff");
        element.value = "#11223380";
        expect(element.value).toBe("#11223380");

        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        element.value = "orange";
        expect(element.value).toBe("#11223380");
        warn.mockRestore();
    });

    test("in a popover: input while picking, change when it closes", async () => {
        const { host, element, inner } = await mountElement<MoorhenColourPickerElement>(
            `<moorhen-colour-picker value="#000000"></moorhen-colour-picker>`,
            "moorhen-colour-picker",
            "button"
        );
        const popupLayer = document.createElement("div");
        document.body.appendChild(popupLayer);
        host.popupContainer.current = popupLayer;
        const onInput = jest.fn();
        const onChange = jest.fn(() => element.value);
        element.addEventListener("input", onInput);
        element.addEventListener("change", onChange);

        inner<HTMLButtonElement>("button").click();
        // The popover renders in Moorhen's popup layer; the first swatch is #f44336
        const swatch = await waitFor(() => {
            const button = [...popupLayer.querySelectorAll("button")].find(b => b.innerHTML.includes("rgb(244, 67, 54)"));
            expect(button).toBeTruthy();
            return button!;
        });
        swatch.click();
        await waitFor(() => expect(element.value).toBe("#f44336"));
        expect(onInput).toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();

        // Click away: the popover closes and the colour is committed
        document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
        expect(onChange).toHaveReturnedWith("#f44336");
    });
});

describe("<moorhen-chain-select>", () => {
    test("lists the chains of the molecule given by unique id, follows a molecule change, and fires change for the user", async () => {
        const { host, element, inner } = await mountElement<MoorhenChainSelectElement>(
            `<moorhen-chain-select molecule="uid-0"></moorhen-chain-select>`,
            "moorhen-chain-select",
            "select"
        );
        const select = () => inner<HTMLSelectElement>("select");
        expect(select().disabled).toBe(true);
        expect(element.value).toBeUndefined();

        host.store.dispatch(addMolecule(fakeMoleculeWithChains(0, ["A", "B"])));
        host.store.dispatch(addMolecule(fakeMoleculeWithChains(1, ["C"])));
        await waitFor(() => expect([...select().options].map(o => o.value)).toEqual(["A", "B"]));
        await waitFor(() => expect(element.value).toBe("A"));

        const onChange = jest.fn(() => element.value);
        element.addEventListener("change", onChange);
        select().value = "B";
        select().dispatchEvent(new Event("change", { bubbles: true }));
        await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
        expect(onChange).toHaveReturnedWith("B");

        // Another molecule: its first chain is picked by itself, without an event
        element.molecule = "uid-1";
        await waitFor(() => expect([...select().options].map(o => o.value)).toEqual(["C"]));
        await waitFor(() => expect(element.value).toBe("C"));
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test("reports All as null", async () => {
        const { host, element, inner } = await mountElement<MoorhenChainSelectElement>(
            `<moorhen-chain-select molecule="uid-0" allow-all></moorhen-chain-select>`,
            "moorhen-chain-select",
            "select"
        );
        host.store.dispatch(addMolecule(fakeMoleculeWithChains(0, ["A"])));
        await waitFor(() => expect([...inner<HTMLSelectElement>("select").options].map(o => o.value)).toEqual(["*", "A"]));
        await waitFor(() => expect(element.value).toBeNull());
        element.value = "A";
        await waitFor(() => expect(inner<HTMLSelectElement>("select").value).toBe("A"));
    });
});
