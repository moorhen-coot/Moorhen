/**
 * WEB-*: CCP4 Cloud host contract for the web component and the main menu (CLOUD_HOST_TEST_SPEC.md, "WEB").
 *
 * Runs in the `react-components` Jest project (jsdom). There is no Coot worker and no WebGL here: the point is the
 * wiring between the host, `<moorhen-web-component>`, `MoorhenContainer`, `MoorhenInstance` and the menu.
 *
 * What is real and what is mocked:
 * - Real: `MoorhenWebComponent` / `registerMoorhenWebComponent`, `MoorhenProvider`, `MoorhenInstance`, the redux
 *   store, preference persistence (on the mocked localforage), `MoorhenContainer` (in "real" mode),
 *   `MoorhenTimeCapsule`, `createCallbackBackupStorage`, `MoorhenMenuSystem`, `MoorhenMainMenu`.
 * - Mocked:
 *   - `@/components/container` (the module the web component imports) is replaced by a wrapper that records the
 *     props it receives and its mounts, and renders either a fake container (sets `moorhenInstanceRef` to a fake
 *     ready instance) or the real `MoorhenContainer`, depending on `mockContainer.mode`.
 *   - `MoorhenInstance.prototype.startInstance` is spied on and calls through to the real implementation, after
 *     attaching a fake command centre (no Coot worker in jsdom) and with a dispatch that drops
 *     `setGlobalInstanceReady`, so the container stays on its loading screen instead of mounting the WebGL UI.
 *     Everything else in `startInstance` (time capsule creation, storage, init, `ready`) is the real code.
 *   - `fetch` (moorhen.css), `ResizeObserver`, `document.fonts`, and `window.gemmiModule` / `window.MathJax`
 *     (so the container does not try to load those scripts).
 */
import "@testing-library/jest-dom";
import React, { StrictMode } from "react";
import { Provider } from "react-redux";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MoorhenInstance, MoorhenInstanceProvider } from "@/InstanceManager";
import { MoorhenProvider } from "@/components/MoorhenProvider";
import { MoorhenContainer as RealMoorhenContainer } from "@/components/container/MainContainer";
import { MoorhenMainMenu } from "@/components/menu-system/MainMenu";
import { MoorhenMenuSystem } from "@/components/menu-system/MenuSystem";
import { MainMenu } from "@/components/menu-system/mainMenuConfig";
import type { MainMenuEntryAction } from "@/components/menu-system/mainMenuConfig";
import { createMoorhenStore } from "@/store/MoorhenReduxStore";
import { setGlobalInstanceReady, setMainMenuOpen } from "@/store/globalUISlice";
import { setShortCuts } from "@/store/shortCutsSlice";
import { PREFERENCES_MAP } from "@/InstanceManager/Preferences/PreferencesList";
import { MoorhenWebComponent, registerMoorhenWebComponent } from "@/WebComponent/MoorhenWebComponent";
import { createCallbackBackupStorage, type CloudBackup } from "@/WebComponent/ccp4cloud/backupStorage";

jest.setTimeout(20000);

// chart.js ships ESM/CJS interop that trips jsdom; stub out registerables (as tests/__tests__/testUtils.tsx does).
jest.mock("chart.js", () => ({
    ...jest.requireActual("chart.js"),
    registerables: [],
}));

// MainContainer -> ModalsContainer -> MoorhenLhasaModal imports LhasaReact, which uses `import.meta.hot`; ts-jest
// compiles to CommonJS and rejects it (this is also why the old MoorhenContainer.test.jsx is disabled). Lhasa is not
// part of the host contract, so it is stubbed.
jest.mock("@/LhasaReact/src/Lhasa", () => ({ LhasaComponent: () => null }));

// ------------------------------------------------------------------
// Container mock: records props/mounts, renders a fake or the real container
// ------------------------------------------------------------------

type ContainerMockState = {
    mode: "fake" | "real";
    props: any[];
    mounts: number;
    fakeInstance: any;
};

