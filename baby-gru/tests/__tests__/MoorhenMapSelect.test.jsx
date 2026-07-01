import '@testing-library/jest-dom'
import { render, screen, cleanup }  from '@testing-library/react'
import { Provider } from 'react-redux'
import { userEvent } from '@testing-library/user-event'
import { MoorhenMapSelect }  from '../../src/components/inputs/Selector/MoorhenMapSelect'
import { MoorhenMap } from '../../src/utils/MoorhenMap'
import { _MoorhenReduxStore as MoorhenReduxStore} from "../../src/store/MoorhenReduxStore"
import { MockMoorhenInstance } from '../__mocks__/mockMoorhenInstance'

describe('Testing MoorhenMapSelect', () => {

    afterEach(cleanup)

    test('MoorhenMapSelect label', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMapSelect label="Test Label"/>
            </Provider>
        )

        const labelNode = screen.getByText('Test Label')
        expect(labelNode).toBeVisible()

        const selectNode = screen.getByRole('combobox')
        expect(selectNode).toBeVisible()
    })

    test('MoorhenMapSelect select maps', async () => {
        const mockInstance = new MockMoorhenInstance()
        const map_1 = new MoorhenMap(mockInstance)
        map_1.molNo = 0
        map_1.name = 'map-1'
        const map_2 = new MoorhenMap(mockInstance)
        map_2.molNo = 1
        map_2.name = 'map-2'
        const map_3 = new MoorhenMap(mockInstance)
        map_3.molNo = 2
        map_3.name = 'map-3'

        const maps = [map_1, map_2, map_3]

        render(
            <Provider store={MoorhenReduxStore}>
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
        const mockInstance = new MockMoorhenInstance()
        const map_1 = new MoorhenMap(mockInstance)
        map_1.molNo = 0
        map_1.name = 'map-1'
        const map_2 = new MoorhenMap(mockInstance)
        map_2.molNo = 1
        map_2.name = 'map-2'
        const map_3 = new MoorhenMap(mockInstance)
        map_3.molNo = 2
        map_3.name = 'map-3'

        const maps = [map_1, map_2, map_3]

        const filterFunction = (molecule) => {
            return molecule.molNo === 1
        }

        render(
            <Provider store={MoorhenReduxStore}>
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
        const mockInstance = new MockMoorhenInstance()
        const map_1 = new MoorhenMap(mockInstance)
        map_1.molNo = 0
        map_1.name = 'map-1'
        const map_2 = new MoorhenMap(mockInstance)
        map_2.molNo = 1
        map_2.name = 'map-2'
        const map_3 = new MoorhenMap(mockInstance)
        map_3.molNo = 2
        map_3.name = 'map-3'

        const maps = [map_1, map_2, map_3]

        const onChange = jest.fn()

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMapSelect maps={maps} onChange={onChange}/>
            </Provider>
        )

        const selectNode = screen.getByRole('combobox')

        const user = userEvent.setup()
        await user.selectOptions(selectNode, ['1'])
        expect(onChange).toHaveBeenCalled()
    })
})
