/**
 * @jest-environment jsdom
 *
 * jsdom only for `document`, which is where the `zoomChanged` announcement goes. Nothing here
 * needs a canvas or a GL context.
 */
/**
 * Driving the camera from the renderer: the pump, the clock, and who is allowed to move it.
 *
 * These are the parts that used to be fifteen recursive requestAnimationFrame calls carrying their
 * own interpolation state, and they are the parts that fought a movie. The expectations below are
 * the behaviours that fight stated plainly, so it cannot start again quietly:
 *
 *   - a move can be asked for with no animation at all, which is the operation that did not exist
 *   - reconciliation defers to whoever is already driving, rather than racing them
 *   - the pump stops when the move does, rather than drawing forever
 *   - an export's clock and the wall clock go through the same code
 *
 * MGWebGL is stood in for by a small object with only the fields these functions touch. That is
 * not a convenience: the point of moving this logic out of the rAF loops is that it no longer
 * needs a GL context to be true, so the test does not conjure one.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CameraController, CameraState } from "../../src/WebGLgComponents/cameraController";
import {
    CENTRING_SECONDS,
    advanceCamera,
    moveCameraTo,
    setOriginOrientationAndZoomAnimated,
    stopPumpingCamera,
} from "../../src/WebGLgComponents/mgWebGLParts/cameraAnimations";

const startingAt = (overrides: Partial<CameraState> = {}): CameraState => ({
    quat: [0, 0, 0, -1],
    origin: [0, 0, 0],
    zoom: 1,
    eyeDistance: 250,
    clipFront: 250,
    clipBack: 750,
    fogFront: 0,
    fogBack: 1000,
    ...overrides,
});

/**
 * A hand-cranked requestAnimationFrame and clock, so a move can be stepped a frame at a time and
 * each frame's wall-clock time chosen. Real timers would make the duration assertions flaky, and
 * flaky timing tests get deleted.
 */
class FakeFrames {
    private pending: (() => void)[] = [];
    now = 0;

    request = (callback: () => void): number => {
        this.pending.push(callback);
        return this.pending.length;
    };

    cancel = (): void => { this.pending = []; };

    /** Run every frame currently queued, having advanced the clock by `seconds`. */
    step(seconds: number): void {
        this.now += seconds;
        const due = this.pending;
        this.pending = [];
        due.forEach(callback => callback());
    }

    get queued(): number { return this.pending.length; }
}

/**
 * Only the fields these functions touch.
 *
 * `zoom` is an accessor over the controller rather than a plain field, because that is exactly what
 * MGWebGL's is: the Camera facade reads it from the controller's live state. A plain field here
 * would let a test pass while the real `self.zoom` reported something stale.
 */
const fakeRenderer = (controller: CameraController) => ({
    animating: false,
    cameraPumpHandle: null as number | null,
    cameraTime: null as number | null,
    cameraController: controller,
    get zoom(): number { return controller.state.zoom; },
    drawScene: jest.fn(function (this: any) { advanceCamera(this as any); }),
    handleOriginUpdated: jest.fn(),
    applySlabToRenderer: jest.fn(),
});

let frames: FakeFrames;

