import { expect, type Locator, type Page } from "@playwright/test";
import type { MoorhenStartedSession } from "./types";
import { getWebGLCanvasLocator } from "./webglCanvas";

/**
 * Walking through tutorial 1 the way a user does: Space to the next residue, a look around,
 * and an edit from a shortcut or the context menu. Shared by the slow-down and memory specs.
 */

export const RESIDUE_ACTIONS = ["sphere-refine-key", "autofit-rotamer-key", "refine-context-menu", "drag-atoms", "triple-refine-key"] as const;
export type ResidueAction = (typeof RESIDUE_ACTIONS)[number];

export type CanvasBox = { x: number; y: number; width: number; height: number };

/** Parses a comma list of actions, "none" for navigation only, or all of them when unset. */
export function parseResidueActions(raw: string | undefined, envName: string): ResidueAction[] {
    if (!raw) return [...RESIDUE_ACTIONS];
    if (raw === "none") return [];
    const names = raw.split(",").map(name => name.trim());
    const unknown = names.filter(name => !RESIDUE_ACTIONS.includes(name as ResidueAction));
    if (unknown.length > 0) throw new Error(`Unknown ${envName} ${unknown.join(", ")}; expected ${RESIDUE_ACTIONS.join(", ")} or none`);
    return names as ResidueAction[];
}

export async function readAppState(page: Page, elementId: string) {
    return page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        const state = instance.store.getState();
        return {
            origin: state.sceneSettings.origin as number[],
            activeMessages: instance.commandCentre.activeMessages.length as number,
            isDraggingAtoms: state.generalStates.isDraggingAtoms as boolean,
            hoveredCid: state.hoveringStates.hoveredAtom?.cid as string | null,
        };
    }, elementId);
}

/** The app is idle once no coot command has been pending for `quietMs`. */
export async function waitForIdle(page: Page, elementId: string, quietMs = 300, timeoutMs = 60_000) {
    const startedAt = Date.now();
    let quietSince: number | null = null;
    while (Date.now() - startedAt < timeoutMs) {
        const { activeMessages } = await readAppState(page, elementId);
        if (activeMessages === 0) {
            quietSince ??= Date.now();
            if (Date.now() - quietSince >= quietMs) return;
        } else {
            quietSince = null;
        }
        await page.waitForTimeout(50);
    }
    throw new Error(`App still busy after ${timeoutMs} ms`);
}

/** Waits for the view to move away from `from` and then stop. Returns false if it never moved. */
export async function waitForOriginSettled(page: Page, elementId: string, from: number[], timeoutMs = 15_000): Promise<boolean> {
    const same = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-4);
    const startedAt = Date.now();
    let moved = false;
    let previous = from;
    let stableTicks = 0;
    while (Date.now() - startedAt < timeoutMs) {
        await page.waitForTimeout(50);
        const { origin } = await readAppState(page, elementId);
        if (!moved) {
            moved = !same(origin, from);
            previous = origin;
            continue;
        }
        stableTicks = same(origin, previous) ? stableTicks + 1 : 0;
        previous = origin;
        if (stableTicks >= 3) return true;
    }
    return moved;
}

/**
 * Finds a screen point over an atom near the centre of the canvas, where the residue just
 * jumped to sits. Starts from a corner so a stale hover from the last residue is cleared.
 */
export async function findAtomNearCentre(page: Page, elementId: string, box: CanvasBox) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.waitForTimeout(60);
    for (const radius of [0, 4, 8, 12, 18, 26, 36]) {
        const angles = radius === 0 ? [0] : [0, 45, 90, 135, 180, 225, 270, 315];
        for (const angle of angles) {
            const x = cx + radius * Math.cos((angle * Math.PI) / 180);
            const y = cy + radius * Math.sin((angle * Math.PI) / 180);
            await page.mouse.move(x, y);
            await page.waitForTimeout(40);
            const { hoveredCid } = await readAppState(page, elementId);
            if (hoveredCid) return { x, y, cid: hoveredCid };
        }
    }
    return null;
}

/** Turns the camera a little and back, like looking at the residue from another side. */
export async function lookAround(page: Page, box: CanvasBox) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height * 0.75;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 80, y, { steps: 10 });
    await page.mouse.move(x, y, { steps: 10 });
    await page.mouse.up();
}

export async function pressShortcut(page: Page, box: CanvasBox, key: string) {
    // The canvas only takes keys while the pointer is over it (document.onkeydown is set on mouseenter).
    await page.mouse.move(box.x + box.width / 2 + 1, box.y + box.height / 2 + 1);
    await page.keyboard.press(key);
}

async function contextMenuButton(page: Page, host: Locator, elementId: string, box: CanvasBox, iconAlt: string) {
    const atom = await findAtomNearCentre(page, elementId, box);
    if (!atom) return null;
    await page.mouse.click(atom.x, atom.y, { button: "right" });
    const button = host.locator(`button.moorhen__context-menu-button:has(img[alt="${iconAlt}"])`);
    await expect(button).toBeVisible({ timeout: 5_000 });
    return { button, atom };
}

