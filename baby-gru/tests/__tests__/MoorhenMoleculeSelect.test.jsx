import '@testing-library/jest-dom'
import { render, screen, cleanup }  from '@testing-library/react'
import { Provider } from 'react-redux'
import { userEvent } from '@testing-library/user-event'
import { MoorhenMoleculeSelect }  from '../../src/components/inputs/Selector/MoleculeSelector'
import { MoorhenMolecule } from '../../src/utils/MoorhenMolecule'
import { _MoorhenReduxStore as MoorhenReduxStore} from "../../src/store/MoorhenReduxStore"

describe('Testing MoorhenMoleculeSelect', () => {

    afterEach(cleanup)

    test('MoorhenMoleculeSelect label', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMoleculeSelect label="Test Label"/>
            </Provider>
        )

        const labelNode = screen.getByText('Test Label')
        expect(labelNode).toBeVisible()

        const selectNode = screen.getByRole('combobox')
        expect(selectNode).toBeVisible()
    })

    test('MoorhenMoleculeSelect select molecules', async () => {
        const molecule_1 = new MoorhenMolecule(null, null, '')
        molecule_1.molNo = 0
        molecule_1.name = 'mol-1'
        const molecule_2 = new MoorhenMolecule(null, null, '')
        molecule_2.molNo = 1
        molecule_2.name = 'mol-2'
        const molecule_3 = new MoorhenMolecule(null, null, '')
        molecule_3.molNo = 2
        molecule_3.name = 'mol-3'

        const molecules = [molecule_1, molecule_2, molecule_3]

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMoleculeSelect molecules={molecules} allowAny={true}/>
            </Provider>
        )

        const selectNode = screen.getByRole('combobox')
        const optionNode_1 = screen.getByText('0: mol-1')
        const optionNode_2 = screen.getByText('1: mol-2')
        const optionNode_3 = screen.getByText('2: mol-3')
        const anyOptionNode = screen.getByText('Any molecule')

        expect(selectNode).toBeVisible()
        expect(optionNode_1).toBeInTheDocument()
        expect(optionNode_2).toBeInTheDocument()
        expect(optionNode_3).toBeInTheDocument()
        expect(anyOptionNode).toBeVisible()
        expect(selectNode).toHaveValue('-999999')
        expect(anyOptionNode.selected).toBeTruthy()

        const user = userEvent.setup()
        await user.selectOptions(selectNode, ['1'])
        expect(selectNode).toHaveValue('1')
        expect(optionNode_2.selected).toBeTruthy()
    })

    test('MoorhenMoleculeSelect filter', () => {
        const molecule_1 = new MoorhenMolecule(null, null, '')
        molecule_1.molNo = 0
        molecule_1.name = 'mol-1'
        const molecule_2 = new MoorhenMolecule(null, null, '')
        molecule_2.molNo = 1
        molecule_2.name = 'mol-2'
        const molecule_3 = new MoorhenMolecule(null, null, '')
        molecule_3.molNo = 2
        molecule_3.name = 'mol-3'

        const molecules = [molecule_1, molecule_2, molecule_3]

        const filterFunction = (molecule) => {
            return molecule.molNo === 1
        }

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenMoleculeSelect molecules={molecules} allowAny={false} filterFunction={filterFunction}/>
            </Provider>
        )

        const selectNode = screen.getByRole('combobox')
        const optionNode_1 = screen.queryByText('0: mol-1')
        const optionNode_2 = screen.queryByText('1: mol-2')
        const optionNode_3 = screen.queryByText('2: mol-3')
        const anyOptionNode = screen.queryByText('Any molecule')

        expect(selectNode).toBeVisible()
        expect(optionNode_1).not.toBeInTheDocument()
        expect(optionNode_2).toBeInTheDocument()
        expect(optionNode_3).not.toBeInTheDocument()
        expect(anyOptionNode).not.toBeInTheDocument()
        expect(selectNode).toHaveValue('1')
        expect(optionNode_2.selected).toBeTruthy()
    })

    test('MoorhenMoleculeSelect onChange', async () => {
        const molecule_1 = new MoorhenMolecule(null, null, '')
        molecule_1.molNo = 0
        molecule_1.name = 'mol-1'
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
                <MoorhenMoleculeSelect molecules={molecules} onChange={onChange}/>
            </Provider>
        )

        const selectNode = screen.getByRole('combobox')

        const user = userEvent.setup()
        await user.selectOptions(selectNode, ['1'])
        expect(onChange).toHaveBeenCalled()
    })
})
