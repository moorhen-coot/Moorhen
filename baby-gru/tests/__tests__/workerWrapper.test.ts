/**
 * The worker command queue (WorkerWrapper): commands wait in a list and are sent one at a time, the next one when
 * the worker has replied; a command with a squash key removes the waiting commands with the same key.
 *
 * `send` is a fake worker: each call returns a promise the test settles by hand, so the test controls when the
 * worker "replies".
 */
import { WorkerWrapper } from "../../src/InstanceManager/CommandCentre/WorkerWrapper";
import { CommandSquashedError, CootCommandError } from "../../src/InstanceManager/CommandCentre/CootCommandError";
import type { WorkerResponse, cootCommandKwargs } from "../../src/InstanceManager/CommandCentre/MoorhenCommandCentre";

type SentCommand = { kwargs: cootCommandKwargs; reply: (result: unknown, status?: string) => void; fail: (err: unknown) => void };

const makeWorker = () => {
    const sent: SentCommand[] = [];
    const send = (kwargs: cootCommandKwargs): Promise<WorkerResponse> =>
        new Promise((resolve, reject) => {
            sent.push({
                kwargs,
                reply: (result, status = "Completed") => resolve({ data: { result: { status, result } } } as WorkerResponse),
                fail: reject,
            });
        });
    return { wrapper: new WorkerWrapper(send), sent };
};

/** Let the queue react to settled promises */
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const contour = (wrapper: WorkerWrapper, imol: number, squashKey?: string) =>
    wrapper.get_map_contours_mesh(imol, [0, 0, 0], 10, 1, "lines_mesh", squashKey ? { squashKey } : undefined);

