import { useSyncExternalStore } from "react";
import type * as quat4 from "gl-matrix/quat";

/**
 * The view rotation the 2D overlay draws with (the axes; and, being handed anew, the prompt to
 * redraw the scale bar after a zoom), held outside React state.
 *
 * It used to be useState in MoorhenWebMG, set by every frame. While WebGPU draws, each frame hands
 * a fresh copy, so each frame re-rendered MoorhenWebMG and everything under it - MGWebGL, the
 * WebGPU view, the 2D overlay, the hover and drag helpers - sixty times a second during a rotation,
 * with a JSON.parse of the shortcuts and a pile of new closures each time. Chrome hides that;
 * Firefox showed it as hitches. Now only the 2D overlay, which subscribes, renders on a new
 * rotation.
 */
export interface DrawQuatStore {
    get(): quat4.quat;
    /** A different array notifies subscribers; the same one again does nothing, as setState did. */
    set(quat: quat4.quat): void;
    subscribe(listener: () => void): () => void;
}

export function createDrawQuatStore(initial: quat4.quat): DrawQuatStore {
    let current = initial;
    const listeners = new Set<() => void>();
    return {
        get: () => current,
        set: (quat: quat4.quat) => {
            if (quat === current) return;
            current = quat;
            listeners.forEach(listener => listener());
        },
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
    };
}

const IDENTITY: quat4.quat = [0, 0, 0, -1] as unknown as quat4.quat;
const noStore: DrawQuatStore = createDrawQuatStore(IDENTITY);

/** The store's rotation, re-rendering the caller when it changes. Without a store, the identity. */
export function useDrawQuat(store: DrawQuatStore | null | undefined): quat4.quat {
    const source = store ?? noStore;
    return useSyncExternalStore(source.subscribe, source.get);
}