beforeEach(() => {
    frames = new FakeFrames();
    globalThis.requestAnimationFrame = frames.request as any;
    globalThis.cancelAnimationFrame = frames.cancel as any;
    jest.spyOn(performance, "now").mockImplementation(() => frames.now * 1000);
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe("a move with no animation", () => {
    it("arrives at once, draws once, and schedules no frames", async () => {
        // The operation that did not exist before. A movie, a session restore and an API caller all
        // want to say where the camera is without animating to it, and previously could not.
        const self = fakeRenderer(new CameraController(startingAt()));

        const result = await moveCameraTo(self as any, { zoom: 4, origin: [1, 2, 3] }, { kind: "instant" });

        expect(result.completed).toBe(true);
        expect(self.cameraController.state.zoom).toBe(4);
        expect(self.cameraController.state.origin).toEqual([1, 2, 3]);
        expect(self.drawScene).toHaveBeenCalledTimes(1);
        expect(frames.queued).toBe(0);
    });

    it("leaves nobody holding the camera afterwards", () => {
        const self = fakeRenderer(new CameraController(startingAt()));
        moveCameraTo(self as any, { zoom: 4 }, { kind: "instant" });
        expect(self.cameraController.driver).toBeNull();
        expect(self.animating).toBe(false);
    });
});

describe("an eased move", () => {
    it("ends exactly on the target", async () => {
        const self = fakeRenderer(new CameraController(startingAt({ zoom: 1 })));

        const arrived = moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: CENTRING_SECONDS });
        frames.step(0);                        // the first frame fixes the origin of time
        frames.step(CENTRING_SECONDS);

        expect((await arrived).completed).toBe(true);
        expect(self.cameraController.state.zoom).toBeCloseTo(5, 10);
    });

    it("is somewhere in between on the way", () => {
        const self = fakeRenderer(new CameraController(startingAt({ zoom: 1 })));

        moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: CENTRING_SECONDS });
        frames.step(0);
        frames.step(CENTRING_SECONDS / 2);

        const half = self.cameraController.state.zoom;
        expect(half).toBeGreaterThan(1);
        expect(half).toBeLessThan(5);
    });

    it("takes its duration from the clock, not from a frame count", async () => {
        // The old loop ran for fifteen frames whatever they cost, so a heavy scene got a longer
        // move. Two slow frames should finish this one, where fifteen fast ones would not.
        const self = fakeRenderer(new CameraController(startingAt({ zoom: 1 })));

        const arrived = moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: CENTRING_SECONDS });
        frames.step(0);
        frames.step(CENTRING_SECONDS);

        expect((await arrived).completed).toBe(true);
        expect(self.drawScene).toHaveBeenCalledTimes(2);
    });

    it("stops pumping when it arrives", async () => {
        const self = fakeRenderer(new CameraController(startingAt()));

        const arrived = moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: CENTRING_SECONDS });
        frames.step(0);
        expect(frames.queued).toBe(1);         // still going, so another frame is booked

        frames.step(CENTRING_SECONDS);
        await arrived;
        expect(frames.queued).toBe(0);
        expect(self.cameraPumpHandle).toBeNull();
        expect(self.cameraController.moving).toBe(false);
    });

    it("says it is animating while it runs, and not afterwards", async () => {
        const self = fakeRenderer(new CameraController(startingAt()));

        const arrived = moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: CENTRING_SECONDS });
        expect(self.animating).toBe(true);

        frames.step(0);
        frames.step(CENTRING_SECONDS);
        await arrived;
        expect(self.animating).toBe(false);
    });
});

describe("the arrays the renderer hands out", () => {
    it("are not replaced while the camera moves", () => {
        // MGWebGL gives `myQuat` and `origin` straight to code that mutates them in place, and to
        // React via setDrawQuat. A fresh array each frame would detach those mutations and re-render
        // the component tree for every frame of every move - sixty wasted renders a second, on a
        // path whose whole point is that it is fast.
        const controller = new CameraController(startingAt({ zoom: 1 }));
        const self = fakeRenderer(controller);
        const quatBefore = controller.state.quat;
        const originBefore = controller.state.origin;

        moveCameraTo(self as any, { zoom: 5, origin: [9, 9, 9] }, { kind: "ease", seconds: CENTRING_SECONDS });
        frames.step(0);
        frames.step(CENTRING_SECONDS / 2);
        expect(controller.state.quat).toBe(quatBefore);
        expect(controller.state.origin).toBe(originBefore);

        frames.step(CENTRING_SECONDS);
        expect(controller.state.quat).toBe(quatBefore);
        expect(controller.state.origin).toBe(originBefore);
        expect(originBefore[0]).toBeCloseTo(9, 10);
    });

    it("keep whatever array type MGWebGL installed", () => {
        // myQuat is a Float32Array from quat4.create(). Replacing it mid-move with a plain array of
        // doubles would be a silent change of numeric type in the hot path.
        const controller = new CameraController(startingAt());
        (controller.liveState as any).quat = new Float32Array([0, 0, 0, -1]);
        const self = fakeRenderer(controller);

        moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: CENTRING_SECONDS });
        frames.step(0);
        frames.step(CENTRING_SECONDS);

        expect(controller.state.quat).toBeInstanceOf(Float32Array);
    });

    it("do not alias what a caller passed in", () => {
        // Keeping the array is not the same as adopting the caller's. A target the caller goes on
        // to reuse must not reach back into the camera.
        const controller = new CameraController(startingAt());
        const self = fakeRenderer(controller);
        const passed: [number, number, number] = [1, 2, 3];

        moveCameraTo(self as any, { origin: passed }, { kind: "instant" });
        passed[0] = 99;

        expect(controller.state.origin).toEqual([1, 2, 3]);
    });
});

