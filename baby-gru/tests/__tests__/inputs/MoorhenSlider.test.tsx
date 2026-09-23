import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Provider } from "react-redux";
import { MoorhenSlider } from "../../../src/components/inputs/MoorhenSlider/MoorhenSlider";
import { MoorhenReduxStore, renderWithinInstance } from "../testUtils";

describe("MoorhenSlider", () => {
    // -------------------------------------------------------
    // Basic rendering with correct props
    // -------------------------------------------------------
    test("renders a native range input (slider role)", () => {
        renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} />);
        const slider = screen.getByRole("slider");
        expect(slider).toBeInTheDocument();
    });

    test("uses the correct value attribute on the hidden range input", () => {
        renderWithinInstance(<MoorhenSlider value={42} setValue={() => {}} minVal={0} maxVal={100} />);
        const slider = screen.getByRole("slider");
        expect(slider).toHaveValue("42");
    });

    test("applies min / max on the hidden range input", () => {
        renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} minVal={10} maxVal={200} />);
        const slider = screen.getByRole("slider");
        expect(slider).toHaveAttribute("min", "10");
        expect(slider).toHaveAttribute("max", "200");
    });

    // -------------------------------------------------------
    // sliderTitle
    // -------------------------------------------------------
    test("renders sliderTitle and shows the current value", () => {
        renderWithinInstance(<MoorhenSlider value={37} setValue={() => {}} sliderTitle="Opacity" />);
        expect(screen.getByText(/opacity/i)).toBeInTheDocument();
        expect(screen.getByText(/37/)).toBeInTheDocument();
    });

    test("hides the value next to the title when showTitleValue is false", () => {
        renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} sliderTitle="Volume" showTitleValue={false} />);
        expect(screen.getByText("Volume")).toBeInTheDocument();
        // The value 50 should not appear immediately after "Volume"
        expect(screen.queryByText("50")).not.toBeInTheDocument();
    });

    test("does not render any title when sliderTitle is undefined", () => {
        const { container } = renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} />);
        const labels = container.querySelectorAll(".moorhen__slider__label");
        expect(labels.length).toBe(0);
    });

    test("renders sliderTitleUnit after the value", () => {
        renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} sliderTitle="Radius" sliderTitleUnit=" Å" />);
        expect(screen.getByText(/Radius/)).toBeInTheDocument();
        expect(screen.getByText(/Å/)).toBeInTheDocument();
    });

    // -------------------------------------------------------
    // isDisabled
    // -------------------------------------------------------
    test("disables the hidden range input when isDisabled is true", () => {
        renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} isDisabled={true} />);
        const slider = screen.getByRole("slider");
        expect(slider).toBeDisabled();
    });

    test("applies disabled class to custom track and thumb", () => {
        const { container } = renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} isDisabled={true} />);
        const track = container.querySelector(".moorhen__slider-track");
        const thumb = container.querySelector(".moorhen__slider-thumb");
        expect(track.className).toContain("disabled");
        expect(thumb.className).toContain("disabled");
    });

    // -------------------------------------------------------
    // decimalPlaces
    // -------------------------------------------------------
    test("displays value with correct decimal places in the title", () => {
        renderWithinInstance(<MoorhenSlider value={5.6789} setValue={() => {}} sliderTitle="Precise" decimalPlaces={2} />);
        expect(screen.getByText(/5\.68/)).toBeInTheDocument();
    });

    test("uses decimalPlaces as the step on the native input", () => {
        renderWithinInstance(<MoorhenSlider value={0.5} setValue={() => {}} decimalPlaces={2} minVal={0} maxVal={1} />);
        const slider = screen.getByRole("slider");
        expect(slider).toHaveAttribute("step", "0.01");
    });

    // -------------------------------------------------------
    // step
    // -------------------------------------------------------
    test("snaps value to step increments via setValue", () => {
        const setValue = jest.fn();
        renderWithinInstance(<MoorhenSlider value={50} setValue={setValue} step={20} minVal={0} maxVal={100} />);
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
        renderWithinInstance(<MoorhenSlider value={10} setValue={setValue} allowedValues={[0, 25, 50, 75, 100]} minVal={0} maxVal={100} />);
        const slider = screen.getByRole("slider");
        fireEvent.change(slider, { target: { value: "30" } });
        // 30 is closest to 25
        expect(setValue).toHaveBeenCalledWith(25);
    });

    // -------------------------------------------------------
    // scale="log"
    // -------------------------------------------------------
    test("log scale transforms the hidden input min/max to log10 space", () => {
        renderWithinInstance(<MoorhenSlider value={10} setValue={() => {}} scale="log" minVal={1} maxVal={100} />);
        const slider = screen.getByRole("slider");
        // log10(1) = 0, log10(100) = 2
        expect(slider).toHaveAttribute("min", "0");
        expect(slider).toHaveAttribute("max", "2");
    });

    test("log scale stores the log10 value in the input", () => {
        renderWithinInstance(<MoorhenSlider value={10} setValue={() => {}} scale="log" minVal={1} maxVal={100} />);
        const slider = screen.getByRole("slider");
        // log10(10) = 1
        expect(slider).toHaveValue("1");
    });

    // -------------------------------------------------------
    // showButtons / PlusMinusButton
    // -------------------------------------------------------
    test("renders plus/minus buttons by default", () => {
        renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} sliderTitle="Test" />);
        // Two icon-only buttons: minus (L) and plus (R)
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    test("hides plus/minus buttons when showButtons is false", () => {
        renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} showButtons={false} />);
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
        renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} usePreciseInput={true} sliderTitle="Test" />);
        const textbox = screen.getByRole("textbox");
        expect(textbox).toBeInTheDocument();
    });

    test("precise input displays the formatted value", () => {
        renderWithinInstance(<MoorhenSlider value={42.5} setValue={() => {}} usePreciseInput={true} sliderTitle="Test" decimalPlaces={1} />);
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
        renderWithinInstance(<MoorhenSlider value={50} setValue={setValue} labels={labels} minVal={0} maxVal={100} />);
        expect(screen.getByText("Off")).toBeInTheDocument();
        expect(screen.getByText("Mid")).toBeInTheDocument();
        expect(screen.getByText("Max")).toBeInTheDocument();

        // Clicking a label button should call setValue
        fireEvent.click(screen.getByText("Max"));
        expect(setValue).toHaveBeenCalledWith(100);
    });

    test("labels with tick prop render a tick marker", () => {
        const { container } = renderWithinInstance(
            <MoorhenSlider value={50} setValue={() => {}} labels={[{ value: 50, label: "", tick: true }]} minVal={0} maxVal={100} />
        );
        const labelButton = container.querySelector(".moorhen__slider__label-bottom");
        expect(labelButton.className).toContain("tick");
    });

    test("labels with colour prop apply custom colour", () => {
        const { container } = renderWithinInstance(
            <MoorhenSlider value={50} setValue={() => {}} labels={[{ value: 50, label: "Red", colour: "red" }]} minVal={0} maxVal={100} />
        );
        const labelButton = container.querySelector(".moorhen__slider__label-bottom");
        expect((labelButton as HTMLElement).style.color).toBe("red");
    });

    // -------------------------------------------------------
    // showTicks
    // -------------------------------------------------------
    test("renders tick marks when showTicks is true", () => {
        const { container } = renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} showTicks={true} minVal={0} maxVal={100} />);
        const ticks = container.querySelectorAll(".moorhen__slider__tick");
        expect(ticks.length).toBeGreaterThan(0);
    });

    test("renders major ticks when majorTickSpacing is provided", () => {
        const { container } = renderWithinInstance(
            <MoorhenSlider value={50} setValue={() => {}} showTicks={true} majorTickSpacing={50} minVal={0} maxVal={100} />
        );
        const majorTicks = container.querySelectorAll(".moorhen__slider__major-tick");
        expect(majorTicks.length).toBeGreaterThan(0);
    });

    // -------------------------------------------------------
    // colour prop
    // -------------------------------------------------------
    test("applies custom colour to the slider thumb", () => {
        const { container } = renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} colour="rgb(255, 0, 0)" />);
        const thumb = container.querySelector(".moorhen__slider-thumb");
        expect((thumb as HTMLElement).style.background).toBe("rgb(255, 0, 0)");
    });

    // -------------------------------------------------------
    // Range type (dual slider)
    // -------------------------------------------------------
    test('renders two range inputs when type is "range"', () => {
        renderWithinInstance(
            <MoorhenSlider type="range" value={25} setValue={() => {}} value2={75} setValue2={() => {}} minVal={0} maxVal={100} />
        );
        const sliders = screen.getAllByRole("slider");
        expect(sliders.length).toBe(2);
    });

    test("range slider shows both values in the title", () => {
        renderWithinInstance(
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
        const { container } = renderWithinInstance(
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
        renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} ariaLabel="Brightness" />);
        const slider = screen.getByRole("slider");
        expect(slider).toHaveAttribute("aria-label", "Brightness");
    });

    // -------------------------------------------------------
    // style prop
    // -------------------------------------------------------
    test("applies custom style to the outer container", () => {
        const { container } = renderWithinInstance(<MoorhenSlider value={50} setValue={() => {}} style={{ marginTop: "20px" }} />);
        const outermost = container.querySelector('[style*="margin-top"]') as HTMLElement;
        expect(outermost.style.marginTop).toBe("20px");
    });

    // -------------------------------------------------------
    // Clamping - value stuck at bounds
    // -------------------------------------------------------
    test("thumb position is clamped between 0% and 100%", () => {
        // value above maxVal → position should be 100%
        const { container } = renderWithinInstance(<MoorhenSlider value={999} setValue={() => {}} minVal={0} maxVal={100} />);
        const thumb = container.querySelector(".moorhen__slider-thumb");
        expect((thumb as HTMLElement).style.left).toBe("100%");
    });

    test("thumb position is 0% when value equals minVal", () => {
        const { container } = renderWithinInstance(<MoorhenSlider value={0} setValue={() => {}} minVal={0} maxVal={100} />);
        const thumb = container.querySelector(".moorhen__slider-thumb");
        expect((thumb as HTMLElement).style.left).toBe("0%");
    });
});
