import "@testing-library/jest-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { useState } from "react";
import { MoorhenInstanceProvider } from "../../src/InstanceManager";
import { MoorhenButton } from "../../src/components/inputs/MoorhenButton/MoorhenButton";
import { MoorhenColourPicker } from "../../src/components/inputs/MoorhenColourPicker/MoorhenColourPicker";
import { MoorhenGradientPicker } from "../../src/components/inputs/MoorhenGradientPicker/MoorhenGradientPicker";
import { MoorhenNumberInput } from "../../src/components/inputs/MoorhenNumberInput/NumberInput";
import { MoorhenSlider } from "../../src/components/inputs/MoorhenSlider/MoorhenSlider";
import { MoorhenToggle } from "../../src/components/inputs/MoorhenToggle/Toggle";
import { MoorhenMoleculeSelect } from "../../src/components/inputs/Selector/MoleculeSelector";
import { MoorhenChainSelect } from "../../src/components/inputs/Selector/MoorhenChainSelect";
import { MoorhenLigandSelect } from "../../src/components/inputs/Selector/MoorhenLigandSelect";
import { MoorhenMapSelect } from "../../src/components/inputs/Selector/MoorhenMapSelect";
import { MoorhenSelect } from "../../src/components/inputs/Selector/Select";
import { MoorhenTextInput } from "../../src/components/inputs/TextInput";
import { MoorhenAutoComplete } from "../../src/components/inputs/autocomplete/AutoComplete";
import { MoorhenMenuSystem } from "../../src/components/menu-system/MenuSystem";
import { _MoorhenReduxStore as MoorhenReduxStore } from "../../src/store/MoorhenReduxStore";
import { setCootInitialized, setDevMode } from "../../src/store/generalStatesSlice";
import { setDefaultBondSmoothness, setHeight, setIsDark, setWidth } from "../../src/store/sceneSettingsSlice";

jest.setTimeout(15000);
jest.mock("chart.js", () => ({
    ...jest.requireActual("chart.js"),
    registerables: [],
}));

// Mock ResizeObserver for components that use popovers
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

const renderWithStore = (component: React.ReactNode) => {
    return render(<Provider store={MoorhenReduxStore}>{component}</Provider>);
};

