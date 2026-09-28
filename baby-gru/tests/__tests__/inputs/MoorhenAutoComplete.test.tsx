import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { MoorhenInstanceProvider } from "../../../src/InstanceManager";
import { MoorhenAutoComplete } from "../../../src/components/inputs/autocomplete/AutoComplete";
import { mockMenuSystem, renderWithinInstance } from "../testUtils";

describe("MoorhenAutoComplete", () => {
    const resultsRenderer = (item: string) => <div key={item}>{item}</div>;

    test("renders a text input field", () => {
        renderWithinInstance(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenAutoComplete<string> searchItems={["apple", "banana", "cherry"]} resultsRenderer={resultsRenderer} />
            </MoorhenInstanceProvider>
        );
        const input = screen.getByRole("textbox");
        expect(input).toBeInTheDocument();
    });
});
