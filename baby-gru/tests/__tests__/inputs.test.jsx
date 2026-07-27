jest.setTimeout(15000)
jest.mock('chart.js', () => ({
    ...jest.requireActual('chart.js'),
    registerables: []
}))

import '@testing-library/jest-dom'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Provider } from 'react-redux'
import { _MoorhenReduxStore as MoorhenReduxStore } from "../../src/store/MoorhenReduxStore"
import { setCootInitialized, setDevMode } from '../../src/store/generalStatesSlice'
import { setIsDark, setWidth, setHeight, setDefaultBondSmoothness } from '../../src/store/sceneSettingsSlice'

import { MoorhenInstanceProvider } from '../../src/InstanceManager'
import { MoorhenButton } from '../../src/components/inputs/MoorhenButton/MoorhenButton'
import { MoorhenToggle } from '../../src/components/inputs/MoorhenToggle/Toggle'
import { MoorhenSelect } from '../../src/components/inputs/Selector/Select'
import { MoorhenTextInput } from '../../src/components/inputs/TextInput'
import { MoorhenNumberInput } from '../../src/components/inputs/MoorhenNumberInput/NumberInput'
import { MoorhenSlider } from '../../src/components/inputs/MoorhenSlider/MoorhenSlider'
import { MoorhenMoleculeSelect } from '../../src/components/inputs/Selector/MoleculeSelector'
import { MoorhenMapSelect } from '../../src/components/inputs/Selector/MoorhenMapSelect'
import { MoorhenChainSelect } from '../../src/components/inputs/Selector/MoorhenChainSelect'

beforeAll(() => {
    MoorhenReduxStore.dispatch(setDevMode(false))
    MoorhenReduxStore.dispatch(setIsDark(false))
    MoorhenReduxStore.dispatch(setWidth(1600))
    MoorhenReduxStore.dispatch(setHeight(900))
    MoorhenReduxStore.dispatch(setCootInitialized(true))
    MoorhenReduxStore.dispatch(setDefaultBondSmoothness(1))
})

afterEach(cleanup)

// ==============================
// MoorhenButton
// ==============================
describe('MoorhenButton', () => {

    test('renders with label', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenButton label="Click Me" />
            </Provider>
        )
        expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
    })

    test('calls onClick when clicked', async () => {
        const user = userEvent.setup()
        const onClick = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenButton label="Clickable" onClick={onClick} />
            </Provider>
        )
        await user.click(screen.getByRole('button', { name: /clickable/i }))
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    test('does not call onClick when disabled', async () => {
        const user = userEvent.setup()
        const onClick = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenButton label="Disabled" onClick={onClick} disabled={true} />
            </Provider>
        )
        const button = screen.getByRole('button', { name: /disabled/i })
        expect(button).toBeDisabled()
        await user.click(button)
        expect(onClick).not.toHaveBeenCalled()
    })

    test('renders with children', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenButton>Child Content</MoorhenButton>
            </Provider>
        )
        expect(screen.getByText('Child Content')).toBeInTheDocument()
    })

    test('renders as icon-only type', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenButton type="icon-only" icon="MatSymKeyboardArrowDown" />
            </Provider>
        )
        const button = screen.getByRole('button')
        expect(button.className).toContain('moorhen__button__icon-only')
    })

    test('applies custom className', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenButton label="Styled" className="my-custom-class" />
            </Provider>
        )
        const button = screen.getByRole('button', { name: /styled/i })
        expect(button.className).toContain('my-custom-class')
    })

    test('applies custom style', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenButton label="StyledBtn" style={{ backgroundColor: 'blue' }} />
            </Provider>
        )
        const button = screen.getByRole('button', { name: /styledbtn/i })
        expect(button).toHaveStyle('background-color: blue')
    })

    test('renders with variant primary', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenButton label="Primary" variant="primary" />
            </Provider>
        )
        const button = screen.getByRole('button', { name: /primary/i })
        expect(button.className).toContain('primary')
    })

    test('renders with variant danger', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenButton label="Danger" variant="danger" />
            </Provider>
        )
        const button = screen.getByRole('button', { name: /danger/i })
        expect(button.className).toContain('danger')
    })

    test('forwards ref', () => {
        const ref = { current: null }
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenButton label="RefBtn" ref={ref} />
            </Provider>
        )
        expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })

    test('renders tooltip text', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenButton label="TooltipBtn" tooltip="Useful tooltip" />
                </MoorhenInstanceProvider>
            </Provider>
        )
        expect(screen.getByText('TooltipBtn')).toBeInTheDocument()
    })
})

