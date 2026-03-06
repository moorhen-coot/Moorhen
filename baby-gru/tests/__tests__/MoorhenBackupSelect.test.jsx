import '@testing-library/jest-dom';
import { act, cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createRef } from 'react';
import { MoorhenInstanceProvider, MoorhenInstance } from '../../src/InstanceManager';
import { MoorhenBackupSelect } from '../../src/components/menu-item/Backups';
import { _MoorhenReduxStore as MoorhenReduxStore} from "../../src/store/MoorhenReduxStore"

describe('Testing MoorhenBackupSelect', () => {
    afterEach(cleanup);

    test('MoorhenBackupSelect label', () => {
        const selectRef = createRef(null);
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenInstanceProvider>
                    <MoorhenBackupSelect ref={selectRef} label="Test Label" />
                </MoorhenInstanceProvider>
            </Provider>
        );

        const labelNode = screen.getByText('Test Label');
        expect(labelNode).toBeVisible();

        const selectNode = screen.getByRole('combobox');
        expect(selectNode).toBeVisible();
    });

    test.skip('MoorhenBackupSelect select maps', async () => {
        const selectRef = createRef(null);

        await act(async () => {
            render(
                <Provider store={MoorhenReduxStore}>
                    <MoorhenInstanceProvider>
                         <MoorhenBackupSelect ref={selectRef} />
                    </MoorhenInstanceProvider>
                </Provider>
            );
        });

        const selectNode = screen.getByRole('combobox');
        const optionNode_1 = await screen.findByText('key-1');
        const optionNode_2 = await screen.findByText('key-2');
        const optionNode_3 = await screen.findByText('key-3');

        expect(selectNode).toBeVisible();
        expect(optionNode_1).toBeInTheDocument();
        expect(optionNode_2).toBeInTheDocument();
        expect(optionNode_3).toBeInTheDocument();
        expect(selectNode).toHaveValue(JSON.stringify({ label: 'key-1' }));

        const user = userEvent.setup();
        await act(async () => {
            await user.selectOptions(selectNode, ['key-3']);
        });

        expect(selectNode).toHaveValue(JSON.stringify({ label: 'key-3' }));
        expect(optionNode_3.selected).toBeTruthy();
        expect(selectRef.current.value).toBe(JSON.stringify({ label: 'key-3' }));
    });
});