// ==============================
// MoorhenButton
// ==============================
describe("MoorhenButton", () => {
    test("renders with label", () => {
        renderWithStore(<MoorhenButton label="Click Me" />);
        expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
    });

    test("calls onClick when clicked", async () => {
        const user = userEvent.setup();
        const onClick = jest.fn();
        renderWithStore(<MoorhenButton label="Clickable" onClick={onClick} />);
        await user.click(screen.getByRole("button", { name: /clickable/i }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    test("does not call onClick when disabled", async () => {
        const user = userEvent.setup();
        const onClick = jest.fn();
        renderWithStore(<MoorhenButton label="Disabled" onClick={onClick} disabled={true} />);
        const button = screen.getByRole("button", { name: /disabled/i });
        expect(button).toBeDisabled();
        await user.click(button);
        expect(onClick).not.toHaveBeenCalled();
    });

    test("renders with children", () => {
        renderWithStore(<MoorhenButton>Child Content</MoorhenButton>);
        expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    test("renders as icon-only type", () => {
        renderWithStore(<MoorhenButton type="icon-only" icon="MatSymKeyboardArrowDown" />);
        const button = screen.getByRole("button");
        expect(button.className).toContain("moorhen__button__icon-only");
    });

    test("applies custom className", () => {
        renderWithStore(<MoorhenButton label="Styled" className="my-custom-class" />);
        const button = screen.getByRole("button", { name: /styled/i });
        expect(button.className).toContain("my-custom-class");
    });

    test("applies custom style", () => {
        renderWithStore(<MoorhenButton label="StyledBtn" style={{ backgroundColor: "blue" }} />);
        const button = screen.getByRole("button", { name: /styledbtn/i });
        expect(button).toHaveStyle("background-color: blue");
    });

    test("renders with variant primary", () => {
        renderWithStore(<MoorhenButton label="Primary" variant="primary" />);
        const button = screen.getByRole("button", { name: /primary/i });
        expect(button.className).toContain("primary");
    });

    test("renders with variant danger", () => {
        renderWithStore(<MoorhenButton label="Danger" variant="danger" />);
        const button = screen.getByRole("button", { name: /danger/i });
        expect(button.className).toContain("danger");
    });

    test("forwards ref", () => {
        const ref = { current: null };
        renderWithStore(<MoorhenButton label="RefBtn" ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    test("renders tooltip text", () => {
        renderWithStore(
            <MoorhenInstanceProvider menuSystem={{} as MoorhenMenuSystem}>
                <MoorhenButton label="TooltipBtn" tooltip="Useful tooltip" />
            </MoorhenInstanceProvider>
        );
        expect(screen.getByText("TooltipBtn")).toBeInTheDocument();
    });
});

// ==============================
// MoorhenToggle
// ==============================
describe("MoorhenToggle", () => {
    test("renders with label", () => {
        render(<MoorhenToggle label="Toggle me" />);
        expect(screen.getByText("Toggle me")).toBeInTheDocument();
    });

    test("renders a checkbox input", () => {
        render(<MoorhenToggle label="Toggle input" />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeInTheDocument();
    });

    test("is checked when checked prop is true", () => {
        render(<MoorhenToggle label="Checked" checked={true} />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeChecked();
    });

    test("is unchecked when checked prop is false", () => {
        render(<MoorhenToggle label="Unchecked" checked={false} />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).not.toBeChecked();
    });

    test("calls onChange when toggled", async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<MoorhenToggle label="Changeable" onChange={onChange} />);
        const checkbox = screen.getByRole("checkbox");
        await user.click(checkbox);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test("is disabled when disabled prop is true", () => {
        render(<MoorhenToggle label="Disabled toggle" disabled={true} />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeDisabled();
    });

    test("does not call onChange when disabled", async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<MoorhenToggle label="Disabled change" onChange={onChange} disabled={true} />);
        const checkbox = screen.getByRole("checkbox");
        await user.click(checkbox);
        expect(onChange).not.toHaveBeenCalled();
    });

    test("renders with radio type", () => {
        const { container } = render(<MoorhenToggle label="Radio" type="radio" />);
        const radioSpan = container.querySelector(".moorhen__toggle-radio");
        expect(radioSpan).toBeInTheDocument();
    });

    test("renders with checkbox type", () => {
        const { container } = render(<MoorhenToggle label="Checkbox" type="checkbox" />);
        const checkboxSpan = container.querySelector(".moorhen__toggle-checkbox");
        expect(checkboxSpan).toBeInTheDocument();
    });

    test("renders with switch type (default)", () => {
        const { container } = render(<MoorhenToggle label="Switch" />);
        const sliderSpan = container.querySelector(".moorhen__toggle-slider");
        expect(sliderSpan).toBeInTheDocument();
    });

    test("applies custom className", () => {
        const { container } = render(<MoorhenToggle label="Custom class" className="my-toggle-class" />);
        const toggleContainer = container.firstElementChild;
        expect(toggleContainer.className).toContain("my-toggle-class");
    });

    test("applies custom style", () => {
        const { container } = render(<MoorhenToggle label="Styled toggle" style={{ margin: "10px" }} />);
        const toggleContainer = container.firstElementChild;
        expect(toggleContainer).toHaveStyle("margin: 10px");
    });

    test("renders with name attribute", () => {
        render(<MoorhenToggle label="Named" name="myToggle" />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toHaveAttribute("name", "myToggle");
    });

    test("renders with id attribute", () => {
        render(<MoorhenToggle label="ID'd" id="myToggleId" />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toHaveAttribute("id", "myToggleId");
    });

    test("works bidirectionally with lifted useState pattern", async () => {
        const user = userEvent.setup();
        function ToggleWrapper() {
            const [checked, setChecked] = useState(false);
            return (
                <>
                    <button data-testid="reset-toggle" onClick={() => setChecked(false)}>
                        Reset
                    </button>
                    <MoorhenToggle label="Lifted" checked={checked} onChange={() => setChecked(!checked)} />
                </>
            );
        }
        render(<ToggleWrapper />);
        const checkbox = screen.getByRole("checkbox");
        // Initial state
        expect(checkbox).not.toBeChecked();
        // User interaction → state lifted → UI updates
        await user.click(checkbox);
        expect(checkbox).toBeChecked();
        // External state change → component re-renders
        await user.click(screen.getByTestId("reset-toggle"));
        expect(checkbox).not.toBeChecked();
    });
});

// ==============================
// MoorhenSelect
// ==============================
describe("MoorhenSelect", () => {
    test("renders with options", () => {
        renderWithStore(
            <MoorhenSelect>
                <option value="opt1">Option 1</option>
                <option value="opt2">Option 2</option>
            </MoorhenSelect>
        );
        expect(screen.getByText("Option 1")).toBeInTheDocument();
        expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    test("renders a select element", () => {
        renderWithStore(
            <MoorhenSelect>
                <option value="a">A</option>
            </MoorhenSelect>
        );
        expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    test("displays label when provided", () => {
        renderWithStore(
            <MoorhenSelect label="Choose option">
                <option value="a">A</option>
            </MoorhenSelect>
        );
        expect(screen.getByText("Choose option")).toBeInTheDocument();
    });

    test("calls onChange when selection changes", async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        renderWithStore(
            <MoorhenSelect onChange={onChange}>
                <option value="opt1">Option 1</option>
                <option value="opt2">Option 2</option>
            </MoorhenSelect>
        );
        const select = screen.getByRole("combobox");
        await user.selectOptions(select, "opt2");
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test("calls setValue when selection changes", async () => {
        const user = userEvent.setup();
        const setValue = jest.fn();
        renderWithStore(
            <MoorhenSelect setValue={setValue}>
                <option value="opt1">Option 1</option>
                <option value="opt2">Option 2</option>
            </MoorhenSelect>
        );
        const select = screen.getByRole("combobox");
        await user.selectOptions(select, "opt2");
        expect(setValue).toHaveBeenCalledWith("opt2");
    });

    test("uses defaultValue", () => {
        renderWithStore(
            <MoorhenSelect defaultValue="opt2">
                <option value="opt1">Option 1</option>
                <option value="opt2">Option 2</option>
            </MoorhenSelect>
        );
        const select = screen.getByRole("combobox");
        expect(select).toHaveValue("opt2");
    });

    test("is disabled when disabled prop is true", () => {
        renderWithStore(
            <MoorhenSelect disabled={true}>
                <option value="a">A</option>
            </MoorhenSelect>
        );
        const select = screen.getByRole("combobox");
        expect(select).toBeDisabled();
    });

    test("renders inline by default", () => {
        const { container } = renderWithStore(
            <MoorhenSelect label="Inline">
                <option value="a">A</option>
            </MoorhenSelect>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv.className).toContain("moorhen__stack__row");
    });

    test("renders column layout when inline is false", () => {
        const { container } = renderWithStore(
            <MoorhenSelect label="Column" inline={false}>
                <option value="a">A</option>
            </MoorhenSelect>
        );
        const stackDiv = container.firstElementChild;
        expect(stackDiv.className).toContain("moorhen__stack__column");
    });

    test("forwards ref", () => {
        const ref = { current: null };
        renderWithStore(
            <MoorhenSelect ref={ref}>
                <option value="a">A</option>
            </MoorhenSelect>
        );
        expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    });

    test("works bidirectionally with lifted useState pattern", async () => {
        const user = userEvent.setup();
        function SelectWrapper() {
            const [value, setValue] = useState("opt1");
            return (
                <Provider store={MoorhenReduxStore}>
                    <button data-testid="reset-select" onClick={() => setValue("opt1")}>
                        Reset
                    </button>
                    <MoorhenSelect value={value} setValue={setValue}>
                        <option value="opt1">Option 1</option>
                        <option value="opt2">Option 2</option>
                    </MoorhenSelect>
                </Provider>
            );
        }
        render(<SelectWrapper />);
        const select = screen.getByRole("combobox");
        // Initial state
        expect(select).toHaveValue("opt1");
        // User interaction → state lifted → UI updates
        await user.selectOptions(select, "opt2");
        expect(select).toHaveValue("opt2");
        // External state change → component re-renders
        await user.click(screen.getByTestId("reset-select"));
        expect(select).toHaveValue("opt1");
    });
});

// ==============================
// MoorhenTextInput
// ==============================
describe("MoorhenTextInput", () => {
    test("renders an input field", () => {
        renderWithStore(<MoorhenTextInput />);
        const input = screen.getByRole("textbox");
        expect(input).toBeInTheDocument();
    });

    test("renders label when provided", () => {
        renderWithStore(<MoorhenTextInput label="Name" />);
        expect(screen.getByText("Name")).toBeInTheDocument();
    });

    test("calls setText on change", async () => {
        const user = userEvent.setup();
        const setText = jest.fn();
        renderWithStore(<MoorhenTextInput setText={setText} />);
        const input = screen.getByRole("textbox");
        await user.type(input, "hello");
        expect(setText).toHaveBeenCalled();
    });

    test("calls onChange on change", async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        renderWithStore(<MoorhenTextInput onChange={onChange} />);
        const input = screen.getByRole("textbox");
        await user.type(input, "a");
        expect(onChange).toHaveBeenCalled();
    });

    test("renders with defaultValue", () => {
        renderWithStore(<MoorhenTextInput text="Initial value" />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("Initial value");
    });

    test("disables input when disabled is true", () => {
        renderWithStore(<MoorhenTextInput disabled={true} />);
        const input = screen.getByRole("textbox");
        expect(input).toBeDisabled();
    });

    test("renders with placeholder", () => {
        renderWithStore(<MoorhenTextInput placeholder="Enter text..." />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveAttribute("placeholder", "Enter text...");
    });

    test("renders with button when button prop is true", () => {
        const onClick = jest.fn();
        renderWithStore(<MoorhenTextInput button={true} onClick={onClick} />);
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    test("calls onSubmit when Enter is pressed", async () => {
        const user = userEvent.setup();
        const onSubmit = jest.fn();
        renderWithStore(<MoorhenTextInput onSubmit={onSubmit} />);
        const input = screen.getByRole("textbox");
        await user.type(input, "{Enter}");
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    test("applies isInvalid class", () => {
        renderWithStore(<MoorhenTextInput isInvalid={true} />);
        const input = screen.getByRole("textbox");
        expect(input.className).toContain("invalid");
    });

    test("renders inline by default (line direction)", () => {
        const { container } = renderWithStore(<MoorhenTextInput label="Inline" />);
        const stackDiv = container.firstElementChild;
        expect(stackDiv.className).toContain("moorhen__stack__row");
    });

    test("renders column layout when inline is false", () => {
        const { container } = renderWithStore(<MoorhenTextInput label="Column" inline={false} />);
        const stackDiv = container.firstElementChild;
        expect(stackDiv.className).toContain("moorhen__stack__column");
    });

    test("applies uppercase style", () => {
        renderWithStore(<MoorhenTextInput uppercase={true} />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveStyle("text-transform: uppercase");
    });

    test("renders as readonly", () => {
        renderWithStore(<MoorhenTextInput readOnly={true} />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveAttribute("readonly");
    });

    test("forwards ref", () => {
        const ref = { current: null };
        renderWithStore(<MoorhenTextInput ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    test("works bidirectionally with lifted useState pattern", async () => {
        const user = userEvent.setup();
        function TextInputWrapper() {
            const [text, setText] = useState("");
            return (
                <Provider store={MoorhenReduxStore}>
                    <button data-testid="reset-text" onClick={() => setText("")}>
                        Reset
                    </button>
                    <MoorhenTextInput text={text} setText={setText} />
                </Provider>
            );
        }
        render(<TextInputWrapper />);
        const input = screen.getByRole("textbox");
        // Initial state
        expect(input).toHaveValue("");
        // User interaction → state lifted → UI updates
        await user.type(input, "hello");
        expect(input).toHaveValue("hello");
        // External state change → component re-renders
        await user.click(screen.getByTestId("reset-text"));
        expect(input).toHaveValue("");
    });
});

// ==============================
// MoorhenNumberInput
// ==============================
describe("MoorhenNumberInput", () => {
    test("renders an input field", () => {
        renderWithStore(<MoorhenNumberInput value={42} />);
        const input = screen.getByRole("textbox");
        expect(input).toBeInTheDocument();
    });

    test("displays formatted value", () => {
        renderWithStore(<MoorhenNumberInput value={42.5} decimalDigits={1} />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("42.5");
    });

    test("displays integer value when integer prop is true", () => {
        renderWithStore(<MoorhenNumberInput value={42.7} integer={true} />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("43");
    });

    test("displays label when provided", () => {
        renderWithStore(<MoorhenNumberInput value={0} label="Radius" />);
        expect(screen.getByText("Radius")).toBeInTheDocument();
    });

    test("disables input when disabled is true", () => {
        renderWithStore(<MoorhenNumberInput value={0} disabled={true} />);
        const input = screen.getByRole("textbox");
        expect(input).toBeDisabled();
    });

    test("shows tooltip when provided", () => {
        renderWithStore(
            <MoorhenInstanceProvider menuSystem={{} as MoorhenMenuSystem}>
                <MoorhenNumberInput value={0} tooltip="Number tooltip" />
            </MoorhenInstanceProvider>
        );
        // The input displays the formatted value with 2 decimal places
        expect(screen.getByDisplayValue("0.00")).toBeInTheDocument();
    });

    test("applies custom className", () => {
        renderWithStore(<MoorhenNumberInput value={0} className="my-num-class" />);
        expect(screen.getByRole("textbox").className).toContain("my-num-class");
        // className is applied to the wrapping MoorhenStack
    });

    test("forwards ref", () => {
        const ref = { current: null };
        renderWithStore(<MoorhenNumberInput value={0} ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    test("works bidirectionally with lifted useState pattern", async () => {
        const user = userEvent.setup();
        function NumberInputWrapper() {
            const [value, setValue] = useState(10);
            return (
                <Provider store={MoorhenReduxStore}>
                    <button data-testid="reset-num" onClick={() => setValue(10)}>
                        Reset
                    </button>
                    <MoorhenNumberInput value={value} setValue={setValue} />
                </Provider>
            );
        }
        render(<NumberInputWrapper />);
        const input = screen.getByRole("textbox");
        // Initial state
        expect(input).toHaveValue("10.00");
        // User interaction → state lifted → UI updates
        await user.clear(input);
        await user.type(input, "42.50");
        expect(input).toHaveValue("42.50");
        // External state change → component re-renders
        await user.click(screen.getByTestId("reset-num"));
        expect(input).toHaveValue("10.00");
    });

    // -------------------------------------------------------
    // waitReturn mode — only commits on Enter
    // -------------------------------------------------------
    test("waitReturn does not call setValue on keystroke (only on Enter)", async () => {
        const user = userEvent.setup();
        const setValue = jest.fn();
        renderWithStore(<MoorhenNumberInput value={0} setValue={setValue} waitReturn={true} />);
        const input = screen.getByRole("textbox");
        await user.clear(input);
        await user.type(input, "42");
        // Without Enter, setValue should not have been called
        expect(setValue).not.toHaveBeenCalled();
    });

    test("waitReturn calls setValue when Enter is pressed", async () => {
        const user = userEvent.setup();
        const setValue = jest.fn();
        renderWithStore(<MoorhenNumberInput value={0} setValue={setValue} waitReturn={true} />);
        const input = screen.getByRole("textbox");
        await user.clear(input);
        await user.type(input, "42{Enter}");
        expect(setValue).toHaveBeenCalledWith(42);
    });

    // -------------------------------------------------------
    // minMax clamping on blur
    // -------------------------------------------------------
    test("clamps value to minMax range on blur", async () => {
        const user = userEvent.setup();
        const setValue = jest.fn();
        renderWithStore(<MoorhenNumberInput value={50} setValue={setValue} minMax={[0, 100]} waitReturn={true} />);
        const input = screen.getByRole("textbox");
        await user.clear(input);
        await user.type(input, "999");
        // Blur the input to trigger commitInputValue
        await user.click(document.body);
        // Should clamp to max of 100
        expect(setValue).toHaveBeenCalledWith(100);
    });

    // -------------------------------------------------------
    // allowNegativeValues
    // -------------------------------------------------------
    test("rejects negative input when allowNegativeValues is false", async () => {
        const user = userEvent.setup();
        const setValue = jest.fn();
        renderWithStore(<MoorhenNumberInput value={10} setValue={setValue} allowNegativeValues={false} waitReturn={true} />);
        const input = screen.getByRole("textbox");
        await user.clear(input);
        await user.type(input, "-5{Enter}");
        // -5 is invalid so the input won't commit
        expect(setValue).not.toHaveBeenCalled();
    });

    // -------------------------------------------------------
    // type="number" with +/- buttons
    // -------------------------------------------------------
    test("renders +/- arrow buttons when type is number", () => {
        renderWithStore(<MoorhenNumberInput value={50} setValue={() => {}} type="number" />);
        const buttons = screen.getAllByRole("button");
        // Should have at least the up/down arrow buttons
        expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    // -------------------------------------------------------
    // labelPosition
    // -------------------------------------------------------
    test("renders label on top when labelPosition is top", () => {
        const { container } = renderWithStore(<MoorhenNumberInput value={0} label="Top Label" labelPosition="top" />);
        const outerStack = container.firstElementChild;
        expect(outerStack.className).toContain("moorhen__stack__column");
    });

    // -------------------------------------------------------
    // Validity class (computed from checkIsValidInput internally)
    // -------------------------------------------------------
    test("applies valid class when input value is valid", () => {
        renderWithStore(<MoorhenNumberInput value={42} />);
        const input = screen.getByRole("textbox");
        expect(input.className).toContain("moorhen__input__valid");
    });
});

// ==============================
// MoorhenSlider
// ==============================
describe("MoorhenSlider", () => {
    // -------------------------------------------------------
    // Basic rendering with correct props
    // -------------------------------------------------------
    test("renders a native range input (slider role)", () => {
        renderWithStore(<MoorhenSlider value={50} setValue={() => {}} />);
        const slider = screen.getByRole("slider");
        expect(slider).toBeInTheDocument();
    });

    test("uses the correct value attribute on the hidden range input", () => {
        renderWithStore(<MoorhenSlider value={42} setValue={() => {}} minVal={0} maxVal={100} />);
        const slider = screen.getByRole("slider");
        expect(slider).toHaveValue("42");
    });

    test("applies min / max on the hidden range input", () => {
        renderWithStore(<MoorhenSlider value={50} setValue={() => {}} minVal={10} maxVal={200} />);
        const slider = screen.getByRole("slider");
        expect(slider).toHaveAttribute("min", "10");
        expect(slider).toHaveAttribute("max", "200");
    });

    // -------------------------------------------------------
    // sliderTitle
    // -------------------------------------------------------
    test("renders sliderTitle and shows the current value", () => {
        renderWithStore(<MoorhenSlider value={37} setValue={() => {}} sliderTitle="Opacity" />);
        expect(screen.getByText(/opacity/i)).toBeInTheDocument();
        expect(screen.getByText(/37/)).toBeInTheDocument();
    });

    test("hides the value next to the title when showTitleValue is false", () => {
        renderWithStore(<MoorhenSlider value={50} setValue={() => {}} sliderTitle="Volume" showTitleValue={false} />);
        expect(screen.getByText("Volume")).toBeInTheDocument();
        // The value 50 should not appear immediately after "Volume"
        expect(screen.queryByText("50")).not.toBeInTheDocument();
    });

    test("does not render any title when sliderTitle is undefined", () => {
        const { container } = renderWithStore(<MoorhenSlider value={50} setValue={() => {}} />);
        const labels = container.querySelectorAll(".moorhen__slider__label");
        expect(labels.length).toBe(0);
    });

    test("renders sliderTitleUnit after the value", () => {
        renderWithStore(<MoorhenSlider value={50} setValue={() => {}} sliderTitle="Radius" sliderTitleUnit=" Å" />);
        expect(screen.getByText(/Radius/)).toBeInTheDocument();
        expect(screen.getByText(/Å/)).toBeInTheDocument();
    });

    // -------------------------------------------------------
    // isDisabled
    // -------------------------------------------------------
    test("disables the hidden range input when isDisabled is true", () => {
        renderWithStore(<MoorhenSlider value={50} setValue={() => {}} isDisabled={true} />);
        const slider = screen.getByRole("slider");
        expect(slider).toBeDisabled();
    });

    test("applies disabled class to custom track and thumb", () => {
        const { container } = renderWithStore(<MoorhenSlider value={50} setValue={() => {}} isDisabled={true} />);
        const track = container.querySelector(".moorhen__slider-track");
        const thumb = container.querySelector(".moorhen__slider-thumb");
        expect(track.className).toContain("disabled");
        expect(thumb.className).toContain("disabled");
    });

    // -------------------------------------------------------
    // decimalPlaces
    // -------------------------------------------------------
    test("displays value with correct decimal places in the title", () => {
        renderWithStore(<MoorhenSlider value={5.6789} setValue={() => {}} sliderTitle="Precise" decimalPlaces={2} />);
        expect(screen.getByText(/5\.68/)).toBeInTheDocument();
    });

    test("uses decimalPlaces as the step on the native input", () => {
        renderWithStore(<MoorhenSlider value={0.5} setValue={() => {}} decimalPlaces={2} minVal={0} maxVal={1} />);
        const slider = screen.getByRole("slider");
        expect(slider).toHaveAttribute("step", "0.01");
    });

    // -------------------------------------------------------
    // step
    // -------------------------------------------------------
    test("snaps value to step increments via setValue", () => {
        const setValue = jest.fn();
        renderWithStore(<MoorhenSlider value={50} setValue={setValue} step={20} minVal={0} maxVal={100} />);
        // The setValue wrapper snaps to step; fire a change at a non-step value
        const slider = screen.getByRole("slider");
        fireEvent.change(slider, { target: { value: "55" } });
        // 55 should snap to nearest step of 20: minVal=0, steps: 0,20,40,60,80,100 => 55→60
        expect(setValue).toHaveBeenCalledWith(60);
    });

    // -------------------------------------------------------
    // allowedValues
    // -------------------------------------------------------
    test("snaps value to the closest allowed value", () => {
        const setValue = jest.fn();
        renderWithStore(<MoorhenSlider value={10} setValue={setValue} allowedValues={[0, 25, 50, 75, 100]} minVal={0} maxVal={100} />);
        const slider = screen.getByRole("slider");
        fireEvent.change(slider, { target: { value: "30" } });
        // 30 is closest to 25
        expect(setValue).toHaveBeenCalledWith(25);
    });

    // -------------------------------------------------------
    // scale="log"
    // -------------------------------------------------------
    test("log scale transforms the hidden input min/max to log10 space", () => {
        renderWithStore(<MoorhenSlider value={10} setValue={() => {}} scale="log" minVal={1} maxVal={100} />);
        const slider = screen.getByRole("slider");
        // log10(1) = 0, log10(100) = 2
        expect(slider).toHaveAttribute("min", "0");
        expect(slider).toHaveAttribute("max", "2");
    });

    test("log scale stores the log10 value in the input", () => {
        renderWithStore(<MoorhenSlider value={10} setValue={() => {}} scale="log" minVal={1} maxVal={100} />);
        const slider = screen.getByRole("slider");
        // log10(10) = 1
        expect(slider).toHaveValue("1");
    });

    // -------------------------------------------------------
    // showButtons / PlusMinusButton
    // -------------------------------------------------------
    test("renders plus/minus buttons by default", () => {
        renderWithStore(<MoorhenSlider value={50} setValue={() => {}} sliderTitle="Test" />);
        // Two icon-only buttons: minus (L) and plus (R)
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    test("hides plus/minus buttons when showButtons is false", () => {
        renderWithStore(<MoorhenSlider value={50} setValue={() => {}} showButtons={false} />);
        // The plus/minus buttons use moorhen__slider__leftPanel / rightPanel
        const leftPanel = document.querySelector(".moorhen__slider__leftPanel");
        const rightPanel = document.querySelector(".moorhen__slider__rightPanel");
        // When showButtons is false, drawSidePanels returns empty fragments
        expect(leftPanel.textContent).toBe("");
        expect(rightPanel.textContent).toBe("");
    });

    // -------------------------------------------------------
    // usePreciseInput
    // -------------------------------------------------------
    test("shows a number textbox when usePreciseInput is true", () => {
        renderWithStore(<MoorhenSlider value={50} setValue={() => {}} usePreciseInput={true} sliderTitle="Test" />);
        const textbox = screen.getByRole("textbox");
        expect(textbox).toBeInTheDocument();
    });

    test("precise input displays the formatted value", () => {
        renderWithStore(<MoorhenSlider value={42.5} setValue={() => {}} usePreciseInput={true} sliderTitle="Test" decimalPlaces={1} />);
        const textbox = screen.getByRole("textbox");
        expect(textbox).toHaveValue("42.5");
    });

    // -------------------------------------------------------
    // Custom labels (rendered as clickable buttons below the track)
    // -------------------------------------------------------
    test("renders custom labels as clickable buttons", () => {
        const setValue = jest.fn();
        const labels = [
            { value: 0, label: "Off" },
            { value: 50, label: "Mid" },
            { value: 100, label: "Max" },
        ];
        renderWithStore(<MoorhenSlider value={50} setValue={setValue} labels={labels} minVal={0} maxVal={100} />);
        expect(screen.getByText("Off")).toBeInTheDocument();
        expect(screen.getByText("Mid")).toBeInTheDocument();
        expect(screen.getByText("Max")).toBeInTheDocument();

        // Clicking a label button should call setValue
        fireEvent.click(screen.getByText("Max"));
        expect(setValue).toHaveBeenCalledWith(100);
    });

    test("labels with tick prop render a tick marker", () => {
        const { container } = renderWithStore(
            <MoorhenSlider value={50} setValue={() => {}} labels={[{ value: 50, label: "", tick: true }]} minVal={0} maxVal={100} />
        );
        const labelButton = container.querySelector(".moorhen__slider__label-bottom");
        expect(labelButton.className).toContain("tick");
    });

    test("labels with colour prop apply custom colour", () => {
        const { container } = renderWithStore(
            <MoorhenSlider value={50} setValue={() => {}} labels={[{ value: 50, label: "Red", colour: "red" }]} minVal={0} maxVal={100} />
        );
        const labelButton = container.querySelector(".moorhen__slider__label-bottom");
        expect((labelButton as HTMLElement).style.color).toBe("red");
    });

    // -------------------------------------------------------
    // showTicks
    // -------------------------------------------------------
    test("renders tick marks when showTicks is true", () => {
        const { container } = renderWithStore(<MoorhenSlider value={50} setValue={() => {}} showTicks={true} minVal={0} maxVal={100} />);
        const ticks = container.querySelectorAll(".moorhen__slider__tick");
        expect(ticks.length).toBeGreaterThan(0);
    });

    test("renders major ticks when majorTickSpacing is provided", () => {
        const { container } = renderWithStore(
            <MoorhenSlider value={50} setValue={() => {}} showTicks={true} majorTickSpacing={50} minVal={0} maxVal={100} />
        );
        const majorTicks = container.querySelectorAll(".moorhen__slider__major-tick");
        expect(majorTicks.length).toBeGreaterThan(0);
    });

    // -------------------------------------------------------
    // colour prop
    // -------------------------------------------------------
    test("applies custom colour to the slider thumb", () => {
        const { container } = renderWithStore(<MoorhenSlider value={50} setValue={() => {}} colour="rgb(255, 0, 0)" />);
        const thumb = container.querySelector(".moorhen__slider-thumb");
        expect((thumb as HTMLElement).style.background).toBe("rgb(255, 0, 0)");
    });

    // -------------------------------------------------------
    // Range type (dual slider)
    // -------------------------------------------------------
    test('renders two range inputs when type is "range"', () => {
        renderWithStore(
            <MoorhenSlider type="range" value={25} setValue={() => {}} value2={75} setValue2={() => {}} minVal={0} maxVal={100} />
        );
        const sliders = screen.getAllByRole("slider");
        expect(sliders.length).toBe(2);
    });

    test("range slider shows both values in the title", () => {
        renderWithStore(
            <MoorhenSlider
                type="range"
                value={20}
                setValue={() => {}}
                value2={80}
                setValue2={() => {}}
                sliderTitle="Range"
                minVal={0}
                maxVal={100}
            />
        );
        expect(screen.getByText(/20/)).toBeInTheDocument();
        expect(screen.getByText(/80/)).toBeInTheDocument();
    });

    test("range slider renders a filled track between the two thumbs", () => {
        const { container } = renderWithStore(
            <MoorhenSlider type="range" value={25} setValue={() => {}} value2={75} setValue2={() => {}} minVal={0} maxVal={100} />
        );
        const fill = container.querySelector(".moorhen__slider-track-fill");
        expect(fill).toBeInTheDocument();
    });

    // -------------------------------------------------------
    // Bidirectional state (lifted useState)
    // -------------------------------------------------------
    test("works bidirectionally with lifted useState pattern using fireEvent.change", async () => {
        const user = userEvent.setup();
        function SliderWrapper() {
            const [value, setValue] = useState(50);
            return (
                <Provider store={MoorhenReduxStore}>
                    <button data-testid="reset-slider" onClick={() => setValue(50)}>
                        Reset
                    </button>
                    <MoorhenSlider value={value} setValue={setValue} minVal={0} maxVal={100} sliderTitle="Test" />
                </Provider>
            );
        }
        render(<SliderWrapper />);
        expect(screen.getByText(/test/i)).toBeInTheDocument();
        const slider = screen.getByRole("slider");
        // Initial state
        expect(slider).toHaveValue("50");
        // User interaction → state lifted → UI updates
        fireEvent.change(slider, { target: { value: "75" } });
        expect(slider).toHaveValue("75");
        // External state change → component re-renders
        await user.click(screen.getByTestId("reset-slider"));
        expect(slider).toHaveValue("50");
    });

    // -------------------------------------------------------
    // ariaLabel / getAriaValueText
    // -------------------------------------------------------
    test("sets aria-label on the native input", () => {
        renderWithStore(<MoorhenSlider value={50} setValue={() => {}} ariaLabel="Brightness" />);
        const slider = screen.getByRole("slider");
        expect(slider).toHaveAttribute("aria-label", "Brightness");
    });

    // -------------------------------------------------------
    // style prop
    // -------------------------------------------------------
    test("applies custom style to the outer container", () => {
        const { container } = renderWithStore(<MoorhenSlider value={50} setValue={() => {}} style={{ marginTop: "20px" }} />);
        const outermost = container.firstElementChild;
        expect((outermost as HTMLElement).style.marginTop).toBe("20px");
    });

    // -------------------------------------------------------
    // Clamping - value stuck at bounds
    // -------------------------------------------------------
    test("thumb position is clamped between 0% and 100%", () => {
        // value above maxVal → position should be 100%
        const { container, rerender } = renderWithStore(<MoorhenSlider value={999} setValue={() => {}} minVal={0} maxVal={100} />);
        const thumb = container.querySelector(".moorhen__slider-thumb");
        expect((thumb as HTMLElement).style.left).toBe("100%");
    });

    test("thumb position is 0% when value equals minVal", () => {
        const { container } = renderWithStore(<MoorhenSlider value={0} setValue={() => {}} minVal={0} maxVal={100} />);
        const thumb = container.querySelector(".moorhen__slider-thumb");
        expect((thumb as HTMLElement).style.left).toBe("0%");
    });
});

// ==============================
// MoorhenMoleculeSelect
// ==============================
describe("MoorhenMoleculeSelect", () => {
    test('renders "No molecules loaded" when molecule list is empty', () => {
        renderWithStore(<MoorhenMoleculeSelect molecules={[]} />);
        expect(screen.getByText("No molecules loaded")).toBeInTheDocument();
    });

    test("renders molecule options", () => {
        const mockMolecules = [
            { molNo: 0, name: "3u7t", sequences: [] },
            { molNo: 1, name: "4hhb", sequences: [] },
        ];
        renderWithStore(<MoorhenMoleculeSelect molecules={mockMolecules as any} />);
        expect(screen.getByText("0: 3u7t")).toBeInTheDocument();
        expect(screen.getByText("1: 4hhb")).toBeInTheDocument();
    });

    test('shows "Any molecule" option when allowAny is true', () => {
        const mockMolecules = [{ molNo: 0, name: "3u7t", sequences: [] }];
        renderWithStore(<MoorhenMoleculeSelect molecules={mockMolecules as any} allowAny={true} />);
        expect(screen.getByText("Any molecule")).toBeInTheDocument();
    });

    test("disables select when empty", () => {
        renderWithStore(<MoorhenMoleculeSelect molecules={[]} />);
        const select = screen.getByRole("combobox");
        expect(select).toBeDisabled();
    });

    test("applies filter function", () => {
        const mockMolecules = [
            { molNo: 0, name: "3u7t", sequences: [] },
            { molNo: 1, name: "4hhb", sequences: [] },
        ];
        renderWithStore(<MoorhenMoleculeSelect molecules={mockMolecules as any} filterFunction={mol => mol.molNo === 0} />);
        expect(screen.getByText("0: 3u7t")).toBeInTheDocument();
        expect(screen.queryByText("1: 4hhb")).not.toBeInTheDocument();
    });

    test("renders with custom label", () => {
        const mockMolecules = [{ molNo: 0, name: "3u7t", sequences: [] }];
        renderWithStore(<MoorhenMoleculeSelect molecules={mockMolecules as any} label="Pick Molecule" />);
        expect(screen.getByText("Pick Molecule")).toBeInTheDocument();
    });
});

// ==============================
// MoorhenMapSelect
// ==============================
describe("MoorhenMapSelect", () => {
    test('renders "No maps available" when map list is empty', () => {
        renderWithStore(<MoorhenMapSelect maps={[]} />);
        expect(screen.getByText("No maps available")).toBeInTheDocument();
    });

    test("renders map options", () => {
        const mockMaps = [
            { molNo: 0, name: "2FoFc" },
            { molNo: 1, name: "FoFc" },
        ];
        renderWithStore(<MoorhenMapSelect maps={mockMaps as any} />);
        expect(screen.getByText("0: 2FoFc")).toBeInTheDocument();
        expect(screen.getByText("1: FoFc")).toBeInTheDocument();
    });

    test("applies filter function", () => {
        const mockMaps = [
            { molNo: 0, name: "2FoFc", hasReflectionData: true },
            { molNo: 1, name: "FoFc", hasReflectionData: false },
        ];
        renderWithStore(<MoorhenMapSelect maps={mockMaps as any} filterFunction={(map: any) => !map.hasReflectionData} />);
        expect(screen.queryByText("0: 2FoFc")).not.toBeInTheDocument();
        expect(screen.getByText("1: FoFc")).toBeInTheDocument();
    });

    test("renders with custom label", () => {
        const mockMaps = [{ molNo: 0, name: "2FoFc" }];
        renderWithStore(<MoorhenMapSelect maps={mockMaps as any} label="Select Map" />);
        expect(screen.getByText("Select Map")).toBeInTheDocument();
    });

    test("disables select when map list is empty", () => {
        renderWithStore(<MoorhenMapSelect maps={[]} />);
        const select = screen.getByRole("combobox");
        expect(select).toBeDisabled();
    });
});

// ==============================
// MoorhenChainSelect
// ==============================
describe("MoorhenChainSelect", () => {
    test("renders chain options from molecule sequences", () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: "3u7t",
                sequences: [
                    { chain: "A", type: 1 },
                    { chain: "B", type: 1 },
                ],
            },
        ];
        renderWithStore(<MoorhenChainSelect molecules={mockMolecules as any} selectedCoordMolNo={0} />);
        expect(screen.getByText("A")).toBeInTheDocument();
        expect(screen.getByText("B")).toBeInTheDocument();
    });

    test('shows "All" option when allowAll is true', () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: "3u7t",
                sequences: [{ chain: "A", type: 1 }],
            },
        ];
        renderWithStore(<MoorhenChainSelect molecules={mockMolecules as any} selectedCoordMolNo={0} allowAll={true} />);
        expect(screen.getByText("All")).toBeInTheDocument();
    });

    test("filters chains by allowedTypes", () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: "3u7t",
                sequences: [
                    { chain: "A", type: 1 },
                    { chain: "B", type: 3 },
                    { chain: "C", type: 999 },
                ],
            },
        ];
        renderWithStore(<MoorhenChainSelect molecules={mockMolecules as any} selectedCoordMolNo={0} />);
        expect(screen.getByText("A")).toBeInTheDocument();
        expect(screen.getByText("B")).toBeInTheDocument();
        expect(screen.queryByText("C")).not.toBeInTheDocument();
    });

    test("renders with custom label", () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: "3u7t",
                sequences: [{ chain: "A", type: 1 }],
            },
        ];
        renderWithStore(<MoorhenChainSelect molecules={mockMolecules as any} selectedCoordMolNo={0} label="Chain ID" />);
        expect(screen.getByText("Chain ID")).toBeInTheDocument();
    });

    test("renders select even when selectedCoordMolNo is null", () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: "3u7t",
                sequences: [{ chain: "A", type: 1 }],
            },
        ];
        renderWithStore(<MoorhenChainSelect molecules={mockMolecules as any} selectedCoordMolNo={null} />);
        const select = screen.getByRole("combobox");
        expect(select).toBeInTheDocument();
    });
});

// ==============================
// MoorhenLigandSelect
// ==============================
describe("MoorhenLigandSelect", () => {
    const makeMolecule = ligands => ({
        molNo: 0,
        name: "3u7t",
        ligands,
        sequences: [],
    });

    test("renders ligand options for a molecule", () => {
        const molecule = makeMolecule([{ cid: "/A/LYS/1" }, { cid: "/A/ALA/2" }]);
        renderWithStore(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={0} />);
        expect(screen.getByText("/A/LYS/1")).toBeInTheDocument();
        expect(screen.getByText("/A/ALA/2")).toBeInTheDocument();
    });

    test('shows "No Ligands" when molecule has no ligands', () => {
        const molecule = makeMolecule([]);
        renderWithStore(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={0} />);
        expect(screen.getByText("No Ligands")).toBeInTheDocument();
    });

    test('shows "All Ligands" option when allowAll is true', () => {
        const molecule = makeMolecule([{ cid: "/A/LYS/1" }, { cid: "/A/ALA/2" }]);
        renderWithStore(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={0} allowAll={true} />);
        expect(screen.getByText("All Ligands")).toBeInTheDocument();
    });

    test("calls onChange when a ligand is selected", async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        const molecule = makeMolecule([{ cid: "/A/LYS/1" }, { cid: "/A/ALA/2" }]);
        renderWithStore(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={0} onChange={onChange} />);
        const select = screen.getByRole("combobox");
        await user.selectOptions(select, "/A/ALA/2");
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test("calls setValue when a ligand is selected", async () => {
        const user = userEvent.setup();
        const setValue = jest.fn();
        const molecule = makeMolecule([{ cid: "/A/LYS/1" }, { cid: "/A/ALA/2" }]);
        renderWithStore(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={0} setValue={setValue} />);
        const select = screen.getByRole("combobox");
        await user.selectOptions(select, "/A/ALA/2");
        expect(setValue).toHaveBeenCalledWith("/A/ALA/2");
    });

    test("disables select when selectedCoordMolNo is null", () => {
        const molecule = makeMolecule([{ cid: "/A/LYS/1" }]);
        renderWithStore(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={null} />);
        // When no molecule is selected, the select renders with an empty options list
        const select = screen.getByRole("combobox");
        // The component is disabled when noLigand is true (no molecule found → allLigands is undefined)
        expect(select).toBeDisabled();
    });

    test("renders custom label", () => {
        const molecule = makeMolecule([{ cid: "/A/LYS/1" }]);
        renderWithStore(<MoorhenLigandSelect molecules={[molecule] as any} selectedCoordMolNo={0} label="Choose Ligand" />);
        expect(screen.getByText("Choose Ligand")).toBeInTheDocument();
    });
});

// ==============================
// MoorhenAutoComplete
// ==============================
describe("MoorhenAutoComplete", () => {
    const resultsRenderer = (item: string) => <div key={item}>{item}</div>;

    const mockMenuSystem = {} as MoorhenMenuSystem;

    test("renders a text input field", () => {
        renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenAutoComplete<string> searchItems={["apple", "banana", "cherry"]} resultsRenderer={resultsRenderer} />
            </MoorhenInstanceProvider>
        );
        const input = screen.getByRole("textbox");
        expect(input).toBeInTheDocument();
    });
});

// ==============================
// MoorhenColourPicker
// ==============================
describe("MoorhenColourPicker", () => {
    const mockMenuSystem = {} as MoorhenMenuSystem;

    const clickSwatch = (container: HTMLElement) => {
        const swatch = container.querySelector('[style*="border-radius: 8px"]') as HTMLElement;
        if (swatch) fireEvent.click(swatch);
        return swatch;
    };

    test("renders a coloured swatch trigger", () => {
        const { container } = renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[255, 0, 0]} />
            </MoorhenInstanceProvider>
        );
        const swatch = container.querySelector('[style*="border-radius: 8px"]');
        expect(swatch).toBeInTheDocument();
    });

    test("applies the colour as background of the swatch", () => {
        const { container } = renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[100, 150, 200]} />
            </MoorhenInstanceProvider>
        );
        const swatch = container.querySelector('[style*="background-color"]') as HTMLElement;
        expect(swatch.style.backgroundColor).toBe("rgb(100, 150, 200)");
    });

    test("renders label text after opening the popover", () => {
        const { container } = renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[0, 0, 255]} label="Main colour" />
            </MoorhenInstanceProvider>
        );
        clickSwatch(container);
        expect(screen.getByText("Main colour")).toBeInTheDocument();
    });

    test("renders dual colour labels after opening the popover", () => {
        const { container } = renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[255, 0, 0]} colour2={[0, 0, 255]} setColour2={() => {}} label="A" label2="B" />
            </MoorhenInstanceProvider>
        );
        clickSwatch(container);
        expect(screen.getByText("A")).toBeInTheDocument();
        expect(screen.getByText("B")).toBeInTheDocument();
    });

    test("renders Apply button after opening the popover", () => {
        const { container } = renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[0, 255, 0]} onApply={() => {}} />
            </MoorhenInstanceProvider>
        );
        clickSwatch(container);
        expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();
    });

    test("calls onApply with the colour when Apply is clicked", async () => {
        const user = userEvent.setup();
        const onApply = jest.fn();
        const { container } = renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[0, 255, 0]} onApply={onApply} />
            </MoorhenInstanceProvider>
        );
        clickSwatch(container);
        await user.click(screen.getByRole("button", { name: /apply/i }));
        expect(onApply).toHaveBeenCalledWith([0, 255, 0]);
    });

    test("renders with tooltip text", () => {
        const { container } = renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[255, 255, 0]} tooltip="Pick a colour" />
            </MoorhenInstanceProvider>
        );
        const swatch = container.querySelector('[style*="border-radius: 8px"]');
        expect(swatch).toBeInTheDocument();
    });

    test("applies custom style to the swatch", () => {
        const { container } = renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenColourPicker colour={[0, 0, 0]} style={{ opacity: 0.5 }} />
            </MoorhenInstanceProvider>
        );
        const swatch = container.querySelector('[style*="border-radius: 8px"]') as HTMLElement;
        expect(swatch.style.opacity).toBe("0.5");
    });
});

// ==============================
// MoorhenGradientPicker
// ==============================
describe("MoorhenGradientPicker", () => {
    const mockMenuSystem = {} as MoorhenMenuSystem;
    const basicColourTable: [number, [number, number, number]][] = [
        [0.0, [255, 0, 0]],
        [0.5, [255, 255, 255]],
        [1.0, [0, 0, 255]],
    ];

    test("renders the gradient picker container with colour stops", () => {
        const { container } = renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker colourTable={basicColourTable} setColourTable={() => {}} menu="test" />
            </MoorhenInstanceProvider>
        );
        // The outer container has a 0.5rem margin
        const outerContainer = container.querySelector('[style*="margin: 0.5rem"]');
        expect(outerContainer).toBeInTheDocument();
        // The colour preset is rendered
        expect(screen.getByText("Red White Blue")).toBeInTheDocument();
    });

    test("renders the points number input", () => {
        renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker colourTable={basicColourTable} setColourTable={() => {}} menu="test" />
            </MoorhenInstanceProvider>
        );
        expect(screen.getByText("Points:")).toBeInTheDocument();
    });

    test("renders preset selector with options", () => {
        renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker colourTable={basicColourTable} setColourTable={() => {}} menu="test" />
            </MoorhenInstanceProvider>
        );
        expect(screen.getByText("Custom")).toBeInTheDocument();
        expect(screen.getByText("Red White Blue")).toBeInTheDocument();
    });

    test("renders value labels when showValues is true (default)", () => {
        renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker colourTable={basicColourTable} setColourTable={() => {}} menu="test" />
            </MoorhenInstanceProvider>
        );
        // With minValue=0, maxValue=1 and 3 points, values are 0.0, 0.5, 1.0
        expect(screen.getByText("0.0")).toBeInTheDocument();
        expect(screen.getByText("0.5")).toBeInTheDocument();
        expect(screen.getByText("1.0")).toBeInTheDocument();
    });

    test("hides value labels when showValues is false", () => {
        renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker colourTable={basicColourTable} setColourTable={() => {}} menu="test" showValues={false} />
            </MoorhenInstanceProvider>
        );
        expect(screen.queryByText("0.0")).not.toBeInTheDocument();
        expect(screen.queryByText("0.5")).not.toBeInTheDocument();
        expect(screen.queryByText("1.0")).not.toBeInTheDocument();
    });

    test("renders revert button", () => {
        const { container } = renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker colourTable={basicColourTable} setColourTable={() => {}} menu="test" />
            </MoorhenInstanceProvider>
        );
        // The revert button uses icon "MatSymFlipCamera"; find it by its containing stack
        const reversionStack = container.querySelector('[style*="margin: 0.5rem"]');
        expect(reversionStack).toBeInTheDocument();
    });

    test("renders number inputs for min/max when modifyValues is true", () => {
        renderWithStore(
            <MoorhenInstanceProvider menuSystem={mockMenuSystem}>
                <MoorhenGradientPicker
                    colourTable={basicColourTable}
                    setColourTable={() => {}}
                    menu="test"
                    modifyValues={true}
                    minValue={0}
                    maxValue={100}
                    setMinValue={() => {}}
                    setMaxValue={() => {}}
                />
            </MoorhenInstanceProvider>
        );
        // Should show two number inputs for min/max
        const textboxes = screen.getAllByRole("textbox");
        expect(textboxes.length).toBeGreaterThanOrEqual(2);
    });
});