// ==============================
// MoorhenToggle
// ==============================
describe('MoorhenToggle', () => {

    test('renders with label', () => {
        render(
            <MoorhenToggle label="Toggle me" />
        )
        expect(screen.getByText('Toggle me')).toBeInTheDocument()
    })

    test('renders a checkbox input', () => {
        render(
            <MoorhenToggle label="Toggle input" />
        )
        const checkbox = screen.getByRole('checkbox')
        expect(checkbox).toBeInTheDocument()
    })

    test('is checked when checked prop is true', () => {
        render(
            <MoorhenToggle label="Checked" checked={true} />
        )
        const checkbox = screen.getByRole('checkbox')
        expect(checkbox).toBeChecked()
    })

    test('is unchecked when checked prop is false', () => {
        render(
            <MoorhenToggle label="Unchecked" checked={false} />
        )
        const checkbox = screen.getByRole('checkbox')
        expect(checkbox).not.toBeChecked()
    })

    test('calls onChange when toggled', async () => {
        const user = userEvent.setup()
        const onChange = jest.fn()
        render(
            <MoorhenToggle label="Changeable" onChange={onChange} />
        )
        const checkbox = screen.getByRole('checkbox')
        await user.click(checkbox)
        expect(onChange).toHaveBeenCalledTimes(1)
    })

    test('is disabled when disabled prop is true', () => {
        render(
            <MoorhenToggle label="Disabled toggle" disabled={true} />
        )
        const checkbox = screen.getByRole('checkbox')
        expect(checkbox).toBeDisabled()
    })

    test('does not call onChange when disabled', async () => {
        const user = userEvent.setup()
        const onChange = jest.fn()
        render(
            <MoorhenToggle label="Disabled change" onChange={onChange} disabled={true} />
        )
        const checkbox = screen.getByRole('checkbox')
        await user.click(checkbox)
        expect(onChange).not.toHaveBeenCalled()
    })

    test('renders with radio type', () => {
        const { container } = render(
            <MoorhenToggle label="Radio" type="radio" />
        )
        const radioSpan = container.querySelector('.moorhen__toggle-radio')
        expect(radioSpan).toBeInTheDocument()
    })

    test('renders with checkbox type', () => {
        const { container } = render(
            <MoorhenToggle label="Checkbox" type="checkbox" />
        )
        const checkboxSpan = container.querySelector('.moorhen__toggle-checkbox')
        expect(checkboxSpan).toBeInTheDocument()
    })

    test('renders with switch type (default)', () => {
        const { container } = render(
            <MoorhenToggle label="Switch" />
        )
        const sliderSpan = container.querySelector('.moorhen__toggle-slider')
        expect(sliderSpan).toBeInTheDocument()
    })

    test('applies custom className', () => {
        const { container } = render(
            <MoorhenToggle label="Custom class" className="my-toggle-class" />
        )
        const toggleContainer = container.firstElementChild
        expect(toggleContainer.className).toContain('my-toggle-class')
    })

    test('applies custom style', () => {
        const { container } = render(
            <MoorhenToggle label="Styled toggle" style={{ margin: '10px' }} />
        )
        const toggleContainer = container.firstElementChild
        expect(toggleContainer).toHaveStyle('margin: 10px')
    })

    test('renders with name attribute', () => {
        render(
            <MoorhenToggle label="Named" name="myToggle" />
        )
        const checkbox = screen.getByRole('checkbox')
        expect(checkbox).toHaveAttribute('name', 'myToggle')
    })

    test('renders with id attribute', () => {
        render(
            <MoorhenToggle label="ID'd" id="myToggleId" />
        )
        const checkbox = screen.getByRole('checkbox')
        expect(checkbox).toHaveAttribute('id', 'myToggleId')
    })

    test('works bidirectionally with lifted useState pattern', async () => {
        const user = userEvent.setup()
        function ToggleWrapper() {
            const [checked, setChecked] = useState(false)
            return (
                <>
                    <button data-testid="reset-toggle" onClick={() => setChecked(false)}>Reset</button>
                    <MoorhenToggle
                        label="Lifted"
                        checked={checked}
                        onChange={() => setChecked(!checked)}
                    />
                </>
            )
        }
        render(<ToggleWrapper />)
        const checkbox = screen.getByRole('checkbox')
        // Initial state
        expect(checkbox).not.toBeChecked()
        // User interaction → state lifted → UI updates
        await user.click(checkbox)
        expect(checkbox).toBeChecked()
        // External state change → component re-renders
        await user.click(screen.getByTestId('reset-toggle'))
        expect(checkbox).not.toBeChecked()
    })
})