describe("deferring rather than fighting", () => {
    it("declines while a movie holds the camera, and does not move it", async () => {
        // This is the loop. The reconciling effect cannot tell "centre here" from "the store and
        // the renderer have drifted", so while a movie is driving it must assume the latter.
        const controller = new CameraController(startingAt({ zoom: 1 }));
        const self = fakeRenderer(controller);
        controller.acquire("movie").set({ zoom: 9 });

        const result = await moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: 1 });

        expect(result.completed).toBe(false);
        expect(controller.state.zoom).toBe(9);
        expect(controller.driver).toBe("movie");
        expect(frames.queued).toBe(0);
    });

    it("no longer consults `animating`, which only ever stood in for ownership", () => {
        // It used to decline while this flag was set, because a movie had no way to say it owned
        // the camera and set it by hand instead. A movie now acquires a driver, and asking who is
        // driving is the whole question - so a stale flag cannot silently swallow a move.
        const self = fakeRenderer(new CameraController(startingAt({ zoom: 1 })));
        self.animating = true;

        moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: CENTRING_SECONDS });
        frames.step(0);
        frames.step(CENTRING_SECONDS);

        expect(self.cameraController.state.zoom).toBeCloseTo(5, 10);
    });

    it("supersedes a centring move of its own rather than declining it", async () => {
        // Deference is for other drivers. Two centring requests are the same source asking
        // twice, and the later one is the better one - it is what the store holds now.
        //
        // Declining instead lost the second view outright: nothing retries a declined move, and
        // the reconciling effect only re-fires when the stored camera changes again. Loading a
        // molecule centres it twice inside the quarter second a move takes, so the view stayed
        // where the first move put it - off the structure, showing nothing - until the user
        // nudged the mouse and the effect ran once more.
        const self = fakeRenderer(new CameraController(startingAt({ zoom: 1 })));

        const first = moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: CENTRING_SECONDS });
        const second = moveCameraTo(self as any, { zoom: 100 }, { kind: "ease", seconds: CENTRING_SECONDS });

        expect((await first).completed).toBe(false);

        frames.step(0);
        frames.step(CENTRING_SECONDS);
        expect((await second).completed).toBe(true);
        expect(self.cameraController.state.zoom).toBeCloseTo(100, 10);
    });

    it("keeps `animating` set when the move it replaced settles", async () => {
        // The superseded move's continuation runs after the replacement has already set the flag.
        // Clearing it there would say the camera had come to rest while it was still moving, and
        // drawScene reads exactly that as permission to echo the quaternion into the store - an
        // echo that re-enters the reconciliation mid-move, which is the fight this whole design
        // exists to end.
        const self = fakeRenderer(new CameraController(startingAt({ zoom: 1 })));

        const first = moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: CENTRING_SECONDS });
        moveCameraTo(self as any, { zoom: 100 }, { kind: "ease", seconds: CENTRING_SECONDS });
        await first;

        expect(self.animating).toBe(true);
    });
});

describe("the clock", () => {
    it("uses the wall clock by default", () => {
        const self = fakeRenderer(new CameraController(startingAt({ zoom: 1 })));
        moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: 1 });

        frames.step(0);
        const before = self.cameraController.state.zoom;
        frames.step(0.5);
        expect(self.cameraController.state.zoom).toBeGreaterThan(before);
    });

    it("uses cameraTime instead when an export sets it", async () => {
        // An export draws as fast as it can and keeps every frame, so wall-clock time must not be
        // what decides where the camera is. Three frames at a third of a second each, with the
        // wall clock not moving at all, still arrive.
        const self = fakeRenderer(new CameraController(startingAt({ zoom: 1 })));
        const arrived = moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: 1 });

        for (const t of [0, 0.5, 1.0]) {
            self.cameraTime = t;
            self.drawScene();
        }

        expect((await arrived).completed).toBe(true);
        expect(self.cameraController.state.zoom).toBeCloseTo(5, 10);
        expect(frames.now).toBe(0);
    });

    it("costs nothing at all when nothing is moving", () => {
        const self = fakeRenderer(new CameraController(startingAt()));
        advanceCamera(self as any);
        expect(performance.now).not.toHaveBeenCalled();
    });

    it("brings the clip planes and fog up to date on every frame, moving or not", () => {
        // They are derived from the camera rather than stored beside it, and this is the one place
        // that derives them. Unconditional, so a frame cannot be drawn against a stale slab - the
        // alternative being to work out which of the writers forgot to say so.
        const self = fakeRenderer(new CameraController(startingAt()));

        advanceCamera(self as any);
        expect(self.applySlabToRenderer).toHaveBeenCalledTimes(1);

        moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: CENTRING_SECONDS });
        frames.step(0);
        frames.step(CENTRING_SECONDS);
        expect(self.applySlabToRenderer).toHaveBeenCalledTimes(3);
    });
});

