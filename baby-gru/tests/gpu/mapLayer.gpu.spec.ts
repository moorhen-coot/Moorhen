import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { LayerStep } from "./cases/mapLayer.case";

test("a changed map is fetched again, once, and drawn throughout", async ({ page }) => {
    const steps = resultOrSkip(await runGpuCase<LayerStep[]>(page, "mapLayer.case.ts"));
    const at = (label: string) => {
        const step = steps.find(s => s.label === label);
        if (!step) throw new Error(`no step "${label}"`);
        return step;
    };
    expect(at("first frame")).toMatchObject({ draws: 0, fetches: 1 });
    const first = at("grid in");
    expect(first).toMatchObject({ draws: 1, fetches: 1 });
    expect(first.triangles).toBeGreaterThan(100);
    expect(at("nothing changed")).toMatchObject({ draws: 1, fetches: 1, triangles: first.triangles });
    expect(at("a change requests a draw").requested).toBeGreaterThan(0);
    // The old contour stays while the new grid comes.
    expect(at("changed: old grid still drawn")).toMatchObject({ draws: 1, fetches: 2, triangles: first.triangles });
    const second = at("new grid in");
    expect(second.fetches).toBe(2);
    expect(second.triangles).not.toBe(first.triangles);
    // Three changes, one during the other's fetch: two fetches, not four.
    expect(at("change 1: fetch starts").fetches).toBe(3);
    expect(at("changes 2 and 3 while it runs").fetches).toBe(3);
    expect(at("first fetch in, one more starts").fetches).toBe(4);
    const smaller = at("second fetch in (smaller grid)");
    expect(smaller.fetches).toBe(4);
    expect(smaller.status).toContain("40×40×40");
    // A failed refetch keeps what was drawn.
    expect(at("failed: old grid kept")).toMatchObject({ draws: 1, fetches: 5, triangles: smaller.triangles });
    expect(at("destroyed layer no longer listens").requested).toBe(0);
});