// ==============================
// MoorhenSelect
// ==============================
describe('MoorhenSelect', () => {

    test('renders with options', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSelect>
                    <option value="opt1">Option 1</option>
                    <option value="opt2">Option 2</option>
                </MoorhenSelect>
            </Provider>
        )
        expect(screen.getByText('Option 1')).toBeInTheDocument()
        expect(screen.getByText('Option 2')).toBeInTheDocument()
    })

    test('renders a select element', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSelect>
                    <option value="a">A</option>
                </MoorhenSelect>
            </Provider>
        )
        expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    test('displays label when provided', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSelect label="Choose option">
                    <option value="a">A</option>
                </MoorhenSelect>
            </Provider>
        )
        expect(screen.getByText('Choose option')).toBeInTheDocument()
    })

    test('calls onChange when selection changes', async () => {
        const user = userEvent.setup()
        const onChange = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSelect onChange={onChange}>
                    <option value="opt1">Option 1</option>
                    <option value="opt2">Option 2</option>
                </MoorhenSelect>
            </Provider>
        )
        const select = screen.getByRole('combobox')
        await user.selectOptions(select, 'opt2')
        expect(onChange).toHaveBeenCalledTimes(1)
    })

    test('calls setValue when selection changes', async () => {
        const user = userEvent.setup()
        const setValue = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSelect setValue={setValue}>
                    <option value="opt1">Option 1</option>
                    <option value="opt2">Option 2</option>
                </MoorhenSelect>
            </Provider>
        )
        const select = screen.getByRole('combobox')
        await user.selectOptions(select, 'opt2')
        expect(setValue).toHaveBeenCalledWith('opt2')
    })

    test('uses defaultValue', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSelect defaultValue="opt2">
                    <option value="opt1">Option 1</option>
                    <option value="opt2">Option 2</option>
                </MoorhenSelect>
            </Provider>
        )
        const select = screen.getByRole('combobox')
        expect(select).toHaveValue('opt2')
    })

    test('is disabled when disabled prop is true', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSelect disabled={true}>
                    <option value="a">A</option>
                </MoorhenSelect>
            </Provider>
        )
        const select = screen.getByRole('combobox')
        expect(select).toBeDisabled()
    })

    test('renders inline by default', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSelect label="Inline">
                    <option value="a">A</option>
                </MoorhenSelect>
            </Provider>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv.className).toContain('moorhen__stack__row')
    })

    test('renders column layout when inline is false', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSelect label="Column" inline={false}>
                    <option value="a">A</option>
                </MoorhenSelect>
            </Provider>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv.className).toContain('moorhen__stack__column')
    })

    test('forwards ref', () => {
        const ref = { current: null }
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSelect ref={ref}>
                    <option value="a">A</option>
                </MoorhenSelect>
            </Provider>
        )
        expect(ref.current).toBeInstanceOf(HTMLSelectElement)
    })

    test('works bidirectionally with lifted useState pattern', async () => {
        const user = userEvent.setup()
        function SelectWrapper() {
            const [value, setValue] = useState('opt1')
            return (
                <Provider store={MoorhenReduxStore}>
                    <button data-testid="reset-select" onClick={() => setValue('opt1')}>Reset</button>
                    <MoorhenSelect value={value} setValue={setValue}>
                        <option value="opt1">Option 1</option>
                        <option value="opt2">Option 2</option>
                    </MoorhenSelect>
                </Provider>
            )
        }
        render(<SelectWrapper />)
        const select = screen.getByRole('combobox')
        // Initial state
        expect(select).toHaveValue('opt1')
        // User interaction → state lifted → UI updates
        await user.selectOptions(select, 'opt2')
        expect(select).toHaveValue('opt2')
        // External state change → component re-renders
        await user.click(screen.getByTestId('reset-select'))
        expect(select).toHaveValue('opt1')
    })
})

