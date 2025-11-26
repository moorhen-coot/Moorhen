import '@testing-library/jest-dom'
import { render, screen, cleanup }  from '@testing-library/react'
import { Provider } from 'react-redux'
import { userEvent } from '@testing-library/user-event'
import { MoorhenChainSelect }  from '../../src/components/select/MoorhenChainSelect'
import { MoorhenMolecule } from '../../src/utils/MoorhenMolecule'
import { _MoorhenReduxStore as MoorhenReduxStore} from "../../src/store/MoorhenReduxStore"

describe('Testing MoorhenChainSelect', () => {

    afterEach(cleanup)

    test('MoorhenChainSelect label', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenChainSelect molecules={[ ]} selectedCoordMolNo={null} label="Test Label"/>
            </Provider>
        )

        const labelNode = screen.getByText('Test Label')
        expect(labelNode).toBeVisible()

        const selectNode = screen.getByRole('combobox')
        expect(selectNode).toBeVisible()
    })

    test('MoorhenChainSelect select chains', async () => {
        const molecule_1 = new MoorhenMolecule(null, null, '')
        molecule_1.molNo = 0
        molecule_1.name = 'mol-1'
        molecule_1.sequences = [
            {
                type: 1,
                chain: 'A',
            },
            {
                type: 2,
                chain: 'B',
            },
            {
                type: 3,
                chain: 'C',
            }
        ]
        const molecule_2 = new MoorhenMolecule(null, null, '')
        molecule_2.molNo = 1
        molecule_2.name = 'mol-2'
        const molecule_3 = new MoorhenMolecule(null, null, '')
        molecule_3.molNo = 2
        molecule_3.name = 'mol-3'

        const molecules = [molecule_1, molecule_2, molecule_3]

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenChainSelect molecules={molecules} selectedCoordMolNo={0}/>
            </Provider>
        )

        const selectNode = screen.getByRole('combobox')
        const optionNode_1 = screen.getByText('A')
        const optionNode_2 = screen.getByText('B')
        const optionNode_3 = screen.getByText('C')

        expect(selectNode).toBeVisible()
        expect(optionNode_1).toBeInTheDocument()
        expect(optionNode_2).toBeInTheDocument()
        expect(optionNode_3).toBeInTheDocument()
        expect(selectNode).toHaveValue('A')
        expect(optionNode_1.selected).toBeTruthy()

        const user = userEvent.setup()
        await user.selectOptions(selectNode, ['C'])
        expect(selectNode).toHaveValue('C')
        expect(optionNode_3.selected).toBeTruthy()
    })

    test('MoorhenChainSelect allowedTypes', () => {
        const molecule_1 = new MoorhenMolecule(null, null, '')
        molecule_1.molNo = 0
        molecule_1.name = 'mol-1'
        molecule_1.sequences = [
            {
                type: 1,
                chain: 'A',
            },
            {
                type: 2,
                chain: 'B',
            },
            {
                type: 3,
                chain: 'C',
            }
        ]
        const molecule_2 = new MoorhenMolecule(null, null, '')
        molecule_2.molNo = 1
        molecule_2.name = 'mol-2'
        const molecule_3 = new MoorhenMolecule(null, null, '')
        molecule_3.molNo = 2
        molecule_3.name = 'mol-3'

        const molecules = [molecule_1, molecule_2, molecule_3]

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenChainSelect molecules={molecules} selectedCoordMolNo={0} allowedTypes={[1, 3]}/>
            </Provider>
        )

        const selectNode = screen.getByRole('combobox')
        const optionNode_1 = screen.queryByText('A')
        const optionNode_2 = screen.queryByText('B')
        const optionNode_3 = screen.queryByText('C')

        expect(selectNode).toBeVisible()
        expect(optionNode_1).toBeInTheDocument()
        expect(optionNode_2).not.toBeInTheDocument()
        expect(optionNode_3).toBeInTheDocument()
        expect(selectNode).toHaveValue('A')
        expect(optionNode_1.selected).toBeTruthy()
    })

    test('MoorhenChainSelect onChange', async () => {
        const molecule_1 = new MoorhenMolecule(null, null, '')
        molecule_1.molNo = 0
        molecule_1.name = 'mol-1'
        molecule_1.sequences = [
            {
                type: 1,
                chain: 'A',
            },
            {
                type: 2,
                chain: 'B',
            },
            {
                type: 3,
                chain: 'C',
            }
        ]
        const molecule_2 = new MoorhenMolecule(null, null, '')
        molecule_2.molNo = 1
        molecule_2.name = 'mol-2'
        const molecule_3 = new MoorhenMolecule(null, null, '')
        molecule_3.molNo = 2
        molecule_3.name = 'mol-3'

        const molecules = [molecule_1, molecule_2, molecule_3]

        const onChange = jest.fn()

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenChainSelect molecules={molecules} selectedCoordMolNo={0} onChange={onChange}/>
            </Provider>
        )

        const selectNode = screen.getByRole('combobox')

        const user = userEvent.setup()
        await user.selectOptions(selectNode, ['C'])
        expect(onChange).toHaveBeenCalled()
    })
})
