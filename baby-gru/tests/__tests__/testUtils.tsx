import "@testing-library/jest-dom";
import { cleanup, render } from "@testing-library/react";
import { Provider } from "react-redux";
import type { ReactNode } from "react";
import { MoorhenMenuSystem } from "../../src/components/menu-system/MenuSystem";
import { _MoorhenReduxStore as MoorhenReduxStore } from "../../src/store/MoorhenReduxStore";
import { setCootInitialized, setDevMode } from "../../src/store/generalStatesSlice";
import {
    setDefaultBondSmoothness,
    setHeight,
    setIsDark,
    setWidth,
} from "../../src/store/sceneSettingsSlice";
import { MoorhenProvider } from "@/components/MoorhenProvider";

jest.setTimeout(15000);

// chart.js ships ESM/CJS interop that trips jsdom; stub out registerables.
jest.mock("chart.js", () => ({
    ...jest.requireActual("chart.js"),
    registerables: [],
}));

// jsdom has no ResizeObserver; popover-based components need a stub.
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
} as any;

beforeAll(() => {
    MoorhenReduxStore.dispatch(setDevMode(false));
    MoorhenReduxStore.dispatch(setIsDark(false));
    MoorhenReduxStore.dispatch(setWidth(1600));
    MoorhenReduxStore.dispatch(setHeight(900));
    MoorhenReduxStore.dispatch(setCootInitialized(true));
    MoorhenReduxStore.dispatch(setDefaultBondSmoothness(1));
});

afterEach(cleanup);

export const renderWithinInstance = (component: ReactNode) => {
    return render(<MoorhenProvider>{component}</MoorhenProvider>);
};

export const mockMenuSystem = {} as MoorhenMenuSystem;

export { MoorhenReduxStore };
