/*
 * The 2D overlay's view rotation lives outside React state, so a frame does not re-render
 * MoorhenWebMG: only what subscribes to it renders again.
 */
import { act, render } from "@testing-library/react";
import { createDrawQuatStore, useDrawQuat, type DrawQuatStore } from "../../src/components/webMG/drawQuatStore";

const q = (w: number) => [0, 0, 0, w] as never;

describe("the 2D overlay's view rotation", () => {
    test("a new rotation notifies; the same array again does not", () => {
        const store = createDrawQuatStore(q(-1));
        const heard = jest.fn();
        const stop = store.subscribe(heard);
        const turned = q(0.5);
        store.set(turned);
        store.set(turned);
        expect(heard).toHaveBeenCalledTimes(1);
        expect(store.get()).toBe(turned);
        stop();
        store.set(q(0.25));
        expect(heard).toHaveBeenCalledTimes(1);
    });

    test("only the subscriber renders again, not its parent", () => {
        const renders = { parent: 0, child: 0 };
        let seen: unknown = null;
        const Child = ({ store }: { store: DrawQuatStore }) => {
            renders.child++;
            seen = useDrawQuat(store);
            return null;
        };
        const store = createDrawQuatStore(q(-1));
        const Parent = () => {
            renders.parent++;
            return <Child store={store} />;
        };
        render(<Parent />);
        const before = { ...renders };
        const turned = q(0.5);
        act(() => {
            for (let frame = 0; frame < 10; frame++) store.set(frame === 9 ? turned : q(frame));
        });
        expect(renders.parent).toBe(before.parent);
        expect(renders.child).toBeGreaterThan(before.child);
        expect(seen).toBe(turned);
    });

    test("without a store, the identity", () => {
        let seen: unknown = null;
        const Reader = () => {
            seen = useDrawQuat(null);
            return null;
        };
        render(<Reader />);
        expect(seen).toEqual([0, 0, 0, -1]);
    });
});
