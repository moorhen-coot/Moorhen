import { MoorhenUiExtensions } from "../../src/InstanceManager/UiExtensions";

describe("MoorhenUiExtensions", () => {
    test("addModal stores the modal, notifies, and returns a remover", () => {
        const extensions = new MoorhenUiExtensions();
        const listener = jest.fn();
        extensions.subscribe(listener);

        const remove = extensions.addModal({ id: "plugin", title: "Plugin", slotName: "plugin-slot" });
        expect(extensions.getModal("plugin")).toMatchObject({ slotName: "plugin-slot" });
        expect(listener).toHaveBeenCalledTimes(1);

        remove();
        expect(extensions.getModal("plugin")).toBeUndefined();
        expect(extensions.getModals()).toHaveLength(0);
        expect(listener).toHaveBeenCalledTimes(2);
    });

    test("a remover does not remove the modal that replaced its own", () => {
        const extensions = new MoorhenUiExtensions();
        const removeFirst = extensions.addModal({ id: "plugin", title: "First", slotName: "a" });
        extensions.addModal({ id: "plugin", title: "Second", slotName: "b" });
        expect(extensions.getModals()).toHaveLength(1);

        removeFirst();
        expect(extensions.getModal("plugin")).toMatchObject({ title: "Second" });
    });

    test("getModals and getSidePanels keep the same array until something changes", () => {
        const extensions = new MoorhenUiExtensions();
        const modals = extensions.getModals();
        const panels = extensions.getSidePanels();
        expect(extensions.getModals()).toBe(modals);
        expect(extensions.getSidePanels()).toBe(panels);

        extensions.addSidePanel({ id: "panel", label: "Panel", icon: "menuMaps", slotName: "panel-slot" });
        expect(extensions.getSidePanels()).not.toBe(panels);
        expect(extensions.getModals()).toBe(modals);
    });

    test("removing an unknown id does not notify", () => {
        const extensions = new MoorhenUiExtensions();
        const listener = jest.fn();
        extensions.subscribe(listener);
        extensions.removeModal("nothing");
        extensions.removeSidePanel("nothing");
        expect(listener).not.toHaveBeenCalled();
    });

    test("unsubscribe stops notifications", () => {
        const extensions = new MoorhenUiExtensions();
        const listener = jest.fn();
        const unsubscribe = extensions.subscribe(listener);
        unsubscribe();
        extensions.addSidePanel({ id: "panel", label: "Panel", icon: "menuMaps", content: null });
        expect(listener).not.toHaveBeenCalled();
    });

    test("in web component mode only slot entries are accepted", () => {
        const extensions = new MoorhenUiExtensions();
        extensions.restrictToSlots();
        expect(() => extensions.addModal({ id: "react", component: () => null })).toThrow(/slotName/);
        expect(() => extensions.addSidePanel({ id: "react", label: "React", icon: "menuMaps", content: null })).toThrow(/slotName/);
        expect(extensions.getModals()).toHaveLength(0);
        expect(extensions.getSidePanels()).toHaveLength(0);

        extensions.addModal({ id: "slot", title: "Slot", slotName: "slot" });
        extensions.addSidePanel({ id: "slot", label: "Slot", icon: "menuMaps", slotName: "slot" });
        expect(extensions.getModals()).toHaveLength(1);
        expect(extensions.getSidePanels()).toHaveLength(1);
    });
});
