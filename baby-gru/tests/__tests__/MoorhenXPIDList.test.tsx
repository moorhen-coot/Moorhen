/*
 * The XH-π list shows what is drawn: its rows follow the vectors in the store, whoever changed
 * them (a scene switch, a session load, the API), and its controls change only their own vectors.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import "./testUtils";
import { MoorhenMenuSystem } from "@/components/menu-system/MenuSystem";
import { createMoorhenStore } from "@/store/MoorhenReduxStore";
import { addVector, emptyVectors, removeVectorsByIds } from "@/store/vectorsSlice";
import type { MoorhenXPIDResult } from "@/components/card/MoleculeCard/list/MoorhenXPIDList";

// What Coot finds: two interactions
const interaction = (residue: number): MoorhenXPIDResult =>
    ({
        H_atom: "HH", X_atom: "OH", X_chain: "A", X_id: residue, X_res: "TYR",
        X_xyz_x: residue, X_xyz_y: 0, X_xyz_z: 0,
        angle_xh_pi: 150, angle_xpcn: 20, dist_X_Pi: 3.5, method: "test", model: "1", pdb: "test",
        pi_center_x: residue, pi_center_y: 3, pi_center_z: 0, pi_chain: "A", pi_id: residue + 10, pi_res: "PHE",
    }) as unknown as MoorhenXPIDResult;
const INTERACTIONS = [interaction(1), interaction(2)];

jest.mock("../../src/InstanceManager/hooks", () => ({
    ...jest.requireActual("../../src/InstanceManager/hooks"),
    useCommandCentre: () => ({
        current: {
            cootCommand: async () => ({ data: { result: { status: "Completed", result: JSON.stringify(INTERACTIONS) } } }),
        },
    }),
}));

// Imported after the mock
import { MoorhenXPIDList } from "@/components/card/MoleculeCard/list/MoorhenXPIDList";
import { MoorhenInstanceProvider } from "@/InstanceManager";

const molecule = {
    uniqueId: "mol-1",
    molNo: 0,
    gemmiStructure: null,
    ligandDicts: {},
    ligands: [],
    loadMissingMonomers: async () => {},
} as any;

const renderList = async () => {
    const store = createMoorhenStore();
    render(
        <Provider store={store}>
            <MoorhenInstanceProvider menuSystem={new MoorhenMenuSystem()}>
                <MoorhenXPIDList molecule={molecule} />
            </MoorhenInstanceProvider>
        </Provider>
    );
    await screen.findByText(/detected 2 in total/);
    // The two rows' toggles (the other one is "Show distance")
    const rows = () => screen.getAllByRole("checkbox").filter(box => box.closest("[data-xpid-index]")) as HTMLInputElement[];
    const drawn = () => store.getState().vectors.vectorsList;
    return { store, rows, drawn };
};

describe("the XH-π list", () => {
    test("draws and hides one interaction's vector at a time", async () => {
        const { rows, drawn } = await renderList();
        expect(rows().map(row => row.checked)).toEqual([false, false]);

        fireEvent.click(rows()[1]);
        expect(drawn()).toHaveLength(1);
        expect(rows().map(row => row.checked)).toEqual([false, true]);

        fireEvent.click(screen.getByText("Show all"));
        expect(drawn()).toHaveLength(2);
        fireEvent.click(rows()[0]);
        expect(drawn()).toHaveLength(1);
        fireEvent.click(screen.getByText("Hide all"));
        expect(drawn()).toHaveLength(0);
    });

    test("follows vectors changed elsewhere, as by a scene switch", async () => {
        const { store, rows, drawn } = await renderList();
        fireEvent.click(screen.getByText("Show all"));
        const [first, second] = drawn();

        // Another scene, without these vectors
        act(() => {
            store.dispatch(emptyVectors());
        });
        expect(rows().map(row => row.checked)).toEqual([false, false]);
        // A scene with only the second one, in its own colour
        act(() => {
            store.dispatch(addVector({ ...second, vectorColour: { r: 0, g: 0, b: 255 } }));
        });
        expect(rows().map(row => row.checked)).toEqual([false, true]);

        // Hiding it removes it, and leaves vectors that are not the list's alone
        const other = { ...first, uniqueId: "someone-else", tags: {} };
        act(() => {
            store.dispatch(addVector(other));
        });
        fireEvent.click(rows()[1]);
        expect(drawn().map(vector => vector.uniqueId)).toEqual(["someone-else"]);
        act(() => {
            store.dispatch(removeVectorsByIds(["someone-else"]));
        });
    });

    test("recognises the vectors already drawn when it opens", async () => {
        const first = await renderList();
        fireEvent.click(first.rows()[0]);
        const [vector] = first.drawn();

        // A list opened over a store that already has the first vector (e.g. from a session)
        const store = createMoorhenStore();
        store.dispatch(addVector(vector));
        render(
            <Provider store={store}>
                <MoorhenInstanceProvider menuSystem={new MoorhenMenuSystem()}>
                    <div data-testid="second">
                        <MoorhenXPIDList molecule={molecule} />
                    </div>
                </MoorhenInstanceProvider>
            </Provider>
        );
        const second = await screen.findByTestId("second");
        await waitFor(() => expect(second.querySelectorAll("[data-xpid-index]")).toHaveLength(2));
        const toggles = [...second.querySelectorAll("[data-xpid-index] input[type=checkbox]")] as HTMLInputElement[];
        expect(toggles.map(toggle => toggle.checked)).toEqual([true, false]);
    });
});
