import '@testing-library/jest-dom'
import { render, screen, cleanup, waitFor }  from '@testing-library/react'
import { Provider } from 'react-redux'
import { userEvent } from '@testing-library/user-event'
import { createRef } from 'react'
import { MoorhenReduxStore } from "../../src/store/MoorhenReduxStore"
import { MoorhenNumberForm }  from '../../src/components/select/MoorhenNumberForm'

describe('Testing MoorhenNumberForm', () => {

    afterEach(cleanup)

    test('MoorhenNumberForm label', async () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberForm defaultValue={10} label="Test Label"/>
            </Provider>
        )

        const labelNode = screen.getByText('Test Label')
        expect(labelNode).toBeVisible()
    })

    test('MoorhenNumberForm disabled', async () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberForm defaultValue={10} disabled={true}/>
            </Provider>
        )

        const formNode = screen.getByRole('spinbutton')
        expect(formNode).toBeVisible()
        expect(formNode).toBeDisabled()
    })

    test('MoorhenNumberForm change values', async () => {
        const numberFormRef = createRef(null)

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberForm ref={numberFormRef} defaultValue={10}/>
            </Provider>
        )

        const formNode = screen.getByRole('spinbutton')
        expect(formNode).toBeVisible()
        expect(formNode).toHaveValue(10)

        const user = userEvent.setup()
        await user.clear(formNode)
        await user.type(formNode, "15")
        expect(numberFormRef.current).toBe("15")
        expect(formNode).toHaveValue(15)
    })

    test('MoorhenNumberForm onChange', async () => {
        const numberFormRef = createRef(null)

        const onChange = jest.fn()

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberForm ref={numberFormRef} defaultValue={10} onChange={onChange}/>
            </Provider>
        )

        const formNode = screen.getByRole('spinbutton')
        const user = userEvent.setup()
        await user.clear(formNode)
        await user.type(formNode, "15")
        expect(onChange).toHaveBeenCalled()
    })

    test('MoorhenNumberForm allowNegativeValues', async () => {
        const numberFormRef = createRef(null)

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberForm ref={numberFormRef} defaultValue={10} allowNegativeValues={true}/>
            </Provider>
        )

        const formNode = screen.getByRole('spinbutton')
        const user = userEvent.setup()
        await user.clear(formNode)
        await user.type(formNode, "-10")
        expect(numberFormRef.current).toBe("-10")
        expect(formNode).toHaveStyle({
            borderColor: '#ced4da'
        })
    })

    test('MoorhenNumberForm invalid negative values', async () => {
        const numberFormRef = createRef(null)

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberForm ref={numberFormRef} defaultValue={10}/>
            </Provider>
        )

        const formNode = screen.getByRole('spinbutton')
        const user = userEvent.setup()
        await user.clear(formNode)
        await user.type(formNode, "-10")
        expect(numberFormRef.current).toBe("")
        expect(formNode).toHaveStyle({
            borderColor: 'red'
        })
    })

    test('MoorhenNumberForm invalid letter values', async () => {
        const numberFormRef = createRef(null)

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberForm ref={numberFormRef} defaultValue={10}/>
            </Provider>
        )

        const formNode = screen.getByRole('spinbutton')
        const user = userEvent.setup()
        await user.clear(formNode)
        await user.type(formNode, "hello word")
        expect(numberFormRef.current).toBe("")
        expect(formNode).toHaveStyle({
            borderColor: 'red'
        })
    })

    test('MoorhenNumberForm valid float values', async () => {
        const numberFormRef = createRef(null)

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNumberForm ref={numberFormRef} defaultValue={10}/>
            </Provider>
        )

        const formNode = screen.getByRole('spinbutton')
        const user = userEvent.setup()
        await user.clear(formNode)
        await user.type(formNode, "10.5")
        expect(numberFormRef.current).toBe("10.5")
        expect(formNode).toHaveStyle({
            borderColor: '#ced4da'
        })
    })
})