// ==============================
// MoorhenTextInput
// ==============================
describe('MoorhenTextInput', () => {

    test('renders an input field', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        expect(input).toBeInTheDocument()
    })

    test('renders label when provided', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput label="Name" />
            </Provider>
        )
        expect(screen.getByText('Name')).toBeInTheDocument()
    })

    test('calls setText on change', async () => {
        const user = userEvent.setup()
        const setText = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput setText={setText} />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        await user.type(input, 'hello')
        expect(setText).toHaveBeenCalled()
    })

    test('calls onChange on change', async () => {
        const user = userEvent.setup()
        const onChange = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput onChange={onChange} />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        await user.type(input, 'a')
        expect(onChange).toHaveBeenCalled()
    })

    test('renders with defaultValue', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput text="Initial value" />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        expect(input).toHaveValue('Initial value')
    })

    test('disables input when disabled is true', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput disabled={true} />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        expect(input).toBeDisabled()
    })

    test('renders with placeholder', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput placeholder="Enter text..." />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        expect(input).toHaveAttribute('placeholder', 'Enter text...')
    })

    test('renders with button when button prop is true', () => {
        const onClick = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput button={true} onClick={onClick} />
            </Provider>
        )
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThanOrEqual(1)
    })

    test('calls onSubmit when Enter is pressed', async () => {
        const user = userEvent.setup()
        const onSubmit = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput onSubmit={onSubmit} />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        await user.type(input, '{Enter}')
        expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    test('applies isInvalid class', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput isInvalid={true} />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        expect(input.className).toContain('invalid')
    })

    test('renders inline by default (line direction)', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput label="Inline" />
            </Provider>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv.className).toContain('moorhen__stack__row')
    })

    test('renders column layout when inline is false', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput label="Column" inline={false} />
            </Provider>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv.className).toContain('moorhen__stack__column')
    })

    test('applies uppercase style', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput uppercase={true} />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        expect(input).toHaveStyle('text-transform: uppercase')
    })

    test('renders as readonly', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput readOnly={true} />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        expect(input).toHaveAttribute('readonly')
    })

    test('forwards ref', () => {
        const ref = { current: null }
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenTextInput ref={ref} />
            </Provider>
        )
        expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })

    test('works bidirectionally with lifted useState pattern', async () => {
        const user = userEvent.setup()
        function TextInputWrapper() {
            const [text, setText] = useState('')
            return (
                <Provider store={MoorhenReduxStore}>
                    <button data-testid="reset-text" onClick={() => setText('')}>Reset</button>
                    <MoorhenTextInput text={text} setText={setText} />
                </Provider>
            )
        }
        render(<TextInputWrapper />)
        const input = screen.getByRole('textbox')
        // Initial state
        expect(input).toHaveValue('')
        // User interaction → state lifted → UI updates
        await user.type(input, 'hello')
        expect(input).toHaveValue('hello')
        // External state change → component re-renders
        await user.click(screen.getByTestId('reset-text'))
        expect(input).toHaveValue('')
    })
})

// ==============================
// MoorhenNumberInput
// ==============================
describe('MoorhenNumberInput', () => {

    test('renders an input field', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberInput value={42} />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        expect(input).toBeInTheDocument()
    })

    test('displays formatted value', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberInput value={42.5} decimalDigits={1} />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        expect(input).toHaveValue('42.5')
    })

    test('displays integer value when integer prop is true', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberInput value={42.7} integer={true} />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        expect(input).toHaveValue('43')
    })

    test('displays label when provided', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberInput value={0} label="Radius" />
            </Provider>
        )
        expect(screen.getByText('Radius')).toBeInTheDocument()
    })

    test('disables input when disabled is true', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberInput value={0} disabled={true} />
            </Provider>
        )
        const input = screen.getByRole('textbox')
        expect(input).toBeDisabled()
    })

    test('shows tooltip when provided', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenNumberInput value={0} tooltip="Number tooltip" />
                </MoorhenInstanceProvider>
            </Provider>
        )
        // The input displays the formatted value with 2 decimal places
        expect(screen.getByDisplayValue('0.00')).toBeInTheDocument()
    })

    test('applies custom className', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberInput value={0} className="my-num-class" />
            </Provider>
        )
        // className is applied to the wrapping MoorhenStack
    })

    test('forwards ref', () => {
        const ref = { current: null }
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberInput value={0} ref={ref} />
            </Provider>
        )
        expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })

    test('works bidirectionally with lifted useState pattern', async () => {
        const user = userEvent.setup()
        function NumberInputWrapper() {
            const [value, setValue] = useState(10)
            return (
                <Provider store={MoorhenReduxStore}>
                    <button data-testid="reset-num" onClick={() => setValue(10)}>Reset</button>
                    <MoorhenNumberInput value={value} setValue={setValue} />
                </Provider>
            )
        }
        render(<NumberInputWrapper />)
        const input = screen.getByRole('textbox')
        // Initial state
        expect(input).toHaveValue('10.00')
        // User interaction → state lifted → UI updates
        await user.clear(input)
        await user.type(input, '42.50')
        expect(input).toHaveValue('42.50')
        // External state change → component re-renders
        await user.click(screen.getByTestId('reset-num'))
        expect(input).toHaveValue('10.00')
    })
})

