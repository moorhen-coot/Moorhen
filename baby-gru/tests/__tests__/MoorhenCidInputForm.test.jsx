import '@testing-library/jest-dom'
import { render, screen, cleanup, act }  from '@testing-library/react'
import { MoorhenCidInputForm }  from '../../src/components/form/MoorhenCidInputForm'
import { Provider } from 'react-redux'
import { userEvent } from '@testing-library/user-event'
import MoorhenStore from "../../src/store/MoorhenReduxStore"
import { setResidueSelection, setShowResidueSelection } from '../../src/store/generalStatesSlice'
import { createRef } from 'react'

describe('Testing MoorhenCidIputForm', () => {
    
    afterEach(cleanup)

    test('Test MoorhenCidInputForm label', async () => {
        render(
            <Provider store={MoorhenStore}> 
                <MoorhenCidInputForm label="Test Label"/>
            </Provider> 
        )

        const labelNode = screen.getByText('Test Label')
        expect(labelNode).toBeVisible()
        const formNode = screen.getByRole('textbox')
        expect(formNode).toHaveValue('')
    })

    test('Test MoorhenCidInputForm default value', async () => {
        render(
            <Provider store={MoorhenStore}> 
                <MoorhenCidInputForm defaultValue="//A"/>
            </Provider> 
        )

        const formNode = screen.getByRole('textbox')
        expect(formNode).toBeVisible()
        expect(formNode).toHaveValue('//A')
    })

    test('Test MoorhenCidInputForm input', async () => {
        render(
            <Provider store={MoorhenStore}> 
                <MoorhenCidInputForm/>
            </Provider> 
        )

        const formNode = screen.getByRole('textbox')

        const user = userEvent.setup()
        await user.type(formNode, "//B");
        expect(formNode).toHaveValue('//B')
    })

    test('Test MoorhenCidInputForm default cid style', async () => {
        render(
            <Provider store={MoorhenStore}> 
                <MoorhenCidInputForm/>
            </Provider> 
        )

        const formNode = screen.getByRole('textbox')
        expect(formNode).toHaveStyle({
            width: "100%",
        })
    })

    test('Test MoorhenCidInputForm invalid cid', async () => {
        render(
            <Provider store={MoorhenStore}> 
                <MoorhenCidInputForm invalidCid={true}/>
            </Provider> 
        )

        const formNode = screen.getByRole('textbox')
        expect(formNode).toHaveStyle({
            width: "100%",
            color: 'rgb(255, 0, 0)'
        })
    })

    test('Test MoorhenCidInputForm residue selection', async () => {
        const cidRef = createRef(null)
        
        const dom = render(
            <Provider store={MoorhenStore}> 
                <MoorhenCidInputForm ref={cidRef} allowUseCurrentSelection={true}/>
            </Provider> 
        )

        act(() => {
            
            MoorhenStore.dispatch(setResidueSelection({
                molecule: null,
                first: '//A',
                second: '//A',
                cid: '//A',
                isMultiCid: false,
                label: '//A'
            }))
            
            MoorhenStore.dispatch( setShowResidueSelection(true) )    
        })
        
        const formNode = screen.getByRole('textbox')
        const checkBoxNode = screen.getByRole('checkbox')
        
        expect(formNode).toBeVisible()
        expect(checkBoxNode).toBeVisible()
        expect(checkBoxNode).not.toBeChecked()
        
        const user = userEvent.setup()
        await user.click(checkBoxNode)

        expect(checkBoxNode).toBeChecked()
        expect(cidRef.current.value).toBe('//A')
        expect(formNode).toHaveValue('//A')
    })
})