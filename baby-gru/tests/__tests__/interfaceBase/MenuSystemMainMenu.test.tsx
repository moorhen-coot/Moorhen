import { MoorhenMenuSystem } from "../../../src/components/menu-system/MenuSystem";
import type { MainMenuType } from "../../../src/components/menu-system/mainMenuConfig";

// The built-in Lhasa modal pulls in LhasaReact, which jest cannot compile (import.meta)
jest.mock("../../../src/components/modal/MoorhenLhasaModal", () => ({ MoorhenLhasaModal: () => null }));

const entry = (label: string): MainMenuType => ({ type: "action", label, icon: "MatSymAdd", action: () => {} });
const labels = (menuSystem: MoorhenMenuSystem) =>
    Object.keys(menuSystem.mainMenuMap)
        .map(Number)
        .sort((a, b) => a - b)
        .map(key => menuSystem.mainMenuMap[key].label);

describe("MoorhenMenuSystem main menu", () => {
    test("addMainMenu returns a remover, and the items after the removed one move up", () => {
        const menuSystem = new MoorhenMenuSystem();
        const before = labels(menuSystem);
        const listener = jest.fn();
        menuSystem.subscribe(listener);

        const remove = menuSystem.addMainMenu(entry("Plugin"), 2);
        expect(labels(menuSystem)).toEqual([before[0], "Plugin", ...before.slice(1)]);

        remove();
        expect(labels(menuSystem)).toEqual(before);
        expect(Object.keys(menuSystem.mainMenuMap).map(Number)).toEqual(before.map((_, i) => i + 1));
        expect(listener).toHaveBeenCalledTimes(2);

        // Once gone, the remover does nothing
        remove();
        expect(listener).toHaveBeenCalledTimes(2);
    });

    test("removeMainMenu by label, and false when there is nothing to remove", () => {
        const menuSystem = new MoorhenMenuSystem();
        menuSystem.addMainMenu(entry("Plugin"));
        expect(labels(menuSystem)).toContain("Plugin");
        expect(menuSystem.removeMainMenu("Plugin")).toBe(true);
        expect(labels(menuSystem)).not.toContain("Plugin");
        expect(menuSystem.removeMainMenu("Plugin")).toBe(false);
    });

    test("adding at a position after a removal does not leave holes", () => {
        const menuSystem = new MoorhenMenuSystem();
        const count = labels(menuSystem).length;
        menuSystem.removeMainMenu(menuSystem.mainMenuMap[1]);
        menuSystem.addMainMenu(entry("Plugin"), 1);
        const keys = Object.keys(menuSystem.mainMenuMap).map(Number);
        expect(keys).toEqual(Array.from({ length: count }, (_, i) => i + 1));
        expect(Object.values(menuSystem.mainMenuMap).every(Boolean)).toBe(true);
        expect(menuSystem.mainMenuMap[1].label).toBe("Plugin");
    });

    test("removing one menu system's item leaves other menu systems alone", () => {
        const first = new MoorhenMenuSystem();
        const second = new MoorhenMenuSystem();
        const label = first.mainMenuMap[1].label;
        first.removeMainMenu(label);
        expect(labels(second)[0]).toBe(label);
    });
});
