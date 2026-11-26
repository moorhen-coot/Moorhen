/*
 * The shared text editor (2D text overlays and 3D annotations), and the annotations panel.
 *
 * The editor: one LaTeX switch, with the font and filled/outline choices hidden for LaTeX.
 * The panel: Apply adds a new annotation, then edits that one in place; Delete removes it.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { useState } from "react";
import "./testUtils";
import { createMoorhenStore } from "@/store/MoorhenReduxStore";
import { MoorhenMenuSystem } from "@/components/menu-system/MenuSystem";
import { MoorhenInstanceProvider } from "@/InstanceManager";
import { MoorhenTextStyleEditor } from "@/components/inputs";
import { MoorhenAnnotations } from "@/components/modal/MoorhenAnnotationsModal";
import type { MoorhenTextStyle } from "@/utils/textStyle";

const EditorHarness = (props: { initial: MoorhenTextStyle; seen: MoorhenTextStyle[] }) => {
    const [value, setValue] = useState(props.initial);
    return (
        <MoorhenTextStyleEditor
            value={value}
            onChange={changes => {
                const next = { ...value, ...changes };
                props.seen.push(next);
                setValue(next);
            }}
        />
    );
};

const switchFor = (container: HTMLElement, index: number) =>
    container.querySelectorAll<HTMLInputElement>("input.moorhen__toggle-input")[index];

describe("MoorhenTextStyleEditor", () => {
    test("the LaTeX switch hides the font and style, and keeps the colour", () => {
        const store = createMoorhenStore();
        const seen: MoorhenTextStyle[] = [];
        const { container } = render(
            <Provider store={store}>
                <MoorhenInstanceProvider menuSystem={new MoorhenMenuSystem()}>
                    <EditorHarness initial={{ text: "x^2", fontFamily: "serif", fontPixelSize: 20, drawStyle: "stroke" }} seen={seen} />
                </MoorhenInstanceProvider>
            </Provider>
        );
        expect(screen.getByText("Font")).toBeInTheDocument();
        expect(screen.getByText("Style")).toBeInTheDocument();
        expect(screen.getByText("Line width")).toBeInTheDocument();

        act(() => {
            fireEvent.click(switchFor(container, 0));
        });
        expect(seen[seen.length - 1].latex).toBe(true);
        expect(screen.queryByText("Font")).not.toBeInTheDocument();
        expect(screen.queryByText("Style")).not.toBeInTheDocument();
        expect(screen.queryByText("Line width")).not.toBeInTheDocument();
        expect(screen.getByText("Colour")).toBeInTheDocument();
        // Switching does not throw away the plain-text settings.
        expect(seen[seen.length - 1].fontFamily).toBe("serif");
        expect(seen[seen.length - 1].drawStyle).toBe("stroke");
    });
});

describe("annotations panel", () => {
    test("Apply adds, then edits the same annotation; Delete removes it", () => {
        const store = createMoorhenStore();
        render(
            <Provider store={store}>
                <MoorhenInstanceProvider menuSystem={new MoorhenMenuSystem()}>
                    <MoorhenAnnotations />
                </MoorhenInstanceProvider>
            </Provider>
        );
        const apply = () =>
            act(() => {
                fireEvent.click(screen.getByText("Apply"));
            });

        apply();
        let list = store.getState().annotations.annotationsList;
        expect(list).toHaveLength(1);
        const uid = list[0].uniqueId;

        const textBox = screen.getByDisplayValue("Annotation");
        act(() => {
            fireEvent.change(textBox, { target: { value: "Active site" } });
        });
        apply();
        list = store.getState().annotations.annotationsList;
        expect(list).toHaveLength(1);
        expect(list[0]).toMatchObject({ uniqueId: uid, text: "Active site" });

        act(() => {
            fireEvent.click(screen.getByText("Delete"));
        });
        expect(store.getState().annotations.annotationsList).toEqual([]);
    });
});
