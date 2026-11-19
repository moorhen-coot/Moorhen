import "@testing-library/jest-dom";
import { act, render } from "@testing-library/react";
import { StrictMode, createRef } from "react";
import { Moorhen } from "../../../src/WebComponent/react/entry";

// A stand-in for <moorhen-web-component>: records the start-up properties, resolves an instance
class FakeMoorhenElement extends HTMLElement {
    public monomerLibraryPath?: string;
    public allowScripting?: boolean;
    public backupStorage?: unknown;
    public instance = { name: "the instance" };
    public getMoorhenInstance() {
        return Promise.resolve(this.instance);
    }
}

beforeAll(() => {
    customElements.define("moorhen-web-component", FakeMoorhenElement);
});

describe("<Moorhen>", () => {
    test("renders <moorhen-web-component> with its attributes, start-up properties, children and ref", async () => {
        const ref = createRef<FakeMoorhenElement>();
        const storage = { kind: "storage" };
        render(
            <Moorhen
                ref={ref as never}
                id="my-moorhen"
                className="viewer"
                width={1000}
                height="800"
                urlPrefix="/assets"
                viewOnly
                disableFileUploads={false}
                monomerLibraryPath="/monomers"
                allowScripting={false}
                backupStorage={storage as never}
            >
                <div slot="my-plugin">plugin</div>
            </Moorhen>
        );
        const element = ref.current!;
        expect(element).toBeInstanceOf(FakeMoorhenElement);
        expect(element.id).toBe("my-moorhen");
        expect(element.className).toBe("viewer");
        expect(element.getAttribute("width")).toBe("1000");
        expect(element.getAttribute("height")).toBe("800");
        expect(element.getAttribute("url-prefix")).toBe("/assets");
        // The element reads its boolean attributes as "true" / "false"
        expect(element.getAttribute("view-only")).toBe("true");
        expect(element.getAttribute("disable-file-uploads")).toBe("false");
        expect(element.monomerLibraryPath).toBe("/monomers");
        expect(element.allowScripting).toBe(false);
        expect(element.backupStorage).toBe(storage);
        expect(element.querySelector('[slot="my-plugin"]')).toHaveTextContent("plugin");
    });

    test("calls onReady once with the instance, also under StrictMode", async () => {
        const onReady = jest.fn();
        render(
            <StrictMode>
                <Moorhen onReady={onReady} />
            </StrictMode>
        );
        await act(async () => {});
        expect(onReady).toHaveBeenCalledTimes(1);
        expect(onReady).toHaveBeenCalledWith({ name: "the instance" });
    });
});