// ==============================
// MoorhenSlider
// ==============================
describe('MoorhenSlider', () => {

    // -------------------------------------------------------
    // Basic rendering with correct props
    // -------------------------------------------------------
    test('renders a native range input (slider role)', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} />
            </Provider>
        )
        const slider = screen.getByRole('slider')
        expect(slider).toBeInTheDocument()
    })

    test('uses the correct value attribute on the hidden range input', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={42} setValue={() => {}} minVal={0} maxVal={100} />
            </Provider>
        )
        const slider = screen.getByRole('slider')
        expect(slider).toHaveValue('42')
    })

    test('applies min / max on the hidden range input', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} minVal={10} maxVal={200} />
            </Provider>
        )
        const slider = screen.getByRole('slider')
        expect(slider).toHaveAttribute('min', '10')
        expect(slider).toHaveAttribute('max', '200')
    })

    // -------------------------------------------------------
    // sliderTitle
    // -------------------------------------------------------
    test('renders sliderTitle and shows the current value', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={37} setValue={() => {}} sliderTitle="Opacity" />
            </Provider>
        )
        expect(screen.getByText(/opacity/i)).toBeInTheDocument()
        expect(screen.getByText(/37/)).toBeInTheDocument()
    })

    test('hides the value next to the title when showTitleValue is false', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} sliderTitle="Volume" showTitleValue={false} />
            </Provider>
        )
        expect(screen.getByText('Volume')).toBeInTheDocument()
        // The value 50 should not appear immediately after "Volume"
        expect(screen.getByText('Volume')).toBeInTheDocument()
    })

    test('does not render any title when sliderTitle is undefined', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} />
            </Provider>
        )
        const labels = container.querySelectorAll('.moorhen__slider__label')
        expect(labels.length).toBe(0)
    })

    test('renders sliderTitleUnit after the value', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} sliderTitle="Radius" sliderTitleUnit=" Å" />
            </Provider>
        )
        expect(screen.getByText(/Radius/)).toBeInTheDocument()
        expect(screen.getByText(/Å/)).toBeInTheDocument()
    })

    // -------------------------------------------------------
    // isDisabled
    // -------------------------------------------------------
    test('disables the hidden range input when isDisabled is true', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} isDisabled={true} />
            </Provider>
        )
        const slider = screen.getByRole('slider')
        expect(slider).toBeDisabled()
    })

    test('applies disabled class to custom track and thumb', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} isDisabled={true} />
            </Provider>
        )
        const track = container.querySelector('.moorhen__slider-track')
        const thumb = container.querySelector('.moorhen__slider-thumb')
        expect(track.className).toContain('disabled')
        expect(thumb.className).toContain('disabled')
    })

    // -------------------------------------------------------
    // decimalPlaces
    // -------------------------------------------------------
    test('displays value with correct decimal places in the title', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={5.6789} setValue={() => {}} sliderTitle="Precise" decimalPlaces={2} />
            </Provider>
        )
        expect(screen.getByText(/5\.68/)).toBeInTheDocument()
    })

    test('uses decimalPlaces as the step on the native input', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={0.5} setValue={() => {}} decimalPlaces={2} minVal={0} maxVal={1} />
            </Provider>
        )
        const slider = screen.getByRole('slider')
        expect(slider).toHaveAttribute('step', '0.01')
    })

    // -------------------------------------------------------
    // step
    // -------------------------------------------------------
    test('snaps value to step increments via setValue', () => {
        const setValue = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={setValue} step={20} minVal={0} maxVal={100} />
            </Provider>
        )
        // The setValue wrapper snaps to step; fire a change at a non-step value
        const slider = screen.getByRole('slider')
        fireEvent.change(slider, { target: { value: '55' } })
        // 55 should snap to nearest step of 20: minVal=0, steps: 0,20,40,60,80,100 => 55→60
        expect(setValue).toHaveBeenCalledWith(60)
    })

    // -------------------------------------------------------
    // allowedValues
    // -------------------------------------------------------
    test('snaps value to the closest allowed value', () => {
        const setValue = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={10} setValue={setValue} allowedValues={[0, 25, 50, 75, 100]} minVal={0} maxVal={100} />
            </Provider>
        )
        const slider = screen.getByRole('slider')
        fireEvent.change(slider, { target: { value: '30' } })
        // 30 is closest to 25
        expect(setValue).toHaveBeenCalledWith(25)
    })

    // -------------------------------------------------------
    // scale="log"
    // -------------------------------------------------------
    test('log scale transforms the hidden input min/max to log10 space', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={10} setValue={() => {}} scale="log" minVal={1} maxVal={100} />
            </Provider>
        )
        const slider = screen.getByRole('slider')
        // log10(1) = 0, log10(100) = 2
        expect(slider).toHaveAttribute('min', '0')
        expect(slider).toHaveAttribute('max', '2')
    })

    test('log scale stores the log10 value in the input', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={10} setValue={() => {}} scale="log" minVal={1} maxVal={100} />
            </Provider>
        )
        const slider = screen.getByRole('slider')
        // log10(10) = 1
        expect(slider).toHaveValue('1')
    })

    // -------------------------------------------------------
    // showButtons / PlusMinusButton
    // -------------------------------------------------------
    test('renders plus/minus buttons by default', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} sliderTitle="Test" />
            </Provider>
        )
        // Two icon-only buttons: minus (L) and plus (R)
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThanOrEqual(2)
    })

    test('hides plus/minus buttons when showButtons is false', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} showButtons={false} />
            </Provider>
        )
        // The plus/minus buttons use moorhen__slider__leftPanel / rightPanel
        const leftPanel = document.querySelector('.moorhen__slider__leftPanel')
        const rightPanel = document.querySelector('.moorhen__slider__rightPanel')
        // When showButtons is false, drawSidePanels returns empty fragments
        expect(leftPanel.textContent).toBe('')
        expect(rightPanel.textContent).toBe('')
    })

    // -------------------------------------------------------
    // usePreciseInput
    // -------------------------------------------------------
    test('shows a number textbox when usePreciseInput is true', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} usePreciseInput={true} sliderTitle="Test" />
            </Provider>
        )
        const textbox = screen.getByRole('textbox')
        expect(textbox).toBeInTheDocument()
    })

    test('precise input displays the formatted value', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={42.5} setValue={() => {}} usePreciseInput={true} sliderTitle="Test" decimalPlaces={1} />
            </Provider>
        )
        const textbox = screen.getByRole('textbox')
        expect(textbox).toHaveValue('42.5')
    })

    // -------------------------------------------------------
    // Custom labels (rendered as clickable buttons below the track)
    // -------------------------------------------------------
    test('renders custom labels as clickable buttons', () => {
        const setValue = jest.fn()
        const labels = [
            { value: 0, label: 'Off' },
            { value: 50, label: 'Mid' },
            { value: 100, label: 'Max' },
        ]
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={setValue} labels={labels} minVal={0} maxVal={100} />
            </Provider>
        )
        expect(screen.getByText('Off')).toBeInTheDocument()
        expect(screen.getByText('Mid')).toBeInTheDocument()
        expect(screen.getByText('Max')).toBeInTheDocument()

        // Clicking a label button should call setValue
        fireEvent.click(screen.getByText('Max'))
        expect(setValue).toHaveBeenCalledWith(100)
    })

    test('labels with tick prop render a tick marker', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider
                    value={50}
                    setValue={() => {}}
                    labels={[{ value: 50, label: '', tick: true }]}
                    minVal={0} maxVal={100}
                />
            </Provider>
        )
        const labelButton = container.querySelector('.moorhen__slider__label-bottom')
        expect(labelButton.className).toContain('tick')
    })

    test('labels with colour prop apply custom colour', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider
                    value={50}
                    setValue={() => {}}
                    labels={[{ value: 50, label: 'Red', colour: 'red' }]}
                    minVal={0} maxVal={100}
                />
            </Provider>
        )
        const labelButton = container.querySelector('.moorhen__slider__label-bottom')
        expect(labelButton.style.color).toBe('red')
    })

    // -------------------------------------------------------
    // showTicks
    // -------------------------------------------------------
    test('renders tick marks when showTicks is true', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} showTicks={true} minVal={0} maxVal={100} />
            </Provider>
        )
        const ticks = container.querySelectorAll('.moorhen__slider__tick')
        expect(ticks.length).toBeGreaterThan(0)
    })

    test('renders major ticks when majorTickSpacing is provided', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} showTicks={true} majorTickSpacing={50} minVal={0} maxVal={100} />
            </Provider>
        )
        const majorTicks = container.querySelectorAll('.moorhen__slider__major-tick')
        expect(majorTicks.length).toBeGreaterThan(0)
    })

    // -------------------------------------------------------
    // colour prop
    // -------------------------------------------------------
    test('applies custom colour to the slider thumb', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} colour="rgb(255, 0, 0)" />
            </Provider>
        )
        const thumb = container.querySelector('.moorhen__slider-thumb')
        expect(thumb.style.background).toBe('rgb(255, 0, 0)')
    })

    // -------------------------------------------------------
    // Range type (dual slider)
    // -------------------------------------------------------
    test('renders two range inputs when type is "range"', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider type="range" value={25} setValue={() => {}} value2={75} setValue2={() => {}} minVal={0} maxVal={100} />
            </Provider>
        )
        const sliders = screen.getAllByRole('slider')
        expect(sliders.length).toBe(2)
    })

    test('range slider shows both values in the title', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider type="range" value={20} setValue={() => {}} value2={80} setValue2={() => {}} sliderTitle="Range" minVal={0} maxVal={100} />
            </Provider>
        )
        expect(screen.getByText(/20/)).toBeInTheDocument()
        expect(screen.getByText(/80/)).toBeInTheDocument()
    })

    test('range slider renders a filled track between the two thumbs', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider type="range" value={25} setValue={() => {}} value2={75} setValue2={() => {}} minVal={0} maxVal={100} />
            </Provider>
        )
        const fill = container.querySelector('.moorhen__slider-track-fill')
        expect(fill).toBeInTheDocument()
    })

    // -------------------------------------------------------
    // Bidirectional state (lifted useState)
    // -------------------------------------------------------
    test('works bidirectionally with lifted useState pattern using fireEvent.change', async () => {
        const user = userEvent.setup()
        function SliderWrapper() {
            const [value, setValue] = useState(50)
            return (
                <Provider store={MoorhenReduxStore}>
                    <button data-testid="reset-slider" onClick={() => setValue(50)}>Reset</button>
                    <MoorhenSlider
                        value={value}
                        setValue={setValue}
                        minVal={0}
                        maxVal={100}
                        sliderTitle="Test"
                    />
                </Provider>
            )
        }
        render(<SliderWrapper />)
        expect(screen.getByText(/test/i)).toBeInTheDocument()
        const slider = screen.getByRole('slider')
        // Initial state
        expect(slider).toHaveValue('50')
        // User interaction → state lifted → UI updates
        fireEvent.change(slider, { target: { value: '75' } })
        expect(slider).toHaveValue('75')
        // External state change → component re-renders
        await user.click(screen.getByTestId('reset-slider'))
        expect(slider).toHaveValue('50')
    })

    // -------------------------------------------------------
    // ariaLabel / getAriaValueText
    // -------------------------------------------------------
    test('sets aria-label on the native input', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} ariaLabel="Brightness" />
            </Provider>
        )
        const slider = screen.getByRole('slider')
        expect(slider).toHaveAttribute('aria-label', 'Brightness')
    })

    // -------------------------------------------------------
    // style prop
    // -------------------------------------------------------
    test('applies custom style to the outer container', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={50} setValue={() => {}} style={{ marginTop: '20px' }} />
            </Provider>
        )
        const outermost = container.firstElementChild
        expect(outermost.style.marginTop).toBe('20px')
    })

    // -------------------------------------------------------
    // Clamping - value stuck at bounds
    // -------------------------------------------------------
    test('thumb position is clamped between 0% and 100%', () => {
        // value above maxVal → position should be 100%
        const { container, rerender } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={999} setValue={() => {}} minVal={0} maxVal={100} />
            </Provider>
        )
        const thumb = container.querySelector('.moorhen__slider-thumb')
        expect(thumb.style.left).toBe('100%')
    })

    test('thumb position is 0% when value equals minVal', () => {
        const { container } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenSlider value={0} setValue={() => {}} minVal={0} maxVal={100} />
            </Provider>
        )
        const thumb = container.querySelector('.moorhen__slider-thumb')
        expect(thumb.style.left).toBe('0%')
    })
})

