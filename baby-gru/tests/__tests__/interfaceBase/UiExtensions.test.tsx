import "@testing-library/jest-dom";
import { act } from "@testing-library/react";
import { useDispatch } from "react-redux";
import type { Dispatch } from "redux";
import type { MoorhenInstance } from "../../../src/InstanceManager/MoorhenInstance";
import { useMoorhenInstance } from "../../../src/InstanceManager/useMoorhenInstance";
import { MoorhenModalsContainer } from "../../../src/components/interface-base/ModalBase/ModalsContainer";
import { MoorhenSidePanel } from "../../../src/components/panels/SidePanels/SidePanel";
import { setShownSidePanel } from "../../../src/store/globalUISlice";
import { hideModal, showModal } from "../../../src/store/modalsSlice";
import { renderWithinInstance } from "../testUtils";

// The built-in Lhasa modal pulls in LhasaReact, which jest cannot compile (import.meta)
jest.mock("../../../src/components/modal/MoorhenLhasaModal", () => ({ MoorhenLhasaModal: () => null }));

let instance: MoorhenInstance;
let dispatch: Dispatch;

const Grab = () => {
    instance = useMoorhenInstance();
    dispatch = useDispatch();
    return null;
};

const renderContainers = () =>
    renderWithinInstance(
        <>
            <Grab />
            <MoorhenModalsContainer />
            <MoorhenSidePanel />
        </>
    );

describe("uiExtensions rendering", () => {
    test("a slot modal renders its slot while open and reports open and close", () => {
        const { container } = renderContainers();
        const onOpen = jest.fn();
        const onClose = jest.fn();
        act(() => {
            instance.uiExtensions.addModal({ id: "plugin", title: "Plugin", slotName: "plugin-body", onOpen, onClose });
        });
        expect(container.querySelector('slot[name="plugin-body"]')).toBeNull();

        act(() => {
            dispatch(showModal({ key: "plugin" }));
        });
        expect(container.querySelector('slot[name="plugin-body"]')).not.toBeNull();
        expect(onOpen).toHaveBeenCalledTimes(1);

        act(() => {
            dispatch(hideModal("plugin"));
        });
        expect(container.querySelector('slot[name="plugin-body"]')).toBeNull();
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test("a component modal is mounted while open", () => {
        const { getByText, queryByText } = renderContainers();
        act(() => {
            instance.uiExtensions.addModal({ id: "react-plugin", component: () => <div>React plugin body</div> });
            dispatch(showModal({ key: "react-plugin" }));
        });
        expect(getByText("React plugin body")).toBeInTheDocument();

        act(() => {
            instance.uiExtensions.removeModal("react-plugin");
        });
        expect(queryByText("React plugin body")).toBeNull();
    });

    test("a slot side panel renders its slot and title when shown", () => {
        const { container, getByText } = renderContainers();
        const onOpen = jest.fn();
        act(() => {
            instance.uiExtensions.addSidePanel({ id: "plugin-panel", label: "Plugin panel", icon: "menuMaps", slotName: "plugin-panel-body", onOpen });
            dispatch(setShownSidePanel("plugin-panel"));
        });
        expect(container.querySelector('slot[name="plugin-panel-body"]')).not.toBeNull();
        expect(getByText("Plugin panel", { selector: "span" })).toBeInTheDocument();
        expect(onOpen).toHaveBeenCalledTimes(1);
    });
});