/** Performs one edit on the residue at the centre. Returns a note when it had to be skipped. */
export async function runResidueAction(page: Page, host: Locator, elementId: string, box: CanvasBox, action: ResidueAction): Promise<string | undefined> {
    switch (action) {
        case "sphere-refine-key":
            await pressShortcut(page, box, "Shift+R");
            return;
        case "triple-refine-key":
            await pressShortcut(page, box, "Shift+H");
            return;
        case "autofit-rotamer-key":
            await pressShortcut(page, box, "Shift+J");
            return;
        case "refine-context-menu": {
            const found = await contextMenuButton(page, host, elementId, box, "Refine Residues");
            if (!found) return "no atom under the centre, skipped";
            await found.button.click();
            return;
        }
        case "drag-atoms": {
            const found = await contextMenuButton(page, host, elementId, box, "drag atoms");
            if (!found) return "no atom under the centre, skipped";
            await found.button.click();
            await expect.poll(async () => (await readAppState(page, elementId)).isDraggingAtoms, { timeout: 5_000 }).toBe(true);
            await page.mouse.move(found.atom.x, found.atom.y);
            await page.mouse.down();
            await page.mouse.move(found.atom.x + 25, found.atom.y + 15, { steps: 15 });
            await page.mouse.up();
            await waitForIdle(page, elementId);
            await host.getByRole("button", { name: "Accept dragged atoms" }).click();
            await expect.poll(async () => (await readAppState(page, elementId)).isDraggingAtoms, { timeout: 30_000 }).toBe(false);
            return;
        }
    }
}

/** Same as File > Load tutorial data... > Tutorial 1. Resolves once its map is the active map. */
export async function loadTutorial1(moorhen: MoorhenStartedSession): Promise<{ firstResidue: number }> {
    const { page, elementId } = moorhen;
    const firstResidue = await page.evaluate(async targetId => {
        const hostElement = document.getElementById(targetId) as any;
        const instance = await hostElement.getMoorhenInstance();
        const oldStyle = instance.representation.defaultStyle;
        instance.representation.defaultStyle = "CBs";
        const loaded = await instance.files.loadFiles([
            "MoorhenAssets/tutorials/moorhen-tutorial-structure-number-1.ent",
            "MoorhenAssets/tutorials/moorhen-tutorial-map-number-1.mtz",
        ]);
        instance.representation.defaultStyle = oldStyle;
        const moleculeEntry = loaded.find((file: any) => file.type === "molecule");
        const molecule = instance.getMolecule(moleculeEntry.uniqueID);
        const chain = molecule.sequences.find((sequence: any) => sequence.chain === "A");
        return chain.sequence[0].resNum as number;
    }, elementId);

    await expect
        .poll(async () => page.evaluate(async targetId => {
            const hostElement = document.getElementById(targetId) as any;
            const instance = await hostElement.getMoorhenInstance();
            return Boolean(instance.store.getState().generalStates.activeMap);
        }, elementId), { timeout: 60_000, message: "tutorial 1 map becomes the active map" })
        .toBe(true);
    await moorhen.waitForWebGLRenderSettle({ minSettleMs: 1_500, timeoutMs: 60_000 });
    return { firstResidue };
}

/**
 * Gets a loaded session ready to walk: opens the Models panel once (Space does not advance
 * until it has been opened - known bug, fix pending), measures the canvas, and centres on the
 * first residue of chain A. `nextResidue` presses Space and wraps to the start at the chain end.
 */
export async function prepareResidueWalk(moorhen: MoorhenStartedSession, firstResidue: number) {
    const { page, elementId } = moorhen;
    // Shows the panel rather than toggling it, so this is safe to repeat after a reload.
    await moorhen.buttonClick("Open Models Panel");
    await page.waitForTimeout(1_000);

    const canvas = await getWebGLCanvasLocator(page, elementId);
    const box = (await canvas.boundingBox())!;
    expect(box, "WebGL canvas has a layout box").toBeTruthy();

    const centreOnFirstResidue = async () => {
        const { origin } = await readAppState(page, elementId);
        await page.evaluate(async ({ targetId, resNum }) => {
            const hostElement = document.getElementById(targetId) as any;
            const instance = await hostElement.getMoorhenInstance();
            await instance.getMoleculeList()[0].centreAndAlignViewOn(`/*/A/${resNum}-${resNum}/`, true);
        }, { targetId: elementId, resNum: firstResidue });
        await waitForOriginSettled(page, elementId, origin);
    };
    await centreOnFirstResidue();

    const nextResidue = async () => {
        const before = await readAppState(page, elementId);
        await pressShortcut(page, box, " ");
        if (!(await waitForOriginSettled(page, elementId, before.origin))) {
            // End of the chain: start again from the first residue.
            await centreOnFirstResidue();
        }
    };

    return { box, centreOnFirstResidue, nextResidue };
}
