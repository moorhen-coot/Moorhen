/**
 * The depth state the shadow pass must establish for itself.
 *
 * This is a small function guarding a bug that was expensive to find: depth peeling left the depth
 * test disabled at the end of a frame, the shadow pass is the first thing the next frame does, and
 * a depth render with the test disabled writes nothing. The shadow map came out empty whenever
 * anything in the scene was transparent, which on screen looked like transparency switching off
 * everyone else's shadows.
 */
import { describe, expect, it } from "@jest/globals";
import { beginDepthOnlyPass, type DepthStateContext } from "../../src/WebGLgComponents/shadowPass";

const recordingContext = () => {
    const calls: string[] = [];
    const gl: DepthStateContext = {
        DEPTH_TEST: 0x0b71,
        LESS: 0x0201,
        enable: (cap) => { calls.push(`enable(${cap})`); },
        depthFunc: (func) => { calls.push(`depthFunc(${func})`); },
        depthMask: (flag) => { calls.push(`depthMask(${flag})`); },
    };
    return { gl, calls };
};

describe("preparing a depth-only pass", () => {
    it("enables the depth test, because disabling it suppresses depth writes entirely", () => {
        // The heart of the bug. It is natural to read a disabled depth test as "every fragment
        // passes", but GL also stops updating the depth buffer, so the texture keeps its cleared
        // value and every shadow lookup finds nothing in front of it.
        const { gl, calls } = recordingContext();
        beginDepthOnlyPass(gl);
        expect(calls).toContain(`enable(${gl.DEPTH_TEST})`);
    });

    it("keeps the nearest fragment", () => {
        const { gl, calls } = recordingContext();
        beginDepthOnlyPass(gl);
        expect(calls).toContain(`depthFunc(${gl.LESS})`);
    });

    it("allows depth writes", () => {
        // Transparent geometry elsewhere in the renderer draws with the mask off so it does not
        // occlude what is behind it. That setting must not reach a pass whose only output is depth.
        const { gl, calls } = recordingContext();
        beginDepthOnlyPass(gl);
        expect(calls).toContain("depthMask(true)");
    });

    it("sets every part of the state, inheriting none of it", () => {
        // The point of the function: the shadow pass runs first in the frame, so there is no
        // earlier pass in the same frame to have set any of this. Anything left unsaid is whatever
        // the previous frame happened to end with.
        const { gl, calls } = recordingContext();
        beginDepthOnlyPass(gl);
        expect(calls).toHaveLength(3);
    });
});