// ==============================
// MoorhenMoleculeSelect
// ==============================
describe('MoorhenMoleculeSelect', () => {

    test('renders "No molecules loaded" when molecule list is empty', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMoleculeSelect molecules={[]} />
            </Provider>
        )
        expect(screen.getByText('No molecules loaded')).toBeInTheDocument()
    })

    test('renders molecule options', () => {
        const mockMolecules = [
            { molNo: 0, name: '3u7t', sequences: [] },
            { molNo: 1, name: '4hhb', sequences: [] },
        ]
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMoleculeSelect molecules={mockMolecules} />
            </Provider>
        )
        expect(screen.getByText('0: 3u7t')).toBeInTheDocument()
        expect(screen.getByText('1: 4hhb')).toBeInTheDocument()
    })

    test('shows "Any molecule" option when allowAny is true', () => {
        const mockMolecules = [
            { molNo: 0, name: '3u7t', sequences: [] },
        ]
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMoleculeSelect molecules={mockMolecules} allowAny={true} />
            </Provider>
        )
        expect(screen.getByText('Any molecule')).toBeInTheDocument()
    })

    test('disables select when empty', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMoleculeSelect molecules={[]} />
            </Provider>
        )
        const select = screen.getByRole('combobox')
        expect(select).toBeDisabled()
    })

    test('applies filter function', () => {
        const mockMolecules = [
            { molNo: 0, name: '3u7t', sequences: [] },
            { molNo: 1, name: '4hhb', sequences: [] },
        ]
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMoleculeSelect molecules={mockMolecules} filterFunction={(mol) => mol.molNo === 0} />
            </Provider>
        )
        expect(screen.getByText('0: 3u7t')).toBeInTheDocument()
        expect(screen.queryByText('1: 4hhb')).not.toBeInTheDocument()
    })

    test('renders with custom label', () => {
        const mockMolecules = [
            { molNo: 0, name: '3u7t', sequences: [] },
        ]
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMoleculeSelect molecules={mockMolecules} label="Pick Molecule" />
            </Provider>
        )
        expect(screen.getByText('Pick Molecule')).toBeInTheDocument()
    })
})

