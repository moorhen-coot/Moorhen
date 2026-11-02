import type React from "react";
import type { ModalComponentProps } from "@/components/interface-base/ModalBase/ModalsContainer";
import type { MoorhenSVG } from "@/components/icons";

type ExtensionCallbacks = {
    /** Called when the modal or side panel is shown. */
    onOpen?: () => void;
    /** Called when the modal or side panel is hidden. */
    onClose?: () => void;
};

/**
 * A modal whose body is light-DOM content of `<moorhen-web-component>`, placed with
 * `slot="<slotName>"`. Moorhen draws the frame (header, drag, resize, docking).
 *
 * Slotted content is styled by the host page, not by Moorhen's stylesheet. The `--moorhen-*`
 * CSS variables are inherited, so it can follow Moorhen's theme. It stays in the page while
 * the modal is closed, so its state survives closing and reopening.
 */
export type SlotModalExtension = ExtensionCallbacks & {
    id: string;
    title: string;
    slotName: string;
    allowDocking?: boolean;
    initialWidth?: number;
    initialHeight?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
};

/**
 * A modal written in React, mounted while it is open, like Moorhen's own modals.
 * The component draws its own frame, normally with `MoorhenDraggableModalBase` and `modalId` set to `id`.
 */
export type ComponentModalExtension = ExtensionCallbacks & {
    id: string;
    component: React.FC<ModalComponentProps>;
};

/**
 * What the `extraDraggableModals` container prop registers: a ready-made modal element, rendered
 * all the time, that decides itself when to show.
 * @internal
 */
export type ElementModalExtension = ExtensionCallbacks & {
    id: string;
    element: React.JSX.Element;
};

export type ModalExtension = SlotModalExtension | ComponentModalExtension | ElementModalExtension;

type SidePanelExtensionBase = ExtensionCallbacks & {
    id: string;
    /** Tab label. */
    label: string;
    icon: MoorhenSVG;
};

/**
 * A side panel whose content is light-DOM content of `<moorhen-web-component>`, placed with
 * `slot="<slotName>"`. Moorhen draws the title bar. Same styling and lifetime notes as
 * {@link SlotModalExtension}.
 */
export type SlotSidePanelExtension = SidePanelExtensionBase & {
    slotName: string;
    /** Title bar text, defaults to `label`. */
    title?: string;
};

/** A side panel written in React. The content is rendered as is, title bar included. */
export type ContentSidePanelExtension = SidePanelExtensionBase & {
    content: React.ReactNode;
};

export type SidePanelExtension = SlotSidePanelExtension | ContentSidePanelExtension;

/**
 * Modals and side panels added to one Moorhen instance by its host or by plugins, reached
 * through `instance.uiExtensions`.
 *
 * Inside `<moorhen-web-component>` only slot entries (`slotName`) are accepted: React components
 * from the host page would run on a different React than Moorhen's. React hosts can use both.
 *
 * Open them like the built-in ones: `showModal({ key: id })` / `setShownSidePanel(id)`, or a
 * `showModal` / `showPanel` menu item. An id equal to a built-in one replaces the built-in.
 *
 * @example
 * // <moorhen-web-component><div slot="my-plugin">…</div></moorhen-web-component>
 * const instance = await element.getMoorhenInstance();
 * instance.uiExtensions.addModal({ id: "my-plugin", title: "My plugin", slotName: "my-plugin" });
 * instance.menuSystem.addToExistingSubmenu([{ id: "open-my-plugin", label: "My plugin", type: "showModal", modal: "my-plugin" }], "file");
 */
export class MoorhenUiExtensions {
    private modals: ModalExtension[] = [];
    private sidePanels: SidePanelExtension[] = [];
    private listeners: Set<() => void> = new Set();
    private _slotsOnly = false;

    /**
     * Accept only slot entries from now on. Called by the container in web component mode.
     * @internal
     */
    public restrictToSlots = () => {
        this._slotsOnly = true;
    };

    private checkAllowed = (kind: string, extension: { id: string; slotName?: string }) => {
        if (this._slotsOnly && !("slotName" in extension)) {
            throw new Error(
                `Moorhen uiExtensions: ${kind} "${extension.id}" has no slotName. In the web component, modals and side panels can only be slots.`
            );
        }
    };

    /** Calls `listener` after every change. Returns the function that stops it. */
    public subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    private notifyListeners = () => {
        this.listeners.forEach(listener => listener());
    };

    /**
     * Adds a modal, replacing any extension with the same id.
     * @throws In the web component, if the modal is not a slot modal.
     * @returns A function that removes this modal (and does nothing once it has been replaced).
     */
    public addModal = (modal: ModalExtension): (() => void) => {
        this.checkAllowed("modal", modal);
        this.modals = [...this.modals.filter(item => item.id !== modal.id), modal];
        this.notifyListeners();
        return () => {
            if (this.modals.includes(modal)) this.removeModal(modal.id);
        };
    };

    public removeModal = (id: string) => {
        const modals = this.modals.filter(item => item.id !== id);
        if (modals.length === this.modals.length) return;
        this.modals = modals;
        this.notifyListeners();
    };

    public getModal = (id: string): ModalExtension | undefined => this.modals.find(item => item.id === id);

    /** All modals, in the order they were added. The same array is returned until something changes. */
    public getModals = (): readonly ModalExtension[] => this.modals;

    /**
     * Adds a side panel, replacing any extension with the same id.
     * @throws In the web component, if the panel is not a slot panel.
     * @returns A function that removes this panel (and does nothing once it has been replaced).
     */
    public addSidePanel = (panel: SidePanelExtension): (() => void) => {
        this.checkAllowed("side panel", panel);
        this.sidePanels = [...this.sidePanels.filter(item => item.id !== panel.id), panel];
        this.notifyListeners();
        return () => {
            if (this.sidePanels.includes(panel)) this.removeSidePanel(panel.id);
        };
    };

    public removeSidePanel = (id: string) => {
        const sidePanels = this.sidePanels.filter(item => item.id !== id);
        if (sidePanels.length === this.sidePanels.length) return;
        this.sidePanels = sidePanels;
        this.notifyListeners();
    };

    public getSidePanel = (id: string): SidePanelExtension | undefined => this.sidePanels.find(item => item.id === id);

    /** All side panels, in the order they were added. The same array is returned until something changes. */
    public getSidePanels = (): readonly SidePanelExtension[] => this.sidePanels;
}