jest.mock("@/components/container", () => {
    const ReactActual = jest.requireActual("react");
    const actual = jest.requireActual("@/components/container/MainContainer");
    const state: ContainerMockState = { mode: "fake", props: [], mounts: 0, fakeInstance: null };
    const FakeContainer = (props: any) => {
        ReactActual.useEffect(() => {
            if (props.moorhenInstanceRef) props.moorhenInstanceRef.current = state.fakeInstance;
        }, [props.moorhenInstanceRef]);
        return ReactActual.createElement("div", { "data-testid": "fake-moorhen-container" });
    };
    const MoorhenContainer = (props: any) => {
        state.props.push(props);
        ReactActual.useEffect(() => {
            state.mounts += 1;
        }, []);
        return state.mode === "real"
            ? ReactActual.createElement(actual.MoorhenContainer, props)
            : ReactActual.createElement(FakeContainer, props);
    };
    return { MoorhenContainer, __mockState: state };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockContainer: ContainerMockState = require("@/components/container").__mockState;
const lastContainerProps = () => mockContainer.props[mockContainer.props.length - 1];

// ------------------------------------------------------------------
// jsdom gaps
// ------------------------------------------------------------------

global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
} as any;

Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve(), check: () => false },
});

const fetchMock = jest.fn(async (_url: string) => ({ ok: true, status: 200, text: async () => "/* moorhen.css */" }));
(global as any).fetch = fetchMock;
(window as any).gemmiModule = {};
(window as any).MathJax = {};

// ------------------------------------------------------------------
// startInstance: real code, fake worker, loading screen kept
// ------------------------------------------------------------------

const realStartInstance = MoorhenInstance.prototype.startInstance;
const makeFakeCommandCentre = () => ({
    cootCommand: jest.fn(async () => ({ data: { result: { status: "Completed", result: null } } })),
    close: jest.fn(),
});
let startInstanceSpy: jest.SpyInstance;

// ------------------------------------------------------------------
// Fake CCP4 Cloud host (backup callbacks), as in cloudHostHarness.createFakeHost
// (the harness itself imports the real Coot worker, which cannot load in jsdom)
// ------------------------------------------------------------------

const createFakeHost = () => {
    const backups = new Map<string | number, CloudBackup>();
    const callbacks = {
        save: jest.fn(async (backup: CloudBackup) => {
            backups.set(backup.serNo, backup);
        }),
        load: jest.fn(async (serNo: string | number) => backups.get(serNo)),
        remove: jest.fn(async (serNo: string | number) => {
            backups.delete(serNo);
        }),
        list: jest.fn(async () => [...backups.values()]),
    };
    return { backups, callbacks, backupStorage: createCallbackBackupStorage(callbacks) };
};

// ------------------------------------------------------------------
// Web component helpers
// ------------------------------------------------------------------

const mountedElements: MoorhenWebComponent[] = [];

/** Create the element, let `setup` configure it (before appending), append it and wait for the container */
const mountElement = async (setup: (el: MoorhenWebComponent) => void = () => {}) => {
    registerMoorhenWebComponent();
    const el = document.createElement("moorhen-web-component") as MoorhenWebComponent;
    setup(el);
    mountedElements.push(el);
    document.body.appendChild(el);
    await waitFor(() => expect(mockContainer.props.length).toBeGreaterThan(0));
    return el;
};

/** The MoorhenMainMenu "Exit" entry a CCP4 Cloud host adds */
const exitEntry = (action: () => void): MainMenuEntryAction => ({ type: "action", label: "Exit", icon: "MatSymLogout", action });

const countEntries = (menuSystem: MoorhenMenuSystem, label: string) =>
    Object.values(menuSystem.mainMenuMap).filter(entry => entry.label === label).length;

// `MoorhenMenuSystem` aliases the module-level `MainMenu` object (see the extra WEB-10 test below), so entries added
// by one test would leak into the next. Restore it around every test so each one starts from the default menu.
let mainMenuSnapshot: typeof MainMenu;

beforeEach(() => {
    mockContainer.mode = "fake";
    mockContainer.props = [];
    mockContainer.mounts = 0;
    mockContainer.fakeInstance = { isReady: () => true, webComponent: null };
    fetchMock.mockClear();
    mainMenuSnapshot = { ...MainMenu };
    startInstanceSpy = jest.spyOn(MoorhenInstance.prototype, "startInstance").mockImplementation(async function (
        this: MoorhenInstance,
        dispatch: any,
        ...rest: any[]
    ) {
        if (!this.commandCentre) this.setCommandCentre(makeFakeCommandCentre() as any);
        const keepLoadingScreen = (action: any) => (action?.type === setGlobalInstanceReady.type ? action : dispatch(action));
        return (realStartInstance as any).call(this, keepLoadingScreen, ...rest);
    });
});

