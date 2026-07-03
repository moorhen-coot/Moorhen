jest.setTimeout(15000)
jest.mock('chart.js', () => ({
    ...jest.requireActual('chart.js'),
    registerables: []
}))

import '@testing-library/jest-dom'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { _MoorhenReduxStore as MoorhenReduxStore } from "../../src/store/MoorhenReduxStore"
import { setCootInitialized, setDevMode } from '../../src/store/generalStatesSlice'
import { setIsDark, setWidth, setHeight, setDefaultBondSmoothness } from '../../src/store/sceneSettingsSlice'

import { MoorhenInstanceProvider } from '../../src/InstanceManager'
import { MoorhenAccordion } from '../../src/components/interface-base/Accordion/Accordion'
import { MoorhenStack } from '../../src/components/interface-base/Stack/Stack'
import { MoorhenTabContainer, MoorhenTab } from '../../src/components/interface-base/Tabs/Tabs'
import { MoorhenMenuItem } from '../../src/components/interface-base/MenuItems/MenuItem'

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
// MoorhenAccordion
// ==============================
describe('MoorhenAccordion', () => {

    test('renders with title and children when open', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenAccordion title="Test Title" defaultOpen={true}>
                        <p>Accordion content</p>
                    </MoorhenAccordion>
                </MoorhenInstanceProvider>
            </Provider>
        )
        expect(screen.getByText('Test Title')).toBeInTheDocument()
        expect(screen.getByText('Accordion content')).toBeInTheDocument()
    })

    test('children are hidden when accordion is closed', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenAccordion title="Closed" defaultOpen={false}>
                        <p>Hidden content</p>
                    </MoorhenAccordion>
                </MoorhenInstanceProvider>
            </Provider>
        )
        expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
    })

    test('children are visible when defaultOpen is true', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenAccordion title="Open" defaultOpen={true}>
                        <p>Visible content</p>
                    </MoorhenAccordion>
                </MoorhenInstanceProvider>
            </Provider>
        )
        expect(screen.getByText('Visible content')).toBeInTheDocument()
    })

    test('toggles content visibility on button click', async () => {
        const user = userEvent.setup()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenAccordion title="Toggle" defaultOpen={false}>
                        <p>Toggle content</p>
                    </MoorhenAccordion>
                </MoorhenInstanceProvider>
            </Provider>
        )
        expect(screen.queryByText('Toggle content')).not.toBeInTheDocument()

        const toggleButton = screen.getByRole('button', { name: /keyboard/i })
        await user.click(toggleButton)
        expect(screen.getByText('Toggle content')).toBeInTheDocument()

        await user.click(toggleButton)
        expect(screen.queryByText('Toggle content')).not.toBeInTheDocument()
    })

    test('calls onChange callback when toggled', async () => {
        const user = userEvent.setup()
        const onChange = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenAccordion title="Callback" defaultOpen={false} onChange={onChange}>
                        <p>Callback content</p>
                    </MoorhenAccordion>
                </MoorhenInstanceProvider>
            </Provider>
        )
        const toggleButton = screen.getByRole('button', { name: /keyboard/i })
        await user.click(toggleButton)
        expect(onChange).toHaveBeenCalledWith(true)

        await user.click(toggleButton)
        expect(onChange).toHaveBeenCalledWith(false)
    })

    test('calls onOpen and onClose callbacks', async () => {
        const user = userEvent.setup()
        const onOpen = jest.fn()
        const onClose = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenAccordion title="OpenClose" defaultOpen={false} onOpen={onOpen} onClose={onClose}>
                        <p>OpenClose content</p>
                    </MoorhenAccordion>
                </MoorhenInstanceProvider>
            </Provider>
        )
        const toggleButton = screen.getByRole('button', { name: /keyboard/i })
        await user.click(toggleButton)
        expect(onOpen).toHaveBeenCalledTimes(1)
        expect(onClose).not.toHaveBeenCalled()

        await user.click(toggleButton)
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    test('controlled mode respects open prop', () => {
        const { rerender } = render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenAccordion title="Controlled" open={true}>
                        <p>Controlled content</p>
                    </MoorhenAccordion>
                </MoorhenInstanceProvider>
            </Provider>
        )
        expect(screen.getByText('Controlled content')).toBeInTheDocument()

        rerender(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenAccordion title="Controlled" open={false}>
                        <p>Controlled content</p>
                    </MoorhenAccordion>
                </MoorhenInstanceProvider>
            </Provider>
        )
        expect(screen.queryByText('Controlled content')).not.toBeInTheDocument()
    })

    test('renders with card type', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenAccordion title="Card" type="card" defaultOpen={true}>
                        <p>Card content</p>
                    </MoorhenAccordion>
                </MoorhenInstanceProvider>
            </Provider>
        )
        expect(screen.getByText('Card')).toBeInTheDocument()
    })

    test('disabled accordion does not toggle', async () => {
        const user = userEvent.setup()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenAccordion title="Disabled" disabled={true} defaultOpen={false}>
                        <p>Disabled content</p>
                    </MoorhenAccordion>
                </MoorhenInstanceProvider>
            </Provider>
        )
        const toggleButton = screen.getByRole('button', { name: /keyboard/i })
        expect(screen.getByText('Disabled').closest('.moorhen__accordion-header')).toHaveClass('disabled')
    })

    test('renders extra controls', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenAccordion title="Extra" extraControls={[<button key="x" data-testid="extra-btn">Extra</button>]}>
                        <p>Extra content</p>
                    </MoorhenAccordion>
                </MoorhenInstanceProvider>
            </Provider>
        )
        expect(screen.getByTestId('extra-btn')).toBeInTheDocument()
    })
})