describe("centring, as the reconciling effect asks for it", () => {
    it("arrives, and announces arrival the way everything downstream expects", async () => {
        // autoClipFogByZoom hangs off `zoomChanged`, and map recontouring off handleOriginUpdated.
        // The mechanism underneath changed; this contract did not.
        const self = fakeRenderer(new CameraController(startingAt({ zoom: 1 })));
        const announced: any[] = [];
        const listener = (event: any) => announced.push(event.detail);
        document.addEventListener("zoomChanged", listener);

        setOriginOrientationAndZoomAnimated(self as any, [-1, -2, -3], [0, 0, 0, -1] as any, 2.5);
        frames.step(0);
        frames.step(CENTRING_SECONDS);
        await Promise.resolve();
        await Promise.resolve();

        document.removeEventListener("zoomChanged", listener);

        expect(self.cameraController.state.origin[0]).toBeCloseTo(-1, 12);
        expect(self.cameraController.state.origin[1]).toBeCloseTo(-2, 12);
        expect(self.cameraController.state.origin[2]).toBeCloseTo(-3, 12);
        expect(self.cameraController.state.zoom).toBeCloseTo(2.5, 12);
        expect(self.handleOriginUpdated).toHaveBeenCalledWith(true);
        expect(announced).toEqual([{ oldZoom: 1, newZoom: self.cameraController.state.zoom }]);
    });

    it("lands well inside the tolerance the effect reconciles against", () => {
        // This is why the loop closes. MoorhenWebMG re-fires its effect when the store and the
        // renderer differ by more than 1e-5, and the echo of a finished move puts the target into
        // the store. If arrival were not inside that tolerance, each move would provoke the next,
        // which is the shape of the bug this whole change exists to remove. The spline does not
        // land on the endpoint exactly - it is out by about 4e-16 - and that is eleven orders of
        // magnitude of headroom.
        const self = fakeRenderer(new CameraController(startingAt({ zoom: 1 })));
        setOriginOrientationAndZoomAnimated(self as any, [-1, -2, -3], [0, 0, 0, -1] as any, 2.5);
        frames.step(0);
        frames.step(CENTRING_SECONDS);

        const landed = self.cameraController.state;
        expect(Math.abs(landed.origin[0] - -1)).toBeLessThan(1e-5);
        expect(Math.abs(landed.origin[1] - -2)).toBeLessThan(1e-5);
        expect(Math.abs(landed.origin[2] - -3)).toBeLessThan(1e-5);
        expect(Math.abs(landed.zoom - 2.5)).toBeLessThan(1e-5);
    });

    it("announces nothing when it was declined", async () => {
        const self = fakeRenderer(new CameraController(startingAt()));
        self.animating = true;
        const announced: any[] = [];
        const listener = (event: any) => announced.push(event.detail);
        document.addEventListener("zoomChanged", listener);

        setOriginOrientationAndZoomAnimated(self as any, [1, 2, 3], [0, 0, 0, -1] as any, 2);
        await Promise.resolve();
        await Promise.resolve();

        document.removeEventListener("zoomChanged", listener);

        expect(announced).toEqual([]);
        expect(self.handleOriginUpdated).not.toHaveBeenCalled();
    });
});

describe("tearing down", () => {
    it("cancels an outstanding frame, so nothing draws into a dead context", () => {
        const self = fakeRenderer(new CameraController(startingAt()));
        moveCameraTo(self as any, { zoom: 5 }, { kind: "ease", seconds: 1 });
        expect(frames.queued).toBe(1);

        stopPumpingCamera(self as any);

        expect(frames.queued).toBe(0);
        expect(self.cameraPumpHandle).toBeNull();
    });

    it("is harmless when nothing is pumping", () => {
        const self = fakeRenderer(new CameraController(startingAt()));
        expect(() => stopPumpingCamera(self as any)).not.toThrow();
    });
});

describe("a tick that happens inside a tick", () => {
    it("is refused, so a sampler's side effects cannot advance the clock", () => {
        // A driven movie's sampler runs from inside drawScene. Anything it does that causes
        // another draw - and asking for a redraw after changing the scene is an ordinary thing to
        // do - would tick again, sample at a later time, and recurse. Nothing in a fade converges,
        // because every nested sample differs from the last, so a whole segment could be consumed
        // inside one animation frame: the fade appeared to be skipped entirely.
        const camera = new CameraController(startingAt());
        const driver = camera.acquire("movie");
        const times: number[] = [];

        driver.drive(seconds => {
            times.push(seconds);
            // What a scene write that asks for a redraw amounts to, from in here.
            camera.tick(seconds + 0.5);
            return { zoom: 1 + seconds };
        });

        camera.tick(0);

        expect(times).toEqual([0]);
        expect(camera.state.zoom).toBe(1);
        driver.release();
    });
});
