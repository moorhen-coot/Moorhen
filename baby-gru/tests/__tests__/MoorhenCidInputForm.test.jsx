import '@testing-library/jest-dom'
import { render, screen, cleanup, act }  from '@testing-library/react'
import { Provider } from 'react-redux'
import { userEvent } from '@testing-library/user-event'
import { createRef } from 'react'
import { MoorhenCidInputForm }  from '../../src/components/inputs/MoorhenCidInputForm'
import MoorhenStore from "../../src/store/MoorhenReduxStore"
import { setResidueSelection, setShowResidueSelection } from '../../src/store/generalStatesSlice'

describe('Testing MoorhenCidIputForm', () => {
    
    afterEach(cleanup)

    test('MoorhenCidInputForm label', async () => {
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

    test('MoorhenCidInputForm default value', async () => {
        render(
            <Provider store={MoorhenStore}> 
                <MoorhenCidInputForm defaultValue="//A"/>
            </Provider> 
        )

        const formNode = screen.getByRole('textbox')
        expect(formNode).toBeVisible()
        expect(formNode).toHaveValue('//A')
    })

    test('MoorhenCidInputForm input', async () => {
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

    test('MoorhenCidInputForm residue selection', async () => {
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