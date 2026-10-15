/**
 * The camera controller: who owns the camera, and what happens when two things want it.
 *
 * The tests that matter are the ones that pin the behaviours the old arrangement got wrong -
 * reconciliation deferring to an active driver, a move finishing rather than being interrupted,
 * a turn during a move being kept rather than discarded, and the slab following zoom from inside
 * the single writer rather than by a listener. Those are the loop and the lost-input bugs stated
 * as expectations, so they cannot come back quietly.
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as quat4 from "gl-matrix/quat";
import { CameraController, CameraState, Quat } from "../../src/WebGLgComponents/cameraController";
import type { Movie } from "../../src/utils/cameraPath";

const identity: Quat = [0, 0, 0, 1];

const startingAt = (overrides: Partial<CameraState> = {}): CameraState => ({
    quat: identity,
    origin: [0, 0, 0],
    zoom: 1,
    eyeDistance: 250,
    // Offsets from the view centre now, all four of them - see CameraState.
    clipFront: 8,
    clipBack: 21,
    fogFront: 8,
    fogBack: 21,
    ...overrides,
});

const turnAboutY = (degrees: number): Quat => {
    const q = quat4.create();
    quat4.setAxisAngle(q, [0, 1, 0], (degrees * Math.PI) / 180);
    return [...q] as Quat;
};

describe("holding a camera", () => {
    it("starts where it was put", () => {
        const camera = new CameraController(startingAt({ zoom: 3 }));
        expect(camera.state.zoom).toBe(3);
        expect(camera.driver).toBeNull();
        expect(camera.moving).toBe(false);
    });

    it("does not hand out its insides", () => {
        const initial = startingAt();
        const camera = new CameraController(initial);
        initial.origin[0] = 99;
        expect(camera.state.origin[0]).toBe(0);
    });

    it("leaves unnamed fields strictly alone", () => {
        // The reason a target is partial: "zoom in but stay put" should not require restating
        // the orientation, nor reading it first in order to pass it back unchanged.
        const camera = new CameraController(startingAt({ zoom: 1, origin: [5, 6, 7] }));
        camera.acquire("api").set({ zoom: 4 });
        expect(camera.state.zoom).toBe(4);
        expect(camera.state.origin).toEqual([5, 6, 7]);
    });
});

describe("settle, which is what reconciliation becomes", () => {
    it("agrees with the store when nobody is driving", () => {
        const camera = new CameraController(startingAt());
        camera.settle({ zoom: 2 });
        expect(camera.state.zoom).toBe(2);
    });

    it("defers to an active driver", () => {
        // The loop, stated as an expectation. A move in progress means the store is out of date,
        // not that the camera is wrong - so reconciliation must not pull it back.
        const camera = new CameraController(startingAt());
        const movie = camera.acquire("movie");
        movie.set({ zoom: 5 });

        camera.settle({ zoom: 1 });

        expect(camera.state.zoom).toBe(5);
        movie.release();
    });

    it("agrees again once the driver lets go", () => {
        const camera = new CameraController(startingAt());
        const movie = camera.acquire("movie");
        movie.set({ zoom: 5 });
        movie.release();

        camera.settle({ zoom: 1 });
        expect(camera.state.zoom).toBe(1);
    });
});

describe("moving", () => {
    it("arrives, and not before", () => {
        const camera = new CameraController(startingAt({ zoom: 1 }));
        camera.acquire("centring").moveTo({ zoom: 2 }, { kind: "ease", seconds: 1 });

        camera.tick(100);              // the clock's origin is wherever the first tick lands
        expect(camera.state.zoom).toBeCloseTo(1, 6);

        camera.tick(100.5);
        expect(camera.state.zoom).toBeGreaterThan(1);
        expect(camera.state.zoom).toBeLessThan(2);

        camera.tick(101);
        expect(camera.state.zoom).toBeCloseTo(2, 6);
    });

    it("takes its time from the caller, not from a clock of its own", () => {
        // Why export and preview can share everything: one passes wall-clock, the other i/fps.
        const camera = new CameraController(startingAt({ zoom: 1 }));
        camera.acquire("movie").moveTo({ zoom: 2 }, { kind: "ease", seconds: 1 });

        camera.tick(0);
        camera.tick(0.5);
        const halfway = camera.state.zoom;

        const other = new CameraController(startingAt({ zoom: 1 }));
        other.acquire("movie").moveTo({ zoom: 2 }, { kind: "ease", seconds: 1 });
        other.tick(1000);
        other.tick(1000.5);

        expect(other.state.zoom).toBeCloseTo(halfway, 10);
    });

    it("resolves when it arrives", async () => {
        const camera = new CameraController(startingAt());
        const arrival = camera.acquire("centring").moveTo({ zoom: 2 }, { kind: "ease", seconds: 1 });
        camera.tick(0);
        camera.tick(1);
        await expect(arrival).resolves.toEqual({ completed: true });
    });

    it("is instant when asked to be", async () => {
        // The operation that did not exist, and the reason a movie had to fight the renderer.
        const camera = new CameraController(startingAt({ zoom: 1 }));
        const done = await camera.acquire("api").moveTo({ zoom: 7 }, { kind: "instant" });
        expect(camera.state.zoom).toBe(7);
        expect(done).toEqual({ completed: true });
        expect(camera.moving).toBe(false);
    });

    it("interpolates the orientation, not just the numbers", () => {
        const camera = new CameraController(startingAt());
        camera.acquire("centring").moveTo({ quat: turnAboutY(90) }, { kind: "ease", seconds: 1 });
        camera.tick(0);
        camera.tick(0.5);
        const halfway = quat4.fromValues(...camera.state.quat);
        const angle = (quat4.getAngle(quat4.fromValues(...identity), halfway) * 180) / Math.PI;
        expect(angle).toBeGreaterThan(10);
        expect(angle).toBeLessThan(80);
    });
});

describe("two things wanting the camera", () => {
    it("lets the newcomer take it", async () => {
        const camera = new CameraController(startingAt({ zoom: 1 }));
        const centring = camera.acquire("centring");
        const arrival = centring.moveTo({ zoom: 5 }, { kind: "ease", seconds: 1 });
        camera.tick(0);

        const movie = camera.acquire("movie");
        await expect(arrival).resolves.toEqual({ completed: false });
        expect(centring.active).toBe(false);
        expect(camera.driver).toBe("movie");
        movie.release();
    });

    it("ignores a superseded driver still holding its handle", () => {
        const camera = new CameraController(startingAt({ zoom: 1 }));
        const stale = camera.acquire("centring");
        camera.acquire("movie").set({ zoom: 5 });

        stale.set({ zoom: 99 });
        expect(camera.state.zoom).toBe(5);
    });

    it("reports who is driving", () => {
        const camera = new CameraController(startingAt());
        expect(camera.driver).toBeNull();
        const user = camera.acquire("user");
        expect(camera.driver).toBe("user");
        user.release();
        expect(camera.driver).toBeNull();
    });
});

describe("a turn arriving during a move", () => {
    it("is kept and applied on arrival, not discarded", () => {
        // Today a drag during a centring animation is silently lost: both write the quaternion
        // and the animation writes last. Accidental motion must not stop the camera arriving, but
        // deliberate motion should not vanish either.
        const camera = new CameraController(startingAt());
        const centring = camera.acquire("centring");
        centring.moveTo({ zoom: 2 }, { kind: "ease", seconds: 1 });
        camera.tick(0);

        centring.turnBy(turnAboutY(30));
        const duringMove = quat4.getAngle(quat4.fromValues(...identity), quat4.fromValues(...camera.state.quat));
        expect((duringMove * 180) / Math.PI).toBeCloseTo(0, 4);

        camera.tick(1);
        const afterArrival = quat4.getAngle(quat4.fromValues(...identity), quat4.fromValues(...camera.state.quat));
        expect((afterArrival * 180) / Math.PI).toBeCloseTo(30, 3);
    });

    it("accumulates several turns", () => {
        const camera = new CameraController(startingAt());
        const centring = camera.acquire("centring");
        centring.moveTo({ zoom: 2 }, { kind: "ease", seconds: 1 });
        camera.tick(0);
        centring.turnBy(turnAboutY(20));
        centring.turnBy(turnAboutY(20));
        camera.tick(1);

        const total = quat4.getAngle(quat4.fromValues(...identity), quat4.fromValues(...camera.state.quat));
        expect((total * 180) / Math.PI).toBeCloseTo(40, 3);
    });

    it("applies immediately when nothing is moving", () => {
        const camera = new CameraController(startingAt());
        camera.acquire("user").turnBy(turnAboutY(45));
        const angle = quat4.getAngle(quat4.fromValues(...identity), quat4.fromValues(...camera.state.quat));
        expect((angle * 180) / Math.PI).toBeCloseTo(45, 4);
    });

    it("does not need a driver, because the mouse must not supersede a move", () => {
        // The mouse turns the camera through this, not through a driver. Acquiring one would
        // supersede whatever was running, and the rule is the opposite: a move that has been asked
        // for should finish, and a nudge on the way must not stop the camera arriving.
        const camera = new CameraController(startingAt({ zoom: 1 }));
        const centring = camera.acquire("centring");
        const arrived = centring.moveTo({ zoom: 4 }, { kind: "ease", seconds: 1 });
        camera.tick(0);

        camera.turnBy(turnAboutY(30));
        expect(camera.driver).toBe("centring");
        expect(camera.moving).toBe(true);

        camera.tick(1);
        expect(camera.state.zoom).toBeCloseTo(4, 10);
        const angle = quat4.getAngle(quat4.fromValues(...identity), quat4.fromValues(...camera.state.quat));
        expect((angle * 180) / Math.PI).toBeCloseTo(30, 3);
        return expect(arrived).resolves.toEqual({ completed: true });
    });

    it("turns at once when nothing is moving, which is the ordinary drag", () => {
        const camera = new CameraController(startingAt());
        camera.turnBy(turnAboutY(15));
        camera.turnBy(turnAboutY(15));
        const angle = quat4.getAngle(quat4.fromValues(...identity), quat4.fromValues(...camera.state.quat));
        expect((angle * 180) / Math.PI).toBeCloseTo(30, 4);
    });
});

describe("driving frame by frame", () => {
    it("asks the driver where to be", () => {
        const camera = new CameraController(startingAt());
        const movie = camera.acquire("movie");
        movie.drive(seconds => ({ zoom: 1 + seconds }));

        camera.tick(0);
        expect(camera.state.zoom).toBe(1);
        camera.tick(2);
        expect(camera.state.zoom).toBe(3);
        movie.release();
    });

    it("stops being asked once released", () => {
        const camera = new CameraController(startingAt());
        const movie = camera.acquire("movie");
        const sample = jest.fn(() => ({ zoom: 9 }));
        movie.drive(sample);
        camera.tick(0);
        movie.release();
        camera.tick(1);
        expect(sample).toHaveBeenCalledTimes(1);
    });
});

describe("the slab", () => {
    it("is left alone under a manual policy", () => {
        const camera = new CameraController(startingAt({ clipFront: 8, clipBack: 21 }), { kind: "manual" });
        camera.acquire("api").set({ zoom: 4 });
        expect(camera.state.clipFront).toBe(8);
        expect(camera.state.clipBack).toBe(21);
    });

    it("follows zoom under an auto policy, from inside the one writer", () => {
        // autoClipFogByZoom as a policy rather than a listener: no event round trip, so no second
        // writer and nothing to reconcile.
        const camera = new CameraController(startingAt(),
            { kind: "auto", fieldDepthFront: 8, fieldDepthBack: 21 });
        camera.acquire("api").set({ zoom: 2 });
        expect(camera.state.clipFront).toBe(16);
        expect(camera.state.clipBack).toBe(42);
    });

    it("keeps following through a move, not only at its end", () => {
        const camera = new CameraController(startingAt(),
            { kind: "auto", fieldDepthFront: 8, fieldDepthBack: 21 });
        camera.acquire("centring").moveTo({ zoom: 3 }, { kind: "ease", seconds: 1 });
        camera.tick(0);
        camera.tick(0.5);
        expect(camera.state.clipFront).toBeCloseTo(camera.state.zoom * 8, 6);
        camera.tick(1);
        expect(camera.state.clipFront).toBeCloseTo(24, 6);
    });

    it("can be switched, as a session restore must", () => {
        const camera = new CameraController(startingAt(),
            { kind: "auto", fieldDepthFront: 8, fieldDepthBack: 21 });
        camera.slabPolicy = { kind: "manual" };
        camera.acquire("session").set({ zoom: 5, clipFront: 3, clipBack: 9 });
        expect(camera.state.clipFront).toBe(3);
        expect(camera.state.clipBack).toBe(9);
    });

    it("follows a zoom written straight through, which is how the renderer writes it", () => {
        // `self.zoom = x` happens all over MGWebGL - the wheel, the animation frames, setZoom. If
        // those did not re-derive, zoom and the slab would disagree until something else happened
        // to put them right, which is exactly what the zoomChanged round trip existed to do.
        const camera = new CameraController(startingAt(),
            { kind: "auto", fieldDepthFront: 8, fieldDepthBack: 21 });
        camera.writeLive({ zoom: 2 });
        expect(camera.state.clipFront).toBe(16);
        expect(camera.state.fogBack).toBe(42);
    });

    it("re-derives when asked, which is how the switch is turned on", () => {
        // Flipping "Reset clip and fog on zoom" should snap the slab to the current zoom there and
        // then, not leave it stale until the next time something moves. This used to be spelt
        // writeLive({}), back when the policy applied to every write; now that it only applies
        // when the zoom moves, an empty write means what it says and the switch asks explicitly.
        const camera = new CameraController(startingAt({ zoom: 3, clipFront: 99, clipBack: 99 }));
        camera.slabPolicy = { kind: "auto", fieldDepthFront: 8, fieldDepthBack: 21 };
        camera.reapplySlab();
        expect(camera.state.clipFront).toBe(24);
        expect(camera.state.clipBack).toBe(63);
        expect(camera.state.zoom).toBe(3);
    });

    it("changes nothing on an empty write", () => {
        const camera = new CameraController(startingAt({ zoom: 3, clipFront: 99, clipBack: 99 }),
            { kind: "auto", fieldDepthFront: 8, fieldDepthBack: 21 });
        camera.writeLive({});
        expect(camera.state.clipFront).toBe(99);
    });

    it("leaves a written slab alone under manual, so the sliders still work", () => {
        const camera = new CameraController(startingAt(), { kind: "manual" });
        camera.writeLive({ clipFront: 5, clipBack: 6 });
        expect(camera.state.clipFront).toBe(5);
        expect(camera.state.clipBack).toBe(6);
    });

    it("keeps a written slab under auto too, until the next zoom", () => {
        // This test used to assert the opposite, and the opposite was a regression found in review
        // of the camera PR: "reset clip and fog on zoom" had quietly become "reset clip and fog on
        // anything", so the keyboard shortcuts, the scene-slider handles and the scripting API all
        // had their values accepted and overwritten in the same breath - the shortcut still
        // raising its toast about it. On main the hand-set value stood until the next zoom, and it
        // does again.
        const camera = new CameraController(startingAt({ zoom: 1 }),
            { kind: "auto", fieldDepthFront: 8, fieldDepthBack: 21 });
        camera.writeLive({ clipFront: 5, clipBack: 6 });
        expect(camera.state.clipFront).toBe(5);
        expect(camera.state.clipBack).toBe(6);

        camera.writeLive({ zoom: 2 });
        expect(camera.state.clipFront).toBe(16);
    });

    it("leaves the slab alone when the camera only rotates", () => {
        // turnBy writes like anything else, so an unguarded policy re-derived on every drag event.
        const camera = new CameraController(startingAt({ zoom: 1 }),
            { kind: "auto", fieldDepthFront: 8, fieldDepthBack: 21 });
        camera.writeLive({ clipFront: 3 });
        camera.turnBy([0, 0.3827, 0, 0.9239]);
        expect(camera.state.clipFront).toBe(3);
    });

    it("is not touched by a move that was never asked to change it", () => {
        // The bug. An eased move is a two-keyframe movie built from the whole camera, so it carried
        // clip and fog whether or not anyone asked - and the next frame quietly put back a value a
        // slider had just set. A move is not wrong to end where it was told; it was wrong to have
        // an opinion about fields nobody mentioned.
        const camera = new CameraController(startingAt({ zoom: 1, clipFront: 8, clipBack: 21 }),
            { kind: "manual" });
        camera.acquire("centring").moveTo({ zoom: 5 }, { kind: "ease", seconds: 1 });
        camera.tick(0);

        camera.writeLive({ clipFront: 99, clipBack: 123 });   // a slider, mid-move
        camera.tick(0.5);
        expect(camera.state.clipFront).toBe(99);
        expect(camera.state.clipBack).toBe(123);

        camera.tick(1);
        expect(camera.state.clipFront).toBe(99);
        expect(camera.state.zoom).toBeCloseTo(5, 10);
    });

    it("is carried by a movie, whose keyframes were authored on purpose", () => {
        const camera = new CameraController(startingAt({ clipFront: 8 }), { kind: "manual" });
        // Annotated, so the compiler checks it. Unannotated, this literal kept its old field
        // names through a rename of Keyframe without tsc saying a word, and only the
        // assertion below noticed.
        const movie: Movie = {
            keyframes: [
                { quat: quat4.fromValues(0, 0, 0, 1), origin: [0, 0, 0] as [number, number, number],
                  zoom: 1, clipFront: 8, clipBack: 21, fogFront: 8, fogBack: 21 },
                { quat: quat4.fromValues(0, 0, 0, 1), origin: [0, 0, 0] as [number, number, number],
                  zoom: 1, clipFront: 40, clipBack: 60, fogFront: 40, fogBack: 60 },
            ],
            segments: [{ seconds: 1, motion: { kind: "move" as const } }],
        };
        camera.acquire("movie").moveTo({}, { kind: "path", movie });
        camera.tick(0);
        camera.tick(1);
        expect(camera.state.clipFront).toBeCloseTo(40, 6);
        expect(camera.state.fogBack).toBeCloseTo(60, 6);
    });

    it("applies an eye distance at once, since no path can interpolate one", () => {
        // Better than dropping it silently, which is what naming a field the keyframes have no
        // slot for used to do.
        const camera = new CameraController(startingAt({ eyeDistance: 250 }), { kind: "manual" });
        camera.acquire("api").moveTo({ eyeDistance: 400, zoom: 3 }, { kind: "ease", seconds: 1 });
        expect(camera.state.eyeDistance).toBe(400);
    });

    it("writes through regardless of who is driving, unlike settle", () => {
        // These are the renderer's own direct writes, which have always landed unconditionally.
        // They become a driver in the last slice; until then, dropping one would leave the slab
        // describing a zoom the camera is no longer at.
        const camera = new CameraController(startingAt());
        camera.acquire("movie");
        camera.writeLive({ zoom: 7 });
        expect(camera.state.zoom).toBe(7);
    });
});

describe("telling the world", () => {
    it("says so when the camera comes to rest, not every frame", () => {
        const camera = new CameraController(startingAt());
        const heard = jest.fn();
        camera.subscribe(heard);

        camera.acquire("centring").moveTo({ zoom: 2 }, { kind: "ease", seconds: 1 });
        camera.tick(0);
        camera.tick(0.25);
        camera.tick(0.5);
        camera.tick(0.75);
        expect(heard).not.toHaveBeenCalled();

        camera.tick(1);
        expect(heard).toHaveBeenCalledTimes(1);
    });

    it("says so immediately for a set, which has no duration", () => {
        const camera = new CameraController(startingAt());
        const heard = jest.fn();
        camera.subscribe(heard);
        camera.acquire("api").set({ zoom: 3 });
        expect(heard).toHaveBeenCalledTimes(1);
    });

    it("says so when a driven sequence is released", () => {
        const camera = new CameraController(startingAt());
        const heard = jest.fn();
        camera.subscribe(heard);
        const movie = camera.acquire("movie");
        movie.drive(seconds => ({ zoom: 1 + seconds }));
        camera.tick(0);
        camera.tick(5);
        expect(heard).not.toHaveBeenCalled();
        movie.release();
        expect(heard).toHaveBeenCalledTimes(1);
    });

    it("stops telling an unsubscribed listener", () => {
        const camera = new CameraController(startingAt());
        const heard = jest.fn();
        const stop = camera.subscribe(heard);
        stop();
        camera.acquire("api").set({ zoom: 3 });
        expect(heard).not.toHaveBeenCalled();
    });
});

describe("ticking when there is nothing to do", () => {
    it("changes nothing", () => {
        const camera = new CameraController(startingAt({ zoom: 2 }));
        camera.tick(0);
        camera.tick(10);
        expect(camera.state.zoom).toBe(2);
    });

    it("is harmless after everything has finished", () => {
        const camera = new CameraController(startingAt());
        camera.acquire("centring").moveTo({ zoom: 2 }, { kind: "ease", seconds: 1 });
        camera.tick(0);
        camera.tick(1);
        camera.tick(2);
        camera.tick(3);
        expect(camera.state.zoom).toBeCloseTo(2, 6);
    });
});