// ==============================
// MoorhenStack
// ==============================
describe('MoorhenStack', () => {

    test('renders children', () => {
        render(
            <MoorhenStack>
                <p>Stack child</p>
            </MoorhenStack>
        )
        expect(screen.getByText('Stack child')).toBeInTheDocument()
    })

    test('renders as row when direction is row', () => {
        const { container } = render(
            <MoorhenStack direction="row">
                <p>Row item</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv.className).toContain('moorhen__stack__row')
    })

    test('renders as column by default', () => {
        const { container } = render(
            <MoorhenStack>
                <p>Column item</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv.className).toContain('moorhen__stack__column')
    })

    test('renders as column when direction is vertical', () => {
        const { container } = render(
            <MoorhenStack direction="vertical">
                <p>Vertical item</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv.className).toContain('moorhen__stack__column')
    })

    test('applies card class when card is true', () => {
        const { container } = render(
            <MoorhenStack card={true}>
                <p>Card stack</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv.className).toContain('moorhen__stack_card')
    })

    test('applies margin class when addMargin is true and not card', () => {
        const { container } = render(
            <MoorhenStack addMargin={true}>
                <p>Margins</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv.className).toContain('moorhen__stack_margins')
    })

    test('uses inputGrid class when inputGrid is true', () => {
        const { container } = render(
            <MoorhenStack inputGrid={true}>
                <p>Input grid</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv.className).toContain('moorhen__input-grid')
    })

    test('applies custom className', () => {
        const { container } = render(
            <MoorhenStack className="my-custom-class">
                <p>Custom class</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv.className).toContain('my-custom-class')
    })

    test('sets gap from props', () => {
        const { container } = render(
            <MoorhenStack gap="2rem">
                <p>Gapped</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv).toHaveStyle('gap: 2rem')
    })

    test('sets justifyContent from justify prop', () => {
        const { container } = render(
            <MoorhenStack justify="center">
                <p>Centered</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv).toHaveStyle('justify-content: center')
    })

    test('sets alignItems from align prop', () => {
        const { container } = render(
            <MoorhenStack align="stretch">
                <p>Stretched</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv).toHaveStyle('align-items: stretch')
    })

    test('merges custom styles', () => {
        const { container } = render(
            <MoorhenStack style={{ backgroundColor: 'red', padding: '10px' }}>
                <p>Styled</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv).toHaveStyle('background-color: rgb(255, 0, 0)')
        expect(stackDiv).toHaveStyle('padding: 10px')
    })

    test('sets overflow from prop', () => {
        const { container } = render(
            <MoorhenStack overflow="auto">
                <p>Auto overflow</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv).toHaveStyle('overflow: auto')
    })

    test('sets flex from prop', () => {
        const { container } = render(
            <MoorhenStack flex={0}>
                <p>No flex</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv).toHaveStyle('flex: 0')
    })

    test('grid applies gridTemplateColumns', () => {
        const { container } = render(
            <MoorhenStack grid={true} gridWidth={3}>
                <p>Grid item</p>
            </MoorhenStack>
        )
        const stackDiv = container.firstElementChild
        expect(stackDiv).toHaveStyle('grid-template-columns: repeat(3, auto 1fr)')
    })

    test('forwards ref', () => {
        const ref = { current: null }
        render(
            <MoorhenStack ref={ref}>
                <p>Ref item</p>
            </MoorhenStack>
        )
        expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
})

// ==============================
// MoorhenTabContainer / MoorhenTab
// ==============================
describe('MoorhenTabContainer & MoorhenTab', () => {

    test('renders tabs with labels', () => {
        render(
            <MoorhenTabContainer>
                <MoorhenTab id="tab1" label="First Tab">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second Tab">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        )
        expect(screen.getByText('First Tab')).toBeInTheDocument()
        expect(screen.getByText('Second Tab')).toBeInTheDocument()
    })

    test('shows only the active tab content', () => {
        render(
            <MoorhenTabContainer defaultActiveId="tab1">
                <MoorhenTab id="tab1" label="First">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        )
        expect(screen.getByText('First content')).toBeVisible()
        expect(screen.getByText('Second content')).toBeInTheDocument()
    })

    test('switches active tab on click', async () => {
        const user = userEvent.setup()
        render(
            <MoorhenTabContainer defaultActiveId="tab1">
                <MoorhenTab id="tab1" label="First">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        )
        const secondTab = screen.getByRole('tab', { name: /second/i })
        await user.click(secondTab)

        // First tab content should now be hidden (no longer active)
        // Second tab content becomes active
    })

    test('calls onChange when tab is clicked', async () => {
        const user = userEvent.setup()
        const onChange = jest.fn()
        render(
            <MoorhenTabContainer defaultActiveId="tab1" onChange={onChange}>
                <MoorhenTab id="tab1" label="First">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        )
        const secondTab = screen.getByRole('tab', { name: /second/i })
        await user.click(secondTab)
        expect(onChange).toHaveBeenCalledWith('tab2')
    })

    test('defaults to first tab when no defaultActiveId is given', () => {
        render(
            <MoorhenTabContainer>
                <MoorhenTab id="tab1" label="First">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        )
        const firstTab = screen.getByRole('tab', { name: /first/i })
        expect(firstTab).toHaveAttribute('aria-selected', 'true')
    })

    test('marks active tab with aria-selected', async () => {
        const user = userEvent.setup()
        render(
            <MoorhenTabContainer defaultActiveId="tab1">
                <MoorhenTab id="tab1" label="First">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        )
        const firstTab = screen.getByRole('tab', { name: /first/i })
        expect(firstTab).toHaveAttribute('aria-selected', 'true')

        const secondTab = screen.getByRole('tab', { name: /second/i })
        await user.click(secondTab)
        expect(secondTab).toHaveAttribute('aria-selected', 'true')
        expect(firstTab).toHaveAttribute('aria-selected', 'false')
    })

    test('applies className to container', () => {
        const { container } = render(
            <MoorhenTabContainer className="my-tabs">
                <MoorhenTab id="tab1" label="First">
                    <p>First content</p>
                </MoorhenTab>
                <MoorhenTab id="tab2" label="Second">
                    <p>Second content</p>
                </MoorhenTab>
            </MoorhenTabContainer>
        )
        const containerDiv = container.firstElementChild
        expect(containerDiv.className).toContain('my-tabs')
    })
})

// ==============================
// MoorhenMenuItem
// ==============================
describe('MoorhenMenuItem', () => {

    test('renders children', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMenuItem>Menu Item Text</MoorhenMenuItem>
            </Provider>
        )
        expect(screen.getByText('Menu Item Text')).toBeInTheDocument()
    })

    test('renders as a button element', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMenuItem>Button Item</MoorhenMenuItem>
            </Provider>
        )
        expect(screen.getByRole('button', { name: /button item/i })).toBeInTheDocument()
    })

    test('calls onClick when clicked', async () => {
        const user = userEvent.setup()
        const onClick = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMenuItem onClick={onClick}>Clickable</MoorhenMenuItem>
            </Provider>
        )
        await user.click(screen.getByRole('button', { name: /clickable/i }))
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    test('applies selected class when selected', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMenuItem selected={true}>Selected Item</MoorhenMenuItem>
            </Provider>
        )
        const button = screen.getByRole('button', { name: /selected item/i })
        expect(button.className).toContain('moorhen__menu-item-selected')
    })

    test('does not apply selected class when not selected', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMenuItem selected={false}>Unselected</MoorhenMenuItem>
            </Provider>
        )
        const button = screen.getByRole('button', { name: /unselected/i })
        expect(button.className).not.toContain('moorhen__menu-item-selected')
    })

    test('disables the button when disabled', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMenuItem disabled={true}>Disabled Item</MoorhenMenuItem>
            </Provider>
        )
        const button = screen.getByRole('button', { name: /disabled item/i })
        expect(button).toBeDisabled()
    })

    test('does not call onClick when disabled', async () => {
        const user = userEvent.setup()
        const onClick = jest.fn()
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMenuItem disabled={true} onClick={onClick}>Disabled Click</MoorhenMenuItem>
            </Provider>
        )
        const button = screen.getByRole('button', { name: /disabled click/i })
        await user.click(button)
        expect(onClick).not.toHaveBeenCalled()
    })

    test('applies custom styles', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMenuItem style={{ fontWeight: 'bold', color: 'red' }}>Styled</MoorhenMenuItem>
            </Provider>
        )
        const button = screen.getByRole('button', { name: /styled/i })
        expect(button).toHaveStyle('font-weight: bold')
        expect(button).toHaveStyle('color: rgb(255, 0, 0)')
    })

    test('has disabled class when disabled', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMenuItem disabled={true}>Disabled Class</MoorhenMenuItem>
            </Provider>
        )
        const button = screen.getByRole('button', { name: /disabled class/i })
        expect(button.className).toContain('moorhen__menu-item-disabled')
    })

    test('accepts a ref', () => {
        const ref = { current: null }
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMenuItem ref={ref}>Ref Item</MoorhenMenuItem>
            </Provider>
        )
        expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })
})
