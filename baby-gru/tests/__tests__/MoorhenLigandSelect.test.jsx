import '@testing-library/jest-dom'
import { render, screen, cleanup }  from '@testing-library/react'
import { Provider } from 'react-redux'
import { userEvent } from '@testing-library/user-event'
import { MoorhenLigandSelect }  from '../../src/components/select/MoorhenLigandSelect'
import { MoorhenMolecule } from '../../src/utils/MoorhenMolecule'
import { MoorhenReduxStore } from "../../src/store/MoorhenReduxStore"

describe('Testing MoorhenLigandSelect', () => {

    afterEach(cleanup)

    test('MoorhenLigandSelect label', () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenLigandSelect molecules={[ ]} selectedCoordMolNo={null} label="Test Label"/>
            </Provider>
        )

        const labelNode = screen.getByText('Test Label')
        expect(labelNode).toBeVisible()

        const selectNode = screen.getByRole('combobox')
        expect(selectNode).toBeVisible()
    })

    test('MoorhenLigandSelect select ligands', async () => {
        const molecule_1 = new MoorhenMolecule(null, null, '')
        molecule_1.molNo = 0
        molecule_1.name = 'mol-1'
        molecule_1.ligands = [
            {
                cid: '//A/301',
            },
            {
                cid: '//A/302',
            },
            {
                cid: '//A/303',
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
                <MoorhenLigandSelect molecules={molecules} selectedCoordMolNo={0}/>
            </Provider>
        )

        const selectNode = screen.getByRole('combobox')
        const optionNode_1 = screen.getByText('//A/301')
        const optionNode_2 = screen.getByText('//A/302')
        const optionNode_3 = screen.getByText('//A/303')

        expect(selectNode).toBeVisible()
        expect(optionNode_1).toBeInTheDocument()
        expect(optionNode_2).toBeInTheDocument()
        expect(optionNode_3).toBeInTheDocument()
        expect(selectNode).toHaveValue('//A/301')
        expect(optionNode_1.selected).toBeTruthy()

        const user = userEvent.setup()
        await user.selectOptions(selectNode, ['//A/303'])
        expect(selectNode).toHaveValue('//A/303')
        expect(optionNode_3.selected).toBeTruthy()
    })

    test('MoorhenLigandSelect onChange', async () => {
        const molecule_1 = new MoorhenMolecule(null, null, '')
        molecule_1.molNo = 0
        molecule_1.name = 'mol-1'
        molecule_1.ligands = [
            {
                cid: '//A/301',
            },
            {
                cid: '//A/302',
            },
            {
                cid: '//A/303',
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
                <MoorhenLigandSelect molecules={molecules} selectedCoordMolNo={0} onChange={onChange}/>
            </Provider>
        )

        const selectNode = screen.getByRole('combobox')

        const user = userEvent.setup()
        await user.selectOptions(selectNode, ['//A/303'])
        expect(onChange).toHaveBeenCalled()
    })
})
