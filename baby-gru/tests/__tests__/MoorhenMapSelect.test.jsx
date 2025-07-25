import '@testing-library/jest-dom'
import { render, screen, cleanup }  from '@testing-library/react'
import { Provider } from 'react-redux'
import { userEvent } from '@testing-library/user-event'
import { MoorhenMapSelect }  from '../../src/components/select/MoorhenMapSelect'
import { MoorhenMap } from '../../src/utils/MoorhenMap'
import MoorhenStore from "../../src/store/MoorhenReduxStore"

describe('Testing MoorhenMapSelect', () => {
    
    afterEach(cleanup)

    test('MoorhenMapSelect label', () => {
        render(
            <Provider store={MoorhenStore}> 
                <MoorhenMapSelect label="Test Label"/>
            </Provider> 
        )

        const labelNode = screen.getByText('Test Label')
        expect(labelNode).toBeVisible()

        const selectNode = screen.getByRole('combobox')
        expect(selectNode).toBeVisible()
    })

    test('MoorhenMapSelect select maps', async () => {
        const map_1 = new MoorhenMap(null, null)
        map_1.molNo = 0
        map_1.name = 'map-1'
        const map_2 = new MoorhenMap(null, null)
        map_2.molNo = 1
        map_2.name = 'map-2'
        const map_3 = new MoorhenMap(null, null)
        map_3.molNo = 2
        map_3.name = 'map-3'
        
        const maps = [map_1, map_2, map_3]

        render(
            <Provider store={MoorhenStore}> 
                <MoorhenMapSelect maps={maps}/>
            </Provider> 
        )

        const selectNode = screen.getByRole('combobox')
        const optionNode_1 = screen.getByText('0: map-1')
        const optionNode_2 = screen.getByText('1: map-2')
        const optionNode_3 = screen.getByText('2: map-3')

        expect(selectNode).toBeVisible()
        expect(optionNode_1).toBeInTheDocument()
        expect(optionNode_2).toBeInTheDocument()
        expect(optionNode_3).toBeInTheDocument()
        expect(selectNode).toHaveValue('0')

        const user = userEvent.setup()
        await user.selectOptions(selectNode, ['1'])
        expect(selectNode).toHaveValue('1')
        expect(optionNode_2.selected).toBeTruthy()
    })

    test('MoorhenMapSelect filter', () => {
        const map_1 = new MoorhenMap(null, null)
        map_1.molNo = 0
        map_1.name = 'map-1'
        const map_2 = new MoorhenMap(null, null)
        map_2.molNo = 1
        map_2.name = 'map-2'
        const map_3 = new MoorhenMap(null, null)
        map_3.molNo = 2
        map_3.name = 'map-3'
        
        const maps = [map_1, map_2, map_3]

        const filterFunction = (molecule) => {
            return molecule.molNo === 1
        }

        render(
            <Provider store={MoorhenStore}> 
                <MoorhenMapSelect maps={maps} filterFunction={filterFunction}/>
            </Provider> 
        )

        const selectNode = screen.getByRole('combobox')
        const optionNode_1 = screen.queryByText('0: map-1')
        const optionNode_2 = screen.queryByText('1: map-2')
        const optionNode_3 = screen.queryByText('2: map-3')

        expect(selectNode).toBeVisible()
        expect(optionNode_1).not.toBeInTheDocument()
        expect(optionNode_2).toBeInTheDocument()
        expect(optionNode_3).not.toBeInTheDocument()
        expect(selectNode).toHaveValue('1')
        expect(optionNode_2.selected).toBeTruthy()
    })

    test('MoorhenMapSelect onChange', async () => {
        const map_1 = new MoorhenMap(null, null)
        map_1.molNo = 0
        map_1.name = 'map-1'
        const map_2 = new MoorhenMap(null, null)
        map_2.molNo = 1
        map_2.name = 'map-2'
        const map_3 = new MoorhenMap(null, null)
        map_3.molNo = 2
        map_3.name = 'map-3'
        
        const maps = [map_1, map_2, map_3]

        const onChange = jest.fn()

        render(
            <Provider store={MoorhenStore}> 
                <MoorhenMapSelect maps={maps} onChange={onChange}/>
            </Provider> 
        )

        const selectNode = screen.getByRole('combobox')

        const user = userEvent.setup()
        await user.selectOptions(selectNode, ['1'])
        expect(onChange).toHaveBeenCalled()
    })
})