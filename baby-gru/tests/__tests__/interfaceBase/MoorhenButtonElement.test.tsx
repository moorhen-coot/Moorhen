import "@testing-library/jest-dom";
import { waitFor } from "@testing-library/react";
import { MoorhenButtonElement } from "../../../src/WebComponent/elements";
import { createMoorhenStore } from "../../../src/store/MoorhenReduxStore";
import { setIsDark } from "../../../src/store/sceneSettingsSlice";

// A stand-in for <moorhen-web-component>: only what the UI elements use
class FakeMoorhenHost extends HTMLElement {
    public store = createMoorhenStore();
    public moorhenStyleSheet = ".moorhen__button__default { color: red; }";
    public getMoorhenInstance() {
        return Promise.resolve({ store: this.store });
    }
}

beforeAll(() => {
    // The element renders itself, as in a browser, so there is nothing for act() to wrap
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    customElements.define("moorhen-web-component", FakeMoorhenHost);
    customElements.define("moorhen-button", MoorhenButtonElement);
});

afterEach(() => {
    document.body.innerHTML = "";
});

const mount = async (html: string) => {
    document.body.innerHTML = `<moorhen-web-component><div slot="plugin">${html}</div></moorhen-web-component>`;
    const host = document.querySelector("moorhen-web-component") as FakeMoorhenHost;
    const element = document.querySelector("moorhen-button") as HTMLElement;
    await waitFor(() => expect(element.shadowRoot?.querySelector("button")).toBeInstanceOf(HTMLButtonElement));
    return { host, element, button: () => element.shadowRoot!.querySelector("button")! };
};

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
