import "@testing-library/jest-dom";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MoorhenClickAwayListener } from "../../../src/components/interface-base/utils/ClickAwayListener";
import { renderWithinInstance } from "../testUtils";

// The document listener is registered from a setTimeout(0) so it doesn't catch the
// click that opened the popup; let that fire before clicking away.
const flushListenerRegistration = async () => {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
};

describe("MoorhenClickAwayListener", () => {
    test("calls onClickAway when the click lands outside", async () => {
        const user = userEvent.setup();
        const onClickAway = jest.fn();
        renderWithinInstance(
            <MoorhenClickAwayListener onClickAway={onClickAway}>
                <button>Inside</button>
            </MoorhenClickAwayListener>
        );
        await flushListenerRegistration();

        await user.click(document.body);
        expect(onClickAway).toHaveBeenCalledTimes(1);
    });

    test("does not call onClickAway when the click lands inside", async () => {
        const user = userEvent.setup();
        const onClickAway = jest.fn();
        renderWithinInstance(
            <MoorhenClickAwayListener onClickAway={onClickAway}>
                <button>Inside</button>
            </MoorhenClickAwayListener>
        );
        await flushListenerRegistration();

        await user.click(screen.getByRole("button", { name: "Inside" }));
        expect(onClickAway).not.toHaveBeenCalled();
    });

    // Regression: the listener is registered once on mount, so a handler that closed
    // over the props of the first render would judge the guard against the state as it
    // was at mount time. MoorhenContextMenu guards on `!showOverlay`, which is false at
    // mount, so a stale handler dismisses the menu (and the popover it owns) as soon as
    // the user clicks anything in the overlay.
    test("click-away callback reflects state that changed after mount", async () => {
        const user = userEvent.setup();
        const onClickAway = jest.fn();

        const Guarded = () => {
            const [overlayShown, setOverlayShown] = useState(false);
            return (
                <MoorhenClickAwayListener onClickAway={() => !overlayShown && onClickAway()}>
                    <button onClick={() => setOverlayShown(true)}>Show overlay</button>
                </MoorhenClickAwayListener>
            );
        };

        renderWithinInstance(<Guarded />);
        await flushListenerRegistration();

        await user.click(screen.getByRole("button", { name: "Show overlay" }));
        expect(onClickAway).not.toHaveBeenCalled();

        await user.click(document.body);
        expect(onClickAway).not.toHaveBeenCalled();
    });
});