afterEach(async () => {
    for (const el of mountedElements.splice(0)) {
        await act(async () => {
            (el as any)._reactRoot?.unmount();
        });
        el.remove();
    }
    cleanup();
    startInstanceSpy.mockRestore();
    jest.restoreAllMocks();
    Object.keys(MainMenu).forEach(key => delete MainMenu[key]);
    Object.assign(MainMenu, mainMenuSnapshot);
});

// ==================================================================

describe("WEB: web component and menu", () => {
    test("WEB-01 registerMoorhenWebComponent() twice: no error, element defined once", () => {
        expect(customElements.get("moorhen-web-component")).toBeUndefined();
        const defineSpy = jest.spyOn(customElements, "define");

        expect(() => registerMoorhenWebComponent()).not.toThrow();
        expect(() => registerMoorhenWebComponent()).not.toThrow();

        expect(defineSpy.mock.calls.filter(([name]) => name === "moorhen-web-component")).toHaveLength(1);
        expect(customElements.get("moorhen-web-component")).toBe(MoorhenWebComponent);
    });

    test("WEB-02 start-up properties set before appending reach MoorhenContainer", async () => {
        const host = createFakeHost();
        const el = await mountElement(el => {
            el.urlPrefix = "/cloud/MoorhenAssets";
            el.monomerLibraryPath = "/cloud/monomers";
            el.allowScripting = false;
            el.disableFileUploads = true;
            el.backupStorage = host.backupStorage;
        });

        expect(mockContainer.props).toHaveLength(1);
        const props = lastContainerProps();
        expect(props.urlPrefix).toBe("/cloud/MoorhenAssets");
        expect(props.monomerLibraryPath).toBe("/cloud/monomers");
        expect(props.allowScripting).toBe(false);
        expect(props.disableFileUploads).toBe(true);
        expect(props.backupStorageInstance).toBe(host.backupStorage);
        expect(props.webComponentMode).toBe(true);
        // the stylesheet is fetched from urlPrefix
        expect(fetchMock.mock.calls.map(([url]) => url)).toContain(new URL("/cloud/MoorhenAssets/moorhen.css", window.location.href).href);
        expect(el.monomerLibraryPath).toBe("/cloud/monomers");
    });

    test("WEB-03 attributes monomer-library and allow-scripting=\"false\" behave as the properties", async () => {
        // Real container, so the values are also read back through the instance and the store
        mockContainer.mode = "real";
        const el = await mountElement(el => {
            el.setAttribute("monomer-library", "/cloud/monomers");
            el.setAttribute("allow-scripting", "false");
        });

        expect(lastContainerProps().monomerLibraryPath).toBe("/cloud/monomers");
        expect(lastContainerProps().allowScripting).toBe(false);

        const instance = await el.getMoorhenInstance();
        expect(instance.paths.monomerLibraryPath).toBe("/cloud/monomers");
        // MoorhenContainer defaults allowScripting to true, so false here comes from the attribute
        expect(instance.store.getState().generalStates.allowScripting).toBe(false);
    });

    test("WEB-04 start-up properties set after start-up are ignored with a warning; instance not restarted", async () => {
        mockContainer.mode = "real";
        const host = createFakeHost();
        const el = await mountElement(el => {
            el.monomerLibraryPath = "/first/monomers";
            el.allowScripting = true;
        });
        const instance = await el.getMoorhenInstance();
        expect(startInstanceSpy).toHaveBeenCalledTimes(1);
        const storageBefore = instance.getTimeCapsule().storageInstance;

        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
        el.monomerLibraryPath = "/second/monomers";
        el.backupStorage = host.backupStorage;
        el.allowScripting = false;
        el.setAttribute("monomer-library", "/third/monomers");

        const warnings = warnSpy.mock.calls.map(args => String(args[0]));
        for (const name of ["monomerLibraryPath", "backupStorage", "allowScripting"]) {
            expect(warnings.some(w => w.includes("moorhen-web-component") && w.includes(name))).toBe(true);
        }
        expect(el.monomerLibraryPath).toBe("/first/monomers");
        expect(el.backupStorage).toBeUndefined();
        expect(el.allowScripting).toBe(true);

        // A later re-render (non start-up property) still passes the original start-up values
        el.width = 640;
        await waitFor(() => expect(lastContainerProps().size).toEqual([640, 640]));
        expect(lastContainerProps().monomerLibraryPath).toBe("/first/monomers");
        expect(lastContainerProps().allowScripting).toBe(true);
        expect(lastContainerProps().backupStorageInstance).toBeUndefined();

        // Not restarted: same instance, one container mount, one startInstance, storage unchanged
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(mockContainer.mounts).toBe(1);
        expect(startInstanceSpy).toHaveBeenCalledTimes(1);
        expect(await el.getMoorhenInstance()).toBe(instance);
        expect(instance.paths.monomerLibraryPath).toBe("/first/monomers");
        expect(instance.getTimeCapsule().storageInstance).toBe(storageBefore);
        expect(host.callbacks.save).not.toHaveBeenCalled();
    });

    test("WEB-05 getMoorhenInstance() resolves once ready, and to the same instance on repeated calls", async () => {
        mockContainer.mode = "real";
        registerMoorhenWebComponent();
        const el = document.createElement("moorhen-web-component") as MoorhenWebComponent;
        mountedElements.push(el);
        const onReady = jest.fn();
        window.addEventListener("moorhenReady", onReady);

        // Asked for before the element is even connected
        const early = el.getMoorhenInstance();
        expect(el.ready).toBe(false);
        document.body.appendChild(el);

        const instance = await early;
        expect(instance).toBeInstanceOf(MoorhenInstance);
        expect(instance.isReady()).toBe(true);
        expect(el.ready).toBe(true);
        // MoorhenInstance only has a `webComponent` setter; the attached element is kept in `_webComponent`
        expect((instance as any)._webComponent).toBe(el);
        expect(await el.getMoorhenInstance()).toBe(instance);
        expect(await el.getMoorhenInstance()).toBe(instance);
        expect(lastContainerProps().moorhenInstanceRef.current).toBe(instance);
        expect(onReady).toHaveBeenCalledTimes(1);
        window.removeEventListener("moorhenReady", onReady);
    });

    test("WEB-06 backupStorage set: the time capsule uses it (setItem reaches the fake host)", async () => {
        // Split, because there is no Coot worker in jsdom:
        // - web component -> MoorhenContainer -> MoorhenInstance.startInstance: all real, only the command centre is
        //   faked and setGlobalInstanceReady dropped (see the startInstance spy at the top);
        // - startInstance -> MoorhenTimeCapsule: real, the capsule is created with providedBackupStorageInstance and
        //   init() checks/stores the version through the storage, so the host `save` callback is reached.
        // Automatic session backups (which need real molecules) are covered by BAK-13 against real Coot.
        mockContainer.mode = "real";
        const host = createFakeHost();
        const el = await mountElement(el => {
            el.backupStorage = host.backupStorage;
        });
        const instance = await el.getMoorhenInstance();

        expect(lastContainerProps().backupStorageInstance).toBe(host.backupStorage);
        expect(startInstanceSpy).toHaveBeenCalledTimes(1);
        expect(startInstanceSpy.mock.calls[0][6].providedBackupStorageInstance).toBe(host.backupStorage);

        const timeCapsule = instance.getTimeCapsule();
        expect(timeCapsule.storageInstance).toBe(host.backupStorage);
        expect(timeCapsule.disableBackups).toBe(false);
        expect(host.callbacks.load).toHaveBeenCalledWith(0);
        expect(host.callbacks.save).toHaveBeenCalledWith({ type: "version", serNo: 0, data: timeCapsule.version });
        expect(host.backups.get(0)?.data).toBe(timeCapsule.version);
    });

    describe("main menu action entry", () => {
        const renderMenu = (strict: boolean) => {
            const store = createMoorhenStore();
            // The search bar in the menu needs the shortcuts, which preference restore normally provides
            const shortCutsPref = Object.values(PREFERENCES_MAP).find(pref => pref.label === "shortCuts");
            store.dispatch(setShortCuts(JSON.stringify(shortCutsPref.defaultValue)));
            const menuSystem = new MoorhenMenuSystem();
            const tree = (
                <Provider store={store}>
                    <MoorhenInstanceProvider menuSystem={menuSystem}>
                        <MoorhenMainMenu />
                    </MoorhenInstanceProvider>
                </Provider>
            );
            render(strict ? <StrictMode>{tree}</StrictMode> : tree);
            return { store, menuSystem };
        };

        test("WEB-07 addMainMenu({ type: \"action\", label: \"Exit\", icon: \"MatSymLogout\" }) renders the entry once", async () => {
            const { store, menuSystem } = renderMenu(false);
            act(() => {
                store.dispatch(setMainMenuOpen(true));
            });
            act(() => {
                menuSystem.addMainMenu(exitEntry(jest.fn()));
            });

            const buttons = await screen.findAllByRole("button", { name: "Exit" });
            expect(buttons).toHaveLength(1);
            expect(buttons[0]).toHaveTextContent("Exit");
            expect(within(buttons[0]).getByLabelText("MatSymLogout")).toBeInTheDocument();
        });

        test("WEB-08 clicking the action entry calls action exactly once per click (StrictMode) and closes the menu", async () => {
            const { store, menuSystem } = renderMenu(true);
            const action = jest.fn();
            act(() => {
                menuSystem.addMainMenu(exitEntry(action));
                store.dispatch(setMainMenuOpen(true));
            });

            fireEvent.click(await screen.findByRole("button", { name: "Exit" }));
            expect(action).toHaveBeenCalledTimes(1);
            expect(store.getState().globalUI.isMainMenuOpen).toBe(false);
            expect(screen.queryByRole("button", { name: "Exit" })).not.toBeInTheDocument();

            act(() => {
                store.dispatch(setMainMenuOpen(true));
            });
            fireEvent.click(await screen.findByRole("button", { name: "Exit" }));
            expect(action).toHaveBeenCalledTimes(2);
            expect(store.getState().globalUI.isMainMenuOpen).toBe(false);
        });
    });

    describe("start-up under StrictMode", () => {
        // The real MoorhenContainer, under StrictMode, with the real preference persistence (async restore from the
        // mocked localforage, so userPreferencesMounted is false on the first render and the start-up effect first
        // runs, twice under StrictMode, before it). The container stays on its loading screen (see the startInstance
        // spy), which is enough: the start-up effect and onInitialisationCompleted do not depend on the main UI.
        const renderStrictContainer = (onInitialisationCompleted: () => void) => {
            const moorhenInstanceRef = React.createRef<MoorhenInstance>();
            render(
                <StrictMode>
                    <MoorhenProvider>
                        <RealMoorhenContainer moorhenInstanceRef={moorhenInstanceRef} onInitialisationCompleted={onInitialisationCompleted} />
                    </MoorhenProvider>
                </StrictMode>
            );
            return { moorhenInstanceRef };
        };

        test("WEB-09 regression: onInitialisationCompleted is called exactly once per start-up", async () => {
            let preferencesMountedAtCall: boolean | null = null;
            let instanceRef: React.RefObject<MoorhenInstance>;
            const onInitialisationCompleted = jest.fn(() => {
                preferencesMountedAtCall = (instanceRef.current as any).store.getState().generalStates.userPreferencesMounted;
            });
            ({ moorhenInstanceRef: instanceRef } = renderStrictContainer(onInitialisationCompleted));

            // Not called before preferences are restored
            expect(onInitialisationCompleted).not.toHaveBeenCalled();

            await waitFor(() => expect(onInitialisationCompleted).toHaveBeenCalled());
            // Leave time for any late duplicate call
            await new Promise(resolve => setTimeout(resolve, 300));
            expect(onInitialisationCompleted).toHaveBeenCalledTimes(1);
            expect(preferencesMountedAtCall).toBe(true);
            expect(startInstanceSpy).toHaveBeenCalledTimes(1);
        });

        test("WEB-10 regression: a host adding its Exit entry in onInitialisationCompleted gets one Exit entry", async () => {
            let instanceRef: React.RefObject<MoorhenInstance>;
            const exit = jest.fn();
            const onInitialisationCompleted = jest.fn(() => {
                instanceRef.current.menuSystem.addMainMenu(exitEntry(exit));
            });
            ({ moorhenInstanceRef: instanceRef } = renderStrictContainer(onInitialisationCompleted));

            await waitFor(() => expect(onInitialisationCompleted).toHaveBeenCalled());
            await new Promise(resolve => setTimeout(resolve, 300));
            expect(countEntries(instanceRef.current.menuSystem, "Exit")).toBe(1);
        });

        // Not a spec row: found while writing WEB-10. Each MoorhenMenuSystem must work on its own copy of the default
        // menus, so a host that starts Moorhen twice in the same page (or two instances) gets one Exit entry each.
        test("WEB-10 (extra) Exit entries do not accumulate across menu systems / remounts", () => {
            const first = new MoorhenMenuSystem();
            first.addMainMenu(exitEntry(jest.fn()));
            const second = new MoorhenMenuSystem();
            second.addMainMenu(exitEntry(jest.fn()));
            expect(countEntries(second, "Exit")).toBe(1);
        });
    });
});
