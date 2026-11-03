import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { useMoorhenEvent, useMoorhenInstance, useMoorhenSelector } from "../../../src/WebComponent/utils/entry";
import { createMoorhenStore } from "../../../src/store/MoorhenReduxStore";
import { setDrawAxes } from "../../../src/store/sceneSettingsSlice";

// A stand-in for <moorhen-web-component>: only what the hooks use
class FakeMoorhenHost extends HTMLElement {
    public store = createMoorhenStore();
    public instance = { store: this.store, name: "the instance" };
    public getMoorhenInstance() {
        return Promise.resolve(this.instance);
    }
}

beforeAll(() => {
    customElements.define("moorhen-web-component", FakeMoorhenHost);
});

/** What a plugin does: content in a slot of the web component, finding Moorhen through a ref. */
const Plugin = () => {
    const ref = useRef<HTMLDivElement>(null);
    const instance = useMoorhenInstance(ref);
    const drawAxes = useMoorhenSelector(ref, state => state.sceneSettings.drawAxes);
    const buttonRef = useRef<HTMLButtonElement>(null);
    useMoorhenEvent(buttonRef, "change", button => (button.dataset.changes = String(Number(button.dataset.changes ?? 0) + 1)));
    return (
        <div ref={ref}>
            <span>instance: {instance ? "found" : "none"}</span>
            <span>axes: {String(drawAxes)}</span>
            <button ref={buttonRef}>events</button>
        </div>
    );
};

const ById = () => {
    const instance = useMoorhenInstance("by-id");
    const drawAxes = useMoorhenSelector("by-id", state => state.sceneSettings.drawAxes);
    return <span>by id: {instance ? "found" : "none"}, {String(drawAxes)}</span>;
};

/** Lets the instance promise resolve inside act(). */
const settle = () => act(async () => {});

describe("moorhen/web-component/utils hooks", () => {
    test("find the instance through a ref inside the web component, and follow the store from its current value", async () => {
        const host = document.createElement("moorhen-web-component") as FakeMoorhenHost;
        document.body.appendChild(host);
        host.store.dispatch(setDrawAxes(true));
        render(<Plugin />, { container: host.appendChild(document.createElement("div")) });
        await settle();

        await waitFor(() => expect(screen.getByText("instance: found")).toBeInTheDocument());
        // The current value at once, not only after the next change
        expect(screen.getByText("axes: true")).toBeInTheDocument();
        act(() => {
            host.store.dispatch(setDrawAxes(false));
        });
        expect(screen.getByText("axes: false")).toBeInTheDocument();
        host.remove();
    });

    test("find the instance by element id", async () => {
        const host = document.createElement("moorhen-web-component") as FakeMoorhenHost;
        host.id = "by-id";
        document.body.appendChild(host);
        render(<ById />);
        await settle();
        await waitFor(() => expect(screen.getByText("by id: found, false")).toBeInTheDocument());
        host.remove();
    });

    test("useMoorhenEvent listens to the element's event with the latest handler", async () => {
        const host = document.createElement("moorhen-web-component") as FakeMoorhenHost;
        document.body.appendChild(host);
        render(<Plugin />, { container: host.appendChild(document.createElement("div")) });
        await settle();
        const button = screen.getByText("events");
        button.dispatchEvent(new Event("change"));
        button.dispatchEvent(new Event("change"));
        expect(button.dataset.changes).toBe("2");
        host.remove();
    });
});