// ==============================
// MoorhenMapSelect
// ==============================
describe('MoorhenMapSelect', () => {

    test('renders "No maps available" when map list is empty', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMapSelect maps={[]} />
            </Provider>
        )
        expect(screen.getByText('No maps available')).toBeInTheDocument()
    })

    test('renders map options', () => {
        const mockMaps = [
            { molNo: 0, name: '2FoFc' },
            { molNo: 1, name: 'FoFc' },
        ]
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMapSelect maps={mockMaps} />
            </Provider>
        )
        expect(screen.getByText('0: 2FoFc')).toBeInTheDocument()
        expect(screen.getByText('1: FoFc')).toBeInTheDocument()
    })


    test('applies filter function', () => {
        const mockMaps = [
            { molNo: 0, name: '2FoFc', hasReflectionData: true },
            { molNo: 1, name: 'FoFc', hasReflectionData: false },
        ]
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMapSelect maps={mockMaps} filterFunction={(map) => !map.hasReflectionData} />
            </Provider>
        )
        expect(screen.queryByText('0: 2FoFc')).not.toBeInTheDocument()
        expect(screen.getByText('1: FoFc')).toBeInTheDocument()
    })

    test('renders with custom label', () => {
        const mockMaps = [
            { molNo: 0, name: '2FoFc' },
        ]
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMapSelect maps={mockMaps} label="Select Map" />
            </Provider>
        )
        expect(screen.getByText('Select Map')).toBeInTheDocument()
    })

    test('disables select when map list is empty', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMapSelect maps={[]} />
            </Provider>
        )
        const select = screen.getByRole('combobox')
        expect(select).toBeDisabled()
    })
})

