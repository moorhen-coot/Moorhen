import '@testing-library/jest-dom'
import { render, screen, cleanup }  from '@testing-library/react'
import { MoorhenBackupSelect }  from '../../src/components/select/MoorhenBackupSelect'
import { Provider } from 'react-redux'
import { userEvent } from '@testing-library/user-event'
import MoorhenStore from "../../src/store/MoorhenReduxStore"
import { createRef } from 'react'
import { MockTimeCapsule } from '../__mocks__/mockTimeCapsule'

describe('Testing MoorhenBackupSelect', () => {
    
    afterEach(cleanup)

    test('Test MoorhenBackupSelect label', () => {
        const selectRef = createRef(null)
        const timeCapsule = new MockTimeCapsule()
        const timeCapsuleRef = createRef(timeCapsule)

        render(
            <Provider store={MoorhenStore}> 
                <MoorhenBackupSelect ref={selectRef} timeCapsuleRef={timeCapsuleRef} label="Test Label"/>
            </Provider> 
        )

        const labelNode = screen.getByText('Test Label')
        expect(labelNode).toBeVisible()

        const selectNode = screen.getByRole('combobox')
        expect(selectNode).toBeVisible()
    })

    test('Test MoorhenBackupSelect select maps', async () => {
        const selectRef = createRef(null)
        const timeCapsuleRef = createRef()
        
        const timeCapsule = new MockTimeCapsule()
        timeCapsuleRef.current = timeCapsule

        render(
            <Provider store={MoorhenStore}> 
                <MoorhenBackupSelect ref={selectRef} timeCapsuleRef={timeCapsuleRef}/>
            </Provider> 
        )

        const selectNode = screen.getByRole('combobox')
        const optionNode_1 = await screen.findByText('key-1')
        const optionNode_2 = await screen.findByText('key-2')
        const optionNode_3 = await screen.findByText('key-3')
        
        expect(selectNode).toBeVisible()
        expect(optionNode_1).toBeInTheDocument()
        expect(optionNode_2).toBeInTheDocument()
        expect(optionNode_3).toBeInTheDocument()
        expect(selectNode).toHaveValue(JSON.stringify( { label: 'key-1' } ))

        const user = userEvent.setup()
        await user.selectOptions(selectNode, ['key-3'])
        expect(selectNode).toHaveValue(JSON.stringify( { label: 'key-3' } ))
        expect(optionNode_3.selected).toBeTruthy()
        expect(selectRef.current.value).toBe(JSON.stringify( { label: 'key-3' } ))
    })
})