describe("WorkerWrapper queue", () => {
    test("sends one command at a time, in order, each once the previous one is replied to", async () => {
        const { wrapper, sent } = makeWorker();
        const results = [contour(wrapper, 1), contour(wrapper, 2), contour(wrapper, 3)];
        await flush();
        expect(sent.map(command => command.kwargs.commandArgs[0])).toEqual([1]);
        expect(wrapper.queueLength).toBe(2);

        sent[0].reply("mesh 1");
        await flush();
        expect(sent.map(command => command.kwargs.commandArgs[0])).toEqual([1, 2]);

        sent[1].reply("mesh 2");
        await flush();
        sent[2].reply("mesh 3");
        await expect(Promise.all(results)).resolves.toEqual(["mesh 1", "mesh 2", "mesh 3"]);
        expect(wrapper.queueLength).toBe(0);
    });

    test("a command with a squash key removes the waiting commands with the same key", async () => {
        const { wrapper, sent } = makeWorker();
        const running = contour(wrapper, 1, "map-contour:a");
        await flush();
        const squashed = [contour(wrapper, 2, "map-contour:a"), contour(wrapper, 3, "map-contour:a")];
        const latest = contour(wrapper, 4, "map-contour:a");

        for (const promise of squashed) {
            await expect(promise).rejects.toBeInstanceOf(CommandSquashedError);
        }
        await expect(squashed[0]).rejects.toMatchObject({ command: "get_map_contours_mesh", squashKey: "map-contour:a" });
        expect(wrapper.queueLength).toBe(1);

        // The command already sent is not squashed
        sent[0].reply("mesh 1");
        await expect(running).resolves.toBe("mesh 1");
        await flush();
        expect(sent.map(command => command.kwargs.commandArgs[0])).toEqual([1, 4]);
        sent[1].reply("mesh 4");
        await expect(latest).resolves.toBe("mesh 4");
    });

    test("other keys and commands without a key are not squashed; a squashing command takes the place of the one it replaces", async () => {
        const { wrapper, sent } = makeWorker();
        const first = contour(wrapper, 1);
        await flush();
        const others = [contour(wrapper, 2, "map-contour:a"), contour(wrapper, 3, "map-contour:b"), contour(wrapper, 4)];
        const replacing = contour(wrapper, 5, "map-contour:a");
        await expect(others[0]).rejects.toBeInstanceOf(CommandSquashedError);

        sent[0].reply("mesh 1");
        await first;
        for (let i = 1; i <= 3; i++) {
            await flush();
            sent[i].reply(`mesh ${sent[i].kwargs.commandArgs[0]}`);
        }
        await expect(Promise.all([others[1], others[2], replacing])).resolves.toEqual(["mesh 3", "mesh 4", "mesh 5"]);
        expect(sent.map(command => command.kwargs.commandArgs[0])).toEqual([1, 5, 3, 4]);
    });

    test("callers squashing all the time take turns: two maps both follow a view that keeps moving", async () => {
        const { wrapper, sent } = makeWorker();
        // Map 1 and map 2 are contoured on every view move; each move arrives while a contour is running
        contour(wrapper, 1, "map-contour:a").catch(() => {});
        contour(wrapper, 2, "map-contour:b").catch(() => {});
        await flush();
        for (let move = 0; move < 6; move++) {
            contour(wrapper, 1, "map-contour:a").catch(() => {});
            contour(wrapper, 2, "map-contour:b").catch(() => {});
            sent[sent.length - 1].reply("mesh");
            await flush();
        }
        // Before, the last caller to squash went last every time: map 2 was only sent once the view stopped
        expect(sent.map(command => command.kwargs.commandArgs[0])).toEqual([1, 2, 1, 2, 1, 2, 1]);
    });

    test("getStatus describes the queue, and subscribers hear about every change", async () => {
        const { wrapper, sent } = makeWorker();
        const idle = wrapper.getStatus();
        expect(idle).toMatchObject({ running: null, waiting: [], completed: 0, squashed: 0, failed: 0, lastDurationMs: null });
        // Same object until something changes (what useSyncExternalStore needs)
        expect(wrapper.getStatus()).toBe(idle);

        let changes = 0;
        const unsubscribe = wrapper.subscribe(() => changes++);
        const first = contour(wrapper, 1, "map-contour:a");
        contour(wrapper, 2, "map-contour:b").catch(() => {});
        const failing = contour(wrapper, 3, "map-contour:b");
        await flush();
        const busy = wrapper.getStatus();
        expect(busy).not.toBe(idle);
        expect(busy.running).toMatchObject({ command: "get_map_contours_mesh", squashKey: "map-contour:a" });
        expect(busy.waiting.map(entry => entry.squashKey)).toEqual(["map-contour:b"]);
        expect(busy.squashed).toBe(1);

        sent[0].reply("mesh 1");
        await first;
        await flush();
        sent[1].reply(null, "Exception");
        await expect(failing).rejects.toBeInstanceOf(CootCommandError);
        expect(wrapper.getStatus()).toMatchObject({ running: null, waiting: [], completed: 1, failed: 1 });
        expect(wrapper.getStatus().lastDurationMs).toBeGreaterThanOrEqual(0);
        expect(changes).toBeGreaterThan(0);

        const before = changes;
        unsubscribe();
        contour(wrapper, 4).catch(() => {});
        expect(changes).toBe(before);
    });

    test("a failed command rejects and the queue goes on", async () => {
        const { wrapper, sent } = makeWorker();
        const failing = contour(wrapper, 1);
        const exception = contour(wrapper, 2);
        const next = contour(wrapper, 3);
        await flush();

        // No reply possible (e.g. the worker failed to start)
        sent[0].fail(new CootCommandError("get_map_contours_mesh", "The coot worker failed to start"));
        await expect(failing).rejects.toBeInstanceOf(CootCommandError);
        await flush();

        // Coot raised an exception: the typed method throws, naming the command
        sent[1].reply(null, "Exception");
        await expect(exception).rejects.toMatchObject({ name: "CootCommandError", command: "get_map_contours_mesh" });
        await flush();

        sent[2].reply("mesh 3");
        await expect(next).resolves.toBe("mesh 3");
    });
});
