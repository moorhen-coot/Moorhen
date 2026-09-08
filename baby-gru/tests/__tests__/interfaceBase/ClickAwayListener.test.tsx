import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MoorhenClickAwayListener } from "../../../src/components/interface-base/utils/ClickAwayListener";
import { MoorhenReduxStore } from "../testUtils";

// The document click listener is registered inside a setTimeout(0) after mount,
// so tests must wait a macrotask before dispatching clicks.
const flushListenerRegistration = () =>
    new Promise<void>(resolve => {
        setTimeout(resolve, 0);
    });

describe("MoorhenClickAwayListener", () => {
    test("fires onClickAway for a programmatic document.body.click() triggered from inside the popup", async () => {
        const onClickAway = jest.fn();
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenClickAwayListener onClickAway={onClickAway}>
                    <button type="button" onClick={() => document.body.click()}>
                        Delete everything
                    </button>
                </MoorhenClickAwayListener>
            </Provider>
        );
        await flushListenerRegistration();

        const button = screen.getByText("Delete everything");
        // Real user sequence: the wrapper's onMouseDown sets the synthetic flag first,
        // then the button's onClick issues the programmatic body click. The programmatic
        // click must still be treated as an away click.
        fireEvent.mouseDown(button);
        fireEvent.click(button);

        expect(onClickAway).toHaveBeenCalled();
    });


    test("fires onClickAway for a programmatic body click while a <select> is focused", async () => {
        const onClickAway = jest.fn();
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenClickAwayListener onClickAway={onClickAway}>
                    <select>
                        <option>a</option>
                        <option>b</option>
                    </select>
                </MoorhenClickAwayListener>
            </Provider>
        );
        await flushListenerRegistration();

        const select = screen.getByRole("combobox") as HTMLSelectElement;
        select.focus();
        expect(document.activeElement).toBe(select);

        fireEvent.click(document.body);

        expect(onClickAway).toHaveBeenCalled();
    });

    test("does NOT fire onClickAway for a click inside the popup", async () => {
        const onClickAway = jest.fn();
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenClickAwayListener onClickAway={onClickAway}>
                    <button type="button">Inside</button>
                </MoorhenClickAwayListener>
            </Provider>
        );
        await flushListenerRegistration();

        fireEvent.click(screen.getByText("Inside"));

        expect(onClickAway).not.toHaveBeenCalled();
    });
});