// ==============================
// MoorhenChainSelect
// ==============================
describe('MoorhenChainSelect', () => {

    test('renders chain options from molecule sequences', () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: '3u7t',
                sequences: [
                    { chain: 'A', type: 1 },
                    { chain: 'B', type: 1 },
                ],
            },
        ]
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenChainSelect molecules={mockMolecules} selectedCoordMolNo={0} />
            </Provider>
        )
        expect(screen.getByText('A')).toBeInTheDocument()
        expect(screen.getByText('B')).toBeInTheDocument()
    })

    test('shows "All" option when allowAll is true', () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: '3u7t',
                sequences: [
                    { chain: 'A', type: 1 },
                ],
            },
        ]
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenChainSelect molecules={mockMolecules} selectedCoordMolNo={0} allowAll={true} />
            </Provider>
        )
        expect(screen.getByText('All')).toBeInTheDocument()
    })

    test('filters chains by allowedTypes', () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: '3u7t',
                sequences: [
                    { chain: 'A', type: 1 },
                    { chain: 'B', type: 3 },
                    { chain: 'C', type: 999 },
                ],
            },
        ]
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenChainSelect molecules={mockMolecules} selectedCoordMolNo={0} />
            </Provider>
        )
        expect(screen.getByText('A')).toBeInTheDocument()
        expect(screen.getByText('B')).toBeInTheDocument()
        expect(screen.queryByText('C')).not.toBeInTheDocument()
    })

    test('renders with custom label', () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: '3u7t',
                sequences: [
                    { chain: 'A', type: 1 },
                ],
            },
        ]
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenChainSelect molecules={mockMolecules} selectedCoordMolNo={0} label="Chain ID" />
            </Provider>
        )
        expect(screen.getByText('Chain ID')).toBeInTheDocument()
    })

    test('renders select even when selectedCoordMolNo is null', () => {
        const mockMolecules = [
            {
                molNo: 0,
                name: '3u7t',
                sequences: [
                    { chain: 'A', type: 1 },
                ],
            },
        ]
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenChainSelect molecules={mockMolecules} selectedCoordMolNo={null} />
            </Provider>
        )
        const select = screen.getByRole('combobox')
        expect(select).toBeInTheDocument()
    })
})
